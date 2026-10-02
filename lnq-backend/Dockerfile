# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Runtime drizzle-kit config
COPY drizzle.config.cjs ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy entire project
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=45s --retries=5 \
  CMD node -e "const req = require('http').get('http://127.0.0.1:3000/health', r => { r.resume(); r.on('end', () => process.exit(r.statusCode === 200 ? 0 : 1)); }); req.on('error', () => process.exit(1));"

# Start application
CMD ["pnpm", "start"]
