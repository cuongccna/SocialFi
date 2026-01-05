/**
 * Authentication Context
 * Manages user authentication state and provides auth data globally
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { api } from '../api/axiosClient';
import { getInitDataUnsafe, isInTelegram } from '../utils/telegram';
import type { User } from '../types';

// Auth response from backend
interface AuthResponse {
  success: boolean;
  user: User;
  token?: string;
  message?: string;
}

// Context state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Context value including actions
interface AuthContextValue extends AuthState {
  // Telegram user info (from initDataUnsafe, for quick UI display)
  telegramUser: ReturnType<typeof getInitDataUnsafe>['user'] | null;
  
  // Refresh user data from backend
  refreshUser: () => Promise<void>;
  
  // Logout (clear local state)
  logout: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextValue | null>(null);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Get Telegram user info for quick UI display
  const telegramUser = getInitDataUnsafe()?.user || null;

  /**
   * Authenticate user with backend
   */
  const authenticate = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if running in Telegram
      if (!isInTelegram()) {
        console.warn('⚠️ Not running in Telegram - using mock auth for development');
        
        // In development, create a mock user for testing
        if (import.meta.env.DEV) {
          const mockUser: User = {
            id: 'dev-user-1',
            telegram_id: 123456789,
            username: 'dev_user',
            display_name: 'Developer',
            bio: 'Testing CryptoCrush',
            avatar_url: null,
            latitude: 10.7769,
            longitude: 106.6958,
            wallet_address: null,
            wallet_rank: 'SHRIMP',
            market_price: 100,
            price_change_24h: 0,
            balance_love: 500,
            is_active: true,
            last_active_at: new Date().toISOString(),
            boosted_until: null,
            job_title: null,
            interests: null,
            assets: null,
            photos: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setState({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }

        throw new Error('Must run inside Telegram Mini App');
      }

      // Call backend auth endpoint
      const response = await api.post<AuthResponse>('/auth/login');

      if (response.success && response.user) {
        console.log('✅ Authenticated successfully:', response.user.display_name);
        
        setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(response.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Authentication failed';

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  /**
   * Refresh user data from backend
   */
  const refreshUser = async () => {
    if (!state.isAuthenticated) return;

    try {
      const response = await api.get<{ user: User }>('/auth/me');
      
      if (response.user) {
        setState(prev => ({
          ...prev,
          user: response.user,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  /**
   * Logout - clear local state
   */
  const logout = () => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  // Authenticate on mount
  useEffect(() => {
    authenticate();
  }, []);

  // Context value
  const value: AuthContextValue = {
    ...state,
    telegramUser,
    refreshUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Loading Screen Component
 * Shown while authentication is in progress
 */
export function AuthLoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-dark">
      <div className="text-center">
        {/* Spinning loader */}
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        
        {/* Loading text */}
        <p className="text-white/60 text-lg mb-2">Loading CryptoCrush...</p>
        <p className="text-white/40 text-sm">Verifying your identity 🔐</p>
      </div>
    </div>
  );
}

/**
 * Error Screen Component
 * Shown when authentication fails
 */
interface AuthErrorScreenProps {
  error: string;
  onRetry?: () => void;
}

export function AuthErrorScreen({ error, onRetry }: AuthErrorScreenProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-dark p-6">
      <div className="text-center max-w-sm">
        {/* Error icon */}
        <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">❌</span>
        </div>
        
        {/* Error message */}
        <h2 className="text-white text-xl font-bold mb-2">Authentication Failed</h2>
        <p className="text-white/60 mb-6">{error}</p>
        
        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-primary text-dark font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        )}
        
        {/* Help text */}
        <p className="text-white/40 text-sm mt-4">
          Make sure you're opening this app from Telegram
        </p>
      </div>
    </div>
  );
}
