import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, Loader2, RefreshCw, 
  Heart, DollarSign, Flame, ChevronRight 
} from 'lucide-react';
import { 
  getMarkets, 
  placeBet, 
  formatTimeRemaining,
  calculatePayout,
  type Market, 
  type BetPosition 
} from '../services/markets.service';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';

export default function MarketsPage() {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betPosition, setBetPosition] = useState<BetPosition>('LONG');
  const [betAmount, setBetAmount] = useState('10');
  const [isBetting, setIsBetting] = useState(false);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { markets: data } = await getMarkets('OPEN', 20, 0);
      setMarkets(data);
    } catch (err) {
      console.error('Failed to load markets:', err);
      setError('Failed to load markets');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedMarket || !user) return;
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) {
      haptic.notification('error');
      return;
    }

    if (amount > (user.balance_love || 0)) {
      haptic.notification('error');
      return;
    }

    try {
      setIsBetting(true);
      haptic.impact('heavy');
      
      await placeBet(selectedMarket.id, betPosition, amount);
      
      haptic.notification('success');
      setSelectedMarket(null);
      setBetAmount('10');
      
      // Reload markets
      await loadMarkets();
    } catch (err) {
      console.error('Failed to place bet:', err);
      haptic.notification('error');
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-neon-yellow" />
            Prediction Markets
          </h1>
          <button
            onClick={() => { haptic.impact('light'); loadMarkets(); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-white/60">
          Bet LONG or SHORT on couples' relationships
        </p>
      </div>

      {/* Balance Banner */}
      {user && (
        <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-neon-yellow/20 to-primary/20 rounded-xl border border-neon-yellow/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-neon-yellow" />
            <span className="text-sm text-white/80">Your Balance</span>
          </div>
          <span className="font-bold text-neon-yellow">
            {(user.balance_love || 0).toFixed(0)} $LOVE
          </span>
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
        <div className="text-center py-12 px-4">
          <p className="text-white/60 mb-4">{error}</p>
          <button onClick={loadMarkets} className="btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && markets.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">No Open Markets</h2>
          <p className="text-white/60">
            Markets are created when couples mint their Love Contract!
          </p>
        </div>
      )}

      {/* Markets List */}
      {!isLoading && !error && markets.length > 0 && (
        <div className="px-4 space-y-4">
          {markets.map((market) => (
            <div key={market.id} className="card p-4">
              {/* Couple Info */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="text-center">
                  <img
                    src={market.user_a_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${market.user_a_id}`}
                    alt={market.user_a_name}
                    className="w-12 h-12 rounded-full border-2 border-primary/50 object-cover mx-auto"
                  />
                  <p className="text-xs font-medium mt-1 truncate max-w-[70px]">
                    {market.user_a_name}
                  </p>
                </div>

                <Heart className="w-5 h-5 text-primary fill-primary" />

                <div className="text-center">
                  <img
                    src={market.user_b_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${market.user_b_id}`}
                    alt={market.user_b_name}
                    className="w-12 h-12 rounded-full border-2 border-neon-purple/50 object-cover mx-auto"
                  />
                  <p className="text-xs font-medium mt-1 truncate max-w-[70px]">
                    {market.user_b_name}
                  </p>
                </div>
              </div>

              {/* Pool Stats */}
              <div className="mb-4">
                {/* Pool Bar */}
                <div className="h-3 bg-dark-200 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-neon-green h-full transition-all"
                    style={{ width: `${market.long_percentage}%` }}
                  />
                  <div 
                    className="bg-neon-red h-full transition-all"
                    style={{ width: `${100 - market.long_percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between mt-2 text-sm">
                  <div className="flex items-center gap-1 text-neon-green">
                    <TrendingUp className="w-4 h-4" />
                    <span>LONG {Number(market.long_percentage).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-neon-red">
                    <span>SHORT {(100 - Number(market.long_percentage)).toFixed(1)}%</span>
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Market Info */}
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-2 text-white/60">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeRemaining(market.expiry_date)}</span>
                </div>
                <div className="text-neon-yellow font-medium">
                  Pool: {Number(market.total_pool || 0).toFixed(0)} $LOVE
                </div>
              </div>

              {/* User's Existing Bet Badge */}
              {market.user_bet_position && (
                <div className={`mb-3 p-3 rounded-xl border ${
                  market.user_bet_position === 'LONG' 
                    ? 'bg-neon-green/10 border-neon-green/30' 
                    : 'bg-neon-red/10 border-neon-red/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {market.user_bet_position === 'LONG' 
                        ? <TrendingUp className="w-4 h-4 text-neon-green" />
                        : <TrendingDown className="w-4 h-4 text-neon-red" />
                      }
                      <span className={`text-sm font-medium ${
                        market.user_bet_position === 'LONG' ? 'text-neon-green' : 'text-neon-red'
                      }`}>
                        Your {market.user_bet_position} Bet
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {Number(market.user_bet_amount || 0).toFixed(0)} $LOVE
                    </span>
                  </div>
                </div>
              )}

              {/* Bet Button */}
              <button
                onClick={() => { 
                  haptic.impact('light'); 
                  setSelectedMarket(market);
                  // Auto-select user's existing position if they have one
                  if (market.user_bet_position) {
                    setBetPosition(market.user_bet_position);
                  }
                }}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {market.user_bet_position ? 'Add to Bet' : 'Place Bet'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bet Modal */}
      {selectedMarket && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setSelectedMarket(null)}
        >
          <div 
            className="w-full max-w-md bg-dark-100 rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-1">
                {selectedMarket.user_bet_position ? 'Add to Your Bet' : 'Place Your Bet'}
              </h3>
              <p className="text-sm text-white/60">
                {selectedMarket.user_a_name} ❤️ {selectedMarket.user_b_name}
              </p>
              {selectedMarket.user_bet_position && (
                <p className="text-xs text-neon-yellow mt-2">
                  Current bet: {Number(selectedMarket.user_bet_amount || 0).toFixed(0)} $LOVE on {selectedMarket.user_bet_position}
                </p>
              )}
            </div>

            {/* Position Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setBetPosition('LONG')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  betPosition === 'LONG'
                    ? 'border-neon-green bg-neon-green/20'
                    : 'border-white/20 bg-white/5'
                }`}
              >
                <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${
                  betPosition === 'LONG' ? 'text-neon-green' : 'text-white/60'
                }`} />
                <p className={`font-bold ${betPosition === 'LONG' ? 'text-neon-green' : ''}`}>
                  LONG 📈
                </p>
                <p className="text-xs text-white/60 mt-1">They stay together</p>
              </button>

              <button
                onClick={() => setBetPosition('SHORT')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  betPosition === 'SHORT'
                    ? 'border-neon-red bg-neon-red/20'
                    : 'border-white/20 bg-white/5'
                }`}
              >
                <TrendingDown className={`w-8 h-8 mx-auto mb-2 ${
                  betPosition === 'SHORT' ? 'text-neon-red' : 'text-white/60'
                }`} />
                <p className={`font-bold ${betPosition === 'SHORT' ? 'text-neon-red' : ''}`}>
                  SHORT 📉
                </p>
                <p className="text-xs text-white/60 mt-1">They break up</p>
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2">Bet Amount ($LOVE)</label>
              <div className="relative">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-dark-200 border border-white/20 rounded-xl px-4 py-3 text-lg font-bold focus:border-primary outline-none"
                  placeholder="10"
                  min="1"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                  {[10, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount.toString())}
                      className="px-2 py-1 text-xs bg-white/10 rounded-lg hover:bg-white/20"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/40 mt-2">
                Balance: {(user?.balance_love || 0).toFixed(0)} $LOVE
              </p>
            </div>

            {/* Potential Payout */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Potential Payout</span>
                <span className="font-bold text-neon-yellow">
                  ~{calculatePayout(
                    parseFloat(betAmount) || 0,
                    betPosition,
                    selectedMarket.pool_long,
                    selectedMarket.pool_short
                  ).toFixed(1)} $LOVE
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePlaceBet}
              disabled={isBetting || parseFloat(betAmount) < 1}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                betPosition === 'LONG'
                  ? 'bg-neon-green text-dark'
                  : 'bg-neon-red text-white'
              } disabled:opacity-50`}
            >
              {isBetting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing Bet...
                </>
              ) : (
                <>
                  Confirm {betPosition} Bet
                </>
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setSelectedMarket(null)}
              className="w-full py-3 text-white/60 mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
