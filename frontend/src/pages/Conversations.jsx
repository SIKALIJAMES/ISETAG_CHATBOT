import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, AlertCircle, Clock, User, Send, CheckCircle, Search, RefreshCw } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    active: 'bg-green-100 text-green-700 border border-green-200',
    escalated: 'bg-red-100 text-red-700 border border-red-200',
    bot: 'bg-blue-100 text-blue-700 border border-blue-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

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

  const fetchConvos = async (silent = false) => {
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

  // Poll conversations and active chat messages
  useEffect(() => {
    fetchConvos();
    const interval = setInterval(() => {
      fetchConvos(true);
      if (selectedId) {
        fetchMessages(selectedId, true);
      }
    }, 4000); // Poll every 4 seconds for a live chat feel

    return () => clearInterval(interval);
  }, [selectedId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConvo = (id) => {
    setSelectedId(id);
    fetchMessages(id);
  };

  const handleResolve = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.post(`/api/admin/conversations/${id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchConvos();
      // If resolving the active convo, reload messages to see system update
      if (selectedId === id) {
        fetchMessages(id);
      }
    } catch (err) {
      console.error('Failed to resolve conversation:', err.message);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending || !selectedId) return;

    setSending(true);
    const textToSend = replyText;
    setReplyText(''); // Clear instantly for responsiveness

    try {
      await axios.post(`/api/admin/conversations/${selectedId}/reply`, {
        text: textToSend
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Append manually for instant visual feedback
      setMessages(prev => [...prev, { role: 'assistant', content: textToSend, created_at: new Date() }]);
      fetchConvos(true);
    } catch (err) {
      console.error('Failed to send reply:', err.message);
      alert('Erreur lors de l\'envoi du message.');
    } finally {
      setSending(false);
    }
  };

  const selectedConvo = convos.find(c => c.id === selectedId);

  // Filter conversations
  const filteredConvos = convos.filter(c => {
    const matchesSearch = c.user_phone?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.last_message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'escalated') return c.status === 'escalated';
    if (filter === 'bot') return c.status === 'bot' || c.status === 'active';
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      
      {/* LEFT COLUMN: Conversation List */}
      <div className="w-80 md:w-96 flex flex-col border-r border-slate-200 bg-white flex-shrink-0">
        <header className="p-6 pb-4 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Messages</h1>
            <button 
              onClick={() => fetchConvos()} 
              className="p-2 hover:bg-slate-100 rounded-xl active:scale-95 transition-all text-slate-500"
              title="Rafraîchir"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filter badges */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'escalated', label: '🚨 Escaladés' },
              { id: 'bot', label: '🤖 Bot' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === f.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConvos.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune discussion trouvée</p>
            </div>
          ) : (
            filteredConvos.map((c) => {
              const isActive = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectConvo(c.id)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-all duration-150 ${
                    isActive ? 'bg-blue-50/55 border-l-4 border-blue-600' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      c.status === 'escalated' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <User size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-800 text-sm">
                        {c.user_phone}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[160px] md:max-w-[200px]">
                        {c.last_message || 'Pas de message'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${statusBadge(c.status)}`}>
                      {c.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        {selectedId ? (
          <>
            {/* Active chat header */}
            <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  selectedConvo?.status === 'escalated' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <User size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedConvo?.user_phone}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusBadge(selectedConvo?.status)}`}>
                      {selectedConvo?.status}
                    </span>
                    {selectedConvo?.status === 'escalated' ? (
                      <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle size={12} /> Prise en main humaine requise
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        L'IA gère la discussion
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div>
                {selectedConvo?.status === 'escalated' ? (
                  <button
                    onClick={(e) => handleResolve(selectedConvo.id, e)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Réengager le Bot
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                    Mode Automatique
                  </span>
                )}
              </div>
            </header>

            {/* Scrollable messages area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100/35">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <RefreshCw className="animate-spin mr-2" size={20} />
                  Chargement des messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Aucun message dans cette discussion.
                </div>
              ) : (
                messages.map((m, index) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={index} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] p-4 rounded-3xl text-sm shadow-sm ${
                        isUser 
                          ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/50' 
                          : 'bg-blue-600 text-white rounded-tr-none'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        <p className={`text-[10px] mt-1.5 text-right ${isUser ? 'text-slate-400' : 'text-blue-100'}`}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom input area */}
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex-shrink-0 flex gap-3 shadow-md">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={selectedConvo?.status === 'escalated' ? "Répondre manuellement à l'étudiant (WhatsApp)..." : "Le bot est actif. Tapez un message pour prendre la main..."}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl transition-all shadow-md shadow-blue-100 disabled:opacity-40 flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <MessageSquare size={64} className="opacity-20 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Console de Live Chat</h3>
            <p className="text-sm text-slate-400 text-center max-w-sm">
              Sélectionnez un étudiant dans la liste de gauche pour lire sa conversation, réengager le bot, ou prendre la main manuellement.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Conversations;
