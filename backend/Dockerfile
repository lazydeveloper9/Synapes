# Use Node image
FROM node:22-alpine

# Install OpenSSL (required for Prisma on Alpine)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy app code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose backend port
EXPOSE 5000

# Start server: Deploy migrations before booting the app
CMD ["sh", "-c", "npx prisma db push && npm start"]