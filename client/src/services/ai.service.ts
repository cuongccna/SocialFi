/**
 * AI Rizz God Service
 * AI-powered pickup line suggestions
 */

import { api } from '../api/axiosClient';

export interface AIRizzSuggestionResponse {
  success: boolean;
  suggestions: string[];
  remaining_balance: number;
  cost: number;
}

export interface AIRizzErrorResponse {
  success: false;
  error: 'INSUFFICIENT_BALANCE';
  message: string;
  required: number;
  current_balance: number;
}

/**
 * Get AI-generated pickup line suggestions for a partner
 * Costs 20 $LOVE per use
 */
export async function getAISuggestions(
  partnerId: string
): Promise<{ suggestions: string[]; remainingBalance: number }> {
  const response = await api.post<AIRizzSuggestionResponse>('/chat/ai-suggestion', {
    partner_id: partnerId,
  });
  
  return {
    suggestions: response.suggestions || [],
    remainingBalance: response.remaining_balance || 0,
  };
}

/**
 * Check if error is insufficient balance error
 */
export function isInsufficientBalanceError(error: unknown): error is { 
  response: { 
    status: number; 
    data: AIRizzErrorResponse 
  } 
} {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
    return axiosError.response?.status === 402 && 
           axiosError.response?.data?.error === 'INSUFFICIENT_BALANCE';
  }
  return false;
}

/**
 * AI Rizz cost constant
 */
export const AI_RIZZ_COST = 20;
