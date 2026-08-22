# Multi-stage build for NestJS application
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Install openssl for Prisma and libvips-dev for Sharp
RUN apt-get update && apt-get install -y --no-install-recommends openssl libvips-dev && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma/

# Khắc phục triệt để lỗi Sharp v0.33+ (NPM bug: TypeError endsWith)
# Xóa package-lock.json và dùng npm install để npm tự resolve
RUN rm -f package-lock.json && npm install
# Ép cài đặt các binary của Linux bằng cờ --force để đảm bảo chúng có mặt trên disk
RUN npm install --no-save --force @img/sharp-linux-x64 @img/sharp-linux-arm64
# Sửa file sharp.cjs để in ra lỗi gốc (real error) thay vì crash TypeError endsWith
RUN sed -i 's/if (!err.code.endsWith("MODULE_NOT_FOUND")) {/if (!err || !err.code || !err.code.endsWith("MODULE_NOT_FOUND")) { console.error("SHARP REAL ERROR:", err);/g' node_modules/sharp/dist/sharp.cjs

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
