import { Router } from 'express';
import {
  getUserRooms, getRoomById, createRoom, findDMRoom, addMemberToRoom,
  getRoomMessagesPaginated, createMessage, addReaction, removeReaction,
  setTyping, clearTyping, getTyping, getAllTyping,
  getOnlineUsers, isOnline, getUserById, getUsers,
  markAsRead, getAllUnreadCounts, getUnreadCount,
  addSSEClient, removeSSEClient, broadcastToRoom, sendSSE, initUnreadForUser
} from '../data/store.js';

const router = Router();

// SSE endpoint - streams events to connected client
// Note: EventSource doesn't support headers, so we also accept token as query param
router.get('/stream', (req, res) => {
  const userId = req.user.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('\n');

  addSSEClient(userId, res);

  // Send initial state
  const rooms = getUserRooms(userId);
  const onlineUsersList = getOnlineUsers();
  const unreadCounts = getAllUnreadCounts(userId);
  res.write(`event: init\ndata: ${JSON.stringify({ rooms, onlineUsers: onlineUsersList, unreadCounts })}\n\n`);

  req.on('close', () => {
    removeSSEClient(userId, res);
  });
});

// Get all rooms for current user
router.get('/rooms', (req, res) => {
  const rooms = getUserRooms(req.user.id);
  const unreadCounts = getAllUnreadCounts(req.user.id);
  const roomsWithMeta = rooms.map(r => ({
    ...r,
    unreadCount: unreadCounts[r.id] || 0,
  }));
  res.json(roomsWithMeta);
});

// Create a group room
router.post('/rooms', (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required' });
  }
  const members = [req.user.id, ...(memberIds || [])];
  const unique = [...new Set(members)];
  const room = createRoom(name.trim(), 'group', unique, req.user.id);
  unique.forEach(uid => initUnreadForUser(uid));

  // Notify members
  broadcastToRoom(room.id, 'room:created', room, req.user.id);
  unique.forEach(uid => sendSSE(uid, 'room:created', room));

  res.status(201).json(room);
});

// Start or get DM room with another user
router.post('/rooms/dm', (req, res) => {
  const { userId: otherUserId } = req.body;
  if (!otherUserId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const otherUser = getUserById(otherUserId);
  if (!otherUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  let room = findDMRoom(req.user.id, otherUserId);
  if (!room) {
    room = createRoom(`dm-${req.user.id}-${otherUserId}`, 'dm', [req.user.id, otherUserId], req.user.id);
    initUnreadForUser(req.user.id);
    initUnreadForUser(otherUserId);
  }
  res.json(room);
});

// Get users list (for creating DMs / adding members)
router.get('/users', (req, res) => {
  const users = getUsers().map(u => ({
    id: u.id,
    username: u.username,
    online: isOnline(u.id),
  }));
  res.json(users);
});

// Get online users
router.get('/online', (req, res) => {
  const onlineIds = getOnlineUsers();
  const onlineUsers = onlineIds.map(id => {
    const u = getUserById(id);
    return u ? { id: u.id, username: u.username } : null;
  }).filter(Boolean);
  res.json(onlineUsers);
});

// Get messages for a room (with pagination)
router.get('/rooms/:roomId/messages', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const room = getRoomById(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!room.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  const limit = parseInt(req.query.limit) || 20;
  const before = req.query.before ? parseInt(req.query.before) : null;
  const messages = getRoomMessagesPaginated(roomId, limit, before);

  // Mark as read
  markAsRead(req.user.id, roomId);

  res.json(messages);
});

// Send a message
router.post('/rooms/:roomId/messages', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const room = getRoomById(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!room.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Message text is required' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }

  const message = createMessage(roomId, req.user.id, text.trim());

  // Clear typing status for this user in this room
  const typing = getTyping(roomId);
  if (typing && typing.userId === req.user.id) {
    clearTyping(roomId);
  }

  // Broadcast to all room members
  const sender = getUserById(req.user.id);
  const msgWithSender = { ...message, sender: { id: sender.id, username: sender.username } };
  broadcastToRoom(roomId, 'message:new', msgWithSender, -1);

  res.status(201).json(message);
});

// Add reaction to a message
router.post('/rooms/:roomId/messages/:messageId/react', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const messageId = parseInt(req.params.messageId);
  const { emoji, action } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

  const room = getRoomById(roomId);
  if (!room || !room.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }

  let msg;
  if (action === 'remove') {
    msg = removeReaction(messageId, emoji, req.user.id);
  } else {
    msg = addReaction(messageId, emoji, req.user.id);
  }
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Broadcast reaction update
  broadcastToRoom(roomId, 'message:reaction', { messageId: msg.id, reactions: msg.reactions }, -1);

  res.json(msg);
});

// Set typing status
router.post('/rooms/:roomId/typing', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const room = getRoomById(roomId);
  if (!room || !room.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not a member of this room' });
  }
  setTyping(roomId, req.user.id);
  broadcastToRoom(roomId, 'typing', { roomId, userId: req.user.id, username: req.user.username }, req.user.id);
  res.json({ ok: true });
});

// Clear typing status
router.post('/rooms/:roomId/typing/clear', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  clearTyping(roomId);
  res.json({ ok: true });
});

// Get all unread counts
router.get('/unread', (req, res) => {
  const counts = getAllUnreadCounts(req.user.id);
  res.json(counts);
});

// Add member to room
router.post('/rooms/:roomId/members', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const { userId } = req.body;
  const room = getRoomById(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.type === 'dm') return res.status(400).json({ error: 'Cannot add members to DM' });
  if (room.createdBy !== req.user.id) return res.status(403).json({ error: 'Only room creator can add members' });

  const updated = addMemberToRoom(roomId, userId);
  initUnreadForUser(userId);
  sendSSE(userId, 'room:created', updated);
  broadcastToRoom(roomId, 'room:updated', updated, -1);
  res.json(updated);
});

export default router;
