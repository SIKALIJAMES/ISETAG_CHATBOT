import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, BookOpen, MessageSquare, CheckCircle, TrendingUp, Globe, BarChart2, Zap, Database } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalConversations: 0,
    escalatedCount: 0,
    knowledgeChunks: 0,
    resolutionRate: 100,
    activity: [],
    languages: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);

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
      title: 'Chunks RAG',
      value: `${stats.knowledgeChunks}`,
      icon: BookOpen,
      accent: '#5DCB6A',
      bg: 'rgba(93,203,106,0.08)',
      border: 'rgba(93,203,106,0.2)',
    },
    {
      title: 'Taux de Résolution',
      value: `${stats.resolutionRate?.toFixed(1)}%`,
      icon: CheckCircle,
      accent: '#a78bfa',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.2)',
    },
    {
      title: 'Escalades Humaines',
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
            Performances en temps réel du chatbot WhatsApp
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm"
          style={{ background: 'rgba(93,203,106,0.1)', color: 'var(--isetag-green)', border: '1px solid rgba(93,203,106,0.25)' }}>
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--isetag-green)' }} />
          Système Live
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <div
            key={i}
            className="stat-card"
            style={{ borderColor: card.border, background: card.bg }}
          >
            <div className="p-3.5 rounded-2xl flex-shrink-0"
              style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}30` }}>
              <card.icon size={22} style={{ color: card.accent }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {card.title}
              </p>
              <h3 className="text-2xl font-black mt-0.5 text-white">{card.value}</h3>
            </div>
          </div>
        ))}
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

      {/* Footer info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(234,231,74,0.1)' }}>
            <Zap size={20} style={{ color: 'var(--isetag-yellow)' }} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Gemini 2.5 Flash</h4>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Moteur IA — Google DeepMind</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(93,203,106,0.1)' }}>
            <Database size={20} style={{ color: 'var(--isetag-green)' }} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">pgvector + Neon</h4>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Base RAG — 768 dimensions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
