/**
 * AI Controller
 * "AI Rizz God" - Gemini-powered pickup line suggestions
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');

// Gemini configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

// Cost for using AI Rizz God feature
const RIZZ_COST_LOVE = 20;

/**
 * POST /chat/ai-suggestion
 * Generate AI pickup line suggestions based on partner's profile
 * Costs 20 $LOVE per use
 */
async function getAISuggestion(req, res, next) {
  const client = await getClient();

  try {
    const userId = req.user.id;
    const { partner_id } = req.body;

    if (!partner_id) {
      throw new ApiError(400, 'Partner ID is required');
    }

    await client.query('BEGIN');

    // 1. Check user's balance
    const userResult = await client.query(
      'SELECT id, display_name, balance_love FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.balance_love) || 0;

    if (currentBalance < RIZZ_COST_LOVE) {
      await client.query('ROLLBACK');
      return res.status(402).json({
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient $LOVE balance. You need ${RIZZ_COST_LOVE} $LOVE but have ${currentBalance.toFixed(2)}.`,
        required: RIZZ_COST_LOVE,
        current_balance: currentBalance,
      });
    }

    // 2. Fetch partner's profile
    const partnerResult = await client.query(`
      SELECT 
        id,
        display_name,
        bio,
        wallet_rank,
        market_price,
        price_change_24h
      FROM users 
      WHERE id = $1 AND is_active = TRUE
    `, [partner_id]);

    if (partnerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new ApiError(404, 'Partner not found');
    }

    const partner = partnerResult.rows[0];

    // 3. Deduct $LOVE from user's balance
    await client.query(
      'UPDATE users SET balance_love = balance_love - $2, updated_at = NOW() WHERE id = $1',
      [userId, RIZZ_COST_LOVE]
    );

    await client.query('COMMIT');

    // 4. Build context for AI prompt
    const rank = getRankLabel(partner.wallet_rank);
    const priceDirection = partner.price_change_24h >= 0 ? 'pumping 📈' : 'dumping 📉';
    const marketStatus = `$${parseFloat(partner.market_price).toFixed(2)} and ${priceDirection}`;
    
    // Construct the Gemini prompt
    const prompt = buildRizzPrompt({
      rank,
      bio: partner.bio || 'mysterious crypto enthusiast',
      marketStatus,
      displayName: partner.display_name || 'this person',
    });

    // 5. Call Gemini API
    let suggestions = [];
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response from Gemini
      suggestions = parseGeminiResponse(text);
    } catch (aiError) {
      console.error('Gemini API error:', aiError);
      // Fallback suggestions if AI fails
      suggestions = getFallbackSuggestions(partner);
    }

    // 6. Get updated balance
    const updatedUser = await pool.query(
      'SELECT balance_love FROM users WHERE id = $1',
      [userId]
    );
    const remainingBalance = parseFloat(updatedUser.rows[0].balance_love) || 0;

    res.json({
      success: true,
      suggestions,
      remaining_balance: remainingBalance,
      cost: RIZZ_COST_LOVE,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * Build the prompt for Gemini
 */
function buildRizzPrompt({ rank, bio, marketStatus, displayName }) {
  return `You are a witty, flirty, and crypto-savvy wingman for a dating app called CryptoCrush where people's profiles are like crypto tokens.

Context about my potential match:
- They are a ${rank} (wallet tier indicating their crypto holdings)
- Their current market price is ${marketStatus}
- Their bio says: "${bio}"

Your task:
Generate exactly 3 short, funny, and engaging opening lines (pickup lines) that:
1. Reference their crypto status, wallet rank, or market price creatively
2. Are playful and slightly "degen" but still charming and respectful
3. Are suitable for a dating app - flirty but not creepy
4. Each line should be different in style (one can be punny, one romantic, one bold)

Tone: Cheerful, crypto-native humor, slightly degen but charming.

IMPORTANT: Respond ONLY with a valid JSON array containing exactly 3 strings. No markdown, no explanation.
Example format: ["line 1", "line 2", "line 3"]`;
}

/**
 * Parse Gemini's response to extract suggestions
 */
function parseGeminiResponse(text) {
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    cleanText = cleanText.trim();
    
    // Parse the JSON array
    const parsed = JSON.parse(cleanText);
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Return up to 3 suggestions, ensure they're strings
      return parsed.slice(0, 3).map(line => String(line).trim());
    }
    
    throw new Error('Invalid response format');
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', parseError, 'Raw text:', text);
    return null; // Will trigger fallback
  }
}

/**
 * Get human-readable rank label
 */
function getRankLabel(walletRank) {
  switch (walletRank) {
    case 'WHALE':
      return '🐋 Whale (major holder)';
    case 'SHARK':
      return '🦈 Shark (significant holder)';
    case 'SHRIMP':
    default:
      return '🦐 Shrimp (retail degen)';
  }
}

/**
 * Fallback suggestions if AI fails
 */
function getFallbackSuggestions(partner) {
  const rank = partner.wallet_rank || 'SHRIMP';
  const price = parseFloat(partner.market_price) || 10;
  
  const fallbacks = {
    WHALE: [
      `Are you a whale? Because you just made a splash in my heart 🐋💕`,
      `I'd HODL you forever, no paper hands here 💎🙌`,
      `Your market cap isn't the only thing that's impressive...`,
    ],
    SHARK: [
      `You're like a hidden gem - undervalued but about to moon 🚀`,
      `I'd put my whole portfolio into you, no diversification needed 📈`,
      `They say don't chase pumps, but I'd chase you anywhere 💫`,
    ],
    SHRIMP: [
      `We're both shrimps now, but together we could be whales 🦐→🐋`,
      `I don't need you to be a whale - your vibes are already bullish 🚀`,
      `Small bags, big dreams - want to build our portfolio together? 💕`,
    ],
  };

  return fallbacks[rank] || fallbacks.SHRIMP;
}

module.exports = {
  getAISuggestion,
};
