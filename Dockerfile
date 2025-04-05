FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source files
COPY ../docker .

# Create logs and temp directories
RUN mkdir -p logs temp dist

# Build the frontend
RUN npm run build

# Create shared directory if it doesn't exist
RUN mkdir -p ../shared

# Expose port
EXPOSE 80

# Start server
CMD ["node", "server.js"]
