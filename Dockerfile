# Crockery House - Full Stack Production Dockerfile
# Builds frontend + backend and serves both from single container on port 3001

FROM node:20-alpine AS builder
WORKDIR /app
# Copy package files
COPY package.json ./
COPY server/package.json ./server/
# Install deps
RUN npm install
RUN cd server && npm install
# Copy source
COPY . .
# Build frontend
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy built artifacts and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules

# Expose port - Render/Railway will set PORT env
EXPOSE 3001
# SQLite DB will be created in /app/server/crockery.db
# For persistence on Render, add a disk mount to /app/server

CMD ["node", "server/server.js"]
