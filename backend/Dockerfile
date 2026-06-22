FROM node:20-alpine

WORKDIR /app

# Copy package.json only first (better layer caching)
COPY package.json ./

# Use npm install (not npm ci) with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start backend
CMD ["node", "src/index.js"]
