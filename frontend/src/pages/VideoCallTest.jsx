import React, { useState, useEffect } from 'react'
import VideoCall from '../components/VideoCall'
import io from 'socket.io-client'

export default function VideoCallTest() {
  const [roomId, setRoomId] = useState('test-room-' + Math.random().toString(36).substr(2, 9))
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [backendHealth, setBackendHealth] = useState(null)
  
  // Test backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health')
        const data = await response.json()
        setBackendHealth(data.status === 'ok' ? 'Connected' : 'Error')
      } catch (error) {
        setBackendHealth('Disconnected')
      }
    }
    
    checkBackend()
    
    // Test socket connection
    const testSocket = io('http://localhost:5000')
    testSocket.on('connect', () => {
      setSocketConnected(true)
      console.log('✅ Socket.IO connected:', testSocket.id)
    })
    
    testSocket.on('disconnect', () => {
      setSocketConnected(false)
      console.log('❌ Socket.IO disconnected')
    })
    
    return () => {
      testSocket.disconnect()
    }
  }, [])
  
  const generateNewRoomId = () => {
    setRoomId('test-room-' + Math.random().toString(36).substr(2, 9))
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Video Call System Test</h1>
          
          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">Backend API</h3>
              <div className={`text-sm ${backendHealth === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                {backendHealth || 'Checking...'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">Socket.IO</h3>
              <div className={`text-sm ${socketConnected ? 'text-green-600' : 'text-red-600'}`}>
                {socketConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">Frontend</h3>
              <div className="text-sm text-green-600">Running on port {window.location.port}</div>
            </div>
          </div>
          
          {/* Test Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">🧪 How to Test Video Call</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Make sure both Backend API and Socket.IO show "Connected"</li>
              <li>2. Click "Start Video Call" below</li>
              <li>3. Allow camera and microphone when prompted</li>
              <li>4. Open another browser tab/window to this same page</li>
              <li>5. Use the same Room ID and click "Start Video Call" in the second tab</li>
              <li>6. Both users should see each other's video feeds</li>
            </ol>
          </div>
          
          {/* Room Configuration */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter room ID"
                />
                <button
                  onClick={generateNewRoomId}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  New ID
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Share this Room ID with another user to connect
              </p>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setShowVideoCall(!showVideoCall)}
              disabled={!socketConnected}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                showVideoCall 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : socketConnected
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {showVideoCall ? '🔴 End Call' : '🟢 Start Video Call'}
            </button>
            
            {showVideoCall && (
              <button
                onClick={() => {
                  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .then(() => console.log('✅ Camera/mic permissions granted'))
                    .catch(err => console.error('❌ Media permissions denied:', err))
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🎥 Test Permissions
              </button>
            )}
          </div>
          
          {!socketConnected && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-yellow-800">⚠️ Connection Issue</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Socket.IO is not connected. Make sure the backend server is running on port 5000.
              </p>
            </div>
          )}
        </div>
        
        {/* Video Call Component */}
        {showVideoCall && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Video Call Active</h2>
              <p className="text-gray-600 text-sm">
                Room: <code className="bg-gray-100 px-2 py-1 rounded">{roomId}</code>
              </p>
            </div>
            
            <VideoCall roomId={roomId} />
            
            <div className="mt-6 text-sm text-gray-500">
              <h4 className="font-semibold mb-2">Troubleshooting Tips:</h4>
              <ul className="space-y-1">
                <li>• Make sure both users are using the same Room ID</li>
                <li>• Allow camera and microphone permissions when prompted</li>
                <li>• Try using Chrome or Firefox for best WebRTC support</li>
                <li>• Check the browser console for detailed logs</li>
                <li>• If no video appears, try refreshing and allowing permissions again</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}