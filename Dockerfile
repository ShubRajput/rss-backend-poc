# Use Node.js 18 with Alpine (smaller image)
FROM node:18-alpine

# Install Chromium and its dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer env vars
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including puppeteer-core)
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 8080

# Run the app
CMD ["node", "server.js"]