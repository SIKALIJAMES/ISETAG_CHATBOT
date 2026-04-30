import { useEffect, useState } from 'react'
import { statsAPI } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
} from 'recharts'

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ef4444']

const CustomTooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(71,85,105,0.5)',
  borderRadius: '12px',
  color: '#cbd5e1',
  fontSize: '12px',
}

export default function Analytics() {
  const [messagesData, setMessagesData] = useState([])
  const [topFaqs, setTopFaqs] = useState([])
  const [escalation, setEscalation] = useState(null)
  const [languages, setLanguages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      statsAPI.messagesPerDay(),
      statsAPI.topFaqs(),
      statsAPI.escalationRate(),
      statsAPI.languages(),
    ]).then(([msgs, faqs, esc, langs]) => {
      setMessagesData(msgs.data.data.map(d => ({
        date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        Entrants: parseInt(d.incoming) || 0,
        Sortants: parseInt(d.outgoing) || 0,
      })))
      setTopFaqs(faqs.data.faqs.map(f => ({
        name: f.question?.slice(0, 35) + '...',
        Correspondances: parseInt(f.match_count) || 0,
        category: f.category,
      })))
      setEscalation([
        { name: 'Bot', value: esc.data.bot_handled, color: '#3b82f6' },
        { name: 'Escaladée', value: esc.data.escalated, color: '#ef4444' },
        { name: 'Fermée', value: esc.data.closed, color: '#10b981' },
      ])
      setLanguages(langs.data.languages.map(l => ({
        name: l.lang_detected === 'en' ? '🇬🇧 Anglais' : '🇫🇷 Français',
        value: parseInt(l.count) || 0,
      })))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytiques</h1>
        <p className="text-slate-400 text-sm mt-1">Statistiques des 30 derniers jours</p>
      </div>

      {/* Messages per day */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-5">📈 Messages par jour (14 jours)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={messagesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={CustomTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            <Area type="monotone" dataKey="Entrants" stroke="#3b82f6" fill="url(#colorIn)" strokeWidth={2} />
            <Area type="monotone" dataKey="Sortants" stroke="#f97316" fill="url(#colorOut)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top FAQs */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-5">🏆 FAQs les plus consultées</h2>
          {topFaqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
              <span className="text-2xl">📭</span>
              <span className="text-sm">Pas encore de données</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topFaqs} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={140} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="Correspondances" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut chart */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-5">🍩 Répartition des conversations</h2>
          {!escalation || escalation.every(e => e.value === 0) ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
              <span className="text-2xl">📭</span>
              <span className="text-sm">Pas encore de données</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={escalation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {escalation.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Legend
                  formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Language breakdown */}
      {languages.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">🌐 Répartition par langue</h2>
          <div className="flex flex-wrap gap-4">
            {languages.map((lang, i) => {
              const total = languages.reduce((s, l) => s + l.value, 0)
              const pct = total > 0 ? Math.round((lang.value / total) * 100) : 0
              return (
                <div key={i} className="flex-1 min-w-40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{lang.name}</span>
                    <span className="text-sm font-bold text-slate-200">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{lang.value} conversations</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
