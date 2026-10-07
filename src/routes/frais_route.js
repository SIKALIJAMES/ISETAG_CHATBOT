'use strict';
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════
//  TRAJETS — Logistique
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/frais-route/baremes
 * Liste des barèmes par destination (pour pré-remplir le montant)
 */
router.get('/baremes', protect, async (req, res) => {
  try {
    const r = await query('SELECT * FROM baremes_destination ORDER BY chantier ASC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/frais-route/baremes
 * Créer ou mettre à jour un barème
 */
router.post('/baremes', protect, async (req, res) => {
  const { chantier, montant_fcfa, notes } = req.body;
  if (!chantier || montant_fcfa === undefined) {
    return res.status(400).json({ error: 'chantier et montant_fcfa requis' });
  }
  try {
    const r = await query(
      `INSERT INTO baremes_destination (chantier, montant_fcfa, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (chantier) DO UPDATE
         SET montant_fcfa = EXCLUDED.montant_fcfa,
             notes        = EXCLUDED.notes,
             updated_at   = NOW()
       RETURNING *`,
      [chantier.trim(), montant_fcfa, notes || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/frais-route/baremes/:id
 */
router.delete('/baremes/:id', protect, async (req, res) => {
  try {
    await query('DELETE FROM baremes_destination WHERE id = $1', [req.params.id]);
    res.json({ message: 'Barème supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/frais-route/trajets
 * Enregistrer un nouveau trajet (logistique)
 * Logique intelligente :
 *   - 1er voyage du shift pour ce camion → statut 'pending' (alerte caisse)
 *   - Voyage suivant, même chantier     → statut 'no_alert'
 *   - Voyage suivant, chantier différent → statut 'pending' (nouvelle alerte)
 */
router.post('/trajets', protect, async (req, res) => {
  const { numero_camion, chauffeur, chantier, date_trajet, shift, notes } = req.body;
  if (!numero_camion || !chauffeur || !chantier || !date_trajet || !shift) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    // Compter les voyages déjà enregistrés pour ce camion ce shift ce jour
    const existingResult = await query(
      `SELECT numero_voyage, chantier, statut_caisse
       FROM trajets
       WHERE numero_camion = $1 AND date_trajet = $2 AND shift = $3
       ORDER BY numero_voyage DESC
       LIMIT 1`,
      [numero_camion.trim(), date_trajet, shift]
    );

    let numeroVoyage = 1;
    let statutCaisse = 'pending'; // Défaut : alerte caisse

    if (existingResult.rows.length > 0) {
      const last = existingResult.rows[0];
      numeroVoyage = last.numero_voyage + 1;

      // Même chantier que le dernier voyage → pas d'alerte
      if (last.chantier.toLowerCase().trim() === chantier.toLowerCase().trim()) {
        statutCaisse = 'no_alert';
      } else {
        // Chantier différent → alerte pour complément éventuel
        statutCaisse = 'pending';
      }
    }

    const r = await query(
      `INSERT INTO trajets
         (numero_camion, chauffeur, chantier, date_trajet, shift, numero_voyage, statut_caisse, cree_par, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        numero_camion.trim(),
        chauffeur.trim(),
        chantier.trim(),
        date_trajet,
        shift,
        numeroVoyage,
        statutCaisse,
        req.user?.username || 'logistique',
        notes || null,
      ]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('[FRAIS-ROUTE] Create trajet error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frais-route/trajets
 * Liste des trajets avec filtres (date, shift, camion, statut)
 */
router.get('/trajets', protect, async (req, res) => {
  const { date, shift, camion, statut, limit = 50 } = req.query;
  try {
    const conditions = [];
    const params = [];

    if (date) {
      params.push(date);
      conditions.push(`date_trajet = $${params.length}`);
    }
    if (shift) {
      params.push(shift);
      conditions.push(`shift = $${params.length}`);
    }
    if (camion) {
      params.push(`%${camion}%`);
      conditions.push(`numero_camion ILIKE $${params.length}`);
    }
    if (statut) {
      params.push(statut);
      conditions.push(`statut_caisse = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit));
    const r = await query(
      `SELECT * FROM trajets ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frais-route/caisse/pending
 * File d'attente caissière : trajets en statut 'pending'
 * Enrichis avec le montant du barème si disponible
 */
router.get('/caisse/pending', protect, async (req, res) => {
  try {
    const r = await query(
      `SELECT t.*,
              COALESCE(b.montant_fcfa, 0) AS montant_bareme
       FROM   trajets t
       LEFT JOIN baremes_destination b ON LOWER(b.chantier) = LOWER(t.chantier)
       WHERE  t.statut_caisse = 'pending'
       ORDER  BY t.created_at ASC`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/frais-route/caisse/decaisser/:trajetId
 * Valider le décaissement d'un trajet
 */
router.post('/caisse/decaisser/:trajetId', protect, async (req, res) => {
  const { trajetId } = req.params;
  const { montant_fcfa, motif } = req.body;

  if (!montant_fcfa || isNaN(parseFloat(montant_fcfa))) {
    return res.status(400).json({ error: 'montant_fcfa requis et doit être un nombre' });
  }

  try {
    // 1. Récupérer le trajet
    const tRes = await query('SELECT * FROM trajets WHERE id = $1', [trajetId]);
    if (tRes.rows.length === 0) return res.status(404).json({ error: 'Trajet introuvable' });
    const trajet = tRes.rows[0];

    // 2. Créer la dépense réelle
    const fRes = await query(
      `INSERT INTO frais_route
         (trajet_id, numero_camion, chauffeur, chantier, date_trajet, shift,
          montant_fcfa, motif, caissiere)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        trajet.id,
        trajet.numero_camion,
        trajet.chauffeur,
        trajet.chantier,
        trajet.date_trajet,
        trajet.shift,
        parseFloat(montant_fcfa),
        motif || `Frais de route — ${trajet.chantier}`,
        req.user?.username || 'caissiere',
      ]
    );

    // 3. Mettre à jour le statut du trajet
    await query(
      "UPDATE trajets SET statut_caisse = 'decaisse', updated_at = NOW() WHERE id = $1",
      [trajetId]
    );

    res.json({ message: 'Décaissement enregistré', frais: fRes.rows[0] });
  } catch (err) {
    console.error('[FRAIS-ROUTE] Decaisser error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/frais-route/caisse/ignorer/:trajetId
 * Ignorer un trajet (pas de frais à décaisser)
 */
router.post('/caisse/ignorer/:trajetId', protect, async (req, res) => {
  try {
    await query(
      "UPDATE trajets SET statut_caisse = 'ignore', updated_at = NOW() WHERE id = $1",
      [req.params.trajetId]
    );
    res.json({ message: 'Trajet ignoré — aucun frais' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frais-route/stats
 * Statistiques synthèse frais de route
 */
router.get('/stats', protect, async (req, res) => {
  const { date } = req.query;
  const dateFilter = date || new Date().toISOString().split('T')[0];
  try {
    const today = await query(
      `SELECT COALESCE(SUM(montant_fcfa),0) as total_jour,
              COUNT(*) as nb_decaissements
       FROM frais_route WHERE date_trajet = $1`,
      [dateFilter]
    );
    const pending = await query(
      "SELECT COUNT(*) as nb_pending FROM trajets WHERE statut_caisse = 'pending'"
    );
    const total = await query(
      'SELECT COALESCE(SUM(montant_fcfa),0) as total_global FROM frais_route'
    );
    const byShift = await query(
      `SELECT shift, COALESCE(SUM(montant_fcfa),0) as total
       FROM frais_route WHERE date_trajet = $1
       GROUP BY shift`,
      [dateFilter]
    );

    res.json({
      total_jour:        parseFloat(today.rows[0].total_jour),
      nb_decaissements:  parseInt(today.rows[0].nb_decaissements),
      nb_pending:        parseInt(pending.rows[0].nb_pending),
      total_global:      parseFloat(total.rows[0].total_global),
      by_shift:          byShift.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frais-route/historique
 * Historique des frais décaissés avec pagination
 */
router.get('/historique', protect, async (req, res) => {
  const { date, limit = 50, offset = 0 } = req.query;
  try {
    const params = [];
    let where = '';
    if (date) {
      params.push(date);
      where = `WHERE date_trajet = $${params.length}`;
    }
    params.push(parseInt(limit), parseInt(offset));
    const r = await query(
      `SELECT * FROM frais_route ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
