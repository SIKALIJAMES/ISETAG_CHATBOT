# 🤖 ISETAG CHATBOT V2 — IA & RAG

La Version 2 du chatbot officiel de l'université ISETAG (Cameroun), construite pour être stable, intelligente et bilingue.

## 🌟 Nouveautés V2
- **IA RAG** : Utilise GPT-4o-mini + pgvector pour répondre en utilisant vos propres documents (PDF/Text).
- **Zéro Cold Start** : Système de keep-alive pour Neon PostgreSQL.
- **Webhook Async** : Réponse instantanée à Meta (évite les timeouts).
- **Dashboard Premium** : Interface React moderne pour gérer la connaissance et voir les stats.
- **Bilingue** : Détection automatique Français/Anglais.

## 🛠️ Installation Locale

### 1. Prérequis
- Node.js 20+
- Comptes : OpenAI, Meta Developers, Neon.tech, Upstash.

### 2. Backend
```bash
# Dans le dossier racine
npm install
cp .env.example .env
# Remplissez votre .env avec vos clés

# Lancer les migrations (création des tables + pgvector)
npm run migrate

# Lancer le seed (créer le compte admin par défaut)
npm run seed
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🚀 Déploiement Railway

1. Installez la CLI Railway : `npm i -g @railway/cli`
2. `railway login`
3. `railway up`
4. Ajoutez vos variables d'environnement dans le dashboard Railway.
5. Copiez l'URL générée par Railway pour la mettre dans votre webhook Meta : `https://votrelient.up.railway.app/webhook/whatsapp`

## 🧠 Comment rendre le bot intelligent ?
1. Connectez-vous au dashboard admin (`admin@isetag.cm` / `isetag2025`).
2. Allez dans l'onglet **Knowledge**.
3. Uploadez le règlement intérieur ou les brochures de l'école (PDF ou TXT).
4. Le bot va automatiquement découper, vectoriser et mémoriser ces informations pour répondre aux étudiants.

## 🛡️ Sécurité
- Signature HMAC vérifiée pour chaque webhook.
- Authentification JWT pour l'admin.
- Rate limiting inclus.
