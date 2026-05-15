import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import api from '../services/api'
import SimpleWebRTC from '../utils/SimpleWebRTC'

const socket = io(import.meta.env.VITE_SIGNAL_URL)

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
  
  // Check WebRTC support on component mount
  useEffect(() => {
    if (!SimpleWebRTC.WEBRTC_SUPPORT) {
      setError('WebRTC not supported. Please use Chrome, Firefox, or Safari.')
    }
  }, [])
  
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
  
  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      setStream(mediaStream)
      if (myVideo.current) {
        myVideo.current.srcObject = mediaStream
      }
      
      // Join the socket.io room
      socket.emit('join-room', roomId)
      
    } catch (err) {
      console.error('Error accessing media devices:', err)
      setError('Could not access camera and microphone. Please ensure you have given permission.')
    }
  }, [roomId])
  
  // Create a new peer connection
  const createPeer = useCallback((initiator = false) => {
    if (!stream) return
    
    // Configure STUN and TURN servers for better connectivity
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Add a fallback TURN server for NAT traversal issues
      { 
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
    
    const newPeer = new Peer({
      initiator,
      trickle: true, // Enable trickle ICE for faster connection establishment
      stream,
      config: {
        iceServers,
        iceTransportPolicy: 'all' // Use all available ICE transports
      }
    })
    
    // Set up event handlers
    newPeer.on('signal', (data) => {
      console.log('Sending signal:', data)
      socket.emit('signal', { to: roomId, signal: data })
    })
    
    newPeer.on('stream', (userStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = userStream
      }
      setIsConnected(true)
      setIsWaiting(false)
      setCallStatus('connected')
      console.log('Peer connection established successfully')
    })
    
    newPeer.on('connect', () => {
      setIsConnected(true)
      setIsWaiting(false)
      setCallStatus('connected')
    })
    
    newPeer.on('close', () => {
      setIsConnected(false)
      setCallStatus('waiting')
    })
    
    newPeer.on('error', (err) => {
      console.error('Peer connection error:', err)
      if (err.message.includes('ICE failed')) {
        setError('Connection failed. Please try again. The issue might be related to network configuration.')
      } else if (err.message.includes('Connection failed')) {
        setError('Failed to connect to the other user. They might not be available.')
      } else {
        setError(`Connection error: ${err.message}`)
      }
      setIsWaiting(false)
    })
    
    setPeer(newPeer)
  }, [stream, roomId])
  
  // Set up socket.io event listeners
  useEffect(() => {
    if (!roomId) return
    
    // Handle when another user joins the room
    socket.on('user-joined', () => {
      setCallStatus('ringing')
      setIsWaiting(true)
      
      // If we haven't initiated yet, create a peer as initiator
      if (!hasInitiated && !peer) {
        createPeer(true)
        setHasInitiated(true)
      }
      
      // Log if call is still ringing after 5 seconds
      setTimeout(() => {
        if (callStatus === 'ringing') {
          console.log('Call is still ringing...')
        }
      }, 5000)
    })
    
    // Handle incoming signal
    socket.on('signal', ({ signal }) => {
      if (!peer) {
        // If we don't have a peer yet, create one as receiver
        createPeer(false)
      } else {
        // Otherwise, just signal
        peer.signal(signal)
      }
    })
    
    // Handle call declined
    socket.on('call-declined', () => {
      setError('Call was declined by the other user')
      setIsWaiting(false)
    })
    
    // Handle call ended
    socket.on('call-ended', () => {
      setIsConnected(false)
      setCallStatus('waiting')
    })
    
    // Cleanup on unmount
    return () => {
      cleanup()
    }
  }, [roomId, peer, hasInitiated, createPeer, callStatus])
  
  // Initialize media and join room
  useEffect(() => {
    if (roomId) {
      initializeMedia()
    }
    
    return () => {
      cleanup()
    }
  }, [roomId, initializeMedia])
  
  // Toggle audio
  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled
        setAudioEnabled(!audioEnabled)
      }
    }
  }
  
  // Toggle video
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled
        setVideoEnabled(!videoEnabled)
      }
    }
  }
  
  // End call
  const endCall = () => {
    cleanup()
  }
  
  // Handle roomId change
  useEffect(() => {
    // If roomId changes, clean up the previous connection
    if (roomId) {
      // Room ID has changed, re-initialize
      initializeMedia()
    }
  }, [roomId, initializeMedia])
  
  // Reconnect handler
  const reconnect = () => {
    setError('')
    cleanup()
    initializeMedia()
  }
  
  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-100">
        <p className="text-gray-500">No active call</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gray-100 p-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={reconnect}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }
  
  return (
    <div className="relative h-full w-full bg-black">
      {/* Remote user video (larger) */}
      <div className={`absolute inset-0 flex items-center justify-center ${isConnected ? '' : 'hidden'}`}>
        <video 
          ref={userVideo} 
          autoPlay 
          playsInline 
          className="object-contain max-h-full max-w-full"
        />
      </div>
      
      {/* Local user video (smaller, corner) */}
      <div className="absolute bottom-4 right-4 z-10">
        <video 
          ref={myVideo} 
          autoPlay 
          playsInline 
          muted 
          className="w-32 h-24 object-cover rounded-lg border-2 border-white bg-gray-800"
        />
      </div>
      
      {/* Waiting or ringing overlay */}
      {!isConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <p className="text-white text-xl mb-4">
            {callStatus === 'waiting' ? 'Waiting for the other user to join...' : 'Ringing...'}
          </p>
          <div className="animate-pulse">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 z-20">
        <button 
          onClick={toggleAudio}
          className={`p-3 rounded-full ${audioEnabled ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'} hover:bg-opacity-30 transition-all`}
          title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
        >
          {audioEnabled ? '🔇' : '🔊'}
        </button>
        
        <button 
          onClick={toggleVideo}
          className={`p-3 rounded-full ${videoEnabled ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'} hover:bg-opacity-30 transition-all`}
          title={videoEnabled ? 'Turn off video' : 'Turn on video'}
        >
          {videoEnabled ? '📹' : '🎦'}
        </button>
        
        <button 
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
          title="End call"
        >
          📞
        </button>
      </div>
    </div>
  )
}

