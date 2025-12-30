import { TrendingUp, TrendingDown, Coins, Zap } from 'lucide-react';
import type { User } from '../types';
import { getAvatarUrl } from '../utils/helpers';

interface HomePageProps {
  user: User | null;
}

export default function HomePage({ user }: HomePageProps) {
  // Use actual user data or mock data for display
  const stats = {
    marketPrice: user?.market_price ?? 10.5,
    priceChange: user?.price_change_24h ?? 2.5,
    loveBalance: user?.balance_love ?? 125.5,
    walletRank: user?.wallet_rank ?? 'SHRIMP',
  };

  const displayName = user?.display_name || 'Anon';
  const username = user?.username;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold text-gradient mb-2">
          CryptoCrush
        </h1>
        <p className="text-white/60 text-sm">
          Trade Hearts, Not Just Tokens 💚
        </p>
      </div>

      {/* Welcome Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <img
            src={user ? getAvatarUrl(user) : 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=anonymous&backgroundColor=transparent'}
            alt={displayName}
            className="w-16 h-16 rounded-full border-2 border-primary/50 object-cover"
          />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              gm, {displayName} 👋
            </h2>
            <p className="text-white/60 text-sm">
              {username ? `@${username}` : 'Welcome to the market'}
            </p>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Your Market Price */}
        <div className="card-glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-white/60 text-xs">Your Price</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            ${stats.marketPrice.toFixed(2)}
          </div>
          <div className={`flex items-center gap-1 text-sm ${stats.priceChange >= 0 ? 'text-primary' : 'text-danger'}`}>
            {stats.priceChange >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(1)}%
          </div>
        </div>

        {/* Love Balance */}
        <div className="card-glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-neon-yellow" />
            <span className="text-white/60 text-xs">$LOVE Balance</span>
          </div>
          <div className="text-2xl font-bold text-neon-yellow">
            {stats.loveBalance.toFixed(1)}
          </div>
          <div className="text-white/40 text-sm">
            {stats.walletRank}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Actions
        </h3>
        
        <a
          href="/feed"
          className="block card-glass p-4 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-primary">Start Trading</h4>
              <p className="text-white/60 text-sm">Swipe to earn $LOVE</p>
            </div>
            <div className="text-3xl">💚</div>
          </div>
        </a>

        <a
          href="/matches"
          className="block card-glass p-4 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-neon-purple">View Matches</h4>
              <p className="text-white/60 text-sm">Check your contracts</p>
            </div>
            <div className="text-3xl">💜</div>
          </div>
        </a>

        <a
          href="/markets"
          className="block card-glass p-4 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-neon-yellow">Prediction Markets</h4>
              <p className="text-white/60 text-sm">Bet on couples' futures</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </a>

        <a
          href="/jury"
          className="block card-glass p-4 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-neon-red">Jury DAO</h4>
              <p className="text-white/60 text-sm">Judge relationship disputes</p>
            </div>
            <div className="text-3xl">⚖️</div>
          </div>
        </a>
      </div>

      {/* Info Banner */}
      <div className="card bg-gradient-to-r from-primary/10 to-neon-blue/10 p-4 border-primary/30">
        <p className="text-sm text-center text-white/80">
          💡 Swipe Right = <span className="text-primary">LONG</span> (+0.5% to their price)
          <br />
          Swipe Left = <span className="text-danger">SHORT</span> (-0.2% to their price)
        </p>
      </div>
    </div>
  );
}
