/**
 * Telegram WebApp SDK Setup
 * Centralized utilities for Telegram Mini App integration
 */

import WebApp from '@twa-dev/sdk';

/**
 * Initialize Telegram WebApp
 * Call this once when the app mounts
 */
export function initTelegramWebApp(): void {
  try {
    // Notify Telegram that the Mini App is ready to be displayed
    WebApp.ready();

    // Expand the Mini App to full height
    WebApp.expand();

    // Set theme colors to match CryptoCrush dark theme
    WebApp.setHeaderColor('#0a0a0f');
    WebApp.setBackgroundColor('#0a0a0f');

    console.log('✅ Telegram WebApp initialized');
    console.log('   Platform:', WebApp.platform);
    console.log('   Version:', WebApp.version);
    console.log('   Theme:', WebApp.colorScheme);
  } catch (error) {
    console.warn('⚠️ Telegram WebApp initialization failed:', error);
  }
}

/**
 * Get raw initData string for backend verification
 * This is the HMAC-SHA256 signed data that the backend will validate
 * @returns Raw initData string or empty string if not in Telegram
 */
export function getInitData(): string {
  return WebApp.initData || '';
}

/**
 * Get parsed initData for quick UI display
 * WARNING: This data is NOT verified - use only for UI display, never for security decisions
 * @returns Parsed initDataUnsafe object
 */
export function getInitDataUnsafe(): typeof WebApp.initDataUnsafe {
  return WebApp.initDataUnsafe;
}

/**
 * Get Telegram user info from initDataUnsafe
 * @returns Telegram user object or null if not available
 */
export function getTelegramUser() {
  return WebApp.initDataUnsafe?.user || null;
}

/**
 * Check if running inside Telegram
 * @returns true if running in Telegram Mini App environment
 */
export function isInTelegram(): boolean {
  return Boolean(WebApp.initData);
}

/**
 * Get Telegram WebApp instance for advanced usage
 */
export { WebApp };

// Haptic feedback utilities
export const haptic = {
  /**
   * Trigger impact haptic feedback
   */
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    try {
      WebApp.HapticFeedback?.impactOccurred(style);
    } catch (e) {
      // Silently fail if haptic not supported
    }
  },

  /**
   * Trigger notification haptic feedback
   */
  notification: (type: 'error' | 'success' | 'warning') => {
    try {
      WebApp.HapticFeedback?.notificationOccurred(type);
    } catch (e) {
      // Silently fail if haptic not supported
    }
  },

  /**
   * Trigger selection change haptic feedback
   */
  selection: () => {
    try {
      WebApp.HapticFeedback?.selectionChanged();
    } catch (e) {
      // Silently fail if haptic not supported
    }
  },
};

// Main Button utilities
export const mainButton = {
  /**
   * Show and configure the main button
   */
  show: (text: string, onClick: () => void) => {
    try {
      WebApp.MainButton.setText(text);
      WebApp.MainButton.onClick(onClick);
      WebApp.MainButton.show();
    } catch (e) {
      console.warn('MainButton not available');
    }
  },

  /**
   * Hide the main button
   */
  hide: () => {
    try {
      WebApp.MainButton.hide();
    } catch (e) {
      // Silently fail
    }
  },

  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => {
    try {
      if (loading) {
        WebApp.MainButton.showProgress();
      } else {
        WebApp.MainButton.hideProgress();
      }
    } catch (e) {
      // Silently fail
    }
  },
};

// Back Button utilities
export const backButton = {
  /**
   * Show the back button with a click handler
   */
  show: (onClick: () => void) => {
    try {
      WebApp.BackButton.onClick(onClick);
      WebApp.BackButton.show();
    } catch (e) {
      console.warn('BackButton not available');
    }
  },

  /**
   * Hide the back button
   */
  hide: () => {
    try {
      WebApp.BackButton.hide();
    } catch (e) {
      // Silently fail
    }
  },
};
