import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const purchases = db.prepare('SELECT * FROM purchases ORDER BY date DESC').all();
  const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
  const enriched = purchases.map(p => ({
    id: p.id,
    date: p.date,
    supplierId: p.supplier_id,
    supplier_id: p.supplier_id,
    total: p.total,
    items: getItems.all(p.id).map(it => ({
      productId: it.product_id,
      qty: it.qty,
      cost: it.cost
    }))
  }));
  res.json(enriched);
});

router.post('/', (req, res) => {
  const { supplierId, items } = req.body;
  if (!supplierId) return res.status(400).json({ error: 'Supplier required' });
  if (!items || items.length === 0) return res.status(400).json({ error: 'Items required' });

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
  if (!supplier) return res.status(400).json({ error: 'Supplier not found' });

  const purchaseId = `PUR-${Date.now().toString().slice(-5)}`;
  const date = new Date().toISOString();
  let total = 0;
  for (const it of items) {
    total += Number(it.qty) * Number(it.cost);
  }

  const insertPurchase = db.prepare('INSERT INTO purchases (id, date, supplier_id, total) VALUES (?,?,?,?)');
  const insertItem = db.prepare('INSERT INTO purchase_items (purchase_id, product_id, qty, cost) VALUES (?,?,?,?)');
  const updateStock = db.prepare('UPDATE products SET quantity = quantity + ?, purchase_price = ? WHERE id = ?');

  const tx = db.transaction(() => {
    insertPurchase.run(purchaseId, date, supplierId, total);
    for (const it of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId);
      if (!product) throw new Error(`Product ${it.productId} not found`);
      insertItem.run(purchaseId, it.productId, it.qty, it.cost);
      // Update stock and optionally purchase price
      updateStock.run(it.qty, it.cost, it.productId);
    }
  });

  try {
    tx();
    res.status(201).json({ id: purchaseId, date, supplierId, total, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
