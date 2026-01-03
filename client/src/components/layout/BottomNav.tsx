import { NavLink, useLocation } from 'react-router-dom';
import { Flame, Gamepad2, MessageCircleHeart, Coins, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { haptic } from '../../utils/telegram';

type BadgeType = 'count' | 'dot' | 'none';

interface NavItem {
  to: string;
  icon: typeof Flame;
  label: string;
  badgeType: BadgeType;
  badgeKey?: 'messages' | 'rewards' | 'games';
}

const navItems: NavItem[] = [
  { to: '/feed', icon: Flame, label: 'Explore', badgeType: 'none' },
  { to: '/games', icon: Gamepad2, label: 'Arcade', badgeType: 'dot', badgeKey: 'games' },
  { to: '/matches', icon: MessageCircleHeart, label: 'Connect', badgeType: 'count', badgeKey: 'messages' },
  { to: '/earn', icon: Coins, label: 'Earn', badgeType: 'dot', badgeKey: 'rewards' },
  { to: '/profile', icon: User, label: 'Profile', badgeType: 'none' },
];

// Badge component with animations
function NotificationBadge({ 
  count, 
  type 
}: { 
  count: number; 
  type: BadgeType;
}) {
  const prevCountRef = useRef(count);
  const shouldAnimate = count > prevCountRef.current;
  
  useEffect(() => {
    prevCountRef.current = count;
  }, [count]);

  if (count === 0 || type === 'none') return null;

  if (type === 'dot') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg shadow-red-500/50"
      />
    );
  }

  // Count badge
  const displayCount = count > 99 ? '99+' : count.toString();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
        initial={shouldAnimate ? { scale: 0.5, opacity: 0 } : { scale: 1 }}
        animate={{ 
          scale: shouldAnimate ? [1.3, 1] : 1, 
          opacity: 1 
        }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 25 
        }}
        className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50"
      >
        <span className="text-[10px] font-bold text-white leading-none">
          {displayCount}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const { 
    unreadMessagesCount, 
    unclaimedRewardsCount, 
    pendingGameInvites,
    clearGameInvites,
  } = useNotifications();

  // Get badge count for a specific tab
  const getBadgeCount = (badgeKey?: 'messages' | 'rewards' | 'games'): number => {
    switch (badgeKey) {
      case 'messages':
        return unreadMessagesCount;
      case 'rewards':
        return unclaimedRewardsCount;
      case 'games':
        return pendingGameInvites;
      default:
        return 0;
    }
  };

  // Handle tab click - clear relevant badges
  const handleTabClick = (item: NavItem) => {
    haptic.impact('light');
    
    // Clear badges when user navigates to specific tabs
    if (item.badgeKey === 'messages' && location.pathname !== '/matches') {
      // Don't clear immediately - let user see the chats first
      // Messages will be marked read when they open individual chats
    }
    
    if (item.badgeKey === 'games' && location.pathname !== '/games') {
      // Clear game invites when entering arcade
      clearGameInvites();
    }
  };

  return (
    <nav className="flex-shrink-0 bg-dark-100 border-t border-white/10 px-4 py-2 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => handleTabClick(item)}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? 'drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]' : ''}
                  />
                  <NotificationBadge 
                    count={getBadgeCount(item.badgeKey)} 
                    type={item.badgeType} 
                  />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
