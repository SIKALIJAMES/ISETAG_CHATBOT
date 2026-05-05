import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Search, Database } from 'lucide-react';

const Knowledge = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'general');

    try {
      await axios.post('http://localhost:3000/api/admin/knowledge/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      setMessage('✅ Document processed and vectorized!');
      setFile(null);
    } catch (err) {
      setMessage('❌ Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10 text-center">
        <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
          <Database size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">Knowledge Management</h1>
        <p className="text-slate-500">Upload documents to make the AI smarter (RAG System)</p>
      </header>

      <div className="glass p-10 rounded-3xl text-center">
        <form onSubmit={handleUpload} className="space-y-6">
          <label className="block p-12 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-400 transition-colors">
            <Upload className="mx-auto mb-4 text-slate-400" size={48} />
            <p className="text-slate-600 font-medium">
              {file ? file.name : 'Click to select a PDF or Text file'}
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
            {uploading ? 'Processing & Vectorizing...' : 'Sync to AI Brain'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 rounded-xl bg-slate-100 text-slate-700 font-medium">
            {message}
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl flex items-center space-x-4">
          <FileText className="text-blue-500" />
          <div>
            <h4 className="font-bold">Text-Embedding-3</h4>
            <p className="text-xs text-slate-400">1536-dimensional vectors</p>
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
