/**
 * CardStack Component
 * Tinder-style swipeable card stack with crypto trading theme
 */

import { useState, useCallback, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  AnimatePresence,
} from 'framer-motion';
import { TrendingUp, TrendingDown, MapPin, Wallet } from 'lucide-react';
import { haptic } from '../utils/telegram';
import type { FeedUser } from '../types';

// ============================================
// Types
// ============================================

interface CardStackProps {
  profiles: FeedUser[];
  onSwipe: (direction: 'left' | 'right', profile: FeedUser) => void;
  onEmpty?: () => void;
}

interface SwipeCardProps {
  profile: FeedUser;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
  index: number;
}

// ============================================
// Mini Price Chart Component
// ============================================

function MiniPriceChart({ priceChange }: { priceChange: number }) {
  // Generate fake chart data based on price change direction
  const isUp = priceChange >= 0;
  const points = generateChartPoints(isUp);
  const pathD = pointsToPath(points);

  return (
    <div className="w-24 h-12 relative">
      <svg
        viewBox="0 0 100 40"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id={`gradient-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#39FF14' : '#FF3131'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? '#39FF14' : '#FF3131'} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={`${pathD} L 100 40 L 0 40 Z`}
          fill={`url(#gradient-${isUp ? 'up' : 'down'})`}
        />
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={isUp ? '#39FF14' : '#FF3131'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function generateChartPoints(isUp: boolean): number[] {
  const basePoints = isUp
    ? [30, 28, 32, 25, 28, 20, 22, 15, 18, 12, 10]
    : [10, 12, 8, 15, 12, 20, 18, 25, 22, 28, 30];
  
  // Add some randomness
  return basePoints.map(p => p + (Math.random() - 0.5) * 4);
}

function pointsToPath(points: number[]): string {
  const stepX = 100 / (points.length - 1);
  return points
    .map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${y}`)
    .join(' ');
}

// ============================================
// Single Swipe Card Component
// ============================================

function SwipeCard({ profile, onSwipe, isTop, index }: SwipeCardProps) {
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  
  // Live Price Ticker state
  const [livePrice, setLivePrice] = useState(profile.market_price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [priceFlash, setPriceFlash] = useState(false);

  // Live Price Ticker effect - only for top card
  useEffect(() => {
    if (!isTop) return;

    const interval = setInterval(() => {
      setLivePrice((currentPrice) => {
        // Random change of ±0.1%
        const changePercent = (Math.random() - 0.5) * 0.2; // -0.1% to +0.1%
        const change = currentPrice * (changePercent / 100);
        const newPrice = Math.max(0.01, currentPrice + change);

        // Determine direction
        if (change > 0) {
          setPriceDirection('up');
        } else if (change < 0) {
          setPriceDirection('down');
        } else {
          setPriceDirection('neutral');
        }

        // Trigger flash animation
        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 300);

        return newPrice;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isTop]);

  // Reset live price when profile changes
  useEffect(() => {
    setLivePrice(profile.market_price);
    setPriceDirection('neutral');
  }, [profile.id, profile.market_price]);

  // Motion values
  const x = useMotionValue(0);
  
  // Transforms based on drag
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  
  // Overlay opacity
  const longOpacity = useTransform(x, [0, 100, 150], [0, 0.8, 1]);
  const shortOpacity = useTransform(x, [-150, -100, 0], [1, 0.8, 0]);
  
  // Card border glow based on direction
  const borderColor = useTransform(
    x,
    [-150, 0, 150],
    ['rgba(255, 49, 49, 0.5)', 'rgba(255, 255, 255, 0.1)', 'rgba(57, 255, 20, 0.5)']
  );
  const boxShadow = useTransform(
    x,
    [-150, 0, 150],
    [
      '0 0 40px rgba(255, 49, 49, 0.4), 0 20px 60px rgba(0, 0, 0, 0.5)',
      '0 0 20px rgba(57, 255, 20, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5)',
      '0 0 40px rgba(57, 255, 20, 0.4), 0 20px 60px rgba(0, 0, 0, 0.5)',
    ]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      // Check if swipe is strong enough
      if (offset > threshold || velocity > 500) {
        // Swipe RIGHT -> LONG
        setExitDirection('right');
        haptic.notification('success');
        setTimeout(() => onSwipe('right'), 100);
      } else if (offset < -threshold || velocity < -500) {
        // Swipe LEFT -> SHORT
        setExitDirection('left');
        haptic.notification('warning');
        setTimeout(() => onSwipe('left'), 100);
      }
      // Otherwise, spring back (handled by dragConstraints)
    },
    [onSwipe]
  );

  // Card stack offset for background cards
  const stackOffset = index * 8;
  const stackScale = 1 - index * 0.05;
  const stackOpacity = 1 - index * 0.2;

  // Rank badge config
  const getRankConfig = (rank: string) => {
    switch (rank) {
      case 'WHALE':
        return { emoji: '🐋', label: 'Whale', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'SHARK':
        return { emoji: '🦈', label: 'Shark', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      default:
        return { emoji: '🦐', label: 'Shrimp', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    }
  };

  const rankConfig = getRankConfig(profile.wallet_rank);
  const priceUp = profile.price_change_24h >= 0;

  // Exit animation
  const exitX = exitDirection === 'right' ? 500 : exitDirection === 'left' ? -500 : 0;
  const exitRotate = exitDirection === 'right' ? 30 : exitDirection === 'left' ? -30 : 0;

  return (
    <motion.div
      className="absolute inset-4 cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: isTop ? scale : stackScale,
        opacity: stackOpacity,
        zIndex: 10 - index,
        top: stackOffset,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      animate={
        exitDirection
          ? { x: exitX, rotate: exitRotate, opacity: 0 }
          : {}
      }
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      whileTap={isTop ? { scale: 1.02 } : {}}
    >
      {/* Card Container */}
      <motion.div
        className="h-full rounded-3xl overflow-hidden relative"
        style={{
          backgroundColor: '#12121a',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: isTop ? borderColor : 'rgba(255, 255, 255, 0.1)',
          boxShadow: isTop ? boxShadow : '0 10px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
            alt={profile.display_name}
            className="w-full h-2/3 object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/90 to-transparent" />
        </div>

        {/* LONG Overlay (Right Swipe) */}
        {isTop && (
          <motion.div
            className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none"
            style={{ opacity: longOpacity }}
          >
            <div className="px-8 py-4 border-4 border-primary rounded-2xl rotate-[-15deg] bg-primary/10">
              <span className="text-primary text-5xl font-black tracking-wider drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]">
                LONG
              </span>
            </div>
          </motion.div>
        )}

        {/* SHORT Overlay (Left Swipe) */}
        {isTop && (
          <motion.div
            className="absolute inset-0 bg-danger/10 flex items-center justify-center pointer-events-none"
            style={{ opacity: shortOpacity }}
          >
            <div className="px-8 py-4 border-4 border-danger rounded-2xl rotate-[15deg] bg-danger/10">
              <span className="text-danger text-5xl font-black tracking-wider drop-shadow-[0_0_20px_rgba(255,49,49,0.5)]">
                SHORT
              </span>
            </div>
          </motion.div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
          {/* Top Row: Rank & Distance */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${rankConfig.class}`}>
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">{rankConfig.emoji} {rankConfig.label}</span>
            </div>
            
            {profile.distance_km && (
              <div className="flex items-center gap-1.5 text-white/60 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{profile.distance_km.toFixed(1)} km</span>
              </div>
            )}
          </div>

          {/* Name & Username */}
          <div>
            <h2 className="text-3xl font-bold text-white">
              {profile.display_name}
            </h2>
            {profile.username && (
              <p className="text-white/50 text-lg">@{profile.username}</p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-white/70 text-base leading-relaxed line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* Price Card */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/50 text-sm">Market Price</p>
                  {isTop && (
                    <span className="flex items-center gap-1 text-xs text-white/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <motion.span
                    className={`text-3xl font-bold transition-colors duration-300 ${
                      priceDirection === 'up' 
                        ? 'text-primary' 
                        : priceDirection === 'down' 
                          ? 'text-danger' 
                          : 'text-white'
                    }`}
                    animate={priceFlash ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    ${livePrice.toFixed(2)}
                  </motion.span>
                  <div className={`flex items-center gap-1 text-sm font-medium ${priceUp ? 'text-primary' : 'text-danger'}`}>
                    {priceUp ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>
                      {priceUp ? '+' : ''}{profile.price_change_24h.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Mini Chart */}
              <MiniPriceChart priceChange={profile.price_change_24h} />
            </div>
          </div>

          {/* Swipe Hint (only for top card) */}
          {isTop && (
            <div className="flex justify-center gap-12 text-sm pt-2">
              <span className="text-danger/70 font-medium">← SHORT</span>
              <span className="text-primary/70 font-medium">LONG →</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Card Stack Component
// ============================================

export default function CardStack({ profiles, onSwipe, onEmpty }: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle swipe action
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const currentProfile = profiles[currentIndex];
      
      if (currentProfile) {
        onSwipe(direction, currentProfile);
      }

      // Move to next card
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        
        // Check if we've run out of cards
        if (nextIndex >= profiles.length && onEmpty) {
          setTimeout(onEmpty, 300);
        }
        
        return nextIndex;
      });
    },
    [currentIndex, profiles, onSwipe, onEmpty]
  );

  // Get visible cards (show max 3 stacked)
  const visibleCards = profiles.slice(currentIndex, currentIndex + 3);

  // Empty state
  if (visibleCards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🏝️</div>
          <h3 className="text-xl font-bold text-white mb-2">No more profiles</h3>
          <p className="text-white/60">Check back later for more traders!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {/* Render cards in reverse order so top card is last (on top) */}
        {visibleCards.map((profile, index) => (
          <SwipeCard
            key={profile.id}
            profile={profile}
            onSwipe={handleSwipe}
            isTop={index === 0}
            index={index}
          />
        )).reverse()}
      </AnimatePresence>
    </div>
  );
}
