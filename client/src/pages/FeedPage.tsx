import { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw, MapPin, Heart, X, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardStack, { type CardStackHandle } from '../components/CardStack';
import MatchPopup from '../components/MatchPopup';
import { haptic } from '../utils/telegram';
import { useAuth } from '../context/AuthContext';
import { getFeed, refreshFeed } from '../services/feed.service';
import { swipeRight, swipeLeft } from '../services/swipe.service';
import { completeTutorial } from '../services/profile.service';
import OnboardingTutorial from '../components/OnboardingTutorial';
import type { FeedUser, SwipeResult } from '../types';

// ============================================
// Particle Effect Component - Rockets/Candles UP
// ============================================
function LongParticleEffect({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: -30 + Math.random() * 60, // Spread around button
    delay: Math.random() * 0.2,
    emoji: ['🚀', '📈', '💚', '🟢'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: 0, x: p.x, opacity: 1, scale: 1 }}
          animate={{ y: -150, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
          className="absolute bottom-0 left-1/2 text-2xl"
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// Particle Effect Component - Red particles DOWN
// ============================================
function ShortParticleEffect({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: -25 + Math.random() * 50,
    delay: Math.random() * 0.15,
    emoji: ['📉', '💔', '🔴', '❌'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: 0, x: p.x, opacity: 1, scale: 1 }}
          animate={{ y: 100, opacity: 0, scale: 0.3, rotate: 180 }}
          transition={{ duration: 0.7, delay: p.delay, ease: 'easeIn' }}
          className="absolute top-0 left-1/2 text-xl"
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// IDO Welcome Modal - Profile Boost Notification
// ============================================
function IDOWelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-b from-dark-100 to-dark-200 rounded-3xl p-6 max-w-sm w-full border border-primary/30 shadow-2xl"
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rocket Icon */}
        <motion.div
          className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Rocket className="w-10 h-10 text-white" />
        </motion.div>

        {/* Title */}
        <h2 className="text-2xl font-black text-center text-white mb-2">
          🎉 IDO ACTIVATED!
        </h2>

        {/* Description */}
        <p className="text-center text-white/80 mb-4">
          Your profile is <span className="text-primary font-bold">boosted to the TOP</span> for the next{' '}
          <span className="text-neon-yellow font-bold">24 hours</span>!
        </p>

        {/* Tips */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <p className="text-sm text-white/60 mb-2">💡 Pro Tips:</p>
          <ul className="text-sm text-white/80 space-y-1.5">
            <li>• Upload a great photo to maximize your Market Cap 📸</li>
            <li>• Complete your bio to attract more investors 📝</li>
            <li>• Be active to stay on top! 🔥</li>
          </ul>
        </div>

        {/* Countdown hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-white/50 mb-4">
          <motion.div
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span>Other users see "🚀 IDO LIVE" on your profile</span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-primary to-neon-green text-dark font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          Let's Go! 🚀
        </button>
      </motion.div>
    </motion.div>
  );
}

// Helper: Check if user is new (created within 24 hours)
function isNewUser(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const hoursDiff = (now - created) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

// Storage key for tracking if we've shown the IDO welcome
const IDO_WELCOME_SHOWN_KEY = 'cryptocrush_ido_welcome_shown';

export default function FeedPage() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState<FeedUser[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Show tutorial if user hasn't seen it
    if (user && !user.has_seen_tutorial) {
      const timer = setTimeout(() => setShowTutorial(true), 1500); // 1.5s delay
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleTutorialComplete = async () => {
    try {
      await completeTutorial();
      setShowTutorial(false);
      await refreshUser();
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      setShowTutorial(false);
    }
  };
  
  // IDO Welcome modal state
  const [showIDOWelcome, setShowIDOWelcome] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent button spam
  const [feedKey, setFeedKey] = useState(0); // Key to force re-render of CardStack on refresh
  
  // Track swiped user IDs to filter them from prefetch results
  const swipedIdsRef = useRef<Set<string>>(new Set());
  
  // Particle effect states
  const [showLongParticles, setShowLongParticles] = useState(false);
  const [showShortParticles, setShowShortParticles] = useState(false);
  
  // Ref for CardStack to trigger swipe from buttons
  const cardStackRef = useRef<CardStackHandle>(null);
  
  // Match popup state
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedUser, setMatchedUser] = useState<FeedUser | null>(null);
  const [matchResult, setMatchResult] = useState<SwipeResult | null>(null);
  
  // Search radius state (starts at 10km, doubles each refresh)
  const [searchRadius, setSearchRadius] = useState(10);
  const [radiusMessage, setRadiusMessage] = useState<string | null>(null);

  // Load feed on mount
  useEffect(() => {
    loadFeed();
  }, [user]);

  // Check and show IDO Welcome for new users
  useEffect(() => {
    if (user && isNewUser(user.created_at)) {
      // Check if we've already shown the welcome
      const shownKey = `${IDO_WELCOME_SHOWN_KEY}_${user.id}`;
      const alreadyShown = localStorage.getItem(shownKey);
      
      if (!alreadyShown) {
        // Show the welcome modal with a small delay for better UX
        const timer = setTimeout(() => {
          setShowIDOWelcome(true);
          localStorage.setItem(shownKey, 'true');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Load feed from API
  const loadFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 Loading feed...');

      const feedUsers = await getFeed(
        user?.latitude || undefined,
        user?.longitude || undefined,
        10, // radius in km
        20  // limit
      );
      
      console.log(`📥 Received ${feedUsers.length} users from API`);

      if (feedUsers.length === 0) {
        console.log('⚠️ Feed is empty');
        setIsEmpty(true);
      } else {
        console.log('✅ Setting users state');
        setUsers(feedUsers);
        setFeedKey(prev => prev + 1); // Reset CardStack
        setIsEmpty(false);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
      setError('Failed to load profiles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle swipe action
  const handleSwipe = useCallback(async (
    direction: 'left' | 'right', 
    profile: FeedUser,
    swipeInfo?: { isMystery: boolean; isVip: boolean; isWhale: boolean }
  ) => {
    const action = direction === 'right' ? 'LONG' : 'SHORT';
    console.log(`📊 ${action} on:`, profile.display_name, `($${profile.market_price})`, swipeInfo);
    
    // Track swiped user ID to filter from future prefetches
    swipedIdsRef.current.add(profile.id);
    
    setSwipeCount(prev => prev + 1);
    setIsProcessing(true);
    
    // DO NOT remove user from local state here - CardStack handles the index!
    // setUsers(prev => prev.filter(u => u.id !== profile.id));
    
    try {
      // Call API to record swipe with mystery/vip flags
      const result = direction === 'right' 
        ? await swipeRight(profile.id, { isMystery: swipeInfo?.isMystery })
        : await swipeLeft(profile.id, { isMystery: swipeInfo?.isMystery });

      console.log('Swipe result:', result);

      // Check for match - show popup!
      if (result.match) {
        setMatchedUser(profile);
        setMatchResult(result);
        setShowMatchPopup(true);
      }

      // Update user balance from reward
      if (result.reward?.love_earned) {
        const multiplier = result.reward.bonus_multiplier ?? 1;
        const bonus = multiplier > 1 
          ? ` (x${multiplier} BONUS!)` 
          : '';
        console.log(`💰 Earned ${result.reward.love_earned} $LOVE${bonus}`);
        
        // Show bonus toast if applicable
        if (result.reward.bonus_message) {
          console.log(`🎉 ${result.reward.bonus_message}`);
          // TODO: Show toast notification
        }
      }
    } catch (err) {
      console.error('Failed to record swipe:', err);
      // Don't block UI - swipe already happened visually
    } finally {
      // Re-enable buttons after a short delay
      setTimeout(() => setIsProcessing(false), 300);
    }
  }, []);

  // Handle empty state
  const handleEmpty = useCallback(() => {
    setIsEmpty(true);
  }, []);

  // Refresh feed with expanded radius
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    haptic.impact('medium');
    
    // If already at max radius, reset everything and start fresh
    if (searchRadius >= 500) {
      setSearchRadius(10); // Reset to initial radius
      setRadiusMessage("Starting fresh! Let's find you new matches! 🔄");
      
      // Clear local swipe history to allow re-swiping
      swipedIdsRef.current.clear();
      console.log('🧹 Cleared local swipe history');
      
      try {
        const feedUsers = await refreshFeed(
          user?.latitude || undefined,
          user?.longitude || undefined,
          10 // Reset to 10km
        );

        if (feedUsers.length > 0) {
          setUsers(feedUsers);
          setFeedKey(prev => prev + 1); // Reset CardStack
          setIsEmpty(false);
          setSwipeCount(0);
          setRadiusMessage(null);
        } else {
          setIsEmpty(true);
        }
      } catch (err) {
        console.error('Failed to reset feed:', err);
        setError('Failed to refresh. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Double the radius each time (max 500km)
    const newRadius = Math.min(searchRadius * 2, 500);
    setSearchRadius(newRadius);
    
    // Show encouraging message
    if (newRadius > 10) {
      setRadiusMessage(`Searching ${newRadius}km away... Let's find you someone special! 🌍`);
    }
    
    try {
      const feedUsers = await refreshFeed(
        user?.latitude || undefined,
        user?.longitude || undefined,
        newRadius
      );

      if (feedUsers.length === 0) {
        setIsEmpty(true);
        if (newRadius >= 500) {
          setRadiusMessage("You've explored the whole map! True degen explorer! 🏆");
        }
      } else {
        setUsers(feedUsers);
        setFeedKey(prev => prev + 1); // Reset CardStack
        setIsEmpty(false);
        setSwipeCount(0);
        setRadiusMessage(null);
      }
    } catch (err) {
      console.error('Failed to refresh feed:', err);
      setError('Failed to refresh. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, searchRadius]);

  // Prefetch more cards (Infinite Loading)
  const handleNeedMore = useCallback(async () => {
    console.log('🔄 Prefetching more cards...');
    
    try {
      const feedUsers = await getFeed(
        user?.latitude || undefined,
        user?.longitude || undefined,
        searchRadius, // Use current search radius
        20  // limit
      );

      if (feedUsers.length > 0) {
        // Append new users to existing list
        setUsers(prev => {
          // Filter out duplicates (already in current list)
          const existingIds = new Set(prev.map(u => u.id));
          // Also filter out users we've already swiped in this session
          const newUsers = feedUsers.filter(u => 
            !existingIds.has(u.id) && !swipedIdsRef.current.has(u.id)
          );
          console.log(`📥 Got ${feedUsers.length} users, ${newUsers.length} new`);
          return [...prev, ...newUsers];
        });
      }
    } catch (err) {
      console.error('Failed to prefetch:', err);
      // Don't show error - just log it
    }
  }, [user, searchRadius]);

  // Loading state
  if (isLoading && users.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-dark to-dark-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading traders nearby...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && users.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-dark to-dark-100">
        <div className="w-24 h-24 rounded-full bg-danger/20 flex items-center justify-center mb-6">
          <span className="text-5xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold mb-3">Oops!</h2>
        <p className="text-white/60 mb-8 max-w-xs">{error}</p>
        <button
          onClick={loadFeed}
          className="px-8 py-4 bg-primary text-dark font-bold rounded-2xl flex items-center gap-3 hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-dark to-dark-100">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <span className="text-5xl">🏝️</span>
        </div>
        <h2 className="text-2xl font-bold mb-3">No More Traders</h2>
        <p className="text-white/60 mb-4 max-w-xs">
          {radiusMessage || "You've reviewed all nearby profiles. Let me search further for you!"}
        </p>
        
        {/* Current radius indicator */}
        <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
          <MapPin className="w-4 h-4" />
          <span>Current radius: {searchRadius}km</span>
          {searchRadius < 500 && (
            <span className="text-primary">→ {Math.min(searchRadius * 2, 500)}km</span>
          )}
          {searchRadius >= 500 && (
            <span className="text-primary">→ Reset to 10km</span>
          )}
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-8 py-4 bg-primary text-dark font-bold rounded-2xl flex items-center gap-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          {searchRadius >= 500 ? '🔄 Start Fresh' : `Expand to ${Math.min(searchRadius * 2, 500)}km`}
        </button>
        
        {searchRadius >= 500 && (
          <p className="mt-4 text-xs text-white/30">
            Click to reset and discover new traders! ✨
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-dark to-dark-100">
      {/* Onboarding Tutorial */}
      <AnimatePresence>
        {showTutorial && (
          <OnboardingTutorial 
            onComplete={handleTutorialComplete} 
          />
        )}
      </AnimatePresence>

      {/* Match Popup */}
      <MatchPopup
        isOpen={showMatchPopup}
        onClose={() => setShowMatchPopup(false)}
        matchedUser={matchedUser}
        matchResult={matchResult}
        currentUser={user ? { display_name: user.display_name, avatar_url: user.avatar_url } : null}
        onSendMessage={() => {
          // Navigate to matches/chat
          window.location.href = '/matches';
        }}
        onKeepSwiping={() => {
          setShowMatchPopup(false);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2 text-white/60">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Ho Chi Minh City</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">
            {swipeCount} reviewed
          </span>
        </div>
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 relative overflow-hidden" data-tour="card-stack">
        <CardStack
          key={feedKey} // Force re-render on full refresh
          ref={cardStackRef}
          profiles={users}
          onSwipe={handleSwipe}
          onEmpty={handleEmpty}
          onNeedMore={handleNeedMore}
        />
      </div>

      {/* Bottom Action Buttons */}
      <div className="p-4 flex justify-center gap-6">
        {/* SHORT Button */}
        <div className="relative">
          <AnimatePresence>
            {showShortParticles && (
              <ShortParticleEffect 
                show={showShortParticles} 
                onComplete={() => setShowShortParticles(false)} 
              />
            )}
          </AnimatePresence>
          <motion.button
            disabled={isProcessing || users.length === 0}
            whileTap={{ scale: 0.9 }}
            animate={showShortParticles ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-16 h-16 rounded-full bg-danger/20 border-2 border-danger/50 flex items-center justify-center transition-all ${
              isProcessing || users.length === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-danger/30 hover:scale-110'
            }`}
            onClick={() => {
              if (isProcessing || users.length === 0) return;
              haptic.impact('medium');
              setShowShortParticles(true);
              cardStackRef.current?.triggerSwipe('left');
            }}
          >
            <X className="w-8 h-8 text-danger" />
          </motion.button>
        </div>
        
        {/* LONG Button */}
        <div className="relative">
          <AnimatePresence>
            {showLongParticles && (
              <LongParticleEffect 
                show={showLongParticles} 
                onComplete={() => setShowLongParticles(false)} 
              />
            )}
          </AnimatePresence>
          <motion.button
            disabled={isProcessing || users.length === 0}
            whileTap={{ scale: 0.9 }}
            className={`w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center transition-all ${
              isProcessing || users.length === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-primary/30 hover:scale-110'
            }`}
            onClick={() => {
              if (isProcessing || users.length === 0) return;
              haptic.impact('medium');
              setShowLongParticles(true);
              cardStackRef.current?.triggerSwipe('right');
            }}
          >
            <Heart className="w-8 h-8 text-primary" />
          </motion.button>
        </div>
      </div>

      {/* IDO Welcome Modal for New Users */}
      <AnimatePresence>
        {showIDOWelcome && (
          <IDOWelcomeModal onClose={() => setShowIDOWelcome(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
