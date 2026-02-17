import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDXlcLlwttzTUiYfoRcSsAmSnP3aKDe6Ls",
  authDomain: "tripbuddy-venkatesha.firebaseapp.com",
  projectId: "tripbuddy-venkatesha",
  storageBucket: "tripbuddy-venkatesha.firebasestorage.app",
  messagingSenderId: "501692827113",
  appId: "1:501692827113:web:e0d64799bf770be53df778",
  measurementId: "G-6PKP9D1WS9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
