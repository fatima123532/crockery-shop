import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_mvX9e0tuwLzK@ep-lucky-pine-axcrmc8o-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

export async function initDb() {
  console.log('🗄️ Initializing REAL production database (PostgreSQL)...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      image TEXT,
      damaged INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      total_spent REAL DEFAULT 0,
      outstanding REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      profit REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      total REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS purchase_items (
      id SERIAL PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      qty INTEGER NOT NULL,
      cost REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      type TEXT NOT NULL,
      qty INTEGER NOT NULL,
      reason TEXT,
      date TIMESTAMP NOT NULL,
      prev_qty INTEGER NOT NULL,
      new_qty INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const { rows: existingAdmins } = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@crockery.local']);
  if (existingAdmins.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4)', ['admin@crockery.local', hash, 'Shop Owner', 'admin']);
    console.log('👤 Admin created: admin@crockery.local / admin123 (real mode - empty shop)');
  }
}

// Wrapper to make it look somewhat like better-sqlite3 for easier refactoring
class DBWrapper {
  constructor(pool) {
    this.pool = pool;
  }
  
  prepare(sql) {
    // Convert ? to $1, $2, etc.
    let index = 1;
    const pgSql = sql.replace(/\?/g, () => `$${index++}`);
    
    return {
      get: async (...params) => {
        const { rows } = await this.pool.query(pgSql, params);
        return rows[0];
      },
      all: async (...params) => {
        const { rows } = await this.pool.query(pgSql, params);
        return rows;
      },
      run: async (...params) => {
        const result = await this.pool.query(pgSql, params);
        return { lastInsertRowid: result.insertId || 0, changes: result.rowCount };
      }
    };
  }

  async transaction(cb) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Pass a special wrapper that uses this client
      const clientWrapper = new DBWrapper(client);
      const result = await cb(clientWrapper);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

const db = new DBWrapper(pool);
export default db;
