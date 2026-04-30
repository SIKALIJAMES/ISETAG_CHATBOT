import { useEffect, useState } from 'react'
import { statsAPI } from '../api/client'

function KPICard({ title, value, sub, icon, color }) {
  return (
    <div className="kpi-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-slate-100 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    statsAPI.overview()
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-red-400 text-center">
        ⚠️ {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Tableau de Bord</h1>
        <p className="text-slate-400 text-sm mt-1">Vue d'ensemble du chatbot ISETAG</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Messages aujourd'hui"
          value={stats?.today_messages ?? 0}
          sub="Messages reçus depuis minuit"
          color="bg-primary-500/20"
          icon={
            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <KPICard
          title="Conversations actives"
          value={stats?.active_conversations ?? 0}
          sub="Sessions bot en cours"
          color="bg-emerald-500/20"
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KPICard
          title="Escalades (7 jours)"
          value={stats?.escalations_week ?? 0}
          sub="Transmissions à un conseiller"
          color="bg-red-500/20"
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <KPICard
          title="Taux de réponse FAQ"
          value={`${stats?.faq_match_rate ?? 0}%`}
          sub={`${stats?.total_faqs_active ?? 0} FAQs actives`}
          color="bg-accent-500/20"
          icon={
            <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
      </div>

      {/* Info banner */}
      <div className="glass-card p-5 border-l-4 border-primary-500">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-200">ISETAG Chatbot V1 — Mode Sandbox</p>
            <p className="text-xs text-slate-400 mt-1">
              Le bot fonctionne en mode sandbox Meta WhatsApp. Jusqu'à 5 numéros test peuvent interagir.
              Configurez votre webhook avec ngrok pour le développement local.
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a href="/faqs" className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors group">
            <span className="text-2xl">📋</span>
            <div>
              <div className="text-sm font-medium text-slate-200 group-hover:text-primary-300 transition-colors">Gérer les FAQs</div>
              <div className="text-xs text-slate-500">Ajouter / modifier des réponses</div>
            </div>
          </a>
          <a href="/conversations" className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors group">
            <span className="text-2xl">💬</span>
            <div>
              <div className="text-sm font-medium text-slate-200 group-hover:text-primary-300 transition-colors">Voir les conversations</div>
              <div className="text-xs text-slate-500">Escalades et historiques</div>
            </div>
          </a>
          <a href="/analytics" className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors group">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-sm font-medium text-slate-200 group-hover:text-primary-300 transition-colors">Analytiques</div>
              <div className="text-xs text-slate-500">Graphiques et statistiques</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
