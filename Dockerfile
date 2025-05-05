# Use the official Playwright image with all deps preinstalled
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy rest of your app
COPY . .

# Expose port (change if your server uses something else)
EXPOSE 3000

# Start your app
CMD ["npm", "start"]
