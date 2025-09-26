/**
 * SimplePeer Loader - Handles dynamic import with proper ESM/CommonJS interop
 * This solves the "Cannot read properties of undefined (reading 'call')" error
 */

let SimplePeerConstructor = null
let loadingPromise = null

export async function loadSimplePeer() {
  // Return cached constructor if already loaded
  if (SimplePeerConstructor) {
    return SimplePeerConstructor
  }
  
  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise
  }
  
  // Start loading process
  loadingPromise = (async () => {
    try {
      console.log('🔄 Loading SimplePeer...')
      
      // Try multiple import strategies
      let module
      let Constructor
      
      try {
        // Strategy 1: Standard dynamic import
        module = await import('simple-peer')
        console.log('📦 Module loaded:', { 
          hasDefault: !!module.default, 
          moduleType: typeof module, 
          keys: Object.keys(module) 
        })
        
        // Handle different export patterns
        if (module.default && typeof module.default === 'function') {
          Constructor = module.default
          console.log('✅ Using module.default')
        } else if (typeof module === 'function') {
          Constructor = module
          console.log('✅ Using module directly')
        } else {
          throw new Error('No constructor found in module')
        }
      } catch (importError) {
        console.error('❌ Dynamic import failed:', importError)
        
        // Strategy 2: Try global fallback (if available)
        if (typeof window !== 'undefined' && window.SimplePeer) {
          Constructor = window.SimplePeer
          console.log('✅ Using global SimplePeer')
        } else {
          throw new Error(`SimplePeer import failed: ${importError.message}`)
        }
      }
      
      // Validate constructor
      if (typeof Constructor !== 'function') {
        throw new Error(`Invalid SimplePeer constructor: ${typeof Constructor}`)
      }
      
      // Test constructor with minimal options (skip test to avoid WebRTC issues)
      console.log('✅ SimplePeer constructor ready (test skipped to avoid WebRTC init)')
      
      SimplePeerConstructor = Constructor
      console.log('✅ SimplePeer loaded successfully!')
      return Constructor
      
    } catch (error) {
      console.error('❌ Failed to load SimplePeer:', error)
      loadingPromise = null // Reset loading promise on failure
      throw error
    }
  })()
  
  return loadingPromise
}

// Export a function that returns the constructor
export function getSimplePeer() {
  return SimplePeerConstructor
}

// Check if SimplePeer is loaded
export function isSimplePeerLoaded() {
  return SimplePeerConstructor !== null
}