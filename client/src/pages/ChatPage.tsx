import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Loader2, MessageCircle, Heart 
} from 'lucide-react';
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setMessages([]);
    
    try {
      const { messages: msgs } = await getMessages(conversation.relationship_id);
      setMessages(msgs);
      
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

    try {
      const message = await sendMessage(selectedConversation.relationship_id, content);
      setMessages(prev => [...prev, message]);
      
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
              navigate(-1);
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
                    {conv.last_message_at && (
                      <span className="text-xs text-white/40">
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    )}
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
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm border-b border-white/10 flex items-center gap-4">
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
          
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
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
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-dark-100/50 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-dark-200 border border-white/20 rounded-full px-4 py-3 focus:border-primary outline-none"
            maxLength={1000}
          />
          
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="p-3 rounded-full bg-primary text-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90 active:scale-95"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
