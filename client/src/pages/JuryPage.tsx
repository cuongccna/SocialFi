/**
 * JuryPage - Swipe-style voting on disputes
 * Jury DAO where users vote on relationship disputes
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  Scale,
  Gavel,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Award,
  ThumbsUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/axiosClient';
import { haptic } from '../utils/telegram';

interface Dispute {
  id: string;
  title: string;
  evidence_content: string;
  defendant_response: string | null;
  stake_amount: number;
  status: string;
  votes_plaintiff: number;
  votes_defendant: number;
  created_at: string;
  expiry_date: string;
  plaintiff_id: string;
  plaintiff_name: string;
  plaintiff_avatar: string | null;
  plaintiff_price: number;
  defendant_id: string;
  defendant_name: string;
  defendant_avatar: string | null;
  defendant_price: number;
  user_vote: string | null;
}

interface JuryStats {
  total_votes: number;
  total_rewards: number;
  open_disputes: number;
}

export default function JuryPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<JuryStats | null>(null);
  const [voting, setVoting] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Current dispute
  const currentDispute = useMemo(() => disputes[currentIndex], [disputes, currentIndex]);

  // Load disputes and stats
  useEffect(() => {
    loadData();
  }, []);

  interface DisputeResponse {
    disputes: Dispute[];
  }

  interface StatsResponse {
    stats: JuryStats;
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [disputesRes, statsRes] = await Promise.all([
        api.get<DisputeResponse>('/disputes'),
        api.get<StatsResponse>('/disputes/stats'),
      ]);

      // Filter out already voted disputes
      const allDisputes = disputesRes?.disputes || [];
      const openDisputes = allDisputes.filter((d: Dispute) => !d.user_vote);
      setDisputes(openDisputes);
      setStats(statsRes?.stats || null);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error('Failed to load disputes:', err);
      setError(err.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }

  // Handle swipe vote
  async function handleVote(side: 'PLAINTIFF' | 'DEFENDANT') {
    if (!currentDispute || voting) return;

    try {
      setVoting(true);
      haptic.impact('medium');

      await api.post(`/disputes/${currentDispute.id}/vote`, {
        vote_side: side,
        stake_amount: 5,
      });

      haptic.notification('success');

      // Move to next dispute
      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex < disputes.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Reload to get fresh disputes
          loadData();
        }
        setVoting(false);
      }, 300);

    } catch (err: any) {
      haptic.notification('error');
      setError(err.response?.data?.message || 'Failed to vote');
      setVoting(false);
      setSwipeDirection(null);
    }
  }

  // Handle drag
  function handleDragEnd(_: any, info: PanInfo) {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      setSwipeDirection('right');
      handleVote('DEFENDANT');
    } else if (info.offset.x < -swipeThreshold) {
      setSwipeDirection('left');
      handleVote('PLAINTIFF');
    }
  }

  // Format time remaining
  function formatTimeRemaining(expiry: string): string {
    const now = new Date();
    const end = new Date(expiry);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-bg p-4">
        <Loader2 className="w-12 h-12 text-neon-green animate-spin mb-4" />
        <p className="text-white/60">Loading cases...</p>
      </div>
    );
  }

  // Render error state
  if (error && disputes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-bg p-4">
        <AlertTriangle className="w-16 h-16 text-neon-red mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error</h2>
        <p className="text-white/60 text-center mb-4">{error}</p>
        <button onClick={loadData} className="btn-primary px-6 py-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Render empty state
  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-bg p-4">
        <div className="bg-gradient-to-b from-neon-green/20 to-transparent p-8 rounded-full mb-6">
          <Scale className="w-20 h-20 text-neon-green" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
        <p className="text-white/60 text-center mb-6">No pending cases to judge right now.</p>
        
        {/* Stats card */}
        {stats && (
          <div className="bg-dark-card rounded-xl p-4 w-full max-w-sm">
            <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Your Jury Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-neon-green">{stats.total_votes}</p>
                <p className="text-xs text-white/40">Cases Judged</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-yellow">{stats.total_rewards}</p>
                <p className="text-xs text-white/40">$LOVE Earned</p>
              </div>
            </div>
          </div>
        )}
        
        <button onClick={loadData} className="btn-secondary px-6 py-2 mt-6 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-dark-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-neon-green" />
            <h1 className="text-xl font-bold text-white">Jury DAO</h1>
          </div>
          <div className="flex items-center gap-2 bg-dark-card px-3 py-1.5 rounded-full">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white">{disputes.length - currentIndex} left</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="px-4 py-3 flex justify-around bg-dark-card/50">
          <div className="text-center">
            <p className="text-lg font-bold text-neon-green">{stats.total_votes}</p>
            <p className="text-xs text-white/40">Judged</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-neon-yellow">{stats.total_rewards}</p>
            <p className="text-xs text-white/40">$LOVE Earned</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{stats.open_disputes}</p>
            <p className="text-xs text-white/40">Open Cases</p>
          </div>
        </div>
      )}

      {/* Dispute Card */}
      <div className="px-4 py-6 relative overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <AnimatePresence mode="wait">
          {currentDispute && (
            <motion.div
              key={currentDispute.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
              }}
              exit={{ scale: 0.9, opacity: 0 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              className="bg-dark-card rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
            >
              {/* Case Header */}
              <div className="bg-gradient-to-r from-neon-red/20 to-neon-green/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-white">CASE #{currentIndex + 1}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Clock className="w-4 h-4" />
                    {formatTimeRemaining(currentDispute.expiry_date)}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white">{currentDispute.title}</h2>
              </div>

              {/* Parties */}
              <div className="p-4 grid grid-cols-2 gap-4">
                {/* Plaintiff */}
                <div className="text-center">
                  <div className="relative inline-block mb-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-red to-red-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {currentDispute.plaintiff_avatar ? (
                        <img src={currentDispute.plaintiff_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        currentDispute.plaintiff_name?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-neon-red text-white text-xs px-2 py-0.5 rounded-full">
                      Plaintiff
                    </div>
                  </div>
                  <p className="font-medium text-white truncate">{currentDispute.plaintiff_name}</p>
                  <p className="text-xs text-white/40">${Number(currentDispute.plaintiff_price || 10).toFixed(2)}</p>
                </div>

                {/* Defendant */}
                <div className="text-center">
                  <div className="relative inline-block mb-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-green to-green-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {currentDispute.defendant_avatar ? (
                        <img src={currentDispute.defendant_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        currentDispute.defendant_name?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-neon-green text-dark-bg text-xs px-2 py-0.5 rounded-full">
                      Defendant
                    </div>
                  </div>
                  <p className="font-medium text-white truncate">{currentDispute.defendant_name}</p>
                  <p className="text-xs text-white/40">${Number(currentDispute.defendant_price || 10).toFixed(2)}</p>
                </div>
              </div>

              {/* Evidence */}
              <div className="px-4 pb-4">
                <div className="bg-dark-bg rounded-xl p-4 mb-4">
                  <p className="text-xs text-neon-red uppercase tracking-wider mb-2">Plaintiff's Evidence</p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {currentDispute.evidence_content}
                  </p>
                </div>

                {currentDispute.defendant_response && (
                  <div className="bg-dark-bg rounded-xl p-4">
                    <p className="text-xs text-neon-green uppercase tracking-wider mb-2">Defendant's Response</p>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {currentDispute.defendant_response}
                    </p>
                  </div>
                )}
              </div>

              {/* Vote Counts */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-dark-bg rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-neon-red to-red-500"
                      style={{ 
                        width: `${currentDispute.votes_plaintiff + currentDispute.votes_defendant > 0 
                          ? (currentDispute.votes_plaintiff / (currentDispute.votes_plaintiff + currentDispute.votes_defendant)) * 100 
                          : 50}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>{currentDispute.votes_plaintiff} for Plaintiff</span>
                  <span>{currentDispute.votes_defendant} for Defendant</span>
                </div>
              </div>

              {/* Stake Info */}
              <div className="px-4 pb-4">
                <div className="bg-gradient-to-r from-neon-yellow/20 to-transparent rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-white/60">Case Stake</span>
                  <span className="text-lg font-bold text-neon-yellow">{Number(currentDispute.stake_amount).toFixed(0)} $LOVE</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe Hints */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-8">
          <motion.div 
            className="bg-neon-red/20 p-4 rounded-full"
            animate={{ opacity: swipeDirection === 'left' ? 1 : 0.3 }}
          >
            <ThumbsUp className="w-8 h-8 text-neon-red" />
          </motion.div>
          <motion.div 
            className="bg-neon-green/20 p-4 rounded-full"
            animate={{ opacity: swipeDirection === 'right' ? 1 : 0.3 }}
          >
            <ThumbsUp className="w-8 h-8 text-neon-green" />
          </motion.div>
        </div>
      </div>

      {/* Vote Buttons */}
      {currentDispute && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4">
          <div className="flex gap-4">
            <button
              onClick={() => { setSwipeDirection('left'); handleVote('PLAINTIFF'); }}
              disabled={voting}
              className="flex-1 bg-gradient-to-r from-neon-red to-red-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Plaintiff
            </button>
            <button
              onClick={() => { setSwipeDirection('right'); handleVote('DEFENDANT'); }}
              disabled={voting}
              className="flex-1 bg-gradient-to-r from-neon-green to-green-600 text-dark-bg font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Defendant
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-white/40 text-xs mt-2">
            Swipe or tap to vote • 5 $LOVE stake • Earn 2 $LOVE
          </p>
        </div>
      )}
    </div>
  );
}
