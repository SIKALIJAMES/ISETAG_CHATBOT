import React, { useEffect, useState, useCallback } from 'react';
import { Search, Download, ExternalLink, FileText, CheckCircle, Clock } from 'lucide-react';

const API = '/api/preinscription';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
}

export default function PreInscriptions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDomain) params.set('domain', filterDomain);
    if (search) params.set('search', search);

    try {
      const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterDomain, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API}/export/csv`, { headers: authHeaders() });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preinscriptions_isetag.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Erreur: ' + e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dossiers de Pré-inscription en Ligne
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dossiers soumis par les futurs étudiants via le formulaire web ou orientés par le chatbot
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151921] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
          >
            <Download size={13} />
            <span>Exporter en Excel</span>
          </button>
          <a
            href="/preinscription"
            target="_blank"
            rel="noreferrer"
            className="btn-green-isetag text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <span>Formulaire public</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Barre de Filtre & Recherche */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101319] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
          />
        </div>

        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101319] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-600"
        >
          <option value="">Tous les domaines d'études</option>
          <option value="TIC">Informatique & TIC</option>
          <option value="Commerce">Commerce & Gestion</option>
          <option value="Industrie">Technologies Industrielles</option>
          <option value="Maritime">Études Maritimes</option>
        </select>
      </div>

      {/* Tableau des Candidats */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151921] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Chargement des dossiers...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center space-y-1.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Aucun dossier de pré-inscription pour le moment
            </p>
            <p className="text-[11px] text-slate-400">
              Les dossiers soumis en ligne par les bacheliers apparaîtront automatiquement ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#101319] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Code Dossier</th>
                  <th className="py-2.5 px-4">Candidat</th>
                  <th className="py-2.5 px-4">Domaine & Spécialité</th>
                  <th className="py-2.5 px-4">Niveau</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      #{row.dossier_code || `ISETAG-${row.id}`}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{row.full_name}</p>
                      <p className="text-[10px] text-slate-400">{row.phone}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{row.specialty}</p>
                      <p className="text-[10px] text-slate-400">{row.domain}</p>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {row.study_level}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(row.created_at || Date.now()).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                        {row.status || 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}