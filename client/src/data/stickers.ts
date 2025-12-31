/**
 * Crypto Stickers Data
 * Using verified working URLs from stable sources
 */

export interface Sticker {
  id: string;
  name: string;
  url: string;
  category: 'love' | 'crypto' | 'reactions' | 'moon';
}

export const CRYPTO_STICKERS: Sticker[] = [
  // Love & Dating - Verified working URLs
  {
    id: 'heart-pulse',
    name: 'Heart',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/beating-heart_1f493.gif',
    category: 'love',
  },
  {
    id: 'sparkling-heart',
    name: 'Sparkling',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/sparkling-heart_1f496.gif',
    category: 'love',
  },
  {
    id: 'growing-heart',
    name: 'Growing',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/growing-heart_1f497.gif',
    category: 'love',
  },
  {
    id: 'two-hearts',
    name: 'Two Hearts',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/two-hearts_1f495.gif',
    category: 'love',
  },
  {
    id: 'kiss-mark',
    name: 'Kiss',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/kiss-mark_1f48b.gif',
    category: 'love',
  },
  
  // Crypto & Finance
  {
    id: 'rocket',
    name: 'Rocket',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/rocket_1f680.gif',
    category: 'moon',
  },
  {
    id: 'gem',
    name: 'Diamond',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/gem-stone_1f48e.gif',
    category: 'crypto',
  },
  {
    id: 'money-bag',
    name: 'Money Bag',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/money-bag_1f4b0.gif',
    category: 'crypto',
  },
  {
    id: 'money-wings',
    name: 'Money Wings',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/money-with-wings_1f4b8.gif',
    category: 'crypto',
  },
  {
    id: 'chart-up',
    name: 'Chart Up',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/chart-increasing_1f4c8.gif',
    category: 'crypto',
  },
  
  // Reactions
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/thumbs-up_1f44d.gif',
    category: 'reactions',
  },
  {
    id: 'fire',
    name: 'Fire',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/fire_1f525.gif',
    category: 'reactions',
  },
  {
    id: 'party',
    name: 'Party',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/party-popper_1f389.gif',
    category: 'reactions',
  },
  {
    id: 'clap',
    name: 'Clap',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/clapping-hands_1f44f.gif',
    category: 'reactions',
  },
  {
    id: 'star-eyes',
    name: 'Star Eyes',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/star-struck_1f929.gif',
    category: 'reactions',
  },
  
  // Moon & Celebration
  {
    id: 'star',
    name: 'Star',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/glowing-star_1f31f.gif',
    category: 'moon',
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/sparkles_2728.gif',
    category: 'moon',
  },
  {
    id: 'trophy',
    name: 'Trophy',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/trophy_1f3c6.gif',
    category: 'crypto',
  },
  {
    id: 'crown',
    name: 'Crown',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/crown_1f451.gif',
    category: 'crypto',
  },
  {
    id: 'hundred',
    name: '100',
    url: 'https://em-content.zobj.net/source/animated-noto-color-emoji/356/hundred-points_1f4af.gif',
    category: 'reactions',
  },
];

// Sticker reward amount
export const STICKER_REWARD = 0.5;
