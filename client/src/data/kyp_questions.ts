/**
 * KYP Challenge Questions
 * "Know Your Partner" - Test how well you know each other!
 * 
 * Categories:
 * - Spicy 🌶️: Relationship & intimate questions
 * - Finance 💰: Money habits & spending
 * - Life 🌟: Lifestyle & personality
 */

export type QuestionCategory = 'Spicy' | 'Finance' | 'Life';

export interface KYPQuestion {
  id: number;
  question: string;
  options: [string, string, string, string]; // A, B, C, D
  category: QuestionCategory;
  points: number; // Higher points for harder/spicier questions
}

export const KYP_QUESTIONS: KYPQuestion[] = [
  // ============================================
  // 🌶️ SPICY QUESTIONS (Higher risk, higher reward)
  // ============================================
  {
    id: 1,
    question: "How many exes does your partner have?",
    options: ["0-1", "2-3", "4-5", "I don't want to know 💀"],
    category: 'Spicy',
    points: 30,
  },
  {
    id: 2,
    question: "What's your partner's biggest turn-off in a relationship?",
    options: ["Dishonesty", "Clinginess", "Bad hygiene", "Being boring"],
    category: 'Spicy',
    points: 25,
  },
  {
    id: 3,
    question: "How would your partner react if their ex texted 'I miss you'?",
    options: ["Ignore completely", "Reply politely", "Show you first", "Block immediately"],
    category: 'Spicy',
    points: 30,
  },
  {
    id: 4,
    question: "What's the longest your partner has ever been single?",
    options: ["Less than 3 months", "3-12 months", "1-3 years", "Forever single until me 😏"],
    category: 'Spicy',
    points: 20,
  },
  {
    id: 5,
    question: "Your partner's love language is probably...",
    options: ["Words of Affirmation", "Physical Touch", "Quality Time", "Gifts & Acts of Service"],
    category: 'Spicy',
    points: 25,
  },
  {
    id: 6,
    question: "Who said 'I love you' first in your partner's last relationship?",
    options: ["My partner", "Their ex", "Neither", "They don't remember"],
    category: 'Spicy',
    points: 30,
  },
  {
    id: 7,
    question: "How jealous is your partner on a scale?",
    options: ["Not at all", "A little protective", "Moderately jealous", "FBI investigation level"],
    category: 'Spicy',
    points: 25,
  },
  {
    id: 8,
    question: "Your partner's biggest red flag they'd forgive is...",
    options: ["Being too busy", "Talking to exes", "Not being romantic", "Forgetting anniversaries"],
    category: 'Spicy',
    points: 25,
  },

  // ============================================
  // 💰 FINANCE QUESTIONS (Money habits)
  // ============================================
  {
    id: 20,
    question: "How does your partner feel about splitting bills on dates?",
    options: ["Always 50/50", "Whoever asks pays", "The higher earner pays", "Take turns"],
    category: 'Finance',
    points: 20,
  },
  {
    id: 21,
    question: "Your partner's spending style is...",
    options: ["Super saver 🏦", "Balanced budgeter", "Treat yourself type 🛍️", "YOLO spender"],
    category: 'Finance',
    points: 20,
  },
  {
    id: 22,
    question: "What would your partner spend a surprise $1000 on?",
    options: ["Invest/save it", "Shopping spree", "Travel experience", "Treat friends & family"],
    category: 'Finance',
    points: 20,
  },
  {
    id: 23,
    question: "Your partner's biggest financial guilt is...",
    options: ["Food delivery 🍕", "Online shopping", "Gaming/entertainment", "Subscriptions they forget"],
    category: 'Finance',
    points: 15,
  },
  {
    id: 24,
    question: "How much crypto does your partner probably hodl?",
    options: ["Zero, too risky", "A little for fun", "Moderate investment", "Diamond hands forever 💎"],
    category: 'Finance',
    points: 25,
  },
  {
    id: 25,
    question: "When buying expensive items, your partner...",
    options: ["Researches for weeks", "Buys impulsively", "Waits for sales", "Asks friends first"],
    category: 'Finance',
    points: 15,
  },
  {
    id: 26,
    question: "Your partner's ideal retirement age is...",
    options: ["30 (fire movement)", "45-50 early retire", "60 normal", "Never stopping"],
    category: 'Finance',
    points: 20,
  },
  {
    id: 27,
    question: "How open is your partner about money with partners?",
    options: ["Completely transparent", "Share basics only", "Keep separate", "Money is private"],
    category: 'Finance',
    points: 20,
  },

  // ============================================
  // 🌟 LIFE QUESTIONS (Lifestyle & personality)
  // ============================================
  {
    id: 40,
    question: "Your partner is a morning person or night owl?",
    options: ["Early bird 🌅", "Night owl 🦉", "Depends on the day", "Always tired 😴"],
    category: 'Life',
    points: 10,
  },
  {
    id: 41,
    question: "What's your partner's go-to comfort food?",
    options: ["Pizza/Fast food", "Home-cooked meal", "Ramen/Noodles", "Ice cream/Desserts"],
    category: 'Life',
    points: 10,
  },
  {
    id: 42,
    question: "On weekends, your partner prefers to...",
    options: ["Stay in & relax", "Go out socializing", "Productive activities", "Adventure outdoors"],
    category: 'Life',
    points: 15,
  },
  {
    id: 43,
    question: "Your partner's dream travel destination is...",
    options: ["Beach paradise 🏝️", "European culture trip", "Asian adventure", "Local exploration"],
    category: 'Life',
    points: 15,
  },
  {
    id: 44,
    question: "How does your partner handle stress?",
    options: ["Talks it out", "Needs alone time", "Exercises/Physical activity", "Distracts with entertainment"],
    category: 'Life',
    points: 20,
  },
  {
    id: 45,
    question: "Your partner's biggest pet peeve is probably...",
    options: ["Being late", "Loud chewing", "Phone during meals", "Messy spaces"],
    category: 'Life',
    points: 15,
  },
  {
    id: 46,
    question: "In an argument, your partner typically...",
    options: ["Needs to win", "Seeks compromise", "Goes silent", "Gets emotional"],
    category: 'Life',
    points: 20,
  },
  {
    id: 47,
    question: "Your partner's ideal pet would be...",
    options: ["Dog 🐕", "Cat 🐱", "No pets", "Something exotic"],
    category: 'Life',
    points: 10,
  },
  {
    id: 48,
    question: "How often does your partner exercise?",
    options: ["Daily gym rat", "Few times a week", "Occasionally", "Does walking count?"],
    category: 'Life',
    points: 10,
  },
  {
    id: 49,
    question: "Your partner's Netflix style is...",
    options: ["Binge entire series", "One episode at a time", "Background noise", "Prefer YouTube/TikTok"],
    category: 'Life',
    points: 10,
  },
  {
    id: 50,
    question: "What would your partner choose: $1M now or $10M in 10 years?",
    options: ["$1M now, YOLO", "$10M, patience pays", "Depends on inflation", "Can I have both?"],
    category: 'Life',
    points: 15,
  },
];

// Helper functions
export function getQuestionsByCategory(category: QuestionCategory): KYPQuestion[] {
  return KYP_QUESTIONS.filter(q => q.category === category);
}

export function getRandomQuestions(count: number, mix: boolean = true): KYPQuestion[] {
  if (mix) {
    // Get balanced mix from each category
    const spicy = getQuestionsByCategory('Spicy');
    const finance = getQuestionsByCategory('Finance');
    const life = getQuestionsByCategory('Life');
    
    const perCategory = Math.ceil(count / 3);
    
    const shuffled = [
      ...shuffleArray(spicy).slice(0, perCategory),
      ...shuffleArray(finance).slice(0, perCategory),
      ...shuffleArray(life).slice(0, perCategory),
    ];
    
    return shuffleArray(shuffled).slice(0, count);
  }
  
  return shuffleArray([...KYP_QUESTIONS]).slice(0, count);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Game constants
export const KYP_GAME_CONFIG = {
  QUESTIONS_PER_GAME: 10,
  BET_AMOUNT: 10, // $LOVE per question
  TIME_TO_ANSWER: 30, // seconds
  TIME_TO_BET: 10, // seconds
  MIN_BET: 5,
  MAX_BET: 100,
  MATCH_BONUS_MULTIPLIER: 2, // Double the pot on match
  STREAK_BONUS: [0, 0, 0, 10, 15, 20, 25, 30, 40, 50, 100], // Bonus at streak milestones
};

export const CATEGORY_EMOJIS: Record<QuestionCategory, string> = {
  'Spicy': '🌶️',
  'Finance': '💰', 
  'Life': '🌟',
};

export const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  'Spicy': 'from-red-500 to-pink-500',
  'Finance': 'from-yellow-500 to-orange-500',
  'Life': 'from-blue-500 to-purple-500',
};
