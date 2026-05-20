# Étape 1 : Construction du Frontend (Dashboard)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copier les fichiers du frontend et installer les dépendances
COPY frontend/package*.json ./
RUN npm ci

# Copier le reste du frontend et compiler
COPY frontend/ ./
RUN npm run build

# Étape 2 : Construction du Backend et assemblage
FROM node:20-alpine AS runner
WORKDIR /app

# Copier les fichiers du backend
COPY package*.json ./
# Installer uniquement les dépendances de production
RUN npm ci --omit=dev

# Copier le code source du backend
COPY . .

# Récupérer les fichiers compilés du frontend depuis l'étape 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Exposer le port du serveur (3000 par défaut)
EXPOSE 3000

# Variable d'environnement par défaut
ENV NODE_ENV=production

# Commande de démarrage
CMD ["npm", "start"]
