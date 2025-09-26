import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { register, swAPI } from './utils/serviceWorkerRegistration'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline functionality
register({
  onSuccess: (registration) => {
    console.log('[App] Service worker registered successfully');
    swAPI.setRegistration(registration);
  },
  onUpdate: (registration) => {
    console.log('[App] New service worker version available');
    swAPI.setRegistration(registration);
  },
  onOfflineReady: () => {
    console.log('[App] App is ready to work offline');
  },
  onNeedRefresh: () => {
    console.log('[App] New version available, refresh needed');
  }
});
