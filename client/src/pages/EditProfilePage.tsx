/**
 * Edit Profile Page
 * Allows users to populate their data for the Swipe Feed
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Camera, 
  X, 
  Plus, 
  Check,
  Briefcase,
  Heart,
  Coins,
  Image,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadProfilePhoto, type ProfileUpdateRequest } from '../services/profile.service';
import { haptic } from '../utils/telegram';
import { getAvatarUrl } from '../utils/helpers';
import type { UserAsset } from '../types';

// Available interest tags
const INTEREST_OPTIONS = ['DeFi', 'NFT', 'Travel', 'Gym', 'Memecoins', 'Trading', 'Gaming', 'Web3'];

// Available crypto assets to "flex"
const ASSET_OPTIONS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'TON', name: 'Toncoin', icon: '💎' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: '🐕' },
  { symbol: 'PEPE', name: 'Pepe', icon: '🐸' },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: '🦊' },
  { symbol: 'BNB', name: 'BNB', icon: '🔶' },
];

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [bio, setBio] = useState(user?.bio || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [assets, setAssets] = useState<UserAsset[]>(user?.assets || []);
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  // Sync with user data when it changes
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setJobTitle(user.job_title || '');
      setInterests(user.interests || []);
      setAssets(user.assets || []);
      setPhotos(user.photos || []);
    }
  }, [user]);

  // Toggle interest tag
  const toggleInterest = (interest: string) => {
    haptic.impact('light');
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 5) {
      setInterests([...interests, interest]);
    }
  };

  // Toggle asset
  const toggleAsset = (symbol: string) => {
    haptic.impact('light');
    const existingIndex = assets.findIndex(a => a.symbol === symbol);
    if (existingIndex >= 0) {
      setAssets(assets.filter(a => a.symbol !== symbol));
    } else if (assets.length < 3) {
      setAssets([...assets, { symbol }]);
    }
    setShowAssetPicker(false);
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Max 5MB allowed.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      haptic.impact('medium');

      const result = await uploadProfilePhoto(file);
      
      if (result.success && result.url) {
        setPhotos([...photos, result.url]);
        haptic.notification('success');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      haptic.notification('error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    haptic.impact('light');
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Save profile
  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      setError(null);
      haptic.impact('heavy');

      const data: ProfileUpdateRequest = {
        bio: bio.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        interests: interests.length > 0 ? interests : undefined,
        assets: assets.length > 0 ? assets : undefined,
        photos: photos.length > 0 ? photos : undefined,
      };

      const result = await updateProfile(data);

      if (result.success) {
        haptic.notification('success');
        setSuccessMessage('Profile updated successfully! 🚀');
        
        // Refresh user context
        if (refreshUser) {
          await refreshUser();
        }

        // Navigate back after short delay
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save profile');
      haptic.notification('error');
    } finally {
      setIsSaving(false);
    }
  };

  const bioCharsLeft = 150 - bio.length;

  return (
    <div className="h-full overflow-y-auto pb-24 bg-dark">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => { haptic.impact('light'); navigate(-1); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-dark font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-400">{successMessage}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-6">
        {/* Profile Preview */}
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
          <img
            src={user ? getAvatarUrl(user) : ''}
            alt={user?.display_name}
            className="w-16 h-16 rounded-full object-cover border-2 border-primary/50"
          />
          <div>
            <p className="font-semibold">{user?.display_name}</p>
            <p className="text-sm text-white/60">@{user?.username || 'anonymous'}</p>
          </div>
        </div>

        {/* Bio Section */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Heart className="w-4 h-4 text-primary" />
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            placeholder="Tell others about yourself... What's your alpha?"
            className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-primary/50 placeholder:text-white/30"
          />
          <p className={`text-xs text-right ${bioCharsLeft < 20 ? 'text-red-400' : 'text-white/40'}`}>
            {bioCharsLeft} characters left
          </p>
        </div>

        {/* Job Title Section */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Briefcase className="w-4 h-4 text-primary" />
            Job Title
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value.slice(0, 50))}
            placeholder="e.g., DeFi Degen, NFT Collector, Crypto Trader"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary/50 placeholder:text-white/30"
          />
        </div>

        {/* Interests Section */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Heart className="w-4 h-4 text-pink-400" />
            Interests
            <span className="text-white/40 text-xs ml-auto">{interests.length}/5</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const isSelected = interests.includes(interest);
              return (
                <motion.button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-dark'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  } ${!isSelected && interests.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isSelected && interests.length >= 5}
                >
                  {interest}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Assets Section (The Flex) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Coins className="w-4 h-4 text-yellow-400" />
            The Flex (Top 3 Holdings)
            <span className="text-white/40 text-xs ml-auto">{assets.length}/3</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {assets.map((asset) => {
              const assetInfo = ASSET_OPTIONS.find(a => a.symbol === asset.symbol);
              return (
                <motion.div
                  key={asset.symbol}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full"
                >
                  <span>{assetInfo?.icon}</span>
                  <span className="font-semibold">{asset.symbol}</span>
                  <button
                    onClick={() => toggleAsset(asset.symbol)}
                    className="ml-1 w-5 h-5 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-500/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
            {assets.length < 3 && (
              <motion.button
                onClick={() => setShowAssetPicker(true)}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-dashed border-white/20 rounded-full text-white/60 hover:bg-white/20 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                Add Asset
              </motion.button>
            )}
          </div>
        </div>

        {/* Asset Picker Modal */}
        <AnimatePresence>
          {showAssetPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
              onClick={() => setShowAssetPicker(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-dark border-t border-white/10 rounded-t-3xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Select Asset</h3>
                  <button
                    onClick={() => setShowAssetPicker(false)}
                    className="p-2 rounded-full bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {ASSET_OPTIONS.filter(a => !assets.find(ua => ua.symbol === a.symbol)).map((asset) => (
                    <motion.button
                      key={asset.symbol}
                      onClick={() => toggleAsset(asset.symbol)}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-primary/30"
                    >
                      <span className="text-2xl">{asset.icon}</span>
                      <div className="text-left">
                        <p className="font-semibold">{asset.symbol}</p>
                        <p className="text-xs text-white/50">{asset.name}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photos Section */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Image className="w-4 h-4 text-blue-400" />
            Photos
            <span className="text-white/40 text-xs ml-auto">{photos.length}/4</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden bg-white/5"
              >
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-dark text-xs font-semibold rounded-full">
                    Main
                  </span>
                )}
              </motion.div>
            ))}
            {photos.length < 4 && (
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                whileTap={{ scale: 0.95 }}
                className="aspect-square rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:bg-white/10 hover:border-primary/30 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-white/40" />
                    <span className="text-sm text-white/40">Add Photo</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Tips */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-pink-500/10 border border-primary/20 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            💡 Profile Tips
          </h4>
          <ul className="text-sm text-white/70 space-y-1">
            <li>• Add at least 2 photos to get more matches</li>
            <li>• Show off your crypto holdings to attract fellow degens</li>
            <li>• A good bio can increase your market price by 5%</li>
          </ul>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
    </div>
  );
}
