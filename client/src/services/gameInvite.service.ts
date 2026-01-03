/**
 * Game Invite Service
 * API calls for game invitation system
 */

import { api } from '../api/axiosClient';

export interface GameInviteRequest {
  partner_id: string;
  game_type: 'KYP' | 'MINING' | 'CANDLE_KISS';
  room_id?: string;
}

export interface GameInviteResponse {
  success: boolean;
  delivery_method: 'socket' | 'telegram' | 'failed' | 'no_telegram';
  partner_name: string;
  message: string;
}

export interface GameInviteEvent {
  gameId: string;
  inviterName: string;
  inviterId: string;
  gameType: 'KYP' | 'MINING' | 'CANDLE_KISS';
  relationshipId?: string;
  timestamp: string;
}

/**
 * Send a game invitation to a partner
 */
export async function sendGameInvite(
  partnerId: string,
  gameType: 'KYP' | 'MINING' | 'CANDLE_KISS',
  roomId?: string
): Promise<GameInviteResponse> {
  const response = await api.post<GameInviteResponse>('/games/invite', {
    partner_id: partnerId,
    game_type: gameType,
    room_id: roomId,
  });
  return response;
}

/**
 * Map game types to friendly display names
 */
export function getGameDisplayName(gameType: string): string {
  const names: Record<string, string> = {
    'KYP': 'Know Your Partner 💕',
    'MINING': 'Love Mining ⛏️',
    'CANDLE_KISS': 'Candle Kiss 💋',
  };
  return names[gameType] || gameType;
}

/**
 * Map game types to route paths
 */
export function getGameRoutePath(gameType: string): string {
  const routes: Record<string, string> = {
    'KYP': '/games/kyp',
    'MINING': '/games/mining',
    'CANDLE_KISS': '/games/candle',
  };
  return routes[gameType] || '/games';
}
