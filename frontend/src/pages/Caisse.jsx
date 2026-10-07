import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Wallet, CheckCircle2, XCircle, Clock, Bell, BellOff,
  ChevronRight, Truck, MapPin, User, Calendar, Sunrise,
  Sun, Moon, RefreshCw, AlertCircle, TrendingDown, History,
  Edit3
} from "lucide-react";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const SHIFTS = [
  { value: "matin", label: "Matin",  icon: Sunrise, color: "#EAE74A" },
  { value: "soir",  label: "Soir",   icon: Sun,     color: "#f97316" },
  { value: "nuit",  label: "Nuit",   icon: Moon,    color: "#a78bfa" },
];

const Caisse = () => {
  const today = new Date().toISOString().split("T")[0];
  const [pending, setPending]     = useState([]);
  const [historique, setHistorique] = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setTab]       = useState("attente");
  const [filterDate, setFilterDate] = useState(today);
  const [toast, setToast]         = useState(null);
  const [processing, setProcessing] = useState(null); // trajetId en cours

  // Modal décaissement
  const [modal, setModal]         = useState(null); // { trajet, montant, motif }

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPending = useCallback(async () => {
    try {
      const r = await axios.get("/api/frais-route/caisse/pending", authHeaders());
      setPending(r.data);
    } catch {}
  }, []);

  const fetchHistorique = useCallback(async () => {
    try {
      const r = await axios.get("/api/frais-route/historique", {
        ...authHeaders(), params: { date: filterDate },
      });
      setHistorique(r.data);
    } catch {}
  }, [filterDate]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await axios.get("/api/frais-route/stats", {
        ...authHeaders(), params: { date: filterDate },
      });
      setStats(r.data);
    } catch {}
  }, [filterDate]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPending(), fetchStats(), fetchHistorique()]).finally(() =>
      setLoading(false)
    );
    // Polling toutes les 30s pour nouvelles alertes
    const interval = setInterval(() => {
      fetchPending();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPending, fetchStats, fetchHistorique]);

  const openModal = (trajet) => {
    setModal({
      trajet,
      montant: trajet.montant_bareme ? String(trajet.montant_bareme) : "",
      motif: `Frais de route — ${trajet.chantier}`,
    });
  };

  const handleDecaisser = async () => {
    if (!modal) return;
    if (!modal.montant || isNaN(parseFloat(modal.montant))) {
      showToast("Montant invalide", "error");
      return;
    }
    setProcessing(modal.trajet.id);
    try {
      await axios.post(
        `/api/frais-route/caisse/decaisser/${modal.trajet.id}`,
        { montant_fcfa: parseFloat(modal.montant), motif: modal.motif },
        authHeaders()
      );
      showToast(`✅ ${parseFloat(modal.montant).toLocaleString("fr-FR")} FCFA décaissés pour ${modal.trajet.chauffeur}`);
      setModal(null);
      fetchPending();
      fetchStats();
      fetchHistorique();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur serveur", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleIgnorer = async (trajetId, chauffeur) => {
    setProcessing(trajetId);
    try {
      await axios.post(`/api/frais-route/caisse/ignorer/${trajetId}`, {}, authHeaders());
      showToast(`✔ Trajet de ${chauffeur} marqué "Aucun frais"`);
      fetchPending();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur", "error");
    } finally {
      setProcessing(null);
    }
  };

  const getShift = (val) => SHIFTS.find(s => s.value === val) || SHIFTS[0];

  // ──────────────────────────────────────────────────────────────────
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

      {/* Modal décaissement */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="glass rounded-3xl p-8 w-full max-w-md space-y-6"
            style={{ border: "1px solid rgba(234,231,74,0.3)" }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ background: "rgba(234,231,74,0.12)" }}>
                <Wallet size={22} style={{ color: "var(--isetag-yellow)" }} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Décaisser les frais</h2>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {modal.trajet.chauffeur} — {modal.trajet.chantier}
                </p>
              </div>
            </div>

            {/* Info trajet */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Camion</span>
                <span className="font-bold text-white">{modal.trajet.numero_camion}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Voyage n°</span>
                <span className="font-bold" style={{ color: "var(--isetag-yellow)" }}>
                  #{modal.trajet.numero_voyage}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Shift</span>
                <span className="font-bold" style={{ color: getShift(modal.trajet.shift).color }}>
                  {getShift(modal.trajet.shift).label}
                </span>
              </div>
              {modal.trajet.montant_bareme > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Barème standard</span>
                  <span className="font-bold" style={{ color: "var(--isetag-green)" }}>
                    {Number(modal.trajet.montant_bareme).toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Montant à décaisser (FCFA) *
              </label>
              <input
                type="number"
                className="input-dark text-lg font-bold"
                placeholder="0"
                value={modal.montant}
                onChange={e => setModal(m => ({ ...m, montant: e.target.value }))}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Motif
              </label>
              <input className="input-dark" value={modal.motif}
                onChange={e => setModal(m => ({ ...m, motif: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all text-white/50 hover:text-white/80"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Annuler
              </button>
              <button
                onClick={handleDecaisser}
                disabled={processing === modal.trajet.id}
                className="flex-1 btn-green py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                {processing === modal.trajet.id
                  ? <><span className="animate-spin">⟳</span> Traitement...</>
                  : <><CheckCircle2 size={16} /> Confirmer décaissement</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand tracking-tight flex items-center gap-3">
            <Wallet size={28} />
            Espace Caissière
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Gestion des décaissements — Frais de route
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold animate-pulse"
              style={{ background: "rgba(234,231,74,0.12)", color: "var(--isetag-yellow)", border: "1px solid rgba(234,231,74,0.3)" }}>
              <Bell size={14} />
              {pending.length} en attente
            </span>
          )}
          <input type="date" value={filterDate}
            onChange={e => { setFilterDate(e.target.value); }}
            className="input-dark text-sm w-44" />
          <button onClick={() => { fetchPending(); fetchStats(); fetchHistorique(); }}
            className="p-3 rounded-xl transition-all hover:bg-white/10"
            title="Actualiser">
            <RefreshCw size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Décaissé aujourd'hui", value: `${stats.total_jour?.toLocaleString("fr-FR")} FCFA`, color: "#EAE74A" },
            { label: "Transactions", value: stats.nb_decaissements, color: "#5DCB6A", sub: "ce jour" },
            { label: "En attente", value: stats.nb_pending, color: "#f97316", sub: "à traiter" },
            { label: "Total cumulé", value: `${stats.total_global?.toLocaleString("fr-FR")} FCFA`, color: "#a78bfa" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5"
              style={{ borderColor: `${s.color}25`, background: `${s.color}08` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              {s.sub && <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        {[
          { id: "attente", label: `File d'attente (${pending.length})`, icon: Bell },
          { id: "historique", label: `Historique (${historique.length})`, icon: History },
        ].map(tab => (
          <button key={tab.id} onClick={() => setTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id ? "text-black" : "text-white/40 hover:text-white/60"
            }`}
            style={activeTab === tab.id ? { background: "var(--isetag-yellow)" } : {}}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* FILE D'ATTENTE */}
      {activeTab === "attente" && (
        loading ? (
          <div className="glass rounded-3xl p-12 text-center text-white/30 text-sm">Chargement...</div>
        ) : pending.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <BellOff size={48} className="mx-auto mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
            <p className="text-white font-bold text-lg mb-1">Aucun décaissement en attente</p>
            <p className="text-white/30 text-sm">Tous les trajets ont été traités ✓</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(t => {
              const shift = getShift(t.shift);
              const isProcessing = processing === t.id;
              return (
                <div key={t.id}
                  className="glass rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:scale-[1.005]"
                  style={{ border: "1px solid rgba(234,231,74,0.2)", background: "rgba(234,231,74,0.04)" }}>

                  {/* Badge voyage */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center"
                    style={{ background: "rgba(234,231,74,0.12)", border: "1px solid rgba(234,231,74,0.25)" }}>
                    <Truck size={18} style={{ color: "var(--isetag-yellow)" }} />
                    <span className="text-[10px] font-black" style={{ color: "var(--isetag-yellow)" }}>#{t.numero_voyage}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Camion</p>
                      <p className="text-sm font-bold text-white">{t.numero_camion}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Chauffeur</p>
                      <p className="text-sm font-semibold text-white/80">{t.chauffeur}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Chantier</p>
                      <p className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--isetag-green)" }}>
                        <MapPin size={11} />{t.chantier}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Shift / Barème</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${shift.color}18`, color: shift.color }}>
                          {shift.label}
                        </span>
                        {t.montant_bareme > 0 && (
                          <span className="text-xs font-bold" style={{ color: "var(--isetag-yellow)" }}>
                            {Number(t.montant_bareme).toLocaleString("fr-FR")} F
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openModal(t)}
                      disabled={isProcessing}
                      className="btn-green flex items-center gap-2 px-5 py-3 rounded-2xl text-sm">
                      <CheckCircle2 size={15} />
                      Décaisser
                    </button>
                    <button
                      onClick={() => handleIgnorer(t.id, t.chauffeur)}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all hover:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <XCircle size={14} />
                      Aucun frais
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* HISTORIQUE */}
      {activeTab === "historique" && (
        <div className="glass rounded-3xl overflow-hidden">
          {historique.length === 0 ? (
            <div className="p-12 text-center">
              <History size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-white/30 text-sm">Aucun décaissement pour cette date</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Heure", "Camion", "Chauffeur", "Chantier", "Shift", "Montant", "Caissière"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historique.map((f, i) => {
                  const shift = getShift(f.shift);
                  return (
                    <tr key={f.id} className="transition-colors hover:bg-white/[0.025]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-5 py-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {new Date(f.decaisse_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-white">{f.numero_camion}</td>
                      <td className="px-5 py-4 text-sm text-white/70">{f.chauffeur}</td>
                      <td className="px-5 py-4 text-sm text-white/70 flex items-center gap-1.5">
                        <MapPin size={11} style={{ color: "var(--isetag-green)" }} />{f.chantier}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${shift.color}18`, color: shift.color }}>
                          {shift.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-black" style={{ color: "var(--isetag-yellow)" }}>
                          {Number(f.montant_fcfa).toLocaleString("fr-FR")} FCFA
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-white/50">{f.caissiere || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <tr>
                  <td colSpan={5} className="px-5 py-4 text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Total du jour
                  </td>
                  <td className="px-5 py-4 text-base font-black" style={{ color: "var(--isetag-yellow)" }}>
                    {historique.reduce((sum, f) => sum + parseFloat(f.montant_fcfa || 0), 0)
                      .toLocaleString("fr-FR")} FCFA
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Caisse;
