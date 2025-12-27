/**
 * Leaderboard API Service
 */

import { api } from '../api/axiosClient';

export type LeaderboardType = 'market_cap' | 'gainers' | 'losers' | 'matches' | 'active';

export interface LeaderboardUser {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  wallet_rank: 'WHALE' | 'SHARK' | 'SHRIMP';
  market_price: number;
  price_change_24h: number;
  balance_love: number;
  last_active_at: string | null;
  rank: number;
  match_count?: number;
}

export interface LeaderboardCouple {
  relationship_id: string;
  status: string;
  contract_address: string | null;
  start_date: string;
  user_a_id: string;
  user_a_name: string;
  user_a_avatar: string | null;
  user_a_price: number;
  user_b_id: string;
  user_b_name: string;
  user_b_avatar: string | null;
  user_b_price: number;
  combined_market_cap: number;
  rank: number;
}

interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardUser[];
  total: number;
  user_rank: number | null;
  type: LeaderboardType;
  limit: number;
  offset: number;
}

interface CouplesLeaderboardResponse {
  success: boolean;
  couples: LeaderboardCouple[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get users leaderboard
 */
export async function getLeaderboard(
  type: LeaderboardType = 'market_cap',
  limit: number = 50,
  offset: number = 0
): Promise<{ users: LeaderboardUser[]; total: number; userRank: number | null }> {
  const response = await api.get<LeaderboardResponse>('/leaderboard', {
    params: { type, limit, offset },
  });

  return {
    users: response.leaderboard || [],
    total: response.total || 0,
    userRank: response.user_rank,
  };
}

/**
 * Get couples leaderboard
 */
export async function getCouplesLeaderboard(
  limit: number = 20,
  offset: number = 0
): Promise<{ couples: LeaderboardCouple[]; total: number }> {
  const response = await api.get<CouplesLeaderboardResponse>('/leaderboard/couples', {
    params: { limit, offset },
  });

  return {
    couples: response.couples || [],
    total: response.total || 0,
  };
}

/**
 * Get rank medal/emoji
 */
export function getRankDisplay(rank: number): { emoji: string; class: string } {
  switch (rank) {
    case 1:
      return { emoji: '🥇', class: 'text-yellow-400' };
    case 2:
      return { emoji: '🥈', class: 'text-gray-300' };
    case 3:
      return { emoji: '🥉', class: 'text-amber-600' };
    default:
      return { emoji: `#${rank}`, class: 'text-white/60' };
  }
}
