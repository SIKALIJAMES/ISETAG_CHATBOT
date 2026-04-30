import { useEffect, useState, useCallback } from 'react'
import { faqsAPI } from '../api/client'

const CATEGORIES = ['admission', 'frais', 'filieres', 'dates', 'contacts']
const LANGS = ['fr', 'en']

function FAQModal({ faq, onClose, onSaved }) {
  const [form, setForm] = useState({
    category: faq?.category || 'admission',
    lang: faq?.lang || 'fr',
    keywords: faq?.keywords?.join(', ') || '',
    question: faq?.question || '',
    answer: faq?.answer || '',
    is_active: faq?.is_active !== false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        keywords: form.keywords
          .split(',')
          .map(k => k.trim())
          .filter(Boolean),
      }
      if (faq?.id) {
        await faqsAPI.update(faq.id, payload)
      } else {
        await faqsAPI.create(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg glass-card p-6 animate-slide-up shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            {faq?.id ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Catégorie</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-field capitalize"
                required
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Langue</label>
              <select
                value={form.lang}
                onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}
                className="input-field"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Mots-clés <span className="text-slate-600">(séparés par des virgules)</span>
            </label>
            <input
              type="text"
              value={form.keywords}
              onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
              placeholder="inscription, dossier, candidature"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Question</label>
            <input
              type="text"
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="Comment s'inscrire à ISETAG ?"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Réponse</label>
            <textarea
              value={form.answer}
              onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              placeholder="Pour vous inscrire..."
              rows={4}
              className="input-field resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-slate-400">{form.is_active ? 'Active' : 'Inactive'}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {faq?.id ? 'Mettre à jour' : 'Créer la FAQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CATEGORY_BADGES = {
  admission: 'badge-blue',
  frais: 'badge-orange',
  filieres: 'badge-green',
  dates: 'badge-slate',
  contacts: 'badge-slate',
}

export default function FAQs() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', lang: '', active: '' })
  const [showModal, setShowModal] = useState(false)
  const [editFaq, setEditFaq] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const loadFAQs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.category) params.category = filters.category
      if (filters.lang) params.lang = filters.lang
      if (filters.active !== '') params.active = filters.active
      const res = await faqsAPI.list(params)
      setFaqs(res.data.faqs)
    } catch (err) {
      console.error('Failed to load FAQs:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadFAQs() }, [loadFAQs])

  const handleToggle = async (id) => {
    try {
      await faqsAPI.toggle(id)
      setFaqs(prev => prev.map(f => f.id === id ? { ...f, is_active: !f.is_active } : f))
    } catch {}
  }

  const handleDelete = async (id) => {
    try {
      await faqsAPI.delete(id)
      setFaqs(prev => prev.filter(f => f.id !== id))
      setDeleteConfirm(null)
    } catch {}
  }

  return (
    <div className="space-y-6">
      {(showModal || editFaq) && (
        <FAQModal
          faq={editFaq}
          onClose={() => { setShowModal(false); setEditFaq(null) }}
          onSaved={loadFAQs}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full animate-slide-up shadow-2xl shadow-black/60">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-slate-400 mb-6">Cette FAQ sera supprimée définitivement. Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Gestion des FAQs</h1>
          <p className="text-slate-400 text-sm mt-1">{faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} trouvée{faqs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditFaq(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle FAQ
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select
          value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          className="input-field w-auto text-sm"
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <select
          value={filters.lang}
          onChange={e => setFilters(f => ({ ...f, lang: e.target.value }))}
          className="input-field w-auto text-sm"
        >
          <option value="">Toutes les langues</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="en">🇬🇧 English</option>
        </select>
        <select
          value={filters.active}
          onChange={e => setFilters(f => ({ ...f, active: e.target.value }))}
          className="input-field w-auto text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actives</option>
          <option value="false">Inactives</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
            <span className="text-3xl">📭</span>
            <span className="text-sm">Aucune FAQ trouvée</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800/60">
                <tr>
                  <th className="table-header text-left">Catégorie</th>
                  <th className="table-header text-left">Question</th>
                  <th className="table-header text-left hidden md:table-cell">Mots-clés</th>
                  <th className="table-header text-center">Statut</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map(faq => (
                  <tr key={faq.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${CATEGORY_BADGES[faq.category] || 'badge-slate'} capitalize`}>{faq.category}</span>
                        <span className="text-xs text-slate-600">{faq.lang === 'en' ? '🇬🇧' : '🇫🇷'}</span>
                      </div>
                    </td>
                    <td className="table-cell max-w-xs">
                      <p className="truncate text-slate-200">{faq.question}</p>
                      <p className="truncate text-xs text-slate-500 mt-0.5">{faq.answer?.slice(0, 60)}...</p>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(faq.keywords || []).slice(0, 3).map(kw => (
                          <span key={kw} className="badge badge-slate text-xs">{kw}</span>
                        ))}
                        {(faq.keywords || []).length > 3 && (
                          <span className="text-xs text-slate-600">+{faq.keywords.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <button onClick={() => handleToggle(faq.id)}>
                        <span className={`badge ${faq.is_active ? 'badge-green' : 'badge-slate'}`}>
                          {faq.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditFaq(faq); setShowModal(true) }}
                          className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(faq.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
