FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source files
COPY backend/ ./backend/

WORKDIR /app/backend

# Expose the default backend port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
