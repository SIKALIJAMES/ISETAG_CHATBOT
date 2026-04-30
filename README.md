# ISETAG Chatbot — WhatsApp FAQ Bot V1

> Chatbot WhatsApp intelligent pour l'Université ISETAG (Cameroun)
> Répond automatiquement aux questions étudiants en FR/EN, traite les messages vocaux, escalade vers un humain.

---

## Stack Technique

| Composant | Technologie |
|---|---|
| Backend | Node.js 20 + Express 4 |
| Base de données | PostgreSQL 16 (Railway.app) |
| Cache/Sessions | Upstash Redis (REST API gratuit) |
| NLP Pass 1 | Correspondance de mots-clés locale (gratuit) |
| NLP Pass 2 | GPT-4o-mini (fallback uniquement) |
| Audio | OpenAI Whisper API |
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| WhatsApp | Meta Cloud API — Mode Sandbox |
| Hébergement | Railway.app (backend) + Vercel (frontend) |

---

## Prérequis

- **Node.js 20 LTS** — [nodejs.org](https://nodejs.org)
- **ngrok** — [ngrok.com](https://ngrok.com) (pour le développement local)
- **Compte Meta Developer** — [developers.facebook.com](https://developers.facebook.com)
- **Compte Railway.app** — [railway.app](https://railway.app) (gratuit)
- **Compte Upstash** — [console.upstash.com](https://console.upstash.com) (gratuit)
- **Compte OpenAI** — [platform.openai.com](https://platform.openai.com) (crédit $5 gratuit)

---

## Installation Rapide

### 1. Cloner et installer les dépendances

```bash
# Backend
cd "ISETAG CHATBOT"
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Remplissez toutes les valeurs dans `.env` (voir les sections ci-dessous pour obtenir chaque clé).

### 3. Démarrer en développement

**Terminal 1 — Backend :**
```bash
npm run dev
```

**Terminal 2 — Frontend :**
```bash
cd frontend
npm run dev
```

**Terminal 3 — ngrok (tunnel HTTPS) :**
```bash
ngrok http 3000
```

Copiez l'URL ngrok (ex: `https://abc123.ngrok-free.app`) — vous en aurez besoin pour le webhook Meta.

---

## Configuration Meta WhatsApp Sandbox

### Étape 1 — Créer l'application Meta

1. Allez sur [developers.facebook.com](https://developers.facebook.com)
2. Cliquez **Mes Apps → Créer une app**
3. Choisissez **Business** → Donnez un nom → **Créer**
4. Dans le tableau de bord, ajoutez le produit **WhatsApp**

### Étape 2 — Récupérer les clés API

Dans **WhatsApp → Paramètres API** :
- Copiez le **Token d'accès temporaire** → `WHATSAPP_TOKEN`
- Copiez le **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`

Dans **Paramètres de l'app → Basique** :
- Copiez le **App Secret** → `WHATSAPP_APP_SECRET`

### Étape 3 — Configurer le Webhook

1. Dans **WhatsApp → Configuration**, section **Webhook** :
2. Cliquez **Modifier**
3. **URL du rappel** : `https://VOTRE-URL-NGROK.ngrok-free.app/webhook/whatsapp`
4. **Token de vérification** : `isetag_verify_token_2025` (ou votre valeur dans `.env`)
5. Cliquez **Vérifier et enregistrer**
6. Abonnez-vous au champ : `messages`

### Étape 4 — Enregistrer des numéros test

En mode sandbox, vous pouvez enregistrer jusqu'à **5 numéros test** :

1. Dans **WhatsApp → Paramètres API**, section **À** :
2. Cliquez **Gérer la liste de numéros de téléphone**
3. Ajoutez vos numéros test (avec l'indicatif pays, ex: `+237600000000`)
4. Chaque numéro recevra un code OTP WhatsApp à confirmer

---

## Configuration Upstash Redis (gratuit)

1. Allez sur [console.upstash.com](https://console.upstash.com)
2. Cliquez **Create Database**
3. Choisissez **Redis**, région la plus proche
4. Dans **REST API** :
   - Copiez `UPSTASH_REDIS_REST_URL`
   - Copiez `UPSTASH_REDIS_REST_TOKEN`

---

## Configuration Railway.app

### Base de données PostgreSQL

1. Allez sur [railway.app](https://railway.app) → **New Project**
2. Cliquez **Add PostgreSQL**
3. Dans **Variables** de PostgreSQL :
   - Copiez `DATABASE_URL` (format: `postgresql://...`)

### Déploiement Backend

1. Dans le même projet Railway, cliquez **New Service → GitHub Repo**
2. Connectez votre dépôt GitHub
3. Dans **Variables** du service, ajoutez toutes vos variables `.env`
4. Railway fournira automatiquement une URL HTTPS → utilisez-la pour le webhook Meta en production

---

## Variables d'Environnement

| Variable | Description | Où l'obtenir |
|---|---|---|
| `WHATSAPP_TOKEN` | Token d'accès Meta | Meta Developer Dashboard |
| `WHATSAPP_PHONE_NUMBER_ID` | ID du numéro WhatsApp | Meta → WhatsApp → API Setup |
| `WHATSAPP_APP_SECRET` | Secret de l'app Meta | Meta → App Settings → Basic |
| `WHATSAPP_VERIFY_TOKEN` | Token de vérification webhook | Vous le créez (n'importe quelle chaîne) |
| `OPENAI_API_KEY` | Clé API OpenAI | platform.openai.com/api-keys |
| `DATABASE_URL` | URL PostgreSQL Railway | Railway → PostgreSQL → Variables |
| `UPSTASH_REDIS_REST_URL` | URL Upstash Redis | Upstash Console → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash | Upstash Console → REST API |
| `JWT_SECRET` | Secret JWT (32+ chars) | Générez: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PHONE_SALT` | Salt pour hachage téléphone | Générez: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_WHATSAPP_NUMBER` | Numéro admin pour escalades | Votre numéro WhatsApp (ex: +237600000000) |

---

## Déploiement Frontend (Vercel)

1. Allez sur [vercel.com](https://vercel.com) → **New Project**
2. Importez votre dépôt GitHub
3. **Root Directory** : `frontend`
4. **Framework** : Vite
5. Dans **Environment Variables**, ajoutez :
   - `VITE_API_URL` = URL de votre backend Railway (ex: `https://isetag-bot.railway.app`)
6. Déployez

> **Note** : Mettez à jour `vite.config.js` pour pointer vers votre backend Railway en production.

---

## Compte Admin par Défaut

Après le premier démarrage, le compte admin est automatiquement créé :

| Champ | Valeur |
|---|---|
| Email | `admin@isetag.cm` |
| Mot de passe | `Admin123!` |

> ⚠️ **Changez ce mot de passe immédiatement en production !**

---

## Architecture du Moteur FAQ

```
Message WhatsApp reçu
        │
        ▼
  Vérification HMAC ──→ Rejeté si invalide
        │
        ▼
  Rate limiting (10 msg/min par utilisateur)
        │
        ▼
  Session Redis (TTL 30 min)
        │
        ▼
  Message audio ? ──→ Whisper transcription
        │
        ▼
  Déclencheur menu ? ──→ Menu interactif WhatsApp
        │
        ▼
  Session escaladée ? ──→ "Conseiller va répondre"
        │
        ▼
  PASS 1 : Correspondance mots-clés locale
  (score >= 0.4 → répondre directement, ~80% des cas, GRATUIT)
        │
        ▼ (si score < 0.4)
  PASS 2 : GPT-4o-mini (API payante minimisée)
  (confidence >= 0.5 → répondre)
        │
        ▼ (si confidence < 0.5)
  ESCALADE → Résumé GPT + Notification admin WhatsApp
```

---

## Structure du Projet

```
ISETAG CHATBOT/
├── server.js                   # Point d'entrée Express
├── package.json
├── .env.example
├── src/
│   ├── config/
│   │   ├── db.js               # Pool PostgreSQL
│   │   ├── redis.js            # Client Upstash Redis
│   │   └── env.js              # Validation Joi
│   ├── webhooks/
│   │   └── whatsapp.js         # Pipeline complet webhook
│   ├── services/
│   │   ├── faq.service.js      # Moteur 2 passes
│   │   ├── nlp.service.js      # franc, détection langue
│   │   ├── audio.service.js    # Whisper transcription
│   │   ├── session.service.js  # Sessions Redis
│   │   └── escalation.service.js
│   ├── api/
│   │   ├── auth.routes.js      # Login/logout JWT
│   │   ├── faqs.routes.js      # CRUD FAQs
│   │   ├── conversations.routes.js
│   │   └── stats.routes.js     # Analytiques
│   └── utils/
│       ├── logger.js           # Winston
│       ├── crypto.js           # Hachage téléphone
│       └── formatter.js        # Messages WhatsApp
├── migrations/
│   ├── 001_init.sql            # Schéma PostgreSQL
│   ├── run.js                  # Runner migration
│   └── seed.js                 # Données initiales
└── frontend/                   # App React
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── FAQs.jsx
    │   │   ├── Conversations.jsx
    │   │   └── Analytics.jsx
    │   ├── components/ui/Layout.jsx
    │   ├── api/client.js       # Axios
    │   ├── context/AuthContext.jsx
    │   └── App.jsx
    ├── vite.config.js
    └── tailwind.config.js
```

---

## API Endpoints

| Méthode | URL | Description | Auth |
|---|---|---|---|
| GET | `/health` | Vérification santé | ❌ |
| GET | `/webhook/whatsapp` | Vérification webhook Meta | ❌ |
| POST | `/webhook/whatsapp` | Messages entrants WhatsApp | ❌ |
| POST | `/api/auth/login` | Connexion admin | ❌ |
| POST | `/api/auth/logout` | Déconnexion | ✅ |
| GET | `/api/auth/me` | Info admin | ✅ |
| GET | `/api/faqs` | Liste FAQs | ✅ |
| POST | `/api/faqs` | Créer FAQ | ✅ |
| PUT | `/api/faqs/:id` | Modifier FAQ | ✅ |
| PATCH | `/api/faqs/:id/toggle` | Activer/désactiver | ✅ |
| DELETE | `/api/faqs/:id` | Supprimer FAQ | ✅ |
| GET | `/api/conversations` | Liste conversations | ✅ |
| GET | `/api/conversations/:id` | Détail + messages | ✅ |
| PATCH | `/api/conversations/:id/close` | Fermer conversation | ✅ |
| GET | `/api/stats/overview` | KPIs tableau de bord | ✅ |
| GET | `/api/stats/messages-per-day` | Messages/jour (14j) | ✅ |
| GET | `/api/stats/top-faqs` | FAQs les + consultées | ✅ |
| GET | `/api/stats/escalation-rate` | Taux d'escalade | ✅ |
| GET | `/api/stats/languages` | Répartition langues | ✅ |

---

## Fonctionnalités V2 (Non implémentées)

- Numéro WhatsApp Business réel (carte SIM)
- Canaux Facebook/Instagram/TikTok
- Partage de PDF via Cloudinary
- Messages en masse (broadcast)
- Railway Pro (serveur toujours actif)
- Soumission complète Meta App Review

---

## Support

Pour tout problème, vérifiez :
1. Les logs : `logs/combined.log` et `logs/error.log`
2. L'endpoint health : `http://localhost:3000/health`
3. La signature webhook dans les logs Express
