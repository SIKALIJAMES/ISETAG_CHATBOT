import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, AlertCircle, Clock, User } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    active: 'bg-green-100 text-green-700',
    escalated: 'bg-red-100 text-red-700',
    bot: 'bg-blue-100 text-blue-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

const Conversations = () => {
  const [convos, setConvos] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/admin/conversations', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setConvos(res.data);
      } catch (err) {
        console.error('Failed to load conversations');
      }
    };
    fetch();
  }, []);

  const filtered = convos.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'escalated') return c.status === 'escalated';
    if (filter === 'today') {
      const today = new Date().toDateString();
      return new Date(c.updated_at).toDateString() === today;
    }
    return true;
  });

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Conversations</h1>
        <p className="text-slate-500">{convos.length} total conversations tracked</p>
      </header>

      {/* Filters */}
      <div className="flex gap-3 mb-8">
        {['all', 'escalated', 'today'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl font-semibold capitalize transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="glass p-16 rounded-2xl text-center text-slate-400">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p>No conversations found</p>
          </div>
        )}

        {filtered.map((c) => (
          <div key={c.id} className="glass p-6 rounded-2xl flex items-center justify-between hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  ...{c.user_phone?.slice(-6)}
                </p>
                <p className="text-sm text-slate-500 max-w-xs truncate">
                  {c.last_message || c.summary || 'No message'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${statusBadge(c.status)}`}>
                {c.status}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} />
                {new Date(c.updated_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Conversations;
