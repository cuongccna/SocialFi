import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import App from './App.tsx'
import './index.css'
import { initTelegramWebApp } from './utils/telegram'
import { AuthProvider } from './context/AuthContext'

// Initialize Telegram WebApp SDK
initTelegramWebApp();

// TonConnect manifest URL - use relative path for development
const manifestUrl = import.meta.env.PROD 
  ? 'https://cryptocrush.app/tonconnect-manifest.json'
  : `${window.location.origin}/tonconnect-manifest.json`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TonConnectUIProvider>
    </BrowserRouter>
  </StrictMode>,
)
