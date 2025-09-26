/**
 * WebRTC Capability Test Utility
 * Tests browser WebRTC support and capabilities
 */

export function testWebRTCSupport() {
  const results = {
    supported: false,
    issues: [],
    capabilities: {}
  }

  try {
    // Test 1: Check for RTCPeerConnection
    if (!window.RTCPeerConnection) {
      results.issues.push('RTCPeerConnection not available')
    } else {
      results.capabilities.RTCPeerConnection = true
    }

    // Test 2: Check for getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      results.issues.push('getUserMedia not available')
    } else {
      results.capabilities.getUserMedia = true
    }

    // Test 3: Check for WebRTC data channels
    if (window.RTCPeerConnection) {
      try {
        const pc = new RTCPeerConnection()
        const dc = pc.createDataChannel('test')
        results.capabilities.dataChannels = true
        pc.close()
      } catch (err) {
        results.issues.push(`DataChannel creation failed: ${err.message}`)
      }
    }

    // Test 4: Test peer connection creation
    if (window.RTCPeerConnection) {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        })
        results.capabilities.iceServers = true
        pc.close()
      } catch (err) {
        results.issues.push(`PeerConnection with ICE servers failed: ${err.message}`)
      }
    }

    // Test 5: Check browser type
    const userAgent = navigator.userAgent
    if (userAgent.includes('Chrome')) {
      results.capabilities.browser = 'Chrome'
    } else if (userAgent.includes('Firefox')) {
      results.capabilities.browser = 'Firefox'
    } else if (userAgent.includes('Safari')) {
      results.capabilities.browser = 'Safari'
    } else {
      results.capabilities.browser = 'Unknown'
      results.issues.push('Browser may not fully support WebRTC')
    }

    // Overall support assessment
    results.supported = results.issues.length === 0 && 
                       results.capabilities.RTCPeerConnection && 
                       results.capabilities.getUserMedia

    return results

  } catch (error) {
    results.issues.push(`WebRTC test failed: ${error.message}`)
    return results
  }
}

export async function testMediaAccess() {
  const results = {
    video: false,
    audio: false,
    error: null
  }

  try {
    // Test video only
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
      results.video = true
      videoStream.getTracks().forEach(track => track.stop())
    } catch (err) {
      console.warn('Video access failed:', err.message)
    }

    // Test audio only
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      results.audio = true
      audioStream.getTracks().forEach(track => track.stop())
    } catch (err) {
      console.warn('Audio access failed:', err.message)
    }

    // Test both together
    if (results.video && results.audio) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach(track => track.stop())
    }

  } catch (error) {
    results.error = error.message
  }

  return results
}

export function getWebRTCDiagnostics() {
  const webrtc = testWebRTCSupport()
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    webrtcSupport: webrtc,
    location: {
      protocol: window.location.protocol,
      host: window.location.host,
      secure: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    }
  }
}