import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Coins, Settings, Wallet, RefreshCw, Loader2, ChevronRight, Award, Heart, Users, Camera, BadgeCheck, Sparkles, Rocket, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getUserStats, formatNumber, boostProfile, type UserStats } from '../services/profile.service';
import { getMatches } from '../services/matches.service';
import { haptic } from '../utils/telegram';
import { getAvatarUrl, isDefaultAvatar, avatarRingClass } from '../utils/helpers';

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostMessage, setBoostMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Handle boost profile
  const handleBoost = async () => {
    if (isBoosting) return;
    
    try {
      setIsBoosting(true);
      setBoostMessage(null);
      haptic.impact('heavy');
      
      const result = await boostProfile();
      
      haptic.notification('success');
      setBoostMessage({ type: 'success', text: result.message || '🚀 Profile boosted! +10% price pump!' });
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
      await loadStats();
      
      // Auto-hide message after 5 seconds
      setTimeout(() => setBoostMessage(null), 5000);
    } catch (err: any) {
      haptic.notification('error');
      setBoostMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to boost profile' 
      });
      setTimeout(() => setBoostMessage(null), 5000);
    } finally {
      setIsBoosting(false);
    }
  };

  // Check if user is currently boosted
  const isBoosted = user?.boosted_until && new Date(user.boosted_until) > new Date();
  const boostTimeRemaining = isBoosted 
    ? Math.ceil((new Date(user!.boosted_until!).getTime() - Date.now()) / (1000 * 60))
    : 0;

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
                src={getAvatarUrl(user)}
                alt={user.display_name}
                className={`w-20 h-20 rounded-full border-4 border-primary/50 object-cover ${avatarRingClass}`}
              />
              <span className="absolute -bottom-1 -right-1 text-2xl">{rankInfo.emoji}</span>
              
              {/* Upload Photo Button - Show if using default avatar */}
              {isDefaultAvatar(user) && (
                <motion.button
                  onClick={() => {
                    haptic.impact('light');
                    setShowUploadTooltip(!showUploadTooltip);
                    // TODO: Implement actual upload flow
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Camera className="w-4 h-4 text-dark" />
                </motion.button>
              )}
              
              {/* Verified badge if has real photo */}
              {!isDefaultAvatar(user) && (
                <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-neon-blue flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {user.display_name}
                {!isDefaultAvatar(user) && (
                  <BadgeCheck className="w-5 h-5 text-neon-blue" />
                )}
              </h2>
              {user.username && (
                <p className="text-white/60">@{user.username}</p>
              )}
              <span className={`inline-flex items-center gap-1 mt-1 text-sm ${rankInfo.color}`}>
                {rankInfo.emoji} {rankInfo.label}
              </span>
            </div>
          </div>
          
          {/* Upload Photo Tooltip */}
          <AnimatePresence>
            {showUploadTooltip && isDefaultAvatar(user) && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-4 bg-gradient-to-r from-primary/20 via-neon-blue/20 to-neon-purple/20 rounded-xl border border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/20 shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary mb-1">Get Verified!</h4>
                    <p className="text-sm text-white/70 mb-3">
                      Upload a real photo to get the <span className="text-neon-blue">✓ Verified Badge</span> and 
                      <span className="text-neon-yellow font-bold"> boost your Market Cap by 10%!</span>
                    </p>
                    <button 
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                      onClick={() => {
                        haptic.impact('medium');
                        // TODO: Implement upload
                        alert('Photo upload coming soon!');
                      }}
                    >
                      <Camera className="w-4 h-4" />
                      Upload Photo
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowUploadTooltip(false)}
                    className="text-white/40 hover:text-white/60 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Boost Message */}
          <AnimatePresence>
            {boostMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-3 rounded-xl text-center ${
                  boostMessage.type === 'success' 
                    ? 'bg-neon-green/20 text-neon-green' 
                    : 'bg-neon-red/20 text-neon-red'
                }`}
              >
                {boostMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pump Profile Button */}
          <motion.button
            onClick={handleBoost}
            disabled={isBoosting || !!isBoosted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`mt-4 w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
              isBoosted 
                ? 'bg-gradient-to-r from-neon-purple/30 to-primary/30 text-white/60 cursor-not-allowed border border-neon-purple/30'
                : 'bg-gradient-to-r from-primary to-neon-green text-dark shadow-lg shadow-primary/30 hover:shadow-primary/50'
            }`}
          >
            {isBoosting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Pumping...
              </>
            ) : isBoosted ? (
              <>
                <Zap className="w-6 h-6" />
                Boosted! {boostTimeRemaining}m left
              </>
            ) : (
              <>
                <Rocket className="w-6 h-6" />
                🚀 PUMP PROFILE
              </>
            )}
          </motion.button>
          
          {!isBoosted && (
            <p className="text-center text-xs text-white/50 mt-2">
              500 $LOVE • +10% Price Pump • 30 min visibility boost
            </p>
          )}
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
