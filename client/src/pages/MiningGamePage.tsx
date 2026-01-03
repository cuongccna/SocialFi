/**
 * Love Mining Rig - Co-op Tapper Game
 * 
 * Features:
 * - Tap batching (emit every 1 second)
 * - Sync combo when partners tap together (within 500ms)
 * - Stamina system (recharge via chat)
 * - Haptic feedback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { 
  ArrowLeft, Zap, Battery, MessageCircle, 
  Sparkles, Heart, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import {
  type MiningSession,
  type TapResult,
  startMiningSession,
  getMiningState,
  MINING_SOCKET_EVENTS,
  MINING_CONFIG,
  playMiningSound,
} from '../services/mining.service';

// Try to import haptics from telegram web app
let impactOccurred: ((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void) | null = null;
let notificationOccurred: ((type: 'error' | 'success' | 'warning') => void) | null = null;

try {
  // Dynamic import for haptics
  const WebApp = window.Telegram?.WebApp;
  if (WebApp?.HapticFeedback) {
    impactOccurred = (style) => WebApp.HapticFeedback.impactOccurred(style);
    notificationOccurred = (type) => WebApp.HapticFeedback.notificationOccurred(type);
  }
} catch {
  // Haptics not available
}

// ============================================
// Stamina Bar Component
// ============================================

function StaminaBar({ current, max }: { current: number; max: number }) {
  const percentage = (current / max) * 100;
  const isLow = percentage <= 20;
  const isEmpty = current === 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Battery className={`w-4 h-4 ${isLow ? 'text-red-400' : 'text-green-400'}`} />
          <span className="text-xs text-white/70">Stamina</span>
        </div>
        <span className={`text-xs font-bold ${isLow ? 'text-red-400' : 'text-green-400'}`}>
          {current}/{max}
        </span>
      </div>
      <div className="h-3 bg-dark-lighter rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={`h-full rounded-full ${
            isEmpty ? 'bg-red-500' : isLow ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
    </div>
  );
}

// ============================================
// Mining Rock Component
// ============================================

function MiningRock({ 
  scale, 
  onTap, 
  disabled, 
  syncActive 
}: { 
  scale: number; 
  onTap: () => void; 
  disabled: boolean;
  syncActive: boolean;
}) {
  const controls = useAnimation();

  const handleTap = async () => {
    if (disabled) return;
    
    // Shake animation on tap
    await controls.start({
      scale: [scale, scale * 0.95, scale * 1.02, scale],
      rotate: [0, -2, 2, 0],
      transition: { duration: 0.15 }
    });
    
    onTap();
  };

  return (
    <motion.div
      className="relative cursor-pointer select-none"
      animate={controls}
      initial={{ scale }}
      whileTap={disabled ? {} : { scale: scale * 0.95 }}
      onClick={handleTap}
    >
      {/* Sync glow effect */}
      {syncActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          style={{ filter: 'blur(30px)' }}
        />
      )}

      {/* The Rock */}
      <div 
        className={`relative w-48 h-48 ${disabled ? 'opacity-50 grayscale' : ''}`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Base rock gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-violet-700 shadow-2xl">
          {/* Crystal patterns */}
          <div className="absolute inset-4 rounded-xl bg-gradient-to-tr from-pink-400/30 to-transparent" />
          <div className="absolute top-6 left-6 w-8 h-8 rounded-lg bg-white/20 rotate-45" />
          <div className="absolute bottom-8 right-8 w-6 h-6 rounded-lg bg-white/15 rotate-12" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16">
            {/* Heart center */}
            <Heart className="w-full h-full text-white/40 fill-white/20" />
          </div>
        </div>

        {/* Sparkle effects */}
        <motion.div
          className="absolute top-2 right-4"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Sparkles className="w-6 h-6 text-yellow-300" />
        </motion.div>
        <motion.div
          className="absolute bottom-4 left-2"
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
        >
          <Sparkles className="w-4 h-4 text-pink-300" />
        </motion.div>
      </div>

      {/* Tap instruction */}
      {!disabled && (
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-white/50"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          TAP TO MINE ⛏️
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// Sync Combo Overlay
// ============================================

function SyncComboOverlay({ show, multiplier }: { show: boolean; multiplier: number }) {
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Gold flash */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-yellow-400/30 to-amber-500/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.5 }}
      />

      {/* Sync text */}
      <motion.div
        className="text-center"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.2, 1], rotate: [0, 5, 0] }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 drop-shadow-lg">
          ⚡ SYNC COMBO ⚡
        </div>
        <div className="text-6xl font-black text-white mt-2 drop-shadow-lg">
          x{multiplier}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Empty Stamina Overlay
// ============================================

function EmptyStaminaOverlay({ show, onGoChat }: { show: boolean; onGoChat: () => void }) {
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-dark-card border border-white/10 rounded-2xl p-8 mx-4 text-center max-w-sm"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🔋</div>
        <h2 className="text-2xl font-bold text-white mb-2">Battery Low!</h2>
        <p className="text-white/60 mb-6">
          Your mining stamina is depleted. Chat with your partner to recharge!
        </p>
        <p className="text-sm text-green-400 mb-6">
          💬 Each message = +10 Stamina
        </p>
        <button
          onClick={onGoChat}
          className="w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-white flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Go Chat to Recharge
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Tap Particle Effect
// ============================================

function TapParticle({ x, y, value }: { x: number; y: number; value: number }) {
  return (
    <motion.div
      className="fixed pointer-events-none z-30 text-lg font-bold text-yellow-400"
      style={{ left: x, top: y }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -50, scale: 1.5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      +{value.toFixed(1)} 💎
    </motion.div>
  );
}

// ============================================
// Main Mining Game Page
// ============================================

export default function MiningGamePage() {
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
  const sessionId = locationState?.sessionId || searchParams.get('session_id');
  const partnerFromState = locationState?.partner;

  // Partner display info
  const partnerDisplayName = partnerFromState?.displayName || 'Partner';
  const partnerAvatarUrl = partnerFromState?.avatarUrl;

  // Game state
  const [session, setSession] = useState<MiningSession | null>(null);
  const [stamina, setStamina] = useState(MINING_CONFIG.MAX_STAMINA);
  const [, setPartnerStamina] = useState(0);
  const [totalLove, setTotalLove] = useState(0);
  const [myTaps, setMyTaps] = useState(0);
  const [partnerTaps, setPartnerTaps] = useState(0);
  const [rockSize, setRockSize] = useState(1.0);
  const [syncActive, setSyncActive] = useState(false);
  const [syncCombos, setSyncCombos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tap batching state
  const pendingTaps = useRef(0);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBatchTime = useRef(Date.now());

  // Tap particles
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; value: number }>>([]);
  const particleId = useRef(0);

  // Socket connection
  const { socket } = useSocket({
    conversationId: session?.id,
  });

  // Setup socket listeners
  useEffect(() => {
    if (!socket || !session?.id) return;

    socket.emit(MINING_SOCKET_EVENTS.JOIN_ROOM, { 
      session_id: session.id,
      user_id: user?.id
    });

    const handleTapResult = (data: TapResult) => {
      setTotalLove(prev => prev + data.love_earned);
      setStamina(data.new_stamina);
      
      if (data.sync_triggered) {
        triggerSyncCombo(data.sync_multiplier);
      }
    };

    const handleSyncCombo = (data: { multiplier: number }) => {
      triggerSyncCombo(data.multiplier);
    };

    const handlePartnerTaps = (data: { tap_count: number; total: number }) => {
      setPartnerTaps(data.total);
    };

    const handleStaminaUpdate = (data: { user_id: string; stamina: number }) => {
      if (data.user_id !== user?.id) {
        setPartnerStamina(data.stamina);
      }
    };

    const handleGameState = (data: { 
      total_love: number; 
      my_taps: number; 
      partner_taps: number;
      rock_size: number;
      sync_combos: number;
    }) => {
      setTotalLove(data.total_love);
      setMyTaps(data.my_taps);
      setPartnerTaps(data.partner_taps);
      setRockSize(data.rock_size);
      setSyncCombos(data.sync_combos);
    };

    socket.on(MINING_SOCKET_EVENTS.TAP_RESULT, handleTapResult);
    socket.on(MINING_SOCKET_EVENTS.SYNC_COMBO, handleSyncCombo);
    socket.on(MINING_SOCKET_EVENTS.PARTNER_TAPS, handlePartnerTaps);
    socket.on(MINING_SOCKET_EVENTS.STAMINA_UPDATE, handleStaminaUpdate);
    socket.on(MINING_SOCKET_EVENTS.GAME_STATE, handleGameState);

    return () => {
      socket.emit(MINING_SOCKET_EVENTS.LEAVE_ROOM, { session_id: session.id });
      socket.off(MINING_SOCKET_EVENTS.TAP_RESULT);
      socket.off(MINING_SOCKET_EVENTS.SYNC_COMBO);
      socket.off(MINING_SOCKET_EVENTS.PARTNER_TAPS);
      socket.off(MINING_SOCKET_EVENTS.STAMINA_UPDATE);
      socket.off(MINING_SOCKET_EVENTS.GAME_STATE);
    };
  }, [socket, session?.id, user?.id]);

  // Initialize game
  useEffect(() => {
    initGame();
  }, [relationshipId, sessionId]);

  // Setup tap batch timer
  useEffect(() => {
    batchTimerRef.current = setInterval(() => {
      flushTapBatch();
    }, MINING_CONFIG.BATCH_INTERVAL_MS);

    return () => {
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
      }
      // Flush remaining taps on unmount
      flushTapBatch();
    };
  }, [session?.id]);

  const initGame = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (sessionId) {
        // Join existing session
        const state = await getMiningState(sessionId);
        setSession(state.session);
        setStamina(state.my_stamina);
        setPartnerStamina(state.partner_stamina);
        setTotalLove(state.total_love);
        setRockSize(state.rock_size);
      } else if (relationshipId) {
        // Start new session
        const result = await startMiningSession(relationshipId);
        setSession(result.session);
        setStamina(result.stamina);
      } else {
        throw new Error('No relationship or session ID provided');
      }
    } catch (err) {
      console.error('Failed to init mining game:', err);
      setError('Failed to start mining session');
    } finally {
      setIsLoading(false);
    }
  };

  const flushTapBatch = useCallback(() => {
    if (pendingTaps.current > 0 && socket && session?.id) {
      const batch = {
        session_id: session.id,
        tap_count: pendingTaps.current,
        timestamp: Date.now(),
        user_id: user?.id,
      };
      
      socket.emit(MINING_SOCKET_EVENTS.SUBMIT_TAPS, batch);
      
      setMyTaps(prev => prev + pendingTaps.current);
      pendingTaps.current = 0;
      lastBatchTime.current = Date.now();
    }
  }, [socket, session?.id, user?.id]);

  const triggerSyncCombo = (_multiplier: number) => {
    setSyncActive(true);
    setSyncCombos(prev => prev + 1);
    setRockSize(prev => Math.min(prev + MINING_CONFIG.ROCK_GROWTH_PER_SYNC, MINING_CONFIG.MAX_ROCK_SIZE));
    
    // Haptic feedback for sync
    notificationOccurred?.('success');
    playMiningSound('sync');

    // Clear sync after 1 second
    setTimeout(() => {
      setSyncActive(false);
    }, 1000);
  };

  const handleTap = (e: React.MouseEvent) => {
    if (stamina <= 0) {
      playMiningSound('empty');
      return;
    }

    // Haptic feedback
    impactOccurred?.('light');

    // Add to pending batch
    pendingTaps.current += 1;

    // Update local stamina immediately for responsive UI
    setStamina(prev => Math.max(0, prev - MINING_CONFIG.STAMINA_PER_TAP));

    // Show particle effect
    const x = e.clientX;
    const y = e.clientY;
    
    const id = particleId.current++;
    const value = MINING_CONFIG.LOVE_PER_TAP * (syncActive ? MINING_CONFIG.SYNC_MULTIPLIER : 1);
    
    setParticles(prev => [...prev, { id, x, y, value }]);
    
    // Remove particle after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 600);

    // Update local love count
    setTotalLove(prev => prev + value);
    
    playMiningSound('tap');
  };

  const handleGoChat = () => {
    if (session) {
      navigate(`/chat?relationship_id=${session.relationship_id}`);
    } else {
      navigate('/matches');
    }
  };

  const handleBack = () => {
    flushTapBatch();
    navigate('/games');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Zap className="w-12 h-12 text-purple-500" />
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
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

  const isStaminaEmpty = stamina <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark via-purple-900/20 to-dark relative overflow-hidden">
      {/* Particles */}
      {particles.map(p => (
        <TapParticle key={p.id} x={p.x} y={p.y} value={p.value} />
      ))}

      {/* Sync Combo Overlay */}
      <SyncComboOverlay show={syncActive} multiplier={MINING_CONFIG.SYNC_MULTIPLIER} />

      {/* Empty Stamina Overlay */}
      <EmptyStaminaOverlay show={isStaminaEmpty} onGoChat={handleGoChat} />

      {/* Header */}
      <div className="safe-top px-4 py-3 flex items-center justify-between border-b border-white/10">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl bg-dark-card border border-white/10"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">Love Mining Rig</h1>
          <p className="text-xs text-white/50">⛏️ with {partnerDisplayName}</p>
        </div>

        <div className="flex items-center gap-1 px-3 py-1 bg-purple-600/30 rounded-full">
          {partnerAvatarUrl ? (
            <img src={partnerAvatarUrl} className="w-5 h-5 rounded-full" alt="" />
          ) : (
            <Users className="w-4 h-4 text-purple-400" />
          )}
          <span className="text-sm text-white font-medium">x2</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 py-3">
        <div className="bg-dark-card border border-white/10 rounded-xl p-4 space-y-3">
          {/* Total Love Mined */}
          <div className="flex items-center justify-between">
            <span className="text-white/60">Total Mined</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                {totalLove.toFixed(1)}
              </span>
              <span className="text-pink-400">$LOVE</span>
            </div>
          </div>

          {/* Sync Combos */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Sync Combos</span>
            <span className="text-yellow-400 font-bold">⚡ {syncCombos}</span>
          </div>

          {/* Tap Counts */}
          <div className="flex justify-between text-xs text-white/50">
            <span>You: {myTaps} taps</span>
            <span>{partnerDisplayName}: {partnerTaps} taps</span>
          </div>

          {/* Stamina Bar */}
          <StaminaBar current={stamina} max={MINING_CONFIG.MAX_STAMINA} />
        </div>
      </div>

      {/* Mining Area */}
      <div 
        className="flex-1 flex items-center justify-center py-12"
        onClick={handleTap}
      >
        <MiningRock 
          scale={rockSize}
          onTap={() => {}} // Handled by parent
          disabled={isStaminaEmpty}
          syncActive={syncActive}
        />
      </div>

      {/* Bottom Tips */}
      <div className="px-4 pb-6 text-center">
        <p className="text-sm text-white/40">
          💡 Tap together with your partner for <span className="text-yellow-400">SYNC COMBO x2</span>
        </p>
      </div>
    </div>
  );
}
