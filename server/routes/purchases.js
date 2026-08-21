import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const purchases = await db.prepare('SELECT * FROM purchases ORDER BY date DESC').all();
  const enriched = await Promise.all(purchases.map(async p => {
    const items = await db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(p.id);
    return {
      id: p.id,
      date: p.date,
      supplierId: p.supplier_id,
      supplier_id: p.supplier_id,
      total: p.total,
      items: items.map(it => ({
        productId: it.product_id,
        qty: it.qty,
        cost: it.cost
      }))
    };
  }));
  res.json(enriched);
});

router.post('/', async (req, res) => {
  const { supplierId, items } = req.body;
  if (!supplierId) return res.status(400).json({ error: 'Supplier required' });
  if (!items || items.length === 0) return res.status(400).json({ error: 'Items required' });

  const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
  if (!supplier) return res.status(400).json({ error: 'Supplier not found' });

  const purchaseId = `PUR-${Date.now().toString().slice(-5)}`;
  const date = new Date().toISOString();
  let total = 0;
  for (const it of items) {
    total += Number(it.qty) * Number(it.cost);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.prepare('INSERT INTO purchases (id, date, supplier_id, total) VALUES (?,?,?,?)').run(purchaseId, date, supplierId, total);
      for (const it of items) {
        const product = await tx.prepare('SELECT * FROM products WHERE id = ?').get(it.productId);
        if (!product) throw new Error(`Product ${it.productId} not found`);
        await tx.prepare('INSERT INTO purchase_items (purchase_id, product_id, qty, cost) VALUES (?,?,?,?)').run(purchaseId, it.productId, it.qty, it.cost);
        await tx.prepare('UPDATE products SET quantity = quantity + ?, purchase_price = ? WHERE id = ?').run(it.qty, it.cost, it.productId);
      }
    });
    res.status(201).json({ id: purchaseId, date, supplierId, total, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
