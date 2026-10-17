import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { X, ShieldAlert, Sparkles, AlertCircle, Loader2, UserCheck, LogIn } from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithGoogleCredential,
    loginWithGooglePopup,
    loginAsDemo,
  } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPopupOption, setShowPopupOption] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleCredentialSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      if (!credentialResponse.credential) {
        throw new Error('Google credential was not returned.');
      }
      await loginWithGoogleCredential(credentialResponse.credential);
    } catch (err: any) {
      console.error('Credential sign-in failed:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google credential.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialError = () => {
    setErrorMessage(
      'In-page Google Sign-In could not load or was cancelled. You can use the Quick Demo access below or try the popup sign-in.'
    );
    setShowPopupOption(true);
  };

  const handlePopupLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await loginWithGooglePopup();
    } catch (err: any) {
      console.error('Popup sign-in failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMessage(
          'The sign-in popup was blocked by your browser. Please allow popups or use the Quick Demo access below.'
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in was cancelled before completion.');
      } else {
        setErrorMessage(err.message || 'Google popup sign-in failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={closeAuthModal} 
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-6 pb-5 text-white relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-3">
            <span className="text-2xl">🌱</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">Sign in to FreshPlate</h3>
          <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
            Sync your pantry, manage smart grocery receipts, and share with your household.
          </p>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-3 text-emerald-600 text-sm font-medium space-x-2">
              <Loader2 size={18} className="animate-spin" />
              <span>Authenticating...</span>
            </div>
          )}

          {/* Primary In-Page Google Sign-In */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
              Sign in with Google
            </label>
            <div className="flex justify-center w-full py-1">
              <GoogleLogin
                onSuccess={handleCredentialSuccess}
                onError={handleCredentialError}
                shape="pill"
                size="large"
                theme="outline"
                text="continue_with"
                width="280"
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              Works directly in-page without external redirect hangs.
            </p>
          </div>

          {/* Fallback popup option toggle */}
          {showPopupOption && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handlePopupLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-medium border border-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <LogIn size={14} />
                <span>Open Google Sign-In Popup</span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 font-medium">or continue instantly</span>
            </div>
          </div>

          {/* Quick Demo Access - Always Works */}
          <div className="space-y-2.5">
            <button
              onClick={() => loginAsDemo('admin')}
              className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-medium border border-emerald-200 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2">
                <ShieldAlert size={16} className="text-emerald-700" />
                <div className="text-left">
                  <div className="font-semibold text-emerald-950">Quick Sign In as Admin</div>
                  <div className="text-[10px] text-emerald-600">shreyashsinghai2005@gmail.com</div>
                </div>
              </div>
              <Sparkles size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => loginAsDemo('user')}
              className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-medium border border-blue-200 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2">
                <UserCheck size={16} className="text-blue-700" />
                <div className="text-left">
                  <div className="font-semibold text-blue-950">Quick Sign In as Member</div>
                  <div className="text-[10px] text-blue-600">Standard pantry & sharing access</div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-600 bg-white/70 px-1.5 py-0.5 rounded">Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
