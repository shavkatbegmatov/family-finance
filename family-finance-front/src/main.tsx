import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@xyflow/react/dist/style.css';
import './index.css';
import './i18n'; // Initialize i18n for customer portal

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
