import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, Mail, Camera, Database } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'terms';
}

export function LegalModal({ isOpen, onClose, defaultTab = 'privacy' }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="text-emerald-600 w-5 h-5" />
            <h2 className="font-bold text-gray-900 text-base sm:text-lg">Legal & Compliance</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'privacy'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Lock size={15} />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'terms'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText size={15} />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
          {activeTab === 'privacy' ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Last Updated: September 2026</p>
                <h3 className="text-lg font-bold text-gray-900">FreshPlate Privacy Policy</h3>
                <p className="mt-1 text-gray-600">
                  FreshPlate is committed to protecting your privacy. This policy outlines how your data is collected, processed, and protected across all FreshPlate web and mobile services.
                </p>
              </div>

              {/* Data processing breakdown */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Gmail Order Receipt Processing</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-normal">
                      When you connect your Gmail account, FreshPlate requests read-only access (<code>https://www.googleapis.com/auth/gmail.readonly</code>) solely to scan for automated grocery receipts (e.g., Instacart, Walmart, Kroger, Amazon Fresh). FreshPlate never reads personal correspondence, does not store raw emails, and does not transfer email content to advertising networks or third parties.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start space-x-3">
                  <Camera className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Photo & Receipt Image Processing</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-normal">
                      Photos of receipts and groceries uploaded by users are processed in transient server memory via Google's secure Gemini Vision API to parse product names and estimated shelf lives. Uploaded images are not saved permanently on disk or used to train public AI models.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start space-x-3">
                  <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Pantry Data & Household Storage</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-normal">
                      Your inventory items, expiration records, and shopping lists are stored in Google Cloud Firestore. When you invite household members, access is granted strictly to the accounts you explicitly authorize with either view-only or full editor permissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 text-sm">Data Retention & Deletion</h4>
                <p className="text-xs text-gray-600 leading-normal">
                  You retain full ownership of your data. You may delete individual pantry items, shopping list entries, or revoke your Gmail OAuth token at any time via your Google Account Permissions settings.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 text-sm">Google API Services User Data Policy Compliance</h4>
                <p className="text-xs text-gray-600 leading-normal">
                  FreshPlate's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">Google API Services User Data Policy</a>, including the Limited Use requirements.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Last Updated: September 2026</p>
                <h3 className="text-lg font-bold text-gray-900">FreshPlate Terms of Service</h3>
                <p className="mt-1 text-gray-600">
                  By accessing or using FreshPlate, you agree to comply with and be bound by the following terms.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">1. Intended Use & Disclaimer</h4>
                <p className="text-xs text-gray-600 leading-normal">
                  FreshPlate is a pantry tracking, grocery organization, and recipe generation assistant designed to help reduce household food waste. Estimated expiration dates and freshness indicators are algorithmic approximations. Users are solely responsible for inspecting all food for spoilage before preparation or consumption.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">2. Household Sharing & Collaborator Conduct</h4>
                <p className="text-xs text-gray-600 leading-normal">
                  You are responsible for any invite codes generated from your account. Granting guest or member permissions allows designated individuals to view or modify your shared pantry items.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">3. Acceptable Use & API Quotas</h4>
                <p className="text-xs text-gray-600 leading-normal">
                  Users agree not to abuse, automate, or reverse-engineer the receipt parsing, vision, or recipe generation endpoints. FreshPlate applies rate limiting to protect shared server and AI quotas.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">4. Modifications & Termination</h4>
                <p className="text-xs text-gray-600 leading-normal">
                  We reserve the right to update or modify these terms at any time. Continued use of the service following modifications constitutes acceptance of the updated terms.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
