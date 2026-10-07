'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const { protect } = require('../middleware/auth');
const { sendTextMessage } = require('../services/whatsapp');

// ─────────────────────────────────────────────
//  Phone Normalizer (Cameroon E.164 without +)
// ─────────────────────────────────────────────
function normalizePhone(raw) {
  if (!raw) return null;
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('00237')) cleaned = cleaned.slice(2);
  if (!cleaned.startsWith('237') && cleaned.length === 9) {
    cleaned = '237' + cleaned;
  }
  return cleaned;
}

// ─────────────────────────────────────────────
//  Upload directory setup
// ─────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/preinscriptions');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${ext}. Formats acceptés: PDF, JPG, PNG`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

const uploadFields = upload.fields([
  { name: 'doc_photo',      maxCount: 1 },
  { name: 'doc_probatoire', maxCount: 1 },
  { name: 'doc_bac',        maxCount: 1 },
  { name: 'doc_cv',         maxCount: 1 },
  { name: 'doc_medical',    maxCount: 1 },
  { name: 'doc_cni',        maxCount: 1 },
  { name: 'doc_birth_cert', maxCount: 1 },
]);

// Helper: extract filename from uploaded file or null
function docPath(files, field) {
  return files?.[field]?.[0]?.filename || null;
}

// ─────────────────────────────────────────────
//  POST /api/preinscription
//  Public — Submit a pre-registration form
// ─────────────────────────────────────────────
router.post('/', (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erreur de téléchargement: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    const {
      full_name, sex, date_of_birth, place_of_birth, region,
      nationality, religion, blood_group,
      phone, email,
      emergency_contact_1, emergency_phone_1,
      emergency_contact_2, emergency_phone_2,
      health_notes,
      former_school, graduation_year,
      domain, specialty, study_level,
      whatsapp_phone,
    } = req.body;

    // Basic validation
    if (!full_name?.trim()) return res.status(400).json({ error: 'Le nom complet est obligatoire.' });
    if (!phone?.trim())     return res.status(400).json({ error: 'Le numéro de téléphone est obligatoire.' });
    if (!domain?.trim())    return res.status(400).json({ error: 'Veuillez choisir un domaine.' });

    try {
      const result = await query(
        `INSERT INTO preinscriptions (
          full_name, sex, date_of_birth, place_of_birth, region,
          nationality, religion, blood_group,
          phone, email,
          emergency_contact_1, emergency_phone_1,
          emergency_contact_2, emergency_phone_2,
          health_notes, former_school, graduation_year,
          domain, specialty, study_level, whatsapp_phone,
          doc_photo, doc_probatoire, doc_bac, doc_cv,
          doc_medical, doc_cni, doc_birth_cert
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,$14,$15,$16,$17,
          $18,$19,$20,$21,
          $22,$23,$24,$25,$26,$27,$28
        ) RETURNING id`,
        [
          full_name.trim(), sex, date_of_birth || null, place_of_birth, region,
          nationality, religion, blood_group,
          phone.trim(), email,
          emergency_contact_1, emergency_phone_1,
          emergency_contact_2, emergency_phone_2,
          health_notes, former_school, graduation_year,
          domain.trim(), specialty, study_level, whatsapp_phone,
          docPath(req.files, 'doc_photo'),
          docPath(req.files, 'doc_probatoire'),
          docPath(req.files, 'doc_bac'),
          docPath(req.files, 'doc_cv'),
          docPath(req.files, 'doc_medical'),
          docPath(req.files, 'doc_cni'),
          docPath(req.files, 'doc_birth_cert'),
        ]
      );

      const newId = result.rows[0].id;
      const dossierCode = `ISETAG-2026-${String(newId).padStart(4, '0')}`;

      // Update dossier_code in database
      await query(
        'UPDATE preinscriptions SET dossier_code = $1 WHERE id = $2',
        [dossierCode, newId]
      ).catch(err => console.warn('[PRE-INSCRIPTION] Could not set dossier_code:', err.message));

      console.log(`[PRE-INSCRIPTION] ✅ New submission #${dossierCode} — ${full_name} / ${domain}`);

      // ── Envoi automatique de la confirmation WhatsApp au candidat ────
      const targetPhone = normalizePhone(whatsapp_phone || phone);
      if (targetPhone) {
        const confirmationText = 
`🎉 *Félicitations ${full_name.trim()} !*

Votre pré-inscription à l'**ISETAG** (Institut Supérieur Évangélique des Technologies Appliquées et de Gestion) a bien été enregistrée avec succès.

📋 *Récapitulatif de votre dossier :*
• *Numéro de dossier :* *#${dossierCode}*
• *Filière :* ${specialty || domain}
• *Cycle :* ${study_level || 'BTS / HND'}
• *Date de dépôt :* ${new Date().toLocaleDateString('fr-FR')}

🏛️ *Prochaines étapes pour valider votre place :*
1. Votre dossier est transmis à la commission d'admission (étude de dossier *100% GRATUITE*).
2. Présentez-vous au campus de Yassa (entre Tradex Yassa et l'Hôpital Gynéco-Obstétrique de Douala) avec vos pièces justificatives.
3. Conservez précieusement votre code dossier : *#${dossierCode}*.

📞 *Secrétariat des admissions :*
+237 676 079 849 / 690 609 511
🌐 *Site web :* https://www.isetag.cm`;

        sendTextMessage(targetPhone, confirmationText)
          .then(() => console.log(`[PRE-INSCRIPTION] 📲 WhatsApp confirmation sent to ${targetPhone} (#${dossierCode})`))
          .catch(waErr => console.warn(`[PRE-INSCRIPTION] ⚠️ WhatsApp confirmation failed:`, waErr.message));
      }

      // Alerte admissions (si configuré)
      const adminPhone = normalizePhone(process.env.ADMISSIONS_PHONE || process.env.ADMIN_PHONE);
      if (adminPhone) {
        const alertText = 
`🔔 *NOUVELLE PRÉ-INSCRIPTION ISETAG !*
• Candidat : *${full_name.trim()}*
• Téléphone : +${targetPhone || phone}
• Filière : ${specialty || domain} (${study_level || 'BTS'})
• Dossier : *#${dossierCode}*`;
        sendTextMessage(adminPhone, alertText).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: 'Pré-inscription soumise avec succès !',
        id: newId,
        dossier_code: dossierCode,
      });
    } catch (dbErr) {
      console.error('[PRE-INSCRIPTION] DB error:', dbErr.message);
      return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
    }
  });
});

// ─────────────────────────────────────────────
//  GET /api/preinscription  (admin)
//  List all pre-registrations with filters
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  const { status, domain, search } = req.query;
  try {
    let sql = `SELECT id, COALESCE(dossier_code, 'ISETAG-2026-' || LPAD(id::text, 4, '0')) as dossier_code,
                      full_name, sex, phone, email, domain, specialty,
                      study_level, status, created_at, whatsapp_phone
               FROM preinscriptions WHERE 1=1`;
    const params = [];

    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (domain) { params.push(`%${domain}%`); sql += ` AND domain ILIKE $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR COALESCE(dossier_code, '') ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/preinscription/export/csv  (admin)
//  Export candidate pre-registrations as CSV
// ─────────────────────────────────────────────
router.get('/export/csv', protect, async (req, res) => {
  const { status, domain } = req.query;
  try {
    let sql = `SELECT * FROM preinscriptions WHERE 1=1`;
    const params = [];

    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (domain) { params.push(`%${domain}%`); sql += ` AND domain ILIKE $${params.length}`; }

    sql += ' ORDER BY id ASC';
    const result = await query(sql, params);

    // Escape CSV cell (semicolon separator for Excel compatibility)
    const cleanCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'N° Dossier',
      'Date Inscription',
      'Statut',
      'Nom Complet',
      'Sexe',
      'Date Naissance',
      'Lieu Naissance',
      'Région',
      'Nationalité',
      'Téléphone',
      'WhatsApp',
      'Email',
      'Domaine',
      'Spécialité',
      'Niveau Études',
      'Établissement Précédent',
      'Année Obtention',
      'Contact Urgence 1',
      'Tél Urgence 1',
      'Contact Urgence 2',
      'Tél Urgence 2',
      'Remarques Santé',
      'Notes Internes Admin',
    ];

    const lines = [headers.map(cleanCell).join(';')];

    for (const r of result.rows) {
      const code = r.dossier_code || `ISETAG-2026-${String(r.id).padStart(4, '0')}`;
      const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '';
      const birthStr = r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('fr-FR') : '';

      lines.push([
        code,
        dateStr,
        r.status || 'pending',
        r.full_name || '',
        r.sex || '',
        birthStr,
        r.place_of_birth || '',
        r.region || '',
        r.nationality || '',
        r.phone || '',
        r.whatsapp_phone || '',
        r.email || '',
        r.domain || '',
        r.specialty || '',
        r.study_level || '',
        r.former_school || '',
        r.graduation_year || '',
        r.emergency_contact_1 || '',
        r.emergency_phone_1 || '',
        r.emergency_contact_2 || '',
        r.emergency_phone_2 || '',
        r.health_notes || '',
        r.admin_notes || '',
      ].map(cleanCell).join(';'));
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const filename = `preinscriptions_isetag_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);

  } catch (err) {
    console.error('[EXPORT CSV] Error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'exportation CSV' });
  }
});


// ─────────────────────────────────────────────
//  GET /api/preinscription/:id  (admin)
//  Full detail of one submission including doc paths
// ─────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await query('SELECT * FROM preinscriptions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  PATCH /api/preinscription/:id/status  (admin)
// ─────────────────────────────────────────────
router.patch('/:id/status', protect, async (req, res) => {
  const { status, admin_notes } = req.body;
  const allowed = ['pending', 'reviewed', 'accepted', 'rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status invalide' });

  try {
    await query(
      'UPDATE preinscriptions SET status = $1, admin_notes = $2 WHERE id = $3',
      [status, admin_notes || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/preinscription/stats/summary  (admin)
// ─────────────────────────────────────────────
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const total  = await query('SELECT COUNT(*) FROM preinscriptions');
    const byStatus = await query(
      `SELECT status, COUNT(*) as count FROM preinscriptions GROUP BY status`
    );
    const byDomain = await query(
      `SELECT domain, COUNT(*) as count FROM preinscriptions GROUP BY domain ORDER BY count DESC`
    );
    res.json({
      total: parseInt(total.rows[0].count),
      byStatus: byStatus.rows,
      byDomain: byDomain.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
