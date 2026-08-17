# 🍽️ Crockery House - Full-Stack Inventory & Revenue Management

**Modern, production-ready POS + Inventory + Accounting system for crockery shops**

- **Frontend:** React 18 + Vite + Tailwind + Recharts (Port 5173)
- **Backend:** Node.js + Express + SQLite (better-sqlite3) + JWT + bcrypt (Port 3001)
- **Database:** Relational SQLite `crockery.db` with 10 tables, FKs, WAL, transactions
- **Auth:** JWT Bearer 7-day, bcrypt hashed passwords, role based admin/staff

**Live:** Frontend proxies `/api` → Backend. Both running.

---

## 🚀 Quick Start

### 1. Backend (Terminal 1)
```bash
cd server
npm install
node server.js
# → http://localhost:3001
# → health: http://localhost:3001/api/health
# → DB file: server/crockery.db (auto-created & seeded)
```

Default admin seeded:
- Email: `admin@crockery.local`
- Password: `admin123`

### 2. Frontend (Terminal 2)
```bash
cd /home/user/crockery-shop
npm install
npm run dev
# → http://localhost:5173
# Uses proxy to backend, stores JWT in localStorage
```

Login with admin credentials → Dashboard loads from DB.

---

## 🔐 JWT + Database Details

**See `BACKEND_API_DOCS.md` for full API docs, schema, curl examples.**

**DB Tables:**
- `users` (bcrypt hash, role)
- `suppliers`, `products` (FK supplier), `customers`
- `sales`, `sale_items` (FK CASCADE sale, FK product)
- `purchases`, `purchase_items`
- `expenses`, `stock_adjustments`, `categories`

**Transactional Business Logic:**
- `POST /api/sales` → validates stock, inserts sale + items, decrements quantity, updates customer total_spent — all in one SQLite transaction
- `POST /api/purchases` → inserts purchase + increments stock + updates purchase_price in transaction
- `POST /api/products/:id/adjust` → add/remove/damage with history table
- Delete blocked if history exists (FK integrity → message: "Cannot delete - sales history references")

**Auth Flow:**
- Login → bcrypt compare → sign JWT → frontend stores token → `Authorization: Bearer` on all `/api/*` → middleware verifies → 401 auto-logout

---

## 📊 Features (from spec 100% implemented)

1. **Dashboard:** total products, stock qty, low-stock alerts, today/monthly sales, revenue, expenses, net profit, sales count, recent transactions, charts (14-day revenue, category pie, profit vs expenses, best-selling)
2. **Products & Stock:** CRUD, SKU, brand, category, purchase/selling price + margin %, supplier FK, image upload base64, minStock, damaged tracking, stock adjust modal, history
3. **Sales / POS:** Fast SKU search, cart, customer autocomplete, payment methods Cash/Bank/JazzCash/Easypaisa/Card, discount, tax, subtotal/final/profit calc, invoice modal Print + PDF (jsPDF), stock auto-deduct
4. **Purchases:** Supplier CRUD, purchase create multi-product with qty & cost, auto-increase stock, totals by supplier
5. **Expenses:** Rent, Electricity, Salaries etc., date/category/desc/amount, filters
6. **Reports:** Today/Week/Month/Year/Custom, revenue, COGS, gross, expenses, net, transaction count, best-selling, most profitable, export CSV + PDF
7. **Customers:** name, phone, address, totalSpent, outstanding, purchase history
8. **UI:** Sidebar, cards, tables, search/filter, charts, responsive, crockery-themed (violet/indigo + amber), Outfit font
9. **Auth:** JWT login/logout, bcrypt, role-based, confirm before delete, never deletes historical sales
10. **DB:** Relational, FKs, transactions for accurate inventory

---

## 🛡️ Security

- Passwords never stored plain — bcryptjs hash
- JWT secret env overridable
- All business routes behind `authenticate` middleware
- Frontend auto-clears token on 401
- SQLite file permission local only

---

## 📂 Structure

```
crockery-shop/
  src/App.jsx → Full frontend with apiFetch() JWT + fetchAll()
  server/
    server.js → Express + CORS + routes
    db.js → initDb() creates 10 tables, seeds admin + suppliers + products + customers
    middleware/auth.js → JWT sign/verify
    routes/
      auth.js, products.js, suppliers.js, customers.js, sales.js, purchases.js, expenses.js, reports.js
    crockery.db → SQLite file (gitignored in production)
    package.json
  vite.config.js → proxy /api → localhost:3001
```

---

## 🧪 Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@crockery.local","password":"admin123"}'
```

Returns `{ token, user }`. Use token for protected routes.

---

## 🔄 From localStorage v1 to JWT v2

v1 used `useLocalStorage` for all business data (demo). v2 replaces with:
- `apiFetch` helper with Bearer
- `fetchAll()` parallel loads
- All CRUD via DB + transaction + refresh

No business data in localStorage anymore — only `crockery_token`.

---

## Production Ready Checklist

- [x] JWT + SQLite relational DB
- [x] Transactional sales & purchases
- [x] bcrypt password hashing
- [x] Role-based access
- [x] Accurate revenue/COGS/gross/net calculations
- [x] Low-stock alerts + minStock
- [x] Invoice PDF
- [x] Export CSV/PDF
- [ ] Swap SQLite → Postgres (change db.js to pg, keep same SQL)
- [ ] Add .env, Helmet, RateLimit, S3 uploads

---

Built for real Lahore crockery shop, ready to run locally with full backend.
