import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Get all sales with items
router.get('/', async (req, res) => {
  const sales = await db.prepare('SELECT * FROM sales ORDER BY date DESC').all();
  const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
  const enriched = await Promise.all(sales.map(async s => {
    const items = await getItems.all(s.id);
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
  }));
  res.json(enriched);
});

router.get('/:id', async (req, res) => {
  const sale = await db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  const items = await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
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
router.post('/', async (req, res) => {
  const { customerId, customerName, customerPhone, items, discount, tax, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items required' });
  }
  if (!paymentMethod) return res.status(400).json({ error: 'Payment method required' });

  // Validate stock
  for (const item of items) {
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
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
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
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
  profit = profit - discountAmount;

  const findOrCreateCustomer = async (name, phone, tx) => {
    if (!name || name === 'Walk-in Customer') return null;
    let cust = await tx.prepare('SELECT * FROM customers WHERE LOWER(name) = LOWER(?)').get(name);
    if (!cust && phone) {
      cust = await tx.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    }
    if (cust) return cust.id;
    if (phone) {
      const newId = `C${Date.now().toString().slice(-5)}`;
      await tx.prepare('INSERT INTO customers (id, name, phone, address, total_spent, outstanding) VALUES (?,?,?,?,?,?)').run(newId, name, phone, '', 0, 0);
      return newId;
    }
    return null;
  };

  try {
    await db.transaction(async (tx) => {
      await tx.prepare(`
        INSERT INTO sales (id, date, customer_id, customer_name, customer_phone, subtotal, discount, tax, final_amount, payment_method, profit)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(saleId, date, customerId || null, customerName || 'Walk-in Customer', customerPhone || '', subtotal, discountRate, taxRate, finalAmount, paymentMethod, profit);
      
      for (const it of calculatedItems) {
        await tx.prepare(`INSERT INTO sale_items (sale_id, product_id, name, qty, price, cost) VALUES (?,?,?,?,?,?)`).run(saleId, it.productId, it.name, it.qty, it.price, it.cost);
        await tx.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(it.qty, it.productId);
      }
      
      let custIdToUpdate = customerId;
      if (!custIdToUpdate && customerName && customerName !== 'Walk-in Customer') {
        custIdToUpdate = await findOrCreateCustomer(customerName, customerPhone, tx);
        if (custIdToUpdate) {
          await tx.prepare('UPDATE sales SET customer_id = ? WHERE id = ?').run(custIdToUpdate, saleId);
        }
      }
      if (custIdToUpdate) {
        try {
          await tx.prepare('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?').run(finalAmount, custIdToUpdate);
        } catch (e) {}
      }
    });

    const createdSale = await db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const createdItems = await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
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

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can delete sales' });
  const sale = await db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  const items = await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
  
  await db.transaction(async (tx) => {
    for (const it of items) {
      await tx.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(it.qty, it.product_id);
    }
    if (sale.customer_id) {
      await tx.prepare('UPDATE customers SET total_spent = total_spent - ? WHERE id = ?').run(sale.final_amount, sale.customer_id);
    }
    await tx.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  });
  res.json({ success: true });
});

export default router;
