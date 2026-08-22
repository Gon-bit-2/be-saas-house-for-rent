# Multi-stage build for NestJS application
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# --- Build Stage ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client and build the app
RUN npx prisma generate
RUN npm run build
# Giữ lại devDependencies (không prune) để sử dụng npx prisma migrate deploy trong container migration

# --- Production Stage ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Install openssl for Prisma and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security hardening
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/bash -m nestjs

# Copy built artifacts and dependencies
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
COPY --from=build --chown=nestjs:nodejs /app/generated ./generated
COPY --from=build --chown=nestjs:nodejs /app/inittalScripts ./inittalScripts

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 1174

# Start the application
CMD ["node", "dist/main"]
