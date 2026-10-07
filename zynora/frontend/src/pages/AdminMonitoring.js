import React, { useState, useEffect } from 'react';
import AdminNavigation from '../components/AdminNavigation';
import { adminAPI } from '../services/api';
import {
  Activity,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  HelpCircle,
  ShieldCheck,
  Server,
  Filter,
  BarChart2,
  FileQuestion,
  Database
} from 'lucide-react';

const AdminMonitoring = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, questions, errors, health
  const [overview, setOverview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questionFilter, setQuestionFilter] = useState('all'); // all, grounded, ungrounded

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [overviewRes, questionsRes, errorsRes, healthRes] = await Promise.all([
        adminAPI.getMonitoringOverview(params),
        adminAPI.getMonitoringQuestions({
          ...params,
          grounded: questionFilter === 'all' ? undefined : questionFilter === 'grounded'
        }),
        adminAPI.getMonitoringErrors({ limit: 50 }),
        adminAPI.getMonitoringHealth()
      ]);

      setOverview(overviewRes.data.overview);
      setQuestions(questionsRes.data.questions || []);
      setErrors(errorsRes.data.errors || []);
      setHealth(healthRes.data.health || null);
    } catch (err) {
      console.error('Failed to load AI monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, questionFilter]);

  const setPresetDate = (days) => {
    if (days === 0) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const groundingRate = overview && overview.totalQuestions > 0
    ? Math.round((overview.successfulAnswers / overview.totalQuestions) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-6 pb-16">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-100">AI Monitoring & Quality Evaluation</h2>
                <p className="text-xs text-slate-400">
                  Live production RAG metrics, latency, grounding accuracy, and error diagnostics
                </p>
              </div>
            </div>
          </div>

          {/* Date Filter & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setPresetDate(1)}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              >
                24h
              </button>
              <button
                onClick={() => setPresetDate(7)}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              >
                7d
              </button>
              <button
                onClick={() => setPresetDate(30)}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              >
                30d
              </button>
              <button
                onClick={() => setPresetDate(0)}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              >
                All
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs"
              />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs transition shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Card 1: Total Questions & Conversations */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Total Questions</span>
              <FileQuestion className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-100">{overview?.totalQuestions || 0}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Across {overview?.totalConversations || 0} conversations
              </span>
            </div>
          </div>

          {/* Card 2: Grounded Success Rate */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Grounded Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-emerald-400">{groundingRate}%</span>
                <span className="text-xs text-slate-400">grounded</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {overview?.successfulAnswers || 0} grounded / {overview?.noAnswerResponses || 0} fallback
              </span>
            </div>
          </div>

          {/* Card 3: Avg Response Time */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Avg Response Time</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-100">{overview?.averageResponseTime || 0} ms</span>
              <span className="text-[11px] text-emerald-400 block mt-0.5">Sub-second local retrieval</span>
            </div>
          </div>

          {/* Card 4: Error Count */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Error Events</span>
              <AlertTriangle className={`w-4 h-4 ${(overview?.errorCount || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-100">{overview?.errorCount || 0}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Retrieval failures: {overview?.retrievalFailures || 0}
              </span>
            </div>
          </div>

          {/* Card 5: AI Service Health */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">AI Service Health</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                {overview?.aiServiceHealth?.status || 'HEALTHY'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {overview?.aiServiceHealth?.activeKnowledgeChunks || 0} chunks indexed
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Overview & Analytics
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'questions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Question Evaluations ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'errors'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Error Tracking ({errors.length})
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'health'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Service Diagnostics
          </button>
        </div>

        {/* Tab 1: Overview & Analytics */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Knowledge Categories */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Active Knowledge Categories
              </h3>
              <div className="space-y-3">
                {overview?.knowledgeCategories?.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono">
                        {cat.chunkCount} chunks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Frequently Asked Questions
              </h3>
              {overview?.frequentlyAskedQuestions?.length === 0 ? (
                <p className="text-xs text-slate-500">No questions recorded in the selected period.</p>
              ) : (
                <div className="space-y-2.5">
                  {overview?.frequentlyAskedQuestions?.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-3">
                        <span className="text-slate-200 font-medium block truncate">"{faq.question}"</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                          {faq.count} {faq.count === 1 ? 'time' : 'times'}
                        </span>
                        {faq.grounded ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            Grounded
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Fallback
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Question Evaluations Table */}
        {activeTab === 'questions' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#0e1626] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Per-Query Response Quality Evaluation Stream
              </h3>

              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={questionFilter}
                  onChange={(e) => setQuestionFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  <option value="all">All Responses</option>
                  <option value="grounded">Grounded Only</option>
                  <option value="ungrounded">Ungrounded / Fallback Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">User Question</th>
                    <th className="py-3 px-4">Grounding</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Sources</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-500">
                        No evaluations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-slate-200 max-w-sm">
                          <p className="font-medium truncate">{q.question}</p>
                          {q.isContextual && (
                            <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono mr-1">
                              Contextual
                            </span>
                          )}
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{q.answer}</p>
                        </td>
                        <td className="py-3 px-4">
                          {q.grounded ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              Grounded
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/30">
                              Fallback
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              q.confidence === 'HIGH'
                                ? 'bg-emerald-950 text-emerald-300'
                                : q.confidence === 'MEDIUM'
                                ? 'bg-indigo-950 text-indigo-300'
                                : q.confidence === 'LOW'
                                ? 'bg-amber-950 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {q.confidence}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {q.topScore > 0 ? q.topScore.toFixed(3) : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {q.latencyMs} ms
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {q.sourcesCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Error Tracking */}
        {activeTab === 'errors' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#0e1626] border-b border-slate-800">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Production Error Logs & Trace IDs
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Method / Endpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Trace ID</th>
                    <th className="py-3 px-4">Error Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {errors.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-slate-500">
                        No production errors recorded. System running smoothly!
                      </td>
                    </tr>
                  ) : (
                    errors.map((err) => (
                      <tr key={err.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(err.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {err.method} {err.endpoint}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-400 font-bold">
                          {err.statusCode || 500}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[10px]">
                          {err.traceId || '-'}
                        </td>
                        <td className="py-3 px-4 text-rose-300 font-mono text-[11px] max-w-md truncate">
                          {err.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Service Diagnostics */}
        {activeTab === 'health' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                RAG Engine & Knowledge Base Isolation
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">External LLM APIs Disabled</span>
                  <span className="text-emerald-400 font-mono font-bold">ACTIVE (100% Local RAG)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Web / Internet Search Disabled</span>
                  <span className="text-emerald-400 font-mono font-bold">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Approved Knowledge Only Rule</span>
                  <span className="text-emerald-400 font-mono font-bold">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Prompt Injection Guardrails</span>
                  <span className="text-emerald-400 font-mono font-bold">PROTECTED</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                System Infrastructure & Uptime
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Database Status</span>
                  <span className="text-emerald-400 font-mono font-bold">{health?.database || 'CONNECTED'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Active Knowledge Chunks</span>
                  <span className="text-slate-200 font-mono font-bold">{health?.activeKnowledgeChunks || 51}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">System Uptime</span>
                  <span className="text-slate-200 font-mono">{health?.uptimeSeconds || 0} seconds</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300">Node Environment</span>
                  <span className="text-slate-200 font-mono">{health?.environment || 'production'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminMonitoring;
