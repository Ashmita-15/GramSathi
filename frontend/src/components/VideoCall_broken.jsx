import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import Peer from 'simple-peer'
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
    if (peer) {
      try {
        if (typeof peer.destroy === 'function' && !peer.destroyed) {
          peer.destroy()
        }
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

  // Create peer connection
  const createPeer = (initiator, stream, signalData = null) => {
    try {
      console.log('Creating peer with initiator:', initiator, 'SimplePeer available:', typeof Peer)
      const p = new Peer({
        initiator: initiator,
        trickle: false,
        stream: stream
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
        setIsConnected(true)
        setIsWaiting(false)
      })

      // Handle connection
      p.on('connect', () => {
        console.log('Peer connected!')
        setIsConnected(true)
        setIsWaiting(false)
      })

      // Handle connection close
      p.on('close', () => {
        console.log('Peer connection closed')
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

      // If we have signal data, send it immediately
      if (signalData) {
        p.signal(signalData)
      }

      return p
    } catch (error) {
      console.error('Error creating peer:', error)
      setError('Failed to create peer connection.')
      return null
    }
  }

  useEffect(() => {
    if (!roomId) return

    const start = async () => {
      try {
        console.log('Starting video call for room:', roomId)
        
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
        
        // Handle when another user joins (we become initiator)
        socket.on('user-joined', (id) => {
          console.log('User joined, creating initiator peer')
          const newPeer = createPeer(true, userStream)
          if (newPeer) {
            setPeer(newPeer)
          }
        })
        
        // Handle incoming signals
        socket.on('signal', ({ from, data }) => {
          console.log('Received signal:', { from, hasData: !!data })
          
          setPeer(currentPeer => {
            if (!currentPeer) {
              // Create peer connection as receiver
              console.log('Creating receiver peer')
              const newPeer = createPeer(false, userStream, data)
              return newPeer
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

    start()
    
    // Clean up on unmount or roomId change
    return cleanup
  }, [roomId])

  if (!roomId) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-8">
            <div className="text-gray-500">No room ID provided</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        {error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-600">
            <div className="font-medium mb-1">Error</div>
            <div>{error}</div>
            <button 
              onClick={cleanup}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {isWaiting && (
              <div className="text-center py-8">
                <div className="animate-pulse mb-2">
                  {stream ? 'Waiting for the other user to join...' : 'Setting up video call...'}
                </div>
                <button 
                  onClick={handleEndCall}
                  className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <video 
                    ref={myVideo} 
                    autoPlay 
                    muted 
                    className="w-full bg-black rounded"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    You {!videoEnabled && '(Camera Off)'}
                  </div>
                </div>
                <div className="relative">
                  <video 
                    ref={userVideo} 
                    autoPlay 
                    className="w-full bg-black rounded"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {isConnected ? 'Remote User' : 'Waiting...'}
                  </div>
                </div>
              </div>
              
              {stream && (
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}