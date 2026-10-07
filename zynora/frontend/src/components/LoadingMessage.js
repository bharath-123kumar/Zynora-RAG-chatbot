import React from 'react';
import { Bot, Cpu } from 'lucide-react';

const LoadingMessage = () => {
  return (
    <div className="flex items-start space-x-3 mb-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
        <Bot className="w-4 h-4" />
      </div>
      <div className="glass-card rounded-2xl px-4 py-3 max-w-[80%] border-indigo-500/30">
        <div className="flex items-center space-x-2 text-indigo-300 text-xs mb-1 font-medium">
          <Cpu className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Searching Zyngram Knowledge Base...</span>
        </div>
        <div className="flex space-x-1.5 py-1 items-center">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingMessage;
