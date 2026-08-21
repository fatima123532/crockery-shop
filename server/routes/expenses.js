import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const expenses = await db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  res.json(expenses.map(e => ({
    id: e.id,
    date: e.date,
    category: e.category,
    description: e.description,
    amount: e.amount
  })));
});

router.post('/', async (req, res) => {
  const { category, description, amount, date } = req.body;
  if (!category || !description || !amount) return res.status(400).json({ error: 'Missing fields' });
  const id = `E${Date.now().toString().slice(-5)}`;
  const expDate = date ? new Date(date).toISOString() : new Date().toISOString();
  await db.prepare('INSERT INTO expenses (id, date, category, description, amount) VALUES (?,?,?,?,?)').run(id, expDate, category, description, Number(amount));
  res.status(201).json(await db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
});

router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { category, description, amount, date } = req.body;
  await db.prepare('UPDATE expenses SET category=?, description=?, amount=?, date=? WHERE id=?').run(
    category || existing.category,
    description || existing.description,
    amount != null ? Number(amount) : existing.amount,
    date ? new Date(date).toISOString() : existing.date,
    req.params.id
  );
  res.json(await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id));
});

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
