FROM node:22-alpine AS base
WORKDIR /app

# Install deps for the whole monorepo (needed for workspace resolution)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/ 2>/dev/null || true

RUN npm ci --workspace=apps/api --include-workspace-root

# Copy source
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build TypeScript
RUN cd apps/api && npm run build

# ---- production image ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/package.json ./
COPY --from=base /app/package-lock.json ./
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/prisma ./apps/api/prisma
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/index.js"]
