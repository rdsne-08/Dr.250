FROM node:20-alpine

WORKDIR /workspace/apps/backend

ENV NODE_ENV=production

COPY apps/backend/package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node apps/backend/src ./src
COPY --chown=node:node apps/backend/scripts ./scripts
COPY --chown=node:node database /workspace/database

USER node

EXPOSE 3000

CMD ["sh", "-c", "node scripts/migrate.js && npm start"]
