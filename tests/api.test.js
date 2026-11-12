import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:3001/api';

let aliceToken, bobToken, charlieToken;
let aliceId, bobId, charlieId;

// Helper
async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

describe('Auth API', () => {
  it('should login with existing user', async () => {
    const { status, data } = await post('/auth/login', { username: 'alice', password: 'password123' });
    assert.strictEqual(status, 200);
    assert.ok(data.token);
    assert.strictEqual(data.user.username, 'alice');
    aliceToken = data.token;
    aliceId = data.user.id;
  });

  it('should login bob', async () => {
    const { status, data } = await post('/auth/login', { username: 'bob', password: 'password123' });
    assert.strictEqual(status, 200);
    bobToken = data.token;
    bobId = data.user.id;
  });

  it('should login charlie', async () => {
    const { status, data } = await post('/auth/login', { username: 'charlie', password: 'password123' });
    assert.strictEqual(status, 200);
    charlieToken = data.token;
    charlieId = data.user.id;
  });

  it('should reject invalid login', async () => {
    const { status } = await post('/auth/login', { username: 'alice', password: 'wrong' });
    assert.strictEqual(status, 401);
  });

  it('should register a new user', async () => {
    const { status, data } = await post('/auth/register', { username: 'testuser', password: 'password123' });
    assert.strictEqual(status, 200);
    assert.ok(data.token);
  });

  it('should reject duplicate registration', async () => {
    const { status } = await post('/auth/register', { username: 'alice', password: 'password123' });
    assert.strictEqual(status, 400);
  });

  it('should reject short username', async () => {
    const { status } = await post('/auth/register', { username: 'ab', password: 'password123' });
    assert.strictEqual(status, 400);
  });

  it('should get current user', async () => {
    const { status, data } = await get('/auth/me', aliceToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.username, 'alice');
  });

  it('should reject unauthenticated access', async () => {
    const { status } = await get('/auth/me');
    assert.strictEqual(status, 401);
  });
});

describe('Chat Rooms API', () => {
  it('should get rooms for user', async () => {
    const { status, data } = await get('/chat/rooms', aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
  });

  it('should create a group room', async () => {
    const { status, data } = await post('/chat/rooms', {
      name: 'Test Channel',
      memberIds: [bobId],
    }, aliceToken);
    assert.strictEqual(status, 201);
    assert.strictEqual(data.name, 'Test Channel');
    assert.ok(data.members.includes(aliceId));
    assert.ok(data.members.includes(bobId));
  });

  it('should create or get DM room', async () => {
    const { status, data } = await post('/chat/rooms/dm', { userId: bobId }, aliceToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.type, 'dm');
    assert.ok(data.members.includes(aliceId));
    assert.ok(data.members.includes(bobId));
  });

  it('should get users list', async () => {
    const { status, data } = await get('/chat/users', aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 3);
  });

  it('should reject creating room without auth', async () => {
    const { status } = await get('/chat/rooms');
    assert.strictEqual(status, 401);
  });
});

describe('Messages API', () => {
  let testRoomId;

  before(async () => {
    const rooms = await get('/chat/rooms', aliceToken);
    testRoomId = rooms.data.find(r => r.type === 'group' && r.name === 'General')?.id || 1;
  });

  it('should get messages for a room', async () => {
    const { status, data } = await get(`/chat/rooms/${testRoomId}/messages`, aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
  });

  it('should get paginated messages', async () => {
    const { status, data } = await get(`/chat/rooms/${testRoomId}/messages?limit=2`, aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(data.length <= 2);
  });

  it('should send a message', async () => {
    const { status, data } = await post(`/chat/rooms/${testRoomId}/messages`, {
      text: 'Test message from API test',
    }, aliceToken);
    assert.strictEqual(status, 201);
    assert.strictEqual(data.text, 'Test message from API test');
    assert.strictEqual(data.senderId, aliceId);
  });

  it('should reject empty message', async () => {
    const { status } = await post(`/chat/rooms/${testRoomId}/messages`, { text: '' }, aliceToken);
    assert.strictEqual(status, 400);
  });

  it('should reject message to non-member room', async () => {
    // Create a room with only bob
    const { data: room } = await post('/chat/rooms', {
      name: 'Bob Only',
      memberIds: [charlieId],
    }, bobToken);

    const { status } = await post(`/chat/rooms/${room.id}/messages`, {
      text: 'Should fail',
    }, aliceToken);
    assert.strictEqual(status, 403);
  });
});

describe('Reactions API', () => {
  let testRoomId, testMessageId;

  before(async () => {
    const rooms = await get('/chat/rooms', aliceToken);
    testRoomId = rooms.data.find(r => r.type === 'group' && r.name === 'General')?.id || 1;
    const msgs = await get(`/chat/rooms/${testRoomId}/messages`, aliceToken);
    testMessageId = msgs.data[msgs.data.length - 1]?.id || 1;
  });

  it('should add a reaction', async () => {
    const { status, data } = await post(
      `/chat/rooms/${testRoomId}/messages/${testMessageId}/react`,
      { emoji: '👍', action: 'add' },
      aliceToken
    );
    assert.strictEqual(status, 200);
    assert.ok(data.reactions['👍']);
  });

  it('should remove a reaction', async () => {
    const { status, data } = await post(
      `/chat/rooms/${testRoomId}/messages/${testMessageId}/react`,
      { emoji: '👍', action: 'remove' },
      aliceToken
    );
    assert.strictEqual(status, 200);
  });
});

describe('Typing API', () => {
  it('should set typing status', async () => {
    const { status, data } = await post('/chat/rooms/1/typing', {}, aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(data.ok);
  });

  it('should clear typing status', async () => {
    const { status, data } = await post('/chat/rooms/1/typing/clear', {}, aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(data.ok);
  });
});

describe('Unread API', () => {
  it('should get unread counts', async () => {
    const { status, data } = await get('/chat/unread', aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(typeof data === 'object');
  });
});

describe('Online Users API', () => {
  it('should get online users', async () => {
    const { status, data } = await get('/chat/online', aliceToken);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
  });
});

describe('Logout', () => {
  it('should logout successfully', async () => {
    const { status } = await post('/auth/logout', {}, aliceToken);
    assert.strictEqual(status, 200);
  });

  it('should reject access after logout', async () => {
    const { status } = await get('/chat/rooms', aliceToken);
    assert.strictEqual(status, 401);
  });
});
