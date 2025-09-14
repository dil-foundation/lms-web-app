import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBS9S8FtBTsHTX0VEsn-BoX6yulSJv5CeA",
  authDomain: "dil-lms.firebaseapp.com",
  projectId: "dil-lms",
  storageBucket: "dil-lms.appspot.com",
  messagingSenderId: "1042360571713",
  appId: "1:1042360571713:web:563d18a148749cce0533c0",
  measurementId: "G-SP86QD577T"
};

const app = initializeApp(firebaseConfig);

// Initialize messaging only if supported
let messaging: any = null;

const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      console.log('Firebase messaging initialized successfully');
    } else {
      console.warn('Firebase messaging is not supported in this browser');
    }
  } catch (error) {
    console.warn('Failed to initialize Firebase messaging:', error);
  }
};

// Initialize messaging asynchronously
initializeMessaging();

export { app, messaging };
