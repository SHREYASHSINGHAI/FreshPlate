export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string) || "shreyashsinghai2005@gmail.com";

export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "AIzaSyBS7uDMan3jrCJWSPi3uUupKAToLfB2OJc",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "freshplate-10d10.firebaseapp.com",
  databaseURL: (import.meta.env.VITE_FIREBASE_DATABASE_URL as string) || "https://freshplate-10d10-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "freshplate-10d10",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "freshplate-10d10.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "32026376878",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "1:32026376878:web:bb27be1eee6f43a64f8b3f",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "G-T4SMGJKHFR",
};

export const GOOGLE_OAUTH_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  "815767207816-1gs6ule19796fcsvhqcjso9ased07iaa.apps.googleusercontent.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
