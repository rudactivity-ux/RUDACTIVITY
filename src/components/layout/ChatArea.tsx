import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCall } from '../../context/CallContext.tsx';
import {
  Phone,
  Video,
  Info,
  Search,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Pin,
  Reply,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  Play,
  Pause,
  Download,
  X,
  FileText,
  Forward,
  ChevronDown,
  Plus,
  Bookmark,
  Cloud
} from 'lucide-react';
import { Message, Attachment } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';

const POPULAR_REACTIONS = ['❤️', '👍', '👎', '🔥', '🎉', '😂', '😍', '👏', '🚀', '💯'];
const EXTENDED_REACTIONS = [
  '✨', '🙏', '👀', '⚡', '💡', '😢', '😮', '🥳',
  '🤔', '🤝', '☕', '🌟', '🎯', '🤩', '💪', '🥰',
  '🤣', '😭', '🤯', '🫡', '😎', '🏆', '💯', '🌸'
];

interface ChatAreaProps {
  onToggleInfoPanel: () => void;
  onOpenLightbox: (url: string, type: 'image' | 'video', name?: string) => void;
  onBackToSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onToggleInfoPanel,
  onOpenLightbox,
  onBackToSidebar,
}) => {
  const {
    activeConversation,
    messages,
    isLoadingMessages,
    sendMessage,
    sendVoiceMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    pinMessage,
    sendTypingStatus,
    typingUsers,
    uploadMedia,
  } = useChat();

  const { user } = useAuth();
  const { initiateCall } = useCall();
  const { language } = useLanguage();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Reaction popover state
  const [reactionPopoverMsgId, setReactionPopoverMsgId] = useState<string | null>(null);
  const [showExtendedReactions, setShowExtendedReactions] = useState(false);
  const reactionPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionPopoverRef.current && !reactionPopoverRef.current.contains(e.target as Node)) {
        setReactionPopoverMsgId(null);
        setShowExtendedReactions(false);
      }
    };
    if (reactionPopoverMsgId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reactionPopoverMsgId]);

  // Audio voice note recording states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Voice message player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing debounce
  const typingTimerRef = useRef<any>(null);
  const handleInputChange = (val: string) => {
    setInputText(val);
    sendTypingStatus(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  if (!activeConversation) {
    return (
      <main className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <div className="w-20 h-20 rounded-3xl p-0.5 bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 shadow-2xl shadow-cyan-500/20 ring-1 ring-cyan-400/30 mb-4">
          <img
            src="/src/assets/images/erudactivity_logo.jpg"
            alt="E-RUDACTIVITY"
            className="w-full h-full rounded-[22px] object-cover"
          />
        </div>
        <h2 className="text-xl font-bold text-white">Select a Chat or Channel</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Pick a conversation from the sidebar or start a new direct chat, community group, or broadcast channel.
        </p>
      </main>
    );
  }

  // Voice recording handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission not granted:', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    const duration = recordingSeconds;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await sendVoiceMessage(audioBlob, duration);
      // Stop tracks
      recorder.stream.getTracks().forEach((track) => track.stop());
    };

    recorder.stop();
    clearInterval(recordIntervalRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    clearInterval(recordIntervalRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // Play voice message
  const togglePlayAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioElementsRef.current[msgId]?.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      if (!audioElementsRef.current[msgId]) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingAudioId(null);
        audioElementsRef.current[msgId] = audio;
      }
      audioElementsRef.current[msgId].play();
      setPlayingAudioId(msgId);
    }
  };

  // Submit message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && selectedAttachments.length === 0) return;

    if (editingMessageId) {
      await editMessage(editingMessageId, inputText);
      setEditingMessageId(null);
      setInputText('');
      return;
    }

    const type = selectedAttachments.length > 0 ? (selectedAttachments[0].mimeType.startsWith('image') ? 'image' : selectedAttachments[0].mimeType.startsWith('video') ? 'video' : 'document') : 'text';

    await sendMessage(inputText, type, selectedAttachments, replyingTo?.id);
    setInputText('');
    setReplyingTo(null);
    setSelectedAttachments([]);
    setShowEmojiPicker(false);
    sendTypingStatus(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const attachment = await uploadMedia(file);
      if (attachment) {
        setSelectedAttachments((prev) => [...prev, attachment]);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // WebRTC Call triggers
  const handleInitiateVoiceCall = () => {
    if (activeConversation.type === 'direct') {
      const otherId = activeConversation.participantIds.find((id) => id !== user?.id);
      if (otherId) {
        initiateCall(otherId, activeConversation.title, activeConversation.avatar || '', 'voice', activeConversation.id);
      }
    }
  };

  const handleInitiateVideoCall = () => {
    if (activeConversation.type === 'direct') {
      const otherId = activeConversation.participantIds.find((id) => id !== user?.id);
      if (otherId) {
        initiateCall(otherId, activeConversation.title, activeConversation.avatar || '', 'video', activeConversation.id);
      }
    }
  };

  const currentTyping = typingUsers[activeConversation.id] || [];
  const isSavedMessages = activeConversation.isSavedMessages || activeConversation.id.startsWith('conv_saved_');
  const chatTitle = isSavedMessages
    ? (language === 'rw' ? 'Ubutumwa Bwanjye (Saved)' : 'Saved Messages')
    : activeConversation.title;

  return (
    <main className="flex-1 h-full flex flex-col bg-slate-950 relative overflow-hidden select-text">
      {/* Top Header */}
      <header className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <ChevronDown className="rotate-90" size={18} />
            </button>
          )}

          <div
            onClick={onToggleInfoPanel}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              {isSavedMessages ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white ring-1 ring-sky-400/40 shadow-sm">
                  <Bookmark size={20} className="fill-white/30" />
                </div>
              ) : (
                <img
                  src={
                    activeConversation.avatar ||
                    (activeConversation.type === 'channel'
                      ? '/src/assets/images/channel_cover_tech_1793024818739.jpg'
                      : '/src/assets/images/rudactivity_logo_1793024816643.jpg')
                  }
                  alt={chatTitle}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-800"
                />
              )}
              {!isSavedMessages && activeConversation.type === 'direct' && activeConversation.otherUser?.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                <span>{chatTitle}</span>
                {isSavedMessages && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-normal">
                    Cloud Storage
                  </span>
                )}
              </h3>
              <div className="text-[11px] text-slate-400">
                {isSavedMessages ? (
                  <span className="text-sky-400">
                    {language === 'rw' ? 'Ububiko bwawe bwa burundu' : 'Your personal cloud storage'}
                  </span>
                ) : currentTyping.length > 0 ? (
                  <span className="text-indigo-400 animate-pulse font-medium">
                    {currentTyping.join(', ')} typing...
                  </span>
                ) : activeConversation.type === 'direct' ? (
                  activeConversation.otherUser?.isOnline ? (
                    <span className="text-emerald-400 font-medium">Online</span>
                  ) : (
                    <span>Last seen recently</span>
                  )
                ) : (
                  <span>
                    {activeConversation.participantIds.length} members · {activeConversation.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {!isSavedMessages && activeConversation.type === 'direct' && (
            <>
              <button
                onClick={handleInitiateVoiceCall}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Start Voice Call"
              >
                <Phone size={17} />
              </button>
              <button
                onClick={handleInitiateVideoCall}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Start Video Call"
              >
                <Video size={17} />
              </button>
            </>
          )}

          <button
            onClick={onToggleInfoPanel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Conversation Details"
          >
            <Info size={17} />
          </button>
        </div>
      </header>

      {/* Telegram Saved Messages Cloud Info Banner */}
      {isSavedMessages && (
        <div className="bg-gradient-to-r from-sky-950/60 to-slate-900 border-b border-sky-500/20 px-4 py-2.5 flex items-center gap-3 text-xs text-sky-200">
          <Cloud size={16} className="text-sky-400 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            {language === 'rw'
              ? 'Ububiko bwawe bwo muri Cloud: Ohereza cyangwa wandike ubutumwa hano kugirango ububike, ubusange kuri telefone na mudasobwa yawe yose.'
              : 'Forward messages here to save them, store media and notes, and access them from any of your devices.'}
          </p>
        </div>
      )}

      {/* Pinned Message Banner */}
      {activeConversation.pinnedMessageId && (
        <div className="bg-slate-900/90 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <Pin size={13} className="text-indigo-400 shrink-0" />
            <span className="font-semibold text-indigo-300">Pinned:</span>
            <span className="truncate">
              {messages.find((m) => m.id === activeConversation.pinnedMessageId)?.content || 'Pinned item'}
            </span>
          </div>
          <button
            onClick={() => pinMessage(activeConversation.pinnedMessageId!)}
            className="text-[10px] text-slate-500 hover:text-slate-300 shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-500">
            Loading message stream...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-500 py-12">
            {isSavedMessages ? (
              <>
                <div className="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
                  <Bookmark size={28} className="fill-sky-400/20" />
                </div>
                <h4 className="font-semibold text-white text-sm">
                  {language === 'rw' ? 'Ububiko bwawe bwo muri Cloud' : 'Your Personal Cloud Storage'}
                </h4>
                <p className="mt-1 text-slate-400 max-w-xs">
                  {language === 'rw'
                    ? 'Bika ubutumwa, amafoto, dosiye, cyangwa inyandiko zawe hano. Koresha ubu bubiko nkaho ari agasanduku kawe k\'ibanga.'
                    : 'Save messages, photos, files, or personal notes here. Access everything seamlessly from any device.'}
                </p>
              </>
            ) : (
              <>
                <p>No messages yet in this conversation.</p>
                <p className="mt-1">Say hello or share a message to start communicating!</p>
              </>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Name in Group / Channel */}
                {!isMe && activeConversation.type !== 'direct' && (
                  <span className="text-[11px] font-semibold text-indigo-400 mb-1 ml-2">
                    {msg.senderName}
                  </span>
                )}

                <div className="relative max-w-[85%] sm:max-w-[70%]">
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-3 shadow-sm ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                    }`}
                  >
                    {/* Reply to preview quote */}
                    {msg.replyToPreview && (
                      <div
                        className={`mb-2 pl-2.5 py-1 text-xs border-l-2 rounded bg-black/20 ${
                          isMe ? 'border-white/50 text-indigo-100' : 'border-indigo-500 text-slate-300'
                        }`}
                      >
                        <p className="font-semibold text-[10px]">{msg.replyToPreview.senderName}</p>
                        <p className="truncate text-[11px]">{msg.replyToPreview.content}</p>
                      </div>
                    )}

                    {/* Image Attachment */}
                    {msg.attachments?.filter((a) => a.mimeType.startsWith('image/')).map((att) => (
                      <div key={att.id} className="mb-2 rounded-xl overflow-hidden cursor-pointer">
                        <img
                          src={att.url}
                          alt={att.name}
                          onClick={() => onOpenLightbox(att.url, 'image', att.name)}
                          className="max-h-64 rounded-xl object-cover hover:opacity-95 transition-opacity"
                        />
                      </div>
                    ))}

                    {/* Video Attachment */}
                    {msg.attachments?.filter((a) => a.mimeType.startsWith('video/')).map((att) => (
                      <div key={att.id} className="mb-2 rounded-xl overflow-hidden">
                        <video
                          src={att.url}
                          controls
                          className="max-h-64 rounded-xl object-cover"
                        />
                      </div>
                    ))}

                    {/* Voice Message Note */}
                    {msg.type === 'voice' && msg.attachments && msg.attachments[0] && (
                      <div className="flex items-center gap-3 py-1 min-w-[200px]">
                        <button
                          onClick={() => togglePlayAudio(msg.id, msg.attachments![0].url)}
                          className={`p-2 rounded-full ${
                            isMe ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {playingAudioId === msg.id ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <div className="flex-1 flex items-center gap-0.5 h-6">
                          {[40, 70, 30, 90, 60, 80, 50, 65, 35, 75, 45].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h}%` }}
                              className={`w-1 rounded-full ${
                                isMe ? 'bg-white/70' : 'bg-indigo-400/80'
                              } ${playingAudioId === msg.id ? 'animate-pulse' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-mono tabular-nums opacity-80">
                          {msg.attachments[0].duration
                            ? `${msg.attachments[0].duration}s`
                            : 'Voice'}
                        </span>
                      </div>
                    )}

                    {/* Generic Documents */}
                    {msg.attachments
                      ?.filter(
                        (a) =>
                          !a.mimeType.startsWith('image/') &&
                          !a.mimeType.startsWith('video/') &&
                          msg.type !== 'voice'
                      )
                      .map((att) => (
                        <div
                          key={att.id}
                          className="mb-2 flex items-center justify-between gap-3 p-2 rounded-xl bg-black/20"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={18} className="shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-medium truncate">{att.name}</p>
                              <p className="text-[10px] opacity-70">
                                {Math.round(att.size / 1024)} KB
                              </p>
                            </div>
                          </div>
                          <a
                            href={att.url}
                            download={att.name}
                            className="p-1.5 rounded-lg hover:bg-black/20"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))}

                    {/* Text content */}
                    {msg.content && (
                      <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}

                    {/* Bottom Metadata */}
                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                        isMe ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.isEdited && <span className="italic">edited</span>}
                      <span className="font-mono tabular-nums">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck size={13} className="text-cyan-300" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={13} className="text-indigo-200" />
                          ) : (
                            <Check size={13} className="text-indigo-200" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reaction Popover */}
                  {reactionPopoverMsgId === msg.id && (
                    <div
                      ref={reactionPopoverRef}
                      className={`absolute -top-12 ${
                        isMe ? 'right-0' : 'left-0'
                      } z-40 bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Popular Quick Reactions Row */}
                      <div className="flex items-center gap-1">
                        {POPULAR_REACTIONS.map((emoji) => {
                          const hasReacted = user && msg.reactions?.[emoji]?.includes(user.id);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                reactToMessage(msg.id, emoji);
                                setReactionPopoverMsgId(null);
                                setShowExtendedReactions(false);
                              }}
                              className={`p-1.5 rounded-xl text-base hover:scale-130 transition-all cursor-pointer ${
                                hasReacted
                                  ? 'bg-indigo-600/30 ring-1 ring-indigo-500 scale-110 shadow-sm'
                                  : 'hover:bg-slate-800/80'
                              }`}
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setShowExtendedReactions(!showExtendedReactions)}
                          className="p-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-0.5"
                          title={showExtendedReactions ? 'Show less' : 'More reactions'}
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${
                              showExtendedReactions ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Extended Emoji Grid */}
                      {showExtendedReactions && (
                        <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-8 gap-1 max-h-36 overflow-y-auto pr-1">
                          {EXTENDED_REACTIONS.map((emoji) => {
                            const hasReacted = user && msg.reactions?.[emoji]?.includes(user.id);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  reactToMessage(msg.id, emoji);
                                  setReactionPopoverMsgId(null);
                                  setShowExtendedReactions(false);
                                }}
                                className={`p-1.5 rounded-xl text-base hover:scale-125 transition-all text-center cursor-pointer ${
                                  hasReacted
                                    ? 'bg-indigo-600/30 ring-1 ring-indigo-500'
                                    : 'hover:bg-slate-800/80'
                                }`}
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reaction Display Badges Below Message Content */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {msg.reactions &&
                      Object.entries(msg.reactions).map(([emoji, uids]) => {
                        if (!uids || uids.length === 0) return null;
                        const hasReacted = user ? uids.includes(user.id) : false;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => reactToMessage(msg.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all cursor-pointer ${
                              hasReacted
                                ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-200 shadow-sm hover:bg-indigo-600/35'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            }`}
                            title={`${uids.length} reaction${uids.length > 1 ? 's' : ''} (click to toggle)`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-[10px] tabular-nums font-semibold">{uids.length}</span>
                          </button>
                        );
                      })}

                    {/* Quick Add Reaction Button below message */}
                    <button
                      type="button"
                      onClick={() => {
                        setReactionPopoverMsgId(reactionPopoverMsgId === msg.id ? null : msg.id);
                        setShowExtendedReactions(false);
                      }}
                      className="px-1.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                      title="Add reaction"
                    >
                      <Smile size={12} />
                      <Plus size={10} />
                    </button>
                  </div>

                  {/* Hover Quick Action Menu */}
                  <div
                    className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-800 rounded-full px-2 py-1 flex items-center gap-1 shadow-lg z-20 ${
                      isMe ? 'right-0' : 'left-0'
                    }`}
                  >
                    {/* Reaction Popover Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setReactionPopoverMsgId(reactionPopoverMsgId === msg.id ? null : msg.id);
                        setShowExtendedReactions(false);
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                      title="React with Emoji"
                    >
                      <Smile size={13} />
                    </button>
                    <button
                      onClick={() => reactToMessage(msg.id, '❤️')}
                      className="hover:scale-125 transition-transform text-xs"
                      title="Heart"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => reactToMessage(msg.id, '👍')}
                      className="hover:scale-125 transition-transform text-xs"
                      title="Thumbs up"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => reactToMessage(msg.id, '🔥')}
                      className="hover:scale-125 transition-transform text-xs"
                      title="Fire"
                    >
                      🔥
                    </button>
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Reply"
                    >
                      <Reply size={12} />
                    </button>
                    <button
                      onClick={() => pinMessage(msg.id)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Pin Message"
                    >
                      <Pin size={12} />
                    </button>
                    {isMe && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setInputText(msg.content);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Section */}
      <footer className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800">
        {/* Reply preview bar */}
        {replyingTo && (
          <div className="mb-2 p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2 truncate">
              <Reply size={14} className="text-indigo-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-white">{replyingTo.senderName}: </span>
                <span className="truncate">{replyingTo.content}</span>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Selected Attachments Preview */}
        {selectedAttachments.length > 0 && (
          <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
            {selectedAttachments.map((att) => (
              <div
                key={att.id}
                className="relative px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-xs"
              >
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button
                  onClick={() => setSelectedAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice Note Recording State */}
        {isRecordingVoice ? (
          <div className="flex items-center justify-between bg-slate-950 border border-rose-500/40 rounded-2xl px-4 py-2.5 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-semibold text-rose-400">
                Recording Audio Note...
              </span>
              <span className="text-xs font-mono tabular-nums text-white">
                {Math.floor(recordingSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                title="Send Voice Note"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Composer Input */
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />

            {/* Emoji popover button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Add Emoji"
            >
              <Smile size={18} />
            </button>

            {/* Attachment button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Attach Media or File"
            >
              <Paperclip size={18} />
            </button>

            {/* Text input */}
            <input
              type="text"
              placeholder={
                activeConversation.type === 'channel' &&
                !activeConversation.adminIds.includes(user?.id || '')
                  ? 'Only channel administrators can post...'
                  : editingMessageId
                  ? 'Edit your message...'
                  : 'Write a message...'
              }
              disabled={
                activeConversation.type === 'channel' &&
                !activeConversation.adminIds.includes(user?.id || '')
              }
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />

            {/* Mic voice note recorder button or Send button */}
            {inputText.trim() || selectedAttachments.length > 0 ? (
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                title="Send Message"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Hold or click to record voice note"
              >
                <Mic size={18} />
              </button>
            )}
          </form>
        )}

        {/* Emoji Quick Bar */}
        {showEmojiPicker && (
          <div className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 overflow-x-auto">
            {['😀', '😂', '😍', '🔥', '👍', '🎉', '🚀', '❤️', '👏', '🙌', '💡', '✨', '⚡', '💯'].map(
              (emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="p-1 hover:scale-125 transition-transform text-lg"
                >
                  {emoji}
                </button>
              )
            )}
          </div>
        )}
      </footer>
    </main>
  );
};
