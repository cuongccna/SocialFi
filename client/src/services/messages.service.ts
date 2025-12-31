/**
 * Messages API Service
 * Chat between matches
 */

import { api } from '../api/axiosClient';

export type MessageType = 'TEXT' | 'STICKER' | 'IMAGE';

export interface Message {
  id: string;
  relationship_id: string;
  sender_id: string;
  content: string;
  type?: MessageType;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
}

export interface Conversation {
  relationship_id: string;
  status: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  joint_balance: number;
}

interface MessagesResponse {
  success: boolean;
  messages: Message[];
  has_more: boolean;
}

interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
}

interface SendMessageResponse {
  success: boolean;
  message: Message;
  joint_balance?: number;
  reward_amount?: number;
}

interface UnreadCountResponse {
  success: boolean;
  unread_count: number;
}

/**
 * Get messages for a match
 */
export async function getMessages(
  matchId: string,
  before?: string
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const params: Record<string, any> = { limit: 50 };
  if (before) params.before = before;

  const response = await api.get<MessagesResponse>(`/messages/${matchId}`, { params });
  return {
    messages: response.messages || [],
    hasMore: response.has_more || false,
  };
}

/**
 * Send a message
 * Returns message and updated joint balance
 */
export async function sendMessage(
  matchId: string, 
  content: string, 
  messageType: MessageType = 'TEXT'
): Promise<{ message: Message; jointBalance?: number; rewardAmount?: number }> {
  const response = await api.post<SendMessageResponse>(`/messages/${matchId}`, { 
    content,
    message_type: messageType,
  });
  return {
    message: response.message,
    jointBalance: response.joint_balance,
    rewardAmount: response.reward_amount,
  };
}

/**
 * Get all conversations
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await api.get<ConversationsResponse>('/messages/conversations');
  return response.conversations || [];
}

/**
 * Get unread count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get<UnreadCountResponse>('/messages/unread');
  return response.unread_count || 0;
}

/**
 * Format message time
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMins > 0) {
    return `${diffMins}m ago`;
  }
  return 'Just now';
}
