import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Activity, Users, Copy, CheckCircle, Target, TrendingUp, Clock, RefreshCw, Eye, ShieldCheck, UserPlus } from 'lucide-react';
import { MemberRole } from '../types';

export default function DashboardView() {
  const { user, householdId, userProfile, role, isGuest } = useAuth();
  const [stats, setStats] = useState({ consumedCount: 0, wastedCount: 0 });
  const [inviteCode, setInviteCode] = useState('');
  const [inviteRole, setInviteRole] = useState<'family' | 'guest'>('family');
  const [selectedPermission, setSelectedPermission] = useState<'family' | 'guest'>('family');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadStats() {
      if (householdId) {
        try {
          const docRef = doc(db, 'users', householdId, 'stats', 'summary');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setStats(snap.data() as any);
          }
        } catch (error: any) {
          if (error?.message?.includes('offline')) {
            console.warn("Firestore stats sync skipped due to offline mode or iframe restrictions.");
          } else {
            console.error("Failed to load stats", error);
          }
        }
      }
    }
    loadStats();
  }, [householdId]);

  // Countdown timer for active invite code
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);
      if (remainingSeconds <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const generateInvite = async (chosenRole?: 'family' | 'guest') => {
    if (!user) return;
    setIsGenerating(true);
    setError('');
    const targetRole = chosenRole || selectedPermission;
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const codeDurationMs = 5 * 60 * 1000; // 5 minutes validity
      const codeExpiresAt = Date.now() + codeDurationMs;

      await setDoc(doc(db, 'invites', code), { 
        targetUid: user.uid,
        role: targetRole,
        createdAt: Date.now(),
        expiresAt: codeExpiresAt
      });

      setInviteCode(code);
      setInviteRole(targetRole);
      setExpiresAt(codeExpiresAt);
      setTimeLeft(Math.floor(codeDurationMs / 1000));
    } catch (err: any) {
      console.error("Failed to generate invite code", err);
      setError("Failed to create invite code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    setIsJoining(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('/api/join-household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          userUid: user.uid
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join household");
      }
      
      const roleMsg = data.role === 'guest' 
        ? "Joined as a Guest with view-only permissions." 
        : "Joined as a Family Member with full permissions.";
      setSuccess(`Successfully joined the household! ${roleMsg} Please refresh the page.`);
      setJoinCode('');
    } catch (err: any) {
      setError(err.message || "Failed to join household");
    } finally {
      setIsJoining(false);
    }
  };

  const isExpired = timeLeft !== null && timeLeft <= 0;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const total = stats.consumedCount + stats.wastedCount;
  const score = total === 0 ? 0 : Math.round((stats.consumedCount / total) * 100);

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
          <Activity className="mr-2 text-emerald-600" size={24} />
          Dashboard
        </h2>
        <p className="text-sm text-gray-600">Track your food waste and household.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Target size={18} className="mr-2 text-indigo-500" />
          Food Waste Score
        </h3>
        
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="3"
                strokeDasharray={`${score}, 100`}
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{score}%</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Saved</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Cooked</p>
            <p className="text-2xl font-bold text-emerald-900">{stats.consumedCount}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Wasted</p>
            <p className="text-2xl font-bold text-red-900">{stats.wastedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <Users size={18} className="mr-2 text-blue-500" />
            Household Sharing & Permissions
          </span>
          {userProfile?.linkedHousehold && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isGuest ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {isGuest ? 'Guest (View Only)' : 'Family Member (Full Access)'}
            </span>
          )}
        </h3>
        
        {!user ? (
          <p className="text-sm text-gray-500">Sign in to share your pantry with household members.</p>
        ) : (
          <div className="space-y-6">
            {userProfile?.linkedHousehold ? (
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 space-y-2">
                <p className="font-medium">
                  You are currently joined to another household pantry ({isGuest ? 'Guest View-Only' : 'Family Member Full Access'}).
                </p>
                <p className="text-xs text-blue-700">
                  {isGuest 
                    ? 'As a guest, you can view the household pantry, recipes, and shopping list without making edits or consuming items.' 
                    : 'As a family member, you have full access to add, consume, and edit grocery items alongside the household owner.'}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-800 font-semibold">Invite to Household</p>
                    {inviteCode && (
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isExpired 
                          ? 'bg-red-100 text-red-700' 
                          : timeLeft !== null && timeLeft < 60 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Clock size={12} className="mr-1" />
                        {isExpired ? 'Expired' : `Valid for ${formatTime(timeLeft || 0)}`}
                      </span>
                    )}
                  </div>

                  {/* Permission Selector Tabs */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Choose member permission level:
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedPermission('family')}
                        className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                          selectedPermission === 'family'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <ShieldCheck size={15} className={selectedPermission === 'family' ? 'text-emerald-600' : ''} />
                        <span>Add Family Member</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPermission('guest')}
                        className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                          selectedPermission === 'guest'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Eye size={15} className={selectedPermission === 'guest' ? 'text-purple-600' : ''} />
                        <span>Invite Guest</span>
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 px-1">
                      {selectedPermission === 'family' ? (
                        <span className="text-emerald-700">
                          <strong>Family Member:</strong> Has all permissions same as you (add/delete groceries, mark cooked, modify shopping list).
                        </span>
                      ) : (
                        <span className="text-purple-700">
                          <strong>Guest:</strong> Has <strong>view-only</strong> permissions (can see pantry items and shopping list, cannot add, edit, or delete).
                        </span>
                      )}
                    </div>
                  </div>

                  {!inviteCode ? (
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => generateInvite(selectedPermission)}
                        disabled={isGenerating}
                        className="text-sm font-medium bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors flex items-center space-x-2"
                      >
                        <UserPlus size={16} />
                        <span>
                          {isGenerating 
                            ? 'Generating...' 
                            : selectedPermission === 'family' 
                              ? 'Generate Code: Add Family Member' 
                              : 'Generate Code: Invite Guest (View Only)'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`px-4 py-2.5 rounded-xl font-mono text-xl font-bold tracking-widest flex-1 text-center border ${
                          isExpired 
                            ? 'bg-gray-100 border-gray-300 text-gray-400 line-through' 
                            : inviteRole === 'guest'
                              ? 'bg-purple-50/60 border-purple-200 text-purple-900'
                              : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        }`}>
                          {inviteCode}
                        </div>
                        <button 
                          onClick={() => {
                            if (isExpired) return;
                            navigator.clipboard.writeText(inviteCode);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          disabled={isExpired}
                          title="Copy code"
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white p-2.5 rounded-xl transition-colors"
                        >
                          {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                        </button>
                        <button 
                          onClick={() => generateInvite(selectedPermission)}
                          disabled={isGenerating}
                          title="Regenerate new code"
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-xl transition-colors"
                        >
                          <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs px-1">
                        <span className={`font-semibold inline-flex items-center ${
                          inviteRole === 'guest' ? 'text-purple-700' : 'text-emerald-700'
                        }`}>
                          {inviteRole === 'guest' ? (
                            <><Eye size={13} className="mr-1" /> Guest Invite (View Only)</>
                          ) : (
                            <><ShieldCheck size={13} className="mr-1" /> Family Member Invite (All Permissions)</>
                          )}
                        </span>
                        <span className="text-gray-400">Expires in 5 mins</span>
                      </div>

                      {isExpired ? (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center justify-between">
                          <span>This code expired after 5 minutes. You must regenerate a new code to add a member.</span>
                          <button 
                            onClick={() => generateInvite(selectedPermission)}
                            className="font-bold underline ml-2 shrink-0 hover:text-red-900"
                          >
                            Regenerate
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Share this code with the person. Once entered, they will be added with the chosen permission level. Code is strictly valid for 5 minutes.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-700 mb-2 font-medium">Join a Household</p>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button 
                      onClick={handleJoin}
                      disabled={isJoining || joinCode.length < 5}
                      className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      {isJoining ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                  {success && <p className="text-xs text-emerald-600 mt-2">{success}</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
