import React, { useState, useEffect } from 'react';
import AdminNavigation from '../components/AdminNavigation';
import { adminAPI } from '../services/api';
import { FileText, Database, Users, ShieldAlert, Activity, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAuditLogs({ limit: 25 })
      ]);
      setStats(statsRes.data.stats);
      setLogs(logsRes.data.logs);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">System Dashboard</h2>
            <p className="text-xs text-slate-400">RAG Index Metrics and Security Audit Stream</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Knowledge Documents</span>
              <span className="text-2xl font-bold text-slate-100">{stats?.totalDocuments || 0}</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Active RAG Chunks</span>
              <span className="text-2xl font-bold text-slate-100">{stats?.activeChunks || 0}</span>
              <span className="text-[10px] text-slate-500 block">Total Chunks: {stats?.totalChunks || 0}</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Registered Users</span>
              <span className="text-2xl font-bold text-slate-100">{stats?.totalUsers || 0}</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Audit Log Events</span>
              <span className="text-2xl font-bold text-slate-100">{stats?.totalAuditEvents || 0}</span>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 bg-[#0e1626] border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Security Audit & RAG Activity Logs
            </h3>
            <span className="text-xs text-slate-400 font-mono">Latest 25 Events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.action.includes('SECURITY')
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : log.action.includes('SUCCESS') || log.action.includes('CREATED')
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{log.userEmail || 'System / Guest'}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.resource}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {log.metadata}
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

export default AdminDashboard;
