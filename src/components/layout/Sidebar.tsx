import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Search,
  MessageSquare,
  Users,
  Radio,
  Phone,
  Archive,
  Settings,
  Shield,
  Plus,
  Pin,
  BellOff,
  Check,
  CheckCheck,
  MoreVertical,
  LogOut,
  UserCheck,
  Zap
} from 'lucide-react';
import { Conversation } from '../../types/index.ts';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';

interface SidebarProps {
  onOpenCreate: (tab?: 'direct' | 'group' | 'channel') => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCreate,
  onOpenSettings,
  onOpenAdmin,
}) => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    togglePinConversation,
    toggleMuteConversation,
    toggleArchiveConversation,
  } = useChat();

  const { user, logout, switchAccount } = useAuth();
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // Tab filter
    if (filterTab === 'direct' && c.type !== 'direct') return false;
    if (filterTab === 'group' && c.type !== 'group') return false;
    if (filterTab === 'channel' && c.type !== 'channel') return false;
    if (filterTab === 'archived' && !c.isArchived) return false;
    if (filterTab !== 'archived' && c.isArchived) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchLastMsg = c.lastMessage?.content.toLowerCase().includes(q);
      return matchTitle || matchLastMsg;
    }
    return true;
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-slate-900 border-r border-slate-800/80 select-none shrink-0 relative">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => setShowUserMenu(!showUserMenu)}>
            <img
              src="/src/assets/images/rudactivity_logo_1793024816643.jpg"
              alt="RUDACTIVITY"
              className="w-9 h-9 rounded-xl object-cover ring-1 ring-indigo-500/30 shadow-md"
            />
            {user?.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
            )}
          </div>
          <div className="cursor-pointer" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">RUDACTIVITY</span>
              {user?.isVerified && (
                <span className="text-[10px] text-indigo-400 font-bold">✓</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
              @{user?.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <PWAInstallButton variant="compact" />

          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
              title="Platform Administration"
            >
              <Shield size={17} />
            </button>
          )}

          <button
            onClick={() => onOpenCreate('direct')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="New Chat or Group"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* User Quick Switch Dropdown */}
      {showUserMenu && (
        <div className="absolute top-14 left-3 z-40 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl animate-in fade-in duration-150">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-xs font-semibold text-white">{user?.name}</p>
            <p className="text-[10px] text-slate-400">Signed in as @{user?.username}</p>
          </div>

          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Switch Demo User
            </div>
            <button
              onClick={() => { switchAccount('sarah.jenkins@example.com', 'SarahPass2026!'); setShowUserMenu(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between"
            >
              <span>Sarah Jenkins</span>
              <span className="text-[10px] text-slate-400">@sarah_dev</span>
            </button>
            <button
              onClick={() => { switchAccount('david.chen@example.com', 'DavidPass2026!'); setShowUserMenu(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between"
            >
              <span>David Chen</span>
              <span className="text-[10px] text-slate-400">@david_ux</span>
            </button>
            <button
              onClick={() => { switchAccount('amara.diallo@example.com', 'AmaraPass2026!'); setShowUserMenu(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between"
            >
              <span>Amara Diallo</span>
              <span className="text-[10px] text-slate-400">@amara_cloud</span>
            </button>
          </div>

          <div className="pt-1 border-t border-slate-800">
            <button
              onClick={() => { logout(); setShowUserMenu(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Search chats, messages, groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* PWA Direct Install Card */}
      <div className="px-3 pb-2">
        <PWAInstallButton variant="sidebar" />
      </div>

      {/* Category Navigation Tabs */}
      <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All', icon: MessageSquare },
          { id: 'direct', label: 'DMs', icon: MessageSquare },
          { id: 'group', label: 'Groups', icon: Users },
          { id: 'channel', label: 'Channels', icon: Radio },
          { id: 'archived', label: 'Archived', icon: Archive },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filterTab === tab.id
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <MessageSquare size={24} className="opacity-40" />
            <span>No conversations found in this category.</span>
            <button
              onClick={() => onOpenCreate('direct')}
              className="mt-2 text-indigo-400 hover:underline font-medium text-xs"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            const hasUnread = (conv.unreadCount || 0) > 0;

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuId(contextMenuId === conv.id ? null : conv.id);
                }}
                className={`relative px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Avatar with badge */}
                <div className="relative shrink-0">
                  <img
                    src={
                      conv.avatar ||
                      (conv.type === 'channel'
                        ? '/src/assets/images/channel_cover_tech_1793024818739.jpg'
                        : '/src/assets/images/rudactivity_logo_1793024816643.jpg')
                    }
                    alt={conv.title}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-800"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {conv.type === 'direct' && conv.otherUser?.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                  )}
                  {conv.type === 'channel' && (
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 p-0.5 rounded-full text-white ring-2 ring-slate-900">
                      <Radio size={9} />
                    </span>
                  )}
                  {conv.type === 'group' && (
                    <span className="absolute -bottom-1 -right-1 bg-purple-600 p-0.5 rounded-full text-white ring-2 ring-slate-900">
                      <Users size={9} />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-semibold text-white truncate max-w-[160px]">
                      {conv.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                      {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <p className="truncate text-[11px] max-w-[170px]">
                      {conv.lastMessage ? (
                        <span>
                          {conv.type !== 'direct' && (
                            <span className="text-slate-300 font-medium">
                              {conv.lastMessage.senderName.split(' ')[0]}:{' '}
                            </span>
                          )}
                          {conv.lastMessage.content}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No messages yet</span>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {conv.isMuted && <BellOff size={11} className="text-slate-500" />}
                      {conv.isPinned && <Pin size={11} className="text-indigo-400 fill-indigo-400/20" />}
                      {hasUnread && (
                        <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold font-mono">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right click / Hover quick toggle menu */}
                {contextMenuId === conv.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-8 z-30 bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-2xl text-xs space-y-0.5 w-36"
                  >
                    <button
                      onClick={() => { togglePinConversation(conv.id); setContextMenuId(null); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <Pin size={13} /> {conv.isPinned ? 'Unpin' : 'Pin to top'}
                    </button>
                    <button
                      onClick={() => { toggleMuteConversation(conv.id); setContextMenuId(null); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <BellOff size={13} /> {conv.isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                      onClick={() => { toggleArchiveConversation(conv.id); setContextMenuId(null); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <Archive size={13} /> {conv.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
