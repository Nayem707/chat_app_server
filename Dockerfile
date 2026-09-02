# syntax=docker/dockerfile:1.7

# ---- deps stage: install prod deps only ------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production

# Prisma engines require openssl on alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund \
    && npx prisma generate

# ---- runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000

RUN apk add --no-cache openssl tini \
    && addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=deps --chown=app:app /app/prisma ./prisma
COPY --chown=app:app src ./src
COPY --chown=app:app package.json ./

USER app
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider http://localhost:5000/api/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
