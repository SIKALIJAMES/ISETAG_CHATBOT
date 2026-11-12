import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Database, Trash2, Edit3, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const Knowledge = () => {
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [sources, setSources] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await axios.get('/api/admin/knowledge', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSources(res.data);
    } catch (err) {
      console.error('Failed to fetch knowledge:', err.message);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setStatusMsg({ type: '', text: '' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'general');

    try {
      await axios.post('/api/admin/knowledge/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStatusMsg({ type: 'success', text: 'Document importé et vectorisé avec succès.' });
      setFile(null);
      fetchSources();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Échec de l\'importation : ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    setUploading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      await axios.post('/api/admin/knowledge/text', {
        text: rawText,
        title: title || 'Fiche d\'information',
        category: 'general'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStatusMsg({ type: 'success', text: 'Information enregistrée dans la mémoire du chatbot.' });
      setRawText('');
      setTitle('');
      fetchSources();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Erreur d\'enregistrement : ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (sourceName) => {
    if (!window.confirm(`Supprimer définitivement "${sourceName}" de la mémoire du bot ?`)) return;
    try {
      await axios.delete(`/api/admin/knowledge/source?source=${encodeURIComponent(sourceName)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchSources();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const handleEditSource = async (sourceName) => {
    try {
      const res = await axios.get(`/api/admin/knowledge/content?source=${encodeURIComponent(sourceName)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTitle(res.data.source);
      setRawText(res.data.text);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Erreur lors de la récupération : ' + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* En-tête */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Base Documentaire & Informations Officielles
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Documents officiels (brochures, frais, filières) utilisés par le chatbot pour renseigner les candidats
        </p>
      </div>

      {/* Message Statut */}
      {statusMsg.text && (
        <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Cartes d'Ajout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Formulaire 1 : Import Fichier */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Upload size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Importer un Document (PDF / TXT)</span>
            </h2>

            <form onSubmit={handleUpload} className="space-y-3">
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                }}
                className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101319] hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Upload size={22} className="text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
                  {file ? file.name : 'Cliquez ou glissez un fichier ici'}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">PDF ou fichier texte officiel</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full btn-primary-isetag py-2 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={14} />
                <span>{uploading ? 'Indexation en cours...' : 'Ajouter à la base documentaire'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Formulaire 2 : Fiche Manuelle */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <FileText size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Saisir une Information Directe</span>
            </h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la fiche (ex: Frais de scolarité Génie Logiciel 2026)"
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101319] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Collez ici les informations officielles, frais, conditions d'admission..."
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101319] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none"
            />
            <button
              type="submit"
              disabled={!rawText.trim() || uploading}
              className="w-full btn-green-isetag py-2 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus size={14} />
              <span>{uploading ? 'Enregistrement...' : 'Enregistrer cette fiche'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Liste des Documents Enregistrés */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Documents et Fiches Actives ({sources.length})
            </h3>
          </div>
          <button
            onClick={fetchSources}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {sources.map((s, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#101319] flex items-center justify-between gap-3 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <FileText size={15} className="text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {s.source}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {s.chunk_count} section(s) vectorisée(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                <button
                  onClick={() => handleEditSource(s.source)}
                  className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  title="Modifier"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDeleteSource(s.source)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Knowledge;