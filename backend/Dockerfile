FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source files
COPY . .

# Expose the default backend port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
