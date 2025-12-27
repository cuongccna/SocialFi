/**
 * Telegram Bot Service (grammy.js)
 * Handles anonymous message relay between matched users
 */

const { Bot } = require('grammy');

// Bot instance
let bot = null;

/**
 * Initialize the Telegram bot
 * @param {string} token - Bot token from BotFather
 */
function initBot(token) {
  if (!token) {
    console.warn('⚠️  BOT_TOKEN not provided. Bot relay disabled.');
    return null;
  }

  bot = new Bot(token);

  // Handle /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `💚 Welcome to CryptoCrush!\n\n` +
      `This bot will relay anonymous messages from your matches.\n\n` +
      `🔒 Your identity is protected until you decide to reveal it.\n\n` +
      `Open the Mini App to start swiping!`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Open CryptoCrush', web_app: { url: process.env.WEBAPP_URL || 'https://t.me/your_bot/app' } }
          ]]
        }
      }
    );
  });

  // Handle incoming messages (for future: reply handling)
  bot.on('message', async (ctx) => {
    // Check if this is a reply to a relayed message
    // TODO: Implement reply-to-match feature
    console.log('📨 Bot received message from:', ctx.from?.id);
  });

  // Start the bot
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
