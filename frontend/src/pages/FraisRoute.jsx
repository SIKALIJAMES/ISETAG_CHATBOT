import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Truck, Plus, CheckCircle2, Clock, XCircle, RotateCcw,
  ChevronDown, MapPin, User, Calendar, Sun, Moon, Sunrise,
  AlertTriangle, TrendingUp, Package
} from "lucide-react";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const SHIFTS = [
  { value: "matin",  label: "Matin",  icon: Sunrise, color: "#EAE74A" },
  { value: "soir",   label: "Soir",   icon: Sun,     color: "#f97316" },
  { value: "nuit",   label: "Nuit",   icon: Moon,    color: "#a78bfa" },
];

const STATUT_CONFIG = {
  pending:  { label: "En attente caisse",   color: "#EAE74A", bg: "rgba(234,231,74,0.12)",  icon: Clock },
  decaisse: { label: "Décaissé",            color: "#5DCB6A", bg: "rgba(93,203,106,0.12)",  icon: CheckCircle2 },
  ignore:   { label: "Aucun frais",         color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  icon: XCircle },
  no_alert: { label: "Même chantier",       color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   icon: RotateCcw },
};

const FraisRoute = () => {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    numero_camion: "",
    chauffeur: "",
    chantier: "",
    date_trajet: today,
    shift: "matin",
    notes: "",
  });
  const [trajets, setTrajets] = useState([]);
  const [stats, setStats]     = useState(null);
  const [baremes, setBaremes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [filterDate, setFilterDate] = useState(today);
  const [filterShift, setFilterShift] = useState("");
  const [toast, setToast]   = useState(null);
  const [activeTab, setTab] = useState("saisie");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTrajets = useCallback(async () => {
    try {
      const params = { date: filterDate };
      if (filterShift) params.shift = filterShift;
      const r = await axios.get("/api/frais-route/trajets", { ...authHeaders(), params });
      setTrajets(r.data);
    } catch {}
  }, [filterDate, filterShift]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await axios.get("/api/frais-route/stats", {
        ...authHeaders(), params: { date: filterDate },
      });
      setStats(r.data);
    } catch {}
  }, [filterDate]);

  const fetchBaremes = async () => {
    try {
      const r = await axios.get("/api/frais-route/baremes", authHeaders());
      setBaremes(r.data);
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTrajets(), fetchStats(), fetchBaremes()]).finally(() => setLoading(false));
  }, [fetchTrajets, fetchStats]);

  // Auto-complétion du chantier depuis le barème
  const handleChantierChange = (val) => {
    setForm((f) => ({ ...f, chantier: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numero_camion || !form.chauffeur || !form.chantier) {
      showToast("Remplis tous les champs obligatoires", "error");
      return;
    }
    setSaving(true);
    try {
      const r = await axios.post("/api/frais-route/trajets", form, authHeaders());
      showToast(`✅ Trajet #${r.data.id} enregistré — Voyage n°${r.data.numero_voyage}`);
      setForm((f) => ({ ...f, notes: "" }));
      fetchTrajets();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur serveur", "error");
    } finally {
      setSaving(false);
    }
  };

  const StatCard = ({ label, value, color, sub }) => (
    <div className="glass rounded-2xl p-5 flex flex-col gap-1"
      style={{ borderColor: `${color}25`, background: `${color}08` }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</p>}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-sm font-bold shadow-2xl transition-all ${
          toast.type === "error"
            ? "bg-red-500/20 border border-red-500/40 text-red-300"
            : "bg-green-500/20 border border-green-500/40 text-green-300"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand tracking-tight flex items-center gap-3">
            <Truck size={28} />
            Frais de Route
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Saisie des trajets — Logistique
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date" value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-dark text-sm w-44"
          />
          <select value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="input-dark text-sm w-36">
            <option value="">Tous shifts</option>
            {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Décaissé aujourd'hui" value={`${stats.total_jour?.toLocaleString("fr-FR")} FCFA`} color="#EAE74A" />
          <StatCard label="Décaissements" value={stats.nb_decaissements} color="#5DCB6A" sub="transactions du jour" />
          <StatCard label="En attente caisse" value={stats.nb_pending} color="#f97316" sub="trajets pendants" />
          <StatCard label="Total global" value={`${stats.total_global?.toLocaleString("fr-FR")} FCFA`} color="#a78bfa" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        {[{ id: "saisie", label: "Saisir un trajet", icon: Plus },
          { id: "liste",  label: `Trajets du jour (${trajets.length})`, icon: Package }].map(tab => (
          <button key={tab.id} onClick={() => setTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id ? "text-black" : "text-white/40 hover:text-white/60"
            }`}
            style={activeTab === tab.id ? { background: "var(--isetag-yellow)" } : {}}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* SAISIE TAB */}
      {activeTab === "saisie" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 glass rounded-3xl p-8 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus size={18} style={{ color: "var(--isetag-yellow)" }} />
              Nouveau trajet
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <Truck size={12} className="inline mr-1" />N° Camion *
                </label>
                <input className="input-dark" placeholder="ex: BL-1234-A"
                  value={form.numero_camion}
                  onChange={e => setForm(f => ({ ...f, numero_camion: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <User size={12} className="inline mr-1" />Chauffeur *
                </label>
                <input className="input-dark" placeholder="Nom complet"
                  value={form.chauffeur}
                  onChange={e => setForm(f => ({ ...f, chauffeur: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                <MapPin size={12} className="inline mr-1" />Chantier / Destination *
              </label>
              <input className="input-dark" list="chantiers-list"
                placeholder="Tapez ou sélectionnez..."
                value={form.chantier}
                onChange={e => handleChantierChange(e.target.value)} />
              <datalist id="chantiers-list">
                {baremes.map(b => <option key={b.id} value={b.chantier} />)}
              </datalist>
              {form.chantier && baremes.find(b => b.chantier.toLowerCase() === form.chantier.toLowerCase()) && (
                <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--isetag-green)" }}>
                  💰 Barème : {baremes.find(b => b.chantier.toLowerCase() === form.chantier.toLowerCase())
                    ?.montant_fcfa?.toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <Calendar size={12} className="inline mr-1" />Date
                </label>
                <input type="date" className="input-dark"
                  value={form.date_trajet}
                  onChange={e => setForm(f => ({ ...f, date_trajet: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Shift
                </label>
                <div className="flex gap-2">
                  {SHIFTS.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => setForm(f => ({ ...f, shift: s.value }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        form.shift === s.value ? "text-black" : "text-white/40 border-white/10"
                      }`}
                      style={form.shift === s.value
                        ? { background: s.color, borderColor: s.color }
                        : { background: "rgba(255,255,255,0.04)" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Notes (optionnel)
              </label>
              <input className="input-dark" placeholder="Informations complémentaires..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button type="submit" disabled={saving}
              className="btn-yellow w-full flex items-center justify-center gap-2 py-4 text-sm">
              {saving ? <><span className="animate-spin">⟳</span> Enregistrement...</> : <><Plus size={16} /> Enregistrer le trajet</>}
            </button>
          </form>

          {/* Barème side */}
          <div className="lg:col-span-2 glass rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} style={{ color: "var(--isetag-green)" }} />
              Barèmes par destination
            </h3>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Montants habituels pré-configurés
            </p>
            <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
              {baremes.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">Aucun barème configuré</p>
              ) : baremes.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.chantier}</p>
                    {b.notes && <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{b.notes}</p>}
                  </div>
                  <span className="text-sm font-black" style={{ color: "var(--isetag-yellow)" }}>
                    {Number(b.montant_fcfa).toLocaleString("fr-FR")} F
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LISTE TAB */}
      {activeTab === "liste" && (
        <div className="glass rounded-3xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-white/30 text-sm">Chargement...</div>
          ) : trajets.length === 0 ? (
            <div className="p-12 text-center">
              <Truck size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-white/30 text-sm">Aucun trajet enregistré pour cette date</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Voyage", "Camion", "Chauffeur", "Chantier", "Shift", "Statut Caisse", "Heure"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trajets.map((t, i) => {
                  const cfg = STATUT_CONFIG[t.statut_caisse] || STATUT_CONFIG.pending;
                  const Icon = cfg.icon;
                  const shift = SHIFTS.find(s => s.value === t.shift);
                  return (
                    <tr key={t.id}
                      className="transition-colors hover:bg-white/[0.025]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-5 py-4">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(234,231,74,0.1)", color: "var(--isetag-yellow)" }}>
                          #{t.numero_voyage}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-white">{t.numero_camion}</td>
                      <td className="px-5 py-4 text-sm text-white/70">{t.chauffeur}</td>
                      <td className="px-5 py-4 text-sm text-white/70 flex items-center gap-1.5">
                        <MapPin size={12} style={{ color: "var(--isetag-green)" }} />{t.chantier}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${shift?.color}18`, color: shift?.color, border: `1px solid ${shift?.color}30` }}>
                          {shift?.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          <Icon size={11} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {new Date(t.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default FraisRoute;
