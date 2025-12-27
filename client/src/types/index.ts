// User types
export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  wallet_address: string | null;
  wallet_rank: 'WHALE' | 'SHARK' | 'SHRIMP';
  market_price: number;
  price_change_24h: number;
  balance_love: number;
  is_active: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

// Feed user (includes distance)
export interface FeedUser extends User {
  distance_km: number;
}

// Swipe types
export type SwipeAction = 'LIKE' | 'PASS' | 'SUPER';

export interface SwipeResult {
  action: SwipeAction;
  target_id: string;
  match: boolean;
  market_impact: {
    price_change_percent: number;
    new_price: number;
  };
  reward: {
    love_earned: number;
  };
  relationship?: {
    id: string;
    status: string;
    message: string;
    match_pump: string;
  };
}

// Relationship types
export interface Relationship {
  id: string;
  user_a: string;
  user_b: string;
  status: 'MATCHED' | 'MINTED_CONTRACT' | 'BURNED_CONTRACT';
  contract_address: string | null;
  contract_minted_at: string | null;
  contract_burned_at: string | null;
  start_date: string;
  created_at: string;
  updated_at: string;
}

// Prediction Market types
export interface PredictionMarket {
  id: string;
  relationship_id: string;
  expiry_date: string;
  pool_long: number;
  pool_short: number;
  status: 'OPEN' | 'CLOSED' | 'PAYOUT_LONG' | 'PAYOUT_SHORT';
  created_at: string;
  settled_at: string | null;
}

// Bet types
export type BetPosition = 'LONG' | 'SHORT';

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  position: BetPosition;
  amount: number;
  is_settled: boolean;
  payout_amount: number;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

// Feed response
export interface FeedResponse {
  users: FeedUser[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  search: {
    radiusKm: number;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

// Telegram user from initData
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}
