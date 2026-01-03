/**
 * KYP Challenge Game Page
 * "Know Your Partner" - Real-time couple quiz game
 * 
 * Phases:
 * 1. BETTING - Both players bet $LOVE (confidence level)
 * 2. ANSWERING - Answer the question secretly
 * 3. REVEAL - Show both answers, match/mismatch animation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Heart, Clock, Check, X,
  Share2, Trophy, Loader2, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';
import { useSocket } from '../hooks/useSocket';
import {
  type KYPGameSession,
  type KYPRoundState,
  type KYPGameResult,
  type KYPGamePhase,
  startKYPGame,
  getGameState,
  generateShareImage,
  calculateCompatibilityRating,
  playSound,
  KYP_SOCKET_EVENTS,
} from '../services/kyp.service';
import {
  KYP_GAME_CONFIG,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
} from '../data/kyp_questions';

// ============================================
// Confetti Effect Component
// ============================================

function ConfettiEffect({ show }: { show: boolean }) {
  if (!show) return null;

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'][Math.floor(Math.random() * 6)],
    size: 8 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ 
            y: window.innerHeight + 100, 
            opacity: [1, 1, 0],
            rotate: Math.random() * 720 - 360,
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// Pulsing Heart Animation
// ============================================

function PulsingHeart({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="text-6xl mb-4"
      >
        💕
      </motion.div>
      <p className="text-white/60 text-lg">{text}</p>
      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Broken Heart Animation
// ============================================

function BrokenHeartAnimation() {
  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.2, 0.8, 1] }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <motion.div
        className="text-6xl"
        initial={{ x: 0 }}
        animate={{ x: -10, rotate: -15 }}
        transition={{ delay: 0.2 }}
      >
        💔
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Timer Component
// ============================================

function GameTimer({ seconds, total }: { seconds: number; total: number }) {
  const percentage = (seconds / total) * 100;
  const isUrgent = seconds <= 5;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : 'bg-primary'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
        <Clock className="w-4 h-4" />
        <span className="font-mono font-bold w-6">{seconds}</span>
      </div>
    </div>
  );
}

// ============================================
// Betting Phase Component
// ============================================

interface BettingPhaseProps {
  round: KYPRoundState;
  onSubmitBet: (amount: number) => void;
  userBalance: number;
  partnerReady: boolean;
  myBet: number | null;
}

function BettingPhase({ round, onSubmitBet, userBalance, partnerReady, myBet }: BettingPhaseProps) {
  const [betAmount, setBetAmount] = useState(KYP_GAME_CONFIG.BET_AMOUNT);
  const presetAmounts = [10, 25, 50, 100];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8">
      {/* Category Preview */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`px-4 py-2 rounded-full bg-gradient-to-r ${CATEGORY_COLORS[round.question.category]} text-white font-bold mb-6`}
      >
        {CATEGORY_EMOJIS[round.question.category]} {round.question.category} Question
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Place Your Bet! 🎰</h2>
      <p className="text-white/60 text-center mb-8">
        How confident are you that you'll match?
      </p>

      {myBet === null ? (
        <>
          {/* Bet Amount Display */}
          <div className="bg-dark-100 rounded-2xl p-6 mb-6 w-full max-w-xs text-center border border-neon-yellow/30">
            <p className="text-white/60 text-sm mb-2">Your Bet</p>
            <p className="text-4xl font-bold text-neon-yellow">{betAmount} $LOVE</p>
          </div>

          {/* Preset Amounts */}
          <div className="flex gap-2 mb-6">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                disabled={amount > userBalance}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  betAmount === amount
                    ? 'bg-neon-yellow text-dark'
                    : amount > userBalance
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={() => {
              haptic.impact('medium');
              onSubmitBet(betAmount);
            }}
            disabled={betAmount > userBalance}
            className="w-full max-w-xs py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-neon-yellow to-orange-500 text-dark disabled:opacity-50"
          >
            Confirm Bet 🎲
          </button>
        </>
      ) : (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          <p className="text-white mb-2">Bet Placed: <span className="text-neon-yellow font-bold">{myBet} $LOVE</span></p>
          
          {!partnerReady ? (
            <PulsingHeart text="Waiting for partner..." />
          ) : (
            <p className="text-primary">Partner is ready! Starting...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Answering Phase Component
// ============================================

interface AnsweringPhaseProps {
  round: KYPRoundState;
  onSubmitAnswer: (index: number) => void;
  partnerAnswered: boolean;
  myAnswer: number | null;
}

function AnsweringPhase({ round, onSubmitAnswer, partnerAnswered, myAnswer }: AnsweringPhaseProps) {
  const question = round.question;
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="px-4 py-6">
      {/* Question Card */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`bg-gradient-to-br ${CATEGORY_COLORS[question.category]} p-1 rounded-2xl mb-6`}
      >
        <div className="bg-dark-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{CATEGORY_EMOJIS[question.category]}</span>
            <span className="text-sm text-white/60">{question.category}</span>
            <span className="text-sm text-white/40">• {question.points} pts</span>
          </div>
          <h2 className="text-xl font-bold text-white leading-relaxed">
            {question.question}
          </h2>
        </div>
      </motion.div>

      {/* Options */}
      {myAnswer === null ? (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <motion.button
              key={index}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                haptic.impact('light');
                onSubmitAnswer(index);
              }}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all text-left flex items-center gap-4"
            >
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-primary">
                {optionLabels[index]}
              </span>
              <span className="text-white flex-1">{option}</span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          <p className="text-white mb-2">
            Your answer: <span className="text-primary font-bold">{optionLabels[myAnswer]}</span>
          </p>
          <p className="text-white/60 mb-4">{question.options[myAnswer]}</p>
          
          {!partnerAnswered ? (
            <PulsingHeart text="Waiting for partner..." />
          ) : (
            <p className="text-primary animate-pulse">Revealing answers...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Reveal Phase Component
// ============================================

interface RevealPhaseProps {
  round: KYPRoundState;
  playerA: { name: string; avatar: string | null };
  playerB: { name: string; avatar: string | null };
}

function RevealPhase({ round, playerA, playerB }: RevealPhaseProps) {
  const question = round.question;
  const optionLabels = ['A', 'B', 'C', 'D'];
  const isMatch = round.is_match;

  useEffect(() => {
    if (isMatch) {
      playSound('match');
    } else {
      playSound('mismatch');
    }
  }, [isMatch]);

  return (
    <div className="px-4 py-6">
      <ConfettiEffect show={isMatch || false} />

      {/* Result Banner */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10 }}
        className={`text-center py-6 rounded-2xl mb-6 ${
          isMatch 
            ? 'bg-gradient-to-r from-pink-500/20 to-red-500/20 border border-pink-500/30' 
            : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-gray-500/30'
        }`}
      >
        {isMatch ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
              className="text-5xl mb-2"
            >
              ❤️
            </motion.div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400">
              SOULMATES!
            </h2>
            <p className="text-white/60 mt-2">+{round.pot_won || 0} $LOVE</p>
          </>
        ) : (
          <>
            <BrokenHeartAnimation />
            <h2 className="text-2xl font-bold text-white/60 mt-2">
              Not quite... 💔
            </h2>
          </>
        )}
      </motion.div>

      {/* Answers Comparison */}
      <div className="bg-dark-100 rounded-2xl p-4 border border-white/10">
        <p className="text-center text-white/60 text-sm mb-4">
          {question.question}
        </p>

        {/* Side by Side Answers */}
        <div className="flex items-stretch gap-4">
          {/* Player A */}
          <div className="flex-1 text-center">
            <img
              src={playerA.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerA.name}`}
              alt={playerA.name}
              className="w-16 h-16 rounded-full mx-auto border-2 border-primary mb-2"
            />
            <p className="text-sm text-white/60 truncate">{playerA.name}</p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`mt-3 p-3 rounded-xl ${
                isMatch ? 'bg-primary/20 border border-primary/30' : 'bg-white/10 border border-white/10'
              }`}
            >
              <span className="font-bold text-primary">
                {optionLabels[round.player_a_answer || 0]}
              </span>
              <p className="text-xs text-white/60 mt-1">
                {question.options[round.player_a_answer || 0]}
              </p>
            </motion.div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isMatch ? 'bg-pink-500/20' : 'bg-white/10'
            }`}>
              {isMatch ? (
                <Heart className="w-5 h-5 text-pink-400" />
              ) : (
                <X className="w-5 h-5 text-white/40" />
              )}
            </div>
          </div>

          {/* Player B */}
          <div className="flex-1 text-center">
            <img
              src={playerB.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerB.name}`}
              alt={playerB.name}
              className="w-16 h-16 rounded-full mx-auto border-2 border-neon-purple mb-2"
            />
            <p className="text-sm text-white/60 truncate">{playerB.name}</p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className={`mt-3 p-3 rounded-xl ${
                isMatch ? 'bg-primary/20 border border-primary/30' : 'bg-white/10 border border-white/10'
              }`}
            >
              <span className="font-bold text-neon-purple">
                {optionLabels[round.player_b_answer || 0]}
              </span>
              <p className="text-xs text-white/60 mt-1">
                {question.options[round.player_b_answer || 0]}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Results Screen Component
// ============================================

interface ResultsScreenProps {
  result: KYPGameResult;
  onShare: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
  isSharing: boolean;
}

function ResultsScreen({ result, onShare, onPlayAgain, onExit, isSharing }: ResultsScreenProps) {
  const compatibility = calculateCompatibilityRating(result.match_percentage);

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
      <ConfettiEffect show={result.match_percentage >= 70} />

      {/* Title */}
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-3xl font-black text-center mb-8"
      >
        Game Complete! 🎉
      </motion.h1>

      {/* Compatibility Card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-dark-100 rounded-3xl p-6 w-full max-w-sm border border-white/10 mb-6"
      >
        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <img
            src={result.player_a.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.player_a.name}`}
            alt={result.player_a.name}
            className="w-20 h-20 rounded-full border-4 border-primary"
          />
          <div className="text-4xl">❤️</div>
          <img
            src={result.player_b.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.player_b.name}`}
            alt={result.player_b.name}
            className="w-20 h-20 rounded-full border-4 border-neon-purple"
          />
        </div>

        {/* Match Percentage */}
        <div className="text-center mb-6">
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400"
          >
            {result.match_percentage}%
          </motion.p>
          <p className={`text-xl font-bold ${compatibility.color} mt-2`}>
            {compatibility.emoji} {compatibility.rating}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{result.total_matches}</p>
            <p className="text-xs text-white/60">Matches</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{result.total_rounds}</p>
            <p className="text-xs text-white/60">Questions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neon-yellow">{result.love_earned}</p>
            <p className="text-xs text-white/60">$LOVE</p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onShare}
          disabled={isSharing}
          className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-red-500 text-white flex items-center justify-center gap-2"
        >
          {isSharing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Share Result
            </>
          )}
        </button>
        
        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-xl font-bold bg-primary text-dark flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Play Again
        </button>
        
        <button
          onClick={onExit}
          className="w-full py-3 rounded-xl text-white/60"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

// ============================================
// Main KYP Game Page
// ============================================

export default function KYPGamePage() {
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

  const relationshipId = locationState?.partner?.relationshipId || searchParams.get('relationship');
  const sessionId = locationState?.sessionId || searchParams.get('session');
  const partnerFromState = locationState?.partner;

  // Game state
  const [session, setSession] = useState<KYPGameSession | null>(null);
  const [round, setRound] = useState<KYPRoundState | null>(null);
  const [result, setResult] = useState<KYPGameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User input state
  const [myBet, setMyBet] = useState<number | null>(null);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [partnerBetReady, setPartnerBetReady] = useState(false);
  const [partnerAnswered, setPartnerAnswered] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Partner info (from location state or will be fetched)
  const [partnerInfo] = useState<{ name: string; avatar: string | null } | null>(
    partnerFromState ? { name: partnerFromState.displayName, avatar: partnerFromState.avatarUrl } : null
  );
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Socket connection
  const handleSocketMessage = useCallback((event: string, data: unknown) => {
    console.log('KYP Socket event:', event, data);
    
    switch (event) {
      case KYP_SOCKET_EVENTS.GAME_STATE:
        const state = data as { session: KYPGameSession; round: KYPRoundState };
        setSession(state.session);
        setRound(state.round);
        setTimeRemaining(state.round?.time_remaining || 0);
        break;
        
      case KYP_SOCKET_EVENTS.PHASE_CHANGE:
        const phaseData = data as { phase: KYPGamePhase; round: KYPRoundState };
        setRound(phaseData.round);
        setTimeRemaining(phaseData.round.time_remaining);
        // Reset local state on phase change
        if (phaseData.phase === 'BETTING') {
          setMyBet(null);
          setMyAnswer(null);
          setPartnerBetReady(false);
          setPartnerAnswered(false);
        } else if (phaseData.phase === 'ANSWERING') {
          setMyAnswer(null);
          setPartnerAnswered(false);
        }
        break;
        
      case KYP_SOCKET_EVENTS.TIMER_UPDATE:
        setTimeRemaining((data as { time: number }).time);
        break;
        
      case KYP_SOCKET_EVENTS.BET_UPDATE:
        const betData = data as { player_id: string; ready: boolean };
        if (betData.player_id !== user?.id) {
          setPartnerBetReady(betData.ready);
        }
        break;
        
      case KYP_SOCKET_EVENTS.ANSWER_UPDATE:
        const answerData = data as { player_id: string; answered: boolean };
        if (answerData.player_id !== user?.id) {
          setPartnerAnswered(answerData.answered);
        }
        break;
        
      case KYP_SOCKET_EVENTS.ROUND_RESULT:
        setRound(data as KYPRoundState);
        break;
        
      case KYP_SOCKET_EVENTS.GAME_END:
        setResult(data as KYPGameResult);
        break;
    }
  }, [user?.id]);

  const { socket } = useSocket({
    conversationId: session?.id,
  });

  // Setup KYP-specific socket listeners
  useEffect(() => {
    if (!socket || !session?.id) return;

    // Join KYP game room
    socket.emit('kyp:join', { session_id: session.id });

    // Setup KYP event listeners
    socket.on('kyp:state', handleSocketMessage.bind(null, KYP_SOCKET_EVENTS.GAME_STATE));
    socket.on('kyp:phase', handleSocketMessage.bind(null, KYP_SOCKET_EVENTS.PHASE_CHANGE));
    socket.on('kyp:bet_update', handleSocketMessage.bind(null, KYP_SOCKET_EVENTS.BET_UPDATE));
    socket.on('kyp:answer_update', handleSocketMessage.bind(null, KYP_SOCKET_EVENTS.ANSWER_UPDATE));
    socket.on('kyp:round_result', handleSocketMessage.bind(null, KYP_SOCKET_EVENTS.ROUND_RESULT));
    socket.on('kyp:game_end', handleSocketMessage.bind(null, KYP_SOCKET_EVENTS.GAME_END));

    return () => {
      socket.emit('kyp:leave', { session_id: session.id });
      socket.off('kyp:state');
      socket.off('kyp:phase');
      socket.off('kyp:bet_update');
      socket.off('kyp:answer_update');
      socket.off('kyp:round_result');
      socket.off('kyp:game_end');
    };
  }, [socket, session?.id, handleSocketMessage]);

  // Initialize game
  useEffect(() => {
    initGame();
  }, [relationshipId, sessionId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [round?.round_number, round?.phase]);

  const initGame = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (sessionId) {
        // Join existing session
        const state = await getGameState(sessionId);
        setSession(state.session);
        setRound(state.round);
      } else if (relationshipId) {
        // Start new game
        const response = await startKYPGame(relationshipId);
        if (response.success) {
          setSession(response.session);
        } else {
          setError(response.message || 'Failed to start game');
        }
      } else {
        setError('No relationship or session specified');
      }
    } catch (err) {
      console.error('Failed to init game:', err);
      setError('Failed to connect to game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBet = (amount: number) => {
    setMyBet(amount);
    socket?.emit('kyp:bet', { 
      session_id: session?.id, 
      amount,
      user_id: user?.id
    });
  };

  const handleSubmitAnswer = (answerIndex: number) => {
    setMyAnswer(answerIndex);
    socket?.emit('kyp:answer', { 
      session_id: session?.id, 
      answer_index: answerIndex,
      user_id: user?.id
    });
  };

  const handleShare = async () => {
    if (!session) return;
    
    try {
      setIsSharing(true);
      const shareData = await generateShareImage(session.id);
      
      // Use Telegram share or Web Share API
      if (navigator.share) {
        await navigator.share({
          title: 'CryptoCrush KYP Challenge',
          text: shareData.share_text,
          url: shareData.image_url,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.share_text);
        haptic.notification('success');
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePlayAgain = () => {
    setResult(null);
    setSession(null);
    setRound(null);
    setMyBet(null);
    setMyAnswer(null);
    initGame();
  };

  const handleExit = () => {
    navigate('/games');
  };

  // Determine which player is "me"
  const isPlayerA = session?.player_a_id === user?.id;
  const myScore = isPlayerA ? session?.player_a_score : session?.player_b_score;
  const partnerScore = isPlayerA ? session?.player_b_score : session?.player_a_score;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading game...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😢</div>
          <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <button onClick={handleExit} className="btn-primary">
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Results screen
  if (result) {
    return (
      <ResultsScreen
        result={result}
        onShare={handleShare}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
        isSharing={isSharing}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark">
      {/* Header */}
      <div className="p-4 bg-dark-100/80 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleExit}
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-bold flex items-center gap-2">
            🧠 KYP Challenge
          </h1>
          
          <div className="flex items-center gap-1 text-sm">
            <Trophy className="w-4 h-4 text-neon-yellow" />
            <span className="text-white/60">Round</span>
            <span className="font-bold">{round?.round_number || 1}/{session?.total_rounds || 10}</span>
          </div>
        </div>

        {/* Timer */}
        {round && round.phase !== 'WAITING' && round.phase !== 'RESULTS' && (
          <GameTimer 
            seconds={timeRemaining} 
            total={round.phase === 'BETTING' ? KYP_GAME_CONFIG.TIME_TO_BET : KYP_GAME_CONFIG.TIME_TO_ANSWER} 
          />
        )}

        {/* Score Bar */}
        <div className="flex items-center justify-between mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold">You: {myScore || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-white/60">Matches: {session?.matches || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neon-purple font-bold">Partner: {partnerScore || 0}</span>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Waiting for partner */}
        {round?.phase === 'WAITING' && (
          <div className="h-full flex items-center justify-center">
            <PulsingHeart text="Waiting for partner to join..." />
          </div>
        )}

        {/* Betting Phase */}
        {round?.phase === 'BETTING' && (
          <BettingPhase
            round={round}
            onSubmitBet={handleSubmitBet}
            userBalance={user?.balance_love || 0}
            partnerReady={partnerBetReady}
            myBet={myBet}
          />
        )}

        {/* Answering Phase */}
        {round?.phase === 'ANSWERING' && (
          <AnsweringPhase
            round={round}
            onSubmitAnswer={handleSubmitAnswer}
            partnerAnswered={partnerAnswered}
            myAnswer={myAnswer}
          />
        )}

        {/* Reveal Phase */}
        {round?.phase === 'REVEAL' && session && (
          <RevealPhase
            round={round}
            playerA={{
              name: user?.display_name || 'Player A',
              avatar: user?.avatar_url || null,
            }}
            playerB={{
              name: partnerInfo?.name || 'Partner',
              avatar: partnerInfo?.avatar || null,
            }}
          />
        )}
      </div>
    </div>
  );
}
