FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build React app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./
COPY --from=build /app/package.json ./

# Install only production dependencies
RUN npm install --production

# Set environment variables
ENV PORT=80
ENV NODE_ENV=production
ENV PREVIEW_URL=http://preview:3010
ENV CODEBASE_URL=http://codebase:3020

# Expose port
EXPOSE 80

# Start server
CMD ["node", "server.js"]
