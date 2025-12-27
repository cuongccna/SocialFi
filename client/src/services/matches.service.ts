/**
 * Matches API Service
 * Handles relationships and matches
 */

import { api } from '../api/axiosClient';

export interface Match {
  relationship_id: string;
  status: 'MATCHED' | 'MINTED_CONTRACT' | 'BURNED_CONTRACT';
  contract_address: string | null;
  contract_minted_at: string | null;
  start_date: string;
  matched_at: string;
  partner_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  wallet_rank: 'WHALE' | 'SHARK' | 'SHRIMP';
  market_price: number;
  price_change_24h: number;
  last_active_at: string | null;
  combined_market_cap: number;
}

interface MatchesResponse {
  success: boolean;
  matches: Match[];
  total: number;
  limit: number;
  offset: number;
}

interface MatchDetailResponse {
  success: boolean;
  match: object;
}

interface ContractActionResponse {
  success: boolean;
  message: string;
  relationship: object;
}

/**
 * Get all matches for current user
 */
export async function getMatches(
  limit: number = 50,
  offset: number = 0
): Promise<{ matches: Match[]; total: number }> {
  const response = await api.get<MatchesResponse>('/matches', {
    params: { limit, offset },
  });

  return {
    matches: response.matches || [],
    total: response.total || 0,
  };
}

/**
 * Get specific match details
 */
export async function getMatchById(id: string): Promise<object> {
  const response = await api.get<MatchDetailResponse>(`/matches/${id}`);
  return response.match;
}

/**
 * Mint relationship NFT contract
 */
export async function mintContract(id: string): Promise<ContractActionResponse> {
  const response = await api.post<ContractActionResponse>(`/matches/${id}/mint`);
  return response;
}

/**
 * Burn (end) relationship contract
 */
export async function burnContract(id: string): Promise<ContractActionResponse> {
  const response = await api.post<ContractActionResponse>(`/matches/${id}/burn`);
  return response;
}

/**
 * Format time ago string
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffMins > 0) {
    return diffMins === 1 ? '1 min ago' : `${diffMins} mins ago`;
  }
  return 'Just now';
}
