import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "What is Zyngram?",
  "What is the physical franchise hierarchy?",
  "What is the digital franchise hierarchy?",
  "What services are available on Zyngram?"
];

const ChatInput = ({ onSendMessage, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleSuggestionClick = (question) => {
    if (!disabled) {
      onSendMessage(question);
    }
  };

  return (
    <div className="border-t border-slate-800 bg-[#0d1322] p-4 rounded-b-2xl">
      {/* Quick Prompt Suggestions */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 custom-scrollbar text-xs">
        <span className="flex items-center text-indigo-400 font-medium whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          Suggested:
        </span>
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(q)}
            disabled={disabled}
            className="bg-slate-800/80 hover:bg-indigo-900/50 hover:border-indigo-500/50 border border-slate-700/60 text-slate-300 hover:text-white px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 disabled:opacity-50 text-xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Zynora about Zyngram knowledge, services, franchise hierarchy..."
          disabled={disabled}
          className="w-full bg-slate-900/90 text-slate-100 border border-slate-700/80 rounded-xl px-4 py-3.5 pr-14 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-500 text-sm disabled:opacity-50 shadow-inner"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="absolute right-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white p-2.5 rounded-lg transition-all duration-200 disabled:opacity-40 shadow-md shadow-indigo-600/30 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
