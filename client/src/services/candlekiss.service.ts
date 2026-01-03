/**
 * Candle Kiss Game Service
 * High-risk co-op betting on BTC price movements
 */

import { api } from '../api/axiosClient';

// ============================================
// Types
// ============================================

export type BetDirection = 'BULL' | 'BEAR';
export type GamePhase = 'WAITING' | 'PROPOSING' | 'LOCKED' | 'SETTLED';

export interface CandleKissSession {
  id: string;
  relationship_id: string;
  player_a_id: string;
  player_b_id: string;
  stake_amount: number;
  direction: BetDirection | null;
  entry_price: number | null;
  exit_price: number | null;
  phase: GamePhase;
  proposer_id: string | null;
  proposed_direction: BetDirection | null;
  lock_start_time: string | null;
  settled: boolean;
  won: boolean | null;
  payout: number | null;
  created_at: string;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface BetProposal {
  session_id: string;
  proposer_id: string;
  proposer_name: string;
  direction: BetDirection;
}

export interface BetResult {
  won: boolean;
  entry_price: number;
  exit_price: number;
  payout: number;
  price_change_percent: number;
}

// ============================================
// Socket Events
// ============================================

export const CANDLE_SOCKET_EVENTS = {
  JOIN_ROOM: 'candle:join',
  LEAVE_ROOM: 'candle:leave',
  PROPOSE_BET: 'candle:propose',
  ACCEPT_BET: 'candle:accept',
  REJECT_BET: 'candle:reject',
  BET_PROPOSED: 'candle:bet_proposed',
  BET_ACCEPTED: 'candle:bet_accepted',
  BET_REJECTED: 'candle:bet_rejected',
  BET_LOCKED: 'candle:locked',
  PRICE_UPDATE: 'candle:price',
  GAME_SETTLED: 'candle:settled',
  GAME_STATE: 'candle:state',
};

// ============================================
// Configuration
// ============================================

export const CANDLE_CONFIG = {
  LOCK_DURATION_SECONDS: 30,
  WIN_MULTIPLIER: 1.8, // +80% on win
  MIN_STAKE: 10,
  MAX_STAKE: 1000,
  DEFAULT_STAKE: 50,
  BINANCE_WS_URL: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
  BINANCE_KLINE_WS_URL: 'wss://stream.binance.com:9443/ws/btcusdt@kline_1s',
};

// ============================================
// API Functions
// ============================================

/**
 * Start a new Candle Kiss session
 * If a session already exists with this partner, it will join that session instead
 */
export async function startCandleKissSession(
  relationshipId: string,
  stakeAmount: number
): Promise<{ session: CandleKissSession; joined?: boolean }> {
  return api.post('/games/candle/start', {
    relationship_id: relationshipId,
    stake_amount: stakeAmount,
  });
}

/**
 * Join an existing session
 */
export async function joinCandleKissSession(
  sessionId: string
): Promise<{ session: CandleKissSession }> {
  return api.post('/games/candle/join', {
    session_id: sessionId,
  });
}

/**
 * Get session state
 */
export async function getCandleKissState(
  sessionId: string
): Promise<{ session: CandleKissSession; current_price: number }> {
  return api.get(`/games/candle/state/${sessionId}`);
}

/**
 * Propose a bet direction
 */
export async function proposeBet(
  sessionId: string,
  direction: BetDirection
): Promise<{ success: boolean; session: CandleKissSession }> {
  return api.post('/games/candle/propose', {
    session_id: sessionId,
    direction,
  });
}

/**
 * Accept partner's bet proposal
 */
export async function acceptBet(
  sessionId: string
): Promise<{ success: boolean; session: CandleKissSession }> {
  return api.post('/games/candle/accept', {
    session_id: sessionId,
  });
}

/**
 * Reject partner's bet proposal
 */
export async function rejectBet(
  sessionId: string
): Promise<{ success: boolean }> {
  return api.post('/games/candle/reject', {
    session_id: sessionId,
  });
}

/**
 * Get game result
 */
export async function getGameResult(
  sessionId: string
): Promise<{ result: BetResult }> {
  return api.get(`/games/candle/result/${sessionId}`);
}

// ============================================
// Binance WebSocket Connection
// ============================================

export class BinancePriceStream {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onPriceUpdate: ((price: number) => void) | null = null;
  private onCandleUpdate: ((candle: CandleData) => void) | null = null;

  connect(
    onPrice: (price: number) => void,
    onCandle?: (candle: CandleData) => void
  ) {
    this.onPriceUpdate = onPrice;
    this.onCandleUpdate = onCandle || null;
    this.initWebSocket();
  }

  private initWebSocket() {
    try {
      // Use combined stream for both trade and kline data
      this.ws = new WebSocket(CANDLE_CONFIG.BINANCE_WS_URL);

      this.ws.onopen = () => {
        console.log('🔌 Binance WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Trade data
          if (data.e === 'trade') {
            const price = parseFloat(data.p);
            this.onPriceUpdate?.(price);
          }
          
          // Kline data
          if (data.e === 'kline' && data.k) {
            const k = data.k;
            const candle: CandleData = {
              time: Math.floor(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
            };
            this.onCandleUpdate?.(candle);
          }
          
          // Simple price from trade stream
          if (data.p) {
            const price = parseFloat(data.p);
            this.onPriceUpdate?.(price);
          }
        } catch (err) {
          console.error('Failed to parse Binance data:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Binance WebSocket closed');
        this.attemptReconnect();
      };
    } catch (err) {
      console.error('Failed to create Binance WebSocket:', err);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting to Binance (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.initWebSocket(), 2000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================
// Sound Effects
// ============================================

export function playCandleSound(type: 'propose' | 'accept' | 'reject' | 'win' | 'lose' | 'tick') {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'propose':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.15;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'accept':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'reject':
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.15;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'win':
        oscillator.frequency.value = 1000;
        gainNode.gain.value = 0.25;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'lose':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'tick':
        oscillator.frequency.value = 500;
        gainNode.gain.value = 0.05;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.03);
        break;
    }
  } catch {
    // Audio not supported
  }
}

// ============================================
// Utility Functions
// ============================================

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPriceChange(entryPrice: number, currentPrice: number): {
  percent: string;
  isPositive: boolean;
} {
  const change = ((currentPrice - entryPrice) / entryPrice) * 100;
  return {
    percent: `${change >= 0 ? '+' : ''}${change.toFixed(3)}%`,
    isPositive: change >= 0,
  };
}
