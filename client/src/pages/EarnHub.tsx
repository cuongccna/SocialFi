/**
 * EarnHub - Finance & Rewards Hub
 * Central hub for wallet, markets, tasks, and referrals
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  Gift,
  Users,
  Coins,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';

interface MenuItem {
  id: string;
  icon: typeof Wallet;
  emoji: string;
  title: string;
  description: string;
  route?: string;
  comingSoon?: boolean;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'markets',
    icon: TrendingUp,
    emoji: '📈',
    title: 'Prediction Market',
    description: 'Bet on love stories',
    route: '/markets',
  },
  {
    id: 'wallet',
    icon: Wallet,
    emoji: '💰',
    title: 'Wallet',
    description: 'Connect TON wallet',
    route: '/wallet',
  },
  {
    id: 'tasks',
    icon: Gift,
    emoji: '🎁',
    title: 'Daily Tasks',
    description: 'Complete & earn rewards',
    route: '/tasks',
  },
  {
    id: 'referrals',
    icon: Users,
    emoji: '🤝',
    title: 'Referrals',
    description: 'Invite friends, earn $LOVE',
    route: '/referrals',
  },
  {
    id: 'staking',
    icon: Lock,
    emoji: '💎',
    title: 'Staking',
    description: 'Lock $LOVE for rewards',
    comingSoon: true,
  },
  {
    id: 'jury',
    icon: Sparkles,
    emoji: '⚖️',
    title: 'Jury DAO',
    description: 'Judge love disputes',
    route: '/jury',
  },
];

export default function EarnHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const balance = user?.balance_love || 0;

  const handleMenuClick = (item: MenuItem) => {
    haptic.impact('light');
    
    if (item.comingSoon) {
      haptic.notification('warning');
      return;
    }
    
    if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <div className="min-h-full bg-dark pb-4">
      {/* Header with Balance */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-dark to-neon-purple/10" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />
        
        <div className="relative px-4 pt-8 pb-6">
          {/* Title */}
          <div className="flex items-center gap-2 mb-6">
            <Coins className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">Earn Hub</h1>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-100/80 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Your Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-primary">
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-lg text-yellow-400">$LOVE</span>
                </div>
              </div>
              
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30"
              >
                <span className="text-2xl">💰</span>
              </motion.div>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-white/50">Market Price</p>
                <p className="text-lg font-semibold text-primary">
                  ${(user?.market_price || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/50">24h Change</p>
                <p className={`text-lg font-semibold ${(user?.price_change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(user?.price_change_24h || 0) >= 0 ? '+' : ''}{(user?.price_change_24h || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4 mt-2">
        <h2 className="text-lg font-semibold mb-4 text-white/80">Finance & Rewards</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleMenuClick(item)}
              disabled={item.comingSoon}
              className={`relative p-4 rounded-2xl text-left transition-all active:scale-95 ${
                item.comingSoon
                  ? 'bg-dark-200/50 opacity-60 cursor-not-allowed'
                  : 'bg-dark-100 hover:bg-dark-200 border border-white/5 hover:border-primary/30'
              }`}
            >
              {/* Coming Soon Badge */}
              {item.comingSoon && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/10 rounded-full">
                  <span className="text-[10px] text-white/60 font-medium">Soon</span>
                </div>
              )}
              
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center ${
                item.comingSoon 
                  ? 'bg-white/5' 
                  : 'bg-gradient-to-br from-primary/20 to-primary/5'
              }`}>
                <span className="text-2xl">{item.emoji}</span>
              </div>
              
              {/* Text */}
              <h3 className="font-semibold text-white mb-0.5">{item.title}</h3>
              <p className="text-xs text-white/50 line-clamp-1">{item.description}</p>
              
              {/* Arrow indicator */}
              {!item.comingSoon && (
                <ChevronRight className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-white/30" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-primary/10 to-neon-purple/10 rounded-2xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">💡 Pro Tip</h3>
              <p className="text-sm text-white/60">
                Complete daily tasks and invite friends to maximize your $LOVE earnings! 
                Chat with matches to grow your joint pool.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
