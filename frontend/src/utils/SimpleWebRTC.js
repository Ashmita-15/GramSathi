/**
 * Simple WebRTC Implementation
 * A lightweight alternative to SimplePeer that doesn't depend on Node.js streams
 */

export class SimpleWebRTC {
  constructor(options = {}) {
    this.initiator = options.initiator || false
    this.stream = options.stream || null
    this.destroyed = false
    this.connected = false
    
    // Event handlers
    this.handlers = {}
    
    // WebRTC configuration
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
    
    this.init()
  }
  
  init() {
    try {
      // Create peer connection
      this.pc = new RTCPeerConnection(this.config)
      
      // Add stream if provided
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          this.pc.addTrack(track, this.stream)
        })
      }
      
      // Set up event handlers
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.emit('signal', {
            type: 'candidate',
            candidate: event.candidate
          })
        } else {
          // ICE gathering complete
          console.log('🧊 ICE gathering complete')
        }
      }
      
      this.pc.ontrack = (event) => {
        console.log('📺 Received remote stream')
        this.emit('stream', event.streams[0])
      }
      
      this.pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', this.pc.connectionState)
        if (this.pc.connectionState === 'connected') {
          this.connected = true
          this.emit('connect')
        } else if (this.pc.connectionState === 'disconnected' || 
                   this.pc.connectionState === 'failed') {
          this.connected = false
          this.emit('close')
        }
      }
      
      this.pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', this.pc.iceGatheringState)
      }
      
      this.pc.onsignalingstatechange = () => {
        console.log('📡 Signaling state:', this.pc.signalingState)
      }
      
      // If we're the initiator, create an offer
      if (this.initiator) {
        setTimeout(() => this.createOffer(), 100)
      }
      
    } catch (error) {
      console.error('❌ Error initializing WebRTC:', error)
      this.emit('error', error)
    }
  }
  
  async createOffer() {
    try {
      console.log('📤 Creating offer...')
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      
      this.emit('signal', {
        type: 'offer',
        offer: offer
      })
    } catch (error) {
      console.error('❌ Error creating offer:', error)
      this.emit('error', error)
    }
  }
  
  async createAnswer() {
    try {
      console.log('📥 Creating answer...')
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)
      
      this.emit('signal', {
        type: 'answer',
        answer: answer
      })
    } catch (error) {
      console.error('❌ Error creating answer:', error)
      this.emit('error', error)
    }
  }
  
  async signal(data) {
    try {
      if (this.destroyed) return
      
      if (data.type === 'offer') {
        console.log('📥 Received offer')
        await this.pc.setRemoteDescription(data.offer)
        await this.createAnswer()
      } else if (data.type === 'answer') {
        console.log('📤 Received answer')
        await this.pc.setRemoteDescription(data.answer)
      } else if (data.type === 'candidate') {
        console.log('🧊 Received ICE candidate')
        await this.pc.addIceCandidate(data.candidate)
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error)
      this.emit('error', error)
    }
  }
  
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }
    this.handlers[event].push(handler)
  }
  
  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`❌ Error in ${event} handler:`, error)
        }
      })
    }
  }
  
  destroy() {
    if (this.destroyed) return
    
    console.log('🗑️ Destroying WebRTC connection')
    this.destroyed = true
    this.connected = false
    
    if (this.pc) {
      this.pc.close()
    }
    
    this.handlers = {}
    this.emit('close')
  }
}

// Static method to check WebRTC support
SimpleWebRTC.WEBRTC_SUPPORT = !!(
  typeof window !== 'undefined' &&
  window.RTCPeerConnection &&
  window.navigator &&
  window.navigator.mediaDevices &&
  window.navigator.mediaDevices.getUserMedia
)

export default SimpleWebRTC