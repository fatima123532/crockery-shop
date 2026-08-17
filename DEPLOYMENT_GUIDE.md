# 🚀 Deployment Guide - Crockery House

Your app is **production-ready** for both **single-server** and **split** deployments. Real data mode, zero hardcoded seed.

---

## Option 1: Single Server Full-Stack (Recommended for Small Shop)

**Backend serves frontend static files** - one URL, simple.

### Render.com (Free tier, closest to Pakistan = Singapore region)

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Crockery House - Real data production"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crockery-shop.git
git push -u origin main
```

2. Go to https://dashboard.render.com → New → Web Service → Connect your repo

3. Settings:
- **Name:** crockery-house
- **Region:** Singapore
- **Branch:** main
- **Build Command:** `npm install && cd server && npm install && cd .. && npm run build`
- **Start Command:** `npm start`
- **Environment:** Node
- **Add Disk:** Name `crockery-data`, Mount `/opt/render/project/src/server`, Size 1GB (for SQLite persistence)

4. Env Vars:
- `NODE_ENV=production`
- `JWT_SECRET=choose-a-strong-random-secret-32+chars`

5. Deploy → Render will build frontend (`vite build` → `dist/`) and start backend (`server/server.js`) which auto-serves `dist/` on same port.

6. Access: `https://your-app.onrender.com` → Login `admin@crockery.local` / `admin123` → Change password after first login.

**SQLite Persistence Note:** Render disk keeps `crockery.db`. Without disk, DB resets on redeploy. For truly persistent production, migrate to Postgres (see below).

### Railway.app (Alternative)

- Same build/start commands
- Add volume for `/app/server`
- Set env vars

### VPS / Ubuntu 22.04 with PM2 + Nginx

```bash
# On server
git clone your-repo
cd crockery-shop
npm run deploy:build
# install pm2
npm i -g pm2
pm2 start server/server.js --name crockery
pm2 save
pm2 startup

# Nginx reverse proxy
sudo nano /etc/nginx/sites-available/crockery
```
```nginx
server {
  listen 80;
  server_name yourdomain.com;
  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/crockery /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
# Certbot for SSL
sudo certbot --nginx -d yourdomain.com
```

---

## Option 2: Split Deployment (Frontend Vercel + Backend Render)

Best if you want Vercel's CDN speed for frontend.

### Backend → Render

Same as Option 1 but backend runs API-only (no frontend dist needed, but okay if built).

- Deploy backend repo to Render
- Build: `cd server && npm install`
- Start: `cd server && npm start` or `node server/server.js`
- Get URL: `https://crockery-api.onrender.com`

### Frontend → Vercel

1. Import repo to https://vercel.com/new
2. Framework: Vite
3. Build Command: `npm run build`
4. Output: `dist`
5. Env Var:
- `VITE_API_URL=https://crockery-api.onrender.com/api`

6. Deploy → Frontend will call backend API via `VITE_API_URL`

**CORS:** Already open (`origin: true`) for dev. For production, set in `server.js`:
```js
app.use(cors({ origin: 'https://your-frontend.vercel.app', credentials: true }))
```

---

## Option 3: Docker Deployment (Any cloud: Fly.io, DigitalOcean, AWS ECS)

```bash
# Build
docker build -t crockery-house .

# Run locally
docker run -p 3001:3001 -v $(pwd)/server:/app/server -e JWT_SECRET=strong-secret crockery-house

# Push to registry and deploy to Fly.io
flyctl launch
flyctl volumes create crockery_data --region sin --size 1
flyctl deploy
```

---

## Environment Variables

Create `.env` in `server/` or root:

```
PORT=3001
JWT_SECRET=your-super-strong-32-char-secret-change-me
NODE_ENV=production
```

Frontend `.env.production` (if split):

```
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## Post-Deployment Checklist

- [ ] Change admin password: Implement `PUT /api/auth/me` or directly update DB hash via bcrypt
- [ ] Add persistent disk for SQLite or migrate to Postgres
- [ ] Set strong JWT_SECRET
- [ ] Add your first real supplier, products, customers
- [ ] Test POS sale → check stock deduction persists after refresh
- [ ] Backup `crockery.db` regularly (download via Render shell or scp from VPS)
- [ ] Setup SSL (Render/Vercel auto, Nginx via certbot)

---

## Migrating SQLite → Postgres for Production Scale

When shop grows:

1. Create Postgres on Render / Neon / Supabase
2. In `server/db.js`, replace `better-sqlite3` with `pg`
3. Same schema, same transaction logic (BEGIN/COMMIT)
4. Set `DATABASE_URL` env var
5. Keep JWT + routes identical - frontend unchanged

---

## Local Production Test (Before Deploy)

```bash
# Simulate production build + serve
npm run deploy:build
npm start
# Open http://localhost:3001
# Should serve frontend + API on same port
# Login and test real data flow
```

---

## Your Current State

- `server/crockery.db` = 0 products, 0 sales, 1 admin - real empty shop ready
- Frontend built via `npm run build` → `dist/` (Vite)
- Backend serves `dist/` automatically if found, else API-only mode

Deploy now - your clients can start entering real crockery stock today.
