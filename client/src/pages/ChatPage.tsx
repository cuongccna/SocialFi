import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Loader2, MessageCircle, Heart, Coins, Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getMessages, 
  sendMessage, 
  getConversations,
  formatMessageTime,
  type Message, 
  type Conversation 
} from '../services/messages.service';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';
import { useSocket } from '../hooks/useSocket';
import StickerPicker from '../components/StickerPicker';
import { type Sticker, STICKER_REWARD } from '../data/stickers';

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const matchId = searchParams.get('match');
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [jointBalance, setJointBalance] = useState(0);
  const [showBalanceBump, setShowBalanceBump] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [floatingRewards, setFloatingRewards] = useState<{ id: number; x: number; y: number; amount: number }[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const stickerButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time socket connection
  const handleNewMessage = useCallback((message: Message) => {
    console.log('💬 ChatPage received message:', message);
    // Only add if not from current user (already added optimistically)
    if (String(message.sender_id) !== String(user?.id)) {
      console.log('📥 Adding message to list');
      setMessages(prev => [...prev, message]);
      haptic.notification('success');
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      console.log('🚫 Ignoring own message');
    }
  }, [user?.id]);

  const handleBalanceUpdate = useCallback((data: { joint_balance: number }) => {
    setJointBalance(data.joint_balance);
    setShowBalanceBump(true);
    setTimeout(() => setShowBalanceBump(false), 500);
  }, []);

  const handleTyping = useCallback((data: { userId: string; isTyping: boolean }) => {
    if (String(data.userId) !== String(user?.id)) {
      setIsPartnerTyping(data.isTyping);
    }
  }, [user?.id]);

  const { 
    isConnected, 
    startTyping, 
    stopTyping,
    markAsRead 
  } = useSocket({
    conversationId: selectedConversation ? selectedConversation.relationship_id : undefined,
    onMessage: (msg) => handleNewMessage(msg as unknown as Message),
    onBalanceUpdate: handleBalanceUpdate,
    onTyping: handleTyping,
  });

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load specific chat if matchId provided
  useEffect(() => {
    if (matchId && conversations.length > 0) {
      const conv = conversations.find(c => c.relationship_id === matchId);
      if (conv) {
        openChat(conv);
      }
    }
  }, [matchId, conversations]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setJointBalance(Number(conversation.joint_balance) || 0);
    setMessages([]);
    setIsPartnerTyping(false);
    
    try {
      const { messages: msgs } = await getMessages(conversation.relationship_id);
      setMessages(msgs);
      
      // Mark messages as read via socket
      setTimeout(() => {
        markAsRead();
      }, 500);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    haptic.impact('light');
    
    // Stop typing indicator
    stopTyping();

    // Optimistically add message
    const optimisticMessage: Message = {
      id: String(Date.now()),
      relationship_id: selectedConversation.relationship_id,
      sender_id: String(user?.id || ''),
      sender_name: user?.display_name || '',
      sender_avatar: user?.avatar_url || null,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Always use REST API to ensure message is saved to DB
      // Socket handles real-time delivery to other user
      const { message, jointBalance, rewardAmount } = await sendMessage(selectedConversation.relationship_id, content);
      
      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? message : m
      ));
      
      // Update joint balance from server (more accurate than local calculation)
      if (jointBalance !== undefined) {
        setJointBalance(jointBalance);
      } else {
        setJointBalance(prev => prev + 0.1);
      }
      setShowBalanceBump(true);
      setTimeout(() => setShowBalanceBump(false), 500);
      
      // Trigger floating +0.1 $LOVE animation
      const rewardId = Date.now();
      const buttonRect = sendButtonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        setFloatingRewards(prev => [...prev, { 
          id: rewardId, 
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top,
          amount: rewardAmount || 0.1
        }]);
        setTimeout(() => {
          setFloatingRewards(prev => prev.filter(r => r.id !== rewardId));
        }, 1500);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(content); // Restore message on failure
      haptic.notification('error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending stickers
  const handleSendSticker = async (sticker: Sticker) => {
    if (!selectedConversation || isSending) return;

    setIsSending(true);
    haptic.impact('heavy');

    // Optimistically add sticker message
    const optimisticMessage: Message = {
      id: String(Date.now()),
      relationship_id: selectedConversation.relationship_id,
      sender_id: String(user?.id || ''),
      sender_name: user?.display_name || '',
      sender_avatar: user?.avatar_url || null,
      content: sticker.url,
      type: 'STICKER',
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Always use REST API to ensure message is saved to DB
      // Socket is used for real-time delivery to other user
      console.log('📨 Sending sticker via REST API:', sticker.url);
      const { message, jointBalance, rewardAmount } = await sendMessage(selectedConversation.relationship_id, sticker.url, 'STICKER');
      console.log('✅ Sticker saved:', message);
      
      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? message : m
      ));
      
      // Update joint balance from server (more accurate than local calculation)
      if (jointBalance !== undefined) {
        setJointBalance(jointBalance);
      } else {
        setJointBalance(prev => prev + STICKER_REWARD);
      }
      setShowBalanceBump(true);
      setTimeout(() => setShowBalanceBump(false), 500);

      // Trigger floating reward animation (stickers give more!)
      const rewardId = Date.now();
      const buttonRect = stickerButtonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        setFloatingRewards(prev => [...prev, { 
          id: rewardId, 
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top,
          amount: rewardAmount || STICKER_REWARD
        }]);
        setTimeout(() => {
          setFloatingRewards(prev => prev.filter(r => r.id !== rewardId));
        }, 1500);
      }

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to send sticker:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      haptic.notification('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (isConnected && e.target.value.length > 0) {
      startTyping();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    }
  };

  // Conversations List View
  if (!selectedConversation) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 bg-dark-100/50 backdrop-blur-sm border-b border-white/10 flex items-center gap-3">
          <button
            onClick={() => {
              haptic.impact('light');
              navigate('/matches');
            }}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Messages
          </h1>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && conversations.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-semibold mb-2">No Conversations Yet</h2>
            <p className="text-white/60 mb-6">
              Match with someone to start chatting!
            </p>
            <button 
              onClick={() => navigate('/feed')}
              className="btn-primary"
            >
              Start Swiping
            </button>
          </div>
        )}

        {/* Conversations List */}
        {!isLoading && conversations.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.relationship_id}
                onClick={() => openChat(conv)}
                className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-white/5"
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={conv.partner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.partner_id}`}
                    alt={conv.partner_name}
                    className="w-14 h-14 rounded-full border-2 border-primary/50 object-cover"
                  />
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-dark text-xs font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{conv.partner_name}</h3>
                    <div className="flex items-center gap-2">
                      {Number(conv.joint_balance) > 0 && (
                        <span className="text-xs text-neon-yellow flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />
                          {Number(conv.joint_balance).toFixed(1)}
                        </span>
                      )}
                      {conv.last_message_at && (
                        <span className="text-xs text-white/40">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-white/60'}`}>
                    {conv.last_message || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat View
  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedConversation(null)}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <img
            src={selectedConversation.partner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConversation.partner_id}`}
            alt={selectedConversation.partner_name}
            className="w-10 h-10 rounded-full border-2 border-primary/50 object-cover"
          />
          
          <div className="flex-1">
            <h2 className="font-semibold">{selectedConversation.partner_name}</h2>
            <p className="text-xs text-white/60 flex items-center gap-1">
              <Heart className="w-3 h-3 text-primary" />
              Matched
            </p>
          </div>
        </div>
        
        {/* Joint Venture Pool - THE TICKER */}
        <motion.div 
          className="mt-3 relative overflow-hidden rounded-xl"
          animate={showBalanceBump ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-green-500/20 to-yellow-500/20" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          />
          
          {/* Glow effect */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              boxShadow: 'inset 0 0 30px rgba(234, 179, 8, 0.3), 0 0 20px rgba(234, 179, 8, 0.2)',
            }}
          />
          
          <div className="relative p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg"
                animate={{ 
                  boxShadow: showBalanceBump 
                    ? ['0 0 20px rgba(234, 179, 8, 0.5)', '0 0 40px rgba(234, 179, 8, 0.8)', '0 0 20px rgba(234, 179, 8, 0.5)']
                    : '0 0 20px rgba(234, 179, 8, 0.5)'
                }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-lg">💰</span>
              </motion.div>
              <div>
                <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Joint Pool</span>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Chat-to-Earn Active
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-green-400 tabular-nums drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={jointBalance.toFixed(2)}
                        initial={{ y: -20, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="inline-block"
                      >
                        ${jointBalance.toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </div>
                <span className="text-xs text-yellow-400/80 font-medium">$LOVE</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👋</div>
            <p className="text-white/60">Say hello to your match!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isSticker = msg.type === 'STICKER' || msg.content?.startsWith('https://media.giphy.com');
          
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {isSticker ? (
                // Sticker Message
                <div className="max-w-[200px]">
                  <motion.img
                    src={msg.content}
                    alt="Sticker"
                    className="w-full h-auto rounded-xl"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  />
                  <p className={`text-xs mt-1 ${isMe ? 'text-right text-white/40' : 'text-left text-white/40'}`}>
                    {formatMessageTime(msg.created_at)}
                  </p>
                </div>
              ) : (
                // Text Message
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    isMe
                      ? 'bg-primary text-dark rounded-br-md'
                      : 'bg-white/10 text-white rounded-bl-md'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-dark/60' : 'text-white/40'}`}>
                    {formatMessageTime(msg.created_at)}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
        
        {/* Typing indicator */}
        <AnimatePresence>
          {isPartnerTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start mb-2"
            >
              <div className="bg-dark-200 rounded-2xl rounded-bl-md px-4 py-2 flex items-center gap-1">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
                  className="w-2 h-2 bg-white/60 rounded-full"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}
                  className="w-2 h-2 bg-white/60 rounded-full"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }}
                  className="w-2 h-2 bg-white/60 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm border-t border-white/10">
        {/* Connection status indicator */}
        {!isConnected && (
          <div className="text-xs text-yellow-500/80 mb-2 text-center">
            ⚠️ Real-time connection lost. Messages will be sent via HTTP.
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Sticker Button */}
          <button
            ref={stickerButtonRef}
            onClick={() => {
              haptic.impact('light');
              setShowStickerPicker(true);
            }}
            disabled={isSending}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-all active:scale-95"
            title="Send Sticker (+0.5 $LOVE)"
          >
            <Smile className="w-5 h-5 text-yellow-400" />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-dark-200 border border-white/20 rounded-full px-4 py-3 focus:border-primary outline-none"
            maxLength={1000}
          />
          
          <button
            ref={sendButtonRef}
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="relative p-3 rounded-full bg-primary text-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/30"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Sticker Picker */}
      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleSendSticker}
      />
      
      {/* Floating $LOVE Rewards */}
      <AnimatePresence>
        {floatingRewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ 
              opacity: 1, 
              y: 0,
              x: 0,
              scale: 1 
            }}
            animate={{ 
              opacity: 0, 
              y: -100,
              scale: 1.2
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="fixed pointer-events-none z-50"
            style={{ 
              left: reward.x - 40,
              top: reward.y - 20,
            }}
          >
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full shadow-lg ${
              reward.amount >= 0.5 
                ? 'bg-gradient-to-r from-neon-purple via-primary to-yellow-400' 
                : 'bg-gradient-to-r from-yellow-400 to-green-400'
            }`}>
              <span className="text-dark font-bold text-sm">+{reward.amount}</span>
              <span className="text-dark/80 text-xs">$LOVE</span>
              <span className="text-base">{reward.amount >= 0.5 ? '🎉' : '💰'}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
