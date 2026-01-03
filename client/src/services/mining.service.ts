/**
 * Mining Game Service
 * Handles API calls for the Love Mining Rig game
 */

import { api } from '../api/axiosClient';

// ============================================
// Types
// ============================================

export interface MiningSession {
  id: string;
  relationship_id: string;
  player_a_id: string;
  player_b_id: string;
  total_love_mined: number;
  sync_combos: number;
  created_at: string;
}

export interface MiningState {
  session: MiningSession | null;
  my_stamina: number;
  partner_stamina: number;
  my_taps: number;
  partner_taps: number;
  total_love: number;
  sync_combo_active: boolean;
  sync_multiplier: number;
  rock_size: number; // 1.0 base, grows with sync
}

export interface TapBatch {
  session_id: string;
  tap_count: number;
  timestamp: number;
}

export interface TapResult {
  success: boolean;
  love_earned: number;
  sync_triggered: boolean;
  sync_multiplier: number;
  new_stamina: number;
  partner_synced: boolean;
}

export interface StaminaUpdate {
  user_id: string;
  stamina: number;
}

// ============================================
// Socket Events
// ============================================

export const MINING_SOCKET_EVENTS = {
  JOIN_ROOM: 'mining:join',
  LEAVE_ROOM: 'mining:leave',
  SUBMIT_TAPS: 'mining:submit_taps',
  TAP_RESULT: 'mining:tap_result',
  SYNC_COMBO: 'mining:sync_combo',
  STAMINA_UPDATE: 'mining:stamina_update',
  PARTNER_TAPS: 'mining:partner_taps',
  GAME_STATE: 'mining:state',
};

// ============================================
// Configuration
// ============================================

export const MINING_CONFIG = {
  MAX_STAMINA: 100,
  STAMINA_PER_TAP: 1,
  STAMINA_PER_MESSAGE: 10,
  LOVE_PER_TAP: 0.1,
  SYNC_WINDOW_MS: 500, // Timestamps within 500ms = sync
  SYNC_MULTIPLIER: 2,
  BATCH_INTERVAL_MS: 1000, // Emit taps every 1 second
  ROCK_GROWTH_PER_SYNC: 0.1, // Rock grows 10% per sync
  MAX_ROCK_SIZE: 2.0,
};

// ============================================
// API Functions
// ============================================

/**
 * Start a new mining session with partner
 */
export async function startMiningSession(relationshipId: string): Promise<{
  session: MiningSession;
  stamina: number;
}> {
  return api.post('/games/mining/start', {
    relationship_id: relationshipId,
  });
}

/**
 * Join an existing mining session
 */
export async function joinMiningSession(sessionId: string): Promise<{
  session: MiningSession;
  stamina: number;
}> {
  return api.post('/games/mining/join', {
    session_id: sessionId,
  });
}

/**
 * Get current mining state
 */
export async function getMiningState(sessionId: string): Promise<MiningState> {
  return api.get(`/games/mining/state/${sessionId}`);
}

/**
 * Submit tap batch (called by socket, but also has REST fallback)
 */
export async function submitTaps(batch: TapBatch): Promise<TapResult> {
  return api.post('/games/mining/taps', batch);
}

/**
 * Get user's current stamina
 */
export async function getStamina(): Promise<{ stamina: number }> {
  return api.get('/games/mining/stamina');
}

/**
 * End mining session
 */
export async function endMiningSession(sessionId: string): Promise<{
  total_love_mined: number;
  sync_combos: number;
  love_earned: number;
}> {
  return api.post('/games/mining/end', {
    session_id: sessionId,
  });
}

// ============================================
// Sound Effects
// ============================================

export function playMiningSound(type: 'tap' | 'sync' | 'empty') {
  // Create audio context for sound effects
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'tap':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
      case 'sync':
        oscillator.frequency.value = 1200;
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'empty':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
    }
  } catch {
    // Audio not supported
  }
}
