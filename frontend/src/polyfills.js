/**
 * Node.js Polyfills for Browser Environment
 * Required for SimplePeer and other Node.js modules
 */

import { Buffer } from 'buffer'
import process from 'process'

// Make Buffer global
window.Buffer = Buffer
globalThis.Buffer = Buffer

// Make process global  
window.process = process
globalThis.process = process

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

// Additional global setup
globalThis.global = globalThis

console.log('✅ Node.js polyfills loaded successfully')