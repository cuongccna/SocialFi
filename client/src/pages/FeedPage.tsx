import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, MapPin, Heart, X } from 'lucide-react';
import CardStack from '../components/CardStack';
import MatchPopup from '../components/MatchPopup';
import { haptic } from '../utils/telegram';
import { useAuth } from '../context/AuthContext';
import { getFeed, refreshFeed } from '../services/feed.service';
import { swipeRight, swipeLeft } from '../services/swipe.service';
import type { FeedUser, SwipeResult } from '../types';

export default function FeedPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<FeedUser[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeCount, setSwipeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Match popup state
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedUser, setMatchedUser] = useState<FeedUser | null>(null);
  const [matchResult, setMatchResult] = useState<SwipeResult | null>(null);

  // Load feed on mount
  useEffect(() => {
    loadFeed();
  }, [user]);

  // Load feed from API
  const loadFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const feedUsers = await getFeed(
        user?.latitude || undefined,
        user?.longitude || undefined,
        10, // radius in km
        20  // limit
      );

      if (feedUsers.length === 0) {
        setIsEmpty(true);
      } else {
        setUsers(feedUsers);
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
  const handleSwipe = useCallback(async (direction: 'left' | 'right', profile: FeedUser) => {
    const action = direction === 'right' ? 'LONG' : 'SHORT';
    console.log(`📊 ${action} on:`, profile.display_name, `($${profile.market_price})`);
    
    setSwipeCount(prev => prev + 1);
    
    try {
      // Call API to record swipe
      const result = direction === 'right' 
        ? await swipeRight(profile.id)
        : await swipeLeft(profile.id);

      console.log('Swipe result:', result);

      // Check for match - show popup!
      if (result.match) {
        setMatchedUser(profile);
        setMatchResult(result);
        setShowMatchPopup(true);
      }

      // Update user balance from reward
      if (result.reward?.love_earned) {
        console.log(`💰 Earned ${result.reward.love_earned} $LOVE`);
      }
    } catch (err) {
      console.error('Failed to record swipe:', err);
      // Don't block UI - swipe already happened visually
    }
  }, []);

  // Handle empty state
  const handleEmpty = useCallback(() => {
    setIsEmpty(true);
  }, []);

  // Refresh feed
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    haptic.impact('medium');
    
    try {
      const feedUsers = await refreshFeed(
        user?.latitude || undefined,
        user?.longitude || undefined,
        10
      );

      if (feedUsers.length === 0) {
        setIsEmpty(true);
      } else {
        setUsers(feedUsers);
        setIsEmpty(false);
        setSwipeCount(0);
      }
    } catch (err) {
      console.error('Failed to refresh feed:', err);
      setError('Failed to refresh. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        <p className="text-white/60 mb-8 max-w-xs">
          You've reviewed all nearby profiles. Expand your radius or check back later!
        </p>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-8 py-4 bg-primary text-dark font-bold rounded-2xl flex items-center gap-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-dark to-dark-100">
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
      <div className="flex-1 relative overflow-hidden">
        <CardStack
          profiles={users}
          onSwipe={handleSwipe}
          onEmpty={handleEmpty}
        />
      </div>

      {/* Bottom Action Buttons */}
      <div className="p-4 flex justify-center gap-6">
        {/* SHORT Button */}
        <button
          className="w-16 h-16 rounded-full bg-danger/20 border-2 border-danger/50 flex items-center justify-center hover:bg-danger/30 hover:scale-110 transition-all active:scale-95"
          onClick={() => haptic.impact('medium')}
        >
          <X className="w-8 h-8 text-danger" />
        </button>
        
        {/* LONG Button */}
        <button
          className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center hover:bg-primary/30 hover:scale-110 transition-all active:scale-95"
          onClick={() => haptic.impact('medium')}
        >
          <Heart className="w-8 h-8 text-primary" />
        </button>
      </div>
    </div>
  );
}
