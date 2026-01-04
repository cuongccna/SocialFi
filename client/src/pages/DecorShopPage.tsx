/**
 * DecorShopPage - Love Decor Shop
 * Browse, preview, buy and equip chat decorations
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ShoppingBag, Check, X, Loader2, Sparkles,
  Image, Cat, Armchair, Wand2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../utils/telegram';
import {
  getShopItems,
  buyItem,
  equipItem,
  type ShopItem,
  type GroupedShopItems,
  type ItemCategory,
  CATEGORY_LABELS,
} from '../services/shop.service';

const CATEGORY_TABS: { key: ItemCategory; icon: typeof Image; label: string }[] = [
  { key: 'WALLPAPER', icon: Image, label: 'Walls' },
  { key: 'PET', icon: Cat, label: 'Pets' },
  { key: 'FURNITURE', icon: Armchair, label: 'Decor' },
  { key: 'EFFECT', icon: Wand2, label: 'Effects' },
];

export default function DecorShopPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const relationshipId = searchParams.get('relationship');
  
  // State
  const [items, setItems] = useState<GroupedShopItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ItemCategory>('WALLPAPER');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load shop items
  useEffect(() => {
    loadShopItems();
  }, []);

  async function loadShopItems() {
    try {
      setIsLoading(true);
      const data = await getShopItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load shop items:', err);
      showNotification('error', 'Failed to load shop items');
    } finally {
      setIsLoading(false);
    }
  }

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleBuy(item: ShopItem) {
    if (!user || isBuying) return;
    
    const balance = parseFloat(String(user.balance_love || 0));
    if (balance < item.price) {
      haptic.notification('error');
      showNotification('error', `Not enough $LOVE! Need ${item.price}, have ${balance.toFixed(0)}`);
      return;
    }

    try {
      setIsBuying(true);
      haptic.impact('medium');
      
      await buyItem(item.id);
      
      // Update local state
      if (items) {
        const updatedItems = { ...items };
        updatedItems[item.category] = updatedItems[item.category].map(i => 
          i.id === item.id ? { ...i, is_owned: true } : i
        );
        setItems(updatedItems);
      }
      
      // Refresh user balance
      refreshUser?.();
      
      haptic.notification('success');
      showNotification('success', `🎉 Purchased ${item.name}!`);
      setShowPreview(false);
      
    } catch (err: any) {
      haptic.notification('error');
      showNotification('error', err.response?.data?.message || 'Failed to purchase item');
    } finally {
      setIsBuying(false);
    }
  }

  async function handleEquip(item: ShopItem) {
    if (!relationshipId || isEquipping) {
      if (!relationshipId) {
        showNotification('error', 'Open shop from a chat to equip items');
      }
      return;
    }

    try {
      setIsEquipping(true);
      haptic.impact('medium');
      
      await equipItem(item.id, relationshipId);
      
      haptic.notification('success');
      showNotification('success', `✨ ${item.name} equipped!`);
      setShowPreview(false);
      
      // Navigate back to chat
      setTimeout(() => {
        navigate(-1);
      }, 1000);
      
    } catch (err: any) {
      haptic.notification('error');
      showNotification('error', err.response?.data?.message || 'Failed to equip item');
    } finally {
      setIsEquipping(false);
    }
  }

  function openPreview(item: ShopItem) {
    setSelectedItem(item);
    setShowPreview(true);
    haptic.impact('light');
  }

  const currentItems = items?.[activeTab] || [];
  const balance = parseFloat(String(user?.balance_love || 0));

  return (
    <div 
      className="h-full flex flex-col bg-dark"
      style={{ paddingTop: 'var(--tg-content-safe-area-inset-top, 0px)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 bg-dark-100/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Love Decor Shop
              </h1>
              <p className="text-xs text-white/60">Customize your Penthouse</p>
            </div>
          </div>
          
          {/* Balance */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-green-500/20 rounded-full px-3 py-1.5">
            <span className="text-sm font-bold text-yellow-400">
              💰 {balance.toFixed(0)} $LOVE
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  haptic.impact('light');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-dark font-semibold'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🏪</div>
            <p className="text-white/60">No items available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {currentItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => openPreview(item)}
                className="relative bg-dark-200 rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all group"
                whileTap={{ scale: 0.98 }}
              >
                {/* Thumbnail */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={item.thumbnail_url || item.asset_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  
                  {/* Premium Badge */}
                  {item.is_premium && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-2 py-0.5">
                      <span className="text-xs font-bold text-dark">⭐ VIP</span>
                    </div>
                  )}
                  
                  {/* Owned Badge */}
                  {item.is_owned && (
                    <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1">
                      <Check className="w-3 h-3 text-dark" />
                    </div>
                  )}
                  
                  {/* Animated indicator */}
                  {item.is_animated && (
                    <div className="absolute bottom-2 right-2 bg-black/60 rounded-full px-2 py-0.5">
                      <span className="text-xs">🎬 GIF</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{item.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    {item.is_owned ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Owned
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400 font-medium">
                        💎 {item.price} $LOVE
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="fixed inset-x-4 bottom-4 top-auto max-h-[80vh] bg-dark-100 rounded-2xl z-50 overflow-hidden border border-white/10 shadow-2xl"
            >
              {/* Preview Image */}
              <div className="relative aspect-video bg-dark-200 overflow-hidden">
                {/* Mock Chat Preview Background */}
                <div className="absolute inset-0">
                  {selectedItem.category === 'WALLPAPER' ? (
                    <img
                      src={selectedItem.asset_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-dark-100 to-dark-200" />
                  )}
                </div>
                
                {/* Semi-transparent overlay to simulate chat */}
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Pet/Furniture Preview */}
                {(selectedItem.category === 'PET' || selectedItem.category === 'FURNITURE') && (
                  <img
                    src={selectedItem.asset_url}
                    alt={selectedItem.name}
                    className={`absolute w-20 h-20 object-contain ${
                      selectedItem.position_hint === 'bottom-right' 
                        ? 'bottom-4 right-4' 
                        : selectedItem.position_hint === 'top-center'
                        ? 'top-4 left-1/2 -translate-x-1/2'
                        : 'bottom-4 left-4'
                    }`}
                  />
                )}
                
                {/* Effect Preview */}
                {selectedItem.category === 'EFFECT' && (
                  <img
                    src={selectedItem.asset_url}
                    alt={selectedItem.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
                  />
                )}
                
                {/* Mock Chat Messages */}
                <div className="absolute inset-x-4 bottom-4 space-y-2">
                  <div className="bg-white/20 rounded-2xl rounded-bl-md px-4 py-2 max-w-[60%] backdrop-blur-sm">
                    <p className="text-sm">Love this decor! 💕</p>
                  </div>
                  <div className="bg-primary/80 rounded-2xl rounded-br-md px-4 py-2 max-w-[60%] ml-auto">
                    <p className="text-sm text-dark">Our penthouse looks amazing! ✨</p>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setShowPreview(false)}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {/* Preview Badge */}
                <div className="absolute top-3 left-3 bg-black/50 rounded-full px-3 py-1">
                  <span className="text-xs font-medium">👁️ Preview</span>
                </div>
              </div>

              {/* Item Details */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                    <p className="text-sm text-white/60 mt-1">{selectedItem.description}</p>
                  </div>
                  {selectedItem.is_premium && (
                    <span className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-3 py-1 text-xs font-bold text-dark">
                      ⭐ Premium
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                  <span className="px-2 py-0.5 bg-white/10 rounded-full">
                    {CATEGORY_LABELS[selectedItem.category]}
                  </span>
                  {selectedItem.is_animated && (
                    <span className="px-2 py-0.5 bg-white/10 rounded-full">
                      🎬 Animated
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {selectedItem.is_owned ? (
                    <>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => handleEquip(selectedItem)}
                        disabled={isEquipping || !relationshipId}
                        className="flex-1 py-3 rounded-xl bg-primary text-dark font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isEquipping ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Equip
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleBuy(selectedItem)}
                        disabled={isBuying || balance < selectedItem.price}
                        className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                          balance < selectedItem.price
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gradient-to-r from-yellow-500 to-green-500 text-dark'
                        }`}
                      >
                        {isBuying ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : balance < selectedItem.price ? (
                          <>Not enough $LOVE</>
                        ) : (
                          <>
                            💎 Buy for {selectedItem.price}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-4 right-4 p-4 rounded-xl z-[60] ${
              notification.type === 'success' 
                ? 'bg-green-500/90' 
                : 'bg-red-500/90'
            } backdrop-blur-sm`}
          >
            <p className="text-center font-medium text-white">
              {notification.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
