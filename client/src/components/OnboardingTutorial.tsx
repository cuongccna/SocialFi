/**
 * Onboarding Tutorial Component
 * Custom built tour for new users explaining SocialFi concepts
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowRight, 
  ArrowLeft,
  Heart,
  TrendingUp,
  FileText,
  Gamepad2,
  Sparkles,
  Coins
} from 'lucide-react';
import { haptic } from '../utils/telegram';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string; // CSS selector to highlight
  position?: 'center' | 'top' | 'bottom';
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to CryptoCrush! 🚀',
    description: 'The first Dating App where you can Invest in Relationships. Turn connections into contracts, and love into liquidity!',
    icon: <Heart className="w-12 h-12 text-pink-500" />,
    position: 'center',
  },
  {
    id: 2,
    title: 'The Swipe Feed 📊',
    description: 'Swipe RIGHT to LONG (Bet on their potential) → Pumps their price!\n\nSwipe LEFT to PASS (Short their vibe) → No hard feelings.',
    icon: <TrendingUp className="w-12 h-12 text-primary" />,
    highlight: '[data-tour="card-stack"]',
    position: 'bottom',
  },
  {
    id: 3,
    title: 'Market Price 💰',
    description: 'Everyone has a Market Price! Chat & interact to pump it up. The more people LONG you, the higher your value climbs!',
    icon: <Coins className="w-12 h-12 text-yellow-500" />,
    highlight: '[data-tour="market-price"]',
    position: 'bottom',
  },
  {
    id: 4,
    title: 'Mint Love Contracts 💍',
    description: 'Found "The One"? Mint a Smart Contract to lock your relationship on-chain! Others can bet on your love lasting or... not.',
    icon: <FileText className="w-12 h-12 text-purple-500" />,
    highlight: '[data-tour="matches-tab"]',
    position: 'top',
  },
  {
    id: 5,
    title: 'Play & Earn Together 🎮',
    description: 'Play mini-games with your matches to mine $LOVE tokens! The more you play, the more you earn together.',
    icon: <Gamepad2 className="w-12 h-12 text-blue-500" />,
    highlight: '[data-tour="arcade-tab"]',
    position: 'top',
  },
];

export default function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Highlight element if specified
  useEffect(() => {
    if (step.highlight) {
      const element = document.querySelector(step.highlight);
      if (element) {
        element.classList.add('tour-highlight');
        return () => {
          element.classList.remove('tour-highlight');
        };
      }
    }
  }, [step.highlight]);

  const handleNext = () => {
    haptic.impact('light');
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    haptic.impact('light');
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    haptic.notification('success');
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    haptic.impact('light');
    setIsVisible(false);
    setTimeout(() => {
      onSkip?.() || onComplete();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Content */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative z-10 w-[90%] max-w-md mx-auto"
        >
          {/* Card */}
          <div className="bg-gradient-to-b from-[#1a1a2e] to-[#12121a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4">
              {/* Skip button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>

              {/* Step indicator */}
              <div className="flex justify-center gap-2 mb-6">
                {STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep
                        ? 'w-8 bg-primary'
                        : idx < currentStep
                        ? 'w-4 bg-primary/50'
                        : 'w-4 bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Icon */}
              <motion.div
                key={`icon-${step.id}`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                className="flex justify-center mb-4"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                  {step.icon}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                key={`title-${step.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold text-center text-white mb-3"
              >
                {step.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                key={`desc-${step.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/70 text-center whitespace-pre-line leading-relaxed"
              >
                {step.description}
              </motion.p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <div className="flex gap-3">
                {/* Back button */}
                {!isFirstStep && (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handlePrev}
                    className="flex-1 py-4 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </motion.button>
                )}

                {/* Next/Complete button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isLastStep
                      ? 'bg-gradient-to-r from-primary to-green-400 text-dark'
                      : 'bg-primary text-dark hover:bg-primary/90'
                  }`}
                >
                  {isLastStep ? (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Trading!
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>

              {/* Bonus hint on last step */}
              {isLastStep && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-primary/80 text-sm mt-3"
                >
                  🎁 Complete to receive 100 $LOVE welcome bonus!
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
