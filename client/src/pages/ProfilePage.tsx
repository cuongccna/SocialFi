import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Coins, Settings, Wallet, RefreshCw, Loader2, ChevronRight, Award, Heart, Users, Camera, BadgeCheck, Sparkles, Rocket, Zap, X, Upload, Bell, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getUserStats, formatNumber, boostProfile, uploadAvatar, type UserStats } from '../services/profile.service';
import { getMatches } from '../services/matches.service';
import { haptic } from '../utils/telegram';
import { getAvatarUrl, isDefaultAvatar, avatarRingClass } from '../utils/helpers';
import { useNotifications } from '../context/NotificationContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { unreadMessagesCount, pendingGameInvites, unclaimedRewardsCount } = useNotifications();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostMessage, setBoostMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBoostConfirm, setShowBoostConfirm] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const [statsData, matchesData] = await Promise.all([
        getUserStats(),
        getMatches(1, 0), // Just get total count
      ]);
      setStats(statsData);
      setMatchCount(matchesData.total);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (rank: string) => {
    switch (rank) {
      case 'WHALE':
        return { emoji: '🐋', class: 'badge-whale', label: 'Whale', color: 'text-blue-400' };
      case 'SHARK':
        return { emoji: '🦈', class: 'badge-shark', label: 'Shark', color: 'text-purple-400' };
      default:
        return { emoji: '🦐', class: 'badge-shrimp', label: 'Shrimp', color: 'text-pink-400' };
    }
  };

  // Handle boost profile - show confirmation first
  const handleBoostClick = () => {
    // Check balance before showing confirm
    const balance = user?.balance_love || 0;
    if (balance < 500) {
      haptic.notification('error');
      setBoostMessage({ 
        type: 'error', 
        text: `💰 Insufficient $LOVE balance. Need 500 $LOVE, you have ${balance.toFixed(0)} $LOVE.` 
      });
      setTimeout(() => setBoostMessage(null), 6000);
      return;
    }
    setShowBoostConfirm(true);
    haptic.impact('light');
  };

  // Confirm boost
  const handleBoost = async () => {
    if (isBoosting) return;
    setShowBoostConfirm(false);
    
    try {
      setIsBoosting(true);
      setBoostMessage(null);
      haptic.impact('heavy');
      
      const result = await boostProfile();
      
      haptic.notification('success');
      setBoostMessage({ type: 'success', text: result.message || '🚀 Profile boosted! +10% price pump!' });
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
      await loadStats();
      
      // Auto-hide message after 5 seconds
      setTimeout(() => setBoostMessage(null), 5000);
    } catch (err: any) {
      haptic.notification('error');
      console.error('Boost error:', err.response?.data || err);
      
      // Parse error message với các case cụ thể
      let errorMessage = 'Failed to boost profile';
      const serverMessage = err.response?.data?.message;
      
      if (serverMessage) {
        if (serverMessage.includes('already boosted')) {
          errorMessage = `⏳ ${serverMessage}`;
        } else if (serverMessage.includes('Insufficient')) {
          errorMessage = `💰 ${serverMessage}`;
        } else {
          errorMessage = serverMessage;
        }
      } else if (err.response?.status === 400) {
        errorMessage = '❌ Cannot boost right now. Check your balance or wait for cooldown.';
      } else if (!err.response) {
        errorMessage = '🌐 Network error. Please check your connection.';
      }
      
      setBoostMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setBoostMessage(null), 8000);
    } finally {
      setIsBoosting(false);
    }
  };

  // Check if user is currently boosted
  const isBoosted = user?.boosted_until && new Date(user.boosted_until) > new Date();
  const boostTimeRemaining = isBoosted 
    ? Math.ceil((new Date(user!.boosted_until!).getTime() - Date.now()) / (1000 * 60))
    : 0;

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setBoostMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setBoostMessage({ type: 'error', text: 'Image too large. Max 5MB allowed.' });
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    
    try {
      setIsUploading(true);
      haptic.impact('heavy');
      
      const result = await uploadAvatar(selectedFile);
      
      haptic.notification('success');
      setBoostMessage({ type: 'success', text: result.message });
      
      // Clear preview
      setUploadPreview(null);
      setSelectedFile(null);
      setShowUploadTooltip(false);
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
      await loadStats();
      
    } catch (err: any) {
      haptic.notification('error');
      setBoostMessage({ 
        type: 'error', 
        text: err.message || 'Failed to upload photo' 
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setBoostMessage(null), 5000);
    }
  };

  // Cancel upload
  const cancelUpload = () => {
    setUploadPreview(null);
    setSelectedFile(null);
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-white/60">Loading profile...</p>
      </div>
    );
  }

  const rankInfo = getRankBadge(user.wallet_rank || 'SHRIMP');
  const priceChange = user.price_change_24h || 0;

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header with gradient */}
      <div className="bg-gradient-to-b from-primary/20 to-transparent pt-8 pb-16 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => { haptic.impact('light'); navigate('/profile/edit'); }}
              className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors"
              title="Edit Profile"
            >
              <Pencil className="w-5 h-5 text-primary" />
            </button>
            <button 
              onClick={() => { haptic.impact('light'); loadStats(); }}
              disabled={isLoading}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              title="Refresh stats"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => { haptic.impact('light'); navigate('/notifications'); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {(unreadMessagesCount + pendingGameInvites + unclaimedRewardsCount) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-dark text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadMessagesCount + pendingGameInvites + unclaimedRewardsCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => { haptic.impact('light'); setShowSettings(true); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-12">
        <div className="card p-6">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img
                src={getAvatarUrl(user)}
                alt={user.display_name}
                className={`w-20 h-20 rounded-full border-4 border-primary/50 object-cover ${avatarRingClass}`}
              />
              <span className="absolute -bottom-1 -right-1 text-2xl">{rankInfo.emoji}</span>
              
              {/* Upload Photo Button - Show if using default avatar */}
              {isDefaultAvatar(user) && (
                <motion.button
                  onClick={() => {
                    haptic.impact('light');
                    setShowUploadTooltip(!showUploadTooltip);
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Camera className="w-4 h-4 text-dark" />
                </motion.button>
              )}
              
              {/* Change photo button for verified users */}
              {!isDefaultAvatar(user) && (
                <motion.button
                  onClick={() => {
                    haptic.impact('light');
                    fileInputRef.current?.click();
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
                  title="Change photo"
                >
                  <Camera className="w-3 h-3 text-white" />
                </motion.button>
              )}
              
              {/* Verified badge if has real photo */}
              {!isDefaultAvatar(user) && (
                <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-neon-blue flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {user.display_name}
                {!isDefaultAvatar(user) && (
                  <BadgeCheck className="w-5 h-5 text-neon-blue" />
                )}
              </h2>
              {user.username && (
                <p className="text-white/60">@{user.username}</p>
              )}
              <span className={`inline-flex items-center gap-1 mt-1 text-sm ${rankInfo.color}`}>
                {rankInfo.emoji} {rankInfo.label}
              </span>
            </div>
          </div>
          
          {/* Upload Photo Tooltip */}
          <AnimatePresence>
            {showUploadTooltip && isDefaultAvatar(user) && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-4 bg-gradient-to-r from-primary/20 via-neon-blue/20 to-neon-purple/20 rounded-xl border border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/20 shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary mb-1">Get Verified!</h4>
                    <p className="text-sm text-white/70 mb-3">
                      Upload a real photo to get the <span className="text-neon-blue">✓ Verified Badge</span> and 
                      <span className="text-neon-yellow font-bold"> boost your Market Cap by 10%!</span>
                    </p>
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {/* Upload Preview */}
                    {uploadPreview ? (
                      <div className="mb-3">
                        <div className="relative inline-block">
                          <img 
                            src={uploadPreview} 
                            alt="Preview" 
                            className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                          />
                          <button
                            onClick={cancelUpload}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neon-red flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Confirm Upload
                              </>
                            )}
                          </button>
                          <button 
                            onClick={cancelUpload}
                            className="text-sm py-2 px-4 text-white/60 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                        onClick={() => {
                          haptic.impact('medium');
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera className="w-4 h-4" />
                        Upload Photo
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowUploadTooltip(false)}
                    className="text-white/40 hover:text-white/60 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bio */}
          {user.bio && (
            <p className="text-white/80 mb-6">{user.bio}</p>
          )}

          {/* Market Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Market Price */}
            <div className="card bg-dark-100/50 p-3 rounded-xl">
              <div className="text-2xl font-bold text-primary">
                ${(user.market_price || 10).toFixed(2)}
              </div>
              <div className={`text-sm flex items-center justify-center gap-1 ${
                priceChange >= 0 ? 'text-neon-green' : 'text-neon-red'
              }`}>
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
              <div className="text-xs text-white/50 mt-1">Market Price</div>
            </div>

            {/* $LOVE Balance */}
            <div className="card bg-dark-100/50 p-3 rounded-xl">
              <div className="text-2xl font-bold text-neon-yellow">
                {formatNumber(user.balance_love || 0)}
              </div>
              <div className="text-sm text-white/60 flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" />
                $LOVE
              </div>
              <div className="text-xs text-white/50 mt-1">Balance</div>
            </div>

            {/* Matches */}
            <div className="card bg-dark-100/50 p-3 rounded-xl">
              <div className="text-2xl font-bold text-neon-purple">
                {matchCount}
              </div>
              <div className="text-sm text-white/60 flex items-center justify-center gap-1">
                <Heart className="w-3 h-3" />
                Matches
              </div>
              <div className="text-xs text-white/50 mt-1">Connections</div>
            </div>
          </div>

          {/* Boost Message */}
          <AnimatePresence>
            {boostMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-3 rounded-xl text-center ${
                  boostMessage.type === 'success' 
                    ? 'bg-neon-green/20 text-neon-green' 
                    : 'bg-neon-red/20 text-neon-red'
                }`}
              >
                {boostMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pump Profile Button */}
          <motion.button
            onClick={handleBoostClick}
            disabled={isBoosting || !!isBoosted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`mt-4 w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
              isBoosted 
                ? 'bg-gradient-to-r from-neon-purple/30 to-primary/30 text-white/60 cursor-not-allowed border border-neon-purple/30'
                : 'bg-gradient-to-r from-primary to-neon-green text-dark shadow-lg shadow-primary/30 hover:shadow-primary/50'
            }`}
          >
            {isBoosting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Pumping...
              </>
            ) : isBoosted ? (
              <>
                <Zap className="w-6 h-6" />
                Boosted! {boostTimeRemaining}m left
              </>
            ) : (
              <>
                <Rocket className="w-6 h-6" />
                🚀 PUMP PROFILE
              </>
            )}
          </motion.button>
          
          {!isBoosted && (
            <p className="text-center text-xs text-white/50 mt-2">
              500 $LOVE • +10% Price Pump • 30 min visibility boost
            </p>
          )}
        </div>

        {/* Activity Stats */}
        {stats && (
          <div className="card mt-4 p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Your Activity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Likes Received</span>
                <span className="font-bold text-neon-green">{stats.total_likes_received}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Likes Given</span>
                <span className="font-bold text-primary">{stats.total_likes_given}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Contracts Minted</span>
                <span className="font-bold text-neon-purple">{stats.total_contracts_minted}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-100/30 rounded-lg">
                <span className="text-white/60 text-sm">Market Rank</span>
                <span className="font-bold text-neon-yellow">#{stats.market_rank || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-3">
          <Link 
            to="/wallet" 
            onClick={() => haptic.impact('light')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/10 transition-all"
          >
            <div className="p-2 rounded-full bg-primary/20">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Connect Wallet</div>
              <div className="text-sm text-white/60">Link your TON wallet for rewards</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </Link>

          <Link 
            to="/tasks" 
            onClick={() => haptic.impact('light')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/10 transition-all"
          >
            <div className="p-2 rounded-full bg-neon-yellow/20">
              <Coins className="w-5 h-5 text-neon-yellow" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Earn More $LOVE</div>
              <div className="text-sm text-white/60">Complete tasks & daily missions</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </Link>

          <Link 
            to="/referrals" 
            onClick={() => haptic.impact('light')}
            className="w-full card p-4 flex items-center gap-4 hover:bg-white/10 transition-all"
          >
            <div className="p-2 rounded-full bg-neon-purple/20">
              <Users className="w-5 h-5 text-neon-purple" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Invite Friends</div>
              <div className="text-sm text-white/60">Get $LOVE for each referral</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-white/40 pb-4">
          <p>CryptoCrush v1.0.0 • Made with 💜</p>
          <p className="mt-1">User ID: {user.id?.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-100 rounded-t-3xl p-6"
            >
              {/* Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Settings
              </h2>
              
              {/* Settings Options */}
              <div className="space-y-4">
                {/* Change Photo */}
                <button
                  onClick={() => {
                    haptic.impact('light');
                    setShowSettings(false);
                    if (isDefaultAvatar(user)) {
                      setShowUploadTooltip(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="w-full p-4 bg-white/5 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/20">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Change Photo</div>
                    <div className="text-sm text-white/60">
                      {isDefaultAvatar(user) ? 'Upload to get verified (+10% boost)' : 'Update your profile picture'}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </button>
                
                {/* Notification Settings (Coming Soon) */}
                <div className="w-full p-4 bg-white/5 rounded-xl flex items-center gap-4 opacity-50">
                  <div className="p-2 rounded-full bg-neon-blue/20">
                    <Zap className="w-5 h-5 text-neon-blue" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Notifications</div>
                    <div className="text-sm text-white/60">Coming soon</div>
                  </div>
                </div>
                
                {/* Privacy Settings (Coming Soon) */}
                <div className="w-full p-4 bg-white/5 rounded-xl flex items-center gap-4 opacity-50">
                  <div className="p-2 rounded-full bg-neon-purple/20">
                    <Settings className="w-5 h-5 text-neon-purple" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Privacy</div>
                    <div className="text-sm text-white/60">Coming soon</div>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden file input for verified users */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Boost Confirmation Modal */}
      <AnimatePresence>
        {showBoostConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowBoostConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-sm w-full text-center"
            >
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">Pump Profile?</h3>
              <p className="text-white/70 mb-4">
                This will cost <span className="text-primary font-bold">500 $LOVE</span> and give you:
              </p>
              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neon-green" />
                  <span>+10% Market Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neon-yellow" />
                  <span>Top of feed for 30 minutes</span>
                </div>
              </div>
              <div className="text-sm text-white/50 mb-4">
                Your balance: <span className="text-primary">{formatNumber(user?.balance_love || 0)} $LOVE</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBoostConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 font-medium hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBoost}
                  disabled={isBoosting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-neon-green text-dark font-bold flex items-center justify-center gap-2"
                >
                  {isBoosting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Pump!
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
