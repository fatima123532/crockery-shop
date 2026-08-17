# 🔐 Crockery House - JWT Backend + SQLite Database

## Architecture

**Backend:** Node.js + Express + better-sqlite3 (SQLite) + JWT + bcryptjs
- **Port:** 3001 (0.0.0.0)
- **Database File:** `server/crockery.db` (WAL mode, FK ON)
- **Auth:** Bearer JWT, 7-day expiry, secret in env `JWT_SECRET`
- **Password Hashing:** bcryptjs 10 rounds

**Frontend:** React + Vite proxy `/api` → `http://localhost:3001`
- Port 5173
- Uses fetch with Authorization header from localStorage `crockery_token`

---

## Database Schema (Relational)

```sql
users (id INTEGER PK, email UNIQUE, password_hash, name, role admin|staff, created_at)
categories (id, name UNIQUE)
suppliers (id TEXT PK e.g. S001, name, phone, email, address)
products (id TEXT PK, name, sku UNIQUE, category, brand, purchase_price REAL, selling_price REAL, quantity INT, min_stock INT, supplier_id FK, image TEXT, damaged INT)
customers (id TEXT PK, name, phone, address, total_spent REAL, outstanding REAL)
sales (id TEXT PK SAL-..., date DATETIME, customer_id FK, customer_name, customer_phone, subtotal REAL, discount REAL, tax REAL, final_amount REAL, payment_method, profit REAL)
sale_items (id INTEGER PK AUTOINCREMENT, sale_id FK CASCADE, product_id FK, name, qty, price, cost)
purchases (id TEXT PK PUR-..., date, supplier_id FK, total REAL)
purchase_items (id PK, purchase_id FK CASCADE, product_id FK, qty, cost)
expenses (id TEXT PK, date, category, description, amount REAL)
stock_adjustments (id TEXT PK ADJ-..., product_id FK, product_name, type add|remove|damage, qty, reason, date, prev_qty, new_qty)
```

**Integrity Rules:**
- Foreign keys ON
- Sales deletion restores stock + deducts customer total_spent, only admin allowed (spec: never delete accidentally)
- Purchase creates stock in transaction
- Sale creation checks stock availability in transaction (prevents oversell)
- Supplier/Customer/Product deletion blocked if FK history exists (business rule)
- All quantity mutations go through transactions

---

## API Endpoints

### Auth - Public then Protected
- `POST /api/auth/login` => { token, user }
  - Body: { email, password }
- `GET /api/auth/me` => user (Bearer required)
- `POST /api/auth/register` => create staff (admin only, Bearer)
- `GET /api/auth/users` => list users (admin)

### Products
- `GET /api/products` - list with supplier_name join
- `GET /api/products/:id`
- `POST /api/products` - create
- `PUT /api/products/:id` - update
- `DELETE /api/products/:id` - blocked if sale_items reference
- `POST /api/products/:id/adjust` - { type: add|remove|damage, qty, reason } => transactional history
- `GET /api/adjustments` - history

### Suppliers
- `GET /api/suppliers`
- `POST /api/suppliers`
- `PUT /api/suppliers/:id`
- `DELETE` blocked if purchases exist

### Customers
- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE` blocked if sales exist

### Sales - Transactional Core
- `GET /api/sales` - with items
- `GET /api/sales/:id`
- `POST /api/sales` - **transaction:**
  1. Validate stock for each item
  2. Calculate subtotal, discount, final, profit
  3. Insert sales + sale_items
  4. Decrement products.quantity
  5. Update or create customer + increment total_spent
  - Body: { customerId?, customerName, customerPhone?, items: [{productId, qty}], discount, tax, paymentMethod }
- `DELETE /api/sales/:id` - admin only, restores stock

### Purchases - Transactional
- `GET /api/purchases`
- `POST /api/purchases` - transaction: insert purchase + items + increment stock + update purchase_price
  - Body: { supplierId, items: [{productId, qty, cost}] }

### Expenses
- `GET /api/expenses`
- `POST /api/expenses`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`

### Reports
- `GET /api/reports/summary?from=ISOString&to=ISOString` => { revenue, cogs, gross, totalExpenses, net, salesCount }
- `GET /api/reports/best-selling?from&to`
- `GET /api/adjustments` - stock adjustments history
- `GET /api/health` - counts

---

## JWT Flow

1. User posts email/password to `/api/auth/login`
2. Backend verifies bcrypt hash
3. Signs JWT: `{ id, email, role, name }` with `JWT_SECRET`, 7d expiry
4. Frontend stores token in `localStorage['crockery_token']`
5. All subsequent `/api/*` requests add `Authorization: Bearer <token>`
6. Middleware `authenticate` verifies JWT, attaches `req.user`
7. On 401, frontend clears token and reloads to login page

**Default Admin Seeded:**
- Email: `admin@crockery.local`
- Password: `admin123`
- Hash stored, never plain text

---

## Running

### Backend Only
```bash
cd server
npm install
npm start # or npm run dev with --watch Node 20+
# http://localhost:3001
# http://localhost:3001/api/health
```

### Frontend Only (needs backend)
```bash
npm install
npm run dev # http://localhost:5173 , proxies /api to 3001
```

### Both (two terminals)
- Terminal 1: `cd server && node server.js`
- Terminal 2: `cd .. && npm run dev`

---

## Security Notes

- All routes except `/` and `/api/health` and `/api/auth/login` require Bearer JWT
- Passwords hashed with bcryptjs (10 salt rounds)
- JWT secret default but overridable via `.env`
- CORS open for dev (origin: true) - lock to frontend domain in production
- SQLite WAL mode for concurrency
- Transactions using `better-sqlite3` transaction() to ensure ACID

---

## Frontend Migration from localStorage to DB

Old app used `useLocalStorage` hooks. New app:
- `apiFetch` helper adds JWT header
- `fetchAll()` loads 7 tables in parallel on login
- All mutations call API then `fetchAll()` refresh (strong consistency vs optimistic)
- No more localStorage for business data, only token

---

## Testing with curl

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@crockery.local","password":"admin123"}' | jq -r .token)

# Health
curl http://localhost:3001/api/health

# List products
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/products

# Create sale
curl -X POST http://localhost:3001/api/sales -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "customerName": "Test Customer",
  "paymentMethod": "cash",
  "discount": 0,
  "items": [{"productId": "P001", "qty": 1}]
}'
```

---

## Production Upgrades

- Swap SQLite for Postgres: change db.js to use `pg` + similar schema, keep transaction logic
- Use Prisma or Knex for migrations
- Store images in S3 / local /uploads via multer (already installed)
- Add rate limiting, helmet
- Add `.env` with JWT_SECRET, DATABASE_URL
- Dockerize both services

---

This backend fulfills the spec: proper relational DB, JWT, secure password handling, role-based, transactional inventory, never deletes historical sales accidentally, accurate financials.
