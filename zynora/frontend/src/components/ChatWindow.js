import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import LoadingMessage from './LoadingMessage';
import ChatInput from './ChatInput';
import { Trash2, ShieldCheck, Database, Bot } from 'lucide-react';

const ChatWindow = ({ messages, loading, onSendMessage, onClearChat, conversationTitle }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto glass-panel rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0e1626]/90 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0e1626] rounded-full"></span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              ZYNORA <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-normal">RAG Engine v2.0</span>
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate max-w-md">
              <Database className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>{conversationTitle ? `${conversationTitle}` : 'Approved Zyngram Knowledge Intelligence'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>RAG Strict Grounding Active</span>
          </div>

          <button
            onClick={onClearChat}
            title="Clear Chat History"
            className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 p-2 rounded-lg transition-colors border border-transparent hover:border-rose-500/30 text-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-[#0b0f19]/60">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Welcome to Zynora Knowledge Intelligence</h3>
            <p className="max-w-md text-xs text-slate-400 mb-6 leading-relaxed">
              Zynora answers questions strictly using approved internal Zyngram knowledge documents. Select a suggested query below or type your question.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => <ChatMessage key={index} message={msg} />)
        )}

        {loading && <LoadingMessage />}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Input */}
      <ChatInput onSendMessage={onSendMessage} disabled={loading} />
    </div>
  );
};

export default ChatWindow;
