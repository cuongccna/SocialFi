import { useState, useEffect } from 'react';
import { Heart, MessageCircle, TrendingUp, Loader2, RefreshCw, Sparkles, Flame } from 'lucide-react';
import { getMatches, formatTimeAgo, mintContract, type Match } from '../services/matches.service';
import { haptic } from '../utils/telegram';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintingId, setMintingId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { matches } = await getMatches();
      setMatches(matches);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintContract = async (matchId: string) => {
    try {
      setMintingId(matchId);
      haptic.impact('heavy');
      
      const result = await mintContract(matchId);
      console.log('Mint result:', result);
      
      haptic.notification('success');
      
      // Reload matches to reflect new status
      await loadMatches();
    } catch (err) {
      console.error('Failed to mint contract:', err);
      haptic.notification('error');
    } finally {
      setMintingId(null);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-white/60">Loading your matches...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-semibold mb-2">Oops!</h2>
        <p className="text-white/60 mb-6">{error}</p>
        <button onClick={loadMatches} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (matches.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">💔</div>
        <h2 className="text-xl font-semibold mb-2">No Matches Yet</h2>
        <p className="text-white/60 mb-6">
          Keep swiping to find your crypto soulmate!
        </p>
        <a href="/" className="btn-primary">
          Start Trading
        </a>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" fill="currentColor" />
              Your Matches
            </h1>
            <p className="text-white/60 text-sm">
              {matches.length} mutual {matches.length === 1 ? 'connection' : 'connections'}
            </p>
          </div>
          <button 
            onClick={loadMatches}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div className="p-4 space-y-3">
        {matches.map((match) => (
          <div
            key={match.relationship_id}
            className="card p-4 hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={match.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.partner_id}`}
                  alt={match.display_name}
                  className="w-14 h-14 rounded-full border-2 border-primary/50 object-cover"
                />
                <span className="absolute -bottom-1 -right-1 text-lg">
                  {getRankEmoji(match.wallet_rank)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{match.display_name}</h3>
                  {match.status === 'MINTED_CONTRACT' && (
                    <span className="text-xs px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Minted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60 mt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    ${match.market_price?.toFixed(2) || '0.00'}
                  </span>
                  <span className={`text-xs ${getPriceChangeColor(match.price_change_24h || 0)}`}>
                    {(match.price_change_24h || 0) >= 0 ? '+' : ''}
                    {(match.price_change_24h || 0).toFixed(2)}%
                  </span>
                  <span>•</span>
                  <span>{formatTimeAgo(match.matched_at)}</span>
                </div>
              </div>

              {/* Action - Chat Button */}
              <a 
                href={`/chat?match=${match.relationship_id}`}
                className="p-3 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-primary" />
              </a>
            </div>

            {/* Combined Market Cap & Mint Button */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-white/60">Combined Cap: </span>
                <span className="text-primary font-semibold">
                  ${match.combined_market_cap?.toFixed(2) || '0.00'}
                </span>
              </div>
              
              {match.status === 'MATCHED' && (
                <button
                  onClick={() => handleMintContract(match.relationship_id)}
                  disabled={mintingId === match.relationship_id}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  {mintingId === match.relationship_id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Flame className="w-3 h-3" />
                      Mint Contract 💍
                    </>
                  )}
                </button>
              )}
              
              {match.status === 'MINTED_CONTRACT' && match.contract_address && (
                <div className="text-xs text-neon-purple/80 truncate max-w-[120px]">
                  {match.contract_address.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="p-4">
        <div className="card bg-gradient-to-r from-neon-purple/10 to-primary/10 p-4 border-neon-purple/30">
          <p className="text-sm text-center text-white/80">
            💡 Mint a "Love Contract" with your match to unlock prediction markets!
          </p>
        </div>
      </div>
    </div>
  );
}
