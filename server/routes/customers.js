import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const customers = await db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  const mapped = customers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    totalSpent: c.total_spent,
    total_spent: c.total_spent,
    outstanding: c.outstanding,
    created_at: c.created_at
  }));
  res.json(mapped);
});

router.post('/', async (req, res) => {
  const { id, name, phone, address, totalSpent, outstanding } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const custId = id || `C${Date.now().toString().slice(-5)}`;
  await db.prepare('INSERT INTO customers (id, name, phone, address, total_spent, outstanding) VALUES (?,?,?,?,?,?)').run(custId, name, phone || '', address || '', totalSpent || 0, outstanding || 0);
  res.status(201).json(await db.prepare('SELECT * FROM customers WHERE id = ?').get(custId));
});

router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, phone, address, totalSpent, outstanding } = req.body;
  await db.prepare('UPDATE customers SET name=?, phone=?, address=?, total_spent=?, outstanding=? WHERE id=?').run(
    name || existing.name,
    phone || existing.phone,
    address || existing.address,
    totalSpent != null ? totalSpent : existing.total_spent,
    outstanding != null ? outstanding : existing.outstanding,
    req.params.id
  );
  res.json(await db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', async (req, res) => {
  const sales = await db.prepare('SELECT COUNT(*) as c FROM sales WHERE customer_id = ?').get(req.params.id);
  // parseInt since Postgres might return string for COUNT(*)
  if (parseInt(sales.c, 10) > 0) return res.status(400).json({ error: 'Cannot delete customer with sales history' });
  await db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
