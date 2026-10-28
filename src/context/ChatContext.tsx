import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, Message, Attachment, User } from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';
import { useWebSocket } from './WebSocketContext.tsx';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  messages: Message[];
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  typingUsers: Record<string, string[]>; // conversationId -> usernames[]
  filterTab: 'all' | 'direct' | 'group' | 'channel' | 'archived';
  setFilterTab: (tab: 'all' | 'direct' | 'group' | 'channel' | 'archived') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (content: string, type?: Message['type'], attachments?: Attachment[], replyToId?: string) => Promise<boolean>;
  sendVoiceMessage: (audioBlob: Blob, durationSeconds: number) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  reactToMessage: (messageId: string, emoji: string) => Promise<boolean>;
  pinMessage: (messageId: string) => Promise<boolean>;
  sendTypingStatus: (isTyping: boolean) => void;
  createDirectChat: (targetUserId: string) => Promise<Conversation | null>;
  createGroup: (title: string, description: string, memberIds: string[], avatar?: string) => Promise<Conversation | null>;
  createChannel: (title: string, description: string, isPublic: boolean, avatar?: string) => Promise<Conversation | null>;
  joinConversation: (conversationId: string) => Promise<boolean>;
  togglePinConversation: (conversationId: string) => Promise<boolean>;
  toggleMuteConversation: (conversationId: string) => Promise<boolean>;
  toggleArchiveConversation: (conversationId: string) => Promise<boolean>;
  uploadMedia: (file: File) => Promise<Attachment | null>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { addListener, sendEvent } = useWebSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'channel' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const typingTimeoutsRef = useRef<Record<string, any>>({});

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Load conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        // Auto-select first conversation on initial load if none selected
        if (!activeConversationId && data.conversations?.length > 0) {
          setActiveConversationId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [token, activeConversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !token) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    async function fetchMessages() {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setMessages(data.messages || []);
          // Clear unread count locally
          setConversations(prev =>
            prev.map(c => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)
          );
        }
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }

    fetchMessages();
    return () => { isMounted = false; };
  }, [activeConversationId, token]);

  // Real-time Event Subscriptions
  useEffect(() => {
    // 1. New message
    const unsubMessage = addListener('message:new', (payload: { message: Message }) => {
      const msg = payload.message;
      if (msg.conversationId === activeConversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === msg.conversationId);
        if (idx > -1) {
          const updated = { ...prev[idx] };
          updated.lastMessage = {
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            content: msg.content || (msg.type === 'voice' ? '🎤 Voice message' : '📎 Attachment'),
            type: msg.type,
            createdAt: msg.createdAt,
          };
          updated.updatedAt = msg.createdAt;
          if (msg.conversationId !== activeConversationId) {
            updated.unreadCount = (updated.unreadCount || 0) + 1;
          }
          const rest = prev.filter(c => c.id !== msg.conversationId);
          return [updated, ...rest];
        } else {
          // New conversation appeared, re-fetch
          fetchConversations();
          return prev;
        }
      });
    });

    // 2. Message reaction
    const unsubReaction = addListener('message:reaction', (payload: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages(prev =>
        prev.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)
      );
    });

    // 3. Message updated
    const unsubUpdate = addListener('message:updated', (payload: { message: Message }) => {
      setMessages(prev =>
        prev.map(m => m.id === payload.message.id ? payload.message : m)
      );
    });

    // 4. Message deleted
    const unsubDelete = addListener('message:deleted', (payload: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== payload.messageId));
    });

    // 5. Typing indicator
    const unsubTyping = addListener('conversation:typing', (payload: { conversationId: string; userId: string; username: string; isTyping: boolean }) => {
      const { conversationId, username, isTyping } = payload;
      setTypingUsers(prev => {
        const currentList = prev[conversationId] || [];
        if (isTyping) {
          if (!currentList.includes(username)) {
            return { ...prev, [conversationId]: [...currentList, username] };
          }
        } else {
          return { ...prev, [conversationId]: currentList.filter(u => u !== username) };
        }
        return prev;
      });

      // Clear after 3 seconds safety timeout
      const key = `${conversationId}_${username}`;
      if (typingTimeoutsRef.current[key]) {
        clearTimeout(typingTimeoutsRef.current[key]);
      }
      if (isTyping) {
        typingTimeoutsRef.current[key] = setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).filter(u => u !== username),
          }));
        }, 3000);
      }
    });

    // 6. User presence update
    const unsubPresence = addListener('user:presence', (payload: { userId: string; isOnline: boolean; lastSeen: string }) => {
      setConversations(prev =>
        prev.map(c => {
          if (c.type === 'direct' && c.participantIds.includes(payload.userId)) {
            return {
              ...c,
              otherUser: c.otherUser ? {
                ...c.otherUser,
                isOnline: payload.isOnline,
                lastSeen: payload.lastSeen,
              } : undefined,
            };
          }
          return c;
        })
      );
    });

    // 7. Conversation created
    const unsubConvCreated = addListener('conversation:created', (payload: { conversation: Conversation }) => {
      setConversations(prev => {
        if (prev.some(c => c.id === payload.conversation.id)) return prev;
        return [payload.conversation, ...prev];
      });
    });

    return () => {
      unsubMessage();
      unsubReaction();
      unsubUpdate();
      unsubDelete();
      unsubTyping();
      unsubPresence();
      unsubConvCreated();
    };
  }, [addListener, activeConversationId, fetchConversations]);

  // Actions
  const sendMessage = async (
    content: string,
    type: Message['type'] = 'text',
    attachments?: Attachment[],
    replyToId?: string
  ): Promise<boolean> => {
    if (!activeConversationId || !token) return false;

    try {
      const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          type,
          attachments,
          replyToId,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, durationSeconds: number): Promise<boolean> => {
    if (!activeConversationId || !token) return false;

    // Convert blob to base64
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          // Upload audio file
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              base64Data,
              fileName: `voice_note_${Date.now()}.webm`,
              mimeType: 'audio/webm',
            }),
          });

          if (uploadRes.ok) {
            const uploadedFile = await uploadRes.json();
            const attachment: Attachment = {
              id: `att_${Date.now()}`,
              url: uploadedFile.url,
              name: uploadedFile.name,
              size: uploadedFile.size,
              mimeType: uploadedFile.mimeType,
              duration: durationSeconds,
            };

            const success = await sendMessage('', 'voice', [attachment]);
            resolve(success);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.error('Failed to upload voice message:', err);
          resolve(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    });
  };

  const uploadMedia = async (file: File): Promise<Attachment | null> => {
    if (!token) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              base64Data,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            resolve({
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              url: data.url,
              name: data.name,
              size: data.size,
              mimeType: data.mimeType,
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('Upload failed:', e);
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const editMessage = async (messageId: string, content: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      return res.ok;
    } catch (err) {
      console.error('Edit message error:', err);
      return false;
    }
  };

  const deleteMessage = async (messageId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch (err) {
      console.error('Delete message error:', err);
      return false;
    }
  };

  const reactToMessage = async (messageId: string, emoji: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      return res.ok;
    } catch (err) {
      console.error('React error:', err);
      return false;
    }
  };

  const pinMessage = async (messageId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch (err) {
      console.error('Pin error:', err);
      return false;
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (activeConversationId) {
      sendEvent('typing', { conversationId: activeConversationId, isTyping });
    }
  };

  const createDirectChat = async (targetUserId: string): Promise<Conversation | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setActiveConversationId(data.conversation.id);
        return data.conversation;
      }
    } catch (err) {
      console.error('Create direct chat error:', err);
    }
    return null;
  };

  const createGroup = async (
    title: string,
    description: string,
    memberIds: string[],
    avatar?: string
  ): Promise<Conversation | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/conversations/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, memberIds, avatar }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setActiveConversationId(data.conversation.id);
        return data.conversation;
      }
    } catch (err) {
      console.error('Create group error:', err);
    }
    return null;
  };

  const createChannel = async (
    title: string,
    description: string,
    isPublic: boolean,
    avatar?: string
  ): Promise<Conversation | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/conversations/channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, isPublic, avatar }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setActiveConversationId(data.conversation.id);
        return data.conversation;
      }
    } catch (err) {
      console.error('Create channel error:', err);
    }
    return null;
  };

  const joinConversation = async (conversationId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchConversations();
        setActiveConversationId(conversationId);
        return true;
      }
    } catch (err) {
      console.error('Join error:', err);
    }
    return false;
  };

  const togglePinConversation = async (conversationId: string): Promise<boolean> => {
    const target = conversations.find(c => c.id === conversationId);
    if (!target || !token) return false;
    const newPinned = !target.isPinned;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPinned: newPinned }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, isPinned: newPinned } : c)
        );
        return true;
      }
    } catch (err) {
      console.error('Toggle pin error:', err);
    }
    return false;
  };

  const toggleMuteConversation = async (conversationId: string): Promise<boolean> => {
    const target = conversations.find(c => c.id === conversationId);
    if (!target || !token) return false;
    const newMuted = !target.isMuted;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isMuted: newMuted }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, isMuted: newMuted } : c)
        );
        return true;
      }
    } catch (err) {
      console.error('Toggle mute error:', err);
    }
    return false;
  };

  const toggleArchiveConversation = async (conversationId: string): Promise<boolean> => {
    const target = conversations.find(c => c.id === conversationId);
    if (!target || !token) return false;
    const newArchived = !target.isArchived;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isArchived: newArchived }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, isArchived: newArchived } : c)
        );
        return true;
      }
    } catch (err) {
      console.error('Toggle archive error:', err);
    }
    return false;
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        messages,
        isLoadingMessages,
        isLoadingConversations,
        typingUsers,
        filterTab,
        setFilterTab,
        searchQuery,
        setSearchQuery,
        setActiveConversationId,
        sendMessage,
        sendVoiceMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        pinMessage,
        sendTypingStatus,
        createDirectChat,
        createGroup,
        createChannel,
        joinConversation,
        togglePinConversation,
        toggleMuteConversation,
        toggleArchiveConversation,
        uploadMedia,
        refreshConversations: fetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
