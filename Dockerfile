# --- STAGE 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for build)
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Copy config files
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js components.json drizzle.config.ts ./

# Copy source code and build script
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/
COPY script/ ./script/
COPY attached_assets/ ./attached_assets/

# Build client + server bundle
RUN npm run build

# --- STAGE 2: Runtime ---
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy only package files and install ONLY production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy the built assets from the builder stage
COPY --from=builder /app/dist ./dist

# Environment variables
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
