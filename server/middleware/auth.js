import { getSession, getUserById } from '../data/store.js';

// Auth middleware: checks session token from Authorization header or query param
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = getSession(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const user = getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  next();
}

// Error handling middleware
export function errorHandler(err, req, res, next) {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
}
