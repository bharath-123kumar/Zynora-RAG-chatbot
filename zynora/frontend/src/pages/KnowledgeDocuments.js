import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import { knowledgeAPI } from '../services/api';
import { Search, CheckCircle, Play, Archive, Plus, RefreshCw, Filter } from 'lucide-react';

const KnowledgeDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const response = await knowledgeAPI.getDocuments({
        search,
        category: categoryFilter,
        status: statusFilter
      });
      setDocuments(response.data.documents);
    } catch (err) {
      console.error('Failed to fetch knowledge documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocs();
  };

  const handleStatusChange = async (docId, action) => {
    setActionLoading(docId);
    try {
      if (action === 'approve') await knowledgeAPI.approveDocument(docId);
      if (action === 'activate') await knowledgeAPI.activateDocument(docId);
      if (action === 'archive') await knowledgeAPI.archiveDocument(docId);
      await fetchDocs();
    } catch (err) {
      alert(`Action ${action} failed: ` + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleIngestAll = async () => {
    if (window.confirm('Re-ingest all markdown files from /knowledge directory into RAG database?')) {
      setLoading(true);
      try {
        const res = await knowledgeAPI.ingestAll();
        alert(`Ingested ${res.data.count} documents successfully!`);
        await fetchDocs();
      } catch (err) {
        alert('Ingestion failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-6 pb-12">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Knowledge Base Management</h2>
            <p className="text-xs text-slate-400">Manage Document Lifecycle: DRAFT → APPROVED → ACTIVE → ARCHIVED</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleIngestAll}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs transition border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Batch Ingest Files</span>
            </button>

            <Link
              to="/admin/editor"
              className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Document</span>
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="glass-panel p-4 rounded-2xl mb-6 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, doc ID, or content..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </form>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filters:</span>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="Company">Company</option>
              <option value="Services">Services</option>
              <option value="Franchise">Franchise</option>
              <option value="Policies">Policies</option>
              <option value="FAQ">FAQ</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Doc ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      Loading knowledge documents...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No knowledge documents found matching filters.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{doc.docId}</td>
                      <td className="py-3 px-4 font-medium text-slate-100">{doc.title}</td>
                      <td className="py-3 px-4 text-slate-300">{doc.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">v{doc.version}</td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            doc.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : doc.status === 'APPROVED'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                              : doc.status === 'ARCHIVED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/30 line-through'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{doc._count?.chunks || 0}</td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/admin/editor/${doc.id}`}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] transition inline-block"
                        >
                          Edit
                        </Link>

                        {doc.status === 'DRAFT' && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'approve')}
                            disabled={actionLoading === doc.id}
                            className="bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3 text-indigo-400" />
                            Approve
                          </button>
                        )}

                        {(doc.status === 'APPROVED' || doc.status === 'DRAFT') && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'activate')}
                            disabled={actionLoading === doc.id}
                            className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 text-emerald-400" />
                            Activate
                          </button>
                        )}

                        {doc.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'archive')}
                            disabled={actionLoading === doc.id}
                            className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Archive className="w-3 h-3 text-rose-400" />
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KnowledgeDocuments;
