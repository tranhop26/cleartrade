FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install all deps including express + http-proxy-middleware
RUN npm install --legacy-peer-deps

# Build Vite app
COPY . .
RUN npm run build

# Expose port
EXPOSE 4173

# Serve with production server
CMD ["node", "server.js"]
