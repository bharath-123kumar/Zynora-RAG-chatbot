import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import { knowledgeAPI } from '../services/api';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';

const KnowledgeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [docId, setDocId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Company');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [version, setVersion] = useState('1.0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      knowledgeAPI
        .getDocument(id)
        .then((res) => {
          const doc = res.data.document;
          setDocId(doc.docId);
          setTitle(doc.title);
          setCategory(doc.category);
          setContent(doc.content);
          setSource(doc.source);
          setStatus(doc.status);
          setVersion(doc.version);
        })
        .catch((err) => setError('Failed to load document: ' + err.message));
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        docId: docId || undefined,
        title,
        category,
        content,
        source: source || `Admin/Editor/${docId || 'DOC'}`,
        status
      };

      if (isEditMode) {
        await knowledgeAPI.updateDocument(id, payload);
      } else {
        await knowledgeAPI.createDocument(payload);
      }

      navigate('/admin/documents');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <AdminNavigation />

      <main className="max-w-4xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/documents')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Knowledge Documents</span>
          </button>
          <div className="text-right">
            <span className="text-xs font-mono text-indigo-400">
              {isEditMode ? `Editing Document (v${version})` : 'New Knowledge Document'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Zyngram Logistics SLA Guidelines"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document ID (DocId)</label>
              <input
                type="text"
                value={docId}
                disabled={isEditMode}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="e.g. KB-LOG-001 (Auto-generated if empty)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Company">Company</option>
                <option value="Services">Services</option>
                <option value="Franchise">Franchise</option>
                <option value="Policies">Policies</option>
                <option value="FAQ">FAQ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status Lifecycle *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="DRAFT">DRAFT (Excluded from RAG)</option>
                <option value="APPROVED">APPROVED (Ready for RAG)</option>
                <option value="ACTIVE">ACTIVE (Active in RAG)</option>
                <option value="ARCHIVED">ARCHIVED (Excluded from RAG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Reference</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. knowledge/logistics/sla.md"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">Document Content (Markdown / Text) *</label>
              <span className="text-[10px] text-slate-400 font-mono">Supports # Headings & Semantic Sections</span>
            </div>
            <textarea
              required
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Section Header&#10;&#10;Enter detailed knowledge facts and information here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              {isEditMode ? 'Saving will auto-increment version (e.g. 1.0 → 1.1) and re-chunk document.' : 'Saving will ingest document and generate RAG chunks.'}
            </span>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition text-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Ingesting Document...' : isEditMode ? 'Save & Update Version' : 'Create & Ingest Document'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default KnowledgeEditor;
