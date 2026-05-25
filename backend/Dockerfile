# Stage 1: Build
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the source code
COPY . .

# Generate Prisma client types before compiling TypeScript
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy only the compiled output from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3001

# Start the application
CMD ["node", "dist/src/main"]