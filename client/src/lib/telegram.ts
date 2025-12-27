/**
 * Telegram WebApp SDK wrapper
 * Provides type-safe access to Telegram Mini App features
 */

import WebApp from '@twa-dev/sdk';

// Initialize Telegram WebApp
export function initTelegramApp() {
  try {
    // Tell Telegram that the Mini App is ready
    WebApp.ready();
    
    // Expand to full height
    WebApp.expand();
    
    // Enable closing confirmation (optional)
    // WebApp.enableClosingConfirmation();
    
    // Set header color to match our dark theme
    WebApp.setHeaderColor('#0a0a0f');
    WebApp.setBackgroundColor('#0a0a0f');
    
    console.log('✅ Telegram WebApp initialized');
    console.log('   Platform:', WebApp.platform);
    console.log('   Version:', WebApp.version);
    console.log('   Theme:', WebApp.colorScheme);
    
    return true;
  } catch (error) {
    console.warn('⚠️ Not running inside Telegram:', error);
    return false;
  }
}

// Get user info from Telegram
export function getTelegramUser() {
  return WebApp.initDataUnsafe?.user || null;
}

// Get init data for authentication
export function getInitData() {
  return WebApp.initData;
}

// Haptic feedback
export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    WebApp.HapticFeedback?.impactOccurred(style);
  },
  notification: (type: 'error' | 'success' | 'warning') => {
    WebApp.HapticFeedback?.notificationOccurred(type);
  },
  selection: () => {
    WebApp.HapticFeedback?.selectionChanged();
  },
};

// Show native Telegram popup
export function showPopup(params: {
  title?: string;
  message: string;
  buttons?: Parameters<typeof WebApp.showPopup>[0]['buttons'];
}): Promise<string> {
  return new Promise((resolve) => {
    WebApp.showPopup(
      {
        title: params.title,
        message: params.message,
        buttons: params.buttons || [{ type: 'ok' }],
      },
      (buttonId) => {
        resolve(buttonId || 'ok');
      }
    );
  });
}

// Show native alert
export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    WebApp.showAlert(message, () => resolve());
  });
}

// Show native confirm
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    WebApp.showConfirm(message, (confirmed) => resolve(confirmed));
  });
}

// Close the Mini App
export function closeApp() {
  WebApp.close();
}

// Open external link
export function openLink(url: string, tryInstantView = false) {
  WebApp.openLink(url, { try_instant_view: tryInstantView });
}

// Open Telegram link (channels, users, etc.)
export function openTelegramLink(url: string) {
  WebApp.openTelegramLink(url);
}

// Main button controls
export const mainButton = {
  show: (text: string, onClick: () => void) => {
    WebApp.MainButton.setText(text);
    WebApp.MainButton.onClick(onClick);
    WebApp.MainButton.show();
  },
  hide: () => {
    WebApp.MainButton.hide();
  },
  showProgress: (leaveActive = true) => {
    WebApp.MainButton.showProgress(leaveActive);
  },
  hideProgress: () => {
    WebApp.MainButton.hideProgress();
  },
  setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean }) => {
    WebApp.MainButton.setParams(params);
  },
};

// Back button controls
export const backButton = {
  show: (onClick: () => void) => {
    WebApp.BackButton.onClick(onClick);
    WebApp.BackButton.show();
  },
  hide: () => {
    WebApp.BackButton.hide();
  },
};

// Check if running in Telegram
export function isInTelegram(): boolean {
  return !!WebApp.initData;
}

// Get theme params
export function getThemeParams() {
  return WebApp.themeParams;
}

// Export WebApp for direct access if needed
export { WebApp };

// TypeScript declaration for Telegram on window
declare global {
  interface Window {
    Telegram?: {
      WebApp?: typeof WebApp;
    };
  }
}
