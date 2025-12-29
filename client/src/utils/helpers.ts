/**
 * Helper utilities for CryptoCrush
 */

interface UserForAvatar {
  id?: string;
  username?: string | null;
  avatar_url?: string | null;
}

/**
 * Get avatar URL for a user
 * Returns DiceBear cyberpunk robot avatar if no avatar is set
 */
export function getAvatarUrl(user: UserForAvatar): string {
  if (user.avatar_url && user.avatar_url.trim() !== '') {
    return user.avatar_url;
  }
  
  // Use username for seed if available, otherwise use id
  const seed = user.username || user.id || 'anonymous';
  
  // DiceBear bottts-neutral - cool robot avatars
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

/**
 * Check if user is using a default/generated avatar
 */
export function isDefaultAvatar(user: UserForAvatar): boolean {
  return !user.avatar_url || user.avatar_url.trim() === '';
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * CSS class for avatar ring styling (neon border)
 */
export const avatarRingClass = 'ring-2 ring-offset-2 ring-offset-dark ring-neon-green';
