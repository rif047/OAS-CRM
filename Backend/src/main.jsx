import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './tailwind.css';
import './style.css';
import App from './App.jsx';
import { setupApiClient } from './lib/setupApiClient';

setupApiClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <App />
    </BrowserRouter>
  </StrictMode>
)
