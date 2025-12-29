import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Heart, Loader2, RefreshCw, Users, Flame, Crown, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getLeaderboard, 
  getCouplesLeaderboard,
  getRankDisplay,
  type LeaderboardType, 
  type LeaderboardUser,
  type LeaderboardCouple 
} from '../services/leaderboard.service';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';
import { getAvatarUrl, avatarRingClass } from '../utils/helpers';

/**
 * Get rank badge styling based on rank position
 */
function getRankBadgeStyle(rank: number): { 
  wrapper: string; 
  badge: string; 
  showCrown: boolean;
  glow: string;
} {
  if (rank <= 3) {
    // Top 3: Gold treatment with crown
    return {
      wrapper: 'relative',
      badge: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-dark font-black border-2 border-yellow-300',
      showCrown: true,
      glow: 'shadow-[0_0_20px_rgba(251,191,36,0.6)]',
    };
  } else if (rank <= 100) {
    // Top 100: Silver treatment
    return {
      wrapper: 'relative',
      badge: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-dark font-bold border-2 border-gray-200',
      showCrown: false,
      glow: 'shadow-md',
    };
  } else {
    // Everyone else: Neon green
    return {
      wrapper: 'relative',
      badge: 'bg-neon-green/10 text-neon-green font-semibold border border-neon-green/50',
      showCrown: false,
      glow: '',
    };
  }
}

type TabType = 'users' | 'couples';

const LEADERBOARD_FILTERS: { key: LeaderboardType; label: string; icon: React.ReactNode }[] = [
  { key: 'market_cap', label: 'Top Cap', icon: <Trophy className="w-4 h-4" /> },
  { key: 'gainers', label: 'Gainers', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'losers', label: 'Losers', icon: <TrendingDown className="w-4 h-4" /> },
  { key: 'matches', label: 'Popular', icon: <Heart className="w-4 h-4" /> },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [filterType, setFilterType] = useState<LeaderboardType>('market_cap');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [couples, setCouples] = useState<LeaderboardCouple[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, filterType]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'users') {
        const { users: data, userRank: rank } = await getLeaderboard(filterType, 50, 0);
        setUsers(data);
        setUserRank(rank);
      } else {
        const { couples: data } = await getCouplesLeaderboard(20, 0);
        setCouples(data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankEmoji = (rank: string) => {
    switch (rank) {
      case 'WHALE': return '🐋';
      case 'SHARK': return '🦈';
      default: return '🦐';
    }
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-neon-green';
    if (change < 0) return 'text-neon-red';
    return 'text-white/60';
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-neon-yellow" />
            Leaderboard
          </h1>
          <button
            onClick={() => { haptic.impact('light'); loadData(); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { haptic.impact('light'); setActiveTab('users'); }}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'users' 
                ? 'bg-primary text-dark' 
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Traders
          </button>
          <button
            onClick={() => { haptic.impact('light'); setActiveTab('couples'); }}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'couples' 
                ? 'bg-primary text-dark' 
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Heart className="w-4 h-4" />
            Couples
          </button>
        </div>

        {/* Filters (only for users tab) */}
        {activeTab === 'users' && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {LEADERBOARD_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => { haptic.impact('light'); setFilterType(filter.key); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  filterType === filter.key
                    ? 'bg-neon-purple text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* My Rank Banner - Prominent Section */}
      {activeTab === 'users' && userRank && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-4 p-5 bg-gradient-to-r from-primary/30 via-neon-purple/30 to-primary/30 rounded-2xl border-2 border-primary/50 shadow-[0_0_30px_rgba(0,255,136,0.2)] relative overflow-hidden"
        >
          {/* Animated background shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={user ? getAvatarUrl(user) : ''}
                  alt="You"
                  className={`w-16 h-16 rounded-full border-3 border-primary object-cover shadow-[0_0_15px_rgba(0,255,136,0.4)] ${avatarRingClass}`}
                />
                <Star className="absolute -top-1 -right-1 w-5 h-5 text-neon-yellow fill-neon-yellow" />
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Your Rank</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-neon-yellow to-neon-purple">
                    #{userRank}
                  </span>
                  {userRank <= 10 && <Crown className="w-6 h-6 text-neon-yellow animate-pulse" />}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60 mb-1">Market Price</p>
              <p className="text-3xl font-bold text-primary">
                ${user?.market_price?.toFixed(2) || '10.00'}
              </p>
              {user?.price_change_24h !== undefined && (
                <p className={`text-sm ${user.price_change_24h >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {user.price_change_24h >= 0 ? '+' : ''}{user.price_change_24h.toFixed(2)}%
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-white/60 mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Users List */}
      {!isLoading && !error && activeTab === 'users' && (
        <div className="px-4 space-y-2">
          {users.map((leaderUser, index) => {
            const rankDisplay = getRankDisplay(leaderUser.rank);
            const rankStyle = getRankBadgeStyle(leaderUser.rank);
            const isCurrentUser = leaderUser.id === user?.id;
            
            return (
              <motion.div
                key={leaderUser.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`card p-3 flex items-center gap-3 transition-all ${
                  isCurrentUser 
                    ? 'border-2 border-primary bg-primary/15 shadow-[0_0_15px_rgba(0,255,136,0.3)]' 
                    : leaderUser.rank <= 3
                    ? 'border border-yellow-400/30 bg-yellow-400/5'
                    : ''
                }`}
              >
                {/* Rank Badge */}
                <div className={rankStyle.wrapper}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rankStyle.badge} ${rankStyle.glow}`}>
                    {leaderUser.rank <= 3 ? (
                      <span className="text-xl">{rankDisplay.emoji}</span>
                    ) : (
                      <span className="text-sm">#{leaderUser.rank}</span>
                    )}
                  </div>
                  {rankStyle.showCrown && (
                    <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 drop-shadow-lg" />
                  )}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <img
                    src={getAvatarUrl(leaderUser)}
                    alt={leaderUser.display_name}
                    className={`w-12 h-12 rounded-full border-2 object-cover ${avatarRingClass} ${
                      leaderUser.rank <= 3 
                        ? 'border-yellow-400' 
                        : leaderUser.rank <= 100 
                        ? 'border-gray-400' 
                        : 'border-white/20'
                    }`}
                  />
                  <span className="absolute -bottom-1 -right-1 text-sm">
                    {getRankEmoji(leaderUser.wallet_rank)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold truncate ${leaderUser.rank <= 3 ? 'text-yellow-300' : ''}`}>
                      {leaderUser.display_name}
                      {isCurrentUser && <span className="text-primary ml-1 font-bold">(You)</span>}
                    </h3>
                  </div>
                  {leaderUser.username && (
                    <p className="text-xs text-white/50 truncate">@{leaderUser.username}</p>
                  )}
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className={`font-bold ${leaderUser.rank <= 3 ? 'text-yellow-300 text-lg' : 'text-primary'}`}>
                    ${leaderUser.market_price?.toFixed(2) || '0.00'}
                  </p>
                  <p className={`text-xs flex items-center justify-end gap-1 ${getPriceChangeColor(leaderUser.price_change_24h || 0)}`}>
                    {(leaderUser.price_change_24h || 0) >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {(leaderUser.price_change_24h || 0) >= 0 ? '+' : ''}
                    {(leaderUser.price_change_24h || 0).toFixed(2)}%
                  </p>
                </div>
              </motion.div>
            );
          })}

          {users.length === 0 && (
            <div className="text-center py-12 text-white/60">
              No traders found
            </div>
          )}
        </div>
      )}

      {/* Couples List */}
      {!isLoading && !error && activeTab === 'couples' && (
        <div className="px-4 space-y-3">
          {couples.map((couple, index) => {
            const rankDisplay = getRankDisplay(couple.rank);
            const rankStyle = getRankBadgeStyle(couple.rank);
            
            return (
              <motion.div 
                key={couple.relationship_id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`card p-4 ${
                  couple.rank <= 3 
                    ? 'border border-yellow-400/30 bg-gradient-to-br from-yellow-400/5 to-transparent' 
                    : ''
                }`}
              >
                {/* Rank & Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className={rankStyle.wrapper}>
                    <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${rankStyle.badge} ${rankStyle.glow}`}>
                      {couple.rank <= 3 ? (
                        <span className="text-lg">{rankDisplay.emoji}</span>
                      ) : (
                        <span className="text-sm font-semibold">#{couple.rank}</span>
                      )}
                      {rankStyle.showCrown && <Crown className="w-4 h-4 text-yellow-600" />}
                    </div>
                  </div>
                  {couple.status === 'MINTED_CONTRACT' && (
                    <span className="text-xs px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Minted
                    </span>
                  )}
                </div>

                {/* Couple Avatars */}
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center">
                    <img
                      src={couple.user_a_avatar || `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${couple.user_a_id}&backgroundColor=transparent`}
                      alt={couple.user_a_name}
                      className={`w-14 h-14 rounded-full border-2 border-primary/50 object-cover mx-auto ${avatarRingClass}`}
                    />
                    <p className="text-sm font-medium mt-1 truncate max-w-[80px]">{couple.user_a_name}</p>
                    <p className="text-xs text-primary">${couple.user_a_price?.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <Heart className="w-6 h-6 text-primary fill-primary" />
                  </div>

                  <div className="text-center">
                    <img
                      src={couple.user_b_avatar || `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${couple.user_b_id}&backgroundColor=transparent`}
                      alt={couple.user_b_name}
                      className={`w-14 h-14 rounded-full border-2 border-neon-purple/50 object-cover mx-auto ${avatarRingClass}`}
                    />
                    <p className="text-sm font-medium mt-1 truncate max-w-[80px]">{couple.user_b_name}</p>
                    <p className="text-xs text-neon-purple">${couple.user_b_price?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Combined Market Cap */}
                <div className={`text-center p-3 rounded-lg ${
                  couple.rank <= 3 
                    ? 'bg-gradient-to-r from-yellow-400/10 via-amber-500/10 to-yellow-400/10' 
                    : 'bg-white/5'
                }`}>
                  <p className="text-xs text-white/60">Combined Market Cap</p>
                  <p className={`text-2xl font-bold ${
                    couple.rank <= 3 ? 'text-yellow-400' : 'text-neon-yellow'
                  }`}>
                    ${couple.combined_market_cap?.toFixed(2)}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {couples.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💔</div>
              <p className="text-white/60">No couples yet. Be the first to match!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
