FROM node:20-alpine

WORKDIR /app

# 1) Copy package files first — cached if unchanged
COPY package.json package-lock.json* ./

# 2) Install ALL dependencies (need devDeps for build step)
RUN npm ci 2>/dev/null || npm install

# 3) Copy config files (drizzle, tailwind, etc.)
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js components.json drizzle.config.ts ./

# 4) Copy all necessary source code
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/
COPY script/ ./script/
COPY attached_assets/ ./attached_assets/

# 5) Build the application (client + server bundle)
RUN npm run build

# 6) Prune dev dependencies after build to keep image lean
RUN npm prune --omit=dev 2>/dev/null || true

ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
