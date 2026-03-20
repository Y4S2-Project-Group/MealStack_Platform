# ── Stage 1: dependencies ──────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app/services/auth

COPY services/auth/package.json ./
RUN npm install --omit=dev --ignore-scripts

# Install shared dependencies
WORKDIR /app/shared
COPY shared/package.json ./
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:20-slim AS runner
LABEL org.opencontainers.image.title="mealstack-auth"
LABEL org.opencontainers.image.description="MealStack Auth Service"

# Non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser

WORKDIR /app/services/auth

# Copy production node_modules from deps stage
COPY --from=deps /app/services/auth/node_modules ./node_modules

# Copy shared modules and dependencies
COPY shared /app/shared
COPY --from=deps /app/shared/node_modules /app/shared/node_modules

# Copy application source
COPY services/auth/src ./src
COPY services/auth/package.json ./

# Set ownership
RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 4001

ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
