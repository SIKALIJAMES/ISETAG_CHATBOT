'use strict';
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const SEED_FAQS = [
  {
    category: 'admission', lang: 'fr',
    keywords: ['inscription', 'admission', 'dossier', 'candidature', 'rejoindre', 'intégrer', 'comment', 'inscrire'],
    question: "Comment s'inscrire à ISETAG ?",
    answer: "Pour vous inscrire à ISETAG, vous devez constituer un dossier comprenant : votre relevé de notes du Bac, une copie de votre acte de naissance, 2 photos d'identité et le formulaire de candidature disponible au secrétariat ou sur notre site. 📋",
  },
  {
    category: 'frais', lang: 'fr',
    keywords: ['frais', 'scolarité', 'paiement', 'coût', 'prix', 'montant', 'payer'],
    question: "Quels sont les frais de scolarité ?",
    answer: "Les frais de scolarité varient selon la filière. Pour les informations détaillées et à jour, veuillez contacter directement le secrétariat ou vous rendre sur le campus. Notre équipe vous fournira un devis personnalisé. 💰",
  },
  {
    category: 'filieres', lang: 'fr',
    keywords: ['filière', 'formation', 'programme', 'étude', 'licence', 'master', 'BTS', 'spécialité'],
    question: "Quelles sont les filières disponibles ?",
    answer: "ISETAG propose plusieurs filières : Informatique, Gestion, Commerce, Génie Civil et plus encore. Chaque filière mène à un diplôme reconnu. Tapez le nom d'une filière pour plus d'informations ou contactez-nous au secrétariat. 📚",
  },
  {
    category: 'dates', lang: 'fr',
    keywords: ['date', 'rentrée', 'calendrier', 'début', 'quand', 'prochaine', 'session'],
    question: "Quand commence la prochaine rentrée ?",
    answer: "Les dates de rentrée sont annoncées sur notre site officiel et nos réseaux sociaux. Pour la session en cours, contactez le secrétariat qui vous donnera les dates exactes. 📅",
  },
  {
    category: 'contacts', lang: 'fr',
    keywords: ['contact', 'téléphone', 'adresse', 'localisation', 'où', 'trouver', 'joindre', 'email'],
    question: "Comment contacter ISETAG ?",
    answer: "Vous pouvez nous contacter via ce numéro WhatsApp, vous rendre directement sur le campus, ou envoyer un email au secrétariat. Notre équipe est disponible du Lundi au Vendredi de 8h à 17h. 📞",
  },
  {
    category: 'admission', lang: 'en',
    keywords: ['register', 'apply', 'admission', 'enroll', 'application', 'join'],
    question: "How to register at ISETAG?",
    answer: "To register at ISETAG, you need to submit: your Baccalaureate transcript, a copy of your birth certificate, 2 ID photos and the application form available at the secretariat. 📋",
  },
  {
    category: 'frais', lang: 'en',
    keywords: ['fees', 'tuition', 'cost', 'price', 'payment', 'pay', 'amount'],
    question: "What are the tuition fees?",
    answer: "Tuition fees vary by program. Please contact the secretariat directly or visit the campus for detailed and up-to-date fee information. Our team will provide a personalized quote. 💰",
  },
  {
    category: 'filieres', lang: 'en',
    keywords: ['program', 'course', 'major', 'degree', 'study', 'field', 'specialization'],
    question: "What programs are available?",
    answer: "ISETAG offers programs in Computer Science, Management, Business, Civil Engineering and more. Each program leads to a recognized degree. Contact us for details on any specific program. 📚",
  },
  {
    category: 'dates', lang: 'en',
    keywords: ['date', 'start', 'semester', 'when', 'next', 'intake', 'begin', 'calendar'],
    question: "When does the next semester start?",
    answer: "Semester start dates are announced on our official website and social media. Contact the secretariat for the exact dates of the current session. 📅",
  },
  {
    category: 'contacts', lang: 'en',
    keywords: ['contact', 'phone', 'address', 'location', 'where', 'find', 'email', 'reach'],
    question: "How to contact ISETAG?",
    answer: "You can reach us via this WhatsApp number, visit the campus directly, or email the secretariat. Our team is available Monday to Friday, 8am to 5pm. 📞",
  },
];

async function runSeed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🌱 Running seed script...');

    // Seed admin account
    const adminCheck = await pool.query('SELECT id FROM admins WHERE email = $1', ['admin@isetag.cm']);

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      await pool.query(
        `INSERT INTO admins (username, email, password, role)
         VALUES ($1, $2, $3, $4)`,
        ['admin', 'admin@isetag.cm', hashedPassword, 'admin']
      );
      console.log('✅ Admin account seeded: admin@isetag.cm / Admin123!');
    } else {
      console.log('ℹ️  Admin account already exists — skipping');
    }

    // Seed FAQs
    const faqCheck = await pool.query('SELECT COUNT(*) as count FROM faqs');
    const faqCount = parseInt(faqCheck.rows[0].count);

    if (faqCount === 0) {
      for (const faq of SEED_FAQS) {
        await pool.query(
          `INSERT INTO faqs (category, lang, keywords, question, answer)
           VALUES ($1, $2, $3, $4, $5)`,
          [faq.category, faq.lang, faq.keywords, faq.question, faq.answer]
        );
      }
      console.log(`✅ ${SEED_FAQS.length} FAQs seeded`);
    } else {
      console.log(`ℹ️  FAQs already exist (${faqCount} found) — skipping`);
    }

    console.log('🎉 Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

module.exports = { runSeed };

// Run directly if called as script
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
