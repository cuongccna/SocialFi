/**
 * Shop Service
 * Love Decor Shop - API calls for buying and equipping decorations
 */

import { api } from '../api/axiosClient';
import { type AxiosResponse } from 'axios';

// ============================================
// Types
// ============================================

export type ItemCategory = 'WALLPAPER' | 'PET' | 'FURNITURE' | 'EFFECT';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  price: number;
  is_premium: boolean;
  asset_url: string;
  thumbnail_url: string;
  z_index: number;
  position_hint: string;
  is_animated: boolean;
  is_owned?: boolean;
}

export interface GroupedShopItems {
  WALLPAPER: ShopItem[];
  PET: ShopItem[];
  FURNITURE: ShopItem[];
  EFFECT: ShopItem[];
}

export interface DecorItem {
  id: string;
  name: string;
  url: string;
  position?: string;
  isAnimated: boolean;
}

export interface RelationshipDecor {
  wallpaper: DecorItem | null;
  pet: DecorItem | null;
  furniture: DecorItem | null;
  effect: DecorItem | null;
}

export interface BuyItemResponse {
  success: boolean;
  message: string;
  item: {
    id: string;
    name: string;
    category: ItemCategory;
  };
  newBalance: number;
  spent: number;
}

export interface EquipItemResponse {
  success: boolean;
  message: string;
  equipped: {
    category: ItemCategory;
    item_id: string;
  };
}

// ============================================
// API Functions
// ============================================

/**
 * Get all shop items grouped by category
 */
export async function getShopItems(): Promise<GroupedShopItems> {
  const response: AxiosResponse<{ success: boolean; items: GroupedShopItems }> = await api.get('/shop/items');
  return response.data.items;
}

/**
 * Get user's inventory (owned items)
 */
export async function getUserInventory(): Promise<GroupedShopItems> {
  const response: AxiosResponse<{ success: boolean; inventory: GroupedShopItems }> = await api.get('/shop/inventory');
  return response.data.inventory;
}

/**
 * Purchase an item from the shop
 */
export async function buyItem(itemId: string): Promise<BuyItemResponse> {
  const response: AxiosResponse<BuyItemResponse> = await api.post('/shop/buy', { item_id: itemId });
  return response.data;
}

/**
 * Equip an item to a relationship's chat
 */
export async function equipItem(itemId: string, relationshipId: string): Promise<EquipItemResponse> {
  const response: AxiosResponse<EquipItemResponse> = await api.post('/shop/equip', { 
    item_id: itemId, 
    relationship_id: relationshipId 
  });
  return response.data;
}

/**
 * Unequip an item from a relationship's chat
 */
export async function unequipItem(category: ItemCategory, relationshipId: string): Promise<{ success: boolean; message: string }> {
  const response: AxiosResponse<{ success: boolean; message: string }> = await api.post('/shop/unequip', { 
    category, 
    relationship_id: relationshipId 
  });
  return response.data;
}

/**
 * Get active decorations for a relationship
 */
export async function getRelationshipDecor(relationshipId: string): Promise<RelationshipDecor> {
  const response: AxiosResponse<{ success: boolean; decor: RelationshipDecor }> = await api.get(`/shop/decor/${relationshipId}`);
  return response.data.decor;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get position CSS classes for an item
 */
export function getPositionClasses(position: string): string {
  switch (position) {
    case 'bottom-left':
      return 'absolute bottom-20 left-4';
    case 'bottom-right':
      return 'absolute bottom-20 right-4';
    case 'bottom-center':
      return 'absolute bottom-20 left-1/2 -translate-x-1/2';
    case 'top-center':
      return 'absolute top-4 left-1/2 -translate-x-1/2';
    case 'overlay':
      return 'absolute inset-0 pointer-events-none';
    default:
      return 'absolute bottom-20 left-4';
  }
}

/**
 * Category icons for tabs
 */
export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  WALLPAPER: '🖼️',
  PET: '🐱',
  FURNITURE: '🛋️',
  EFFECT: '✨',
};

/**
 * Category labels
 */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  WALLPAPER: 'Wallpapers',
  PET: 'Pets',
  FURNITURE: 'Furniture',
  EFFECT: 'Effects',
};
