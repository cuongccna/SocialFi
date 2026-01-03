/**
 * Regenerate missing NFT certificates
 * Run: node scripts/regenerate-certificates.js
 */


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');
const { generateCertificate } = require('../src/services/certificateGenerator');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'CryptoCrush_db',
  user: process.env.DB_USER || 'CryptoCrush_user',
  password: process.env.DB_PASSWORD || 'Cuongnv@123',
});

async function regenerateCertificates() {
  console.log('🔧 Regenerating missing NFT certificates...\n');

  try {
    // Find MINTED_CONTRACT relationships without nft_image_url
    const result = await pool.query(`
      SELECT 
        r.id,
        r.tx_hash,
        r.block_height,
        r.gas_fee,
        r.contract_minted_at,
        u_a.id as user_a_id,
        u_a.display_name as user_a_name,
        u_a.avatar_url as user_a_avatar,
        u_a.market_price as user_a_price,
        u_b.id as user_b_id,
        u_b.display_name as user_b_name,
        u_b.avatar_url as user_b_avatar,
        u_b.market_price as user_b_price
      FROM relationships r
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE r.status = 'MINTED_CONTRACT'
        AND (r.nft_image_url IS NULL OR r.nft_image_url = '')
    `);

    console.log(`Found ${result.rows.length} relationships needing certificate regeneration\n`);

    for (const row of result.rows) {
      try {
        console.log(`\n📜 Generating certificate for relationship: ${row.id}`);
        console.log(`   ${row.user_a_name} ❤️ ${row.user_b_name}`);

        const userA = {
          id: row.user_a_id,
          display_name: row.user_a_name,
          avatar_url: row.user_a_avatar,
          market_price: row.user_a_price,
        };

        const userB = {
          id: row.user_b_id,
          display_name: row.user_b_name,
          avatar_url: row.user_b_avatar,
          market_price: row.user_b_price,
        };

        // Generate certificate
        const { imagePath, txHash, metadata } = await generateCertificate(userA, userB, row.id);

        // Update relationship with NFT data
        await pool.query(`
          UPDATE relationships
          SET 
            nft_image_url = $1,
            tx_hash = COALESCE(tx_hash, $2),
            block_height = COALESCE(block_height, $3),
            gas_fee = COALESCE(gas_fee, $4),
            nft_metadata = $5,
            updated_at = NOW()
          WHERE id = $6
        `, [
          imagePath,
          txHash,
          metadata.block_height,
          metadata.gas_fee,
          JSON.stringify(metadata),
          row.id
        ]);

        console.log(`   ✅ Certificate saved: ${imagePath}`);
      } catch (err) {
        console.error(`   ❌ Error generating certificate for ${row.id}:`, err.message);
      }
    }

    console.log('\n✅ Certificate regeneration complete!');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

regenerateCertificates();
