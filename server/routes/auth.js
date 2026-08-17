import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register (for staff creation)
router.post('/register', authenticate, (req, res) => {
  // Only admin can create users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can create users' });
  }
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, name required' });
  }
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)').run(email, hash, name, role || 'staff');
  const user = { id: result.lastInsertRowid, email, name, role: role || 'staff' };
  res.json({ user, token: signToken(user) });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  
  const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(safeUser);
  
  res.json({ user: safeUser, token });
});

// Me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// List users (admin)
router.get('/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users').all();
  res.json(users);
});

export default router;
