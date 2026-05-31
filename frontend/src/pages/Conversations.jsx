import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, AlertCircle, User, Send, CheckCircle, Search, RefreshCw } from 'lucide-react';

const statusBadge = (status) => {
  if (status === 'escalated') return 'badge-red';
  if (status === 'active')    return 'badge-green';
  return 'badge-yellow';
};

const Conversations = () => {
  const [convos, setConvos]               = useState([]);
  const [filter, setFilter]               = useState('all');
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedId, setSelectedId]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [replyText, setReplyText]         = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConvos = async (silent = false) => {
    try {
      const res = await axios.get('/api/admin/conversations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConvos(res.data);
    } catch (err) { console.error('Failed to load conversations:', err.message); }
  };

  const fetchMessages = async (id, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await axios.get(`/api/admin/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(res.data);
    } catch (err) { console.error('Failed to load messages:', err.message); }
    finally { if (!silent) setLoadingMessages(false); }
  };

  useEffect(() => {
    fetchConvos();
    const interval = setInterval(() => {
      fetchConvos(true);
      if (selectedId) fetchMessages(selectedId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConvo = (id) => { setSelectedId(id); fetchMessages(id); };

  const handleResolve = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.post(`/api/admin/conversations/${id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchConvos();
      if (selectedId === id) fetchMessages(id);
    } catch (err) { console.error('Failed to resolve:', err.message); }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending || !selectedId) return;
    setSending(true);
    const textToSend = replyText;
    setReplyText('');
    try {
      await axios.post(`/api/admin/conversations/${selectedId}/reply`, { text: textToSend }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: textToSend, created_at: new Date() }]);
      fetchConvos(true);
    } catch (err) {
      console.error('Failed to send:', err.response?.data || err.message);
      const serverError = err.response?.data?.error;
      alert(`Erreur lors de l'envoi du message.\n${serverError ? 'Détail: ' + serverError : ''}`);
    } finally { setSending(false); }
  };

  const selectedConvo = convos.find(c => c.id === selectedId);
  const filteredConvos = convos.filter(c => {
    const match = c.user_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.last_message?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!match) return false;
    if (filter === 'escalated') return c.status === 'escalated';
    if (filter === 'bot')       return c.status === 'active';
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--isetag-black)' }}>

      {/* ── Left: Conversation List ─────────────────── */}
      <div className="w-80 md:w-96 flex flex-col flex-shrink-0"
        style={{ background: 'var(--isetag-dark)', borderRight: '1px solid var(--isetag-border)' }}>

        <header className="p-5 pb-4 space-y-4" style={{ borderBottom: '1px solid var(--isetag-border)' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-brand">Conversations</h1>
            <button onClick={() => fetchConvos()} title="Rafraîchir"
              className="p-2 rounded-xl transition-all hover:bg-white/5 text-white/40 hover:text-white">
              <RefreshCw size={17} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="Rechercher un numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-dark pl-10 text-sm py-2.5"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { id: 'all',       label: 'Tous' },
              { id: 'escalated', label: '🚨 Escaladés' },
              { id: 'bot',       label: '🤖 Bot' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={filter === f.id
                  ? { background: 'var(--isetag-yellow)', color: 'var(--isetag-black)' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
                }>
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--isetag-border)' }}>
          {filteredConvos.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune discussion trouvée</p>
            </div>
          ) : (
            filteredConvos.map(c => {
              const isActive = c.id === selectedId;
              return (
                <div key={c.id} onClick={() => handleSelectConvo(c.id)}
                  className="p-4 flex items-center justify-between cursor-pointer transition-all"
                  style={{
                    background: isActive ? 'rgba(234,231,74,0.05)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--isetag-yellow)' : '3px solid transparent',
                  }}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      c.status === 'escalated' ? 'animate-pulse' : ''
                    }`} style={{
                      background: c.status === 'escalated' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.07)',
                      color: c.status === 'escalated' ? '#f87171' : 'rgba(255,255,255,0.4)',
                    }}>
                      <User size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-white truncate">{c.user_phone}</p>
                      <p className="text-xs truncate max-w-[160px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {c.last_message || 'Aucun message'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={statusBadge(c.status)}>{c.status}</span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(c.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat Panel ──────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--isetag-black)' }}>
        {selectedId ? (
          <>
            {/* Chat header */}
            <header className="p-4 flex items-center justify-between flex-shrink-0 shadow-lg"
              style={{ background: 'var(--isetag-dark)', borderBottom: '1px solid var(--isetag-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{
                    background: selectedConvo?.status === 'escalated' ? 'rgba(248,113,113,0.15)' : 'rgba(234,231,74,0.1)',
                    color: selectedConvo?.status === 'escalated' ? '#f87171' : 'var(--isetag-yellow)',
                  }}>
                  <User size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white">{selectedConvo?.user_phone}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={statusBadge(selectedConvo?.status)}>{selectedConvo?.status}</span>
                    {selectedConvo?.status === 'escalated' ? (
                      <span className="text-xs font-bold flex items-center gap-1" style={{ color: '#f87171' }}>
                        <AlertCircle size={11} /> Prise en main humaine requise
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>L'IA gère la discussion</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedConvo?.status === 'escalated' ? (
                <button onClick={(e) => handleResolve(selectedConvo.id, e)}
                  className="btn-green px-4 py-2 text-xs flex items-center gap-1.5 rounded-xl">
                  <CheckCircle size={14} /> Réengager le Bot
                </button>
              ) : (
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                  Mode Automatique
                </span>
              )}
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ background: 'rgba(255,255,255,0.01)' }}>
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <RefreshCw className="animate-spin mr-2" size={18} /> Chargement...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Aucun message dans cette discussion.
                </div>
              ) : (
                messages.map((m, index) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={index} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[70%] p-4 rounded-3xl text-sm shadow-lg"
                        style={isUser
                          ? { background: 'var(--isetag-panel)', border: '1px solid var(--isetag-border)', color: 'rgba(255,255,255,0.85)', borderTopLeftRadius: 4 }
                          : { background: 'linear-gradient(135deg, var(--isetag-yellow), var(--isetag-yellow-dk))', color: 'var(--isetag-black)', borderTopRightRadius: 4 }
                        }>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        <p className="text-[10px] mt-1.5 text-right opacity-50">
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <form onSubmit={handleSendReply} className="p-4 flex gap-3 flex-shrink-0"
              style={{ background: 'var(--isetag-dark)', borderTop: '1px solid var(--isetag-border)' }}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={selectedConvo?.status === 'escalated' ? "Répondre manuellement (WhatsApp)..." : "Tapez un message pour prendre la main..."}
                className="input-dark flex-1 text-sm"
              />
              <button type="submit" disabled={sending || !replyText.trim()}
                className="btn-yellow p-3.5 rounded-2xl disabled:opacity-40 flex items-center justify-center flex-shrink-0">
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-bounce"
              style={{ background: 'rgba(234,231,74,0.08)', border: '1px solid rgba(234,231,74,0.15)' }}>
              <MessageSquare size={36} style={{ color: 'var(--isetag-yellow)' }} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Console de Live Chat</h3>
            <p className="text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Sélectionnez un étudiant dans la liste pour lire sa conversation, réengager le bot ou répondre manuellement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;
