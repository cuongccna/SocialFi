/**
 * KYP (Know Your Partner) Game Service
 * Handles API calls for the KYP Challenge game
 */

import { api } from '../api/axiosClient';
import type { KYPQuestion } from '../data/kyp_questions';

// ============================================
// Types
// ============================================

export type KYPGamePhase = 'WAITING' | 'BETTING' | 'ANSWERING' | 'REVEAL' | 'RESULTS';

export interface KYPGameSession {
  id: string;
  relationship_id: string;
  player_a_id: string;
  player_b_id: string;
  current_round: number;
  total_rounds: number;
  phase: KYPGamePhase;
  pot: number;
  player_a_score: number;
  player_b_score: number;
  matches: number;
  created_at: string;
}

export interface KYPRoundState {
  round_number: number;
  question: KYPQuestion;
  phase: KYPGamePhase;
  time_remaining: number;
  
  // Betting phase
  player_a_bet?: number;
  player_b_bet?: number;
  player_a_bet_ready?: boolean;
  player_b_bet_ready?: boolean;
  
  // Answering phase
  player_a_answered?: boolean;
  player_b_answered?: boolean;
  
  // Reveal phase
  player_a_answer?: number;
  player_b_answer?: number;
  is_match?: boolean;
  winner_id?: string | null;
  pot_won?: number;
}

export interface KYPGameResult {
  session_id: string;
  player_a: {
    id: string;
    name: string;
    avatar_url: string | null;
    score: number;
  };
  player_b: {
    id: string;
    name: string;
    avatar_url: string | null;
    score: number;
  };
  total_matches: number;
  total_rounds: number;
  match_percentage: number;
  love_earned: number;
  compatibility_rating: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Start a new KYP game session with a partner
 */
export async function startKYPGame(relationshipId: string): Promise<{
  success: boolean;
  session: KYPGameSession;
  message?: string;
}> {
  const response = await api.post<{
    success: boolean;
    session: KYPGameSession;
    message?: string;
  }>('/games/kyp/start', { relationship_id: relationshipId });
  return response;
}

/**
 * Join an existing KYP game session
 */
export async function joinKYPGame(sessionId: string): Promise<{
  success: boolean;
  session: KYPGameSession;
  message?: string;
}> {
  const response = await api.post<{
    success: boolean;
    session: KYPGameSession;
    message?: string;
  }>('/games/kyp/join', { session_id: sessionId });
  return response;
}

/**
 * Submit bet for current round
 */
export async function submitBet(sessionId: string, amount: number): Promise<{
  success: boolean;
  bet_confirmed: boolean;
  waiting_for_partner: boolean;
}> {
  const response = await api.post<{
    success: boolean;
    bet_confirmed: boolean;
    waiting_for_partner: boolean;
  }>('/games/kyp/bet', { session_id: sessionId, amount });
  return response;
}

/**
 * Submit answer for current question
 */
export async function submitAnswer(sessionId: string, answerIndex: number): Promise<{
  success: boolean;
  answer_confirmed: boolean;
  waiting_for_partner: boolean;
}> {
  const response = await api.post<{
    success: boolean;
    answer_confirmed: boolean;
    waiting_for_partner: boolean;
  }>('/games/kyp/answer', { session_id: sessionId, answer_index: answerIndex });
  return response;
}

/**
 * Get current game state
 */
export async function getGameState(sessionId: string): Promise<{
  session: KYPGameSession;
  round: KYPRoundState | null;
}> {
  const response = await api.get<{
    session: KYPGameSession;
    round: KYPRoundState | null;
  }>(`/games/kyp/state/${sessionId}`);
  return response;
}

/**
 * Get final game results
 */
export async function getGameResults(sessionId: string): Promise<KYPGameResult> {
  const response = await api.get<{ result: KYPGameResult }>(`/games/kyp/results/${sessionId}`);
  return response.result;
}

/**
 * Generate shareable result image
 */
export async function generateShareImage(sessionId: string): Promise<{
  success: boolean;
  image_url: string;
  share_text: string;
}> {
  const response = await api.post<{
    success: boolean;
    image_url: string;
    share_text: string;
  }>('/games/kyp/share', { session_id: sessionId });
  return response;
}

// ============================================
// Compatibility Rating Calculator
// ============================================

export function calculateCompatibilityRating(matchPercentage: number): {
  rating: string;
  emoji: string;
  color: string;
} {
  if (matchPercentage >= 90) {
    return { rating: 'SOULMATES', emoji: '💕', color: 'text-pink-400' };
  } else if (matchPercentage >= 80) {
    return { rating: 'Perfect Match', emoji: '❤️', color: 'text-red-400' };
  } else if (matchPercentage >= 70) {
    return { rating: 'Great Connection', emoji: '💖', color: 'text-rose-400' };
  } else if (matchPercentage >= 60) {
    return { rating: 'Good Vibes', emoji: '💗', color: 'text-pink-300' };
  } else if (matchPercentage >= 50) {
    return { rating: 'Getting There', emoji: '💛', color: 'text-yellow-400' };
  } else if (matchPercentage >= 30) {
    return { rating: 'Opposites Attract?', emoji: '🤔', color: 'text-orange-400' };
  } else {
    return { rating: 'Work in Progress', emoji: '💔', color: 'text-gray-400' };
  }
}

// ============================================
// Sound Effects
// ============================================

export const KYP_SOUNDS = {
  countdown: '/sounds/countdown.mp3',
  match: '/sounds/match-win.mp3',
  mismatch: '/sounds/fail-trombone.mp3',
  reveal: '/sounds/reveal.mp3',
  gameStart: '/sounds/game-start.mp3',
  gameEnd: '/sounds/game-end.mp3',
};

export function playSound(sound: keyof typeof KYP_SOUNDS) {
  try {
    const audio = new Audio(KYP_SOUNDS[sound]);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Silently fail if audio can't play
    });
  } catch {
    // Audio not supported
  }
}

// ============================================
// Socket Event Types
// ============================================

export const KYP_SOCKET_EVENTS = {
  // Client -> Server
  JOIN_GAME: 'kyp:join',
  LEAVE_GAME: 'kyp:leave',
  SUBMIT_BET: 'kyp:bet',
  SUBMIT_ANSWER: 'kyp:answer',
  READY_NEXT: 'kyp:ready_next',
  
  // Server -> Client
  GAME_STATE: 'kyp:state',
  PARTNER_JOINED: 'kyp:partner_joined',
  PARTNER_LEFT: 'kyp:partner_left',
  PHASE_CHANGE: 'kyp:phase',
  TIMER_UPDATE: 'kyp:timer',
  BET_UPDATE: 'kyp:bet_update',
  ANSWER_UPDATE: 'kyp:answer_update',
  ROUND_RESULT: 'kyp:round_result',
  GAME_END: 'kyp:game_end',
} as const;
