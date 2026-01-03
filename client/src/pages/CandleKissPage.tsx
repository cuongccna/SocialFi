/**
 * Candle Kiss Game Page
 * High-risk co-op betting on BTC price movements
 * 
 * Features:
 * - Live BTC price from Binance WebSocket
 * - Lightweight-charts for candle visualization
 * - Consensus betting (both partners must agree)
 * - 30-second lock phase with visual tension
 * - Settlement: Win +80%, Lose -100%
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Lock, 
  AlertTriangle, Users, DollarSign, Check, X
} from 'lucide-react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import {
  type CandleKissSession,
  type BetDirection,
  type GamePhase,
  type BetProposal,
  startCandleKissSession,
  getCandleKissState,
  proposeBet,
  acceptBet,
  rejectBet,
  BinancePriceStream,
  playCandleSound,
  formatPrice,
  formatPriceChange,
  CANDLE_CONFIG,
  CANDLE_SOCKET_EVENTS,
} from '../services/candlekiss.service';

// Try to import haptics
let impactOccurred: ((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void) | null = null;
let notificationOccurred: ((type: 'error' | 'success' | 'warning') => void) | null = null;

try {
  const WebApp = window.Telegram?.WebApp;
  if (WebApp?.HapticFeedback) {
    impactOccurred = (style) => WebApp.HapticFeedback.impactOccurred(style);
    notificationOccurred = (type) => WebApp.HapticFeedback.notificationOccurred(type);
  }
} catch {
  // Haptics not available
}

// ============================================
// Price Display Component
// ============================================

function PriceDisplay({ 
  price, 
  entryPrice, 
  isLocked 
}: { 
  price: number; 
  entryPrice: number | null;
  isLocked: boolean;
}) {
  const priceChange = entryPrice ? formatPriceChange(entryPrice, price) : null;

  return (
    <div className="text-center">
      <div className="text-sm text-white/50 mb-1">BTC/USDT</div>
      <div className="text-3xl font-bold text-white font-mono">
        ${formatPrice(price)}
      </div>
      {isLocked && priceChange && (
        <motion.div
          className={`text-lg font-bold mt-1 ${
            priceChange.isPositive ? 'text-green-400' : 'text-red-400'
          }`}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {priceChange.percent}
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// Candle Chart Component
// ============================================

function CandleChart({ 
  onPriceUpdate 
}: { 
  onPriceUpdate: (price: number) => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const priceStreamRef = useRef<BinancePriceStream | null>(null);
  const candlesRef = useRef<CandlestickData<Time>[]>([]);
  const currentCandleRef = useRef<CandlestickData<Time> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    // Add candlestick series (lightweight-charts v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    seriesRef.current = candlestickSeries;

    // Connect to Binance
    const priceStream = new BinancePriceStream();
    priceStreamRef.current = priceStream;

    priceStream.connect((price) => {
      onPriceUpdate(price);
      
      // Update current candle
      const now = Math.floor(Date.now() / 1000);
      const candleTime = (now - (now % 5)) as Time; // 5-second candles
      
      if (!currentCandleRef.current || currentCandleRef.current.time !== candleTime) {
        // Start new candle
        if (currentCandleRef.current) {
          candlesRef.current.push(currentCandleRef.current);
          // Keep only last 50 candles
          if (candlesRef.current.length > 50) {
            candlesRef.current.shift();
          }
        }
        
        currentCandleRef.current = {
          time: candleTime,
          open: price,
          high: price,
          low: price,
          close: price,
        };
      } else {
        // Update current candle
        currentCandleRef.current = {
          ...currentCandleRef.current,
          high: Math.max(currentCandleRef.current.high, price),
          low: Math.min(currentCandleRef.current.low, price),
          close: price,
        };
      }

      // Update chart
      const allCandles = [...candlesRef.current];
      if (currentCandleRef.current) {
        allCandles.push(currentCandleRef.current);
      }
      candlestickSeries.setData(allCandles);
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      priceStream.disconnect();
      chart.remove();
    };
  }, [onPriceUpdate]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full h-[200px] rounded-xl overflow-hidden"
    />
  );
}

// ============================================
// Betting Buttons Component
// ============================================

function BettingButtons({
  onBull,
  onBear,
  disabled,
  myProposal,
}: {
  onBull: () => void;
  onBear: () => void;
  disabled: boolean;
  myProposal: BetDirection | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.button
        className={`relative py-6 rounded-2xl font-bold text-xl flex flex-col items-center gap-2 border-2 transition-all ${
          myProposal === 'BULL'
            ? 'bg-green-500 border-green-400 text-white'
            : disabled
            ? 'bg-green-500/20 border-green-500/30 text-green-300/50'
            : 'bg-green-500/30 border-green-500/50 text-green-300 hover:bg-green-500/50'
        }`}
        whileTap={disabled ? {} : { scale: 0.95 }}
        onClick={onBull}
        disabled={disabled}
      >
        <TrendingUp className="w-10 h-10" />
        <span>🟢 BULL</span>
        {myProposal === 'BULL' && (
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Check className="w-4 h-4 text-green-500" />
          </motion.div>
        )}
      </motion.button>

      <motion.button
        className={`relative py-6 rounded-2xl font-bold text-xl flex flex-col items-center gap-2 border-2 transition-all ${
          myProposal === 'BEAR'
            ? 'bg-red-500 border-red-400 text-white'
            : disabled
            ? 'bg-red-500/20 border-red-500/30 text-red-300/50'
            : 'bg-red-500/30 border-red-500/50 text-red-300 hover:bg-red-500/50'
        }`}
        whileTap={disabled ? {} : { scale: 0.95 }}
        onClick={onBear}
        disabled={disabled}
      >
        <TrendingDown className="w-10 h-10" />
        <span>🔴 BEAR</span>
        {myProposal === 'BEAR' && (
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Check className="w-4 h-4 text-red-500" />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}

// ============================================
// Partner Proposal Component
// ============================================

function PartnerProposal({
  proposal,
  partnerName,
  onAccept,
  onReject,
}: {
  proposal: BetProposal;
  partnerName: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isBull = proposal.direction === 'BULL';

  return (
    <motion.div
      className="bg-dark-card border border-white/10 rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center mb-4">
        <div className="text-white/60 mb-2">{partnerName} wants to go</div>
        <div className={`text-3xl font-bold ${isBull ? 'text-green-400' : 'text-red-400'}`}>
          {isBull ? '🟢 LONG (BULL)' : '🔴 SHORT (BEAR)'}
        </div>
        <div className="text-white/50 mt-2">Accept?</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.button
          className="py-4 bg-green-500/30 border border-green-500/50 rounded-xl font-bold text-green-300 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.95 }}
          onClick={onAccept}
        >
          <Check className="w-5 h-5" />
          Accept
        </motion.button>

        <motion.button
          className="py-4 bg-red-500/30 border border-red-500/50 rounded-xl font-bold text-red-300 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.95 }}
          onClick={onReject}
        >
          <X className="w-5 h-5" />
          Reject
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================
// Disagreement Modal
// ============================================

function DisagreementModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-dark-card border border-white/10 rounded-2xl p-8 mx-4 text-center max-w-sm"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Disagreement!</h2>
        <p className="text-white/60 mb-6">
          You and your partner have different views. Discuss your strategy first before betting!
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white"
        >
          Got It
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Lock Phase Component
// ============================================

function LockPhase({
  timeRemaining,
  direction,
  entryPrice,
  currentPrice,
  stake,
}: {
  timeRemaining: number;
  direction: BetDirection;
  entryPrice: number;
  currentPrice: number;
  stake: number;
}) {
  const isBull = direction === 'BULL';
  const priceUp = currentPrice > entryPrice;
  const isWinning = (isBull && priceUp) || (!isBull && !priceUp);
  
  // Play tick sound
  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0) {
      playCandleSound('tick');
    }
  }, [timeRemaining]);

  return (
    <motion.div
      className={`rounded-2xl p-6 border-2 ${
        isWinning 
          ? 'bg-green-500/20 border-green-500/50' 
          : 'bg-red-500/20 border-red-500/50'
      }`}
      animate={isWinning ? {} : { 
        backgroundColor: ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.4)', 'rgba(239,68,68,0.2)']
      }}
      transition={{ repeat: Infinity, duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-white/70" />
          <span className="text-white/70">Position Locked</span>
        </div>
        <div className={`flex items-center gap-1 ${isBull ? 'text-green-400' : 'text-red-400'}`}>
          {isBull ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          <span className="font-bold">{isBull ? 'LONG' : 'SHORT'}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="text-center mb-4">
        <div className="text-white/50 text-sm mb-1">Settlement in</div>
        <motion.div
          className={`text-5xl font-bold font-mono ${
            timeRemaining <= 10 ? 'text-red-400' : 'text-white'
          }`}
          animate={timeRemaining <= 10 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {timeRemaining}s
        </motion.div>
      </div>

      {/* Entry vs Current */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-white/50 text-xs">Entry Price</div>
          <div className="text-white font-mono">${formatPrice(entryPrice)}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Current</div>
          <div className={`font-mono ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
            ${formatPrice(currentPrice)}
          </div>
        </div>
      </div>

      {/* Potential outcome */}
      <div className={`mt-4 text-center py-2 rounded-xl ${
        isWinning ? 'bg-green-500/30' : 'bg-red-500/30'
      }`}>
        <span className="text-white/70">If settled now: </span>
        <span className={`font-bold ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
          {isWinning ? `+${(stake * 0.8).toFixed(0)}` : `-${stake}`} $LOVE
        </span>
      </div>
    </motion.div>
  );
}

// ============================================
// Settlement Result Component
// ============================================

function SettlementResult({
  won,
  payout,
  entryPrice,
  exitPrice,
  onPlayAgain,
  onExit,
}: {
  won: boolean;
  payout: number;
  entryPrice: number;
  exitPrice: number;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  useEffect(() => {
    playCandleSound(won ? 'win' : 'lose');
    notificationOccurred?.(won ? 'success' : 'error');
  }, [won]);

  const priceChange = formatPriceChange(entryPrice, exitPrice);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Background */}
      <motion.div
        className={`absolute inset-0 ${
          won 
            ? 'bg-gradient-to-b from-green-900/90 to-dark/95' 
            : 'bg-gradient-to-b from-red-900/90 to-dark/95'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center p-8"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {/* Icon */}
        <motion.div
          className="text-8xl mb-6"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: won ? [0, 10, -10, 0] : [0, -5, 5, 0]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {won ? '🚀' : '📉'}
        </motion.div>

        {/* Title */}
        <h1 className={`text-4xl font-black mb-4 ${won ? 'text-green-400' : 'text-red-400'}`}>
          {won ? 'TO THE MOON!' : 'REKT together...'}
        </h1>

        {/* Payout */}
        <motion.div
          className={`text-6xl font-black mb-6 ${won ? 'text-green-300' : 'text-red-300'}`}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          {won ? '+' : ''}{payout.toFixed(0)} $LOVE
        </motion.div>

        {/* Price details */}
        <div className="bg-dark/50 rounded-xl p-4 mb-8 inline-block">
          <div className="text-white/60 text-sm mb-2">Price Change</div>
          <div className={`text-2xl font-bold ${priceChange.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {priceChange.percent}
          </div>
          <div className="text-white/50 text-xs mt-1">
            ${formatPrice(entryPrice)} → ${formatPrice(exitPrice)}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <motion.button
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white text-lg"
            whileTap={{ scale: 0.95 }}
            onClick={onPlayAgain}
          >
            Play Again 🎮
          </motion.button>
          <button
            onClick={onExit}
            className="w-full py-3 text-white/60 hover:text-white"
          >
            Exit to Games
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Main Game Page Component
// ============================================

export default function CandleKissPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get partner info from location state (from GameHubPage)
  const locationState = location.state as { 
    sessionId?: string;
    partner?: { 
      id: string; 
      displayName: string; 
      avatarUrl: string | null;
      relationshipId: string;
    };
  } | null;

  const relationshipId = locationState?.partner?.relationshipId || searchParams.get('relationship_id');
  const sessionIdParam = locationState?.sessionId || searchParams.get('session_id');
  const partnerFromState = locationState?.partner;

  // Partner display info
  const partnerDisplayName = partnerFromState?.displayName || 'Partner';
  const partnerAvatarUrl = partnerFromState?.avatarUrl;

  // Game state
  const [session, setSession] = useState<CandleKissSession | null>(null);
  const [phase, setPhase] = useState<GamePhase>('WAITING');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [stake, setStake] = useState(CANDLE_CONFIG.DEFAULT_STAKE);
  const [myProposal, setMyProposal] = useState<BetDirection | null>(null);
  const [partnerProposal, setPartnerProposal] = useState<BetProposal | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(CANDLE_CONFIG.LOCK_DURATION_SECONDS);
  const [showDisagreement, setShowDisagreement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement result
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{
    won: boolean;
    payout: number;
    entryPrice: number;
    exitPrice: number;
  } | null>(null);

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Socket connection
  const { socket } = useSocket({
    conversationId: session?.id,
  });

  // Socket event handlers
  useEffect(() => {
    if (!socket || !session?.id) return;

    socket.emit(CANDLE_SOCKET_EVENTS.JOIN_ROOM, { 
      session_id: session.id,
      user_id: user?.id
    });

    // Partner proposed a bet
    const handleBetProposed = (data: BetProposal) => {
      if (data.proposer_id !== user?.id) {
        setPartnerProposal(data);
        setPhase('PROPOSING');
        playCandleSound('propose');
        impactOccurred?.('medium');
      }
    };

    // Bet was accepted - enter lock phase
    const handleBetAccepted = (data: { 
      session: CandleKissSession;
      entry_price: number;
    }) => {
      setSession(data.session);
      setPhase('LOCKED');
      setTimeRemaining(CANDLE_CONFIG.LOCK_DURATION_SECONDS);
      playCandleSound('accept');
      notificationOccurred?.('success');
      
      // Start countdown
      startCountdown();
    };

    // Bet was rejected
    const handleBetRejected = () => {
      setMyProposal(null);
      setPartnerProposal(null);
      setPhase('WAITING');
      setShowDisagreement(true);
      playCandleSound('reject');
      impactOccurred?.('heavy');
    };

    // Game settled
    const handleGameSettled = (data: {
      won: boolean;
      payout: number;
      entry_price: number;
      exit_price: number;
    }) => {
      setPhase('SETTLED');
      setResult({
        won: data.won,
        payout: data.payout,
        entryPrice: data.entry_price,
        exitPrice: data.exit_price,
      });
      setShowResult(true);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    socket.on(CANDLE_SOCKET_EVENTS.BET_PROPOSED, handleBetProposed);
    socket.on(CANDLE_SOCKET_EVENTS.BET_ACCEPTED, handleBetAccepted);
    socket.on(CANDLE_SOCKET_EVENTS.BET_REJECTED, handleBetRejected);
    socket.on(CANDLE_SOCKET_EVENTS.GAME_SETTLED, handleGameSettled);

    return () => {
      socket.emit(CANDLE_SOCKET_EVENTS.LEAVE_ROOM, { session_id: session.id });
      socket.off(CANDLE_SOCKET_EVENTS.BET_PROPOSED);
      socket.off(CANDLE_SOCKET_EVENTS.BET_ACCEPTED);
      socket.off(CANDLE_SOCKET_EVENTS.BET_REJECTED);
      socket.off(CANDLE_SOCKET_EVENTS.GAME_SETTLED);
    };
  }, [socket, session?.id, user?.id]);

  // Initialize game
  useEffect(() => {
    initGame();
  }, [relationshipId, sessionIdParam]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const initGame = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Always prioritize starting with relationshipId (like KYP game)
      if (relationshipId) {
        const result = await startCandleKissSession(relationshipId, stake);
        setSession(result.session);
        // current_price comes from session object in response
        if ('current_price' in result.session) {
          setCurrentPrice((result.session as unknown as { current_price: number }).current_price || 0);
        }
        console.log('Candle Kiss session started/joined:', result.session, 'joined:', result.joined);
        
        // If joined existing game in LOCKED phase
        if (result.session.phase === 'LOCKED' && result.session.lock_start_time) {
          setPhase('LOCKED');
          const lockStart = new Date(result.session.lock_start_time).getTime();
          const elapsed = Math.floor((Date.now() - lockStart) / 1000);
          const remaining = Math.max(0, CANDLE_CONFIG.LOCK_DURATION_SECONDS - elapsed);
          setTimeRemaining(remaining);
          if (remaining > 0) startCountdown();
        }
      } else if (sessionIdParam) {
        // Only use sessionId if no relationshipId (for rejoining)
        try {
          const state = await getCandleKissState(sessionIdParam);
          setSession(state.session);
          setCurrentPrice(state.current_price);
          setPhase(state.session.phase);
          
          if (state.session.phase === 'LOCKED' && state.session.lock_start_time) {
            const lockStart = new Date(state.session.lock_start_time).getTime();
            const elapsed = Math.floor((Date.now() - lockStart) / 1000);
            const remaining = Math.max(0, CANDLE_CONFIG.LOCK_DURATION_SECONDS - elapsed);
            setTimeRemaining(remaining);
            if (remaining > 0) startCountdown();
          }
        } catch (stateErr) {
          console.error('Candle Kiss session not found, expired:', stateErr);
          setError('Session expired. Please start a new game.');
        }
      } else {
        throw new Error('No relationship or session ID provided');
      }
    } catch (err) {
      console.error('Failed to init game:', err);
      setError('Failed to start game session');
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleProposeBet = async (direction: BetDirection) => {
    if (!session || phase !== 'WAITING') return;

    try {
      setMyProposal(direction);
      impactOccurred?.('medium');
      playCandleSound('propose');

      // Send proposal via socket
      socket?.emit(CANDLE_SOCKET_EVENTS.PROPOSE_BET, {
        session_id: session.id,
        direction,
        user_id: user?.id,
        user_name: user?.display_name,
      });

      // Also call API as fallback
      await proposeBet(session.id, direction);
    } catch (err) {
      console.error('Failed to propose bet:', err);
      setMyProposal(null);
    }
  };

  const handleAcceptBet = async () => {
    if (!session || !partnerProposal) return;

    try {
      impactOccurred?.('heavy');
      
      // Accept via socket
      socket?.emit(CANDLE_SOCKET_EVENTS.ACCEPT_BET, {
        session_id: session.id,
        user_id: user?.id,
        current_price: currentPrice,
      });

      // Also call API
      await acceptBet(session.id);
    } catch (err) {
      console.error('Failed to accept bet:', err);
    }
  };

  const handleRejectBet = async () => {
    if (!session || !partnerProposal) return;

    try {
      impactOccurred?.('medium');
      
      // Reject via socket
      socket?.emit(CANDLE_SOCKET_EVENTS.REJECT_BET, {
        session_id: session.id,
        user_id: user?.id,
      });

      // Also call API
      await rejectBet(session.id);
      
      setPartnerProposal(null);
      setShowDisagreement(true);
    } catch (err) {
      console.error('Failed to reject bet:', err);
    }
  };

  const handlePriceUpdate = useCallback((price: number) => {
    setCurrentPrice(price);
  }, []);

  const handlePlayAgain = () => {
    setShowResult(false);
    setResult(null);
    setPhase('WAITING');
    setMyProposal(null);
    setPartnerProposal(null);
    setTimeRemaining(CANDLE_CONFIG.LOCK_DURATION_SECONDS);
    initGame();
  };

  const handleExit = () => {
    navigate('/games');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div
          className="text-4xl"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        >
          🕯️
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-white/60 text-center mb-6">{error}</p>
        <button
          onClick={() => navigate('/games')}
          className="px-6 py-3 bg-purple-600 rounded-xl font-bold text-white"
        >
          Back to Games
        </button>
      </div>
    );
  }

  // Dynamic background based on phase and price
  const getBackgroundClass = () => {
    if (phase !== 'LOCKED' || !session?.entry_price) {
      return 'bg-gradient-to-b from-dark via-purple-900/20 to-dark';
    }
    
    const isWinning = session.direction === 'BULL' 
      ? currentPrice > session.entry_price 
      : currentPrice < session.entry_price;
    
    return isWinning 
      ? 'bg-gradient-to-b from-green-900/30 via-dark to-dark' 
      : 'bg-gradient-to-b from-red-900/30 via-dark to-dark';
  };

  return (
    <div className={`min-h-screen ${getBackgroundClass()} transition-colors duration-500`}>
      {/* Disagreement Modal */}
      <AnimatePresence>
        <DisagreementModal show={showDisagreement} onClose={() => setShowDisagreement(false)} />
      </AnimatePresence>

      {/* Settlement Result */}
      <AnimatePresence>
        {showResult && result && (
          <SettlementResult
            won={result.won}
            payout={result.payout}
            entryPrice={result.entryPrice}
            exitPrice={result.exitPrice}
            onPlayAgain={handlePlayAgain}
            onExit={handleExit}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="safe-top px-4 py-3 flex items-center justify-between border-b border-white/10">
        <button
          onClick={handleExit}
          className="p-2 rounded-xl bg-dark-card border border-white/10"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">🕯️ Candle Kiss</h1>
          <p className="text-xs text-white/50">with {partnerDisplayName}</p>
        </div>

        <div className="flex items-center gap-1 px-3 py-1 bg-pink-600/30 rounded-full">
          {partnerAvatarUrl ? (
            <img src={partnerAvatarUrl} className="w-5 h-5 rounded-full" alt="" />
          ) : (
            <Users className="w-4 h-4 text-pink-400" />
          )}
          <span className="text-sm text-white font-medium">x2</span>
        </div>
      </div>

      {/* Price Display */}
      <div className="px-4 py-4">
        <PriceDisplay 
          price={currentPrice} 
          entryPrice={session?.entry_price || null}
          isLocked={phase === 'LOCKED'}
        />
      </div>

      {/* Chart */}
      <div className="px-4 mb-4">
        <div className="bg-dark-card border border-white/10 rounded-xl p-2">
          <CandleChart onPriceUpdate={handlePriceUpdate} />
        </div>
      </div>

      {/* Stake Amount (only in waiting phase) */}
      {phase === 'WAITING' && (
        <div className="px-4 mb-4">
          <div className="bg-dark-card border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60">Stake Amount</span>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-pink-400" />
                <span className="text-lg font-bold text-white">{stake} $LOVE</span>
              </div>
            </div>
            <input
              type="range"
              min={CANDLE_CONFIG.MIN_STAKE}
              max={CANDLE_CONFIG.MAX_STAKE}
              step={10}
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>{CANDLE_CONFIG.MIN_STAKE}</span>
              <span>{CANDLE_CONFIG.MAX_STAKE}</span>
            </div>
          </div>
        </div>
      )}

      {/* Game Content */}
      <div className="px-4 space-y-4">
        {/* Waiting Phase - Betting Buttons */}
        {phase === 'WAITING' && !partnerProposal && (
          <>
            <div className="text-center text-white/60 text-sm mb-2">
              {myProposal 
                ? `Waiting for partner to accept your ${myProposal} proposal...`
                : 'Choose your direction'}
            </div>
            <BettingButtons
              onBull={() => handleProposeBet('BULL')}
              onBear={() => handleProposeBet('BEAR')}
              disabled={myProposal !== null}
              myProposal={myProposal}
            />
          </>
        )}

        {/* Partner Proposal */}
        {phase === 'PROPOSING' && partnerProposal && (
          <PartnerProposal
            proposal={partnerProposal}
            partnerName={partnerDisplayName}
            onAccept={handleAcceptBet}
            onReject={handleRejectBet}
          />
        )}

        {/* Lock Phase */}
        {phase === 'LOCKED' && session?.direction && session?.entry_price && (
          <LockPhase
            timeRemaining={timeRemaining}
            direction={session.direction}
            entryPrice={session.entry_price}
            currentPrice={currentPrice}
            stake={session.stake_amount}
          />
        )}
      </div>

      {/* Bottom Info */}
      <div className="px-4 py-6 mt-auto">
        <div className="text-center text-xs text-white/30">
          Win: +80% stake • Lose: -100% stake
        </div>
      </div>
    </div>
  );
}
