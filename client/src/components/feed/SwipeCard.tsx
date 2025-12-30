import { useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { MapPin, TrendingUp, TrendingDown } from 'lucide-react';
import { haptic } from '../../utils/telegram';
import { getAvatarUrl } from '../../utils/helpers';
import type { FeedUser } from '../../types';

interface SwipeCardProps {
  user: FeedUser;
  onSwipe: (direction: 'left' | 'right') => void;
}

export default function SwipeCard({ user, onSwipe }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Overlay opacity based on drag direction
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swiped right - LIKE
      setExitX(300);
      haptic.notification('success');
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      // Swiped left - PASS
      setExitX(-300);
      haptic.notification('warning');
      onSwipe('left');
    }
  };

  const getRankBadge = (rank: string) => {
    switch (rank) {
      case 'WHALE':
        return { emoji: '🐋', class: 'badge-whale', label: 'Whale' };
      case 'SHARK':
        return { emoji: '🦈', class: 'badge-shark', label: 'Shark' };
      default:
        return { emoji: '🦐', class: 'badge-shrimp', label: 'Shrimp' };
    }
  };

  const rankInfo = getRankBadge(user.wallet_rank);
  const priceUp = user.price_change_24h >= 0;

  return (
    <motion.div
      className="absolute inset-0 swipe-card"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="relative h-full rounded-3xl overflow-hidden border border-white/10 bg-dark-50">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={getAvatarUrl(user)}
            alt={user.display_name}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/80 to-transparent" />
        </div>

        {/* LONG Overlay */}
        <motion.div
          className="absolute top-8 left-8 px-6 py-3 border-4 border-primary rounded-xl rotate-[-15deg]"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-primary text-3xl font-black">LONG</span>
        </motion.div>

        {/* SHORT Overlay */}
        <motion.div
          className="absolute top-8 right-8 px-6 py-3 border-4 border-danger rounded-xl rotate-[15deg]"
          style={{ opacity: passOpacity }}
        >
          <span className="text-danger text-3xl font-black">SHORT</span>
        </motion.div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* Rank Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={rankInfo.class}>
              {rankInfo.emoji} {rankInfo.label}
            </span>
            <span className="text-white/60 text-sm flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {user.distance_km} km
            </span>
          </div>

          {/* Name & Price */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">{user.display_name}</h2>
              {user.username && (
                <p className="text-white/60">@{user.username}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                ${user.market_price.toFixed(2)}
              </div>
              <div className={`flex items-center justify-end gap-1 text-sm ${priceUp ? 'text-primary' : 'text-danger'}`}>
                {priceUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {priceUp ? '+' : ''}{user.price_change_24h.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-white/80 text-sm line-clamp-2 mb-4">
              {user.bio}
            </p>
          )}

          {/* Action Hint */}
          <div className="flex justify-center gap-8 text-sm text-white/50">
            <span>← SHORT</span>
            <span>LONG →</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
