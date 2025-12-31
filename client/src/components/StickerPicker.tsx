/**
 * StickerPicker Component
 * Bottom sheet modal for selecting crypto stickers
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { CRYPTO_STICKERS, STICKER_REWARD, type Sticker } from '../data/stickers';
import { haptic } from '../utils/telegram';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: Sticker) => void;
}

export default function StickerPicker({ isOpen, onClose, onSelectSticker }: StickerPickerProps) {
  const handleStickerClick = (sticker: Sticker) => {
    haptic.impact('medium');
    onSelectSticker(sticker);
    onClose();
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-b from-dark-100 to-dark-200 rounded-t-3xl overflow-hidden border-t border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-lg">Crypto Stickers</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neon-green bg-neon-green/10 px-2 py-1 rounded-full">
                  +{STICKER_REWARD} $LOVE
                </span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Sticker Grid */}
            <div className="p-4 pb-8 max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {CRYPTO_STICKERS.map((sticker) => (
                  <motion.button
                    key={sticker.id}
                    onClick={() => handleStickerClick(sticker)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative aspect-square rounded-xl bg-dark-300/50 border border-white/10 overflow-hidden hover:border-primary/50 transition-all group"
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Overlay with name on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                      <span className="text-xs font-medium text-white">{sticker.name}</span>
                    </div>
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-primary/10 to-neon-purple/10" />
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Bottom safe area for mobile */}
            <div className="h-6 bg-dark-200" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
