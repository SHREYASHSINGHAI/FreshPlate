import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBS7uDMan3jrCJWSPi3uUupKAToLfB2OJc",
  authDomain: "freshplate-10d10.firebaseapp.com",
  databaseURL: "https://freshplate-10d10-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "freshplate-10d10",
  storageBucket: "freshplate-10d10.firebasestorage.app",
  messagingSenderId: "32026376878",
  appId: "1:32026376878:web:bb27be1eee6f43a64f8b3f",
  measurementId: "G-T4SMGJKHFR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error signing in with Google", error);
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

