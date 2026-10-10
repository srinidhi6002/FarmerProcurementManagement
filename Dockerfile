# Dockerfile for Render Docker Environment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start Express server
CMD ["npm", "start"]
