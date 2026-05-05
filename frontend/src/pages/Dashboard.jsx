import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, BookOpen, MessageSquare, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalConversations: 0,
    escalatedCount: 0,
    knowledgeChunks: 0,
    resolutionRate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/admin/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch stats');
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'Total Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Knowledge Base', value: `${stats.knowledgeChunks} Chunks`, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Resolution Rate', value: `${stats.resolutionRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Escalations', value: stats.escalatedCount, icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-800">ISETAG AI Analytics</h1>
        <p className="text-slate-500">Real-time performance of your V2 Chatbot</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="glass p-6 rounded-2xl flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-2xl h-80 flex items-center justify-center">
          <p className="text-slate-400">Activity Chart Placeholder</p>
        </div>
        <div className="glass p-8 rounded-2xl h-80 flex items-center justify-center">
          <p className="text-slate-400">Topic Distribution Placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
