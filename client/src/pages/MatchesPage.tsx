import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, TrendingUp, Loader2, RefreshCw, Sparkles, Flame, TrendingDown, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getMatches, formatTimeAgo, mintContract, type Match, type NftData } from '../services/matches.service';
import { fudUser, getFudStatus, type FudStatus } from '../services/profile.service';
import { haptic } from '../utils/telegram';
import { useNotifications } from '../context/NotificationContext';
import CertificateModal from '../components/CertificateModal';

export default function MatchesPage() {
  const navigate = useNavigate();
  const { hasUnreadChat, removeUnreadChat } = useNotifications();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [mintingPhase, setMintingPhase] = useState<'idle' | 'processing' | 'confirming' | 'generating'>('idle');
  const [fudingId, setFudingId] = useState<string | null>(null);
  const [fudStatuses, setFudStatuses] = useState<Record<string, FudStatus>>({});
  const [showFudConfirm, setShowFudConfirm] = useState<string | null>(null);
  const [fudMessage, setFudMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Certificate modal state
  const [showCertificate, setShowCertificate] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NftData | null>(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  
  // Store NFT data for already minted contracts
  const [nftDataCache, setNftDataCache] = useState<Record<string, NftData>>({});

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

  // Trigger confetti explosion
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ff00ff', '#00ffff', '#00ff88', '#ffd700', '#8b5cf6'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ff00ff', '#00ffff', '#00ff88', '#ffd700', '#8b5cf6'],
      });
    }, 250);
  };

  const handleMintContract = async (matchId: string, partnerName: string) => {
    try {
      setMintingId(matchId);
      setMintingPhase('processing');
      haptic.impact('heavy');
      
      // Phase 1: Processing (simulated delay for UX)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMintingPhase('confirming');
      
      // Phase 2: Confirming (simulated blockchain confirmation)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMintingPhase('generating');
      
      // Phase 3: Call the actual API
      const result = await mintContract(matchId);
      console.log('Mint result:', result);
      
      // Store NFT data in cache
      if (result.nft) {
        setNftDataCache(prev => ({
          ...prev,
          [matchId]: result.nft,
        }));
      }
      
      haptic.notification('success');
      
      // Trigger confetti explosion!
      triggerConfetti();
      
      // Show the certificate modal
      if (result.nft) {
        setSelectedNft(result.nft);
        setSelectedPartnerName(partnerName);
        setShowCertificate(true);
      }
      
      // Reload matches to reflect new status
      await loadMatches();
    } catch (err: any) {
      console.error('Failed to mint contract:', err);
      haptic.notification('error');
      setFudMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to mint contract. Check your $LOVE balance.' 
      });
      setTimeout(() => setFudMessage(null), 5000);
    } finally {
      setMintingId(null);
      setMintingPhase('idle');
    }
  };

  // Handle viewing already minted certificate
  const handleViewCertificate = (match: Match) => {
    // If we have cached NFT data, use it
    if (nftDataCache[match.relationship_id]) {
      setSelectedNft(nftDataCache[match.relationship_id]);
    } else if (match.nft_metadata && match.tx_hash && match.nft_image_url) {
      // Reconstruct NFT data from match
      setSelectedNft({
        tx_hash: match.tx_hash,
        image_url: match.nft_image_url,
        contract_address: match.contract_address || '',
        block_height: match.block_height || 0,
        gas_fee: match.gas_fee || 500,
        minted_date: match.contract_minted_at || new Date().toISOString(),
        network: 'CryptoCrush L2',
        combined_market_cap: match.combined_market_cap?.toFixed(2) || '0.00',
      });
    } else {
      // Fallback - create minimal NFT data
      setSelectedNft({
        tx_hash: match.tx_hash || `0xLove${match.relationship_id.slice(0, 20)}`,
        image_url: match.nft_image_url || `/certificates/love-contract-${match.relationship_id}.png`,
        contract_address: match.contract_address || '',
        block_height: match.block_height || 10000000,
        gas_fee: match.gas_fee || 500,
        minted_date: match.contract_minted_at || new Date().toISOString(),
        network: 'CryptoCrush L2',
        combined_market_cap: match.combined_market_cap?.toFixed(2) || '0.00',
      });
    }
    setSelectedPartnerName(match.display_name);
    setShowCertificate(true);
    haptic.impact('light');
  };

  // Get minting phase text
  const getMintingPhaseText = () => {
    switch (mintingPhase) {
      case 'processing': return 'Processing...';
      case 'confirming': return 'Confirming...';
      case 'generating': return 'Generating NFT...';
      default: return 'Minting...';
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
      console.error('FUD error:', err.response?.data || err);
      
      // Parse error message với các case cụ thể
      let errorMessage = 'Failed to FUD user';
      const serverMessage = err.response?.data?.message;
      
      if (serverMessage) {
        if (serverMessage.includes('cooldown')) {
          // Extract hours remaining from message
          errorMessage = `⏳ ${serverMessage}`;
        } else if (serverMessage.includes('only FUD users you are matched')) {
          errorMessage = `❌ ${serverMessage}`;
        } else if (serverMessage.includes('Cannot FUD yourself')) {
          errorMessage = `🙈 ${serverMessage}`;
        } else {
          errorMessage = serverMessage;
        }
      } else if (err.response?.status === 429) {
        errorMessage = '⏳ FUD cooldown active. You can only FUD each match once per 24 hours.';
      } else if (err.response?.status === 403) {
        errorMessage = '❌ You can only FUD users you are matched with.';
      } else if (!err.response) {
        errorMessage = '🌐 Network error. Please check your connection.';
      }
      
      setFudMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setFudMessage(null), 8000);
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
                  <h3 className={`truncate ${hasUnreadChat(match.relationship_id) ? 'font-bold text-white' : 'font-semibold'}`}>
                    {match.display_name}
                  </h3>
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
                  <span className="flex items-center gap-1">
                    {hasUnreadChat(match.relationship_id) && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                    {formatTimeAgo(match.matched_at)}
                  </span>
                </div>
              </div>

              {/* Action - Chat Button */}
              <button
                onClick={() => {
                  // Mark as read when clicking to chat
                  removeUnreadChat(match.relationship_id);
                  navigate(`/chat?match=${match.relationship_id}`);
                }}
                className="relative p-3 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-primary" />
                {/* Unread dot on chat button */}
                {hasUnreadChat(match.relationship_id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-dark-100 animate-pulse" />
                )}
              </button>
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
                  <motion.button
                    onClick={() => handleMintContract(match.relationship_id, match.display_name)}
                    disabled={mintingId === match.relationship_id}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 relative overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {mintingId === match.relationship_id ? (
                      <motion.div 
                        className="flex items-center gap-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">{getMintingPhaseText()}</span>
                      </motion.div>
                    ) : (
                      <>
                        <Flame className="w-3 h-3" />
                        <span>Mint 💍</span>
                      </>
                    )}
                    {/* Shimmer effect when minting */}
                    {mintingId === match.relationship_id && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      />
                    )}
                  </motion.button>
                )}
                
                {/* View Contract Button */}
                {match.status === 'MINTED_CONTRACT' && (
                  <motion.button
                    onClick={() => handleViewCertificate(match)}
                    className="text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-neon-purple/20 to-primary/20 text-neon-purple hover:from-neon-purple/30 hover:to-primary/30 border border-neon-purple/30 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FileText className="w-3 h-3" />
                    <span>📜 View Contract</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="p-4">
        <div className="card bg-gradient-to-r from-neon-purple/10 to-primary/10 p-4 border-neon-purple/30">
          <div className="text-center">
            <p className="text-sm text-white/80 mb-2">
              💡 Mint a "Love Contract" with your match to unlock prediction markets!
            </p>
            <p className="text-xs text-white/50">
              Cost: 500 $LOVE per contract
            </p>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={showCertificate}
        onClose={() => {
          setShowCertificate(false);
          setSelectedNft(null);
        }}
        nft={selectedNft}
        partnerName={selectedPartnerName}
      />
    </div>
  );
}
