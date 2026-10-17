import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const loginWithGoogleCredential = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
};

export const loginWithGooglePopup = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export const loginWithGoogleRedirect = async () => {
  return await signInWithRedirect(auth, googleProvider);
};

export const checkRedirectResult = async () => {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.warn("Error checking redirect result", error);
    return null;
  }
};

export const loginWithGoogle = loginWithGooglePopup;

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};
