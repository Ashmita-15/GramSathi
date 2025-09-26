import React, { useState } from 'react'
import VideoCall from './VideoCall'

export default function VideoCallTest() {
  const [roomId, setRoomId] = useState('test-room-123')
  const [showVideoCall, setShowVideoCall] = useState(false)
  
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Video Call Test</h2>
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Room ID:</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter room ID"
          />
        </div>
        <button
          onClick={() => setShowVideoCall(!showVideoCall)}
          className={`px-4 py-2 rounded text-white ${
            showVideoCall 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {showVideoCall ? 'End Call' : 'Start Video Call'}
        </button>
      </div>
      
      {showVideoCall && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Video Call Active</h3>
          <p className="text-sm text-gray-600 mb-4">
            Open another browser tab/window and navigate to the same page to test peer-to-peer connection.
          </p>
          <VideoCall roomId={roomId} />
        </div>
      )}
    </div>
  )
}