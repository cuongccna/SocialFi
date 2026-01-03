/**
 * Socket.io Chat Handler
 * Real-time messaging between matched users
 */

const { pool } = require('../config/db');
const { registerConnectedUser, unregisterConnectedUser } = require('../controllers/gamesController');

// Constants
const LOVE_PER_TEXT_MESSAGE = 0.1;
const LOVE_PER_STICKER = 0.5;

/**
 * Initialize Socket.io chat handlers
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
function initChatSocket(io) {
  console.log('🔌 Initializing Socket.io chat handlers...');

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);
    
    // Track which rooms this socket has joined
    const joinedRooms = new Set();
    // Track this socket's user ID for cleanup on disconnect
    let socketUserId = null;

    // ==========================================
    // Register User (for game invite tracking)
    // ==========================================
    socket.on('register_user', (data) => {
      const { user_id } = data;
      if (user_id) {
        socketUserId = user_id;
        registerConnectedUser(user_id, socket.id);
        
        // Join user's personal room for direct notifications
        const userRoom = `user:${user_id}`;
        socket.join(userRoom);
        joinedRooms.add(userRoom);
        console.log(`👤 User ${user_id} joined personal room: ${userRoom}`);
        
        socket.emit('registered', { success: true });
      }
    });

    // ==========================================
    // Join Room
    // ==========================================
    socket.on('join_room', async (data) => {
      try {
        const { relationship_id, user_id } = data;
        
        if (!relationship_id || !user_id) {
          socket.emit('error', { message: 'relationship_id and user_id are required' });
          return;
        }

        // Also register this user for game invites
        if (!socketUserId && user_id) {
          socketUserId = user_id;
          registerConnectedUser(user_id, socket.id);
          
          // Join user's personal room for direct notifications
          const userRoom = `user:${user_id}`;
          socket.join(userRoom);
          joinedRooms.add(userRoom);
          console.log(`👤 User ${user_id} joined personal room via join_room: ${userRoom}`);
        }

        // Verify user is part of this relationship
        const check = await pool.query(`
          SELECT id FROM relationships 
          WHERE id = $1 
            AND (user_a = $2 OR user_b = $2)
            AND status != 'BURNED_CONTRACT'
        `, [relationship_id, user_id]);

        if (check.rows.length === 0) {
          socket.emit('error', { message: 'Not authorized to join this room' });
          return;
        }

        const roomName = `relationship_${relationship_id}`;
        socket.join(roomName);
        joinedRooms.add(roomName);
        
        console.log(`👤 User ${user_id} joined room ${roomName}`);
        
        // Notify others in the room
        socket.to(roomName).emit('user_joined', { user_id });
        
        // Send confirmation
        socket.emit('room_joined', { 
          relationship_id, 
          room: roomName,
          message: 'Successfully joined chat room' 
        });

      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ==========================================
    // Leave Room
    // ==========================================
    socket.on('leave_room', (data) => {
      const { relationship_id } = data;
      const roomName = `relationship_${relationship_id}`;
      
      socket.leave(roomName);
      joinedRooms.delete(roomName);
      
      console.log(`👋 Socket ${socket.id} left room ${roomName}`);
    });

    // ==========================================
    // Send Message
    // ==========================================
    socket.on('send_message', async (data) => {
      try {
        const { relationship_id, sender_id, content, type = 'TEXT' } = data;

        if (!relationship_id || !sender_id || !content) {
          socket.emit('error', { message: 'relationship_id, sender_id, and content are required' });
          return;
        }

        if (content.length > 1000) {
          socket.emit('error', { message: 'Message too long (max 1000 characters)' });
          return;
        }

        const roomName = `relationship_${relationship_id}`;

        // Verify sender is part of relationship
        const relCheck = await pool.query(`
          SELECT id, joint_balance, user_a, user_b FROM relationships 
          WHERE id = $1 
            AND (user_a = $2 OR user_b = $2)
            AND status != 'BURNED_CONTRACT'
        `, [relationship_id, sender_id]);

        if (relCheck.rows.length === 0) {
          socket.emit('error', { message: 'Not authorized to send message' });
          return;
        }

        const relationship = relCheck.rows[0];
        const partnerId = relationship.user_a === sender_id ? relationship.user_b : relationship.user_a;

        // Save message to DB
        const msgResult = await pool.query(`
          INSERT INTO messages (relationship_id, sender_id, content, type)
          VALUES ($1, $2, $3, $4)
          RETURNING id, relationship_id, sender_id, content, type, is_read, created_at
        `, [relationship_id, sender_id, content.trim(), type]);

        const message = msgResult.rows[0];

        // Get sender info
        const senderResult = await pool.query(
          'SELECT display_name, avatar_url FROM users WHERE id = $1',
          [sender_id]
        );
        const sender = senderResult.rows[0];

        // Attach sender info to message
        message.sender_name = sender?.display_name || 'Anonymous';
        message.sender_avatar = sender?.avatar_url || null;

        // ==========================================
        // SocialFi Hook: Harvest Love (Joint Venture)
        // Stickers reward +0.5 $LOVE, text messages +0.1 $LOVE
        // ==========================================
        const rewardAmount = type === 'STICKER' ? LOVE_PER_STICKER : LOVE_PER_TEXT_MESSAGE;
        const currentBalance = parseFloat(relCheck.rows[0].joint_balance) || 0;
        const newBalance = currentBalance + rewardAmount;

        await pool.query(`
          UPDATE relationships 
          SET joint_balance = $1, updated_at = NOW()
          WHERE id = $2
        `, [newBalance, relationship_id]);

        // Emit message to room
        io.to(roomName).emit('receive_message', message);

        // Emit balance update to room
        io.to(roomName).emit('update_balance', {
          relationship_id,
          joint_balance: newBalance,
          increment: rewardAmount,
        });

        // ==========================================
        // Send notification to partner's personal room
        // (for badge updates when not in chat)
        // ==========================================
        const partnerRoom = `user:${partnerId}`;
        io.to(partnerRoom).emit('new_message_notification', {
          relationship_id,
          sender_id,
          sender_name: message.sender_name,
          sender_avatar: message.sender_avatar,
          content: content.substring(0, 50),
          type,
          timestamp: new Date().toISOString(),
        });

        console.log(`💬 Message sent in ${roomName}: ${content.substring(0, 30)}... (notified ${partnerRoom})`);

      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==========================================
    // Typing Indicator
    // ==========================================
    socket.on('typing_start', (data) => {
      const { relationship_id, user_id } = data;
      const roomName = `relationship_${relationship_id}`;
      socket.to(roomName).emit('user_typing', { user_id, is_typing: true });
    });

    socket.on('typing_stop', (data) => {
      const { relationship_id, user_id } = data;
      const roomName = `relationship_${relationship_id}`;
      socket.to(roomName).emit('user_typing', { user_id, is_typing: false });
    });

    // ==========================================
    // Mark Messages as Read
    // ==========================================
    socket.on('mark_read', async (data) => {
      try {
        const { relationship_id, user_id } = data;

        await pool.query(`
          UPDATE messages 
          SET is_read = TRUE 
          WHERE relationship_id = $1 
            AND sender_id != $2 
            AND is_read = FALSE
        `, [relationship_id, user_id]);

        const roomName = `relationship_${relationship_id}`;
        socket.to(roomName).emit('messages_read', { 
          relationship_id, 
          reader_id: user_id 
        });

      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    });

    // ==========================================
    // Disconnect
    // ==========================================
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      
      // Unregister user from connected users tracking
      if (socketUserId) {
        unregisterConnectedUser(socketUserId, socket.id);
      }
      
      // Notify all rooms this socket was in
      joinedRooms.forEach(roomName => {
        socket.to(roomName).emit('user_left', { socket_id: socket.id });
      });
    });
  });

  console.log('✅ Socket.io chat handlers initialized');
}

module.exports = { initChatSocket };
