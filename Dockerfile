# Dockerfile for Render Deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy all application files
COPY . .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5000

# Start Express API server
CMD ["node", "index.js"]
