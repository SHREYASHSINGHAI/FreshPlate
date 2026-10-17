import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createHouseholdInvite, joinHousehold } from '../services/householdService';
import { Activity, Users, Copy, CheckCircle, Target } from 'lucide-react';

export default function DashboardView() {
  const { user, householdId, userProfile } = useAuth();
  const [stats, setStats] = useState({ consumedCount: 0, wastedCount: 0 });
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
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

  const generateInvite = async () => {
    if (!user) return;
    try {
      setError('');
      const code = await createHouseholdInvite(user.uid);
      setInviteCode(code);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite code');
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    setIsJoining(true);
    setError('');
    setSuccess('');
    
    try {
      await joinHousehold(user, joinCode);
      setSuccess("Successfully joined the household! Please refresh the page.");
      setJoinCode('');
    } catch (err: any) {
      setError(err.message || "Failed to join household");
    } finally {
      setIsJoining(false);
    }
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
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Users size={18} className="mr-2 text-blue-500" />
          Household Sharing
        </h3>
        
        {!user ? (
          <p className="text-sm text-gray-500">Sign in to share your pantry with a roommate.</p>
        ) : (
          <div className="space-y-6">
            {userProfile?.linkedHousehold ? (
              <div className="space-y-3">
                {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                  You are currently joined to another user's household pantry. To manage your own again, please contact support.
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">Invite Roommate</p>
                  {!inviteCode ? (
                    <button 
                      onClick={generateInvite}
                      className="text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors"
                    >
                      Generate Invite Code
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl font-mono text-lg font-bold tracking-widest text-gray-800 flex-1 text-center">
                        {inviteCode}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(inviteCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-colors"
                      >
                        {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Share this code. Once they join, they will see and manage your pantry and shopping list.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Join a Household</p>
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
