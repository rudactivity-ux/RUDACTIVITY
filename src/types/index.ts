export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  avatar: string;
  coverImage?: string;
  role: UserRole;
  bio?: string;
  isOnline: boolean;
  lastSeen: string;
  statusText?: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  isSuspended?: boolean;
  createdAt: string;
}

export interface PrivacySettings {
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  whoCanCallMe: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  whoCanAddToGroups: 'everyone' | 'contacts';
}

export type ConversationType = 'direct' | 'group' | 'channel';

export interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number; // for audio / voice notes in seconds
}

export interface MessageReaction {
  [emoji: string]: string[]; // emoji => array of userIds
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'call_log' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: MessageType;
  attachments?: Attachment[];
  replyToId?: string;
  replyToPreview?: {
    id: string;
    senderName: string;
    content: string;
  };
  forwardedFrom?: string;
  reactions: MessageReaction;
  isEdited: boolean;
  isPinned: boolean;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationParticipant {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  unreadCount: number;
  isMuted?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  avatar?: string;
  description?: string;
  isPublic?: boolean;
  inviteLink?: string;
  creatorId: string;
  participantIds: string[];
  adminIds: string[];
  participants?: Record<string, ConversationParticipant>;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  otherUser?: User | null;
  lastMessage?: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    type: MessageType;
    createdAt: string;
  };
  pinnedMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';

export interface CallRecord {
  id: string;
  conversationId?: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: 'user' | 'message' | 'channel';
  targetId: string;
  targetContent?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedBy?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  target: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface PlatformHealth {
  uptime: number;
  connectedSockets: number;
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalConversations: number;
  memoryUsageMb: number;
}
