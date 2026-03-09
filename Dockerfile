# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Runtime Stage
FROM node:20-slim

# Install better-sqlite3 runtime dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/data ./server/data

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Set production environment
ENV NODE_ENV=production
ENV PORT=7860

# Expose port (HF standard)
EXPOSE 7860

# Start server directly with node for faster boot
CMD ["node", "dist/index.cjs"]
