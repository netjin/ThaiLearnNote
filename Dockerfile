FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=5173
ENV DATA_DIR=/app/data

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js db.js index.html admin.html generate.html login.html app.js admin.js login.js styles.css ./
RUN mkdir -p /app/data

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz >/dev/null || exit 1

CMD ["node", "server.js"]
