/**
 * Telegram Bot Service (grammy.js)
 * Handles anonymous message relay between matched users
 * + Start command, Referral, Help, Menu
 */

const { Bot, InlineKeyboard } = require('grammy');

// Bot instance
let bot = null;

// Config
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://t.me/CryptoCrushBot/app';
const COMMUNITY_URL = process.env.COMMUNITY_URL || 'https://t.me/CryptoCrushCommunity';
const WELCOME_IMAGE = process.env.WELCOME_IMAGE || 'https://i.imgur.com/5CmQjNr.gif'; // Placeholder animation

/**
 * Initialize the Telegram bot
 * @param {string} token - Bot token from BotFather
 */
async function initBot(token) {
  if (!token) {
    console.warn('⚠️  BOT_TOKEN not provided. Bot relay disabled.');
    return null;
  }

  bot = new Bot(token);

  // ============================================
  // Set Bot Commands Menu
  // ============================================
  await bot.api.setMyCommands([
    { command: 'start', description: '🚀 Restart Bot' },
    { command: 'help', description: '📖 Game Rules & How to Play' },
    { command: 'ref', description: '🎁 Get Your Referral Link' },
  ]).catch(err => console.warn('⚠️  Failed to set commands:', err.message));

  // ============================================
  // /start Command - Welcome with Image & Buttons
  // ============================================
  bot.command('start', async (ctx) => {
    // Check if user came from a referral link
    const startPayload = ctx.match; // Contains the referral code if any
    if (startPayload) {
      console.log(`📨 User ${ctx.from?.id} referred by: ${startPayload}`);
      // TODO: Record referral in database
    }

    // Build inline keyboard
    const keyboard = new InlineKeyboard()
      .webApp('🚀 LAUNCH APP', WEBAPP_URL)
      .row()
      .url('👥 Community', COMMUNITY_URL)
      .text('📖 How to Play', 'help');

    // Send welcome animation/image with caption
    await ctx.replyWithAnimation(WELCOME_IMAGE, {
      caption: `🔥 <b>Welcome to CryptoCrush!</b> 🔥\n\n` +
        `💚 <b>SocialFi Dating</b> - Where Love Meets DeFi!\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `👆 <b>Swipe Right</b> = LONG (You think they're hot!)\n` +
        `👇 <b>Swipe Left</b> = SHORT (Pass)\n\n` +
        `💰 Every swipe = <b>+1 $LOVE</b> tokens!\n` +
        `🐋 Find <b>WHALE</b> wallets for bonus rewards!\n` +
        `📈 Your <b>Market Price</b> pumps when you get likes!\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎯 <b>Match = Pump 5%</b>\n` +
        `🎲 <b>Bet on couples</b> - Will they last?\n` +
        `⚖️ <b>Join Jury DAO</b> - Judge love disputes!\n\n` +
        `🚀 <i>Start swiping and earn $LOVE!</i>`,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    }).catch(async () => {
      // Fallback to photo if animation fails
      await ctx.replyWithPhoto(WELCOME_IMAGE, {
        caption: `🔥 <b>Welcome to CryptoCrush!</b> 🔥\n\n` +
          `💚 <b>SocialFi Dating</b> - Where Love Meets DeFi!\n\n` +
          `👆 Swipe Right = LONG | 👇 Swipe Left = SHORT\n` +
          `💰 Every swipe = +1 $LOVE tokens!\n` +
          `🐋 Find WHALE wallets for bonus rewards!\n\n` +
          `🚀 <i>Start swiping and earn $LOVE!</i>`,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }).catch(async () => {
        // Final fallback to text only
        await ctx.reply(
          `🔥 <b>Welcome to CryptoCrush!</b> 🔥\n\n` +
          `💚 <b>SocialFi Dating</b> - Where Love Meets DeFi!\n\n` +
          `💰 Swipe-to-Earn $LOVE tokens!\n` +
          `🐋 Find WHALE wallets!\n\n` +
          `🚀 Tap below to start!`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      });
    });
  });

  // ============================================
  // /help Command - Game Rules
  // ============================================
  bot.command('help', async (ctx) => {
    await sendHelpMessage(ctx);
  });

  // Help callback button
  bot.callbackQuery('help', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendHelpMessage(ctx);
  });

  // ============================================
  // /ref Command - Referral Link
  // ============================================
  bot.command('ref', async (ctx) => {
    const userId = ctx.from?.id;
    const botUsername = ctx.me.username;
    const referralLink = `https://t.me/${botUsername}?start=${userId}`;

    const keyboard = new InlineKeyboard()
      .url('📤 Share Link', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🔥 Join CryptoCrush - Swipe to Earn $LOVE! 💚')}`)
      .row()
      .webApp('🚀 Open App', WEBAPP_URL);

    await ctx.reply(
      `🎁 <b>Your Referral Link</b> 🎁\n\n` +
      `Invite friends to earn <b>1000 $LOVE</b> per referral!\n\n` +
      `📎 Your link:\n<code>${referralLink}</code>\n\n` +
      `✨ <i>Tap the link above to copy!</i>`,
      { 
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }
    );
  });

  // ============================================
  // Handle incoming messages (for future: reply handling)
  // ============================================
  bot.on('message', async (ctx) => {
    // Check if this is a reply to a relayed message
    // TODO: Implement reply-to-match feature
    console.log('📨 Bot received message from:', ctx.from?.id);
  });

  // ============================================
  // Start the bot
  // ============================================
  bot.start({
    onStart: (botInfo) => {
      console.log(`🤖 Bot started: @${botInfo.username}`);
    },
  }).catch((err) => {
    console.error('❌ Bot failed to start:', err.message);
  });

  return bot;
}

/**
 * Send help message with game rules
 */
async function sendHelpMessage(ctx) {
  const keyboard = new InlineKeyboard()
    .webApp('🚀 Start Playing', WEBAPP_URL);

  await ctx.reply(
    `📖 <b>How to Play CryptoCrush</b> 📖\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `<b>🎮 THE FEED</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `• <b>Swipe Right (LONG)</b> → You like them!\n` +
    `  → Their market price +0.5%\n\n` +
    `• <b>Swipe Left (SHORT)</b> → Pass\n` +
    `  → Their market price -0.2%\n\n` +
    `• <b>Match!</b> → Both pump +5%! 🚀\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `<b>💰 EARNING $LOVE</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `• +1 $LOVE per swipe\n` +
    `• +1000 $LOVE per referral\n` +
    `• Bonus for matching with 🐋 Whales!\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `<b>🎲 BETTING</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `• Bet LONG if you think a couple will last\n` +
    `• Bet SHORT if you think they'll break up\n` +
    `• Win and earn from the pool!\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `<b>⚖️ JURY DAO</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `• Vote on love disputes\n` +
    `• Earn rewards for fair judgments!\n\n` +
    `<i>Ready to pump your love life?</i> 💚`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

/**
 * Send a message to a user via the bot
 * @param {number} telegramId - Recipient's Telegram ID
 * @param {string} message - Message content
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Result of the send operation
 */
async function sendMessage(telegramId, message, options = {}) {
  if (!bot) {
    throw new Error('Bot not initialized');
  }

  try {
    const result = await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      ...options,
    });
    return { success: true, messageId: result.message_id };
  } catch (err) {
    console.error(`❌ Failed to send message to ${telegramId}:`, err.message);
    throw err;
  }
}

/**
 * Send an anonymous message from one user to another
 * @param {number} senderTelegramId - Sender's Telegram ID
 * @param {number} recipientTelegramId - Recipient's Telegram ID
 * @param {string} senderDisplayName - Sender's display name
 * @param {string} message - Message content
 * @param {string} matchId - The relationship/match ID
 */
async function sendAnonymousMessage(senderTelegramId, recipientTelegramId, senderDisplayName, message, matchId) {
  if (!bot) {
    console.warn('⚠️  Bot not initialized. Message not sent via Telegram.');
    return { success: false, reason: 'Bot not initialized' };
  }

  const formattedMessage = 
    `💌 <b>New message from your match!</b>\n\n` +
    `<b>${senderDisplayName}</b> says:\n` +
    `"${message}"\n\n` +
    `💚 Reply in the CryptoCrush app!`;

  try {
    const result = await bot.api.sendMessage(recipientTelegramId, formattedMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '💬 Reply in App', web_app: { url: `${process.env.WEBAPP_URL || 'https://t.me/your_bot/app'}?chat=${matchId}` } }
        ]]
      }
    });

    return { success: true, messageId: result.message_id };
  } catch (err) {
    console.error(`❌ Failed to relay message to ${recipientTelegramId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a blurred image with pay-to-unblur option
 * @param {number} recipientTelegramId - Recipient's Telegram ID
 * @param {string} senderDisplayName - Sender's display name
 * @param {string} blurredImageUrl - URL of the blurred image
 * @param {number} unblurCost - Cost in $LOVE to unblur
 * @param {string} imageId - ID to track the image for unblur
 */
async function sendBlurredImage(recipientTelegramId, senderDisplayName, blurredImageUrl, unblurCost, imageId) {
  if (!bot) {
    return { success: false, reason: 'Bot not initialized' };
  }

  const caption = 
    `📸 <b>${senderDisplayName}</b> sent you a photo!\n\n` +
    `🔒 <i>This image is blurred for privacy.</i>\n` +
    `💰 Pay <b>${unblurCost} $LOVE</b> to reveal it!`;

  try {
    const result = await bot.api.sendPhoto(recipientTelegramId, blurredImageUrl, {
      caption,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: `🔓 Unblur (${unblurCost} $LOVE)`, callback_data: `unblur:${imageId}` }
        ]]
      }
    });

    return { success: true, messageId: result.message_id };
  } catch (err) {
    console.error(`❌ Failed to send blurred image to ${recipientTelegramId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a match notification to both users
 * @param {number} user1TelegramId - First user's Telegram ID
 * @param {number} user2TelegramId - Second user's Telegram ID
 * @param {string} user1Name - First user's name
 * @param {string} user2Name - Second user's name
 */
async function sendMatchNotification(user1TelegramId, user2TelegramId, user1Name, user2Name) {
  if (!bot) {
    return { success: false, reason: 'Bot not initialized' };
  }

  const message1 = 
    `🎉 <b>IT'S A MATCH!</b> 🎉\n\n` +
    `You and <b>${user2Name}</b> have matched!\n\n` +
    `📈 Both your market prices just PUMPED +5%!\n\n` +
    `💬 Start chatting now!`;

  const message2 = 
    `🎉 <b>IT'S A MATCH!</b> 🎉\n\n` +
    `You and <b>${user1Name}</b> have matched!\n\n` +
    `📈 Both your market prices just PUMPED +5%!\n\n` +
    `💬 Start chatting now!`;

  try {
    await Promise.all([
      bot.api.sendMessage(user1TelegramId, message1, { parse_mode: 'HTML' }),
      bot.api.sendMessage(user2TelegramId, message2, { parse_mode: 'HTML' }),
    ]);
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to send match notifications:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get the bot instance
 */
function getBot() {
  return bot;
}

module.exports = {
  initBot,
  getBot,
  sendMessage,
  sendAnonymousMessage,
  sendBlurredImage,
  sendMatchNotification,
};
