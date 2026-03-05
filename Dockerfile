# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine AS production

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --chown=nodejs:nodejs package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist

USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
