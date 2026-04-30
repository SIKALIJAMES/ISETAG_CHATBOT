import { useEffect, useState } from 'react'
import { conversationsAPI } from '../api/client'

const STATUS_BADGE = {
  bot: 'badge-blue',
  escalated: 'badge-red',
  closed: 'badge-slate',
}
const STATUS_LABEL = {
  bot: 'Bot',
  escalated: 'Escaladée',
  closed: 'Fermée',
}

function MessageBubble({ msg }) {
  const isIn = msg.direction === 'in'
  return (
    <div className={`flex ${isIn ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
        isIn
          ? 'bg-slate-700/60 text-slate-200 rounded-tl-sm'
          : 'bg-primary-600/80 text-white rounded-tr-sm'
      }`}>
        {msg.content}
        <div className={`text-xs mt-1 ${isIn ? 'text-slate-400' : 'text-primary-200'}`}>
          {new Date(msg.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {msg.msg_type === 'audio' && ' 🎤'}
          {msg.faq_matched_id && <span className="ml-1 opacity-75">• FAQ #{msg.faq_matched_id}</span>}
        </div>
      </div>
    </div>
  )
}

function ConversationDetail({ convId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    conversationsAPI.get(convId)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [convId])

  const handleClose = async () => {
    try {
      await conversationsAPI.close(convId)
      onClose(true)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="w-full max-w-lg glass-card animate-slide-up shadow-2xl shadow-black/60 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Conv. #{convId}</span>
              {data && <span className={`badge ${STATUS_BADGE[data.conversation?.status] || 'badge-slate'}`}>{STATUS_LABEL[data.conversation?.status] || data.conversation?.status}</span>}
            </div>
            {data && <p className="text-xs text-slate-500 mt-0.5">
              {data.conversation?.lang_detected === 'en' ? '🇬🇧 Anglais' : '🇫🇷 Français'} •
              Début {new Date(data.conversation?.created_at).toLocaleDateString('fr-FR')}
            </p>}
          </div>
          <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary if escalated */}
        {data?.conversation?.summary && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 shrink-0">
            <p className="text-xs text-red-400 font-medium mb-1">📝 Résumé de l'escalade</p>
            <p className="text-xs text-slate-300">{data.conversation.summary}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data?.messages?.length === 0 ? (
            <p className="text-center text-slate-500 text-sm">Aucun message</p>
          ) : (
            data?.messages?.map(msg => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </div>

        {/* Actions */}
        {data?.conversation?.status !== 'closed' && (
          <div className="p-4 border-t border-slate-800/60 shrink-0">
            <button onClick={handleClose} className="btn-secondary w-full text-sm">
              ✅ Marquer comme fermée (conseiller a répondu)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Conversations() {
  const [convs, setConvs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (filter) params.status = filter
      const res = await conversationsAPI.list(params)
      setConvs(res.data.conversations)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter, page])

  const handleDetailClose = (refresh) => {
    setSelectedId(null)
    if (refresh) load()
  }

  return (
    <div className="space-y-6">
      {selectedId && <ConversationDetail convId={selectedId} onClose={handleDetailClose} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Conversations</h1>
          <p className="text-slate-400 text-sm mt-1">{total} conversation{total !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex gap-2">
          {['', 'bot', 'escalated', 'closed'].map(s => (
            <button
              key={s || 'all'}
              onClick={() => { setFilter(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                filter === s
                  ? 'bg-primary-600/30 text-primary-300 border-primary-500/40'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-200'
              }`}
            >
              {s === '' ? 'Toutes' : STATUS_LABEL[s] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
            <span className="text-3xl">💬</span>
            <span className="text-sm">Aucune conversation trouvée</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800/60">
                <tr>
                  <th className="table-header text-left">ID</th>
                  <th className="table-header text-left">Utilisateur</th>
                  <th className="table-header text-left hidden sm:table-cell">Statut</th>
                  <th className="table-header text-left hidden md:table-cell">Langue</th>
                  <th className="table-header text-left hidden lg:table-cell">Messages</th>
                  <th className="table-header text-left hidden md:table-cell">Date</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {convs.map(conv => (
                  <tr
                    key={conv.id}
                    className={`table-row cursor-pointer ${conv.status === 'escalated' ? 'bg-red-500/5' : ''}`}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <td className="table-cell text-slate-500">#{conv.id}</td>
                    <td className="table-cell">
                      <span className="font-mono text-xs bg-slate-800/60 px-2 py-1 rounded text-slate-300">
                        {conv.user_phone_hash?.slice(0, 10)}...
                      </span>
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className={`badge ${STATUS_BADGE[conv.status] || 'badge-slate'}`}>
                        {conv.status === 'escalated' && '🚨 '}
                        {STATUS_LABEL[conv.status] || conv.status}
                      </span>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      {conv.lang_detected === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
                    </td>
                    <td className="table-cell hidden lg:table-cell text-slate-400">
                      {conv.message_count ?? 0}
                    </td>
                    <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                      {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell text-right">
                      <span className="text-xs text-primary-400 hover:text-primary-300 cursor-pointer">
                        Voir →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} sur {Math.ceil(total / LIMIT)}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
            >← Préc.</button>
            <button
              disabled={page >= Math.ceil(total / LIMIT)}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
            >Suiv. →</button>
          </div>
        </div>
      )}
    </div>
  )
}
