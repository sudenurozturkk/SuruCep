import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import './layout.css';

// Ek 2 deep link: /a/{token} yolu (telefonun kendi kamerasıyla okutulan QR) → uygulama içi rota
const deep = window.location.pathname.match(/^\/a\/([0-9a-f-]{36})\/?$/i);
if (deep) window.history.replaceState(null, '', `/#/a/${deep[1]}`);
// NFR-05: service worker — ilk açılıştan sonra uygulama internetsiz de açılır
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
