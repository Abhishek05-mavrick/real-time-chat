// In-memory data store with seed data
let nextUserId = 4;
let nextRoomId = 4;
let nextMessageId = 13;

// Users: password is hashed with crypto
const users = [
  { id: 1, username: 'alice', password: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', role: 'user' },
  { id: 2, username: 'bob', password: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', role: 'user' },
  { id: 3, username: 'charlie', password: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', role: 'user' },
];

// Rooms: type is 'group' or 'dm'
const rooms = [
  { id: 1, name: 'General', type: 'group', members: [1, 2, 3], createdBy: 1 },
  { id: 2, name: 'Random', type: 'group', members: [1, 2, 3], createdBy: 2 },
  { id: 3, name: 'dm-1-2', type: 'dm', members: [1, 2], createdBy: 1 },
];

// Messages
const messages = [
  { id: 1, roomId: 1, senderId: 1, text: 'Hello everyone!', timestamp: '2026-11-10T10:00:00Z', reactions: {} },
  { id: 2, roomId: 1, senderId: 2, text: 'Hey Alice!', timestamp: '2026-11-10T10:01:00Z', reactions: { '👍': [1] } },
  { id: 3, roomId: 1, senderId: 3, text: 'Good morning all', timestamp: '2026-11-10T10:02:00Z', reactions: {} },
  { id: 4, roomId: 1, senderId: 1, text: 'How is the project going?', timestamp: '2026-11-10T10:05:00Z', reactions: {} },
  { id: 5, roomId: 1, senderId: 2, text: 'Going well, almost done with the backend', timestamp: '2026-11-10T10:06:00Z', reactions: { '🔥': [1, 3] } },
  { id: 6, roomId: 2, senderId: 2, text: 'Anyone seen the new movie?', timestamp: '2026-11-10T11:00:00Z', reactions: {} },
  { id: 7, roomId: 2, senderId: 3, text: 'Not yet, is it good?', timestamp: '2026-11-10T11:01:00Z', reactions: {} },
  { id: 8, roomId: 2, senderId: 1, text: 'I heard it is amazing!', timestamp: '2026-11-10T11:02:00Z', reactions: {} },
  { id: 9, roomId: 3, senderId: 1, text: 'Hey Bob, quick question', timestamp: '2026-11-10T12:00:00Z', reactions: {} },
  { id: 10, roomId: 3, senderId: 2, text: 'Sure, what is it?', timestamp: '2026-11-10T12:01:00Z', reactions: {} },
  { id: 11, roomId: 3, senderId: 1, text: 'Can you review my PR?', timestamp: '2026-11-10T12:02:00Z', reactions: { '👍': [2] } },
  { id: 12, roomId: 3, senderId: 2, text: 'Will do this afternoon', timestamp: '2026-11-10T12:03:00Z', reactions: {} },
];

// In-memory sessions: token -> userId
const sessions = new Map();

// Online users: Set of userIds
const onlineUsers = new Set();

// Typing status: roomId -> { userId, timestamp }
const typingStatus = new Map();

// SSE clients: userId -> [response objects]
const sseClients = new Map();

// Unread tracking: `${userId}-${roomId}` -> lastSeenMessageId
const unreadTracker = new Map();

// ---- Data access functions ----

export function getUsers() { return users; }
export function getUserById(id) { return users.find(u => u.id === id); }
export function getUserByUsername(username) { return users.find(u => u.username === username); }
export function createUser(username, password) {
  const user = { id: nextUserId++, username, password, role: 'user' };
  users.push(user);
  return user;
}

export function getRooms() { return rooms; }
export function getRoomById(id) { return rooms.find(r => r.id === id); }
export function getUserRooms(userId) { return rooms.filter(r => r.members.includes(userId)); }
export function createRoom(name, type, members, createdBy) {
  const room = { id: nextRoomId++, name, type, members, createdBy };
  rooms.push(room);
  return room;
}
export function findDMRoom(user1Id, user2Id) {
  return rooms.find(r => r.type === 'dm' && r.members.includes(user1Id) && r.members.includes(user2Id));
}
export function addMemberToRoom(roomId, userId) {
  const room = getRoomById(roomId);
  if (room && !room.members.includes(userId)) {
    room.members.push(userId);
  }
  return room;
}

export function getMessages() { return messages; }
export function getRoomMessages(roomId) { return messages.filter(m => m.roomId === roomId); }
export function getRoomMessagesPaginated(roomId, limit, before) {
  let msgs = messages.filter(m => m.roomId === roomId);
  if (before) {
    msgs = msgs.filter(m => m.id < before);
  }
  return msgs.slice(-limit);
}
export function createMessage(roomId, senderId, text) {
  const msg = {
    id: nextMessageId++,
    roomId,
    senderId,
    text,
    timestamp: new Date().toISOString(),
    reactions: {},
  };
  messages.push(msg);
  return msg;
}
export function addReaction(messageId, emoji, userId) {
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return null;
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  if (!msg.reactions[emoji].includes(userId)) {
    msg.reactions[emoji].push(userId);
  }
  return msg;
}
export function removeReaction(messageId, emoji, userId) {
  const msg = messages.find(m => m.id === messageId);
  if (!msg || !msg.reactions[emoji]) return null;
  msg.reactions[emoji] = msg.reactions[emoji].filter(id => id !== userId);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  return msg;
}

export function getSession(token) { return sessions.get(token); }
export function setSession(token, userId) { sessions.set(token, userId); }
export function deleteSession(token) { sessions.delete(token); }

export function setOnline(userId) { onlineUsers.add(userId); }
export function setOffline(userId) { onlineUsers.delete(userId); }
export function getOnlineUsers() { return [...onlineUsers]; }
export function isOnline(userId) { return onlineUsers.has(userId); }

export function setTyping(roomId, userId) {
  typingStatus.set(roomId, { userId, timestamp: Date.now() });
}
export function clearTyping(roomId) {
  typingStatus.delete(roomId);
}
export function getTyping(roomId) {
  const t = typingStatus.get(roomId);
  if (t && Date.now() - t.timestamp > 5000) {
    typingStatus.delete(roomId);
    return null;
  }
  return t;
}
export function getAllTyping() {
  const result = {};
  for (const [roomId, data] of typingStatus) {
    if (Date.now() - data.timestamp <= 5000) {
      result[roomId] = data;
    } else {
      typingStatus.delete(roomId);
    }
  }
  return result;
}

export function addSSEClient(userId, res) {
  if (!sseClients.has(userId)) sseClients.set(userId, []);
  sseClients.get(userId).push(res);
}
export function removeSSEClient(userId, res) {
  const clients = sseClients.get(userId);
  if (clients) {
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
    if (clients.length === 0) sseClients.delete(userId);
  }
}
export function sendSSE(userId, event, data) {
  const clients = sseClients.get(userId);
  if (clients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(res => {
      try { res.write(payload); } catch (e) { /* client disconnected */ }
    });
  }
}
export function broadcastToRoom(roomId, event, data, excludeUserId) {
  const room = getRoomById(roomId);
  if (!room) return;
  room.members.forEach(uid => {
    if (uid !== excludeUserId) {
      sendSSE(uid, event, data);
    }
  });
}

export function getUnreadKey(userId, roomId) { return `${userId}-${roomId}`; }
export function getUnreadCount(userId, roomId) {
  const key = getUnreadKey(userId, roomId);
  const lastSeen = unreadTracker.get(key);
  if (lastSeen === undefined) return 0;
  return messages.filter(m => m.roomId === roomId && m.id > lastSeen && m.senderId !== userId).length;
}
export function markAsRead(userId, roomId) {
  const key = getUnreadKey(userId, roomId);
  const roomMsgs = getRoomMessages(roomId);
  const lastMsg = roomMsgs[roomMsgs.length - 1];
  if (lastMsg) unreadTracker.set(key, lastMsg.id);
}
export function getAllUnreadCounts(userId) {
  const userRooms = getUserRooms(userId);
  const counts = {};
  userRooms.forEach(r => {
    counts[r.id] = getUnreadCount(userId, r.id);
  });
  return counts;
}
export function initUnreadForUser(userId) {
  const userRooms = getUserRooms(userId);
  userRooms.forEach(r => {
    const key = getUnreadKey(userId, r.id);
    if (!unreadTracker.has(key)) {
      const roomMsgs = getRoomMessages(r.id);
      const lastMsg = roomMsgs[roomMsgs.length - 1];
      if (lastMsg) unreadTracker.set(key, lastMsg.id);
    }
  });
}
