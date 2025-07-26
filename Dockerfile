# Criminal Law AI Chatbot Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install Python and build dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production

# Install client dependencies
WORKDIR /app/client
RUN npm ci --only=production

# Build React app
RUN npm run build

# Switch back to app directory
WORKDIR /app

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p server/uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]