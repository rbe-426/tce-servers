# Backend Dockerfile optimisé pour Railway
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances en production uniquement
RUN npm ci --omit=dev

# Copier le code source et Prisma schema
COPY . ./

# Générer Prisma client
RUN npx prisma generate

# Exposition du port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/cors-test', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Démarrage
CMD ["npm", "start"]
