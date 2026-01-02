/**
 * Socket.io Hook for Real-time Chat
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

// Detect socket URL based on environment
const getSocketUrl = () => {
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  // In production (not localhost), use current origin
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return window.location.origin;
  }
  // Local development
  return 'http://localhost:3008';
};

const SOCKET_URL = getSocketUrl();

interface Message {
  id: string;
  sender_id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'STICKER' | 'SYSTEM';
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    avatar_url: string;
  };
}

interface UseSocketOptions {
  conversationId?: string;
  onMessage?: (message: Message) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onBalanceUpdate?: (data: { joint_balance: number }) => void;
  onMessagesRead?: (data: { userId: string }) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Store options in ref to avoid stale closures in event listeners
  const optionsRef = useRef(options);
  
  // Update ref whenever options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      // Use polling first, then upgrade to websocket (avoids initial websocket failure warning)
      transports: ['polling', 'websocket'],
      autoConnect: true,
      upgrade: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Join/leave conversation room
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected || !options.conversationId || !user) return;

    // Join room
    socket.emit('join_room', {
      relationship_id: options.conversationId,
      user_id: user.id,
    });

    // Listen for incoming messages
    const handleMessage = (message: Message) => {
      console.log('🔌 Socket received message:', message);
      optionsRef.current.onMessage?.(message);
    };

    // Listen for typing indicators
    const handleTypingStart = ({ userId }: { userId: string }) => {
      if (String(userId) !== String(user.id)) {
        setTypingUsers((prev) => [...new Set([...prev, userId])]);
        optionsRef.current.onTyping?.({ userId, isTyping: true });
      }
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId));
      optionsRef.current.onTyping?.({ userId, isTyping: false });
    };

    // Listen for balance updates (Joint Venture)
    const handleBalanceUpdate = (data: { joint_balance: number }) => {
      optionsRef.current.onBalanceUpdate?.(data);
    };

    // Listen for read receipts
    const handleMessagesRead = (data: { userId: string }) => {
      optionsRef.current.onMessagesRead?.(data);
    };

    socket.on('receive_message', handleMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('update_balance', handleBalanceUpdate);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.emit('leave_room', {
        relationship_id: options.conversationId,
      });
      socket.off('receive_message', handleMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('update_balance', handleBalanceUpdate);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [isConnected, options.conversationId, user]);

  // Send message
  const sendMessage = useCallback(
    (content: string, type: 'TEXT' | 'IMAGE' | 'STICKER' = 'TEXT') => {
      const socket = socketRef.current;
      if (!socket || !options.conversationId || !user) return;

      socket.emit('send_message', {
        relationship_id: options.conversationId,
        sender_id: user.id,
        content,
        type,
      });
    },
    [options.conversationId, user]
  );

  // Typing indicators
  const startTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !options.conversationId || !user) return;

    socket.emit('typing_start', {
      relationship_id: options.conversationId,
      user_id: user.id,
    });
  }, [options.conversationId, user]);

  const stopTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !options.conversationId || !user) return;

    socket.emit('typing_stop', {
      relationship_id: options.conversationId,
      user_id: user.id,
    });
  }, [options.conversationId, user]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !options.conversationId || !user) return;

    socket.emit('mark_read', {
      relationship_id: options.conversationId,
      user_id: user.id,
    });
  }, [options.conversationId, user]);

  return {
    isConnected,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    socket: socketRef.current,
  };
}
