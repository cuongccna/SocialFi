/**
 * Markets API Service
 * Prediction markets for couples
 */

import { api } from '../api/axiosClient';

export type BetPosition = 'LONG' | 'SHORT';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'PAYOUT_LONG' | 'PAYOUT_SHORT';

export interface Market {
  id: string;
  relationship_id: string;
  expiry_date: string;
  pool_long: number;
  pool_short: number;
  status: MarketStatus;
  created_at: string;
  settled_at: string | null;
  // Joined data
  relationship_status: string;
  contract_address: string | null;
  user_a_id: string;
  user_a_name: string;
  user_a_avatar: string | null;
  user_a_price: number;
  user_b_id: string;
  user_b_name: string;
  user_b_avatar: string | null;
  user_b_price: number;
  combined_market_cap: number;
  total_pool: number;
  long_percentage: number;
  // User's existing bet on this market
  user_bet_id: string | null;
  user_bet_position: BetPosition | null;
  user_bet_amount: number | null;
}

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  position: BetPosition;
  amount: number;
  is_settled: boolean;
  payout_amount: number;
  created_at: string;
}

interface MarketsResponse {
  success: boolean;
  markets: Market[];
  total: number;
}

interface MarketDetailResponse {
  success: boolean;
  market: Market;
  user_bet: Bet | null;
}

interface PlaceBetResponse {
  success: boolean;
  message: string;
  bet: Bet;
}

interface UserBetsResponse {
  success: boolean;
  bets: (Bet & {
    market_status: MarketStatus;
    expiry_date: string;
    pool_long: number;
    pool_short: number;
    user_a_name: string;
    user_b_name: string;
  })[];
}

/**
 * Get all prediction markets
 */
export async function getMarkets(
  status: MarketStatus = 'OPEN',
  limit: number = 20,
  offset: number = 0
): Promise<{ markets: Market[]; total: number }> {
  const response = await api.get<MarketsResponse>('/markets', {
    params: { status, limit, offset },
  });

  return {
    markets: response.markets || [],
    total: response.total || 0,
  };
}

/**
 * Get market by ID with user's bet
 */
export async function getMarketById(id: string): Promise<{ market: Market; userBet: Bet | null }> {
  const response = await api.get<MarketDetailResponse>(`/markets/${id}`);
  return {
    market: response.market,
    userBet: response.user_bet,
  };
}

/**
 * Place a bet on a market
 */
export async function placeBet(
  marketId: string,
  position: BetPosition,
  amount: number
): Promise<PlaceBetResponse> {
  const response = await api.post<PlaceBetResponse>(`/markets/${marketId}/bet`, {
    position,
    amount,
  });
  return response;
}

/**
 * Get user's betting history
 */
export async function getUserBets(): Promise<UserBetsResponse['bets']> {
  const response = await api.get<UserBetsResponse>('/markets/user/bets');
  return response.bets || [];
}

/**
 * Calculate potential payout
 */
export function calculatePayout(
  amount: number,
  position: BetPosition,
  poolLong: number | string,
  poolShort: number | string
): number {
  // Ensure numeric values
  const betAmount = Number(amount) || 0;
  const longPool = Number(poolLong) || 0;
  const shortPool = Number(poolShort) || 0;
  
  if (betAmount <= 0) return 0;
  
  const totalPool = longPool + shortPool + betAmount;
  const winningPool = position === 'LONG' ? longPool + betAmount : shortPool + betAmount;
  
  if (winningPool === 0) return betAmount * 2;
  
  const share = betAmount / winningPool;
  return share * totalPool;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(expiryDate: string): string {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h left`;
  }
  return `${diffHours}h left`;
}
