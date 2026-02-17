import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDXlcLlwttzTUiYfoRcSsAmSnP3aKDe6Ls",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tripbuddy-venkatesha.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tripbuddy-venkatesha",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tripbuddy-venkatesha.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "501692827113",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:501692827113:web:e0d64799bf770be53df778",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6PKP9D1WS9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
