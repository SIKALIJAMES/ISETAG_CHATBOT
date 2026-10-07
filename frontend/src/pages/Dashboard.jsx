import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, BookOpen, MessageSquare, CheckCircle, TrendingUp, Globe, 
  BarChart2, Zap, Database, ClipboardList, GraduationCap, ChevronRight, FileCheck 
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
      byDomain: [],
      byLevel: []
    },
    activity: [],
    languages: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [nurturingStats, setNurturingStats] = useState(null);
  const [triggeringNurture, setTriggeringNurture] = useState(false);

  const fetchNurturing = async () => {
    try {
      const res = await axios.get('/api/admin/nurturing/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNurturingStats(res.data);
    } catch (e) {}
  };

  const triggerNurturing = async () => {
    setTriggeringNurture(true);
    try {
      const res = await axios.post('/api/admin/nurturing/trigger', { limit: 20 }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(res.data.message || 'Relances envoyées avec succès.');
      fetchNurturing();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    } finally {
      setTriggeringNurture(false);
    }
  };

  useEffect(() => {
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
    fetchStats();
    fetchNurturing();
  }, []);


  const defaultActivity  = [
    { label: 'Lun', value: 4  }, { label: 'Mar', value: 9  },
    { label: 'Mer', value: 15 }, { label: 'Jeu', value: 11 },
    { label: 'Ven', value: 22 }, { label: 'Sam', value: 18 },
    { label: 'Dim', value: 25 },
  ];
  const defaultLanguages = [{ label: 'Français', value: 85 }, { label: 'Anglais', value: 15 }];
  const defaultCategories = [
    { label: 'Admissions & Frais', value: 12 },
    { label: 'Génie Logiciel',     value: 8  },
    { label: 'Réseaux & Marketing',value: 6  },
    { label: 'Général',            value: 4  },
  ];

  const activityData  = stats.activity?.length  > 0 ? stats.activity  : defaultActivity;
  const languageData  = stats.languages?.length  > 0 ? stats.languages  : defaultLanguages;
  const categoryData  = stats.categories?.length > 0 ? stats.categories : defaultCategories;

  // SVG chart math
  const chartH = 160, chartW = 500;
  const maxVal  = Math.max(...activityData.map(d => d.value), 10);
  const points  = activityData.map((d, i) => ({
    x: (i / (activityData.length - 1)) * (chartW - 40) + 20,
    y: chartH - (d.value / maxVal) * (chartH - 40) - 20,
    label: d.label, val: d.value
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length-1].x} ${chartH-20} L ${points[0].x} ${chartH-20} Z`;

  const preTotal = stats.preinscriptions?.total || 0;
  const prePending = stats.preinscriptions?.pending || 0;

  const cards = [
    {
      title: 'Conversations',
      value: stats.totalConversations,
      icon: MessageSquare,
      accent: '#EAE74A',
      bg: 'rgba(234,231,74,0.08)',
      border: 'rgba(234,231,74,0.2)',
    },
    {
      title: 'Pré-inscriptions',
      value: preTotal,
      subValue: prePending > 0 ? `${prePending} en attente` : 'Dossiers reçus',
      icon: ClipboardList,
      accent: '#38bdf8',
      bg: 'rgba(56,189,248,0.08)',
      border: 'rgba(56,189,248,0.2)',
      link: '/preinscriptions',
    },
    {
      title: 'Taux Résolution',
      value: `${stats.resolutionRate?.toFixed(1)}%`,
      icon: CheckCircle,
      accent: '#a78bfa',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.2)',
    },
    {
      title: 'Chunks RAG',
      value: `${stats.knowledgeChunks}`,
      icon: BookOpen,
      accent: '#5DCB6A',
      bg: 'rgba(93,203,106,0.08)',
      border: 'rgba(93,203,106,0.2)',
    },
    {
      title: 'Escalades',
      value: stats.escalatedCount,
      icon: Users,
      accent: '#f87171',
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.2)',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-up">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand tracking-tight">ISETAG Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Performances en temps réel du chatbot WhatsApp & suivi des admissions
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm"
          style={{ background: 'rgba(93,203,106,0.1)', color: 'var(--isetag-green)', border: '1px solid rgba(93,203,106,0.25)' }}>
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--isetag-green)' }} />
          Système Live
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => {
          const cardContent = (
            <div
              className={`stat-card transition-all duration-200 ${card.link ? 'hover:scale-[1.02] cursor-pointer' : ''}`}
              style={{ borderColor: card.border, background: card.bg }}
            >
              <div className="p-3.5 rounded-2xl flex-shrink-0"
                style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}30` }}>
                <card.icon size={22} style={{ color: card.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {card.title}
                </p>
                <h3 className="text-2xl font-black mt-0.5 text-white">{card.value}</h3>
                {card.subValue && (
                  <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: card.accent }}>
                    {card.subValue}
                  </p>
                )}
              </div>
            </div>
          );

          return card.link ? (
            <Link key={i} to={card.link} className="block no-underline">
              {cardContent}
            </Link>
          ) : (
            <div key={i}>{cardContent}</div>
          );
        })}
      </div>



      {/* Relance Automatique / Nurturing Banner */}
      <div className="glass rounded-3xl p-6 border border-yellow-400/20 bg-gradient-to-r from-yellow-400/5 via-transparent to-green-400/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h3 className="text-base font-bold text-white">Relance Automatique des Prospects (24h)</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 font-bold border border-yellow-400/30">
              Actif 24/7
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl">
            Le bot relance automatiquement les prospects WhatsApp inactifs après 24h avec le lien de pré-inscription gratuite.
            {nurturingStats && (
              <span className="text-white font-medium ml-1">
                ({nurturingStats.nurturedTotal} relance(s) envoyée(s), {nurturingStats.pendingEligible} prospect(s) éligible(s) en attente)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={triggerNurturing}
          disabled={triggeringNurture}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black text-xs
                     bg-gradient-to-r from-yellow-400 to-green-400 hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          {triggeringNurture ? '⏳ Relance en cours…' : '🚀 Déclencher la relance maintenant'}
        </button>
      </div>

      {/* Charts */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Activity line chart */}
        <div className="glass rounded-3xl p-8 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} style={{ color: 'var(--isetag-yellow)' }} />
                Activité Hebdomadaire
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Volume de messages sur 7 jours
              </p>
            </div>
            <span className="badge-yellow">Messages</span>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#EAE74A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#EAE74A" stopOpacity="0.0"  />
                </linearGradient>
              </defs>
              <line x1="20" y1="40"  x2={chartW-20} y2="40"  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="20" y1="80"  x2={chartW-20} y2="80"  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="20" y1="120" x2={chartW-20} y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <path d={areaPath} fill="url(#areaGrad)" />
              <path d={linePath} fill="none" stroke="#EAE74A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="5" fill="#EAE74A" stroke="#0C0C0C" strokeWidth="2" />
                  <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fontWeight="700"
                    fill="#EAE74A" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.val}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between px-5 mt-3">
            {points.map((p, idx) => (
              <span key={idx} className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Languages + Categories */}
        <div className="space-y-6 flex flex-col">
          {/* Languages */}
          <div className="glass rounded-3xl p-6 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Globe size={16} style={{ color: 'var(--isetag-green)' }} />
              Langues Utilisées
            </h3>
            <p className="text-[10px] mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>Préférence linguistique</p>
            <div className="space-y-4">
              {languageData.map((lang, i) => {
                const total   = languageData.reduce((a, c) => a + c.value, 0);
                const percent = total > 0 ? (lang.value / total) * 100 : 0;
                const color   = i === 0 ? 'var(--isetag-yellow)' : 'var(--isetag-green)';
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-white/70">
                      <span>{lang.label}</span>
                      <span style={{ color }}>{percent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${percent}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          <div className="glass rounded-3xl p-6 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <BarChart2 size={16} style={{ color: 'var(--isetag-yellow)' }} />
              Catégories RAG
            </h3>
            <p className="text-[10px] mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>Répartition de la base de connaissances</p>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {categoryData.slice(0, 4).map((cat, idx) => {
                const total   = categoryData.reduce((a, c) => a + c.value, 0);
                const percent = total > 0 ? (cat.value / total) * 100 : 0;
                const colors  = ['#EAE74A', '#5DCB6A', '#a78bfa', '#f87171'];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-white/60">
                      <span className="truncate max-w-[130px]" title={cat.label}>{cat.label}</span>
                      <span>{cat.value} fiches ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: colors[idx % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pre-inscriptions Analytics ──────────────────────────── */}
      <div className="glass rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap size={20} style={{ color: '#38bdf8' }} />
              Suivi des Pré-inscriptions
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Dossiers reçus via le formulaire en ligne
            </p>
          </div>
          <Link
            to="/preinscriptions"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}
          >
            Voir tous les dossiers <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Status Breakdown */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Statut des dossiers
            </p>
            <div className="space-y-3">
              {[
                { label: '⏳ En attente',  key: 'pending',  color: '#EAE74A' },
                { label: '🔍 En revue',    key: 'reviewed', color: '#38bdf8' },
                { label: '✅ Acceptés',    key: 'accepted', color: '#5DCB6A' },
                { label: '❌ Refusés',     key: 'rejected', color: '#f87171' },
              ].map(({ label, key, color }) => {
                const val   = stats.preinscriptions?.[key] || 0;
                const total = stats.preinscriptions?.total || 1;
                const pct   = Math.round((val / total) * 100);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</span>
                      <span style={{ color }}>{val} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Domain Breakdown */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Filières les plus demandées
            </p>
            {(stats.preinscriptions?.byDomain || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <FileCheck size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Aucune pré-inscription encore
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats.preinscriptions?.byDomain || []).slice(0, 5).map((d, idx) => {
                  const total = (stats.preinscriptions?.byDomain || []).reduce((a, c) => a + c.value, 0) || 1;
                  const pct   = Math.round((d.value / total) * 100);
                  const colors = ['#EAE74A', '#5DCB6A', '#38bdf8', '#a78bfa', '#f87171'];
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate max-w-[180px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                          {d.label}
                        </span>
                        <span style={{ color: colors[idx % colors.length] }}>{d.value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, background: colors[idx % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(234,231,74,0.1)' }}>
            <Zap size={20} style={{ color: 'var(--isetag-yellow)' }} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Groq — Llama 3.3 70b</h4>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Moteur IA — 14 400 req/jour gratuit</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(93,203,106,0.1)' }}>
            <Database size={20} style={{ color: 'var(--isetag-green)' }} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">pgvector + Railway</h4>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Base RAG — Déploiement cloud</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
