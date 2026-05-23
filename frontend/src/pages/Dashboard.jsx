import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, BookOpen, MessageSquare, CheckCircle, TrendingUp, Globe, BarChart2 } from 'lucide-react';

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

  // --- Mock/Demo Data fallbacks if the database is brand new ---
  const defaultActivity = [
    { label: 'Lun', value: 4 },
    { label: 'Mar', value: 9 },
    { label: 'Mer', value: 15 },
    { label: 'Jeu', value: 11 },
    { label: 'Ven', value: 22 },
    { label: 'Sam', value: 18 },
    { label: 'Dim', value: 25 }
  ];

  const defaultLanguages = [
    { label: 'Français', value: 85 },
    { label: 'Anglais', value: 15 }
  ];

  const defaultCategories = [
    { label: 'Admissions & Frais', value: 12 },
    { label: 'Génie Logiciel', value: 8 },
    { label: 'Réseaux & Marketing', value: 6 },
    { label: 'Général', value: 4 }
  ];

  const activityData = stats.activity && stats.activity.length > 0 ? stats.activity : defaultActivity;
  const languageData = stats.languages && stats.languages.length > 0 ? stats.languages : defaultLanguages;
  const categoryData = stats.categories && stats.categories.length > 0 ? stats.categories : defaultCategories;

  // --- SVG Line Chart Math ---
  const chartHeight = 160;
  const chartWidth = 500;
  const maxVal = Math.max(...activityData.map(d => d.value), 10);
  
  // Calculate X & Y coordinates for SVG Line
  const points = activityData.map((d, index) => {
    const x = (index / (activityData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (d.value / maxVal) * (chartHeight - 40) - 20;
    return { x, y, label: d.label, val: d.value };
  });

  // SVG Line path string
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  // SVG Area gradient path string
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`;

  const cards = [
    { title: 'Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100/50' },
    { title: 'Connaissances RAG', value: `${stats.knowledgeChunks} Chunks`, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100/50' },
    { title: 'Taux de Résolution', value: `${stats.resolutionRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border border-green-100/50' },
    { title: 'Escalades Humaines', value: stats.escalatedCount, icon: Users, color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100/50' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ISETAG AI Analytics</h1>
          <p className="text-slate-500">Performances en temps réel du chatbot de l'université</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-semibold text-sm border border-emerald-100/60 shadow-sm animate-pulse">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
          Système Live
        </div>
      </header>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="glass p-6 rounded-3xl flex items-center space-x-5 hover:shadow-lg hover:scale-[1.02] active:scale-98 transition-all duration-300">
            <div className={`p-4 rounded-2xl ${card.bg} ${card.color}`}>
              <card.icon size={26} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SVG Live Activity Curve */}
        <div className="glass p-8 rounded-3xl lg:col-span-2 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" />
                Activité Hebdomadaire
              </h3>
              <p className="text-xs text-slate-400">Volume de messages échangés sur 7 jours</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">Messages</span>
          </div>

          <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden">
            {/* SVG Interactive Chart */}
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="20" y1="40" x2={chartWidth - 20} y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="20" y1="80" x2={chartWidth - 20} y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="20" y1="120" x2={chartWidth - 20} y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

              {/* Area path */}
              <path d={areaPath} fill="url(#areaGrad)" />
              
              {/* Line path */}
              <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

              {/* Circular Dots & Values */}
              {points.map((p, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="hover:r-7 transition-all duration-150" />
                  {/* Tooltip on circle hover */}
                  <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-bold fill-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1">
                    {p.val}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between px-5 mt-4 text-xs font-bold text-slate-400">
            {points.map((p, idx) => (
              <span key={idx}>{p.label}</span>
            ))}
          </div>
        </div>

        {/* Right Panel: Languages & Topics */}
        <div className="space-y-8 flex flex-col justify-between">
          
          {/* Languages distribution */}
          <div className="glass p-6 rounded-3xl flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                <Globe size={18} className="text-purple-500" />
                Langues Utilisées
              </h3>
              <p className="text-xs text-slate-400">Préférence linguistique des étudiants</p>
            </div>

            <div className="space-y-4 my-6">
              {languageData.map((lang, index) => {
                const total = languageData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = total > 0 ? (lang.value / total) * 100 : 0;
                const colors = index === 0 ? ['bg-purple-500', 'from-purple-500/20'] : ['bg-blue-500', 'from-blue-500/20'];
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{lang.label}</span>
                      <span>{percent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[0]} rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Knowledge categories distribution */}
          <div className="glass p-6 rounded-3xl flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                <BarChart2 size={18} className="text-emerald-500" />
                Catégories de Connaissance
              </h3>
              <p className="text-xs text-slate-400">Répartition des fiches dans la base RAG</p>
            </div>

            <div className="space-y-3 mt-4 flex-1 flex flex-col justify-center">
              {categoryData.slice(0, 4).map((cat, idx) => {
                const total = categoryData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = total > 0 ? (cat.value / total) * 100 : 0;
                const progressColors = [
                  'bg-emerald-500',
                  'bg-blue-500',
                  'bg-amber-500',
                  'bg-purple-500'
                ];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span className="truncate max-w-[140px]" title={cat.label}>{cat.label}</span>
                      <span>{cat.value} fiches ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${progressColors[idx % progressColors.length]} rounded-full`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
