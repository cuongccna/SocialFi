/**
 * Shop Controller
 * Love Decor Shop - Buy and equip decorations for chat
 */

const { pool } = require('../config/db');
const { ApiError } = require('../middlewares');

/**
 * GET /shop/items
 * Get all shop items grouped by category
 */
async function getShopItems(req, res, next) {
  try {
    const userId = req.user.id;

    // Get all active shop items
    const itemsResult = await pool.query(`
      SELECT 
        si.id,
        si.name,
        si.description,
        si.category,
        si.price,
        si.is_premium,
        si.asset_url,
        si.thumbnail_url,
        si.z_index,
        si.position_hint,
        si.is_animated,
        EXISTS(
          SELECT 1 FROM user_inventory ui 
          WHERE ui.user_id = $1 AND ui.item_id = si.id
        ) as is_owned
      FROM shop_items si
      WHERE si.is_active = TRUE
      ORDER BY si.category, si.price ASC
    `, [userId]);

    // Group items by category
    const groupedItems = {
      WALLPAPER: [],
      PET: [],
      FURNITURE: [],
      EFFECT: [],
    };

    itemsResult.rows.forEach(item => {
      if (groupedItems[item.category]) {
        groupedItems[item.category].push({
          ...item,
          price: parseInt(item.price),
        });
      }
    });

    res.json({
      success: true,
      items: groupedItems,
      totalCount: itemsResult.rows.length,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /shop/inventory
 * Get user's owned items
 */
async function getUserInventory(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        si.id,
        si.name,
        si.description,
        si.category,
        si.asset_url,
        si.thumbnail_url,
        si.z_index,
        si.position_hint,
        si.is_animated,
        ui.purchased_at
      FROM user_inventory ui
      JOIN shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = $1
      ORDER BY ui.purchased_at DESC
    `, [userId]);

    // Group by category
    const groupedItems = {
      WALLPAPER: [],
      PET: [],
      FURNITURE: [],
      EFFECT: [],
    };

    result.rows.forEach(item => {
      if (groupedItems[item.category]) {
        groupedItems[item.category].push(item);
      }
    });

    res.json({
      success: true,
      inventory: groupedItems,
      totalOwned: result.rows.length,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /shop/buy
 * Purchase an item from the shop
 */
async function buyItem(req, res, next) {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { item_id } = req.body;

    if (!item_id) {
      throw new ApiError(400, 'Item ID is required');
    }

    await client.query('BEGIN');

    // Get item details
    const itemResult = await client.query(`
      SELECT id, name, price, is_active, category
      FROM shop_items
      WHERE id = $1
    `, [item_id]);

    if (itemResult.rows.length === 0) {
      throw new ApiError(404, 'Item not found');
    }

    const item = itemResult.rows[0];

    if (!item.is_active) {
      throw new ApiError(400, 'This item is no longer available');
    }

    // Check if user already owns this item
    const ownershipCheck = await client.query(`
      SELECT 1 FROM user_inventory
      WHERE user_id = $1 AND item_id = $2
    `, [userId, item_id]);

    if (ownershipCheck.rows.length > 0) {
      throw new ApiError(400, 'You already own this item');
    }

    // Get user's current balance
    const userResult = await client.query(`
      SELECT balance_love FROM users WHERE id = $1 FOR UPDATE
    `, [userId]);

    const currentBalance = parseFloat(userResult.rows[0].balance_love);
    const price = parseInt(item.price);

    if (currentBalance < price) {
      throw new ApiError(400, `Insufficient balance. You need ${price} $LOVE but only have ${currentBalance.toFixed(2)}`);
    }

    // Deduct balance
    await client.query(`
      UPDATE users
      SET balance_love = balance_love - $1, updated_at = NOW()
      WHERE id = $2
    `, [price, userId]);

    // Add to inventory
    await client.query(`
      INSERT INTO user_inventory (user_id, item_id, purchased_at)
      VALUES ($1, $2, NOW())
    `, [userId, item_id]);

    await client.query('COMMIT');

    // Get updated balance
    const updatedUser = await pool.query(`
      SELECT balance_love FROM users WHERE id = $1
    `, [userId]);

    res.json({
      success: true,
      message: `Successfully purchased ${item.name}!`,
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
      },
      newBalance: parseFloat(updatedUser.rows[0].balance_love),
      spent: price,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /shop/equip
 * Equip an item to a relationship's chat
 */
async function equipItem(req, res, next) {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { item_id, relationship_id } = req.body;

    if (!item_id || !relationship_id) {
      throw new ApiError(400, 'Item ID and Relationship ID are required');
    }

    await client.query('BEGIN');

    // Check if user is part of this relationship
    const relationshipCheck = await client.query(`
      SELECT id FROM relationships
      WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND status = 'MATCHED'
    `, [relationship_id, userId]);

    if (relationshipCheck.rows.length === 0) {
      throw new ApiError(403, 'You are not part of this relationship');
    }

    // Check if user owns this item
    const ownershipCheck = await client.query(`
      SELECT ui.id, si.category, si.name
      FROM user_inventory ui
      JOIN shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = $1 AND ui.item_id = $2
    `, [userId, item_id]);

    if (ownershipCheck.rows.length === 0) {
      throw new ApiError(403, 'You do not own this item');
    }

    const item = ownershipCheck.rows[0];
    const category = item.category;

    // Determine which column to update based on category
    let columnName;
    switch (category) {
      case 'WALLPAPER':
        columnName = 'active_wallpaper_id';
        break;
      case 'PET':
        columnName = 'active_pet_id';
        break;
      case 'FURNITURE':
        columnName = 'active_furniture_id';
        break;
      case 'EFFECT':
        columnName = 'active_effect_id';
        break;
      default:
        throw new ApiError(400, 'Invalid item category');
    }

    // Upsert relationship decor
    await client.query(`
      INSERT INTO relationship_decor (relationship_id, ${columnName})
      VALUES ($1, $2)
      ON CONFLICT (relationship_id)
      DO UPDATE SET ${columnName} = $2, updated_at = NOW()
    `, [relationship_id, item_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${item.name} has been equipped!`,
      equipped: {
        category,
        item_id,
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /shop/unequip
 * Unequip an item from a relationship's chat
 */
async function unequipItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { category, relationship_id } = req.body;

    if (!category || !relationship_id) {
      throw new ApiError(400, 'Category and Relationship ID are required');
    }

    // Check if user is part of this relationship
    const relationshipCheck = await pool.query(`
      SELECT id FROM relationships
      WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND status = 'MATCHED'
    `, [relationship_id, userId]);

    if (relationshipCheck.rows.length === 0) {
      throw new ApiError(403, 'You are not part of this relationship');
    }

    // Determine which column to update
    let columnName;
    switch (category.toUpperCase()) {
      case 'WALLPAPER':
        columnName = 'active_wallpaper_id';
        break;
      case 'PET':
        columnName = 'active_pet_id';
        break;
      case 'FURNITURE':
        columnName = 'active_furniture_id';
        break;
      case 'EFFECT':
        columnName = 'active_effect_id';
        break;
      default:
        throw new ApiError(400, 'Invalid category');
    }

    // Set to NULL
    await pool.query(`
      UPDATE relationship_decor
      SET ${columnName} = NULL, updated_at = NOW()
      WHERE relationship_id = $1
    `, [relationship_id]);

    res.json({
      success: true,
      message: `${category} has been unequipped`,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /shop/decor/:relationshipId
 * Get active decorations for a relationship
 */
async function getRelationshipDecor(req, res, next) {
  try {
    const userId = req.user.id;
    const { relationshipId } = req.params;

    // Check if user is part of this relationship
    const relationshipCheck = await pool.query(`
      SELECT id FROM relationships
      WHERE id = $1 AND (user_a = $2 OR user_b = $2)
    `, [relationshipId, userId]);

    if (relationshipCheck.rows.length === 0) {
      throw new ApiError(403, 'You are not part of this relationship');
    }

    // Get active decorations with full item details
    const result = await pool.query(`
      SELECT 
        rd.relationship_id,
        -- Wallpaper
        w.id as wallpaper_id,
        w.name as wallpaper_name,
        w.asset_url as wallpaper_url,
        w.is_animated as wallpaper_animated,
        -- Pet
        p.id as pet_id,
        p.name as pet_name,
        p.asset_url as pet_url,
        p.position_hint as pet_position,
        p.is_animated as pet_animated,
        -- Furniture
        f.id as furniture_id,
        f.name as furniture_name,
        f.asset_url as furniture_url,
        f.position_hint as furniture_position,
        f.is_animated as furniture_animated,
        -- Effect
        e.id as effect_id,
        e.name as effect_name,
        e.asset_url as effect_url,
        e.is_animated as effect_animated
      FROM relationship_decor rd
      LEFT JOIN shop_items w ON rd.active_wallpaper_id = w.id
      LEFT JOIN shop_items p ON rd.active_pet_id = p.id
      LEFT JOIN shop_items f ON rd.active_furniture_id = f.id
      LEFT JOIN shop_items e ON rd.active_effect_id = e.id
      WHERE rd.relationship_id = $1
    `, [relationshipId]);

    if (result.rows.length === 0) {
      // No decor set yet
      return res.json({
        success: true,
        decor: {
          wallpaper: null,
          pet: null,
          furniture: null,
          effect: null,
        },
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      decor: {
        wallpaper: row.wallpaper_id ? {
          id: row.wallpaper_id,
          name: row.wallpaper_name,
          url: row.wallpaper_url,
          isAnimated: row.wallpaper_animated,
        } : null,
        pet: row.pet_id ? {
          id: row.pet_id,
          name: row.pet_name,
          url: row.pet_url,
          position: row.pet_position,
          isAnimated: row.pet_animated,
        } : null,
        furniture: row.furniture_id ? {
          id: row.furniture_id,
          name: row.furniture_name,
          url: row.furniture_url,
          position: row.furniture_position,
          isAnimated: row.furniture_animated,
        } : null,
        effect: row.effect_id ? {
          id: row.effect_id,
          name: row.effect_name,
          url: row.effect_url,
          isAnimated: row.effect_animated,
        } : null,
      },
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getShopItems,
  getUserInventory,
  buyItem,
  equipItem,
  unequipItem,
  getRelationshipDecor,
};
