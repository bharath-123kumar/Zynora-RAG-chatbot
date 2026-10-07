import React from 'react';
import { User, Bot, CheckCircle2, AlertCircle } from 'lucide-react';
import SourceReference from './SourceReference';

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex items-start space-x-3 mb-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div
        className={`rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[75%] ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-none'
            : 'glass-card border border-slate-700 text-slate-100 rounded-tl-none shadow-md'
        }`}
      >
        {/* Header for Bot response */}
        {!isUser && (
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs mb-1.5 pb-1 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-indigo-300">Zynora Assistant</span>
              {message.isContextual && (
                <span className="text-[9px] bg-purple-950/70 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                  Contextual Follow-up
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {message.latencyMs > 0 && (
                <span className="text-[9px] text-slate-500 font-mono">
                  {message.latencyMs}ms
                </span>
              )}

              {message.grounded ? (
                <span className="inline-flex items-center text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Grounded
                  {message.confidence && message.confidence !== 'NONE' && (
                    <span className="ml-1 text-[9px] font-mono text-emerald-300">({message.confidence})</span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  No Grounding
                </span>
              )}
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="whitespace-pre-wrap leading-relaxed text-sm">
          {message.text}
        </div>

        {/* Sources Reference for Bot */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceReference sources={message.sources} />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
