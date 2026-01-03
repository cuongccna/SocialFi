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
    // Expand the Mini App to full height FIRST
    WebApp.expand();

    // Request fullscreen mode (Telegram v7.7+) - with version check
    if (WebApp.isVersionAtLeast?.('7.7') && typeof WebApp.requestFullscreen === 'function') {
      try {
        WebApp.requestFullscreen();
      } catch (e) {
        console.warn('Fullscreen not available:', e);
      }
    }

    // Enable closing confirmation to prevent accidental swipes during gameplay (v6.2+)
    if (WebApp.isVersionAtLeast?.('6.2') && typeof WebApp.enableClosingConfirmation === 'function') {
      try {
        WebApp.enableClosingConfirmation();
      } catch (e) {
        console.warn('Closing confirmation not available:', e);
      }
    }

    // Set theme colors to match CryptoCrush dark theme (merge header)
    try {
      WebApp.setHeaderColor('#000000');
      WebApp.setBackgroundColor('#0a0a0f');
    } catch (e) {
      console.warn('Theme colors not available:', e);
    }

    // Disable vertical swipes to prevent interference with in-app scrolling (v7.7+)
    if (WebApp.isVersionAtLeast?.('7.7') && typeof WebApp.disableVerticalSwipes === 'function') {
      try {
        WebApp.disableVerticalSwipes();
      } catch (e) {
        console.warn('Disable vertical swipes not available:', e);
      }
    }

    // Lock orientation to portrait if supported (v8.0+)
    if (WebApp.isVersionAtLeast?.('8.0') && typeof WebApp.lockOrientation === 'function') {
      try {
        WebApp.lockOrientation();
      } catch (e) {
        console.warn('Lock orientation not available:', e);
      }
    }

    // Signal that the app is ready to be displayed
    WebApp.ready();

    // Set viewport height CSS variable for proper mobile sizing
    const setViewportHeight = () => {
      const vh = WebApp.viewportHeight || window.innerHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${WebApp.viewportStableHeight || vh}px`);
    };
    
    setViewportHeight();
    
    // Listen for viewport changes if available
    if (typeof WebApp.onEvent === 'function') {
      WebApp.onEvent('viewportChanged', setViewportHeight);
    }

    console.log('✅ Telegram WebApp initialized');
    console.log('   Platform:', WebApp.platform);
    console.log('   Version:', WebApp.version);
    console.log('   Theme:', WebApp.colorScheme);
    console.log('   Viewport:', WebApp.viewportHeight, 'px');
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
