/**
 * Game Leaderboard Page
 * Displays rankings for all games in the Game Arcade
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Crown, Loader2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getGameLeaderboard, 
  type GameLeaderboardEntry, 
  type GameType,
  GAMES 
} from '../services/game.service';

// ============================================
// Tab Button Component
// ============================================

function TabButton({
  active,
  onClick,
  children,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  emoji: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-black'
          : 'bg-dark-200 text-white/60 hover:text-white'
      }`}
    >
      <span className="mr-1">{emoji}</span>
      {children}
    </button>
  );
}

// ============================================
// Leaderboard Entry Component
// ============================================

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: GameLeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-white/50 font-mono w-5 text-center">{rank}</span>;
    }
  };

  const getRankBg = () => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-transparent border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-transparent border-amber-600/30';
      default:
        return 'bg-dark-200 border-white/5';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg()} ${
        isCurrentUser ? 'ring-2 ring-primary' : ''
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex justify-center">
        {getRankIcon()}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-300 flex-shrink-0">
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">
            👤
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
          {entry.display_name}
          {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className="text-lg font-bold text-white">
          {entry.total_score.toLocaleString()}
        </div>
        <div className="text-xs text-white/50">points</div>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function GameLeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<GameType | 'ALL'>('ALL');
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      
      try {
        const gameType = activeTab === 'ALL' ? undefined : activeTab;
        const data = await getGameLeaderboard(gameType, 50);
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark/90 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/games')}
            className="p-2 -ml-2 text-white/70 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Game Leaderboard
          </h1>
          
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <TabButton
              active={activeTab === 'ALL'}
              onClick={() => setActiveTab('ALL')}
              emoji="🏆"
            >
              All
            </TabButton>
            <TabButton
              active={activeTab === 'KYP'}
              onClick={() => setActiveTab('KYP')}
              emoji={GAMES.KYP.emoji}
            >
              KYP
            </TabButton>
            <TabButton
              active={activeTab === 'MINING'}
              onClick={() => setActiveTab('MINING')}
              emoji={GAMES.MINING.emoji}
            >
              Mining
            </TabButton>
            <TabButton
              active={activeTab === 'CANDLE_KISS'}
              onClick={() => setActiveTab('CANDLE_KISS')}
              emoji={GAMES.CANDLE_KISS.emoji}
            >
              Candle
            </TabButton>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="mt-4 text-white/50">Loading rankings...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="text-4xl mb-4">😢</div>
              <p className="text-white/70">{error}</p>
              <button
                onClick={() => setActiveTab(activeTab)}
                className="mt-4 px-4 py-2 bg-primary text-black rounded-lg font-medium"
              >
                Retry
              </button>
            </motion.div>
          ) : leaderboard.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Users className="w-12 h-12 text-white/30 mb-4" />
              <p className="text-white/50 text-center">
                No players yet!<br />
                Be the first to play and claim the top spot! 🎮
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {leaderboard.map((entry, index) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  rank={index + 1}
                  isCurrentUser={entry.user_id === user?.id}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
