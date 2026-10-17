export const ADMIN_EMAIL = "shreyashsinghai2005@gmail.com";

export const firebaseConfig = {
  apiKey: "AIzaSyBS7uDMan3jrCJWSPi3uUupKAToLfB2OJc",
  authDomain: "freshplate-10d10.firebaseapp.com",
  databaseURL: "https://freshplate-10d10-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "freshplate-10d10",
  storageBucket: "freshplate-10d10.firebasestorage.app",
  messagingSenderId: "32026376878",
  appId: "1:32026376878:web:bb27be1eee6f43a64f8b3f",
  measurementId: "G-T4SMGJKHFR",
};

export const GOOGLE_OAUTH_CLIENT_ID =
  "815767207816-1gs6ule19796fcsvhqcjso9ased07iaa.apps.googleusercontent.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
