FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/worker/package*.json ./apps/worker/
COPY apps/api/package*.json ./apps/api/
RUN npm ci
COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker
COPY apps/api ./apps/api
RUN npm run --workspace packages/shared build
RUN npm run --workspace apps/worker build
RUN npm run --workspace apps/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/worker/package*.json ./apps/worker/
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
RUN mkdir -p /app/apps/api/uploads && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "apps/api/dist/index.js"]