import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, X, Search } from 'lucide-react';

const ConversationSidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  loading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const saveRename = async (id, e) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await onDeleteConversation(id);
    }
  };

  return (
    <aside className="w-72 bg-[#0e1626] border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* New Chat Button */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={onNewConversation}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {searchQuery ? 'No matching chats' : 'No previous conversations'}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => !isEditing && onSelectConversation(conv.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition border ${
                  isActive
                    ? 'bg-indigo-950/70 text-indigo-200 border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(conv.id, e);
                        if (e.key === 'Escape') cancelRename(e);
                      }}
                      autoFocus
                      className="bg-slate-900 border border-indigo-500 text-slate-100 rounded px-1.5 py-0.5 text-xs w-full focus:outline-none"
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{conv.title}</p>
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions: Edit / Delete */}
                <div className="flex items-center space-x-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => saveRename(conv.id, e)}
                        className="text-emerald-400 hover:text-emerald-300 p-1 rounded"
                        title="Save title"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="text-slate-400 hover:text-slate-300 p-1 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="hidden group-hover:flex items-center space-x-1">
                      <button
                        onClick={(e) => startRename(conv, e)}
                        className="text-slate-400 hover:text-indigo-300 p-1 rounded hover:bg-slate-800"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default ConversationSidebar;
