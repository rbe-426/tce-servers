# Backend Dockerfile optimisé pour Railway
# Utilise node:18-slim au lieu d'alpine pour éviter les problèmes de dépendances
FROM node:18-slim

WORKDIR /app

# Installer les dépendances système nécessaires pour Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances en production uniquement
RUN npm ci --omit=dev

# Copier le code source et Prisma schema
COPY . ./

# Générer Prisma client
RUN npx prisma generate

# Exposition du port
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/cors-test', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Démarrage
CMD ["npm", "start"]
