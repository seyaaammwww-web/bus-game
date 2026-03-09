# Build Stage
FROM node:20-slim AS builder

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source and build (transpile TS to JS bundle)
COPY . .
RUN npm run build

# Prune devDependencies to keep the image lean
RUN npm prune --production

# Runtime Stage
FROM node:20-slim

# better-sqlite3 needs the binary built in stage 1. 
# We copy node_modules entirely since we already pruned it.
WORKDIR /app

# Copy necessary production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/data ./server/data
COPY --from=builder /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=7860

# Expose HF default port
EXPOSE 7860

# Start server directly with node for instant boot
CMD ["node", "dist/index.cjs"]
