import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Heart, Loader2, RefreshCw, Users, Flame } from 'lucide-react';
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

      {/* Your Rank Banner */}
      {activeTab === 'users' && userRank && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-primary/20 to-neon-purple/20 rounded-xl border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Your Rank</p>
              <p className="text-2xl font-bold text-primary">#{userRank}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Market Price</p>
              <p className="text-xl font-bold">${user?.market_price?.toFixed(2) || '10.00'}</p>
            </div>
          </div>
        </div>
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
          {users.map((leaderUser) => {
            const rankDisplay = getRankDisplay(leaderUser.rank);
            const isCurrentUser = leaderUser.id === user?.id;
            
            return (
              <div
                key={leaderUser.id}
                className={`card p-3 flex items-center gap-3 ${
                  isCurrentUser ? 'border-primary/50 bg-primary/10' : ''
                }`}
              >
                {/* Rank */}
                <div className={`w-10 text-center font-bold ${rankDisplay.class}`}>
                  {leaderUser.rank <= 3 ? (
                    <span className="text-2xl">{rankDisplay.emoji}</span>
                  ) : (
                    <span className="text-lg">{rankDisplay.emoji}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <img
                    src={leaderUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leaderUser.id}`}
                    alt={leaderUser.display_name}
                    className="w-12 h-12 rounded-full border-2 border-white/20 object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 text-sm">
                    {getRankEmoji(leaderUser.wallet_rank)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {leaderUser.display_name}
                      {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                    </h3>
                  </div>
                  {leaderUser.username && (
                    <p className="text-xs text-white/50 truncate">@{leaderUser.username}</p>
                  )}
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="font-bold text-primary">
                    ${leaderUser.market_price?.toFixed(2) || '0.00'}
                  </p>
                  <p className={`text-xs ${getPriceChangeColor(leaderUser.price_change_24h || 0)}`}>
                    {(leaderUser.price_change_24h || 0) >= 0 ? '+' : ''}
                    {(leaderUser.price_change_24h || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
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
          {couples.map((couple) => {
            const rankDisplay = getRankDisplay(couple.rank);
            
            return (
              <div key={couple.relationship_id} className="card p-4">
                {/* Rank & Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`font-bold ${rankDisplay.class}`}>
                    {couple.rank <= 3 ? (
                      <span className="text-xl">{rankDisplay.emoji}</span>
                    ) : (
                      <span>{rankDisplay.emoji}</span>
                    )}
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
                      src={couple.user_a_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${couple.user_a_id}`}
                      alt={couple.user_a_name}
                      className="w-14 h-14 rounded-full border-2 border-primary/50 object-cover mx-auto"
                    />
                    <p className="text-sm font-medium mt-1 truncate max-w-[80px]">{couple.user_a_name}</p>
                    <p className="text-xs text-primary">${couple.user_a_price?.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <Heart className="w-6 h-6 text-primary fill-primary" />
                  </div>

                  <div className="text-center">
                    <img
                      src={couple.user_b_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${couple.user_b_id}`}
                      alt={couple.user_b_name}
                      className="w-14 h-14 rounded-full border-2 border-neon-purple/50 object-cover mx-auto"
                    />
                    <p className="text-sm font-medium mt-1 truncate max-w-[80px]">{couple.user_b_name}</p>
                    <p className="text-xs text-neon-purple">${couple.user_b_price?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Combined Market Cap */}
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/60">Combined Market Cap</p>
                  <p className="text-xl font-bold text-neon-yellow">
                    ${couple.combined_market_cap?.toFixed(2)}
                  </p>
                </div>
              </div>
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
