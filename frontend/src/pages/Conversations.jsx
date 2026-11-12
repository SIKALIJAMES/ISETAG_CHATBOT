import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Search, Send, RefreshCw, User, CheckCircle2 } from 'lucide-react';

const Conversations = () => {
  const [convos, setConvos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConvos = async () => {
    try {
      const res = await axios.get('/api/admin/conversations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConvos(res.data);
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
    }
  };

  const fetchMessages = async (id, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await axios.get(`/api/admin/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages:', err.message);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConvos();
    const interval = setInterval(() => {
      fetchConvos();
      if (selectedId) fetchMessages(selectedId, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConvo = (id) => {
    setSelectedId(id);
    fetchMessages(id);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await axios.post(`/api/admin/conversations/${selectedId}/reply`, { text: replyText }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReplyText('');
      fetchMessages(selectedId);
      fetchConvos();
    } catch (err) {
      alert('Erreur d\'envoi : ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const selectedConvo = convos.find(c => c.id === selectedId);
  const filteredConvos = convos.filter(c => {
    const s = searchTerm.toLowerCase();
    const match = c.user_phone?.toLowerCase().includes(s) ||
                  c.last_message?.toLowerCase().includes(s) ||
                  c.prospect_name?.toLowerCase().includes(s);
    if (!match) return false;
    if (filter === 'escalated') return c.status === 'escalated';
    if (filter === 'bot') return c.status === 'active';
    return true;
  });

  return (
    <div className="h-[calc(100vh-5rem)] flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151921] shadow-xs">
      
      {/* ── Colonne Gauche : Liste des Discussions ────────── */}
      <div className="w-80 sm:w-88 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13161D]">
        
        {/* Header Recherche & Filtres */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Conversations ({filteredConvos.length})
            </h2>
            <button
              onClick={fetchConvos}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Actualiser"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0E1117] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Onglets Filtres */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'bot', label: 'IA Active' },
              { id: 'escalated', label: 'À traiter' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des discussions */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredConvos.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Aucune conversation trouvée
            </div>
          ) : (
            filteredConvos.map(c => {
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectConvo(c.id)}
                  className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-[#E5B80B]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {c.prospect_name ? c.prospect_name.charAt(0).toUpperCase() : <User size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {c.prospect_name ? `${c.prospect_name}` : `+${c.user_phone}`}
                      </p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'escalated'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}>
                        {c.status === 'escalated' ? 'Escalade' : 'En cours'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {c.last_message || 'Nouvelle conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Colonne Droite : Console Chat ───────────────── */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-[#0E1117]">
        {selectedConvo ? (
          <>
            {/* Header du Chat */}
            <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13161D] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedConvo.prospect_name || `+${selectedConvo.user_phone}`}</span>
                  {selectedConvo.prospect_name && (
                    <span className="text-[11px] text-slate-400 font-normal">(+{selectedConvo.user_phone})</span>
                  )}
                </h3>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {selectedConvo.status === 'escalated' ? 'Conseiller requis' : 'Orientation gérée par le bot'}
                </p>
              </div>
            </div>

            {/* Zone des messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center p-8 text-xs text-slate-400">
                  Chargement des messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center p-8 text-xs text-slate-400">
                  Aucun message enregistré dans cette discussion.
                </div>
              ) : (
                messages.map((m, i) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#E5B80B] text-slate-900 font-medium rounded-tr-none'
                          : 'bg-white dark:bg-[#181C25] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-xs'
                      }`}>
                        <div className="whitespace-pre-line">{m.content}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie d'intervention manuelle */}
            <form onSubmit={handleSendReply} className="p-3 bg-white dark:bg-[#13161D] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Répondre manuellement au prospect via WhatsApp..."
                className="flex-1 px-3.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0E1117] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="btn-primary-isetag py-2 px-3.5 text-xs disabled:opacity-40"
              >
                <span>Envoyer</span>
                <Send size={12} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <MessageSquare size={18} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Console d'échange WhatsApp
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Sélectionnez une discussion dans la colonne de gauche pour consulter l'historique ou répondre au candidat.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Conversations;