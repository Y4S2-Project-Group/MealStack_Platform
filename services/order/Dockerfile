# ── Stage 1: dependencies ──────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app/services/order

COPY services/order/package.json ./
RUN npm install --omit=dev --ignore-scripts

# Install shared dependencies
WORKDIR /app/shared
COPY shared/package.json ./
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:20-slim AS runner
LABEL org.opencontainers.image.title="mealstack-order"
LABEL org.opencontainers.image.description="MealStack Order Service"

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser

WORKDIR /app/services/order

COPY --from=deps /app/services/order/node_modules ./node_modules

# Copy shared modules and dependencies
COPY shared /app/shared
COPY --from=deps /app/shared/node_modules /app/shared/node_modules

COPY services/order/src ./src
COPY services/order/package.json ./

RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 4003

ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4003/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
