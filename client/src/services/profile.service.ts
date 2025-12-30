/**
 * Profile API Service
 * Handles user profile and stats
 */

import { api } from '../api/axiosClient';

export interface UserStats {
  total_likes_received: number;
  total_likes_given: number;
  total_passes_received: number;
  total_passes_given: number;
  total_matches: number;
  total_contracts_minted: number;
  market_rank: number;
  percentile: number;
}

interface StatsResponse {
  success: boolean;
  stats: UserStats;
}

interface ProfileUpdateRequest {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

/**
 * Get user stats
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    const response = await api.get<StatsResponse>('/users/stats');
    return response.stats;
  } catch {
    // Return default stats if endpoint doesn't exist yet
    return {
      total_likes_received: 0,
      total_likes_given: 0,
      total_passes_received: 0,
      total_passes_given: 0,
      total_matches: 0,
      total_contracts_minted: 0,
      market_rank: 0,
      percentile: 0,
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileUpdateRequest): Promise<void> {
  await api.patch('/users/profile', data);
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Calculate market cap rank emoji
 */
export function getRankEmoji(percentile: number): string {
  if (percentile >= 99) return '👑';
  if (percentile >= 95) return '💎';
  if (percentile >= 90) return '🏆';
  if (percentile >= 80) return '⭐';
  if (percentile >= 50) return '📈';
  return '🌱';
}

// ==========================================
// Boost (Pump Profile) APIs
// ==========================================

export interface BoostResult {
  success: boolean;
  message: string;
  user?: {
    market_price: number;
    price_change_24h: number;
    balance_love: number;
    boosted_until: string;
  };
}

/**
 * Boost profile visibility (costs 500 $LOVE, +10% price, 30 min visibility boost)
 */
export async function boostProfile(): Promise<BoostResult> {
  return await api.post<BoostResult>('/users/boost');
}

// ==========================================
// FUD APIs
// ==========================================

export interface FudResult {
  success: boolean;
  message: string;
  fud?: {
    target_id: string;
    target_name: string;
    price_before: number;
    price_after: number;
    price_drop_percent: number;
    cooldown_hours: number;
    next_fud_available: string;
  };
}

export interface FudStatus {
  success: boolean;
  can_fud: boolean;
  cooldown_remaining_hours?: number;
  next_fud_available?: string;
  last_fud?: {
    created_at: string;
    price_drop_percent: number;
  };
}

/**
 * FUD a matched user (dumps their price by 15%)
 */
export async function fudUser(targetId: string, reason?: string): Promise<FudResult> {
  return await api.post<FudResult>('/fud', { target_id: targetId, reason });
}

/**
 * Check FUD cooldown status for a target user
 */
export async function getFudStatus(targetId: string): Promise<FudStatus> {
  return await api.get<FudStatus>(`/fud/status/${targetId}`);
}
