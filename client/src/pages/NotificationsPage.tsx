/**
 * NotificationsPage - Notification Center
 * View all notifications: matches, messages, game invites, rewards
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Heart,
  MessageCircle,
  Gamepad2,
  Gift,
  Trash2,
  ChevronLeft,
  CheckCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/axiosClient';
import { haptic } from '../utils/telegram';
import { useNotifications } from '../context/NotificationContext';

interface Notification {
  id: string;
  type: 'MATCH' | 'MESSAGE' | 'GAME_INVITE' | 'REWARD' | 'SYSTEM';
  title: string;
  body: string;
  data?: {
    user_id?: string;
    user_name?: string;
    user_avatar?: string;
    relationship_id?: string;
    game_type?: string;
    reward_amount?: number;
  };
  is_read: boolean;
  created_at: string;
}

// Notification type config
const notificationConfig = {
  MATCH: {
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/20',
    label: 'New Match',
  },
  MESSAGE: {
    icon: MessageCircle,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    label: 'Message',
  },
  GAME_INVITE: {
    icon: Gamepad2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    label: 'Game Invite',
  },
  REWARD: {
    icon: Gift,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    label: 'Reward',
  },
  SYSTEM: {
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    label: 'System',
  },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { refreshBadges } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const response = await api.get<{ notifications: Notification[] }>('/notifications');
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      // Use mock data for now if API doesn't exist
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  }

  // Mock notifications for development
  function getMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        type: 'MATCH',
        title: 'New Match! 💕',
        body: 'You matched with Diamond Hands O\'Conner',
        data: { user_name: 'Diamond Hands O\'Conner' },
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      },
      {
        id: '2',
        type: 'MESSAGE',
        title: 'New Message',
        body: 'Meme Lord Runte: Hey! Want to play a game?',
        data: { user_name: 'Meme Lord Runte' },
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      },
      {
        id: '3',
        type: 'GAME_INVITE',
        title: 'Game Invite',
        body: 'Rug Survivor Waters invited you to play KYP',
        data: { user_name: 'Rug Survivor Waters', game_type: 'kyp' },
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
      {
        id: '4',
        type: 'REWARD',
        title: 'Task Completed! 🎉',
        body: 'You earned 10 $LOVE for daily login',
        data: { reward_amount: 10 },
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      },
      {
        id: '5',
        type: 'SYSTEM',
        title: 'Welcome to CryptoCrush!',
        body: 'Start swiping to find your crypto soulmate',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      },
    ];
  }

  async function markAsRead(id: string) {
    haptic.impact('light');
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    
    try {
      await api.post(`/notifications/${id}/read`);
      refreshBadges();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  async function markAllAsRead() {
    haptic.impact('medium');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    try {
      await api.post('/notifications/read-all');
      refreshBadges();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }

  async function clearAll() {
    haptic.impact('heavy');
    setClearing(true);
    
    try {
      await api.delete('/notifications');
      setNotifications([]);
      refreshBadges();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      // Still clear locally
      setNotifications([]);
    } finally {
      setClearing(false);
    }
  }

  function handleNotificationClick(notification: Notification) {
    markAsRead(notification.id);
    
    // Navigate based on type
    switch (notification.type) {
      case 'MATCH':
      case 'MESSAGE':
        navigate('/matches');
        break;
      case 'GAME_INVITE':
        navigate('/games');
        break;
      case 'REWARD':
        navigate('/tasks');
        break;
      default:
        break;
    }
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-bg p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-white/60">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-dark-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-primary text-dark px-2 py-0.5 rounded-full text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-5 h-5 text-white/60" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                disabled={clearing}
                className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                title="Clear all"
              >
                {clearing ? (
                  <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 text-white/60" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] p-4">
          <div className="bg-white/5 p-6 rounded-full mb-6">
            <Bell className="w-16 h-16 text-white/20" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">All Caught Up!</h2>
          <p className="text-white/60 text-center">
            No new notifications. Keep swiping to find your match!
          </p>
        </div>
      )}

      {/* Notifications List */}
      <div className="px-4 py-2">
        <AnimatePresence>
          {notifications.map((notification, index) => {
            const config = notificationConfig[notification.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  relative flex items-start gap-3 p-4 rounded-xl mb-2 cursor-pointer
                  transition-all duration-200 active:scale-[0.98]
                  ${notification.is_read 
                    ? 'bg-dark-card/50' 
                    : 'bg-dark-card border-l-4 border-primary'
                  }
                `}
              >
                {/* Icon */}
                <div className={`p-2 rounded-full ${config.bgColor}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold truncate ${notification.is_read ? 'text-white/70' : 'text-white'}`}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-white/40 whitespace-nowrap">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 line-clamp-2 ${notification.is_read ? 'text-white/50' : 'text-white/70'}`}>
                    {notification.body}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="absolute top-4 right-4">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
