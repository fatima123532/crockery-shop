import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
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

router.post('/', (req, res) => {
  const { id, name, phone, address, totalSpent, outstanding } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const custId = id || `C${Date.now().toString().slice(-5)}`;
  db.prepare('INSERT INTO customers (id, name, phone, address, total_spent, outstanding) VALUES (?,?,?,?,?,?)').run(custId, name, phone || '', address || '', totalSpent || 0, outstanding || 0);
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(custId));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, phone, address, totalSpent, outstanding } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, address=?, total_spent=?, outstanding=? WHERE id=?').run(
    name || existing.name,
    phone || existing.phone,
    address || existing.address,
    totalSpent != null ? totalSpent : existing.total_spent,
    outstanding != null ? outstanding : existing.outstanding,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const sales = db.prepare('SELECT COUNT(*) as c FROM sales WHERE customer_id = ?').get(req.params.id);
  if (sales.c > 0) return res.status(400).json({ error: 'Cannot delete customer with sales history' });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
