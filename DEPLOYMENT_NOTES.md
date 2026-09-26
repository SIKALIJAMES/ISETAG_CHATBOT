# ISETAG CHATBOT V2 — Journal de Déploiement & Configuration

Ce document récapitule l'ensemble des configurations, des correctifs appliqués et de l'architecture du projet pour garantir une reprise de travail immédiate et fluide.

---

## 📌 Informations Générales

- **Dépôt Git :** [https://github.com/SIKALIJAMES/ISETAG_CHATBOT](https://github.com/SIKALIJAMES/ISETAG_CHATBOT)
- **Branche principale :** `main`
- **Hébergement :** Railway
- **URL Publique de Production :** `https://isetagchatbot-production.up.railway.app`
- **Port de l'application :** `3000`

---

## 🏗️ Architecture du Projet

1. **Backend :** Node.js 20, Express, `pg` (PostgreSQL), Webhooks Meta (WhatsApp Cloud API & Messenger), Groq API (IA & Whisper).
2. **Frontend (Dashboard & Formulaires) :** React, Vite, TailwindCSS (compilé dans `frontend/dist` et servi statiquement par le serveur Express).
3. **Base de données :** PostgreSQL (hébergé sur Railway ou Neon) avec migrations SQL automatisées au démarrage (`migrations/run.js`).
4. **Cache & Sessions :** Upstash Redis REST API (persistance de l'historique, de la langue et du prénom du prospect).
5. **IA & Audio :**
   - **Génération de réponses (Chatbot) :** Groq API avec le modèle `openai/gpt-oss-120b` (ou `qwen/qwen3.8-27b`).
   - **Transcription Vocale (Audio/WhatsApp) :** Groq Whisper (`whisper-large-v3-turbo`).
   - **Embeddings RAG :** Google Gemini (`gemini-embedding-2`).

---

## 🔐 Identifiants d'Administration (Dashboard)

- **URL de connexion :** `https://isetagchatbot-production.up.railway.app/login`
- **Email :** `admin@isetag.cm`
- **Mot de passe par défaut :** `isetag2025`

---

## 🛠️ Historique des Problèmes Résolus

### 1. Authentification Base de Données (`28P01` / `ENOTFOUND`)
- **Symptôme :** Les migrations échouaient au démarrage du conteneur avec `password authentication failed for user "postgres"`.
- **Cause :** Mauvais mot de passe PostgreSQL renseigné manuellement.
- **Résolution :** Utilisation de la référence Railway `${{ Postgres.DATABASE_URL }}` pour lier dynamiquement le mot de passe réel généré par Railway.

### 2. Erreur 502 Bad Gateway
- **Symptôme :** Le conteneur démarrait, mais le domaine Railway renvoyait `502 Bad Gateway`.
- **Cause :** Railway écoutait sur le port par défaut `8080`, alors que le conteneur écoute sur le port `3000`.
- **Résolution :** Configuration du **Target Port** sur `3000` dans Railway > Settings > Networking.

### 3. Blocage de l'envoi WhatsApp (`OAuthException code 190`)
- **Symptôme :** Les messages arrivaient sur le serveur mais aucune réponse n'était envoyée.
- **Cause :** Le jeton temporaire WhatsApp avait expiré chez Meta for Developers.
- **Résolution :** Génération et mise à jour d'un nouveau `WHATSAPP_TOKEN` sur Railway.

### 4. Erreur Upstash Redis (`fetch failed`)
- **Symptôme :** Erreurs `[REDIS] error: fetch failed` provoquant des délais réseau.
- **Résolution :** Création d'une base de données Redis gratuite sur [console.upstash.com](https://console.upstash.com) et renseignement des variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.

### 5. Modèles Groq Dépréciés & Réponse de Secours
- **Symptôme :** Le bot répondait systématiquement : *"🤔 J'ai un peu de mal à répondre à ça. Pourriez-vous reformuler votre question ?"* avec l'erreur `The model llama-3.1-8b-instant does not exist or you do not have access to it`.
- **Cause :** Groq a retiré les anciens modèles Llama 3.1/3.3 des comptes gratuits.
- **Résolution :** Remplacement par le modèle de production actif **`openai/gpt-oss-120b`** (qui répond en ~0.5s) via la variable `GROQ_MODEL`.

---

## 🔍 Lien de Pré-inscription : Explication & Solution

### Pourquoi le lien reçu dans le message WhatsApp ne fonctionnait pas ?
Le bot a envoyé :
`https://isetag-chatbot.railway.app/preinscription`

Ce domaine (`isetag-chatbot.railway.app`) est une ancienne URL d'exemple. Le vrai domaine généré sur Railway est :
👉 **`https://isetagchatbot-production.up.railway.app/preinscription`**

### Pour corriger cela définitivement dans les futurs messages du bot :
1. Dans Railway > service **`ISETAG_CHATBOT`** > onglet **Variables**.
2. Modifie ou ajoute la variable :
   ```env
   APP_URL=https://isetagchatbot-production.up.railway.app
   ```
3. Sauvegarde. Le bot enverra désormais le bon lien cliquable vers le formulaire complet !

---

## 📋 Tableau Récapitulatif des Variables d'Environnement (Railway)

| Variable | Description / Exemple de Valeur |
|---|---|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://isetagchatbot-production.up.railway.app` |
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` |
| `GROQ_API_KEY` | Clé API Groq (`gsk_...`) |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `WHATSAPP_TOKEN` | Token d'accès Meta (`EAA...`) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID du numéro WhatsApp Meta |
| `WHATSAPP_APP_SECRET` | Secret de l'application Meta |
| `WHATSAPP_VERIFY_TOKEN` | Token de vérification du webhook |
| `UPSTASH_REDIS_REST_URL` | URL de la base Redis Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Jeton d'accès Redis Upstash |
| `JWT_SECRET` | Clé secrète de signature des tokens admin |
| `ADMIN_EMAIL` | `admin@isetag.cm` |
| `GEMINI_API_KEY` | Clé Google Gemini (utilisée pour les embeddings RAG) |
