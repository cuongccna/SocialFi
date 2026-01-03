/**
 * Notification Context
 * Manages notification badge counts for bottom navigation
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../api/axiosClient';
import { useAuth } from './AuthContext';

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

// Badge status from API
interface BadgeStatusResponse {
  success: boolean;
  unread_messages: number;
  unclaimed_tasks: number;
  pending_game_invites: number;
}

// Context state
interface NotificationState {
  unreadMessagesCount: number;
  unclaimedRewardsCount: number;
  pendingGameInvites: number;
  isLoading: boolean;
}

// Context value including actions
interface NotificationContextValue extends NotificationState {
  // Refresh badge counts from API
  refreshBadges: () => Promise<void>;
  
  // Increment counts (for real-time updates)
  incrementUnreadMessages: (amount?: number) => void;
  incrementUnclaimedRewards: (amount?: number) => void;
  incrementGameInvites: (amount?: number) => void;
  
  // Clear/decrement counts (for when user views content)
  clearUnreadMessages: () => void;
  decrementUnreadMessages: (amount?: number) => void;
  clearUnclaimedRewards: () => void;
  decrementUnclaimedRewards: (amount?: number) => void;
  clearGameInvites: () => void;
  decrementGameInvites: (amount?: number) => void;
  
  // Currently active chat room (to prevent incrementing when in that room)
  setActiveChat: (chatId: string | null) => void;
  activeChat: string | null;
}

// Create context
const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Notification Provider Component
 * Manages badge counts and real-time updates
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  const [state, setState] = useState<NotificationState>({
    unreadMessagesCount: 0,
    unclaimedRewardsCount: 0,
    pendingGameInvites: 0,
    isLoading: true,
  });
  
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  /**
   * Fetch badge counts from API
   */
  const refreshBadges = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get<BadgeStatusResponse>('/users/badge-status');
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          unreadMessagesCount: response.unread_messages || 0,
          unclaimedRewardsCount: response.unclaimed_tasks || 0,
          pendingGameInvites: response.pending_game_invites || 0,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch badge status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated]);

  // Increment functions
  const incrementUnreadMessages = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      unreadMessagesCount: prev.unreadMessagesCount + amount,
    }));
  }, []);

  const incrementUnclaimedRewards = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      unclaimedRewardsCount: prev.unclaimedRewardsCount + amount,
    }));
  }, []);

  const incrementGameInvites = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      pendingGameInvites: prev.pendingGameInvites + amount,
    }));
  }, []);

  // Clear functions
  const clearUnreadMessages = useCallback(() => {
    setState(prev => ({ ...prev, unreadMessagesCount: 0 }));
  }, []);

  const decrementUnreadMessages = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      unreadMessagesCount: Math.max(0, prev.unreadMessagesCount - amount),
    }));
  }, []);

  const clearUnclaimedRewards = useCallback(() => {
    setState(prev => ({ ...prev, unclaimedRewardsCount: 0 }));
  }, []);

  const decrementUnclaimedRewards = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      unclaimedRewardsCount: Math.max(0, prev.unclaimedRewardsCount - amount),
    }));
  }, []);

  const clearGameInvites = useCallback(() => {
    setState(prev => ({ ...prev, pendingGameInvites: 0 }));
  }, []);

  const decrementGameInvites = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      pendingGameInvites: Math.max(0, prev.pendingGameInvites - amount),
    }));
  }, []);

  // Initialize socket for real-time updates
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const socketInstance = io(getSocketUrl(), {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      upgrade: true,
    });

    socketInstance.on('connect', () => {
      console.log('🔔 NotificationContext socket connected, user:', user.id);
      // Register user for notifications
      socketInstance.emit('register_user', { user_id: user.id });
    });

    socketInstance.on('registered', (data: { success: boolean }) => {
      console.log('🔔 NotificationContext registered:', data);
    });

    socketInstance.on('new_message_notification', (data: unknown) => {
      console.log('🔔 [DIRECT] new_message_notification received:', data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user, isAuthenticated]);

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return;

    // Handle new messages - increment if not in that chat room
    const handleReceiveMessage = (data: { relationship_id: string; sender_id: string }) => {
      console.log('📩 Received message notification:', data, 'activeChat:', activeChat, 'userId:', user?.id);
      // Don't increment if user is currently viewing that chat
      if (activeChat !== data.relationship_id && data.sender_id !== user?.id) {
        console.log('📩 Incrementing unread messages count');
        incrementUnreadMessages();
      } else {
        console.log('📩 Skipping increment - user in chat or is sender');
      }
    };

    // Handle task completion notifications
    const handleTaskCompleted = () => {
      incrementUnclaimedRewards();
    };

    // Handle referral success
    const handleReferralSuccess = () => {
      incrementUnclaimedRewards();
    };

    // Handle game invites
    const handleGameInvite = () => {
      incrementGameInvites();
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('new_message_notification', handleReceiveMessage);
    socket.on('task_completed', handleTaskCompleted);
    socket.on('referral_success', handleReferralSuccess);
    socket.on('game_invite', handleGameInvite);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('new_message_notification', handleReceiveMessage);
      socket.off('task_completed', handleTaskCompleted);
      socket.off('referral_success', handleReferralSuccess);
      socket.off('game_invite', handleGameInvite);
    };
  }, [socket, activeChat, user?.id, incrementUnreadMessages, incrementUnclaimedRewards, incrementGameInvites]);

  // Fetch badge counts on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshBadges();
    }
  }, [isAuthenticated, refreshBadges]);

  const value: NotificationContextValue = {
    ...state,
    refreshBadges,
    incrementUnreadMessages,
    incrementUnclaimedRewards,
    incrementGameInvites,
    clearUnreadMessages,
    decrementUnreadMessages,
    clearUnclaimedRewards,
    decrementUnclaimedRewards,
    clearGameInvites,
    decrementGameInvites,
    setActiveChat,
    activeChat,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  
  return context;
}
