import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { User } from '../../types/index.ts';
import { X, Search, Users, Radio, MessageSquare, Plus, Check } from 'lucide-react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'direct' | 'group' | 'channel';
}

export const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, initialTab = 'direct' }) => {
  const { createDirectChat, createGroup, createChannel } = useChat();
  const { token, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'direct' | 'group' | 'channel'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group / Channel form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMsg('');
    setTitle('');
    setDescription('');
    setSelectedUserIds([]);
  }, [initialTab, isOpen]);

  // Search users API
  useEffect(() => {
    if (!token || !isOpen) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch (e) {
        console.error('Search users error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, token, isOpen]);

  if (!isOpen) return null;

  const handleStartDirectChat = async (targetUser: User) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const conv = await createDirectChat(targetUser.id);
      if (conv) {
        onClose();
      } else {
        setErrorMsg('Failed to start conversation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a group title.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const conv = await createGroup(title.trim(), description.trim(), selectedUserIds);
      if (conv) {
        onClose();
      } else {
        setErrorMsg('Failed to create group.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a channel title.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const conv = await createChannel(title.trim(), description.trim(), isPublic);
      if (conv) {
        onClose();
      } else {
        setErrorMsg('Failed to create channel.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
            <button
              onClick={() => { setActiveTab('direct'); setErrorMsg(''); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'direct'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              New Chat
            </button>
            <button
              onClick={() => { setActiveTab('group'); setErrorMsg(''); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'group'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              New Group
            </button>
            <button
              onClick={() => { setActiveTab('channel'); setErrorMsg(''); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'channel'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              New Channel
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Direct Message */}
        {activeTab === 'direct' && (
          <div className="p-6 flex flex-col flex-1 overflow-hidden">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search username, display name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isSearching ? (
                <div className="text-center py-8 text-xs text-slate-500">Searching global network...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  {searchQuery ? 'No users found matching query.' : 'Type to search for people.'}
                </div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartDirectChat(u)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-800"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-white">{u.name}</span>
                          <span className="text-xs text-indigo-400">@{u.username}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-xs">{u.bio || u.statusText}</p>
                      </div>
                    </div>
                    <button
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <MessageSquare size={13} />
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Group Chat */}
        {activeTab === 'group' && (
          <form onSubmit={handleCreateGroup} className="p-6 flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Design & Engineering Hub"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Briefly describe what this group is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Add Members ({selectedUserIds.length} selected)
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="Search people to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1 border border-slate-800/80 rounded-xl p-2 bg-slate-950/40">
              {searchResults.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectUser(u.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-semibold text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Channel */}
        {activeTab === 'channel' && (
          <form onSubmit={handleCreateChannel} className="p-6 flex flex-col flex-1">
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Channel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Product Announcements & News"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  placeholder="Describe what subscribers can expect from this channel..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white">Public Channel</span>
                  <p className="text-[11px] text-slate-400">
                    Anyone can find this channel and join via shareable link.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
