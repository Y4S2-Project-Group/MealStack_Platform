# ── Stage 1: dependencies ──────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:20-slim AS runner
LABEL org.opencontainers.image.title="mealstack-rider-backend"
LABEL org.opencontainers.image.description="MealStack Rider Service Backend"

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY swagger.yaml ./swagger.yaml
COPY package.json ./

RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 3004

ENV NODE_ENV=production
ENV PORT=3004

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
