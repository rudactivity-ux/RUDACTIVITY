import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  Bell,
  BellOff,
  Link,
  Users,
  Image,
  FileText,
  AlertTriangle,
  Ban,
  Check,
  Radio,
  LogOut,
  ShieldAlert
} from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLightbox: (url: string, type: 'image' | 'video', name?: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ isOpen, onClose, onOpenLightbox }) => {
  const { activeConversation, messages, toggleMuteConversation } = useChat();
  const { user, blockUser, token } = useAuth();

  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'files' | 'members'>('media');
  const [copiedLink, setCopiedLink] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  if (!isOpen || !activeConversation) return null;

  // Collect shared media & files from conversation messages
  const sharedMedia: { url: string; name: string; type: 'image' | 'video' }[] = [];
  const sharedFiles: { url: string; name: string; size: number }[] = [];

  for (const m of messages) {
    if (m.attachments) {
      for (const a of m.attachments) {
        if (a.mimeType.startsWith('image/')) {
          sharedMedia.push({ url: a.url, name: a.name, type: 'image' });
        } else if (a.mimeType.startsWith('video/')) {
          sharedMedia.push({ url: a.url, name: a.name, type: 'video' });
        } else if (m.type !== 'voice') {
          sharedFiles.push({ url: a.url, name: a.name, size: a.size });
        }
      }
    }
  }

  const handleCopyLink = () => {
    const link =
      activeConversation.inviteLink ||
      `https://rudactivity.app/join/${activeConversation.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBlockUser = async () => {
    if (activeConversation.type === 'direct') {
      const otherId = activeConversation.participantIds.find((id) => id !== user?.id);
      if (otherId) {
        await blockUser(otherId);
        alert('User has been blocked.');
      }
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: activeConversation.type === 'direct' ? 'user' : 'channel',
          targetId: activeConversation.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setReportSubmitted(false);
        setReportModalOpen(false);
      }, 1500);
    } catch (e) {
      console.error('Report error:', e);
    }
  };

  return (
    <aside className="w-80 h-full bg-slate-900 border-l border-slate-800/80 flex flex-col z-20 shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
          {activeConversation.type === 'direct'
            ? 'User Info'
            : activeConversation.type === 'group'
            ? 'Group Details'
            : 'Channel Info'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X size={16} />
        </button>
      </div>

      {/* Hero Profile Info */}
      <div className="p-6 flex flex-col items-center text-center border-b border-slate-800/80 bg-slate-950/20">
        <img
          src={
            activeConversation.avatar ||
            (activeConversation.type === 'channel'
              ? '/src/assets/images/channel_cover_tech_1793024818739.jpg'
              : '/src/assets/images/rudactivity_logo_1793024816643.jpg')
          }
          alt={activeConversation.title}
          className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-xl mb-3"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <h2 className="font-bold text-base text-white">{activeConversation.title}</h2>
        {activeConversation.type === 'direct' && activeConversation.otherUser && (
          <p className="text-xs text-indigo-400 mt-0.5">@{activeConversation.otherUser.username}</p>
        )}
        {activeConversation.description && (
          <p className="text-xs text-slate-400 mt-2 max-w-xs">{activeConversation.description}</p>
        )}

        {/* Quick Toggles */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => toggleMuteConversation(activeConversation.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              activeConversation.isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
          >
            {activeConversation.isMuted ? <BellOff size={13} /> : <Bell size={13} />}
            {activeConversation.isMuted ? 'Unmute' : 'Mute'}
          </button>

          {(activeConversation.type === 'channel' || activeConversation.type === 'group') && (
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Link size={13} />}
              {copiedLink ? 'Copied' : 'Invite Link'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveMediaTab('media')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeMediaTab === 'media'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Media ({sharedMedia.length})
        </button>
        <button
          onClick={() => setActiveMediaTab('files')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeMediaTab === 'files'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Files ({sharedFiles.length})
        </button>
        {activeConversation.type !== 'direct' && (
          <button
            onClick={() => setActiveMediaTab('members')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeMediaTab === 'members'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Members ({activeConversation.participantIds.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1">
        {activeMediaTab === 'media' && (
          sharedMedia.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No photos or videos shared yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenLightbox(m.url, m.type, m.name)}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer group"
                >
                  <img
                    src={m.url}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          )
        )}

        {activeMediaTab === 'files' && (
          sharedFiles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No documents or files shared yet.</div>
          ) : (
            <div className="space-y-2">
              {sharedFiles.map((f, idx) => (
                <a
                  key={idx}
                  href={f.url}
                  download={f.name}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/50 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={16} className="text-indigo-400 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                    {Math.round(f.size / 1024)}KB
                  </span>
                </a>
              ))}
            </div>
          )
        )}

        {activeMediaTab === 'members' && (
          <div className="space-y-2">
            {activeConversation.participantIds.map((pid) => (
              <div
                key={pid}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                    {pid.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-white font-medium">User {pid.slice(-4)}</span>
                </div>
                {activeConversation.adminIds.includes(pid) && (
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety & Moderation Actions */}
      <div className="p-4 border-t border-slate-800 space-y-1.5 text-xs">
        {activeConversation.type === 'direct' && (
          <button
            onClick={handleBlockUser}
            className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
          >
            <Ban size={14} /> Block User
          </button>
        )}

        <button
          onClick={() => setReportModalOpen(true)}
          className="w-full text-left px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
        >
          <ShieldAlert size={14} /> Report Abuse / Content
        </button>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h4 className="font-bold text-sm text-white mb-2">Submit Moderation Report</h4>
            {reportSubmitted ? (
              <div className="text-center py-6 text-emerald-400 text-xs">
                Report submitted to RUDACTIVITY safety team.
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Spam">Spam or Unsolicited Commercial</option>
                    <option value="Harassment">Harassment or Abuse</option>
                    <option value="Hate Speech">Hate Speech</option>
                    <option value="Inappropriate Content">Inappropriate Media</option>
                    <option value="Impersonation">Impersonation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Additional Details</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                    placeholder="Provide context..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                  >
                    Send Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
