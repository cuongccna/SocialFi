/**
 * ReferralsPage - Invite Friends
 * Get $LOVE for each referral
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Copy,
  Share2,
  Gift,
  Loader2,
  ArrowLeft,
  Check,
  Coins,
  UserPlus,
} from 'lucide-react';
import { api } from '../api/axiosClient';
import { haptic } from '../utils/telegram';

interface ReferralStats {
  total_referrals: number;
  claimed_referrals: number;
  total_earned: number;
  pending_rewards: number;
}

interface Referral {
  id: string;
  created_at: string;
  reward_claimed: boolean;
  reward_amount: number;
  referred_name: string;
  referred_avatar: string | null;
}

export default function ReferralsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const rewardPerReferral = 50;

  useEffect(() => {
    loadReferralInfo();
  }, []);

  async function loadReferralInfo() {
    try {
      setLoading(true);
      interface ReferralResponse {
        referral_code: string;
        invite_link: string;
        stats: ReferralStats;
        recent_referrals: Referral[];
      }
      const res = await api.get<ReferralResponse>('/referrals');
      setReferralCode(res.referral_code);
      setInviteLink(res.invite_link);
      setStats(res.stats);
      setReferrals(res.recent_referrals || []);
    } catch (err) {
      console.error('Failed to load referral info:', err);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    haptic.impact('light');
    
    // In Telegram Mini App, clipboard API is often blocked
    // Try multiple methods
    try {
      // Method 1: Try navigator.clipboard (may be blocked)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        haptic.notification('success');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.log('Clipboard API blocked, trying fallback');
    }

    // Method 2: Fallback using execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        haptic.notification('success');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.log('execCommand failed:', err);
    }

    // Method 3: Show the link for manual copy
    alert(`Copy this link:\n\n${inviteLink}`);
  }

  async function shareLink() {
    haptic.impact('light');
    
    // Try native share if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CryptoCrush!',
          text: `Trade hearts, not just tokens! Use my invite link to get bonus $LOVE 💚`,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled or share failed
        copyLink();
      }
    } else {
      // Fallback to copy
      copyLink();
    }
  }

  async function claimRewards() {
    try {
      setClaiming(true);
      haptic.impact('medium');
      
      interface ClaimResponse {
        total_reward: number;
        claimed: number;
      }
      const res = await api.post<ClaimResponse>('/referrals/claim');
      
      if (res.total_reward > 0) {
        haptic.notification('success');
        alert(`Claimed ${res.total_reward} $LOVE from ${res.claimed} referrals!`);
        loadReferralInfo(); // Reload stats
      } else {
        haptic.notification('warning');
        alert('No pending rewards to claim');
      }
    } catch (err) {
      haptic.notification('error');
      console.error('Failed to claim rewards:', err);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg p-4">
        <Loader2 className="w-12 h-12 text-neon-green animate-spin mb-4" />
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-neon-green" />
              Invite Friends
            </h1>
            <p className="text-white/60 text-sm">Earn {rewardPerReferral} $LOVE per referral</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Invite Card */}
        <div className="bg-gradient-to-br from-neon-green/20 to-neon-blue/20 rounded-2xl p-6 border border-neon-green/30">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-neon-green/20 rounded-full flex items-center justify-center mb-4">
              <Gift className="w-10 h-10 text-neon-green" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Get {rewardPerReferral} $LOVE
            </h2>
            <p className="text-white/60">
              For each friend who joins and makes their first swipe!
            </p>
          </div>

          {/* Referral Code */}
          <div className="bg-dark-bg rounded-xl p-4 mb-4">
            <p className="text-white/60 text-xs mb-2 text-center">Your Referral Code</p>
            <p className="text-2xl font-mono font-bold text-center text-neon-green">
              {referralCode}
            </p>
          </div>

          {/* Invite Link */}
          <div className="bg-dark-bg rounded-xl p-3 flex items-center gap-2 mb-4">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 bg-transparent text-white/80 text-sm truncate outline-none"
            />
            <button
              onClick={copyLink}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-neon-green" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={shareLink}
            className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg"
          >
            <Share2 className="w-5 h-5" />
            Share Invite Link
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-card rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.total_referrals}</p>
              <p className="text-white/60 text-sm">Friends Invited</p>
            </div>
            <div className="bg-dark-card rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-neon-yellow">{stats.total_earned}</p>
              <p className="text-white/60 text-sm">$LOVE Earned</p>
            </div>
          </div>
        )}

        {/* Pending Rewards */}
        {stats && stats.pending_rewards > 0 && (
          <div className="bg-gradient-to-r from-neon-yellow/20 to-orange-500/20 rounded-xl p-4 border border-neon-yellow/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Pending Rewards</p>
                <p className="text-neon-yellow text-2xl font-bold">
                  {stats.pending_rewards * rewardPerReferral} $LOVE
                </p>
              </div>
              <button
                onClick={claimRewards}
                disabled={claiming}
                className="btn-primary py-3 px-6 flex items-center gap-2"
              >
                {claiming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Coins className="w-5 h-5" />
                )}
                Claim
              </button>
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-white/60" />
              Recent Referrals
            </h3>
            <div className="space-y-2">
              {referrals.map(ref => (
                <div key={ref.id} className="bg-dark-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center text-lg font-bold">
                    {ref.referred_avatar ? (
                      <img src={ref.referred_avatar} className="w-full h-full rounded-full" />
                    ) : (
                      ref.referred_name?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{ref.referred_name || 'Anonymous'}</p>
                    <p className="text-white/40 text-xs">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {ref.reward_claimed ? (
                    <span className="text-neon-green text-sm flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      +{ref.reward_amount}
                    </span>
                  ) : (
                    <span className="text-white/40 text-sm">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-dark-card rounded-xl p-4">
          <h3 className="font-semibold mb-3">How it works</h3>
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <span className="bg-neon-green/20 text-neon-green w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
              <p>Share your unique invite link with friends</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-neon-green/20 text-neon-green w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
              <p>They join CryptoCrush using your link</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-neon-green/20 text-neon-green w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
              <p>When they make their first swipe, you both earn $LOVE!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
