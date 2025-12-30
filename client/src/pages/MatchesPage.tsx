import { useState, useEffect } from 'react';
import { Heart, MessageCircle, TrendingUp, Loader2, RefreshCw, Sparkles, Flame, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMatches, formatTimeAgo, mintContract, type Match } from '../services/matches.service';
import { fudUser, getFudStatus, type FudStatus } from '../services/profile.service';
import { haptic } from '../utils/telegram';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [fudingId, setFudingId] = useState<string | null>(null);
  const [fudStatuses, setFudStatuses] = useState<Record<string, FudStatus>>({});
  const [showFudConfirm, setShowFudConfirm] = useState<string | null>(null);
  const [fudMessage, setFudMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { matches } = await getMatches();
      setMatches(matches);
      
      // Load FUD status for each match
      const statuses: Record<string, FudStatus> = {};
      for (const match of matches) {
        try {
          const status = await getFudStatus(match.partner_id);
          statuses[match.partner_id] = status;
        } catch {
          // Ignore errors, user can still try to FUD
        }
      }
      setFudStatuses(statuses);
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

  // Handle FUD user
  const handleFud = async (partnerId: string, partnerName: string) => {
    try {
      setFudingId(partnerId);
      setShowFudConfirm(null);
      haptic.impact('heavy');
      
      const result = await fudUser(partnerId);
      
      haptic.notification('success');
      setFudMessage({ 
        type: 'success', 
        text: result.message || `📉 ${partnerName}'s price dumped -15%!` 
      });
      
      // Update FUD status
      setFudStatuses(prev => ({
        ...prev,
        [partnerId]: { success: true, can_fud: false, cooldown_remaining_hours: 24 }
      }));
      
      // Reload matches
      await loadMatches();
      
      setTimeout(() => setFudMessage(null), 5000);
    } catch (err: any) {
      haptic.notification('error');
      setFudMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to FUD user' 
      });
      setTimeout(() => setFudMessage(null), 5000);
    } finally {
      setFudingId(null);
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
      {/* FUD Message Toast */}
      <AnimatePresence>
        {fudMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl text-center font-medium ${
              fudMessage.type === 'success' 
                ? 'bg-neon-red/90 text-white' 
                : 'bg-white/90 text-neon-red'
            }`}
          >
            {fudMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FUD Confirmation Modal */}
      <AnimatePresence>
        {showFudConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowFudConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-100 rounded-2xl p-6 max-w-sm w-full border border-neon-red/30"
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">⚠️</div>
                <h3 className="text-xl font-bold text-neon-red">Confirm FUD</h3>
                <p className="text-white/70 mt-2 text-sm">
                  This will dump their Market Price by <span className="text-neon-red font-bold">-15%</span>. 
                  You can only FUD once per 24 hours per match.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFudConfirm(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const match = matches.find(m => m.partner_id === showFudConfirm);
                    if (match) handleFud(match.partner_id, match.display_name);
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neon-red to-red-600 text-white font-bold flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-4 h-4" />
                  FUD Them!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

            {/* Combined Market Cap & Action Buttons */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-white/60">Combined Cap: </span>
                <span className="text-primary font-semibold">
                  ${match.combined_market_cap?.toFixed(2) || '0.00'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* FUD Button */}
                {(() => {
                  const fudStatus = fudStatuses[match.partner_id];
                  const canFud = !fudStatus || fudStatus.can_fud !== false;
                  const isFuding = fudingId === match.partner_id;
                  
                  return (
                    <button
                      onClick={() => {
                        haptic.impact('light');
                        setShowFudConfirm(match.partner_id);
                      }}
                      disabled={!canFud || isFuding}
                      className={`text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all ${
                        canFud 
                          ? 'bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/30' 
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                      title={canFud ? 'FUD their price -15%' : `Cooldown: ${fudStatus?.cooldown_remaining_hours || 24}h`}
                    >
                      {isFuding ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      FUD
                    </button>
                  );
                })()}

                {/* Mint Contract Button */}
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
                        Mint 💍
                      </>
                    )}
                  </button>
                )}
                
                {match.status === 'MINTED_CONTRACT' && match.contract_address && (
                  <div className="text-xs text-neon-purple/80 truncate max-w-[80px]">
                    {match.contract_address.slice(0, 8)}...
                  </div>
                )}
              </div>
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
