/**
 * Partner Select Modal
 * Modal to select a partner (match) before playing co-op games
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Heart, Users } from 'lucide-react';
import { getMatches, type Match } from '../services/matches.service';

interface PartnerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (partner: Match) => void;
  gameName: string;
  gameEmoji: string;
}

export default function PartnerSelectModal({
  isOpen,
  onClose,
  onSelect,
  gameName,
  gameEmoji,
}: PartnerSelectModalProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('PartnerSelectModal render, isOpen:', isOpen);

  useEffect(() => {
    if (isOpen) {
      console.log('PartnerSelectModal isOpen true, loading matches');
      loadMatches();
    }
  }, [isOpen]);

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const { matches: data } = await getMatches(50, 0);
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="partner-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bottom-16 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="partner-modal-content"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-dark-100 rounded-t-3xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{gameEmoji}</span>
                  {gameName}
                </h2>
                <p className="text-sm text-white/60 mt-1">Choose your partner to play with</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="mt-4 text-white/50">Loading partners...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-4xl mb-4">😢</div>
                <p className="text-white/70">{error}</p>
                <button
                  onClick={loadMatches}
                  className="mt-4 px-4 py-2 bg-primary text-black rounded-lg font-medium"
                >
                  Retry
                </button>
              </div>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-white/30 mb-4" />
                <p className="text-white/70 text-center font-medium">No partners yet!</p>
                <p className="text-white/50 text-sm text-center mt-2">
                  Go to Trade tab to find your match first 💚
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <PartnerCard
                    key={match.relationship_id}
                    match={match}
                    onSelect={() => onSelect(match)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Partner Card Component
// ============================================

function PartnerCard({
  match,
  onSelect,
}: {
  match: Match;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-200 hover:bg-dark-300 border border-white/10 hover:border-primary/50 transition-all text-left"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-dark-300 flex-shrink-0">
          {match.avatar_url ? (
            <img
              src={match.avatar_url}
              alt={match.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              💚
            </div>
          )}
        </div>
        {/* Online indicator */}
        {match.last_active_at && isRecentlyActive(match.last_active_at) && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-dark-200" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">
          {match.display_name}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Heart className="w-3 h-3 text-pink-400" />
          <span>Matched {formatMatchDate(match.matched_at)}</span>
        </div>
      </div>

      {/* Play indicator */}
      <div className="flex-shrink-0 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm font-medium">
        Play
      </div>
    </motion.button>
  );
}

// ============================================
// Helper Functions
// ============================================

function isRecentlyActive(lastActiveAt: string): boolean {
  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastActive.getTime()) / 1000 / 60;
  return diffMinutes < 15; // Active within 15 minutes
}

function formatMatchDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60 / 24);
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
