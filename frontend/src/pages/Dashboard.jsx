import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, BookOpen, MessageSquare, CheckCircle, ClipboardList,
  Clock, RefreshCw
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
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Pré-inscriptions en ligne',
      value: preTotal,
      desc: `${prePending} dossier(s) en attente`,
      icon: ClipboardList,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Taux de réponse autonome',
      value: `${stats.resolutionRate?.toFixed(1) || 100}%`,
      desc: 'Prise en charge par le chatbot',
      icon: CheckCircle,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Base documentaire (FAQ)',
      value: stats.knowledgeChunks,
      desc: 'Fiches et filières enregistrées',
      icon: BookOpen,
      color: 'text-slate-800 dark:text-slate-200',
      bg: 'bg-slate-100 dark:bg-slate-800/60',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Suivi des échanges d'orientation WhatsApp et des pré-inscriptions ISETAG
          </p>
        </div>

        <button
          onClick={triggerNurturing}
          disabled={triggeringNurture}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs text-slate-900 bg-[#E5B80B] hover:bg-[#D4A708] transition-all shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={13} className={triggeringNurture ? 'animate-spin' : ''} />
          <span>Relancer les candidats inactifs (24h)</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <card.icon size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {card.value}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {card.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Détails & Statistiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Colonne Principale : Répartition des Demandes */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Sujets les plus demandés par les prospects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Classement des thématiques abordées lors des conversations
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'Frais de scolarité & Modalités de paiement', percent: 45 },
              { label: 'Filières Informatiques (Génie Logiciel, Réseaux, MSI)', percent: 30 },
              { label: 'Cité Universitaire & Logement étudiant Yassa', percent: 15 },
              { label: 'Navettes gratuites & Début des cours', percent: 10 },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">{item.percent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne Secondaire : Bilinguisme & Service */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Langues utilisées
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Répartition des échanges reçus
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Français</span>
                <span className="text-slate-500 font-semibold">85%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Anglais (Section Anglophone)</span>
                <span className="text-slate-500 font-semibold">15%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-slate-400 dark:bg-slate-500" style={{ width: '15%' }} />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <Clock size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Le chatbot WhatsApp répond 24h/24 aux bacheliers et transmet les dossiers de pré-inscription au secrétariat.
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;