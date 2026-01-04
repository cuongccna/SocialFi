-- ============================================
-- CryptoCrush - Love Decor Shop System
-- Migration 018: Shop Items, Inventory & Room Decorations
-- ============================================

-- ============================================
-- A. Shop Items Catalog
-- ============================================

-- Item Categories ENUM
CREATE TYPE shop_item_category AS ENUM ('WALLPAPER', 'PET', 'FURNITURE', 'EFFECT');

-- Shop Items Table
CREATE TABLE shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category shop_item_category NOT NULL,
    price INTEGER NOT NULL DEFAULT 100, -- Price in $LOVE tokens
    is_premium BOOLEAN DEFAULT FALSE,
    asset_url TEXT NOT NULL, -- Path to image/gif asset
    thumbnail_url TEXT, -- Thumbnail for shop display
    z_index INTEGER DEFAULT 0, -- Layering order for rendering
    position_hint VARCHAR(50) DEFAULT 'center', -- 'bottom-left', 'bottom-right', 'center', etc.
    is_animated BOOLEAN DEFAULT FALSE, -- Whether asset is a GIF/animation
    is_active BOOLEAN DEFAULT TRUE, -- Whether item is available in shop
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for shop items
CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_active ON shop_items(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_shop_items_premium ON shop_items(is_premium);

-- ============================================
-- B. User Inventory
-- ============================================

-- User Inventory Table - Items owned by users
CREATE TABLE user_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: User can only own each item once
    UNIQUE(user_id, item_id)
);

-- Indexes for inventory
CREATE INDEX idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_item ON user_inventory(item_id);

-- ============================================
-- C. Relationship Decorations (Penthouse)
-- ============================================

-- Relationship Decor Table - Active decorations for each relationship's chat
CREATE TABLE relationship_decor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    
    -- Active decoration items (can be NULL if none equipped)
    active_wallpaper_id UUID REFERENCES shop_items(id) ON DELETE SET NULL,
    active_pet_id UUID REFERENCES shop_items(id) ON DELETE SET NULL,
    active_furniture_id UUID REFERENCES shop_items(id) ON DELETE SET NULL,
    active_effect_id UUID REFERENCES shop_items(id) ON DELETE SET NULL,
    
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Only one decor config per relationship
    UNIQUE(relationship_id)
);

-- Index for relationship decor
CREATE INDEX idx_relationship_decor_relationship ON relationship_decor(relationship_id);

-- ============================================
-- D. Seed Default Shop Items (with placeholder images)
-- ============================================

-- Wallpapers (using Unsplash for placeholders)
INSERT INTO shop_items (name, description, category, price, is_premium, asset_url, thumbnail_url, z_index, is_animated) VALUES
('Neon City', 'A vibrant cyberpunk cityscape at night', 'WALLPAPER', 100, FALSE, 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&q=60', 0, FALSE),
('Sunset Beach', 'Romantic sunset on a tropical beach', 'WALLPAPER', 100, FALSE, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=60', 0, FALSE),
('Starry Night', 'A beautiful starry night sky', 'WALLPAPER', 150, FALSE, 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80', 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&q=60', 0, FALSE),
('Cherry Blossom', 'Peaceful cherry blossom garden', 'WALLPAPER', 200, FALSE, 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=200&q=60', 0, FALSE),
('Golden Luxury', 'Premium golden marble aesthetic', 'WALLPAPER', 500, TRUE, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=60', 0, FALSE),
('Aurora Borealis', 'Mystical northern lights display', 'WALLPAPER', 750, TRUE, 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&q=60', 0, FALSE),
('Deep Ocean', 'Tranquil underwater scene', 'WALLPAPER', 300, FALSE, 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=800&q=80', 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=200&q=60', 0, FALSE);

-- Pets (using Giphy for animated GIFs)
INSERT INTO shop_items (name, description, category, price, is_premium, asset_url, thumbnail_url, z_index, position_hint, is_animated) VALUES
('Pixel Cat', 'A cute pixel art cat that meows!', 'PET', 200, FALSE, 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', 'https://media.giphy.com/media/mlvseq9yvZhba/200w.gif', 10, 'bottom-left', TRUE),
('Love Puppy', 'An adorable puppy with heart eyes', 'PET', 200, FALSE, 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/200w.gif', 10, 'bottom-right', TRUE),
('Crypto Doge', 'Much wow! Very love!', 'PET', 300, FALSE, 'https://media.giphy.com/media/HWJKLzRBMn4QkE19WR/giphy.gif', 'https://media.giphy.com/media/HWJKLzRBMn4QkE19WR/200w.gif', 10, 'bottom-left', TRUE),
('Nyan Cat', 'Rainbow trail included!', 'PET', 500, TRUE, 'https://media.giphy.com/media/sIIhZliB2McAo/giphy.gif', 'https://media.giphy.com/media/sIIhZliB2McAo/200w.gif', 10, 'bottom-right', TRUE),
('Dancing Parrot', 'Party parrot brings the vibes!', 'PET', 350, FALSE, 'https://media.giphy.com/media/ZB8kHh4RUQaXmSqD8s/giphy.gif', 'https://media.giphy.com/media/ZB8kHh4RUQaXmSqD8s/200w.gif', 10, 'bottom-left', TRUE),
('Sleepy Cat', 'Cozy sleeping kitty', 'PET', 250, FALSE, 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', 'https://media.giphy.com/media/ICOgUNjpvO0PC/200w.gif', 10, 'bottom-right', TRUE);

-- Furniture (decorative elements)
INSERT INTO shop_items (name, description, category, price, is_premium, asset_url, thumbnail_url, z_index, position_hint, is_animated) VALUES
('Candle Light', 'Romantic candlelight ambiance', 'FURNITURE', 75, FALSE, 'https://media.giphy.com/media/ZBn3ZRvCbWz2PS3Rbg/giphy.gif', 'https://media.giphy.com/media/ZBn3ZRvCbWz2PS3Rbg/200w.gif', 5, 'bottom-right', TRUE),
('Cozy Fireplace', 'Warm crackling fireplace', 'FURNITURE', 300, FALSE, 'https://media.giphy.com/media/l0Iy9Qcyz0AwYvuEg/giphy.gif', 'https://media.giphy.com/media/l0Iy9Qcyz0AwYvuEg/200w.gif', 5, 'bottom-center', TRUE),
('Fish Tank', 'Relaxing tropical aquarium', 'FURNITURE', 350, FALSE, 'https://media.giphy.com/media/pVkmGyqYRt4qY/giphy.gif', 'https://media.giphy.com/media/pVkmGyqYRt4qY/200w.gif', 5, 'bottom-left', TRUE),
('Lava Lamp', 'Groovy retro vibes', 'FURNITURE', 150, FALSE, 'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/giphy.gif', 'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/200w.gif', 5, 'bottom-right', TRUE),
('Disco Ball', 'Party time disco ball!', 'FURNITURE', 400, TRUE, 'https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/giphy.gif', 'https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/200w.gif', 5, 'top-center', TRUE);

-- Effects (overlays)
INSERT INTO shop_items (name, description, category, price, is_premium, asset_url, thumbnail_url, z_index, position_hint, is_animated) VALUES
('Floating Hearts', 'Gentle floating heart particles', 'EFFECT', 100, FALSE, 'https://media.giphy.com/media/3oriO5t2QB4IPKgxHi/giphy.gif', 'https://media.giphy.com/media/3oriO5t2QB4IPKgxHi/200w.gif', 20, 'overlay', TRUE),
('Sparkle Dust', 'Magical sparkling dust effect', 'EFFECT', 150, FALSE, 'https://media.giphy.com/media/l4KibK3JwaVo0CjDO/giphy.gif', 'https://media.giphy.com/media/l4KibK3JwaVo0CjDO/200w.gif', 20, 'overlay', TRUE),
('Snow Fall', 'Gentle snowflakes falling', 'EFFECT', 200, FALSE, 'https://media.giphy.com/media/3o7aCWDyW0PJCsxHna/giphy.gif', 'https://media.giphy.com/media/3o7aCWDyW0PJCsxHna/200w.gif', 20, 'overlay', TRUE),
('Confetti', 'Celebration confetti shower!', 'EFFECT', 250, FALSE, 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif', 20, 'overlay', TRUE),
('Star Burst', 'Cosmic star explosion', 'EFFECT', 400, TRUE, 'https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/giphy.gif', 'https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/200w.gif', 20, 'overlay', TRUE),
('Love Rain', 'Raining hearts from above', 'EFFECT', 300, FALSE, 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200w.gif', 20, 'overlay', TRUE);

-- ============================================
-- E. Helper Functions
-- ============================================

-- Function to update timestamp on decor change
CREATE OR REPLACE FUNCTION update_relationship_decor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER trigger_relationship_decor_updated
    BEFORE UPDATE ON relationship_decor
    FOR EACH ROW
    EXECUTE FUNCTION update_relationship_decor_timestamp();

-- ============================================
-- Migration Complete
-- ============================================
