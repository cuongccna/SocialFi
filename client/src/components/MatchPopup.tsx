/**
 * MatchPopup Component
 * Celebration modal when two users match
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, TrendingUp, X, Sparkles } from 'lucide-react';
import { haptic } from '../utils/telegram';
import { getAvatarUrl } from '../utils/helpers';
import type { FeedUser, SwipeResult } from '../types';

interface MatchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  matchedUser: FeedUser | null;
  matchResult: SwipeResult | null;
  currentUser: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  onSendMessage?: () => void;
  onKeepSwiping?: () => void;
}

export default function MatchPopup({
  isOpen,
  onClose,
  matchedUser,
  matchResult,
  currentUser,
  onSendMessage,
  onKeepSwiping,
}: MatchPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      haptic.notification('success');
      
      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!matchedUser || !matchResult) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: -20,
                    rotate: 0,
                    scale: Math.random() * 0.5 + 0.5,
                  }}
                  animate={{
                    y: window.innerHeight + 20,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: Math.random() * 2 + 2,
                    delay: Math.random() * 0.5,
                    ease: 'linear',
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: ['#FF6B9D', '#39FF14', '#FFD700', '#9B59B6', '#00D4FF'][
                      Math.floor(Math.random() * 5)
                    ],
                  }}
                />
              ))}
            </div>
          )}

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative bg-gradient-to-b from-dark-100 to-dark-200 rounded-3xl p-6 max-w-sm w-full border border-primary/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-5xl mb-3"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
                It's a Match!
              </h2>
              <p className="text-white/60 mt-1 text-sm">
                You both went LONG on each other!
              </p>
            </div>

            {/* Avatars */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {/* Current User */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <img
                  src={currentUser ? getAvatarUrl(currentUser) : 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=me&backgroundColor=transparent'}
                  alt="You"
                  className="w-24 h-24 rounded-full border-4 border-primary object-cover"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -bottom-1 -right-1 text-2xl"
                >
                  💚
                </motion.div>
              </motion.div>

              {/* Heart Connection */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="flex flex-col items-center"
              >
                <Heart className="w-8 h-8 text-primary fill-primary" />
                <Sparkles className="w-4 h-4 text-neon-yellow mt-1" />
              </motion.div>

              {/* Matched User */}
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <img
                  src={getAvatarUrl(matchedUser)}
                  alt={matchedUser.display_name}
                  className="w-24 h-24 rounded-full border-4 border-neon-purple object-cover"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                  className="absolute -bottom-1 -right-1 text-2xl"
                >
                  💜
                </motion.div>
              </motion.div>
            </div>

            {/* Match Info */}
            <div className="text-center mb-6">
              <p className="text-lg font-semibold">{matchedUser.display_name}</p>
              {matchedUser.username && (
                <p className="text-white/50 text-sm">@{matchedUser.username}</p>
              )}
            </div>

            {/* Market Impact */}
            {matchResult.relationship?.match_pump && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-neon-green/10 to-primary/10 rounded-xl p-4 mb-6 border border-neon-green/30"
              >
                <div className="flex items-center justify-center gap-2 text-neon-green">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-bold">MATCH PUMP!</span>
                </div>
                <p className="text-center text-sm text-white/80 mt-1">
                  {matchResult.relationship.match_pump}
                </p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={() => {
                  haptic.impact('medium');
                  onSendMessage?.();
                  onClose();
                }}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Send Message
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => {
                  haptic.impact('light');
                  onKeepSwiping?.();
                  onClose();
                }}
                className="w-full py-3 text-white/60 hover:text-white transition-colors"
              >
                Keep Swiping
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
