import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import SimplePeer from 'simple-peer'
import api from '../services/api'

const socket = io(import.meta.env.VITE_SIGNAL_URL || 'http://localhost:5000')

export default function VideoCall({ roomId }) {
  const myVideo = useRef(null)
  const userVideo = useRef(null)
  const [peer, setPeer] = useState(null)
  const [stream, setStream] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)
  const [error, setError] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  
  // Clean up function
  const cleanup = () => {
    console.log('Cleaning up video call...')
    
    // Remove socket event listeners
    socket.off('user-joined')
    socket.off('signal')
    socket.off('disconnect')
    
    // Destroy peer connection
    if (peer && typeof peer.destroy === 'function' && !peer.destroyed) {
      try {
        peer.destroy()
      } catch (err) {
        console.warn('Error destroying peer:', err)
      }
    }
    
    // Stop all media tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.warn('Error stopping track:', err)
        }
      })
    }
    
    // Reset state
    setPeer(null)
    setStream(null)
    setIsConnected(false)
    setIsWaiting(false)
    setError('')
  }

  // End call function
  const handleEndCall = async () => {
    try {
      // Only try to mark as completed if roomId is provided and call was actually connected
      if (roomId && isConnected) {
        console.log('Marking appointment as completed:', roomId)
        await api.put(`/appointments/${roomId}/complete`)
        console.log('Appointment marked as completed successfully')
      }
    } catch (error) {
      console.error('Failed to mark appointment as completed:', error)
      // We don't show this error to the user as it's not critical for ending the call
    } finally {
      cleanup()
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
        setAudioEnabled(track.enabled)
      })
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
        setVideoEnabled(track.enabled)
      })
    }
  }

  useEffect(() => {
    const start = async () => {
      try {
        // Reset states
        setError('')
        setIsWaiting(true)
        setIsConnected(false)
        
        // Request camera and microphone access
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        
        setStream(userStream)
        
        // Set local video stream
        if (myVideo.current) {
          myVideo.current.srcObject = userStream
        }
        
        // Join the room
        socket.emit('join-room', roomId)
        
        // Handle when another user joins
        socket.on('user-joined', (id) => {
          setIsWaiting(false)
          setIsConnected(true)
          
          // Create peer connection as initiator
          const p = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: userStream
          })
          
          // Handle signaling
          p.on('signal', data => {
            socket.emit('signal', { roomId, data })
          })
          
          // Handle remote stream
          p.on('stream', remoteStream => {
            if (userVideo.current) {
              userVideo.current.srcObject = remoteStream
            }
          })
          
          // Handle connection close
          p.on('close', () => {
            setIsConnected(false)
            setIsWaiting(false)
          })
          
          // Handle errors
          p.on('error', (err) => {
            console.error('Peer error:', err)
            setError('Connection error occurred. Please try again.')
            setIsConnected(false)
            setIsWaiting(false)
          })
          
          setPeer(p)
        })
        
        // Handle incoming signals
        socket.on('signal', ({ from, data }) => {
          setIsWaiting(false)
          setIsConnected(true)
          
          // Use the current peer state to handle signals
          setPeer(currentPeer => {
            if (!currentPeer) {
              // Create peer connection as receiver
              const p = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: userStream
              })
              
              // Handle signaling
              p.on('signal', s => {
                socket.emit('signal', { roomId, data: s })
              })
              
              // Handle remote stream
              p.on('stream', remoteStream => {
                if (userVideo.current) {
                  userVideo.current.srcObject = remoteStream
                }
              })
              
              // Handle connection close
              p.on('close', () => {
                setIsConnected(false)
                setIsWaiting(false)
              })
              
              // Handle errors
              p.on('error', (err) => {
                console.error('Peer error:', err)
                setError('Connection error occurred. Please try again.')
                setIsConnected(false)
                setIsWaiting(false)
              })
              
              // Send signal data
              try {
                p.signal(data)
              } catch (signalError) {
                console.error('Error signaling peer:', signalError)
                setError('Failed to establish connection.')
              }
              
              return p
            } else {
              // Signal existing peer
              try {
                if (!currentPeer.destroyed) {
                  currentPeer.signal(data)
                }
              } catch (signalError) {
                console.error('Error signaling existing peer:', signalError)
              }
              return currentPeer
            }
          })
        })
        
        // Handle socket disconnect
        socket.on('disconnect', () => {
          setIsConnected(false)
          setError('Connection lost.')
        })
        
      } catch (err) {
        console.error('Error starting video call:', err)
        if (err.name === 'NotAllowedError') {
          setError('Camera and microphone access is required for video calls. Please allow access and try again.')
        } else {
          setError('Failed to start video call. Please check your camera and microphone settings.')
        }
        setIsWaiting(false)
      }
    }
    
    // Only start if roomId is provided
    if (roomId) {
      start()
    }
    
    // Clean up on unmount
    return cleanup
  }, [roomId])

  return (
    <div className="card">
      <div className="card-body">
        {error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-600">
            <div className="font-medium mb-1">Error</div>
            <div>{error}</div>
          </div>
        ) : (
          <>
            {isWaiting && (
              <div className="text-center py-8">
                <div className="animate-pulse mb-2">Waiting for {roomId ? 'the other user to join...' : 'room to be created...'}</div>
                <button 
                  onClick={handleEndCall}
                  className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {isConnected && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <video 
                      ref={myVideo} 
                      autoPlay 
                      muted 
                      className="w-full bg-black rounded"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      You
                    </div>
                  </div>
                  <div className="relative">
                    <video 
                      ref={userVideo} 
                      autoPlay 
                      className="w-full bg-black rounded"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {roomId.includes('doctor') ? 'Patient' : 'Doctor'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={toggleAudio}
                    className={`p-3 rounded-full ${audioEnabled ? 'bg-green-500' : 'bg-red-500'} text-white transition-colors`}
                    title={audioEnabled ? 'Mute' : 'Unmute'}
                  >
                    {audioEnabled ? '🔊' : '🔇'}
                  </button>
                  <button 
                    onClick={toggleVideo}
                    className={`p-3 rounded-full ${videoEnabled ? 'bg-green-500' : 'bg-red-500'} text-white transition-colors`}
                    title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {videoEnabled ? '📹' : '📵'}
                  </button>
                  <button 
                    onClick={handleEndCall}
                    className="p-3 rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"
                    title="End call"
                  >
                    📞
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


