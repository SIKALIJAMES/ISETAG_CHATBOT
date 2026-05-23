import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Search, Database, Trash2, Edit, Plus } from 'lucide-react';

const Knowledge = () => {
  const [file, setFile]           = useState(null);
  const [rawText, setRawText]     = useState('');
  const [title, setTitle]         = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage]     = useState('');
  const [sources, setSources]     = useState([]);
  const [dragOver, setDragOver]   = useState(false);

  const fetchSources = async () => {
    try {
      const res = await axios.get('/api/admin/knowledge', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSources(res.data);
    } catch (err) { console.error('Failed to fetch knowledge sources:', err.message); }
  };

  React.useEffect(() => { fetchSources(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'general');
    try {
      await axios.post('/api/admin/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('✅ Document vectorisé avec succès !');
      setFile(null);
      fetchSources();
    } catch (err) { setMessage('❌ Échec du téléchargement : ' + err.message);
    } finally { setUploading(false); }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!rawText) return;
    setUploading(true);
    try {
      await axios.post('/api/admin/knowledge/text', {
        text: rawText, title: title || 'Entrée manuelle', category: 'general'
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setMessage('✅ Texte stocké et vectorisé !');
      setRawText(''); setTitle('');
      fetchSources();
    } catch (err) { setMessage('❌ Échec : ' + err.message);
    } finally { setUploading(false); }
  };

  const handleClearKnowledge = async () => {
    if (!window.confirm('⚠️ Vider toute la base de connaissances ? Cette action est irréversible.')) return;
    setUploading(true);
    try {
      await axios.delete('/api/admin/knowledge', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('🗑️ Base vidée. Le bot repart à zéro.');
      fetchSources();
    } catch (err) { setMessage('❌ Erreur : ' + err.message);
    } finally { setUploading(false); }
  };

  const handleDeleteSource = async (sourceName) => {
    if (!window.confirm(`⚠️ Supprimer "${sourceName}" de la mémoire ?`)) return;
    setUploading(true);
    try {
      await axios.delete(`/api/admin/knowledge/source?source=${encodeURIComponent(sourceName)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage(`🗑️ "${sourceName}" supprimé !`);
      fetchSources();
    } catch (err) { setMessage('❌ Erreur : ' + err.message);
    } finally { setUploading(false); }
  };

  const handleEditSource = async (sourceName) => {
    setUploading(true);
    try {
      const res = await axios.get(`/api/admin/knowledge/content?source=${encodeURIComponent(sourceName)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTitle(res.data.source);
      setRawText(res.data.text);
      setMessage(`✏️ "${sourceName}" chargé dans l'éditeur.`);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err) { setMessage('❌ Erreur : ' + err.message);
    } finally { setUploading(false); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-up">

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl" style={{ background: 'rgba(234,231,74,0.1)', border: '1px solid rgba(234,231,74,0.2)' }}>
            <Database size={28} style={{ color: 'var(--isetag-yellow)' }} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-brand">Base de Connaissances</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Enrichissez la mémoire du chatbot avec vos documents ISETAG
            </p>
          </div>
        </div>
      </header>

      {/* Upload panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">

        {/* File Upload */}
        <div className="glass rounded-3xl p-8 flex flex-col">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <Upload size={18} style={{ color: 'var(--isetag-yellow)' }} />
            Importer un Document
          </h2>
          <form onSubmit={handleUpload} className="space-y-5 flex-1 flex flex-col">
            <label
              className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl cursor-pointer transition-all duration-200"
              style={{
                border: `2px dashed ${dragOver ? 'var(--isetag-yellow)' : 'rgba(255,255,255,0.1)'}`,
                background: dragOver ? 'rgba(234,231,74,0.05)' : 'rgba(255,255,255,0.02)',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) setFile(dropped);
              }}
            >
              <div className="p-4 rounded-2xl mb-3" style={{ background: 'rgba(234,231,74,0.08)' }}>
                <Upload size={28} style={{ color: 'var(--isetag-yellow)' }} />
              </div>
              <p className="text-sm font-semibold text-white/60">
                {file ? file.name : 'Glissez ou cliquez pour sélectionner'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>PDF, TXT acceptés</p>
              <input type="file" className="hidden"
                onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.txt" />
            </label>
            <button type="submit" disabled={!file || uploading}
              className="btn-yellow w-full py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              {uploading
                ? <><span className="w-4 h-4 border-2 border-isetag-black/30 border-t-isetag-black rounded-full animate-spin" /> Traitement...</>
                : <><Plus size={16} /> Importer & Vectoriser</>
              }
            </button>
          </form>
        </div>

        {/* Raw Text */}
        <div className="glass rounded-3xl p-8 flex flex-col">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <FileText size={18} style={{ color: 'var(--isetag-green)' }} />
            Saisir du Texte Brut
          </h2>
          <form onSubmit={handleTextSubmit} className="space-y-4 flex-1 flex flex-col">
            <input
              type="text"
              placeholder="Titre (ex: Frais de scolarité 2026)"
              className="input-dark"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              placeholder="Collez ici toutes les informations à mémoriser..."
              className="input-dark flex-1 resize-none min-h-[180px]"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <button type="submit" disabled={!rawText || uploading}
              className="btn-green w-full py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              {uploading
                ? <><span className="w-4 h-4 border-2 border-isetag-black/30 border-t-isetag-black rounded-full animate-spin" /> Traitement...</>
                : <><Plus size={16} /> Sauvegarder & Vectoriser</>
              }
            </button>
          </form>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div className="mb-8 px-5 py-4 rounded-2xl text-sm font-medium text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--isetag-border)', color: 'rgba(255,255,255,0.75)' }}>
          {message}
        </div>
      )}

      {/* Knowledge source list */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
          <Search size={20} style={{ color: 'var(--isetag-green)' }} />
          Mémoire Actuelle
          {sources.length > 0 && (
            <span className="badge-green ml-2">{sources.length} source(s)</span>
          )}
        </h3>

        {sources.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <FileText size={48} className="mx-auto mb-4 opacity-20 text-white" />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Aucun document dans la mémoire. Le cerveau du bot est vide.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src, index) => (
              <div key={index} className="glass p-5 rounded-2xl flex items-center justify-between transition-all hover:border-white/15"
                style={{ borderColor: 'var(--isetag-border)' }}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 rounded-xl flex-shrink-0"
                    style={{ background: 'rgba(234,231,74,0.08)', border: '1px solid rgba(234,231,74,0.15)' }}>
                    <FileText size={18} style={{ color: 'var(--isetag-yellow)' }} />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-white text-sm truncate" title={src.source}>{src.source}</h4>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {src.chunks} morceaux · {src.category}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEditSource(src.source)} disabled={uploading}
                    className="p-2.5 rounded-xl transition-all active:scale-95"
                    style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}
                    title="Modifier">
                    <Edit size={15} />
                  </button>
                  <button onClick={() => handleDeleteSource(src.source)} disabled={uploading}
                    className="p-2.5 rounded-xl transition-all active:scale-95"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                    title="Supprimer">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="glass rounded-3xl p-8 text-center" style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(248,113,113,0.1)' }}>
            <Trash2 size={22} style={{ color: '#f87171' }} />
          </div>
        </div>
        <h3 className="text-base font-bold mb-2" style={{ color: '#f87171' }}>Zone Dangereuse</h3>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Si le bot dit des informations incorrectes, videz sa mémoire et recommencez avec des documents propres.
        </p>
        <button onClick={handleClearKnowledge} disabled={uploading}
          className="px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{ background: '#f87171', color: 'white' }}>
          {uploading ? 'Nettoyage...' : '🗑️ Vider toute la mémoire du bot'}
        </button>
      </div>
    </div>
  );
};

export default Knowledge;
