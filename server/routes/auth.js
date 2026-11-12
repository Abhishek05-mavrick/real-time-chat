import { Router } from 'express';
import crypto from 'crypto';
import {
  getUserByUsername, createUser, setSession, deleteSession, getSession,
  setOnline, setOffline, getUserById, initUnreadForUser
} from '../data/store.js';

const router = Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Register
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  const existing = getUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  const user = createUser(username, hashPassword(password));
  initUnreadForUser(user.id);
  const token = crypto.randomBytes(32).toString('hex');
  setSession(token, user.id);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const user = getUserByUsername(username);
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  setSession(token, user.id);
  setOnline(user.id);
  initUnreadForUser(user.id);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const userId = getSession(token);
    if (userId) {
      setOffline(userId);
    }
    deleteSession(token);
  }
  res.json({ message: 'Logged out' });
});

// Get current user
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const userId = getSession(token);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = getUserById(userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ id: user.id, username: user.username, role: user.role });
});

export default router;
