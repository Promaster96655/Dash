import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values match firebase-applet-config.json exactly
const firebaseConfig = {
  projectId: "magicaldashboard",
  appId: "1:188702476780:web:a1a180309d8d8909dd18c9",
  apiKey: "AIzaSyBZMvklziCFsBBc8R8pQxEYr-28SfMFwcg",
  authDomain: "magicaldashboard.firebaseapp.com",
  storageBucket: "magicaldashboard.firebasestorage.app",
  messagingSenderId: "188702476780",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom database ID
export const db = getFirestore(app, "ai-studio-e4d83276-0ba5-406c-950a-8126fbfee8ef");
