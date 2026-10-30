FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY docker-entrypoint.sh ./
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
USER node
CMD ["sh", "./docker-entrypoint.sh"]
