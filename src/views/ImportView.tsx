import React, { useState } from "react";
import { ShoppingBag, UploadCloud, Loader2, Plus, Mail, Camera, Eye, ShieldCheck } from "lucide-react";
import { Ingredient } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useGoogleLogin } from "@react-oauth/google";

export default function ImportView({
  onImportComplete,
  onOpenLegal,
}: {
  onImportComplete: (items: Ingredient[]) => void;
  onOpenLegal?: () => void;
}) {
  const { user, login, canEdit, isGuest } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"paste" | "manual" | "gmail" | "camera">(
    "gmail",
  );
  
  const [isInIframe, setIsInIframe] = useState(false);
  React.useEffect(() => {
    setIsInIframe(window !== window.top);
  }, []);

  // AI Paste state
  const [text, setText] = useState("");
  const [source, setSource] = useState("Zepto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Manual Add state
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("Vegetables");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualShelfLife, setManualShelfLife] = useState("5");

  // Camera state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string | null>(null);

  const [savedToken, setSavedToken] = useState<string | null>(() =>
    localStorage.getItem("gmail_token"),
  );

  React.useEffect(() => {
    if (user) {
      const token = localStorage.getItem("gmail_token");
      if (token && token !== savedToken) {
        setSavedToken(token);
      }
    } else {
      setSavedToken(null);
    }
  }, [user]);

  const fetchReceiptsWithToken = async (token: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fetch-gmail-receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("gmail_token");
          setSavedToken(null);
          throw new Error("Session expired. Please reconnect your Gmail.");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch from Gmail");
      }

      const data = await res.json();
      if (data.ingredients && data.ingredients.length > 0) {
        onImportComplete(data.ingredients);
      } else {
        setError("Could not find any recent delivery receipts in your Gmail.");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "An error occurred while fetching receipts from Gmail.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGmailLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      localStorage.setItem("gmail_token", token);
      setSavedToken(token);
      await fetchReceiptsWithToken(token);
    },
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    onError: (error) => {
      console.error("Login Failed:", error);
      setError("Gmail authorization failed. Please try again.");
    },
  });

  const handleImport = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to parse order");
      }

      const data = await res.json();
      if (data.ingredients && data.ingredients.length > 0) {
        onImportComplete(data.ingredients);
        setText("");
      } else {
        setError("Could not find any grocery items in the provided text.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while parsing the receipt.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualQuantity.trim()) return;

    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + (parseInt(manualShelfLife) || 5));

    const newItem: Ingredient = {
      id: Math.random().toString(36).substring(7),
      name: manualName.trim(),
      category: manualCategory,
      quantity: manualQuantity.trim(),
      purchaseDate: today.toISOString(),
      estimatedExpiryDate: expiryDate.toISOString(),
      status: "fresh",
      source: "Manual",
    };

    onImportComplete([newItem]);
    setManualName("");
    setManualQuantity("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
      setSelectedMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError("");

    try {
      const base64Data = selectedImage.split(",")[1];
      
      const res = await fetch("/api/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: base64Data, 
          mimeType: selectedMimeType 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to parse image");
      }

      const data = await res.json();
      if (data.ingredients && data.ingredients.length > 0) {
        onImportComplete(data.ingredients);
        setSelectedImage(null);
        setSelectedMimeType(null);
      } else {
        setError("Could not find any grocery items in the image.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while analyzing the image.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Add to Pantry
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Import your delivery receipts automatically or add items manually.
        </p>
      </div>

      {!canEdit && (
        <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-start space-x-3">
          <Eye className="text-purple-600 mt-0.5 shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-purple-900">Guest Access (View Only)</h4>
            <p className="text-xs text-purple-700 mt-0.5">
              You are viewing this household pantry as a Guest. Adding new receipts or grocery items is reserved for household family members.
            </p>
          </div>
        </div>
      )}

      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("gmail")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === "gmail"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Gmail Sync
        </button>
        <button
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center space-x-1 ${
            activeTab === "camera"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Camera size={14} className="mr-1" /> Snap
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === "paste"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Paste Text
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === "manual"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Manual
        </button>
      </div>

      {activeTab === "camera" ? (
        <div className="space-y-4">
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-amber-600">
              <Camera size={24} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Snap a Receipt or Fridge
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Take a picture of a supermarket receipt or your open refrigerator. 
              Our AI vision will identify the fresh items and add them.
            </p>

            {!selectedImage ? (
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-2xl flex justify-center items-center space-x-2 transition-colors shadow-sm">
                  <Camera size={20} />
                  <span>Take a Photo / Upload</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden shadow-inner">
                  <img src={selectedImage} alt="Selected" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                  >
                    <Plus size={16} className="rotate-45" />
                  </button>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 text-left">
                    {error}
                  </div>
                )}
                
                <button
                  onClick={handleImageSubmit}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-2xl flex justify-center items-center space-x-2 transition-colors shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <UploadCloud size={20} />
                  )}
                  <span>{isLoading ? "Analyzing Vision..." : "Extract Groceries"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "paste" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["Zepto", "Blinkit", "Instamart", "Amazon"].map((platform) => (
                <button
                  key={platform}
                  onClick={() => setSource(platform)}
                  className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${
                    source === platform
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Summary Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-40 p-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none text-sm"
              placeholder="e.g.,\n2x Tomatoes 500g\n1x Coriander Bunch\n1x Milk 1L"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={isLoading || !text.trim()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-2xl flex justify-center items-center space-x-2 transition-colors shadow-sm"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <UploadCloud size={20} />
            )}
            <span>
              {isLoading ? "Scanning receipt..." : "Parse & Add to Pantry"}
            </span>
          </button>
        </div>
      ) : activeTab === "gmail" ? (
        <div className="space-y-4">
          <div
            className={
              user && savedToken
                ? "bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center"
                : "bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-center"
            }
          >
            <div
              className={`w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm ${user && savedToken ? "text-emerald-600" : "text-blue-600"}`}
            >
              <Mail size={24} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Auto-Sync Deliveries
            </h3>
            {user && savedToken ? (
              <p className="text-sm text-gray-600 mb-4">
                Your account is securely linked. Click below to safely extract
                grocery items from your recent delivery receipts and sync them
                to your pantry.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Connect your Gmail account. We'll securely scan your recent
                emails for delivery receipts (Blinkit, Zepto, etc.) and
                automatically add the groceries to your pantry.
              </p>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 mb-4 text-left">
                {error}
              </div>
            )}

            {user && savedToken ? (
              <button
                onClick={async () => {
                  const token = localStorage.getItem("gmail_token");
                  if (!token) {
                    await handleGmailLogin();
                  } else {
                    fetchReceiptsWithToken(token);
                  }
                }}
                disabled={isLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-2xl flex justify-center items-center space-x-2 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Mail size={20} />
                )}
                <span>
                  {isLoading ? "Scanning Inbox..." : "Scan Recent Deliveries"}
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    showToast("Please sign in first using Google Sign-In before linking Gmail.", "warning");
                    return;
                  }
                  handleGmailLogin();
                }}
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-2xl flex justify-center items-center space-x-2 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Mail size={20} />
                )}
                <span>{isLoading ? "Scanning Inbox..." : "Connect Gmail"}</span>
              </button>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 max-w-[280px] mx-auto leading-relaxed">
              <span className="font-medium text-gray-700">Privacy Guaranteed:</span>{" "}
              Your personal correspondence is never accessed. We only scan for automated grocery orders.
            </p>
            {onOpenLegal && (
              <button
                onClick={onOpenLegal}
                className="inline-flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium underline mt-1.5"
              >
                <ShieldCheck size={12} />
                <span>Read our Privacy Policy & Terms</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g., Tomatoes"
              className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="text"
                value={manualQuantity}
                onChange={(e) => setManualQuantity(e.target.value)}
                placeholder="e.g., 500g"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shelf Life (Days)
              </label>
              <input
                type="number"
                value={manualShelfLife}
                onChange={(e) => setManualShelfLife(e.target.value)}
                min="1"
                className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value)}
              className="w-full p-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            >
              <option>Vegetables</option>
              <option>Fruits</option>
              <option>Dairy & Eggs</option>
              <option>Meat & Seafood</option>
              <option>Pantry Staples</option>
            </select>
          </div>

          <button
            onClick={handleManualAdd}
            disabled={!manualName.trim() || !manualQuantity.trim()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-2xl flex justify-center items-center space-x-2 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>Add Item Manually</span>
          </button>
        </div>
      )}
    </div>
  );
}
