FROM node:20-alpine

# Add build tools for native modules like better-sqlite3
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build client and server
RUN npm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=7860

# Expose HF default port
EXPOSE 7860

# Start server directly with node for instant boot
CMD ["node", "dist/index.cjs"]
