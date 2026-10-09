require('dotenv').config();
const { uploadKnowledge } = require('../src/services/embeddings');

const isetagGuideText = `
ISETAG (Institut Supérieur Évangélique des Technologies Appliquées et de Gestion).
Fondateur / Promoteur : Pasteur PAMEN Flaubert.
Localisation : Yassa, Douala – Cameroun (à 100 mètres de TRADEX Yassa en direction de l'Hôpital Gynéco-Obstétrique et Pédiatrique de Douala).
Adresse postale : P.O. Box 11237, Douala-Cameroun.
Sites web officiels : www.isetag-univ.net / www.isetag.cm
Standard & Admissions : +237 676 079 849 / +237 659 855 800 / +237 694 490 614 / +237 699 787 818
Email officiel : info.isetag@gmail.com
Arrêtés MINESUP N° 17/00048 & 15/09096/L/MINESUP. Statut: Établissement supérieur privé agrée sous tutelle académique de l'Université de Douala (FSEGA). Bilingue intégral (Sections francophone et anglophone).

1. PROGRAMMES & DIPLÔMES PROPOSÉS
L'ISETAG propose 6 grands cycles : BTS, HND, Licences Professionnelles / Bachelor Degrees, Masters Professionnels, Cycle Maritime International (4 ans), Formations Certifiantes Express (4 à 9 mois).

CYCLE BTS (BAC+2, Jour & Soir) :
- Commerce / Gestion / Droit : Commerce International, Marketing Commerce Vente, Assurance, Banque et Finance, Gestion des Projets, Gestion de la Qualité, Collectivités Territoriales, Ressources Humaines, Comptabilité et Gestion des Entreprises, Gestion Logistique & Transport, Assistant Manager, Communication des Entreprises, Douane et Transit, Gestion Fiscale.
- TIC : Génie Logiciel, Infographie & Web Design, Informatique Industrielle et Automatisme, Maintenance Informatique, E-commerce et Marketing Numérique, Télécommunication, Réseaux et Sécurité.
- Industrie & Technologie : Froid et Climatisation, Génie Civil (Bâtiment, Travaux Publics, Géomètre Topographe, Urbanisme), Fluides et Installation Sanitaire, Électrotechnique, Énergie Renouvelable, Maintenance Électronique, Chaudronnerie et Soudure, Construction Métallique, Contrôle Instrumentation, Maintenance Industrielle, Maintenance Biomédicale, Après-vente Automobile, Mécatronique, Menuiserie-Ébénisterie.

CYCLE HND (ANGLOPHONE, Day & Evening) :
- Port & Maritime (4 years) : Port and Shipping Administration, Marine Engineering (ME), Marine Fisheries Technology (MFT), Nautical Sciences (NS), Aquaculture (AQ).
- Engineering & Tech : Petroleum and Mining Engineering (Drilling Technology, Petroleum Systems), Civil Engineering Technology, Wood Works, Urban Planning, Electrical Power System, Mechanical Engineering.
- ICT : Software Engineering, Hardware Maintenance, Network Telecommunication.
- Management & Business : Assistant Manager, Human Resource Management, Logistics and Transport Management, Accountancy, Banking and Finance, Marketing, Trade-Sale.

CYCLE LICENCE PROFESSIONNELLE / BACHELOR & MASTER (Cours du soir) :
Spécialités : Marketing Manager Opérationnel, Contrôle et Audit, Banque & Conseiller Clientèle, Gestion RH, Gestion Qualité (QHSE), Communication Publicité, Transport Logistique, Comptabilité et Finance, Entrepreneuriat.
Spécialités Tech : Bâtiments et Construction Industrielle, Travaux Publics (TPO), Génie Automobile et Mécatronique (ISM / IA), Génie Mécanique, Génie Électrique et Systèmes Intelligents, Génie Logiciel, Réseaux Hydrauliques.

DOMAINE MARITIME ET PORTUAIRE (4 ANS) :
Double diplomation : Licence Professionnelle + Certification Internationale STCW 95.
Formation au Cameroun (2 ans) et poursuite au Ghana (Regional Maritime University) ou en Chine (Shanghai Ocean University).
Avantages maritimes : Cours d'anglais et chinois offerts, uniformes offerts, stages garantis pour tous, préparation TOEFL / TCF-Canada / TESTDAF.

FORMATIONS CERTIFIANTES EXPRESS (4 À 9 MOIS — 75% PRATIQUE) :
Formation courte jour ou soir : Mécanique auto, Tôlerie/Peinture auto, Soudure homologuée, Chaudronnerie, Électricité bâtiment et industrielle, Marketing digital, Programmation web/mobile, Infographie 2D/3D, IA, Docker, Chaudronnerie navale, Douane et transit, Comptabilité informatisée.

2. ÉTUDIER À L'ÉTRANGER & MOBILITÉ INTERNATIONALE
Formule : 1 à 2 ans au Cameroun, puis poursuite à l'étranger avec accompagnement visa :
- Allemagne : City is Lemgo (Gestion & TIC — niveau BAC / Licence).
- Tunisie : Université Montplaisir Tunis & IAHF (Accessible dès le BEPC, le Probatoire ou le BAC !).
- Espagne : EEMI (Gestion & TIC — niveau BAC / Licence).
- Ghana : Regional Maritime University (Maritime — niveau BAC).
- Chine : Shanghai Ocean University (Maritime — niveau BAC).

3. FRAIS DE SCOLARITÉ & CONDITIONS FINANCIÈRES
- Étude de dossier : 100% GRATUITE pour BTS, HND, Licence et Certifiant.
- Frais d'étude de dossier Maritime uniquement : 10 000 FCFA.
- Frais d'inscription BTS/HND : 30 000 FCFA (payés en personne après acceptation du dossier).
- Frais d'inscription Licence/Master : 55 000 FCFA.
- Scolarité BTS Jour Technologie : 395 000 FCFA (tranches : 200k, 150k, 45k).
- Scolarité BTS Soir Technologie : 285 000 FCFA (tranches : 150k, 100k, 35k).
- Scolarité BTS Jour Commerce : 315 000 FCFA (tranches : 150k, 100k, 65k).
- Scolarité BTS Soir Commerce : 235 000 FCFA (tranches : 130k, 80k, 25k).
- Scolarité Licence Soir : 550 000 FCFA (Tech) / 500 000 FCFA (Commerce).
- Scolarité Master Soir : 700 000 FCFA (Tech) / 675 000 FCFA (Gestion).
- Scolarité Maritime (4 ans) : 755 000 FCFA / an (Nationaux) / 1 005 000 FCFA (Étrangers).
Modalités : Paiement en 3 tranches (Rentrée, 30 novembre, 28 février) via FIGEC microfinance.

4. VIE SUR LE CAMPUS, LOGEMENT, BOURSES & TRANSPORTS
- Résidence universitaire (Campus Yassa) : Plus de 250 chambres meublées et sécurisées. Tarif officiel : EXACTEMENT 22 000 FCFA / mois (eau, électricité et Wi-Fi haut débit fibre optique inclus).
- Minibus gratuits : Ramassage gratuit des étudiants reliant différents carrefours de Douala au campus de Yassa.
- Bourses offertes par les partenaires : De 30 000 FCFA à 100 000 FCFA pour les 100 premiers inscrits !
- Bourse linguistique de 50 000 FCFA pour les nouveaux bacheliers.
- Stages professionnels : Plus de 300 stages garantis chez plus de 50 entreprises partenaires (Sinotruk, CEL'OR, TRANSIMEX, PAD, PAK, SOTRABUS, UBA, FIGEC, MSC, Kloe Shipping...).
- Taux de réussite 2024 : 89,23% global (100% en Génie Logiciel, Réseaux, Comptabilité, Logistique, Marketing).
`;

async function run() {
  console.log("Starting knowledge upload to Neon database...");
  try {
    await uploadKnowledge(isetagGuideText, "Guide Officiel ISETAG 2026 - Multisupports", "general");
    console.log("✅ Knowledge successfully uploaded and vectorised!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error uploading knowledge:", e);
    process.exit(1);
  }
}

run();
