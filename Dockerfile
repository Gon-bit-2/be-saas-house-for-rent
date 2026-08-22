# Multi-stage build for NestJS application
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Install openssl for Prisma and libvips-dev for Sharp
RUN apt-get update && apt-get install -y --no-install-recommends openssl libvips-dev && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma/

# Xóa package-lock.json để build sạch
RUN rm -f package-lock.json && npm install

# Hạ cấp sharp xuống bản 0.32.6. Bản 0.33+ yêu cầu CPU kiến trúc x86-64-v2 (phải hỗ trợ SSE4.2/AVX) và Wasm SIMD.
# VPS của bạn dùng CPU đời cũ nên không đáp ứng được yêu cầu của bản 0.33+, gây lỗi "Unsupported CPU"
RUN npm install sharp@0.32.6

# --- Build Stage ---
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client and build the app
# Cung cấp dummy DATABASE_URL vì Prisma 7 config sẽ văng lỗi nếu biến này bị thiếu (do ta không copy file .env vào image)
RUN DATABASE_URL="postgresql://postgres:postgres@db:5432/house_rental?schema=public" npx prisma generate
RUN npm run build
# Giữ lại devDependencies (không prune) để sử dụng npx prisma migrate deploy trong container migration

# --- Production Stage ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Install openssl for Prisma and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    libvips-dev \
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
COPY --from=build --chown=nestjs:nodejs /app/prisma.config.ts ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 1174

# Start the application
CMD ["node", "dist/main"]
