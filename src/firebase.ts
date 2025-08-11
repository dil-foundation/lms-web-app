import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

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
const messaging = getMessaging(app);

export { app, messaging };
