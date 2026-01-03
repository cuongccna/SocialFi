/**
 * RizzSuggestionSheet Component
 * Bottom sheet displaying AI-generated pickup line suggestions
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { haptic } from '../utils/telegram';

interface RizzSuggestionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  isLoading: boolean;
}

export default function RizzSuggestionSheet({
  isOpen,
  onClose,
  suggestions,
  onSelectSuggestion,
  isLoading,
}: RizzSuggestionSheetProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSelect = (suggestion: string, index: number) => {
    haptic.impact('medium');
    setCopiedIndex(index);
    onSelectSuggestion(suggestion);
    
    // Reset copied state after animation
    setTimeout(() => {
      setCopiedIndex(null);
      onClose();
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-dark-100 rounded-t-3xl border-t border-white/10 overflow-hidden"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">AI Rizz God</h3>
                  <p className="text-xs text-white/60">Tap a line to use it</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-8 space-y-3 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                // Loading skeleton
                <div className="space-y-3">
                  <LoadingSkeleton delay={0} />
                  <LoadingSkeleton delay={0.1} />
                  <LoadingSkeleton delay={0.2} />
                  <div className="text-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="inline-block text-3xl"
                    >
                      🔮
                    </motion.div>
                    <p className="text-white/60 text-sm mt-2">Summoning AI Rizz God...</p>
                  </div>
                </div>
              ) : (
                // Suggestions list
                suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelect(suggestion, index)}
                    className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10 hover:border-purple-500/50 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {index === 0 ? '🔥' : index === 1 ? '💫' : '✨'}
                      </span>
                      <p className="flex-1 text-white/90 leading-relaxed">{suggestion}</p>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedIndex === index ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-white/40" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Loading skeleton component
function LoadingSkeleton({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="p-4 rounded-2xl bg-white/5 border border-white/10"
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5, delay }}
          className="w-8 h-8 rounded-full bg-white/10"
        />
        <div className="flex-1 space-y-2">
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: delay + 0.1 }}
            className="h-4 bg-white/10 rounded-full w-full"
          />
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: delay + 0.2 }}
            className="h-4 bg-white/10 rounded-full w-2/3"
          />
        </div>
      </div>
    </motion.div>
  );
}
