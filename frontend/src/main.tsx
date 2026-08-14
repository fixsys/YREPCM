import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import axios from 'axios'
import { useAuthStore } from './store/authStore'
import App from './App.tsx'

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
