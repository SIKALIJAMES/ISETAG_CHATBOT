import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, BookOpen, MessageSquare, CheckCircle, ClipboardList,
  ArrowUpRight, Clock, Globe, RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalConversations: 0,
    escalatedCount: 0,
    knowledgeChunks: 0,
    resolutionRate: 100,
    preinscriptions: {
      total: 0,
      pending: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0,
    },
    activity: [],
    languages: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [triggeringNurture, setTriggeringNurture] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const triggerNurturing = async () => {
    setTriggeringNurture(true);
    try {
      const res = await axios.post('/api/admin/nurturing/trigger', { limit: 20 }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(res.data.message || 'Relances automatiques envoyées.');
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    } finally {
      setTriggeringNurture(false);
    }
  };

  const preTotal = stats.preinscriptions?.total || 0;
  const prePending = stats.preinscriptions?.pending || 0;

  const cards = [
    {
      title: 'Conversations WhatsApp',
      value: stats.totalConversations,
      desc: 'Candidats uniques orientés',
      icon: MessageSquare,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-900/40'
    },
    {
      title: 'Pré-inscriptions en ligne',
      value: preTotal,
      desc: `${prePending} dossier(s) en attente`,
      icon: ClipboardList,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-900/40'
    },
    {
      title: 'Taux de réponse autonome',
      value: `${stats.resolutionRate?.toFixed(1) || 100}%`,
      desc: 'Résolu sans intervention humaine',
      icon: CheckCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900/40'
    },
    {
      title: 'Base documentaire (FAQ)',
      value: stats.knowledgeChunks,
      desc: 'Règles et filières enregistrées',
      icon: BookOpen,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-900/40'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Suivi des échanges WhatsApp et des candidatures de l'ISETAG
          </p>
        </div>

        <button
          onClick={triggerNurturing}
          disabled={triggeringNurture}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-900 bg-[#EAE74A] hover:bg-[#dcd934] transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={triggeringNurture ? 'animate-spin' : ''} />
          <span>Relancer les candidats inactifs (24h)</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-[#181a1d] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon size={18} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {card.value}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                {card.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques & Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonne Principale : Activité Récente */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#181a1d] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Répartition des demandes par thématique
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Questions les plus fréquentes posées par les étudiants
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Frais de scolarité & Modalités de paiement', percent: 45 },
              { label: 'Filières Informatiques (Génie Logiciel, Réseaux, MSI)', percent: 30 },
              { label: 'Cité Universitaire & Logement étudiant', percent: 15 },
              { label: 'Transport gratuit & Horaires des cours', percent: 10 },
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className="text-slate-500 dark:text-slate-400">{item.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#EAE74A]"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne Secondaire : Répartition Langue & Escalade */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181a1d] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Langues utilisées
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Bilinguisme intégral du chatbot
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Français</span>
                <span className="text-slate-500">85%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Anglais (Section Anglophone)</span>
                <span className="text-slate-500">15%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: '15%' }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <Clock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Le service WhatsApp est actif 24h/24 et 7j/7 pour orienter les bacheliers et leurs parents.
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
