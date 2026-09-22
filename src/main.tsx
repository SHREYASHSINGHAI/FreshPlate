/// <reference types="vite/client" />
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "414171812801-hn95a63mmgd95u00b5nsf2l80h87e5tr.apps.googleusercontent.com";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
