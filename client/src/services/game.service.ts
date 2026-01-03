/**
 * Game Service
 * Handles game-related API calls for the Game Arcade
 */

import { api } from '../api/axiosClient';

// ============================================
// Types
// ============================================

export interface GameStats {
  user_id: string;
  daily_tickets: number;
  total_score: number;
  last_ticket_reset: string;
  kyp_high_score: number;
  mining_high_score: number;
  candle_kiss_high_score: number;
  current_streak: number;
  longest_streak: number;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_type: 'KYP' | 'MINING' | 'CANDLE_KISS';
  score: number;
  partner_id?: string;
  duration_seconds?: number;
  completed: boolean;
  love_earned: number;
  created_at: string;
}

export interface GameLeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_score: number;
  rank: number;
}

export type GameType = 'KYP' | 'MINING' | 'CANDLE_KISS';

// ============================================
// Game Info
// ============================================

export const GAMES = {
  KYP: {
    id: 'KYP',
    name: 'Know Your Partner',
    description: 'Test how well you know your match!',
    emoji: '🧠',
    tag: 'Easy',
    tagColor: 'bg-green-500',
    image: '/imgs/games/kyp.png',
    requiredStreak: 0,
  },
  MINING: {
    id: 'MINING',
    name: 'Love Mining',
    description: 'Mine $LOVE together with your partner!',
    emoji: '⛏️',
    tag: 'Co-op',
    tagColor: 'bg-blue-500',
    image: '/imgs/games/mining.png',
    requiredStreak: 0,
  },
  CANDLE_KISS: {
    id: 'CANDLE_KISS',
    name: 'Candle Kiss',
    description: 'Predict the next candle movement!',
    emoji: '📊',
    tag: 'High Risk',
    tagColor: 'bg-red-500',
    image: '/imgs/games/candle.png',
    requiredStreak: 3, // Requires 3-day streak to unlock
  },
} as const;

export const MAX_DAILY_TICKETS = 3;
export const TICKET_REFILL_COST = 50; // $LOVE

// ============================================
// API Functions
// ============================================

/**
 * Get user's game stats
 */
export async function getGameStats(): Promise<GameStats> {
  const response = await api.get<{ stats: GameStats }>('/games/stats');
  return response.stats;
}

/**
 * Use a ticket to play a game
 * Returns remaining tickets or error if no tickets
 */
export async function useTicket(gameType: GameType): Promise<{
  success: boolean;
  remaining_tickets: number;
  session_id?: string;
  message?: string;
}> {
  const response = await api.post<{
    success: boolean;
    remaining_tickets: number;
    session_id?: string;
    message?: string;
  }>('/games/use-ticket', { game_type: gameType });
  return response;
}

/**
 * Refill tickets by burning $LOVE
 */
export async function refillTickets(): Promise<{
  success: boolean;
  tickets: number;
  new_balance: number;
  message?: string;
}> {
  const response = await api.post<{
    success: boolean;
    tickets: number;
    new_balance: number;
    message?: string;
  }>('/games/refill-tickets', { cost: TICKET_REFILL_COST });
  return response;
}

/**
 * Submit game score
 */
export async function submitScore(
  sessionId: string,
  score: number,
  durationSeconds: number
): Promise<{
  success: boolean;
  love_earned: number;
  new_total_score: number;
  is_high_score: boolean;
}> {
  const response = await api.post<{
    success: boolean;
    love_earned: number;
    new_total_score: number;
    is_high_score: boolean;
  }>('/games/submit-score', {
    session_id: sessionId,
    score,
    duration_seconds: durationSeconds,
  });
  return response;
}

/**
 * Get game leaderboard
 */
export async function getGameLeaderboard(
  gameType?: GameType,
  limit: number = 50
): Promise<GameLeaderboardEntry[]> {
  const params = new URLSearchParams();
  if (gameType) params.append('game_type', gameType);
  params.append('limit', limit.toString());
  
  const response = await api.get<{ leaderboard: GameLeaderboardEntry[] }>(
    `/games/leaderboard?${params.toString()}`
  );
  return response.leaderboard;
}

/**
 * Check if user can play a specific game
 */
export function canPlayGame(
  game: typeof GAMES[GameType],
  userStreak: number,
  tickets: number
): { canPlay: boolean; reason?: string } {
  if (tickets <= 0) {
    return { canPlay: false, reason: 'No tickets remaining' };
  }
  
  if (game.requiredStreak > 0 && userStreak < game.requiredStreak) {
    return { 
      canPlay: false, 
      reason: `Reach ${game.requiredStreak}-Day Streak to unlock` 
    };
  }
  
  return { canPlay: true };
}
