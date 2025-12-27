import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Coins, Settings, Wallet, RefreshCw, Loader2, ChevronRight, Award, Heart, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserStats, formatNumber, type UserStats } from '../services/profile.service';
import { getMatches } from '../services/matches.service';
import { haptic } from '../utils/telegram';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const [statsData, matchesData] = await Promise.all([
        getUserStats(),
        getMatches(1, 0), // Just get total count
      ]);
      setStats(statsData);
      setMatchCount(matchesData.total);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (rank: string) => {
    switch (rank) {
      case 'WHALE':
        return { emoji: '🐋', class: 'badge-whale', label: 'Whale', color: 'text-blue-400' };
      case 'SHARK':
        return { emoji: '🦈', class: 'badge-shark', label: 'Shark', color: 'text-purple-400' };
      default:
        return { emoji: '🦐', class: 'badge-shrimp', label: 'Shrimp', color: 'text-pink-400' };
    }
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-white/60">Loading profile...</p>
      </div>
    );
  }

  const rankInfo = getRankBadge(user.wallet_rank || 'SHRIMP');
  const priceChange = user.price_change_24h || 0;

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header with gradient */}
      <div className="bg-gradient-to-b from-primary/20 to-transparent pt-8 pb-16 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => { haptic.impact('light'); loadStats(); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-12">
        <div className="card p-6">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt={user.display_name}
                className="w-20 h-20 rounded-full border-4 border-primary/50 object-cover"
              />
              <span className="absolute -bottom-1 -right-1 text-2xl">{rankInfo.emoji}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.display_name}</h2>
              {user.username && (
                <p className="text-white/60">@{user.username}</p>
              )}
              <span className={`inline-flex items-center gap-1 mt-1 text-sm ${rankInfo.color}`}>
                {rankInfo.emoji} {rankInfo.label}
              </span>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-white/80 mb-6">{user.bio}</p>
          )}

          {/* Market Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Market Price */}
            <div className="card bg-dark-100/50 p-3 rounded-xl">
              <div className="text-2xl font-bold text-primary">
                ${(user.market_price || 10).toFixed(2)}
              </div>
              <div className={`text-sm flex items-center justify-center gap-1 ${
                priceChange >= 0 ? 'text-neon-green' : 'text-neon-red'
              }`}>
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
              <div className="text-xs text-white/50 mt-1">Market Price</div>
            </div>

            {/* $LOVE Balance */}
            <div className="card bg-dark-100/50 p-3 rounded-xl">
              <div className="text-2xl font-bold text-neon-yellow">
                {formatNumber(user.balance_love || 0)}
              </div>
              <div className="text-sm text-white/60 flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" />
                $LOVE
              </div>
              <div className="text-xs text-white/50 mt-1">Balance</div>
            </div>

            {/* Matches */}
            <div className="card bg-dark-100/50 p-3 rounded-xl">
              <div className="text-2xl font-bold text-neon-purple">
                {matchCount}
              </div>
              <div className="text-sm text-white/60 flex items-center justify-center gap-1">
                <Heart className="w-3 h-3" />
                Matches
              </div>
              <div className="text-xs text-white/50 mt-1">Connections</div>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        {stats && (
          <div className="card mt-4 p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Your Activity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Likes Received</span>
                <span className="font-bold text-neon-green">{stats.total_likes_received}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Likes Given</span>
                <span className="font-bold text-primary">{stats.total_likes_given}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Contracts Minted</span>
                <span className="font-bold text-neon-purple">{stats.total_contracts_minted}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Market Rank</span>
                <span className="font-bold text-neon-yellow">#{stats.market_rank || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-3">
          <Link 
            to="/wallet" 
            onClick={() => haptic.impact('light')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/10 transition-all"
          >
            <div className="p-2 rounded-full bg-primary/20">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Connect Wallet</div>
              <div className="text-sm text-white/60">Link your TON wallet for rewards</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </Link>

          <Link 
            to="/tasks" 
            onClick={() => haptic.impact('light')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/10 transition-all"
          >
            <div className="p-2 rounded-full bg-neon-yellow/20">
              <Coins className="w-5 h-5 text-neon-yellow" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Earn More $LOVE</div>
              <div className="text-sm text-white/60">Complete tasks & daily missions</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </Link>

          <Link 
            to="/referrals" 
            onClick={() => haptic.impact('light')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/10 transition-all"
          >
            <div className="p-2 rounded-full bg-neon-purple/20">
              <Users className="w-5 h-5 text-neon-purple" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Invite Friends</div>
              <div className="text-sm text-white/60">Get $LOVE for each referral</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-white/40 pb-4">
          <p>CryptoCrush v1.0.0 • Made with 💜</p>
          <p className="mt-1">User ID: {user.id?.slice(0, 8)}...</p>
        </div>
      </div>
    </div>
  );
}
