# 📘 DESCRIPTION COMPLÈTE ET DÉTAILLÉE DU PROJET : ISETAG CHATBOT V2

> **Projet :** Agent Conversationnel Intelligent Omnicanal & Plateforme de Gestion des Admissions  
> **Établissement :** Institut Supérieur Évangélique des Technologies Appliquées et de Gestion (ISETAG) — Douala, Cameroun  
> **Version :** 2.0.0 (Production)  
> **Auteur / Intégrateur :** CreatrixDev / Équipe IA ISETAG  
> **Dépôt Git :** [https://github.com/SIKALIJAMES/ISETAG_CHATBOT](https://github.com/SIKALIJAMES/ISETAG_CHATBOT)  
> **URL de Production :** [https://isetagchatbot-production.up.railway.app](https://isetagchatbot-production.up.railway.app)

---

## 📑 TABLE DES MATIÈRES
1. [Vue d'Ensemble et Objectifs Stratégiques](#1-vue-densemble-et-objectifs-stratégiques)
2. [Architecture Technique & Stack Technologique](#2-architecture-technique--stack-technologique)
3. [Intégration Omnicanale (WhatsApp & Messenger)](#3-intégration-omnicanale-whatsapp--messenger)
4. [Moteur d'Intelligence Artificielle & Génération de Réponses](#4-moteur-dintelligence-artificielle--génération-de-réponses)
5. [Système RAG (Retrieval-Augmented Generation) & Base Vectorielle](#5-système-rag-retrieval-augmented-generation--base-vectorielle)
6. [Traitement des Messages Vocaux (Speech-to-Text)](#6-traitement-des-messages-vocaux-speech-to-text)
7. [Service d'Orientation Académique Personnalisée (Quiz en 9 Étapes)](#7-service-dorientation-académique-personnalisée-quiz-en-9-étapes)
8. [Envoi Automatisé de Médias Contextuels (Photos & Brochures PDF)](#8-envoi-automatisé-de-médias-contextuels-photos--brochures-pdf)
9. [Module de Pré-Inscription en Ligne & Gestion des Candidatures](#9-module-de-pré-inscription-en-ligne--gestion-des-candidatures)
10. [Moteur de Nurturing & Relance Automatique à 24h](#10-moteur-de-nurturing--relance-automatique-à-24h)
11. [Escalade Humaine & Prise en Main par les Conseillers](#11-escalade-humaine--prise-en-main-par-les-conseillers)
12. [Dashboard d'Administration & Console de Gestion](#12-dashboard-dadministration--console-de-gestion)
13. [Modèle de Données & Persistance (PostgreSQL & Redis)](#13-modèle-de-données--persistance-postgresql--redis)
14. [Sécurité, Robustesse & Déploiement](#14-sécurité-robustesse--déploiement)
15. [Synthèse du Cycle de Vie d'une Interaction Utilisateur](#15-synthèse-du-cycle-de-vie-dune-interaction-utilisateur)

---

## 1. Vue d'Ensemble et Objectifs Stratégiques

Le projet **ISETAG CHATBOT V2** est une solution complète d'assistance virtuelle intelligente et de gestion des admissions conçue pour moderniser le recrutement, l'accueil, l'orientation et l'inscription des étudiants de l'**Institut Supérieur Évangélique des Technologies Appliquées et de Gestion (ISETAG)** situé à Douala (Yassa), Cameroun.

### 🎯 Objectifs principaux :
1. **Disponibilité 24h/24 et 7j/7 :** Répondre instantanément aux questions des prospects (frais de scolarité, filières, rentrée académique, hébergement, transport, pièces à fournir) sans dépendre des heures d'ouverture des bureaux.
2. **Omnicanalité fluide :** Interagir nativement avec les étudiants là où ils se trouvent : sur **WhatsApp** et **Facebook Messenger**.
3. **Compréhension multimodale :** Recevoir et comprendre non seulement les messages écrits, mais également les **notes vocales (messages audio)** en français et en anglais.
4. **Orientation sur-mesure des indécis :** Proposer un bilan d'orientation interactif guidé pour aider les bacheliers indécis à choisir la filière adaptée à leur profil et ambitions.
5. **Enrichissement visuel instantané :** Envoyer automatiquement au fil de la discussion les plaquettes officielles, fiches tarifaires en PDF et photos réelles des infrastructures (ateliers mécaniques, laboratoires, bus de ramassage gratuits, cité universitaire).
6. **Conversion en pré-inscriptions directes :** Proposer un parcours de candidature en ligne sans frais avec validation automatique par SMS/WhatsApp et attribution d'un numéro de dossier officiel.
7. **Relance proactive (Nurturing) :** Relancer automatiquement après 24 heures les prospects intéressés qui n'ont pas finalisé leur dossier.
8. **Contrôle et supervision par les équipes de l'école :** Fournir un tableau de bord administratif complet avec statistiques en direct, supervision des chats, reprise en main manuelle par un conseiller humain, et export des inscriptions sous Excel/CSV.

---

## 2. Architecture Technique & Stack Technologique

Le projet repose sur une architecture moderne, découplée mais packagée dans un conteneur unique ultra-optimisé pour les déploiements cloud (Railway / Docker).

```
 ┌─────────────────────────┐        ┌──────────────────────────┐
 │  Utilisateur WhatsApp   │        │  Utilisateur Messenger   │
 └───────────┬─────────────┘        └────────────┬─────────────┘
             │                                   │
             ▼                                   ▼
 ┌─────────────────────────────────────────────────────────────┐
 │       Meta Cloud Webhooks (Vérification HMAC-SHA256)        │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                 SERVEUR BACKEND (Node.js 20 / Express)      │
 │                                                             │
 │  • Router Webhooks (/webhook/whatsapp & /webhook/messenger) │
 │  • Router Admin (/api/admin)                                │
 │  • Router Pré-inscriptions (/api/preinscription)            │
 │  • Router Auth (/api/auth)                                  │
 │  • Background Workers (Nurturing 24h, Keep-Alive)           │
 └──────┬───────────────┬────────────────┬─────────────┬───────┘
        │               │                │             │
        ▼               ▼                ▼             ▼
 ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────┐
 │ Groq API    │ │ Google      │ │ Upstash      │ │ PostgreSQL │
 │ • LLM 120B  │ │ Gemini API  │ │ Redis REST   │ │ + pgvector │
 │ • Whisper   │ │ Embeddings  │ │ Sessions,    │ │ Tables &   │
 │   Audio STT │ │ (768 dims)  │ │ Prénoms, Lang│ │ Vecteurs   │
 └─────────────┘ └─────────────┘ └──────────────┘ └────────────┘
                                                       ▲
                                                       │
 ┌─────────────────────────────────────────────────────┴───────┐
 │               FRONTEND DASHBOARD & FORMULAIRES              │
 │  • React 18, Vite, Tailwind CSS, Lucide Icons               │
 │  • Servi statiquement sur le port 3000 (/dist)              │
 └─────────────────────────────────────────────────────────────┘
```

### Détail des composants logiciels :
- **Environnement d'exécution :** Node.js 20 LTS.
- **Framework Web Backend :** Express 4.18 avec middlewares dédiés (`cors`, `morgan`, `express.json` avec extraction du `rawBody` pour signature cryptographique).
- **Frontend SPA :** React 18, Vite, TailwindCSS, React Router DOM v6, Lucide React (intégré et servi directement par le backend Express en production via `frontend/dist`).
- **Base de données relationnelle & vectorielle :** PostgreSQL (Neon / Railway) enrichi de l'extension `pgvector` pour la recherche sémantique de similarité cosinus.
- **Base de données en cache / session :** Upstash Redis via client REST HTTPS (`@upstash/redis`), assurant une persistance sans état (stateless) résistante aux redémarrages de conteneurs.
- **Moteur d'IA (LLM) :** Groq Cloud API utilisant le modèle `openai/gpt-oss-120b` (ou `qwen/qwen3.8-27b`), offrant des temps de réponse ultra-courts (~0.5 seconde) et une grande fidélité aux instructions.
- **Moteur de Transcription Audio (Speech-to-Text) :** Groq Whisper (`whisper-large-v3-turbo`) pour transcrire les notes vocales avec détection linguistique automatique.
- **Moteur d'Embeddings Vectoriels :** Google Generative AI API (`gemini-embedding-2` avec 768 dimensions).
- **Sécurité & Authentification :** JWT (`jsonwebtoken`) pour les sessions d'administration, `bcrypt` pour le hachage des mots de passe, HMAC-SHA256 pour la validation des requêtes Meta for Developers.

---

## 3. Intégration Omnicanale (WhatsApp & Messenger)

Le projet offre une expérience transparente sur deux canaux de messagerie majeurs.

### A. WhatsApp Business Cloud API (`/webhook/whatsapp`)
- **Handshake Meta :** Endpoint `GET /webhook/whatsapp` qui répond au challenge `hub.challenge` dès que le jeton de vérification `WHATSAPP_VERIFY_TOKEN` correspond.
- **Réception des messages :** Endpoint `POST /webhook/whatsapp`.
  - **Réponse 200 OK immédiate :** Évite les "retry storms" (re-tentatives agressives de Meta en cas de latence).
  - **Traitement Asynchrone :** Déporté via `setImmediate` pour traiter la requête en arrière-plan sans bloquer l'infrastructure de webhook de Meta.
  - **Vérification de Signature :** Calcul HMAC-SHA256 sur le `rawBody` avec la clé secrète `WHATSAPP_APP_SECRET` pour s'assurer que la requête émane bien des serveurs de Meta.
  - **Prise en charge des types de messages :**
    - `text` : Texte tapé par l'étudiant.
    - `audio` : Note vocale WhatsApp (téléchargement sécurisé puis transcription via Whisper).
    - `interactive` : Clics sur les boutons interactifs du menu d'accueil.
    - `image / document / video` : Prise en charge avec message de guidage incitant à poser la question par texte ou vocal.

### B. Facebook Messenger Platform (`/webhook/messenger`)
- Implémente le même protocole sécurisé pour les pages Facebook officielles de l'ISETAG.
- Identifiant utilisateur basé sur le Page-Scoped ID (`messenger:PSID`).
- Gestion conjointe des messages textuels et des pièces jointes audio envoyées sur Messenger.

---

## 4. Moteur d'Intelligence Artificielle & Génération de Réponses

Le composant central `src/services/ai-agent.js` régit l'intelligence conversationnelle du bot.

### A. Rôle et Personnalité de l'Agent
L'agent incarne un **Conseiller d'Orientation Virtuel Officiel de l'ISETAG**.
- **Ton :** Chaleureux, empathique, persuasif, clair et courtois.
- **Formatage strict :** Adapté aux standards mobiles WhatsApp :
  - Pas de syntaxe Markdown lourde (pas de titres `#` ou `##`, pas de séparateurs `---`).
  - Utilisation du gras WhatsApp : `*texte*` (un seul astérisque).
  - Réponses courtes et percutantes (2 à 3 paragraphes maximum ou 3-4 puces claires).
  - Suppression des répétitions systématiques du lien de pré-inscription pour garder une conversation naturelle.

### B. Gestion Linguistique Bilingue Intégrale (Français / Anglais)
L'ISETAG accueillant des étudiants francophones et anglophones (sections BTS et HND) :
- Détection automatique de la langue via la bibliothèque `franc` renforcée par des analyseurs lexicaux réguliers (`frPattern` et `enPattern`).
- **Persistance de la langue :** Une fois la langue établie, elle est sauvegardée dans Redis (`lang:<phone>`) pendant 7 jours.
- L'agent ne change de langue que si l'utilisateur envoie une phrase explicite dans l'autre langue (ex: *"Speak English please"* ou message long en anglais).

### C. Détection et Mémorisation Dynamique du Prénom
- L'agent demande poliment le prénom du prospect dès le premier message s'il n'est pas encore identifié.
- Grâce à un tag spécial `<NAME_DETECTED>Prénom</NAME_DETECTED>` extrait de la complétion IA, le bot identifie le prénom, l'enregistre dans Redis (`name:<phone>`) avec un TTL de 30 jours et met à jour la table PostgreSQL `conversations.prospect_name`.
- Dès lors, l'agent utilise naturellement le prénom de l'étudiant dans tous ses messages et relances.

### D. Base de Connaissances Intégrée (Faits Officiels ISETAG)
L'agent dispose en dur des données fondamentales de l'établissement :
- **Identité :** Fondé en 2015, promoteur Pasteur PAMEN Flaubert, tutelle académique Université de Douala (FSEGA), accréditation MINESUP.
- **Localisation :** Yassa, Douala (à 100m de Tradex Yassa vers l'Hôpital Gynéco-Obstétrique).
- **Filières & Cycles :** BTS, HND, Licences Pro, Masters Pro, Métiers Maritimes (STCW 95, 4 ans), Formations Certifiantes rapides (4 à 9 mois).
- **Frais de scolarité & Avantages :**
  - Étude de dossier **100% gratuite**.
  - Frais d'inscription BTS de 30 000 FCFA payables uniquement en présentiel après acceptation.
  - Cité Universitaire à **22 000 FCFA/mois** (eau, électricité et Wi-Fi inclus).
  - Minibus de ramassage gratuits à travers les grands carrefours de Douala.
  - Plus de 300 stages académiques garantis avec des entreprises partenaires (Sinotruk, CEL'OR, Transimex, Port Autonome de Douala, Sotrabus, etc.).
  - Partenariats internationaux de poursuite d'études à l'étranger (Allemagne, Tunisie, Espagne, Ghana, Chine).

---

## 5. Système RAG (Retrieval-Augmented Generation) & Base Vectorielle

Pour répondre avec une précision totale sur des règlements, programmes spécifiques ou documents administratifs, le projet intègre un pipeline RAG complet (`src/services/embeddings.js`).

1. **Ingestion de Documents :**
   - L'administrateur dépose des fichiers PDF ou texte depuis le tableau de bord web.
   - Les fichiers PDF sont extraits en texte brut via `pdf-parse`.
2. **Découpage Sémantique (Chunking) :**
   - Le texte est découpé en segments de 500 mots avec un chevauchement (overlap) de 50 mots pour préserver le contexte entre blocs consécutifs.
3. **Génération d'Embeddings :**
   - Chaque segment est envoyé à l'API Google Gemini (`gemini-embedding-2`), produisant un vecteur de 768 dimensions.
4. **Stockage Vectoriel :**
   - Stocké dans la table PostgreSQL `knowledge_chunks` équipée d'une colonne de type `vector(768)` indexée.
5. **Recherche par Similarité Cosinus :**
   - À chaque question d'un étudiant, un embedding de sa question est calculé.
   - Une requête SQL effectue une comparaison par distance cosinus :
     ```sql
     SELECT content, source, 1 - (embedding <=> $1::vector) as similarity
     FROM knowledge_chunks
     WHERE 1 - (embedding <=> $1::vector) > 0.4
     ORDER BY embedding <=> $1::vector
     LIMIT 5;
     ```
   - Les 5 meilleurs fragments sont injectés dynamiquement dans le System Prompt de l'IA sous la section `## KNOWLEDGE BASE`.

---

## 6. Traitement des Messages Vocaux (Speech-to-Text)

De nombreux étudiants camerounais préfèrent envoyer des notes vocales WhatsApp plutôt que de taper de longs textes. Le projet gère cela de bout en bout (`src/services/audio.service.js`) :

1. **Détection :** Le webhook identifie un message de type `audio`.
2. **Récupération du média :**
   - Appel à l'API Graph de Meta (`https://graph.facebook.com/v20.0/{media_id}`) pour obtenir l'URL de téléchargement sécurisée.
   - Téléchargement du binaire audio (`.ogg` Opus pour WhatsApp, `.mp4` pour Messenger).
3. **Transcription par IA :**
   - Envoi du buffer audio au modèle **Whisper Large v3 Turbo** hébergé sur Groq (`whisper-large-v3-turbo`).
   - Transcription ultra-rapide (< 1 seconde) avec prise en charge naturelle des accents, du français et de l'anglais.
4. **Injection dans le flux standard :**
   - Le texte transcrit est transmis à l'agent conversationnel comme s'il s'agissait d'un message textuel.
   - En cas d'audio inaudible ou corrompu, un message d'aide bienveillant invite l'étudiant à reformuler par écrit.

---

## 7. Service d'Orientation Académique Personnalisée (Quiz en 9 Étapes)

Situé dans `src/services/orientation.service.js`, ce module prend en charge les étudiants indécis.

### A. Déclenchement Automatique
Le système repère les déclarations d'indécision (ex: *"je ne sais pas quelle filière choisir"*, *"je suis indécis"*, *"aidez-moi à choisir"*, *"not sure what to study"*). Au lieu d'étaler la liste des 30 filières, le bot propose :
> *"Pas de souci ! 😊 Tape orientation ou je ne sais pas pour démarrer ton bilan d'orientation personnalisé en 9 questions."*

### B. Parcours en 4 Sections (9 Questions)
- **Section I : Parcours Scolaire**
  - Q1 : Matières préférées au secondaire.
  - Q2 : Matières avec les meilleures notes.
  - Q3 : Matières jugées difficiles.
- **Section II : Intérêts & Goûts**
  - Q4 : Activités préférées pendant le temps libre (bricoler, coder, vendre, dessiner...).
  - Q5 : Préférence de travail (1: Chiffres, 2: Mots, 3: Personnes, 4: Technique, 5: Idées).
  - Q6 : Domaines professionnels attirants.
- **Section III : Compétences & Style**
  - Q7 : Points forts (Travail d'équipe, négociation, planification, outils numériques...).
- **Section IV : Projet Professionnel**
  - Q8 : Métier de rêve.
  - Q9 : Durée d'études envisagée (BTS/HND 2 ans, Licence 3 ans, Master 5 ans).

### C. Moteur de Recommandation & Scoring
À la fin du quiz, les réponses sont croisées avec les profils des filières ISETAG :
- **Profil TIC / Informatique :** Génie Logiciel, Réseaux, IA, Infographie.
- **Profil Gestion / Tertiaire :** Marketing, Commerce International, Douane-Transit, Comptabilité, Banque.
- **Profil Industriel & Énergies :** Électrotechnique, Mécanique Auto, Énergies Renouvelables, Génie Civil.
- **Profil Maritime :** Navigation, Logistique Portuaire, Électromécanique navale (STCW 95).
L'étudiant reçoit une recommandation détaillée avec explication de son profil, opportunités d'emploi, et le lien direct pour pré-réserver sa place.

---

## 8. Envoi Automatisé de Médias Contextuels (Photos & Brochures PDF)

Le module `src/services/media-sender.js` enrichit automatiquement les conversations WhatsApp et Messenger avec des fichiers hébergés localement dans le dossier `public/media/`.

### Catalogue de Médias Disponibles :
1. **Fiches Tarifaires Officielles (PDF) :**
   - BTS Gestion & Commerce (FR) & HND Management (EN).
   - BTS Ingénierie & TIC (FR) & HND Technology (EN).
   - Licence Professionnelle (cours du soir).
   - Master Professionnel (cours du soir).
2. **Plaquettes Générales (PDF) :**
   - Flyer officiel bilingue français / anglais détaillant toutes les filières.
3. **Photos Officielles du Campus (JPEG/PNG) :**
   - **Cité Universitaire (Campus Yassa) :** Photos des chambres meublées avec rappel du tarif officiel (22 000 FCFA/mois).
   - **Bus ISETAG :** Flotte de minibus de ramassage gratuit des étudiants.
   - **Campus Principal :** Bâtiments modernes situés à Yassa.
   - **Atelier Mécanique Automobile :** Véhicules industriels, bancs d'essai.
   - **Atelier Génie Électrique & Énergies :** Systèmes photovoltaïques, moteurs.
   - **Atelier Menuiserie & Bois :** Machines d'usinage et fabrication.
   - **Filière Maritime & Portuaire :** Étudiants en uniforme officiel, simulateurs.
   - **Bibliothèque Universitaire & Labos Informatiques.**
   - **Programmes d'Études à l'Étranger :** Affiches des universités partenaires (Allemagne, Tunisie, Espagne, Chine).

### Analyse préalable par IA Multimodale :
Grâce aux scripts `scripts/analyze_images.js` et `analyze_images_1.js`, toutes les images brutes de l'école ont été analysées avec **Gemini Vision Flash**, catégorisées et associées à des déclencheurs textuels précis pour garantir un envoi ultra-pertinent au bon moment de la conversation.

---

## 9. Module de Pré-Inscription en Ligne & Gestion des Candidatures

Le chatbot et le portail web permettent à tout candidat de soumettre son dossier d'admission gratuitement en ligne (`/preinscription`).

### A. Formulaire Candidat (`frontend/src/pages/PreInscription.jsx`)
Formulaire web responsive moderne divisé en étapes claires :
- **État civil :** Nom complet, sexe, date et lieu de naissance, nationalité, région d'origine, groupe sanguin, religion.
- **Coordonnées :** Téléphone, numéro WhatsApp, adresse email.
- **Contacts d'urgence :** Deux tuteurs ou parents avec numéros directs.
- **Antécédents scolaires & Santé :** Établissement précédent, année d'obtention du diplôme, remarques de santé particulières.
- **Choix académique :** Cycle (BTS, HND, Licence, Master, Formation Certifiante), Domaine et Spécialité souhaitée.
- **Dépôt des pièces jointes :** Téléversement de fichiers jusqu'à 5 Mo (Photo 4x4, CNI, relevé du Probatoire, diplôme du BAC/GCE, CV, certificat médical).

### B. Traitement Backend & Attribution de Dossier (`src/routes/preinscription.js`)
- Stockage sécurisé des pièces jointes dans `public/uploads/preinscriptions/`.
- Insertion dans la table PostgreSQL `preinscriptions`.
- **Génération automatique d'un code dossier unique :** Ex. `ISETAG-2026-0042`.

### C. Confirmation WhatsApp Instantanée au Candidat
Dès soumission, le système envoie automatiquement un message WhatsApp officiel au numéro du candidat :
- Confirmation de la réception du dossier avec mention de son numéro `#ISETAG-2026-XXXX`.
- Rappel que l'étude de dossier est **100% gratuite**.
- Instructions pour se présenter au campus de Yassa pour la validation finale.
- Contacts téléphoniques directs du secrétariat des admissions.

### D. Alerte Immédiate de l'Équipe des Admissions
Un message WhatsApp automatique est également expédié au responsable des admissions (`ADMISSIONS_PHONE`) pour l'avertir de l'arrivée d'un nouveau candidat avec son nom, filière et numéro de téléphone.

---

## 10. Moteur de Nurturing & Relance Automatique à 24h

De nombreux étudiants débutent une conversation sur WhatsApp, s'informent des filières, puis s'interrompent sans passer à l'action. Le service `src/services/nurturing.service.js` récupère ces prospects à haute valeur.

### A. Critères d'Éligibilité Stricts
Le système filtre les conversations selon les règles suivantes :
1. Statut conversation actif (`active`, non escaladé vers un humain).
2. Numéro WhatsApp valide (exclut les identifiants Messenger non joignables par SMS direct).
3. Inactivité comprise entre **24 heures et 7 jours**.
4. N'a **jamais été relancé** auparavant (`nurtured_at IS NULL`).
5. **N'a pas encore soumis de pré-inscription** (vérification croisée automatique des 8 derniers chiffres du numéro de téléphone avec la table `preinscriptions`).

### B. Exécution Périodique (Background Worker)
- Un worker s'exécute automatiquement toutes les 30 minutes dans `server.js`.
- Il traite un lot de 20 prospects par passage avec un délai de 800 ms entre chaque envoi pour éviter le blocage par les serveurs de Meta.
- Le message est personnalisé avec le prénom du prospect s'il est connu, bilingue, et fournit le lien direct vers la pré-inscription gratuite.

### C. Déclenchement Manuel via l'Admin
L'administrateur peut visualiser le nombre de prospects éligibles et déclencher une campagne de relance d'un simple clic depuis l'onglet dédié du dashboard (`/api/admin/nurturing/trigger`).

---

## 11. Escalade Humaine & Prise en Main par les Conseillers

Le système favorise l'automatisation tout en sachant s'effacer lorsqu'un conseiller humain doit intervenir (`src/services/escalation.service.js`).

### A. Déclencheurs de l'Escalade
- **Mots-clés explicites :** L'étudiant tape des termes comme *"parler à un humain"*, *"conseiller"*, *"secrétariat"*, *"directeur"*, *"agent"*, *"speak to human"*.
- **Échecs répétés :** Trois incompréhensions ou échecs consécutifs du modèle déclenchent automatiquement le basculement.

### B. Comportement lors de l'Escalade
1. La conversation passe au statut `escalated`.
2. Le bot prévient courtoisement l'étudiant qu'un conseiller de l'ISETAG prend le relais.
3. Le bot se met en pause sur ce numéro (il n'interfère plus avec les réponses du conseiller).
4. La conversation apparaît immédiatement en surbrillance dans l'onglet **Conversations** du Dashboard d'Administration.

### C. Console de Discussion Manuelle
- Depuis le dashboard web, un conseiller peut lire l'intégralité des échanges passés.
- Il peut rédiger et envoyer une réponse directe en temps réel (qui parvient sur le WhatsApp ou Messenger de l'étudiant via l'API).
- Une fois l'échange conclu, le conseiller clique sur **"Réengager le Bot"** (`/api/admin/conversations/:id/resolve`), qui remet la conversation en statut `active`.

---

## 12. Dashboard d'Administration & Console de Gestion

Accessible via `https://isetagchatbot-production.up.railway.app/` avec authentification sécurisée (`/login`).

```
┌────────────────────────────────────────────────────────────────────────┐
│  ISETAG CHATBOT V2 — PANNEAU D'ADMINISTRATION                          │
├──────────┬─────────────────────────────────────────────────────────────┤
│ 📊 Stats │ • 452 Conversations  • 94.2% Taux de Résolution             │
│          │ • 78 Pré-inscriptions • 14 Documents vectorisés             │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 💬 Chats │ Liste en direct des conversations WhatsApp / Messenger      │
│          │ Filtres : Actives, Escaladées, Recherche par numéro/nom     │
│          │ Fenêtre de chat en direct + Prise en main manuelle          │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 📚 RAG   │ Base de connaissances documentaire                          │
│          │ Upload PDF par glisser-déposer, Ajout/Édition de textes     │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 📝 Candid│ Gestion complète des pré-inscriptions reçues                │
│          │ Tableau détaillé, visualiseur de pièces justificatives,     │
│          │ Workflow de statut (Attente / Traité / Accepté / Rejeté),   │
│          │ Bouton d'export Excel / CSV complet pour la scolarité       │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 🚀 Nurtur│ Suivi des prospects à relancer & déclenchement immédiat     │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### Pages et Fonctionnalités du Frontend :
1. **Dashboard & Analytics (`Dashboard.jsx`, `Analytics.jsx`) :**
   - KPI globaux : Total conversations, taux de résolution automatique, nombre de chunks vectoriels, dossiers en attente.
   - Graphique de l'activité des messages sur les 7 derniers jours.
   - Répartition linguistique (Français vs Anglais).
   - Répartition des demandes par catégorie et par filière.
2. **Conversations en direct (`Conversations.jsx`) :**
   - Flux unifié des messages entrants avec indicateur de canal (WhatsApp ou Messenger).
   - Affichage du prénom extrait du prospect, de la langue et de l'état (Actif / Escaladé).
   - Possibilité de corriger manuellement le nom d'un étudiant.
   - Zone de saisie pour répondre manuellement au prospect sur son WhatsApp.
3. **Gestionnaire de Connaissances RAG (`Knowledge.jsx`) :**
   - Affichage de tous les documents indexés avec nombre de chunks et date de mise à jour.
   - Importation de nouveaux règlements ou livrets d'accueil en PDF.
   - Ajout manuel de textes ou questions fréquentes avec écrasement automatique des anciennes versions.
4. **Gestionnaire des Pré-Inscriptions (`PreInscriptions.jsx`) :**
   - Table interactive avec filtres par statut, domaine, niveau et recherche plein texte (nom, téléphone, n° dossier).
   - Tiroir latéral de détail affichant la fiche d'inscription complète et les liens vers les pièces jointes (CNI, diplômes, photo, certificat médical).
   - Modification du statut avec ajout de notes internes par le service des admissions.
   - **Export CSV / Excel :** Téléchargement instantané d'un fichier CSV formaté (point-virgule et BOM UTF-8) compatible avec Microsoft Excel pour les commissions d'admission.

---

## 13. Modèle de Données & Persistance (PostgreSQL & Redis)

### A. Schéma de la Base Relationnelle (PostgreSQL)

#### 1. Table `conversations`
- `id` (SERIAL PRIMARY KEY)
- `user_phone` (VARCHAR(50), UNIQUE) : Numéro au format international ou `messenger:PSID`.
- `last_message` (TEXT) : Dernier message échangé.
- `lang` (VARCHAR(10)) : Langue déterminée (`fr` ou `en`).
- `status` (VARCHAR(20)) : `active` ou `escalated`.
- `prospect_name` (VARCHAR(100)) : Prénom détecté du prospect.
- `nurtured_at` (TIMESTAMP) : Horodatage de la dernière relance 24h.
- `created_at` / `updated_at` (TIMESTAMP).

#### 2. Table `messages`
- `id` (SERIAL PRIMARY KEY)
- `conversation_id` (INTEGER REFERENCES conversations(id))
- `role` (VARCHAR(20)) : `user`, `assistant`, ou `system`.
- `content` (TEXT) : Contenu du message.
- `created_at` (TIMESTAMP).

#### 3. Table `knowledge_chunks` (RAG)
- `id` (SERIAL PRIMARY KEY)
- `content` (TEXT) : Texte du segment documentaire.
- `embedding` (vector(768)) : Vecteur d'embedding Google Gemini.
- `source` (VARCHAR(255)) : Nom du document d'origine.
- `category` (VARCHAR(100)) : Catégorie (frais, filières, bourse, général...).
- `created_at` (TIMESTAMP).

#### 4. Table `preinscriptions`
- `id` (SERIAL PRIMARY KEY)
- `dossier_code` (VARCHAR(50)) : Identifiant officiel unique (ex: `ISETAG-2026-0012`).
- `full_name` (VARCHAR(255))
- `sex` (VARCHAR(10)), `date_of_birth` (DATE), `place_of_birth`, `region`, `nationality`, `religion`, `blood_group`
- `phone` (VARCHAR(50)), `whatsapp_phone` (VARCHAR(50)), `email` (VARCHAR(150))
- `emergency_contact_1`, `emergency_phone_1`, `emergency_contact_2`, `emergency_phone_2`
- `health_notes` (TEXT), `former_school` (VARCHAR(255)), `graduation_year` (VARCHAR(10))
- `domain` (VARCHAR(150)), `specialty` (VARCHAR(150)), `study_level` (VARCHAR(50))
- `doc_photo`, `doc_probatoire`, `doc_bac`, `doc_cv`, `doc_medical`, `doc_cni`, `doc_birth_cert` (VARCHAR(255))
- `status` (VARCHAR(20) DEFAULT 'pending') : `pending`, `reviewed`, `accepted`, `rejected`.
- `admin_notes` (TEXT)
- `created_at` / `updated_at` (TIMESTAMP).

#### 5. Table `users` (Administration)
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR(150) UNIQUE)
- `password_hash` (VARCHAR(255))
- `role` (VARCHAR(50) DEFAULT 'admin')
- `created_at` (TIMESTAMP).

### B. Organisation des Clés dans Upstash Redis
- `session:<phone>` (List, TTL 24h) : Historique des 15 derniers messages pour le contexte LLM.
- `lang:<phone>` (String, TTL 7 jours) : Langue mémorisée de l'utilisateur (`fr` ou `en`).
- `name:<phone>` (String, TTL 30 jours) : Prénom de l'étudiant.
- `orientation:<phone>` (JSON String, TTL 1 heure) : État courant du questionnaire d'orientation en cours.

---

## 14. Sécurité, Robustesse & Déploiement

### A. Sécurité des Échanges
- **Vérification HMAC-SHA256 :** Rejet systématique de toute requête webhook non signée ou dont la signature ne correspond pas à la clé secrète de l'application Meta.
- **Protection Anti-Abus (Rate Limiting) :** Plafond strict de 20 messages par minute par numéro de téléphone pour neutraliser les boucles de spam et les attaques par déni de service.
- **Protection JWT :** Toutes les routes de l'API `/api/admin` et `/api/preinscription` (en lecture) exigent un jeton d'authentification Bearer valide.
- **Contrôle des fichiers téléversés :** Filtrage strict des extensions autorisées (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`) et taille maximale bridée à 5 Mo par fichier.

### B. Haute Disponibilité & Zéro Cold Start
- **Migrations SQL autonomes :** Au démarrage du conteneur, `migrations/run.js` vérifie et applique automatiquement tous les scripts SQL non exécutés.
- **Initialisation automatique de l'administrateur :** Le script `seeds/seed.js` vérifie l'existence du compte administrateur et le crée avec mot de passe haché par défaut s'il n'existe pas.
- **Déploiement monobloc conteneurisé :** Un `Dockerfile` optimisé construit les assets Vite de production et lance le serveur Express, permettant à Railway d'exposer à la fois l'API et le frontend sans configuration complexe de CORS ou de multi-serveurs.

---

## 15. Synthèse du Cycle de Vie d'une Interaction Utilisateur

Voici le déroulement chronologique d'un échange type :

1. **Prise de contact :** Un bachelier envoie une note vocale ou un message WhatsApp : *"Bonjour, je voudrais savoir les prix du BTS informatique et si vous avez des bus"*.
2. **Réception & Sécurité :** Meta notifie le serveur ISETAG. Le webhook valide la signature HMAC, acquitte la requête en `200 OK` en 15 millisecondes, et transmet le traitement en arrière-plan.
3. **Transcription & Analyse :**
   - Si vocal : Groq Whisper transcrit l'audio en texte.
   - Le système identifie la langue (Français) et récupère l'historique de conversation dans Redis.
4. **Recherche Documentaire (RAG) :** Le module vectoriel trouve instantanément les informations tarifaires et les détails du transport gratuit dans la base `knowledge_chunks`.
5. **Génération de la Réponse :** Groq (`openai/gpt-oss-120b`) produit une réponse concise, polie et engageante, formatée pour WhatsApp, demandant le prénom de l'étudiant s'il est inconnu.
6. **Envoi Multimédia Contextuel :** Détectant les sujets "tarifs informatique" et "bus", le bot expédie successivement :
   - Le message texte explicatif.
   - La photo officielle du minibus de ramassage ISETAG.
   - La fiche tarifaire officielle en format PDF (*Fiche tarifaire BTS – Ingénierie et TIC.pdf*).
7. **Orientation ou Pré-inscription :**
   - Si l'étudiant hésite entre Génie Logiciel et Réseaux, il est guidé à travers le questionnaire d'orientation en 9 questions.
   - S'il est convaincu, il clique sur le lien gratuit `/preinscription`.
8. **Finalisation :**
   - L'étudiant remplit le formulaire et envoie ses pièces justificatives.
   - Il reçoit instantanément un accusé de réception WhatsApp avec son code dossier `#ISETAG-2026-XXXX`.
   - Le secrétariat reçoit une notification WhatsApp et retrouve le dossier complet dans le Dashboard prêt pour validation et export Excel.
9. **Relance éventuelle :** Si l'étudiant s'était arrêté après l'étape 6 sans s'inscrire, le worker de nurturing lui envoie un message bienveillant 24 heures plus tard pour lui proposer de réserver sa place sans frais.

---

> **En résumé :** Le projet **ISETAG CHATBOT V2** n'est pas un simple bot de questions-réponses. C'est une **infrastructure numérique d'admission et d'orientation intégrée**, alliant intelligence artificielle de pointe (LLM 120B, Whisper, RAG vectoriel), messagerie instantanée omnicanale (WhatsApp & Messenger) et plateforme administrative de gestion pour l'Université ISETAG.
