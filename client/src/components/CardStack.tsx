/**
 * CardStack Component - ADDICTIVE UX VERSION
 * Tinder-style swipeable card stack with crypto trading theme
 * 
 * Features:
 * - Mystery Card every 5 swipes (blurred, unlock with swipe right)
 * - Jackpot Effect when matching with Whale (haptic + fireworks)
 * - Infinite Loading (prefetch when 3 cards left)
 * - Holographic 3D tilt effect for Whale/Premium profiles
 */

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  AnimatePresence,
} from 'framer-motion';
import { TrendingUp, TrendingDown, MapPin, Wallet, HelpCircle, Sparkles, Lock, Rocket, Clock } from 'lucide-react';
import { haptic } from '../utils/telegram';
import { getAvatarUrl } from '../utils/helpers';
import './HoloCard.css';
import type { FeedUser } from '../types';

// ============================================
// Types
// ============================================

interface SwipeInfo {
  isMystery: boolean;
  isVip: boolean;
  isWhale: boolean;
}

interface CardStackProps {
  profiles: FeedUser[];
  onSwipe: (direction: 'left' | 'right', profile: FeedUser, swipeInfo: SwipeInfo) => void;
  onEmpty?: () => void;
  onNeedMore?: () => void; // Callback for infinite loading
}

// Expose methods to parent component
export interface CardStackHandle {
  triggerSwipe: (direction: 'left' | 'right') => void;
}

interface SwipeCardProps {
  profile: FeedUser;
  onSwipe: (direction: 'left' | 'right', swipeInfo: SwipeInfo) => void;
  isTop: boolean;
  index: number;
  isMystery?: boolean;
  onMysteryUnlock?: () => void;
  onWhaleMatch?: () => void;
  buttonSwipeDirection?: 'left' | 'right' | null;
}

// Mystery Card interval
const MYSTERY_CARD_INTERVAL = 5;
const PREFETCH_THRESHOLD = 3; // Fetch more when this many cards left

// ============================================
// Fireworks Effect Component
// ============================================

function FireworksEffect({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 0.5 + Math.random() * 0.5,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Jackpot Banner */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 px-8 py-4 rounded-2xl shadow-2xl z-[9999] pointer-events-auto"
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐋</span>
          <div>
            <p className="text-black font-black text-xl">WHALE ALERT!</p>
            <p className="text-black/70 text-sm">Bạn vừa match với Cá Voi! 💎</p>
          </div>
          <span className="text-4xl">🎰</span>
        </div>
      </motion.div>

      {/* Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
          }}
          initial={{ y: '100vh', opacity: 1, scale: 1 }}
          animate={{
            y: `${particle.y}%`,
            opacity: [1, 1, 0],
            scale: [1, 1.5, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Golden Glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-yellow-500/20 via-transparent to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 1 }}
      />
    </div>
  );
}

// ============================================
// IDO Badge Component - New Listing Boost
// ============================================

function IDOBadge({ createdAt }: { createdAt: string }) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const created = new Date(createdAt).getTime();
      const expiryTime = created + (24 * 60 * 60 * 1000); // 24 hours after creation
      const now = Date.now();
      const remaining = expiryTime - now;

      if (remaining <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h:${minutes.toString().padStart(2, '0')}m`);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <motion.div
      className="absolute top-4 left-4 z-30 flex flex-col items-start gap-1"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      {/* IDO LIVE Badge */}
      <motion.div
        className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-full shadow-lg"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <Rocket className="w-4 h-4 animate-pulse" />
        <span className="text-xs font-bold tracking-wide">🚀 IDO LIVE</span>
      </motion.div>
      
      {/* Countdown Timer */}
      <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white/90 px-2 py-1 rounded-full text-xs">
        <Clock className="w-3 h-3" />
        <span>Ends in {timeRemaining}</span>
      </div>
    </motion.div>
  );
}

// Check if user is a new listing (created within 24 hours)
function isNewListing(profile: FeedUser): boolean {
  if (profile.is_new_listing) return true;
  
  // Fallback: calculate from created_at
  if (profile.created_at) {
    const created = new Date(profile.created_at).getTime();
    const now = Date.now();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return hoursDiff < 24;
  }
  return false;
}

// ============================================
// Mystery Card Component
// ============================================

function MysteryCardOverlay({ onUnlock: _onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-purple-900/95 via-indigo-900/95 to-black/95 backdrop-blur-xl flex flex-col items-center justify-center z-20 rounded-3xl">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
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

      {/* Content */}
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center mb-6 shadow-2xl">
          <HelpCircle className="w-20 h-20 text-white" />
        </div>
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </motion.div>
      </motion.div>

      <h3 className="text-2xl font-black text-white mb-2 text-center">
        🎁 MYSTERY CARD
      </h3>
      
      <p className="text-white/80 text-center mb-4 px-8">
        Người này có thể là cơ hội<br/>
        <span className="text-yellow-400 font-bold text-xl">x100 tài sản</span> của bạn!
      </p>

      <div className="flex flex-col items-center gap-3 mt-4">
        <motion.div
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-green-400 px-6 py-3 rounded-full"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Lock className="w-5 h-5 text-black" />
          <span className="text-black font-bold">Swipe LONG → để mở khóa</span>
        </motion.div>
        
        <p className="text-white/50 text-sm">
          hoặc SHORT ← để bỏ qua
        </p>
      </div>

      {/* Hint Arrow */}
      <motion.div
        className="absolute bottom-20 right-8"
        animate={{ x: [0, 20, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <span className="text-4xl">👉</span>
      </motion.div>
    </div>
  );
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
// 3D Tilt Hook for Holographic Effect
// ============================================

interface TiltState {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
}

function use3DTilt(enabled: boolean, cardRef: React.RefObject<HTMLDivElement | null>) {
  const [tilt, setTilt] = useState<TiltState>({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isTilting, setIsTilting] = useState(false);

  useEffect(() => {
    if (!enabled || !cardRef.current) return;

    const card = cardRef.current;
    const maxTilt = 15; // Maximum tilt angle in degrees

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
      const rotateX = -(mouseY / (rect.height / 2)) * maxTilt;
      
      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;

      setTilt({ rotateX, rotateY, glareX, glareY });
      setIsTilting(true);
    };

    const handleMouseLeave = () => {
      setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
      setIsTilting(false);
    };

    // Gyroscope support for mobile
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      
      const rotateY = Math.max(-maxTilt, Math.min(maxTilt, e.gamma));
      const rotateX = Math.max(-maxTilt, Math.min(maxTilt, e.beta - 45));
      
      const glareX = 50 + (rotateY / maxTilt) * 50;
      const glareY = 50 + (rotateX / maxTilt) * 50;

      setTilt({ rotateX, rotateY, glareX, glareY });
      setIsTilting(true);
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    // Request gyroscope permission on iOS
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // iOS 13+ requires permission
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        })
        .catch(() => {});
    } else {
      // Non-iOS devices
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [enabled, cardRef]);

  return { tilt, isTilting };
}

// Check if profile qualifies for holographic effect
function isHoloProfile(profile: FeedUser): boolean {
  return profile.wallet_rank === 'WHALE' || profile.market_price > 500;
}

// ============================================
// Single Swipe Card Component
// ============================================

function SwipeCard({ 
  profile, 
  onSwipe, 
  isTop, 
  index, 
  isMystery = false,
  onMysteryUnlock,
  onWhaleMatch,
  buttonSwipeDirection,
}: SwipeCardProps) {
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  
  // Prevent duplicate swipe calls
  const hasSwipedRef = useRef(false);
  
  // Live Price Ticker state
  const [livePrice, setLivePrice] = useState(profile.market_price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [priceFlash, setPriceFlash] = useState(false);

  // 3D Tilt for holographic cards
  const cardRef = useRef<HTMLDivElement>(null);
  const isHolo = isHoloProfile(profile);
  const { tilt, isTilting } = use3DTilt(isTop && isHolo && !isMystery, cardRef);

  // Handle button swipe trigger
  useEffect(() => {
    if (buttonSwipeDirection && isTop && !exitDirection && !hasSwipedRef.current) {
      // Mark as swiped immediately to prevent duplicate calls
      hasSwipedRef.current = true;
      
      // Trigger swipe animation from button
      setExitDirection(buttonSwipeDirection);
      
      const swipeInfo: SwipeInfo = {
        isMystery: isMystery || false,
        isVip: (profile as any).source === 'vip',
        isWhale: profile.wallet_rank === 'WHALE',
      };
      
      if (buttonSwipeDirection === 'right') {
        // LONG - right swipe
        if (profile.wallet_rank === 'WHALE') {
          haptic.notification('success');
          haptic.impact('heavy');
          setTimeout(() => haptic.impact('heavy'), 100);
          setTimeout(() => haptic.impact('heavy'), 200);
          onWhaleMatch?.();
        } else {
          haptic.notification('success');
        }
      } else {
        // SHORT - left swipe
        haptic.notification('warning');
      }
      
      setTimeout(() => onSwipe(buttonSwipeDirection, swipeInfo), 100);
    }
  }, [buttonSwipeDirection, isTop, exitDirection, profile, isMystery, onSwipe, onWhaleMatch]);

  // Live Price Ticker effect - only for top card
  useEffect(() => {
    if (!isTop || (isMystery && !mysteryRevealed)) return;

    const interval = setInterval(() => {
      setLivePrice((currentPrice) => {
        const changePercent = (Math.random() - 0.5) * 0.2;
        const change = currentPrice * (changePercent / 100);
        const newPrice = Math.max(0.01, currentPrice + change);

        if (change > 0) {
          setPriceDirection('up');
        } else if (change < 0) {
          setPriceDirection('down');
        } else {
          setPriceDirection('neutral');
        }

        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 300);

        return newPrice;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isTop, isMystery, mysteryRevealed]);

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

  // Build swipe info for backend
  const buildSwipeInfo = (): SwipeInfo => ({
    isMystery: isMystery || false,
    isVip: (profile as any).source === 'vip',
    isWhale: profile.wallet_rank === 'WHALE',
  });

  // Handle drag end
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Prevent duplicate swipe calls
      if (hasSwipedRef.current) return;
      
      const threshold = 100;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      if (offset > threshold || velocity > 500) {
        // Mark as swiped immediately
        hasSwipedRef.current = true;
        
        // Swipe RIGHT -> LONG
        setExitDirection('right');
        
        // Check if Whale -> Jackpot effect!
        if (profile.wallet_rank === 'WHALE') {
          // Intense haptic feedback
          haptic.notification('success');
          haptic.impact('heavy');
          setTimeout(() => haptic.impact('heavy'), 100);
          setTimeout(() => haptic.impact('heavy'), 200);
          onWhaleMatch?.();
        } else {
          haptic.notification('success');
        }
        
        // Mystery card unlock
        if (isMystery && !mysteryRevealed) {
          setMysteryRevealed(true);
          onMysteryUnlock?.();
          // Don't swipe yet, reveal first - wait a moment then swipe
          setTimeout(() => onSwipe('right', buildSwipeInfo()), 500);
          return;
        }
        
        setTimeout(() => onSwipe('right', buildSwipeInfo()), 100);
      } else if (offset < -threshold || velocity < -500) {
        // Mark as swiped immediately
        hasSwipedRef.current = true;
        
        // Swipe LEFT -> SHORT
        setExitDirection('left');
        haptic.notification('warning');
        setTimeout(() => onSwipe('left', buildSwipeInfo()), 100);
      }
    },
    [onSwipe, profile, isMystery, mysteryRevealed, onWhaleMatch, onMysteryUnlock]
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

  // Show mystery if not revealed
  const showMystery = isMystery && !mysteryRevealed;

  // Holo card class names
  const holoClasses = isHolo && !showMystery
    ? `holo-card ${profile.wallet_rank === 'WHALE' ? 'holo-whale' : 'holo-premium'} ${isTilting ? 'tilting' : ''}`
    : '';

  // 3D tilt transform style
  const tiltTransform = isHolo && isTop && !showMystery
    ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`
    : '';

  return (
    <motion.div
      className={`absolute inset-4 cursor-grab active:cursor-grabbing ${isHolo && isTop ? 'card-3d-wrapper' : ''}`}
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
      {/* Card Container with 3D Tilt and Holo Effect */}
      <motion.div
        ref={cardRef}
        className={`h-full rounded-3xl overflow-hidden relative ${holoClasses} ${isHolo && isTop ? 'card-3d' : ''}`}
        style={{
          backgroundColor: '#12121a',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: isTop ? borderColor : 'rgba(255, 255, 255, 0.1)',
          boxShadow: isTop ? boxShadow : '0 10px 40px rgba(0, 0, 0, 0.5)',
          transform: tiltTransform,
        }}
      >
        {/* Holo Sparkle Effect */}
        {isHolo && isTop && !showMystery && (
          <div 
            className="holo-sparkle"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
            }}
          />
        )}

        {/* Mystery Card Overlay */}
        {showMystery && (
          <MysteryCardOverlay onUnlock={() => setMysteryRevealed(true)} />
        )}

        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={getAvatarUrl(profile)}
            alt={profile.display_name}
            className={`w-full h-1/2 object-cover object-top ${showMystery ? 'opacity-10 blur-xl' : 'opacity-50'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/80 to-[#12121a]/30" />
        </div>

        {/* IDO LIVE Badge - New Listing (< 24h) */}
        {isNewListing(profile) && !showMystery && (
          <IDOBadge createdAt={profile.created_at} />
        )}

        {/* Whale Indicator */}
        {profile.wallet_rank === 'WHALE' && !showMystery && (
          <motion.div
            className="absolute top-4 right-4 z-20"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-4xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">🐋</span>
          </motion.div>
        )}

        {/* Premium Badge for high-value profiles (non-Whale but > $500) */}
        {profile.wallet_rank !== 'WHALE' && profile.market_price > 500 && !showMystery && (
          <motion.div
            className="absolute top-4 right-4 z-20 holo-badge"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              PREMIUM
            </div>
          </motion.div>
        )}

        {/* LONG Overlay (Right Swipe) */}
        {isTop && (
          <motion.div
            className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none z-30"
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
            className="absolute inset-0 bg-danger/10 flex items-center justify-center pointer-events-none z-30"
            style={{ opacity: shortOpacity }}
          >
            <div className="px-8 py-4 border-4 border-danger rounded-2xl rotate-[15deg] bg-danger/10">
              <span className="text-danger text-5xl font-black tracking-wider drop-shadow-[0_0_20px_rgba(255,49,49,0.5)]">
                SHORT
              </span>
            </div>
          </motion.div>
        )}

        {/* Content - Hidden when mystery */}
        {!showMystery && (
          <div className="relative z-10 h-full flex flex-col p-5">
            {/* Spacer to push content down */}
            <div className="flex-1 min-h-[40%]" />
            
            {/* Main Content Area */}
            <div className="flex flex-col gap-3">
              {/* Rank Badge */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${rankConfig.class}`}>
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">{rankConfig.emoji} {rankConfig.label}</span>
                </div>
                
                {/* Distance Badge */}
                {profile.distance_km && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <MapPin className="w-4 h-4 text-white/70" />
                    <span className="text-sm text-white/70">{parseFloat(String(profile.distance_km)).toFixed(1)} km</span>
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
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10" data-tour="market-price">
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
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Card Stack Component - Main Export
// ============================================

const CardStack = forwardRef<CardStackHandle, CardStackProps>(
  function CardStack({ profiles, onSwipe, onEmpty, onNeedMore }, ref) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showFireworks, setShowFireworks] = useState(false);
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<'left' | 'right' | null>(null);
  const prefetchTriggeredRef = useRef(false);

  // Expose triggerSwipe method to parent
  useImperativeHandle(ref, () => ({
    triggerSwipe: (direction: 'left' | 'right') => {
      if (currentIndex < profiles.length) {
        setButtonSwipeDirection(direction);
        // Reset after animation completes
        setTimeout(() => setButtonSwipeDirection(null), 100);
      }
    },
  }), [currentIndex, profiles.length]);

  // Reset prefetch flag when new profiles are added
  useEffect(() => {
    if (profiles.length > 0) {
      prefetchTriggeredRef.current = false;
    }
  }, [profiles.length]);

  // Infinite Loading - Prefetch when approaching end
  useEffect(() => {
    const remainingCards = profiles.length - currentIndex;
    
    if (remainingCards <= PREFETCH_THRESHOLD && !prefetchTriggeredRef.current && onNeedMore) {
      prefetchTriggeredRef.current = true;
      console.log('🔄 Prefetching more cards... remaining:', remainingCards);
      onNeedMore();
    }
  }, [currentIndex, profiles.length, onNeedMore]);

  // Handle swipe action
  const handleSwipe = useCallback(
    (direction: 'left' | 'right', swipeInfo: SwipeInfo) => {
      const currentProfile = profiles[currentIndex];
      
      if (currentProfile) {
        onSwipe(direction, currentProfile, swipeInfo);
      }

      // Increment swipe count
      setSwipeCount(prev => prev + 1);

      // Move to next card
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        
        if (nextIndex >= profiles.length && onEmpty) {
          setTimeout(onEmpty, 300);
        }
        
        return nextIndex;
      });
    },
    [currentIndex, profiles, onSwipe, onEmpty]
  );

  // Handle Whale match
  const handleWhaleMatch = useCallback(() => {
    setShowFireworks(true);
  }, []);

  // Handle mystery unlock
  const handleMysteryUnlock = useCallback(() => {
    console.log('🎁 Mystery card unlocked!');
    haptic.notification('success');
  }, []);

  // Get visible cards with mystery card logic
  const getVisibleCards = () => {
    const cards: Array<{ profile: FeedUser; isMystery: boolean }> = [];
    
    for (let i = 0; i < 3 && currentIndex + i < profiles.length; i++) {
      const profile = profiles[currentIndex + i];
      
      // Mystery appears every MYSTERY_CARD_INTERVAL cards
      const totalSwipes = swipeCount + i;
      const isMystery = totalSwipes > 0 && (totalSwipes + 1) % MYSTERY_CARD_INTERVAL === 0;
      
      cards.push({ profile, isMystery });
    }
    
    return cards;
  };

  const visibleCards = getVisibleCards();

  // Empty state
  if (visibleCards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <motion.div 
            className="text-6xl mb-4"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🏝️
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">No more profiles</h3>
          <p className="text-white/60">Check back later for more traders!</p>
          <p className="text-white/40 text-sm mt-2">
            Bạn đã swipe {swipeCount} profiles!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Fireworks Effect for Whale Match */}
      <AnimatePresence>
        {showFireworks && (
          <FireworksEffect show={showFireworks} onComplete={() => setShowFireworks(false)} />
        )}
      </AnimatePresence>
      
      {/* Swipe Counter - Bottom right to avoid avatar */}
      <div className="absolute bottom-28 right-4 z-50 bg-dark/80 backdrop-blur-sm rounded-full px-3 py-1.5">
        <span className="text-xs text-white/70">
          🔥 {swipeCount} swipes
        </span>
      </div>
      
      {/* Mystery Card Hint */}
      {(swipeCount + 1) % MYSTERY_CARD_INTERVAL === 0 && swipeCount > 0 && (
        <motion.div
          className="absolute top-4 left-4 z-50 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-3 py-1"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <span className="text-xs text-white font-bold">
            🎁 Mystery coming!
          </span>
        </motion.div>
      )}

      <AnimatePresence>
        {/* Render cards in reverse order so top card is last (on top) */}
        {visibleCards.map(({ profile, isMystery }, index) => (
          <SwipeCard
            key={profile.id}
            profile={profile}
            onSwipe={handleSwipe}
            isTop={index === 0}
            index={index}
            isMystery={isMystery}
            onMysteryUnlock={handleMysteryUnlock}
            onWhaleMatch={handleWhaleMatch}
            buttonSwipeDirection={index === 0 ? buttonSwipeDirection : null}
          />
        )).reverse()}
      </AnimatePresence>
    </div>
  );
});

export default CardStack;
