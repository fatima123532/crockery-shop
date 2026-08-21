import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const suppliers = await db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all();
  res.json(suppliers);
});

router.post('/', async (req, res) => {
  const { id, name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const supId = id || `S${Date.now().toString().slice(-5)}`;
  try {
    await db.prepare('INSERT INTO suppliers (id, name, phone, email, address) VALUES (?,?,?,?,?)').run(supId, name, phone || '', email || '', address || '');
    res.status(201).json(await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, phone, email, address } = req.body;
  await db.prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=? WHERE id=?').run(name || existing.name, phone || existing.phone, email || existing.email, address || existing.address, req.params.id);
  res.json(await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', async (req, res) => {
  const purchases = await db.prepare('SELECT COUNT(*) as c FROM purchases WHERE supplier_id = ?').get(req.params.id);
  if (parseInt(purchases.c, 10) > 0) return res.status(400).json({ error: 'Cannot delete supplier with purchase history' });
  await db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
