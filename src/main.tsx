import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Automatically register and update service worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('RUDACTIVITY update available.');
  },
  onOfflineReady() {
    console.log('RUDACTIVITY is ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

