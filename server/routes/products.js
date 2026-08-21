import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Get all products with supplier name
router.get('/', async (req, res) => {
  const products = await db.prepare(`
    SELECT p.*, s.name as supplier_name 
    FROM products p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    ORDER BY p.created_at DESC
  `).all();
  // Map to camelCase for frontend
  const mapped = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    brand: p.brand,
    purchasePrice: p.purchase_price,
    sellingPrice: p.selling_price,
    quantity: p.quantity,
    minStock: p.min_stock,
    supplierId: p.supplier_id,
    supplierName: p.supplier_name,
    image: p.image,
    damaged: p.damaged,
    createdAt: p.created_at
  }));
  res.json(mapped);
});

router.get('/:id', async (req, res) => {
  if (req.params.id === 'adjustments') return;
  const p = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    brand: p.brand,
    purchasePrice: p.purchase_price,
    sellingPrice: p.selling_price,
    quantity: p.quantity,
    minStock: p.min_stock,
    supplierId: p.supplier_id,
    image: p.image,
    damaged: p.damaged
  });
});

// Create product
router.post('/', async (req, res) => {
  const { id, name, sku, category, brand, purchasePrice, sellingPrice, quantity, minStock, supplierId, image } = req.body;
  if (!name || !sku || !category || purchasePrice == null || sellingPrice == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const prodId = id || `P${Date.now().toString().slice(-6)}`;
  try {
    await db.prepare(`
      INSERT INTO products (id, name, sku, category, brand, purchase_price, selling_price, quantity, min_stock, supplier_id, image, damaged)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,0)
    `).run(prodId, name, sku, category, brand || '', Number(purchasePrice), Number(sellingPrice), Number(quantity||0), Number(minStock||5), supplierId || null, image || '');
    const created = await db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
    res.status(201).json(created);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: e.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, sku, category, brand, purchasePrice, sellingPrice, quantity, minStock, supplierId, image, damaged } = req.body;
  try {
    await db.prepare(`
      UPDATE products SET name=?, sku=?, category=?, brand=?, purchase_price=?, selling_price=?, quantity=?, min_stock=?, supplier_id=?, image=?, damaged=?
      WHERE id=?
    `).run(
      name ?? existing.name,
      sku ?? existing.sku,
      category ?? existing.category,
      brand ?? existing.brand,
      purchasePrice != null ? Number(purchasePrice) : existing.purchase_price,
      sellingPrice != null ? Number(sellingPrice) : existing.selling_price,
      quantity != null ? Number(quantity) : existing.quantity,
      minStock != null ? Number(minStock) : existing.min_stock,
      supplierId !== undefined ? supplierId : existing.supplier_id,
      image ?? existing.image,
      damaged != null ? Number(damaged) : existing.damaged,
      req.params.id
    );
    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  const saleRef = await db.prepare('SELECT COUNT(*) as c FROM sale_items WHERE product_id = ?').get(req.params.id);
  if (parseInt(saleRef.c, 10) > 0) {
    return res.status(400).json({ error: `Cannot delete - ${saleRef.c} sales history references this product. Archive instead by setting quantity to 0.` });
  }
  const result = await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Stock adjustment
router.post('/:id/adjust', async (req, res) => {
  const { type, qty, reason } = req.body; 
  if (!['add','remove','damage'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Qty must be >0' });
  
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  const prevQty = product.quantity;
  let newQty = prevQty;
  let newDamaged = product.damaged;
  
  if (type === 'add') newQty = prevQty + Number(qty);
  else if (type === 'remove') newQty = prevQty - Number(qty);
  else if (type === 'damage') {
    newQty = prevQty - Number(qty);
    newDamaged = product.damaged + Number(qty);
  }
  if (newQty < 0) return res.status(400).json({ error: 'Quantity cannot go negative' });
  
  await db.transaction(async (tx) => {
    await tx.prepare('UPDATE products SET quantity = ?, damaged = ? WHERE id = ?').run(newQty, newDamaged, product.id);
    const adjId = `ADJ-${Date.now()}`;
    await tx.prepare(`
      INSERT INTO stock_adjustments (id, product_id, product_name, type, qty, reason, date, prev_qty, new_qty)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(adjId, product.id, product.name, type, Number(qty), reason || '', new Date().toISOString(), prevQty, newQty);
  });
  
  const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
