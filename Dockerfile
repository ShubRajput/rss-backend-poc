# Use Node.js 18
FROM node:18-alpine

# Install Puppeteer dependencies
RUN apk add --no-cache chromium

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Set Puppeteer executable path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expose port
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
