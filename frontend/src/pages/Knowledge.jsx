import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Search, Database, Trash2, Edit } from 'lucide-react';

const Knowledge = () => {
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState([]);

  const fetchSources = async () => {
    try {
      const res = await axios.get('/api/admin/knowledge', {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      setSources(res.data);
    } catch (err) {
      console.error('Failed to fetch knowledge sources:', err.message);
    }
  };

  React.useEffect(() => {
    fetchSources();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
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
      setMessage('✅ Document processed and vectorized!');
      setFile(null);
      fetchSources();
    } catch (err) {
      setMessage('❌ Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!rawText) return;

    setUploading(true);
    try {
      await axios.post('/api/admin/knowledge/text', {
        text: rawText,
        title: title || 'Manual Entry',
        category: 'general'
      }, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      setMessage('✅ Manual text stored and vectorized!');
      setRawText('');
      setTitle('');
      fetchSources();
    } catch (err) {
      setMessage('❌ Failed to save text: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClearKnowledge = async () => {
    if (!window.confirm("⚠️ Es-tu sûr de vouloir vider le cerveau du bot ? Tous les flyers et PDF anciens seront supprimés.")) return;
    
    setUploading(true);
    try {
      await axios.delete('/api/admin/knowledge', {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      setMessage('🗑️ Cerveau vidé avec succès ! Le bot repart à zéro.');
      fetchSources();
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression : ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (sourceName) => {
    if (!window.confirm(`⚠️ Es-tu sûr de vouloir supprimer "${sourceName}" de la mémoire du bot ?`)) return;
    
    setUploading(true);
    try {
      await axios.delete(`/api/admin/knowledge/source?source=${encodeURIComponent(sourceName)}`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      setMessage(`🗑️ Document "${sourceName}" supprimé de la mémoire !`);
      fetchSources();
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression : ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditSource = async (sourceName) => {
    setUploading(true);
    try {
      const res = await axios.get(`/api/admin/knowledge/content?source=${encodeURIComponent(sourceName)}`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      setTitle(res.data.source);
      setRawText(res.data.text);
      setMessage(`✏️ "${sourceName}" chargé dans l'éditeur. Modifie le texte ci-dessus et clique sur Sauvegarder pour le mettre à jour !`);
      
      window.scrollTo({ top: 150, behavior: 'smooth' });
    } catch (err) {
      setMessage('❌ Erreur de chargement : ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-10 text-center">
        <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
          <Database size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">Knowledge Management</h1>
        <p className="text-slate-500">Make the AI smarter by uploading files or pasting raw information</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* File Upload Section */}
        <div className="glass p-8 rounded-3xl flex flex-col h-full">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Upload size={20} className="text-blue-500" />
            Upload Documents
          </h2>
          <form onSubmit={handleUpload} className="space-y-6 flex-1 flex flex-col">
            <label className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-400 transition-colors">
              <Upload className="mb-4 text-slate-400" size={32} />
              <p className="text-slate-600 font-medium text-sm">
                {file ? file.name : 'Select PDF or TXT'}
              </p>
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => setFile(e.target.files[0])}
                accept=".pdf,.txt"
              />
            </label>

            <button
              type="submit"
              disabled={!file || uploading}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${
                uploading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {uploading ? 'Syncing...' : 'Upload File'}
            </button>
          </form>
        </div>

        {/* Raw Text Section */}
        <div className="glass p-8 rounded-3xl flex flex-col h-full">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <FileText size={20} className="text-purple-500" />
            Paste Raw Information
          </h2>
          <form onSubmit={handleTextSubmit} className="space-y-4 flex-1 flex flex-col">
            <input 
              type="text" 
              placeholder="Title (e.g. Admission Rates 2026)" 
              className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-purple-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea 
              placeholder="Paste all the details here..." 
              className="w-full flex-1 p-4 rounded-xl border border-slate-200 outline-none focus:border-purple-400 resize-none min-h-[200px]"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!rawText || uploading}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${
                uploading ? 'bg-slate-400' : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
              }`}
            >
              {uploading ? 'Syncing...' : 'Save Text Information'}
            </button>
          </form>
        </div>
      </div>

      {message && (
        <div className="mt-8 p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-medium text-center animate-bounce">
          {message}
        </div>
      )}

      {/* Current Knowledge Base List */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Database size={24} className="text-blue-600" />
          Cerveau Actuel (Base de connaissances)
        </h3>

        {sources.length === 0 ? (
          <div className="glass p-8 rounded-3xl text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucun document dans la mémoire. Le bot est vide.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src, index) => (
              <div key={index} className="glass p-5 rounded-2xl flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-slate-800 text-sm truncate" title={src.source}>
                      {src.source}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {src.chunks} morceaux • {src.category}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditSource(src.source)}
                    disabled={uploading}
                    className="p-2.5 bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-600 rounded-xl transition-all"
                    title="Modifier le contenu de ce document"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSource(src.source)}
                    disabled={uploading}
                    className="p-2.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-500 rounded-xl transition-all"
                    title="Supprimer ce document de la mémoire"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Clear Knowledge Base */}
      <div className="mt-12 glass p-8 rounded-3xl border border-red-200 bg-red-50/10 text-center">
        <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center justify-center gap-2">
          <Trash2 size={20} />
          Danger Zone
        </h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
          Si l'IA commence à dire des choses floues ou fausses, c'est que les anciens fichiers PDF ou images corrompent sa mémoire. Tu peux tout effacer ci-dessous pour recommencer sur une base propre.
        </p>
        <button
          onClick={handleClearKnowledge}
          disabled={uploading}
          className="px-6 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 active:scale-95 text-white shadow-lg shadow-red-200 transition-all"
        >
          {uploading ? 'Nettoyage en cours...' : 'Vider le Cerveau du Bot'}
        </button>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl flex items-center space-x-4">
          <FileText className="text-blue-500" />
          <div>
            <h4 className="font-bold">Gemini-Embedding-2</h4>
            <p className="text-xs text-slate-400">768-dimensional vectors</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center space-x-4">
          <Search className="text-purple-500" />
          <div>
            <h4 className="font-bold">Semantic Search</h4>
            <p className="text-xs text-slate-400">Cosine similarity matching</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Knowledge;
