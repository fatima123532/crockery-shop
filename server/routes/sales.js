import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Get all sales with items
router.get('/', (req, res) => {
  const sales = db.prepare('SELECT * FROM sales ORDER BY date DESC').all();
  const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
  const enriched = sales.map(s => {
    const items = getItems.all(s.id);
    return {
      id: s.id,
      date: s.date,
      customerId: s.customer_id,
      customerName: s.customer_name,
      customerPhone: s.customer_phone,
      subtotal: s.subtotal,
      discount: s.discount,
      tax: s.tax,
      finalAmount: s.final_amount,
      final_amount: s.final_amount,
      paymentMethod: s.payment_method,
      payment_method: s.payment_method,
      profit: s.profit,
      items: items.map(it => ({
        productId: it.product_id,
        product_id: it.product_id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        cost: it.cost
      }))
    };
  });
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
  res.json({
    id: sale.id,
    date: sale.date,
    customerId: sale.customer_id,
    customerName: sale.customer_name,
    customerPhone: sale.customer_phone,
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    finalAmount: sale.final_amount,
    paymentMethod: sale.payment_method,
    profit: sale.profit,
    items: items.map(it => ({
      productId: it.product_id,
      name: it.name,
      qty: it.qty,
      price: it.price,
      cost: it.cost
    }))
  });
});

// Create sale - transactional stock deduction
router.post('/', (req, res) => {
  const { customerId, customerName, customerPhone, items, discount, tax, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items required' });
  }
  if (!paymentMethod) return res.status(400).json({ error: 'Payment method required' });

  // Validate stock
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
    if (product.quantity < item.qty) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, requested: ${item.qty}` });
    }
  }

  const saleId = `SAL-${Date.now().toString().slice(-6)}`;
  const date = new Date().toISOString();

  let subtotal = 0;
  let profit = 0;
  let calculatedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    const lineTotal = product.selling_price * item.qty;
    const lineProfit = (product.selling_price - product.purchase_price) * item.qty;
    subtotal += lineTotal;
    profit += lineProfit;
    calculatedItems.push({
      productId: product.id,
      name: product.name,
      qty: item.qty,
      price: product.selling_price,
      cost: product.purchase_price
    });
  }

  const discountRate = Number(discount || 0);
  const taxRate = Number(tax || 0);
  const discountAmount = subtotal * (discountRate / 100);
  const finalAmount = subtotal - discountAmount + taxRate;
  profit = profit - discountAmount; // Profit after discount

  const insertSale = db.prepare(`
    INSERT INTO sales (id, date, customer_id, customer_name, customer_phone, subtotal, discount, tax, final_amount, payment_method, profit)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, name, qty, price, cost) VALUES (?,?,?,?,?,?)
  `);
  const updateStock = db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?');
  const updateCustomer = db.prepare('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?');
  const findOrCreateCustomer = (name, phone) => {
    if (!name || name === 'Walk-in Customer') return null;
    let cust = db.prepare('SELECT * FROM customers WHERE LOWER(name) = LOWER(?)').get(name);
    if (!cust && phone) {
      cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    }
    if (cust) return cust.id;
    if (phone) {
      const newId = `C${Date.now().toString().slice(-5)}`;
      db.prepare('INSERT INTO customers (id, name, phone, address, total_spent, outstanding) VALUES (?,?,?,?,?,?)').run(newId, name, phone, '', 0, 0);
      return newId;
    }
    return null;
  };

  const tx = db.transaction(() => {
    // Create sale
    insertSale.run(saleId, date, customerId || null, customerName || 'Walk-in Customer', customerPhone || '', subtotal, discountRate, taxRate, finalAmount, paymentMethod, profit);
    // Items + stock
    for (const it of calculatedItems) {
      insertItem.run(saleId, it.productId, it.name, it.qty, it.price, it.cost);
      updateStock.run(it.qty, it.productId);
    }
    // Customer spent update or create
    let custIdToUpdate = customerId;
    if (!custIdToUpdate && customerName && customerName !== 'Walk-in Customer') {
      custIdToUpdate = findOrCreateCustomer(customerName, customerPhone);
      // Update sale with resolved customer_id if created
      if (custIdToUpdate) {
        db.prepare('UPDATE sales SET customer_id = ? WHERE id = ?').run(custIdToUpdate, saleId);
      }
    }
    if (custIdToUpdate) {
      try {
        updateCustomer.run(finalAmount, custIdToUpdate);
      } catch (e) {}
    }
  });

  try {
    tx();
    const createdSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const createdItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    res.status(201).json({
      id: createdSale.id,
      date: createdSale.date,
      customerId: createdSale.customer_id,
      customerName: createdSale.customer_name,
      subtotal: createdSale.subtotal,
      discount: createdSale.discount,
      finalAmount: createdSale.final_amount,
      paymentMethod: createdSale.payment_method,
      profit: createdSale.profit,
      items: createdItems.map(it => ({
        productId: it.product_id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        cost: it.cost
      }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  // Prevent deleting sales history per business rule? We allow but restore stock.
  // Spec says never delete historical sales accidentally - so require admin and restore stock.
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can delete sales' });
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
  const tx = db.transaction(() => {
    // Restore stock
    for (const it of items) {
      db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(it.qty, it.product_id);
    }
    // Deduct from customer total_spent if needed
    if (sale.customer_id) {
      db.prepare('UPDATE customers SET total_spent = total_spent - ? WHERE id = ?').run(sale.final_amount, sale.customer_id);
    }
    db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  });
  tx();
  res.json({ success: true });
});

export default router;
