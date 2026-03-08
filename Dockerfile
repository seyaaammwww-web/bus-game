FROM node:20-alpine

WORKDIR /app

# 1) Copy only package files first — cached if unchanged
COPY package.json package-lock.json* ./

# 2) Install ALL dependencies (need devDeps for build step)
RUN npm ci 2>/dev/null || npm install

# 3) Copy config files
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js components.json drizzle.config.ts ./
COPY .env* ./

# 4) Copy source code (only changed files trigger rebuild from here)
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

# 5) Build the client
RUN npm run build

# 6) Prune dev dependencies after build
RUN npm prune --omit=dev 2>/dev/null || true

ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

CMD ["npm", "start"]
