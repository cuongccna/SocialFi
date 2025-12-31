/**
 * CertificateModal Component
 * Displays the minted Love Contract NFT certificate
 * with metadata and share options
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  Zap,
  Clock,
  Hash,
  DollarSign,
  Globe
} from 'lucide-react';
import type { NftData } from '../services/matches.service';
import { haptic } from '../utils/telegram';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NftData | null;
  partnerName: string;
}

export default function CertificateModal({ 
  isOpen, 
  onClose, 
  nft, 
  partnerName 
}: CertificateModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!nft) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      haptic.notification('success');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async () => {
    try {
      haptic.impact('medium');
      // Create download link for the certificate image
      const link = document.createElement('a');
      link.href = nft.image_url;
      link.download = `love-contract-${nft.tx_hash.slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      haptic.notification('success');
    } catch (err) {
      console.error('Failed to download:', err);
      haptic.notification('error');
    }
  };

  const handleShare = async () => {
    try {
      haptic.impact('medium');
      
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: '💍 Love Contract Minted!',
          text: `I just minted a Love Contract with ${partnerName} on CryptoCrush! 🚀\n\nContract: ${truncateHash(nft.contract_address)}\nCombined Market Cap: $${nft.combined_market_cap}`,
          url: window.location.href,
        });
        haptic.notification('success');
      } else {
        // Fallback: copy share text to clipboard
        const shareText = `💍 Love Contract Minted!\n\nI just minted a Love Contract with ${partnerName} on CryptoCrush! 🚀\n\nContract: ${nft.contract_address}\nTx Hash: ${nft.tx_hash}\nCombined Market Cap: $${nft.combined_market_cap}`;
        await navigator.clipboard.writeText(shareText);
        setCopied('share');
        haptic.notification('success');
        setTimeout(() => setCopied(null), 2000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const metadataItems = [
    { 
      icon: Hash, 
      label: 'Transaction Hash', 
      value: nft.tx_hash, 
      display: truncateHash(nft.tx_hash),
      copyable: true 
    },
    { 
      icon: Zap, 
      label: 'Block Height', 
      value: nft.block_height.toLocaleString(), 
      display: nft.block_height.toLocaleString(),
      copyable: false 
    },
    { 
      icon: DollarSign, 
      label: 'Gas Fee Paid', 
      value: `${nft.gas_fee} $LOVE`, 
      display: `${nft.gas_fee} $LOVE`,
      copyable: false 
    },
    { 
      icon: Clock, 
      label: 'Minted Date', 
      value: formatDate(nft.minted_date), 
      display: formatDate(nft.minted_date),
      copyable: false 
    },
    { 
      icon: Globe, 
      label: 'Network', 
      value: nft.network, 
      display: nft.network,
      copyable: false 
    },
    { 
      icon: Sparkles, 
      label: 'Combined Market Cap', 
      value: `$${nft.combined_market_cap}`, 
      display: `$${nft.combined_market_cap}`,
      copyable: false 
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-dark-100 to-dark-200 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-neon-purple/30 shadow-2xl shadow-neon-purple/20"
          >
            {/* Header */}
            <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-neon-purple/20 to-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-neon-purple" />
                  <h2 className="text-lg font-bold text-white">Love Contract NFT</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/60 mt-1">
                Minted with {partnerName}
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Certificate Image */}
              <div className="p-4">
                <motion.div 
                  className="relative rounded-xl overflow-hidden border-2 border-neon-purple/50 shadow-lg shadow-neon-purple/30"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <img
                    src={nft.image_url}
                    alt="Love Contract Certificate"
                    className="w-full aspect-square object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.src = 'https://via.placeholder.com/400x400/1a0a2e/ff00ff?text=💍+Love+Contract';
                    }}
                  />
                  {/* Holographic overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 via-transparent to-neon-cyan/10 pointer-events-none" />
                </motion.div>
              </div>

              {/* Contract Address */}
              <div className="px-4 pb-4">
                <div className="bg-dark-300/50 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/60 mb-1">Contract Address</p>
                      <p className="font-mono text-sm text-neon-cyan">
                        {truncateHash(nft.contract_address)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(nft.contract_address, 'address')}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      {copied === 'address' ? (
                        <Check className="w-4 h-4 text-neon-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="px-4 pb-4">
                <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-neon-green" />
                  On-Chain Metadata
                </h3>
                <div className="space-y-2">
                  {metadataItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 bg-dark-300/30 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-neon-purple/20">
                          <item.icon className="w-4 h-4 text-neon-purple" />
                        </div>
                        <div>
                          <p className="text-xs text-white/50">{item.label}</p>
                          <p className="text-sm text-white font-medium">{item.display}</p>
                        </div>
                      </div>
                      {item.copyable && (
                        <button
                          onClick={() => copyToClipboard(item.value, item.label)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          {copied === item.label ? (
                            <Check className="w-3 h-3 text-neon-green" />
                          ) : (
                            <Copy className="w-3 h-3 text-white/60" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Badge */}
              <div className="px-4 pb-4">
                <div className="text-center py-3 bg-gradient-to-r from-neon-green/10 to-neon-cyan/10 rounded-xl border border-neon-green/30">
                  <p className="text-sm font-semibold text-neon-green flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Verified on CryptoCrush Blockchain
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-white/10 bg-dark-100/80 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  Download
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-neon-purple to-primary text-white font-medium"
                >
                  {copied === 'share' ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" />
                      Share
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
