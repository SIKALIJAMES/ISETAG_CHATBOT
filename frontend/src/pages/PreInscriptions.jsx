import React, { useEffect, useState, useCallback } from 'react';

const API = '/api/preinscription';
const STATUS_COLORS = {
  pending:  'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
  reviewed: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  accepted: 'bg-green-400/15 text-green-400 border-green-400/30',
  rejected: 'bg-red-400/15 text-red-400 border-red-400/30',
};
const STATUS_LABELS = {
  pending: '⏳ En attente',
  reviewed: '👀 Examiné',
  accepted: '✅ Accepté',
  rejected: '❌ Rejeté',
};
const DOMAIN_ICONS = {
  TIC: '💻', Commerce: '📊', Industrie: '⚙️', Maritime: '⚓',
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
}

// ── Detail Modal ────────────────────────────────────────────────
function DetailModal({ id, onClose, onUpdated }) {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/${id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setData(d); setStatus(d.status); setNotes(d.admin_notes || ''); });
  }, [id]);

  async function saveStatus() {
    setSaving(true);
    await fetch(`${API}/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, admin_notes: notes }),
    });
    setSaving(false);
    onUpdated();
  }

  const docUrl = f => f ? `/uploads/preinscriptions/${f}` : null;

  const docs = data ? [
    { label: 'Photo 4×4',          file: data.doc_photo },
    { label: 'Probatoire / GCE OL', file: data.doc_probatoire },
    { label: 'Bac / GCE AL',        file: data.doc_bac },
    { label: 'CV',                  file: data.doc_cv },
    { label: 'Certificat médical',  file: data.doc_medical },
    { label: 'CNI / Passeport',     file: data.doc_cni },
    { label: 'Acte de naissance',   file: data.doc_birth_cert },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {!data ? (
          <div className="flex items-center justify-center h-64 text-slate-400">Chargement…</div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/8 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-white">{data.full_name}</h2>
                <div className="text-sm text-slate-400">#{data.id} · {data.domain} · {new Date(data.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Sexe', data.sex === 'M' ? 'Masculin' : 'Féminin'],
                  ['Naissance', `${data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString('fr-FR') : '—'} à ${data.place_of_birth || '—'}`],
                  ['Région', data.region], ['Nationalité', data.nationality],
                  ['Religion', data.religion], ['Groupe sanguin', data.blood_group],
                  ['Téléphone', data.phone], ['Email', data.email],
                  ['Urgence 1', `${data.emergency_contact_1 || '—'} — ${data.emergency_phone_1 || '—'}`],
                  ['Urgence 2', `${data.emergency_contact_2 || '—'} — ${data.emergency_phone_2 || '—'}`],
                  ['École d\'origine', data.former_school], ['Promotion', data.graduation_year],
                  ['Domaine', `${DOMAIN_ICONS[data.domain] || ''} ${data.domain}`],
                  ['Spécialité', data.specialty], ['Niveau', data.study_level],
                  ['WhatsApp source', data.whatsapp_phone],
                ].map(([k, v]) => v ? (
                  <div key={k} className="bg-white/3 rounded-xl px-3 py-2">
                    <div className="text-xs text-slate-500 mb-0.5">{k}</div>
                    <div className="text-white font-medium">{v}</div>
                  </div>
                ) : null)}
              </div>

              {/* Health notes */}
              {data.health_notes && (
                <div className="bg-orange-400/8 border border-orange-400/20 rounded-xl p-4">
                  <div className="text-xs font-bold text-orange-400 mb-1">🏥 Santé</div>
                  <div className="text-sm text-orange-200/80">{data.health_notes}</div>
                </div>
              )}

              {/* Documents */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">📁 Documents fournis</div>
                <div className="grid grid-cols-2 gap-2">
                  {docs.map(({ label, file }) => (
                    <a
                      key={label}
                      href={docUrl(file) || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all
                        ${file
                          ? 'border-green-500/30 bg-green-500/8 text-green-400 hover:bg-green-500/15 cursor-pointer'
                          : 'border-white/8 bg-white/3 text-slate-600 cursor-default pointer-events-none'
                        }`}
                    >
                      <span>{file ? '📄' : '○'}</span>
                      <span className="truncate">{label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Status update */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Décision du dossier</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStatus(val)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all
                        ${status === val ? STATUS_COLORS[val] : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Note interne sur ce dossier (visible uniquement par les admins)…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                             placeholder-white/25 focus:outline-none focus:border-yellow-400/50 resize-none"
                />
                <button
                  onClick={saveStatus}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-bold text-black bg-gradient-to-r from-yellow-400 to-green-400
                             hover:opacity-90 transition-all active:scale-98 disabled:opacity-60"
                >
                  {saving ? 'Sauvegarde…' : '💾 Enregistrer la décision'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function PreInscriptions() {
  const [rows, setRows]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterDomain) params.set('domain', filterDomain);
    if (search)       params.set('search', search);

    const [listRes, statsRes] = await Promise.all([
      fetch(`${API}?${params}`, { headers: authHeaders() }),
      fetch(`${API}/stats/summary`, { headers: authHeaders() }),
    ]);
    setRows(await listRes.json());
    setStats(await statsRes.json());
    setLoading(false);
  }, [filterStatus, filterDomain, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Pré-inscriptions</h1>
          <p className="text-slate-400 text-sm mt-1">Dossiers soumis via le formulaire en ligne</p>
        </div>
        <a
          href="/preinscription"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black text-sm
                     bg-gradient-to-r from-yellow-400 to-green-400 hover:opacity-90 transition-all"
        >
          🔗 Voir le formulaire public
        </a>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4">
            <div className="text-3xl font-black text-white">{stats.total}</div>
            <div className="text-xs text-slate-400 mt-1">Total dossiers</div>
          </div>
          {stats.byStatus.map(s => (
            <div key={s.status} className="glass rounded-2xl p-4">
              <div className={`text-3xl font-black ${STATUS_COLORS[s.status]?.split(' ')[1] || 'text-white'}`}>{s.count}</div>
              <div className="text-xs text-slate-400 mt-1">{STATUS_LABELS[s.status] || s.status}</div>
            </div>
          ))}
        </div>
      )}

      {/* Domain breakdown */}
      {stats?.byDomain?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byDomain.map(d => (
            <div key={d.domain} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm">
              <span>{DOMAIN_ICONS[d.domain] || '📌'}</span>
              <span className="text-white font-medium">{d.domain}</span>
              <span className="text-yellow-400 font-bold">{d.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, téléphone ou email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                     placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={filterDomain}
          onChange={e => setFilterDomain(e.target.value)}
          className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50"
        >
          <option value="">Tous les domaines</option>
          {['TIC', 'Commerce', 'Industrie', 'Maritime'].map(d => <option key={d} value={d}>{DOMAIN_ICONS[d]} {d}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center text-slate-400">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <div className="text-white font-bold mb-1">Aucun dossier trouvé</div>
          <div className="text-slate-400 text-sm">Modifie les filtres ou attends les premières pré-inscriptions</div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">#</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Candidat</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Domaine</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Spécialité</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => setSelected(row.id)}
                >
                  <td className="px-5 py-4 text-slate-500 font-mono text-xs">{row.id}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{row.full_name}</div>
                    <div className="text-xs text-slate-400">{row.phone}</div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="font-medium text-white">{DOMAIN_ICONS[row.domain]} {row.domain}</span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-slate-300">{row.specialty}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[row.status]}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-slate-400 text-xs">
                    {new Date(row.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(row.id); }}
                      className="px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 text-xs font-bold hover:bg-yellow-400/20 transition-all"
                    >
                      Voir →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          id={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
