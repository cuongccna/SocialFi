/**
 * GameHubPage - Cyberpunk Arcade Theme
 * Main hub for all mini-games in CryptoCrush
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Trophy, Plus, Lock, Zap,
  Loader2, X, Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';
import {
  getGameStats,
  useTicket,
  refillTickets,
  canPlayGame,
  GAMES,
  MAX_DAILY_TICKETS,
  TICKET_REFILL_COST,
  type GameStats,
  type GameType,
} from '../services/game.service';
import PartnerSelectModal from '../components/PartnerSelectModal';
import type { Match } from '../services/matches.service';

// ============================================
// Game Card Component
// ============================================

interface GameCardProps {
  game: typeof GAMES[GameType];
  userStreak: number;
  tickets: number;
  onPlay: () => void;
  isLoading: boolean;
}

function GameCard({ game, userStreak, tickets, onPlay, isLoading }: GameCardProps) {
  const { canPlay, reason } = canPlayGame(game, userStreak, tickets);
  const isLocked = game.requiredStreak > 0 && userStreak < game.requiredStreak;

  const handleClick = () => {
    console.log('GameCard button clicked for:', game.id, 'canPlay:', canPlay, 'isLoading:', isLoading);
    onPlay();
  };

  return (
    <motion.div
      whileHover={canPlay ? { scale: 1.02 } : {}}
      whileTap={canPlay ? { scale: 0.98 } : {}}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
        isLocked 
          ? 'border-white/10 opacity-60' 
          : 'border-neon-purple/50 hover:border-neon-purple'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(18,18,26,0.95) 0%, rgba(30,20,50,0.95) 100%)',
        boxShadow: isLocked ? 'none' : '0 0 30px rgba(168, 85, 247, 0.2)',
      }}
    >
      {/* Neon glow effect */}
      {!isLocked && (
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent" />
        </div>
      )}

      {/* Game Image/Icon */}
      <div className="relative h-32 bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
        <div className="text-6xl">
          {game.id === 'KYP' && '🧠'}
          {game.id === 'MINING' && '⛏️❤️'}
          {game.id === 'CANDLE_KISS' && '📊'}
        </div>
        
        {/* Tag Badge */}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold ${game.tagColor}`}>
          {game.tag}
        </div>

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <Lock className="w-10 h-10 text-white/60 mb-2" />
            <p className="text-white/60 text-xs text-center px-4">
              {reason}
            </p>
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-white mb-1">{game.name}</h3>
        <p className="text-white/60 text-sm mb-4 line-clamp-2">{game.description}</p>

        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('Button onClick fired!');
            handleClick();
          }}
          disabled={!canPlay || isLoading}
          className={`relative z-20 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            canPlay
              ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:opacity-90'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isLocked ? (
            <>
              <Lock className="w-4 h-4" />
              Locked
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Play Now
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// Refill Modal Component
// ============================================

interface RefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefill: () => void;
  isLoading: boolean;
  userBalance: number;
}

function RefillModal({ isOpen, onClose, onRefill, isLoading, userBalance }: RefillModalProps) {
  const canAfford = userBalance >= TICKET_REFILL_COST;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-100 rounded-3xl p-6 max-w-sm w-full border-2 border-neon-purple/30"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 50px rgba(168, 85, 247, 0.3)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-bold text-white mb-2">Out of Tickets!</h3>
          <p className="text-white/60">
            Burn <span className="text-neon-yellow font-bold">{TICKET_REFILL_COST} $LOVE</span> to refill?
          </p>
        </div>

        {/* Balance Info */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 text-center">
          <p className="text-white/60 text-sm mb-1">Your Balance</p>
          <p className="text-2xl font-bold text-neon-yellow">
            {userBalance.toFixed(0)} $LOVE
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onRefill}
            disabled={!canAfford || isLoading}
            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
              canAfford
                ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                Refill
              </>
            )}
          </button>
        </div>

        {!canAfford && (
          <p className="text-center text-danger text-sm mt-4">
            Not enough $LOVE! Earn more by swiping.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export default function GameHubPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayLoading, setIsPlayLoading] = useState<GameType | null>(null);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);
  const [pendingGame, setPendingGame] = useState<GameType | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [selectedGameForPartner, setSelectedGameForPartner] = useState<GameType | null>(null);

  // Load game stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await getGameStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load game stats:', error);
      // Create default stats if not found
      setStats({
        user_id: user?.id || '',
        daily_tickets: MAX_DAILY_TICKETS,
        total_score: 0,
        last_ticket_reset: new Date().toISOString(),
        kyp_high_score: 0,
        mining_high_score: 0,
        candle_kiss_high_score: 0,
        current_streak: user?.login_streak || 0,
        longest_streak: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayGame = async (gameType: GameType) => {
    console.log('handlePlayGame called with:', gameType);
    if (!stats) {
      console.log('No stats, returning');
      return;
    }

    const game = GAMES[gameType];
    const userStreak = stats.current_streak || user?.login_streak || 0;
    const { canPlay, reason } = canPlayGame(game, userStreak, stats.daily_tickets);

    console.log('canPlay:', canPlay, 'reason:', reason);

    if (!canPlay) {
      if (reason === 'No tickets remaining') {
        setPendingGame(gameType);
        setShowRefillModal(true);
      } else {
        haptic.notification('error');
      }
      return;
    }

    // Show partner selection modal
    console.log('Setting showPartnerModal to true');
    setSelectedGameForPartner(gameType);
    setShowPartnerModal(true);
  };

  // Called after partner is selected
  const handlePartnerSelected = async (partner: Match) => {
    if (!selectedGameForPartner || !stats) return;

    const gameType = selectedGameForPartner;
    setShowPartnerModal(false);

    try {
      setIsPlayLoading(gameType);
      haptic.impact('medium');

      const result = await useTicket(gameType);

      if (result.success) {
        // Update local stats
        setStats(prev => prev ? {
          ...prev,
          daily_tickets: result.remaining_tickets,
        } : null);

        // Navigate to game screen with partner info
        haptic.notification('success');
        
        // Navigate to the appropriate game page
        const gameRoute = gameType === 'CANDLE_KISS' ? 'candle' : gameType.toLowerCase();
        navigate(`/games/${gameRoute}`, { 
          state: { 
            sessionId: result.session_id,
            partner: {
              id: partner.partner_id,
              displayName: partner.display_name,
              avatarUrl: partner.avatar_url,
              relationshipId: partner.relationship_id,
            }
          } 
        });
      } else {
        if (result.remaining_tickets === 0) {
          setPendingGame(gameType);
          setShowRefillModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to use ticket:', error);
      haptic.notification('error');
    } finally {
      setIsPlayLoading(null);
      setSelectedGameForPartner(null);
    }
  };

  const handleRefillTickets = async () => {
    try {
      setIsRefilling(true);
      haptic.impact('heavy');

      const result = await refillTickets();

      if (result.success) {
        setStats(prev => prev ? {
          ...prev,
          daily_tickets: result.tickets,
        } : null);

        // Refresh user balance
        await refreshUser();

        haptic.notification('success');
        setShowRefillModal(false);

        // If there was a pending game, try to play it
        if (pendingGame) {
          setTimeout(() => handlePlayGame(pendingGame), 300);
          setPendingGame(null);
        }
      }
    } catch (error) {
      console.error('Failed to refill tickets:', error);
      haptic.notification('error');
    } finally {
      setIsRefilling(false);
    }
  };

  const userStreak = stats?.current_streak || user?.login_streak || 0;
  const tickets = stats?.daily_tickets ?? MAX_DAILY_TICKETS;

  return (
    <div className="min-h-full pb-20">
      {/* Cyberpunk Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-dark to-dark" />
        
        {/* Animated grid lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-neon-purple rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 bg-dark-100/80 backdrop-blur-sm border-b border-neon-purple/30">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-pink">
              🎮 ARCADE
            </span>
          </h1>
          
          {/* Leaderboard Button */}
          <button
            onClick={() => navigate('/games/leaderboard')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-neon-yellow/20 border border-neon-yellow/30 text-neon-yellow text-sm font-bold"
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
        </div>

        {/* Tickets Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/10">
              <Ticket className="w-5 h-5 text-neon-yellow" />
              <span className="font-bold text-white">
                🎟️ Tickets: <span className="text-neon-yellow">{tickets}/{MAX_DAILY_TICKETS}</span>
              </span>
            </div>
            
            {/* Buy More Button */}
            <button
              onClick={() => {
                haptic.impact('light');
                setPendingGame(null);
                setShowRefillModal(true);
              }}
              className="w-8 h-8 rounded-full bg-neon-purple/20 border border-neon-purple/50 flex items-center justify-center hover:bg-neon-purple/30 transition-colors"
            >
              <Plus className="w-4 h-4 text-neon-purple" />
            </button>
          </div>

          {/* Streak Display */}
          <div className="flex items-center gap-1 text-sm">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-white/60">Streak:</span>
            <span className="font-bold text-orange-400">{userStreak}</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
        </div>
      )}

      {/* Games Grid */}
      {!isLoading && (
        <div className="relative z-10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.values(GAMES).map((game) => (
            <GameCard
              key={game.id}
              game={game}
              userStreak={userStreak}
              tickets={tickets}
              onPlay={() => handlePlayGame(game.id)}
              isLoading={isPlayLoading === game.id}
            />
          ))}
        </div>
      )}

      {/* Stats Section */}
      {!isLoading && stats && (
        <div className="relative z-10 p-4">
          <div className="bg-dark-100/80 backdrop-blur-sm rounded-2xl border border-neon-purple/30 p-4">
            <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
              📊 Your Stats
            </h3>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-neon-purple">
                  {stats.total_score.toLocaleString()}
                </p>
                <p className="text-xs text-white/60">Total Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-pink">
                  {stats.kyp_high_score}
                </p>
                <p className="text-xs text-white/60">KYP Best</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-yellow">
                  {stats.longest_streak}
                </p>
                <p className="text-xs text-white/60">Best Streak</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Banner */}
      <div className="relative z-10 p-4">
        <motion.div 
          className="bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 rounded-2xl border border-neon-purple/30 p-4 text-center"
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(168, 85, 247, 0.2)',
              '0 0 40px rgba(168, 85, 247, 0.4)',
              '0 0 20px rgba(168, 85, 247, 0.2)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-white/80 text-sm">
            🚧 More games coming soon! Stay tuned for updates.
          </p>
        </motion.div>
      </div>

      {/* Refill Modal */}
      <AnimatePresence>
        {showRefillModal && (
          <RefillModal
            isOpen={showRefillModal}
            onClose={() => {
              setShowRefillModal(false);
              setPendingGame(null);
            }}
            onRefill={handleRefillTickets}
            isLoading={isRefilling}
            userBalance={user?.balance_love || 0}
          />
        )}
      </AnimatePresence>

      {/* Partner Select Modal */}
      <PartnerSelectModal
        isOpen={showPartnerModal}
        onClose={() => {
          setShowPartnerModal(false);
          setSelectedGameForPartner(null);
        }}
        onSelect={handlePartnerSelected}
        gameName={selectedGameForPartner ? GAMES[selectedGameForPartner].name : ''}
        gameEmoji={selectedGameForPartner ? GAMES[selectedGameForPartner].emoji : '🎮'}
      />
    </div>
  );
}
