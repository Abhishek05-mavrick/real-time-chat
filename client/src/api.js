const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  getRooms: () => request('/chat/rooms'),
  createRoom: (body) => request('/chat/rooms', { method: 'POST', body }),
  createDM: (userId) => request('/chat/rooms/dm', { method: 'POST', body: { userId } }),
  getUsers: () => request('/chat/users'),
  getOnline: () => request('/chat/online'),

  getMessages: (roomId, limit = 20, before) => {
    let q = `/chat/rooms/${roomId}/messages?limit=${limit}`;
    if (before) q += `&before=${before}`;
    return request(q);
  },
  sendMessage: (roomId, text) =>
    request(`/chat/rooms/${roomId}/messages`, { method: 'POST', body: { text } }),
  reactToMessage: (roomId, messageId, emoji, action = 'add') =>
    request(`/chat/rooms/${roomId}/messages/${messageId}/react`, { method: 'POST', body: { emoji, action } }),

  sendTyping: (roomId) =>
    request(`/chat/rooms/${roomId}/typing`, { method: 'POST' }),
  clearTyping: (roomId) =>
    request(`/chat/rooms/${roomId}/typing/clear`, { method: 'POST' }),

  getUnread: () => request('/chat/unread'),

  addMember: (roomId, userId) =>
    request(`/chat/rooms/${roomId}/members`, { method: 'POST', body: { userId } }),
};
