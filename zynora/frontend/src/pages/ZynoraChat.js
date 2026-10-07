import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';
import ConversationSidebar from '../components/ConversationSidebar';
import { chatAPI, conversationAPI } from '../services/api';
import { Bot, LogOut, Settings, Menu, X, Activity } from 'lucide-react';

const ZynoraChat = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fetchingConversations, setFetchingConversations] = useState(false);

  // Load user conversations on mount
  const loadConversations = async (autoSelectFirst = true) => {
    setFetchingConversations(true);
    try {
      const res = await conversationAPI.getAll();
      const list = res.data.conversations || [];
      setConversations(list);

      if (autoSelectFirst && list.length > 0 && !activeConversationId) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setFetchingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  // Select and load specific conversation
  const selectConversation = async (id) => {
    setActiveConversationId(id);
    setLoading(true);
    try {
      const res = await conversationAPI.getById(id);
      const conv = res.data.conversation;
      setActiveConversationTitle(conv.title);

      // Map DB messages to UI message format
      const formatted = conv.messages.map((m) => ({
        sender: m.role === 'user' ? 'user' : 'bot',
        text: m.content,
        sources: m.sources || [],
        grounded: m.grounded,
        confidence: m.confidence,
        latencyMs: m.latencyMs,
        isContextual: m.isContextual
      }));

      setMessages(formatted);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setLoading(false);
      setSidebarOpen(false);
    }
  };

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const res = await conversationAPI.create('New Conversation');
      const newConv = res.data.conversation;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveConversationTitle(newConv.title);
      setMessages([]);
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id, title) => {
    try {
      await conversationAPI.rename(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
      if (activeConversationId === id) {
        setActiveConversationTitle(title);
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id) => {
    try {
      await conversationAPI.delete(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      if (activeConversationId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setActiveConversationTitle('');
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Clear current chat
  const handleClearChat = async () => {
    if (activeConversationId) {
      try {
        await conversationAPI.clear(activeConversationId);
      } catch (err) {
        console.error('Failed to clear messages from server:', err);
      }
    }
    setMessages([]);
  };

  // Send message
  const handleSendMessage = async (userText) => {
    const userMessage = { sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await chatAPI.sendQuery(userText, activeConversationId);
      const data = response.data;

      // Update activeConversationId if newly auto-created
      if (data.conversationId && !activeConversationId) {
        setActiveConversationId(data.conversationId);
      }

      // Append Zynora Bot Grounded Response
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: data.answer,
          sources: data.sources || [],
          grounded: data.grounded,
          confidence: data.confidence,
          latencyMs: data.latencyMs,
          isContextual: data.isContextual
        }
      ]);

      // Refresh conversations list in background to reflect updated title & time
      loadConversations(false);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "An error occurred while connecting to the Zynora RAG server.",
          sources: [],
          grounded: false,
          confidence: 'NONE',
          latencyMs: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-[#0e1626] border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              title="Toggle Conversations"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-100 leading-none">ZYNORA 2.0</h1>
              <span className="text-[10px] text-slate-400">Zyngram Knowledge Assistant</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Link
                  to="/admin/monitoring"
                  className="flex items-center space-x-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 px-2.5 py-1.5 rounded-lg text-xs transition font-medium"
                  title="AI Monitoring Dashboard"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Monitoring</span>
                </Link>

                <Link
                  to="/admin"
                  className="flex items-center space-x-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 px-2.5 py-1.5 rounded-lg text-xs transition font-medium"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Console</span>
                </Link>
              </div>
            )}

            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-slate-200 block">{user?.name || 'Guest'}</span>
              <span className="text-[10px] text-indigo-400 font-mono block">{user?.role || 'USER'}</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body: Sidebar + Chat Window */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Drawer Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 md:relative md:z-auto transition-transform duration-200 ease-in-out md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <ConversationSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            onNewConversation={handleNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            loading={fetchingConversations}
          />
        </div>

        {/* Chat Area */}
        <main className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col">
          <ChatWindow
            messages={messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            conversationTitle={activeConversationTitle}
          />
        </main>
      </div>
    </div>
  );
};

export default ZynoraChat;
