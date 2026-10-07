import React from 'react';
import { BookOpen, Tag, Layers } from 'lucide-react';

const SourceReference = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300 space-y-2">
      <div className="flex items-center space-x-1.5 font-semibold text-indigo-300">
        <BookOpen className="w-3.5 h-3.5" />
        <span>Approved Zyngram Knowledge Source:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((src, idx) => (
          <div
            key={idx}
            className="flex items-center space-x-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <span className="font-medium text-indigo-200">{src.title}</span>
            <span className="bg-indigo-600/40 px-1.5 py-0.5 rounded text-[10px] text-indigo-200 font-mono">
              v{src.version || '1.0'}
            </span>
            {src.category && (
              <span className="flex items-center text-slate-400 text-[11px]">
                <Tag className="w-3 h-3 mr-0.5" />
                {src.category}
              </span>
            )}
            {src.section && (
              <span className="flex items-center text-slate-400 text-[11px]">
                <Layers className="w-3 h-3 mr-0.5" />
                {src.section}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourceReference;
