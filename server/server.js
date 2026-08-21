import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import supplierRoutes from './routes/suppliers.js';
import customerRoutes from './routes/customers.js';
import salesRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchases.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import db from './db.js';
import { authenticate } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Health
app.get('/api/health', async (req, res) => {
  const counts = {
    products: (await db.prepare('SELECT COUNT(*) as c FROM products').get()).c,
    sales: (await db.prepare('SELECT COUNT(*) as c FROM sales').get()).c,
    customers: (await db.prepare('SELECT COUNT(*) as c FROM customers').get()).c,
    suppliers: (await db.prepare('SELECT COUNT(*) as c FROM suppliers').get()).c,
    purchases: (await db.prepare('SELECT COUNT(*) as c FROM purchases').get()).c,
    expenses: (await db.prepare('SELECT COUNT(*) as c FROM expenses').get()).c,
    users: (await db.prepare('SELECT COUNT(*) as c FROM users').get()).c,
  };
  res.json({ status: 'ok', counts, message: 'JWT Backend + PostgreSQL ready - Real Data Mode', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/adjustments', authenticate, async (req, res) => {
  const adjustments = await db.prepare('SELECT * FROM stock_adjustments ORDER BY date DESC').all();
  res.json(adjustments.map(a => ({
    id: a.id,
    productId: a.product_id,
    productName: a.product_name,
    type: a.type,
    qty: a.qty,
    reason: a.reason,
    date: a.date,
    prevQty: a.prev_qty,
    newQty: a.new_qty
  })));
});

// --- Production: Serve frontend static files ---
const frontendDistPaths = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../../dist'),
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), '../dist')
];

let frontendDist = null;
for (const p of frontendDistPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    frontendDist = p;
    console.log(`📁 Serving frontend from: ${p}`);
    break;
  }
}

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.log('⚠️ Frontend dist not found - running in API-only mode.');
  app.get('/', (req, res) => {
    res.json({ status: 'Crockery House API running - Real Data Mode (Postgres)', version: '1.0.0' });
  });
}

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message });
});

async function startServer() {
  await initDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Crockery House Backend running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Admin: admin@crockery.local / admin123`);
    if (frontendDist) console.log(`🌐 Frontend: http://localhost:${PORT} (served from ${frontendDist})`);
    console.log('');
  });
}

startServer();
