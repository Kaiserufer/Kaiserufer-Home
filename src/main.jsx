import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

if (!window.storage) {
  window.storage = {
    async get(key) {
      const val = localStorage.getItem(`ku_${key}`)
      return val !== null ? { key, value: val } : null
    },
    async set(key, value) {
      localStorage.setItem(`ku_${key}`, value)
      return { key, value }
    },
    async delete(key) {
      localStorage.removeItem(`ku_${key}`)
      return { key, deleted: true }
    },
    async list(prefix = '') {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k.startsWith(`ku_${prefix}`)) keys.push(k.replace('ku_', ''))
      }
      return { keys }
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
