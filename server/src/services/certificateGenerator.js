/**
 * Certificate Generator Service
 * Creates premium cyberpunk-style Love Contract NFT certificates
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Certificate dimensions (1080x1080 for social media)
const WIDTH = 1080;
const HEIGHT = 1080;

// Cyberpunk color palette
const COLORS = {
  bgDark: '#0d0d1a',
  bgGradientStart: '#1a0a2e',
  bgGradientEnd: '#0d1a0d',
  neonPink: '#ff00ff',
  neonCyan: '#00ffff',
  neonGreen: '#00ff88',
  neonPurple: '#8b5cf6',
  gold: '#ffd700',
  white: '#ffffff',
  whiteTransparent: 'rgba(255, 255, 255, 0.6)',
  gridLine: 'rgba(0, 255, 136, 0.1)',
};

/**
 * Generate a unique transaction hash
 * @param {string} relationshipId 
 * @returns {string} Mock transaction hash
 */
function generateTxHash(relationshipId) {
  const timestamp = Date.now().toString(16);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `0xLove${timestamp}${randomPart}`.slice(0, 66);
}

/**
 * Draw cyberpunk grid background
 * @param {CanvasRenderingContext2D} ctx 
 */
function drawCyberpunkBackground(ctx) {
  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, COLORS.bgGradientStart);
  gradient.addColorStop(0.5, COLORS.bgDark);
  gradient.addColorStop(1, COLORS.bgGradientEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Grid lines
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;

  // Horizontal lines
  for (let y = 0; y < HEIGHT; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // Vertical lines
  for (let x = 0; x < WIDTH; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }

  // Corner accents
  drawCornerAccent(ctx, 20, 20, 1, 1);
  drawCornerAccent(ctx, WIDTH - 20, 20, -1, 1);
  drawCornerAccent(ctx, 20, HEIGHT - 20, 1, -1);
  drawCornerAccent(ctx, WIDTH - 20, HEIGHT - 20, -1, -1);
}

/**
 * Draw corner accent decorations
 */
function drawCornerAccent(ctx, x, y, dirX, dirY) {
  ctx.strokeStyle = COLORS.neonCyan;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (60 * dirX), y);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + (60 * dirY));
  ctx.stroke();

  // Inner corner
  ctx.strokeStyle = COLORS.neonPink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + (10 * dirX), y + (10 * dirY));
  ctx.lineTo(x + (40 * dirX), y + (10 * dirY));
  ctx.moveTo(x + (10 * dirX), y + (10 * dirY));
  ctx.lineTo(x + (10 * dirX), y + (40 * dirY));
  ctx.stroke();
}

/**
 * Draw neon text with glow effect
 */
function drawNeonText(ctx, text, x, y, color, fontSize, align = 'center') {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `bold ${fontSize}px "Arial Black", Arial, sans-serif`;
  
  // Glow layers
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  
  ctx.shadowBlur = 20;
  ctx.fillText(text, x, y);
  
  ctx.shadowBlur = 10;
  ctx.fillText(text, x, y);
  
  // Core text
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.white;
  ctx.fillText(text, x, y);
  
  ctx.restore();
}

/**
 * Draw user avatar circle with neon border
 */
async function drawAvatar(ctx, avatarUrl, x, y, radius) {
  ctx.save();
  
  // Neon border glow
  ctx.beginPath();
  ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.neonPink;
  ctx.lineWidth = 4;
  ctx.shadowColor = COLORS.neonPink;
  ctx.shadowBlur = 20;
  ctx.stroke();
  
  // Clip circle for avatar
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  
  try {
    if (avatarUrl) {
      const avatar = await loadImage(avatarUrl);
      ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
    } else {
      // Default gradient avatar
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, COLORS.neonPurple);
      gradient.addColorStop(1, COLORS.neonPink);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  } catch (err) {
    // Fallback gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, COLORS.neonPurple);
    gradient.addColorStop(1, COLORS.neonPink);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  
  ctx.restore();
}

/**
 * Draw heart connection between avatars
 */
function drawHeartConnection(ctx, x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 20;
  
  // Connection line
  ctx.strokeStyle = COLORS.neonPink;
  ctx.lineWidth = 3;
  ctx.shadowColor = COLORS.neonPink;
  ctx.shadowBlur = 15;
  
  ctx.beginPath();
  ctx.moveTo(x1 + 80, y1);
  ctx.lineTo(midX - 30, midY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x2 - 80, y2);
  ctx.lineTo(midX + 30, midY);
  ctx.stroke();
  
  // Heart symbol
  ctx.font = 'bold 60px Arial';
  ctx.fillStyle = COLORS.neonPink;
  ctx.textAlign = 'center';
  ctx.fillText('💍', midX, midY + 20);
  
  ctx.shadowBlur = 0;
}

/**
 * Draw contract details section
 */
function drawContractDetails(ctx, txHash, contractDate, blockHeight, gasFee) {
  const startY = 700;
  const leftX = 100;
  
  // Section header
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = COLORS.neonCyan;
  ctx.textAlign = 'left';
  ctx.shadowColor = COLORS.neonCyan;
  ctx.shadowBlur = 10;
  ctx.fillText('📋 CONTRACT DETAILS', leftX, startY);
  ctx.shadowBlur = 0;
  
  // Contract details box
  ctx.strokeStyle = COLORS.neonCyan;
  ctx.lineWidth = 1;
  ctx.strokeRect(leftX, startY + 20, WIDTH - 200, 200);
  
  // Details
  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = COLORS.whiteTransparent;
  
  const details = [
    { label: 'Transaction Hash:', value: txHash },
    { label: 'Block Height:', value: blockHeight.toLocaleString() },
    { label: 'Gas Fee:', value: `${gasFee} $LOVE` },
    { label: 'Minted Date:', value: contractDate },
    { label: 'Network:', value: 'CryptoCrush L2' },
  ];
  
  details.forEach((detail, i) => {
    const y = startY + 55 + (i * 35);
    ctx.fillStyle = COLORS.neonGreen;
    ctx.fillText(detail.label, leftX + 20, y);
    ctx.fillStyle = COLORS.white;
    
    // Truncate long values
    const displayValue = detail.value.length > 40 
      ? detail.value.slice(0, 18) + '...' + detail.value.slice(-16)
      : detail.value;
    ctx.fillText(displayValue, leftX + 220, y);
  });
}

/**
 * Draw watermark and footer
 */
function drawFooter(ctx) {
  // Watermark
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFIED ON CRYPTOCRUSH BLOCKCHAIN', WIDTH / 2, HEIGHT - 80);
  
  // Footer badge
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = COLORS.gold;
  ctx.shadowColor = COLORS.gold;
  ctx.shadowBlur = 10;
  ctx.fillText('🔒 IMMUTABLE • 💎 FOREVER • 🚀 TO THE MOON', WIDTH / 2, HEIGHT - 45);
  ctx.shadowBlur = 0;
}

/**
 * Main certificate generation function
 * @param {Object} userA - First user details
 * @param {Object} userB - Second user details
 * @param {string} relationshipId - Relationship UUID
 * @returns {Promise<{imagePath: string, txHash: string, metadata: Object}>}
 */
async function generateCertificate(userA, userB, relationshipId) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  
  // Generate metadata
  const txHash = generateTxHash(relationshipId);
  const mintedDate = new Date();
  const blockHeight = Math.floor(Math.random() * 1000000) + 10000000;
  const gasFee = 500;
  
  // Draw background
  drawCyberpunkBackground(ctx);
  
  // Title with glow
  drawNeonText(ctx, '💍 LOVE CONTRACT', WIDTH / 2, 100, COLORS.neonPink, 48);
  drawNeonText(ctx, 'MINTED ON-CHAIN', WIDTH / 2, 150, COLORS.neonCyan, 24);
  
  // Certificate ID
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = COLORS.whiteTransparent;
  ctx.textAlign = 'center';
  ctx.fillText(`Contract ID: ${relationshipId}`, WIDTH / 2, 185);
  
  // User avatars
  const avatarY = 340;
  const avatar1X = WIDTH / 2 - 180;
  const avatar2X = WIDTH / 2 + 180;
  
  await drawAvatar(ctx, userA.avatar_url, avatar1X, avatarY, 80);
  await drawAvatar(ctx, userB.avatar_url, avatar2X, avatarY, 80);
  
  // Heart connection
  drawHeartConnection(ctx, avatar1X, avatarY, avatar2X, avatarY);
  
  // User names
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'center';
  ctx.shadowColor = COLORS.neonPink;
  ctx.shadowBlur = 10;
  
  const name1 = (userA.display_name || 'Anon').slice(0, 15);
  const name2 = (userB.display_name || 'Anon').slice(0, 15);
  ctx.fillText(name1, avatar1X, avatarY + 130);
  ctx.fillText(name2, avatar2X, avatarY + 130);
  ctx.shadowBlur = 0;
  
  // Market cap info
  ctx.font = '16px Arial';
  ctx.fillStyle = COLORS.neonGreen;
  const price1 = userA.market_price?.toFixed(2) || '10.00';
  const price2 = userB.market_price?.toFixed(2) || '10.00';
  ctx.fillText(`$${price1}`, avatar1X, avatarY + 160);
  ctx.fillText(`$${price2}`, avatar2X, avatarY + 160);
  
  // Combined market cap
  const combinedCap = (parseFloat(price1) + parseFloat(price2)).toFixed(2);
  drawNeonText(ctx, `Combined Market Cap: $${combinedCap}`, WIDTH / 2, 560, COLORS.gold, 28);
  
  // Tagline
  ctx.font = 'italic 20px Georgia';
  ctx.fillStyle = COLORS.whiteTransparent;
  ctx.fillText('"In crypto and love, we trust"', WIDTH / 2, 620);
  
  // Contract details
  drawContractDetails(
    ctx, 
    txHash, 
    mintedDate.toISOString().split('T')[0],
    blockHeight,
    gasFee
  );
  
  // Footer
  drawFooter(ctx);
  
  // Ensure certificates directory exists
  const certificatesDir = path.join(__dirname, '../../../public/certificates');
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }
  
  // Generate filename
  const filename = `love-contract-${relationshipId}.png`;
  const imagePath = path.join(certificatesDir, filename);
  
  // Save image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(imagePath, buffer);
  
  // Return relative URL path for database storage (served under /public)
  const imageUrl = `/public/certificates/${filename}`;
  
  const metadata = {
    tx_hash: txHash,
    block_height: blockHeight,
    gas_fee: gasFee,
    minted_date: mintedDate.toISOString(),
    network: 'CryptoCrush L2',
    combined_market_cap: combinedCap,
  };
  
  return {
    imagePath: imageUrl,
    txHash,
    metadata,
  };
}

module.exports = {
  generateCertificate,
  generateTxHash,
};
