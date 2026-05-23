require('dotenv').config();
const { uploadKnowledge } = require('../src/services/embeddings');

const isetagGuideText = `
ISETAG (Institut Supérieur Évangélique des Technologies Appliquées et de Gestion).
Localisation : Yassa, Douala – Cameroun (à 300 mètres de TRADEX Yassa en allant vers le village, entre l'entreprise TRADEX Yassa et l'Hôpital Gynéco-Obstétrique et Pédiatrique de Douala).
Site web : www.isetag-univ.net
Téléphone (Standard général) : 676 079 849 / 690 609 511
WhatsApp officiel : 659 855 800 / 676 079 849
Email : info.isetag@gmail.com
Arrêtés MINESUP N° 17/00048 & 15/09096/L. Statut: Établissement supérieur privé agrée. Langue: Bilingue (Français/Anglais).

1. PROGRAMMES & FILIÈRES
L'ISETAG propose 4 grands domaines de formation : Maritime et Portuaire, Commerce et Gestion, Industrie et Technologie, TIC.

CYCLE BTS (BAC+2) :
Commerce/Gestion/Droit: Commerce International, Marketing Commerce Vente, Assurance, Banque et Finance, Gestion des Projets, Gestion de la Qualité, Ressources Humaines, Comptabilité, Gestion Logistique & Transport, Douane et Transit, Gestion Fiscale.
TIC: Génie Logiciel, Infographie, Maintenance Informatique, E-commerce, Télécommunication.
Industrie & Technologie: Froid et Climatisation, Génie Civil (Bâtiment, TP), Électrotechnique, Chaudronnerie, Maintenance Industrielle, Automobile, Énergie Renouvelable.

CYCLE LICENCE PROFESSIONNELLE (BAC+3) :
Marketing, Comptabilité, Banque, Ressources Humaines, Logistique, QHSE.
Bâtiments, Travaux Publics, Génie Automobile, Génie Informatique.

CYCLE MASTER (BAC+4 & BAC+5) :
Génie Mécanique, Génie Civil, Télécommunication, Qualité (QHSE), Marketing, Finance, Logistique.

DOMAINE MARITIME ET PORTUAIRE (4 ANS) :
Taux d'insertion: 100%. Double diplômation (Licence + Certification Internationale STCW 95).
Filières: Gestion Logistique Portuaire, Électromécanique Navale, Pêches Maritimes, Aquaculture, Navigation Maritime.
Avantages: Cours d'anglais et chinois gratuits, Uniformes offerts, Stages garantis.

2. FRAIS DE SCOLARITÉ & PAIEMENTS
Frais d'inscription BTS : 30 000 F CFA. Scolarité BTS Jour Technologie: 395 000 F CFA. Scolarité BTS Jour Commerce: 315 000 F CFA.
Frais d'inscription Licence : 55 000 F CFA. Scolarité Licence Technologie: 550 000 F CFA. Licence Commerce: 500 000 F CFA.
Frais d'inscription Master : 55 000 F CFA. Scolarité Master Technologie: 700 000 F CFA. Master Gestion: 675 000 F CFA.
Frais d'inscription Maritime : 55 000 F CFA. Scolarité Maritime Nationaux: 755 000 F CFA.
Modalités de paiement: Paiement en 3 tranches (Rentrée, 30 novembre, 28 février). 
Paiement via FIGEC (microfinance partenaire). Mobile Money (Orange/MTN) uniquement accepté pour frais concours maritime, JAMAIS pour scolarité.

3. CONDITIONS D'ADMISSION
Admission sur étude de dossier (pas de concours sauf pour Maritime). Pas de limite d'âge. Baccalauréat requis (général ou technique). Probatoire seul non accepté.

4. VIE SUR LE CAMPUS & HORAIRES
Horaires Cours du Jour: 8h00 - 17h00. Horaires Cours du Soir: 17h30 - 21h30.
Plus de 250 chambres universitaires (Résidence) à 22 000 F CFA/mois (eau, électricité, internet WIFI inclus). 
Stages gratuits et obligatoires pour tous les étudiants. L'ISETAG trouve le stage pour l'étudiant.

5. PERFORMANCES 2024
Taux de réussite BTS 2024: 88,93%. HND 2024: 94,11%. Insertion Maritime: 100%.
`;

async function run() {
  console.log("Starting knowledge upload to Neon database...");
  try {
    await uploadKnowledge(isetagGuideText, "Guide Complet ISETAG 2024", "general");
    console.log("✅ Knowledge successfully uploaded and vectorised!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error uploading knowledge:", e);
    process.exit(1);
  }
}

run();
