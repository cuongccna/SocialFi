/**
 * Notification Context
 * Manages notification badge counts and granular unread/pending tracking
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  // Granular data (new fields from API)
  unread_chat_ids?: string[];
  claimable_task_ids?: string[];
  pending_game_invite_ids?: string[];
}

// Context state - now with Sets for granular tracking
interface NotificationState {
  // Granular tracking with Sets of IDs
  unreadChatIds: Set<string>;        // relationship_ids with unread messages
  pendingGameInviteIds: Set<string>; // user_ids of challengers (or game session IDs)
  claimableTaskIds: Set<string>;     // task IDs that can be claimed
  
  // Loading state
  isLoading: boolean;
}

// Derived counts for backward compatibility
interface NotificationCounts {
  unreadMessagesCount: number;
  unclaimedRewardsCount: number;
  pendingGameInvites: number;
}

// Context value including actions
interface NotificationContextValue extends NotificationState, NotificationCounts {
  // Refresh badge counts from API
  refreshBadges: () => Promise<void>;
  
  // Granular add/remove functions
  addUnreadChat: (relationshipId: string) => void;
  removeUnreadChat: (relationshipId: string) => void;
  hasUnreadChat: (relationshipId: string) => boolean;
  
  addGameInvite: (inviteId: string) => void;
  removeGameInvite: (inviteId: string) => void;
  hasGameInvite: (inviteId: string) => boolean;
  
  addClaimableTask: (taskId: string) => void;
  removeClaimableTask: (taskId: string) => void;
  hasClaimableTask: (taskId: string) => boolean;
  
  // Legacy increment/clear functions (for backward compatibility)
  incrementUnreadMessages: (amount?: number) => void;
  incrementUnclaimedRewards: (amount?: number) => void;
  incrementGameInvites: (amount?: number) => void;
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
 * Manages badge counts and real-time updates with granular ID tracking
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  const [state, setState] = useState<NotificationState>({
    unreadChatIds: new Set(),
    pendingGameInviteIds: new Set(),
    claimableTaskIds: new Set(),
    isLoading: true,
  });
  
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Derived counts from Sets (memoized for performance)
  const counts: NotificationCounts = useMemo(() => ({
    unreadMessagesCount: state.unreadChatIds.size,
    unclaimedRewardsCount: state.claimableTaskIds.size,
    pendingGameInvites: state.pendingGameInviteIds.size,
  }), [state.unreadChatIds.size, state.pendingGameInviteIds.size, state.claimableTaskIds.size]);

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
          // Use granular IDs if available from API, otherwise create placeholder sets
          unreadChatIds: response.unread_chat_ids 
            ? new Set(response.unread_chat_ids) 
            : prev.unreadChatIds.size > 0 
              ? prev.unreadChatIds 
              : new Set(Array.from({ length: response.unread_messages || 0 }, (_, i) => `unread_${i}`)),
          claimableTaskIds: response.claimable_task_ids 
            ? new Set(response.claimable_task_ids) 
            : prev.claimableTaskIds.size > 0 
              ? prev.claimableTaskIds 
              : new Set(Array.from({ length: response.unclaimed_tasks || 0 }, (_, i) => `task_${i}`)),
          pendingGameInviteIds: response.pending_game_invite_ids 
            ? new Set(response.pending_game_invite_ids) 
            : prev.pendingGameInviteIds.size > 0 
              ? prev.pendingGameInviteIds 
              : new Set(Array.from({ length: response.pending_game_invites || 0 }, (_, i) => `invite_${i}`)),
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch badge status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated]);

  // ============================================
  // Granular Set Operations
  // ============================================
  
  const addUnreadChat = useCallback((relationshipId: string) => {
    setState(prev => {
      const newSet = new Set(prev.unreadChatIds);
      newSet.add(relationshipId);
      return { ...prev, unreadChatIds: newSet };
    });
  }, []);

  const removeUnreadChat = useCallback((relationshipId: string) => {
    setState(prev => {
      const newSet = new Set(prev.unreadChatIds);
      newSet.delete(relationshipId);
      return { ...prev, unreadChatIds: newSet };
    });
  }, []);

  const hasUnreadChat = useCallback((relationshipId: string) => {
    return state.unreadChatIds.has(relationshipId);
  }, [state.unreadChatIds]);

  const addGameInvite = useCallback((inviteId: string) => {
    setState(prev => {
      const newSet = new Set(prev.pendingGameInviteIds);
      newSet.add(inviteId);
      return { ...prev, pendingGameInviteIds: newSet };
    });
  }, []);

  const removeGameInvite = useCallback((inviteId: string) => {
    setState(prev => {
      const newSet = new Set(prev.pendingGameInviteIds);
      newSet.delete(inviteId);
      return { ...prev, pendingGameInviteIds: newSet };
    });
  }, []);

  const hasGameInvite = useCallback((inviteId: string) => {
    return state.pendingGameInviteIds.has(inviteId);
  }, [state.pendingGameInviteIds]);

  const addClaimableTask = useCallback((taskId: string) => {
    setState(prev => {
      const newSet = new Set(prev.claimableTaskIds);
      newSet.add(taskId);
      return { ...prev, claimableTaskIds: newSet };
    });
  }, []);

  const removeClaimableTask = useCallback((taskId: string) => {
    setState(prev => {
      const newSet = new Set(prev.claimableTaskIds);
      newSet.delete(taskId);
      return { ...prev, claimableTaskIds: newSet };
    });
  }, []);

  const hasClaimableTask = useCallback((taskId: string) => {
    return state.claimableTaskIds.has(taskId);
  }, [state.claimableTaskIds]);

  // ============================================
  // Legacy Functions (for backward compatibility)
  // ============================================

  const incrementUnreadMessages = useCallback((amount = 1) => {
    // Add placeholder IDs for compatibility
    setState(prev => {
      const newSet = new Set(prev.unreadChatIds);
      for (let i = 0; i < amount; i++) {
        newSet.add(`unread_${Date.now()}_${i}`);
      }
      return { ...prev, unreadChatIds: newSet };
    });
  }, []);

  const incrementUnclaimedRewards = useCallback((amount = 1) => {
    setState(prev => {
      const newSet = new Set(prev.claimableTaskIds);
      for (let i = 0; i < amount; i++) {
        newSet.add(`task_${Date.now()}_${i}`);
      }
      return { ...prev, claimableTaskIds: newSet };
    });
  }, []);

  const incrementGameInvites = useCallback((amount = 1) => {
    setState(prev => {
      const newSet = new Set(prev.pendingGameInviteIds);
      for (let i = 0; i < amount; i++) {
        newSet.add(`invite_${Date.now()}_${i}`);
      }
      return { ...prev, pendingGameInviteIds: newSet };
    });
  }, []);

  const clearUnreadMessages = useCallback(() => {
    setState(prev => ({ ...prev, unreadChatIds: new Set() }));
  }, []);

  const decrementUnreadMessages = useCallback((amount = 1) => {
    setState(prev => {
      const newSet = new Set(prev.unreadChatIds);
      const arr = Array.from(newSet);
      for (let i = 0; i < amount && arr.length > 0; i++) {
        newSet.delete(arr[arr.length - 1 - i]);
      }
      return { ...prev, unreadChatIds: newSet };
    });
  }, []);

  const clearUnclaimedRewards = useCallback(() => {
    setState(prev => ({ ...prev, claimableTaskIds: new Set() }));
  }, []);

  const decrementUnclaimedRewards = useCallback((amount = 1) => {
    setState(prev => {
      const newSet = new Set(prev.claimableTaskIds);
      const arr = Array.from(newSet);
      for (let i = 0; i < amount && arr.length > 0; i++) {
        newSet.delete(arr[arr.length - 1 - i]);
      }
      return { ...prev, claimableTaskIds: newSet };
    });
  }, []);

  const clearGameInvites = useCallback(() => {
    setState(prev => ({ ...prev, pendingGameInviteIds: new Set() }));
  }, []);

  const decrementGameInvites = useCallback((amount = 1) => {
    setState(prev => {
      const newSet = new Set(prev.pendingGameInviteIds);
      const arr = Array.from(newSet);
      for (let i = 0; i < amount && arr.length > 0; i++) {
        newSet.delete(arr[arr.length - 1 - i]);
      }
      return { ...prev, pendingGameInviteIds: newSet };
    });
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

    // Handle new messages - add the relationship_id to unread set
    const handleReceiveMessage = (data: { relationship_id: string; sender_id: string }) => {
      console.log('📩 Received message notification:', data, 'activeChat:', activeChat, 'userId:', user?.id);
      // Don't add to unread if user is currently viewing that chat
      if (activeChat !== data.relationship_id && data.sender_id !== user?.id) {
        console.log('📩 Adding to unread chats:', data.relationship_id);
        addUnreadChat(data.relationship_id);
      } else {
        console.log('📩 Skipping - user in chat or is sender');
      }
    };

    // Handle task completion notifications
    const handleTaskCompleted = (data: { task_id?: string }) => {
      if (data?.task_id) {
        addClaimableTask(data.task_id);
      } else {
        incrementUnclaimedRewards();
      }
    };

    // Handle referral success
    const handleReferralSuccess = (data: { task_id?: string }) => {
      if (data?.task_id) {
        addClaimableTask(data.task_id);
      } else {
        incrementUnclaimedRewards();
      }
    };

    // Handle game invites - add the inviter's ID
    const handleGameInvite = (data: { inviterId?: string; gameId?: string }) => {
      const inviteId = data?.inviterId || data?.gameId || `invite_${Date.now()}`;
      addGameInvite(inviteId);
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
  }, [socket, activeChat, user?.id, addUnreadChat, addClaimableTask, addGameInvite, incrementUnclaimedRewards]);

  // Fetch badge counts on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshBadges();
    }
  }, [isAuthenticated, refreshBadges]);

  const value: NotificationContextValue = {
    ...state,
    ...counts,
    refreshBadges,
    // Granular operations
    addUnreadChat,
    removeUnreadChat,
    hasUnreadChat,
    addGameInvite,
    removeGameInvite,
    hasGameInvite,
    addClaimableTask,
    removeClaimableTask,
    hasClaimableTask,
    // Legacy operations
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
