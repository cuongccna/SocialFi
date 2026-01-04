/**
 * GlobalNotification Component
 * Displays game invites and other global notifications as a top banner
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gamepad2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';
import { api } from '../api/axiosClient';
import { 
  type GameInviteEvent, 
  getGameDisplayName, 
  getGameRoutePath 
} from '../services/gameInvite.service';

// Socket URL detection
const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return window.location.origin;
  }
  return 'http://localhost:3008';
};

interface Notification {
  id: string;
  type: 'game_invite';
  data: GameInviteEvent;
  timestamp: Date;
}

export default function GlobalNotification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAccepting, setIsAccepting] = useState<string | null>(null); // Track which notification is being accepted

  // Check if user is currently in a game screen
  const isInGameScreen = useCallback(() => {
    const gameRoutes = ['/games/kyp', '/games/mining', '/games/candle'];
    return gameRoutes.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  // Initialize socket and register user
  useEffect(() => {
    if (!user) return;

    const socketInstance = io(getSocketUrl(), {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      upgrade: true,
    });

    socketInstance.on('connect', () => {
      console.log('🔔 GlobalNotification socket connected:', socketInstance.id);
      // Register user for receiving game invites
      socketInstance.emit('register_user', { user_id: user.id });
    });

    socketInstance.on('registered', () => {
      console.log('✅ User registered for notifications');
    });

    socketInstance.on('disconnect', () => {
      console.log('🔔 GlobalNotification socket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user]);

  // Define dismissNotification first so it can be used in useEffect
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Listen for game invite events
  useEffect(() => {
    if (!socket || !user) return;

    const handleGameInvite = (data: GameInviteEvent) => {
      console.log('🎮 Received game invite:', data);
      
      // CRITICAL: Prevent self-invite loop - don't show popup if user is the inviter
      if (data.inviterId === user.id) {
        console.log('🚫 Ignoring self-invite (user is the inviter)');
        return;
      }
      
      // CRITICAL: Don't show invite if user is already in a game screen
      if (isInGameScreen()) {
        console.log('🚫 Ignoring invite - user is already in a game screen');
        return;
      }
      
      haptic.notification('success');
      
      const notificationId = `${data.gameId}_${Date.now()}`;
      const notification: Notification = {
        id: notificationId,
        type: 'game_invite',
        data,
        timestamp: new Date(),
      };

      // Use functional update to check for duplicates and add
      setNotifications(prev => {
        // Check if we already have this game invite to prevent duplicates
        const existingInvite = prev.find(
          n => n.type === 'game_invite' && n.data.gameId === data.gameId
        );
        if (existingInvite) {
          console.log('🚫 Ignoring duplicate invite for game:', data.gameId);
          return prev;
        }
        return [notification, ...prev];
      });

      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        dismissNotification(notificationId);
      }, 30000);
    };
    
    // Listen for game_start to close any open invite popups
    const handleGameStart = (data: { gameId: string; gameType: string }) => {
      console.log('🎮 Game started, closing invite popups:', data);
      // Clear all game invite notifications for this game
      setNotifications(prev => 
        prev.filter(n => !(n.type === 'game_invite' && n.data.gameId === data.gameId))
      );
    };

    socket.on('game_invite', handleGameInvite);
    socket.on('game_start', handleGameStart);
    
    // Also listen for KYP-specific phase changes that indicate game started
    socket.on('kyp:phase', (data: { phase: string }) => {
      if (data.phase === 'BETTING' || data.phase === 'ANSWERING') {
        // Game has started, clear all game invites
        setNotifications(prev => prev.filter(n => n.type !== 'game_invite'));
      }
    });

    return () => {
      socket.off('game_invite', handleGameInvite);
      socket.off('game_start', handleGameStart);
      socket.off('kyp:phase');
    };
  }, [socket, user, isInGameScreen, dismissNotification]);

  const handleAccept = useCallback((notification: Notification) => {
    // Prevent double-clicks - check if already accepting
    if (isAccepting === notification.id) {
      console.log('🚫 Already accepting this invite, preventing double-click');
      return;
    }
    
    // Disable the button immediately
    setIsAccepting(notification.id);
    haptic.impact('medium');
    
    if (notification.type === 'game_invite') {
      const gameRoute = getGameRoutePath(notification.data.gameType);
      // Navigate to game with session ID
      const params = new URLSearchParams();
      
      // Different games use different param names
      const gameType = notification.data.gameType;
      
      if (gameType === 'KYP') {
        // KYP uses 'session' and 'relationship'
        if (notification.data.gameId && !notification.data.gameId.startsWith('pending_')) {
          params.set('session', notification.data.gameId);
        }
        if (notification.data.relationshipId) {
          params.set('relationship', notification.data.relationshipId);
        }
      } else {
        // Mining and CandleKiss use 'session_id' and 'relationship_id'
        if (notification.data.gameId && !notification.data.gameId.startsWith('pending_')) {
          params.set('session_id', notification.data.gameId);
        }
        if (notification.data.relationshipId) {
          params.set('relationship_id', notification.data.relationshipId);
        }
      }
      
      const queryString = params.toString();
      console.log('🎮 Navigating to game:', gameRoute, 'params:', queryString);
      navigate(`${gameRoute}${queryString ? `?${queryString}` : ''}`);
    }
    
    dismissNotification(notification.id);
    // Reset accepting state after navigation
    setIsAccepting(null);
  }, [navigate, dismissNotification, isAccepting]);

  const handleIgnore = useCallback(async (notification: Notification) => {
    haptic.impact('light');
    
    // If it's a game invite, notify the inviter
    if (notification.type === 'game_invite' && notification.data.gameId) {
      try {
        await api.post('/games/decline', {
          session_id: notification.data.gameId,
          game_type: notification.data.gameType,
        });
        console.log('🚫 Game invite declined, inviter notified');
      } catch (err) {
        console.error('Failed to decline invite:', err);
      }
    }
    
    dismissNotification(notification.id);
  }, [dismissNotification]);

  // Get the current notification to display (most recent)
  const currentNotification = notifications[0];

  return (
    <AnimatePresence>
      {currentNotification && (
        <motion.div
          key={currentNotification.id}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] p-3 safe-area-inset-top"
        >
          <div className="mx-auto max-w-lg">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-dark-100/95 backdrop-blur-xl shadow-2xl">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              />

              <div className="relative p-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg"
                  >
                    <Gamepad2 className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚔️</span>
                      <h3 className="font-bold text-white truncate">
                        {currentNotification.data.inviterName}
                      </h3>
                    </div>
                    <p className="text-white/80 text-sm mt-0.5">
                      challenged you to{' '}
                      <span className="font-semibold text-primary">
                        {getGameDisplayName(currentNotification.data.gameType)}
                      </span>
                    </p>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => handleIgnore(currentNotification)}
                    className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleIgnore(currentNotification)}
                    disabled={isAccepting === currentNotification.id}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ignore ❌
                  </button>
                  <button
                    onClick={() => handleAccept(currentNotification)}
                    disabled={isAccepting === currentNotification.id}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold transition-all active:scale-95 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAccepting === currentNotification.id ? 'Joining...' : 'Accept ✅'}
                  </button>
                </div>

                {/* Notification count badge */}
                {notifications.length > 1 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold text-white">
                    {notifications.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
