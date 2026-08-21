import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  const { from, to } = req.query;
  let whereClause = '';
  let params = [];
  if (from && to) {
    whereClause = 'WHERE date BETWEEN ? AND ?';
    params = [new Date(from).toISOString(), new Date(to).toISOString()];
  }
  const sales = await db.prepare(`SELECT * FROM sales ${whereClause} ORDER BY date DESC`).all(...params);
  const expenses = await db.prepare(`SELECT * FROM expenses ${whereClause} ORDER BY date DESC`).all(...params);
  const salesCount = sales.length;
  const revenue = sales.reduce((s, x) => s + x.final_amount, 0);
  const profit = sales.reduce((s, x) => s + x.profit, 0);
  
  // COGS calculation via sale_items
  let cogs = 0;
  for (const sale of sales) {
    const items = await db.prepare('SELECT cost, qty FROM sale_items WHERE sale_id = ?').all(sale.id);
    for (const it of items) cogs += it.cost * it.qty;
  }
  const gross = revenue - cogs;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const net = gross - totalExpenses;

  res.json({
    from, to,
    revenue,
    cogs,
    gross,
    totalExpenses,
    net,
    salesCount,
    expenseCount: expenses.length,
    profit
  });
});

router.get('/best-selling', async (req, res) => {
  const { from, to } = req.query;
  let whereClause = '';
  let params = [];
  if (from && to) {
    whereClause = 'WHERE s.date BETWEEN ? AND ?';
    params = [new Date(from).toISOString(), new Date(to).toISOString()];
  }
  const rows = await db.prepare(`
    SELECT si.product_id, si.name, SUM(si.qty) as total_qty, SUM(si.qty * si.price) as total_revenue, 
           SUM(si.qty * (si.price - si.cost)) as total_profit, AVG(si.price) as avg_price, AVG(si.cost) as avg_cost
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    ${whereClause}
    GROUP BY si.product_id
    ORDER BY total_qty DESC
    LIMIT 10
  `).all(...params);
  res.json(rows);
});

router.get('/stock-adjustments', async (req, res) => {
  const adjustments = await db.prepare('SELECT * FROM stock_adjustments ORDER BY date DESC LIMIT 100').all();
  res.json(adjustments);
});

export default router;
