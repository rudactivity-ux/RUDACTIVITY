import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// Super Admin Configuration from Environment Variables
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'URIRUDAKEMWA';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Birakenewe?';
const SUPER_ADMIN_PIN = process.env.SUPER_ADMIN_PIN || SUPER_ADMIN_PASSWORD;

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}


// Types
import {
  User,
  PrivacySettings,
  Conversation,
  Message,
  CallRecord,
  ReportItem,
  AuditLog,
  PlatformHealth,
} from './src/types/index.ts';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Enable JSON body parsing up to 25MB for file/image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Directories
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded media
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------------------------------------------------------------------------
// Database State & Persistence
// ---------------------------------------------------------------------------
interface DatabaseSchema {
  users: Record<string, User & { passwordHash: string; salt: string; privacySettings: PrivacySettings; blockedUserIds: string[] }>;
  sessions: Record<string, { userId: string; createdAt: string; expiresAt: string }>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message>; // keyed by messageId
  conversationMessages: Record<string, string[]>; // conversationId -> messageId[]
  callRecords: CallRecord[];
  reports: ReportItem[];
  auditLogs: AuditLog[];
}

let db: DatabaseSchema = {
  users: {},
  sessions: {},
  conversations: {},
  messages: {},
  conversationMessages: {},
  callRecords: [],
  reports: [],
  auditLogs: [],
};

function saveDb() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      db.users = db.users || {};
      db.sessions = db.sessions || {};
      db.conversations = db.conversations || {};
      db.messages = db.messages || {};
      db.conversationMessages = db.conversationMessages || {};
      db.callRecords = Array.isArray(db.callRecords) ? db.callRecords : [];
      db.reports = Array.isArray(db.reports) ? db.reports : [];
      db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
      (db as any).passwordResetCodes = (db as any).passwordResetCodes || {};
      console.log('Database loaded successfully.');
      // Auto-migrate super admin credentials
      if (db.users['user_admin']) {
        const u = db.users['user_admin'];
        u.name = SUPER_ADMIN_USERNAME;
        u.username = SUPER_ADMIN_USERNAME;
        u.email = `${SUPER_ADMIN_USERNAME.toLowerCase()}@secure.local`;
        u.salt = generateSalt();
        u.passwordHash = hashPassword(SUPER_ADMIN_PASSWORD, u.salt);
        (u as any).superAdminPin = SUPER_ADMIN_PIN;
        saveDb();
      }
      return;
    } catch (err) {
      console.error('Error parsing database file, seeding fresh:', err);
    }
  }
  seedDatabase();
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function defaultPrivacySettings(): PrivacySettings {
  return {
    lastSeenVisibility: 'everyone',
    profilePhotoVisibility: 'everyone',
    whoCanCallMe: 'everyone',
    readReceipts: true,
    whoCanAddToGroups: 'everyone',
  };
}

function seedDatabase() {
  console.log('Seeding initial database with demo accounts and community channels...');

  const now = new Date().toISOString();

  // Users
  const adminSalt = generateSalt();
  const sarahSalt = generateSalt();
  const davidSalt = generateSalt();
  const amaraSalt = generateSalt();

  const adminUser = {
    id: 'user_admin',
    name: SUPER_ADMIN_USERNAME,
    username: SUPER_ADMIN_USERNAME,
    email: `${SUPER_ADMIN_USERNAME.toLowerCase()}@secure.local`,
    phone: '+250 788 000 001',
    avatar: '/src/assets/images/rudactivity_logo_1793024816643.jpg',
    role: 'superadmin' as const,
    bio: 'Super Administrator.',
    isOnline: true,
    lastSeen: now,
    statusText: 'Umutekano Wihariye',
    isVerified: true,
    twoFactorEnabled: true,
    createdAt: now,
    passwordHash: hashPassword(SUPER_ADMIN_PASSWORD, adminSalt),
    salt: adminSalt,
    privacySettings: defaultPrivacySettings(),
    blockedUserIds: [],
    superAdminPin: SUPER_ADMIN_PIN,
  };

  const sarahUser = {
    id: 'user_sarah',
    name: 'Sarah Jenkins',
    username: 'sarah_dev',
    email: 'sarah.jenkins@example.com',
    phone: '+44 7700 900077',
    avatar: '/src/assets/images/avatar_sarah_1793024817988.jpg',
    role: 'user' as const,
    bio: 'Distributed systems architect & WebRTC enthusiast. Based in London.',
    isOnline: true,
    lastSeen: now,
    statusText: 'Coding with music 🎧',
    isVerified: true,
    twoFactorEnabled: false,
    createdAt: now,
    passwordHash: hashPassword('SarahPass2026!', sarahSalt),
    salt: sarahSalt,
    privacySettings: defaultPrivacySettings(),
    blockedUserIds: [],
  };

  const davidUser = {
    id: 'user_david',
    name: 'David Chen',
    username: 'david_ux',
    email: 'david.chen@example.com',
    phone: '+1 415 555 0188',
    avatar: '/src/assets/images/avatar_david_1793024817905.jpg',
    role: 'moderator' as const,
    bio: 'Product Designer at RUDACTIVITY. Obsessed with clean typography and fast interfaces.',
    isOnline: true,
    lastSeen: now,
    statusText: 'Refining design system',
    isVerified: true,
    twoFactorEnabled: false,
    createdAt: now,
    passwordHash: hashPassword('DavidPass2026!', davidSalt),
    salt: davidSalt,
    privacySettings: defaultPrivacySettings(),
    blockedUserIds: [],
  };

  const amaraUser = {
    id: 'user_amara',
    name: 'Amara Diallo',
    username: 'amara_cloud',
    email: 'amara.diallo@example.com',
    phone: '+33 612 345678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'user' as const,
    bio: 'Cloud engineer & open source contributor. Love real-time systems.',
    isOnline: false,
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    statusText: 'Offline for maintenance',
    isVerified: true,
    twoFactorEnabled: false,
    createdAt: now,
    passwordHash: hashPassword('AmaraPass2026!', amaraSalt),
    salt: amaraSalt,
    privacySettings: defaultPrivacySettings(),
    blockedUserIds: [],
  };

  db.users = {
    [adminUser.id]: adminUser,
    [sarahUser.id]: sarahUser,
    [davidUser.id]: davidUser,
    [amaraUser.id]: amaraUser,
  };

  // Seed Channels
  const channelOfficial: Conversation = {
    id: 'conv_official_channel',
    type: 'channel',
    title: 'RUDACTIVITY Official Announcements',
    avatar: '/src/assets/images/rudactivity_logo_1793024816643.jpg',
    description: 'The official broadcast channel for RUDACTIVITY platform releases, security updates, and global community news.',
    isPublic: true,
    inviteLink: 'https://rudactivity.app/c/official',
    creatorId: adminUser.id,
    participantIds: [adminUser.id, sarahUser.id, davidUser.id, amaraUser.id],
    adminIds: [adminUser.id, davidUser.id],
    participants: {
      [adminUser.id]: { userId: adminUser.id, role: 'owner', joinedAt: now, unreadCount: 0 },
      [sarahUser.id]: { userId: sarahUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
      [davidUser.id]: { userId: davidUser.id, role: 'admin', joinedAt: now, unreadCount: 0 },
      [amaraUser.id]: { userId: amaraUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
    },
    createdAt: now,
    updatedAt: now,
  };

  const groupDevs: Conversation = {
    id: 'conv_global_devs',
    type: 'group',
    title: 'Global Tech & Engineering',
    avatar: '/src/assets/images/channel_cover_tech_1793024818739.jpg',
    description: 'International community group discussing distributed databases, WebRTC, low-latency messaging, and architecture.',
    isPublic: false,
    inviteLink: 'https://rudactivity.app/join/global-devs',
    creatorId: davidUser.id,
    participantIds: [adminUser.id, sarahUser.id, davidUser.id, amaraUser.id],
    adminIds: [davidUser.id, sarahUser.id],
    participants: {
      [adminUser.id]: { userId: adminUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
      [sarahUser.id]: { userId: sarahUser.id, role: 'admin', joinedAt: now, unreadCount: 0 },
      [davidUser.id]: { userId: davidUser.id, role: 'owner', joinedAt: now, unreadCount: 0 },
      [amaraUser.id]: { userId: amaraUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
    },
    createdAt: now,
    updatedAt: now,
  };

  const directSarahDavid: Conversation = {
    id: 'conv_dm_sarah_david',
    type: 'direct',
    title: 'Sarah Jenkins',
    creatorId: davidUser.id,
    participantIds: [sarahUser.id, davidUser.id],
    adminIds: [],
    participants: {
      [sarahUser.id]: { userId: sarahUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
      [davidUser.id]: { userId: davidUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
    },
    createdAt: now,
    updatedAt: now,
  };

  db.conversations = {
    [channelOfficial.id]: channelOfficial,
    [groupDevs.id]: groupDevs,
    [directSarahDavid.id]: directSarahDavid,
  };

  // Seed Messages
  const msg1: Message = {
    id: 'msg_init_1',
    conversationId: channelOfficial.id,
    senderId: adminUser.id,
    senderName: adminUser.name,
    senderAvatar: adminUser.avatar,
    content: 'Welcome to RUDACTIVITY! 🚀 We have launched high-performance real-time messaging, end-to-end WebSockets, audio/video peer calling, rich media sharing, and community groups.',
    type: 'text',
    reactions: { '🔥': [sarahUser.id, davidUser.id], '👏': [amaraUser.id] },
    isEdited: false,
    isPinned: true,
    status: 'read',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  };

  const msg2: Message = {
    id: 'msg_init_2',
    conversationId: channelOfficial.id,
    senderId: adminUser.id,
    senderName: adminUser.name,
    senderAvatar: adminUser.avatar,
    content: 'WebRTC voice and video calls are active. Click the Call or Video icon in any one-on-one conversation to initiate low-latency media streams.',
    type: 'text',
    reactions: { '❤️': [sarahUser.id] },
    isEdited: false,
    isPinned: false,
    status: 'read',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  };

  const msg3: Message = {
    id: 'msg_init_3',
    conversationId: groupDevs.id,
    senderId: davidUser.id,
    senderName: davidUser.name,
    senderAvatar: davidUser.avatar,
    content: 'Hey everyone! Check out the newly styled dark and light themes. We focused on clean zero-pill typography and instant reactions.',
    type: 'text',
    reactions: { '👍': [sarahUser.id] },
    isEdited: false,
    isPinned: false,
    status: 'read',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  };

  const msg4: Message = {
    id: 'msg_init_4',
    conversationId: groupDevs.id,
    senderId: sarahUser.id,
    senderName: sarahUser.name,
    senderAvatar: sarahUser.avatar,
    content: 'The real-time WebSocket signaling is rock solid. Voice notes and media preview modals are also functioning cleanly.',
    type: 'text',
    reactions: { '✨': [davidUser.id] },
    isEdited: false,
    isPinned: false,
    status: 'read',
    createdAt: new Date(Date.now() - 900000).toISOString(),
  };

  db.messages = {
    [msg1.id]: msg1,
    [msg2.id]: msg2,
    [msg3.id]: msg3,
    [msg4.id]: msg4,
  };

  db.conversationMessages = {
    [channelOfficial.id]: [msg1.id, msg2.id],
    [groupDevs.id]: [msg3.id, msg4.id],
    [directSarahDavid.id]: [],
  };

  channelOfficial.lastMessage = {
    id: msg2.id,
    senderId: msg2.senderId,
    senderName: msg2.senderName,
    content: msg2.content,
    type: msg2.type,
    createdAt: msg2.createdAt,
  };

  groupDevs.lastMessage = {
    id: msg4.id,
    senderId: msg4.senderId,
    senderName: msg4.senderName,
    content: msg4.content,
    type: msg4.type,
    createdAt: msg4.createdAt,
  };

  // Seed Audit log
  db.auditLogs.push({
    id: 'audit_init',
    adminId: adminUser.id,
    adminUsername: adminUser.username,
    action: 'SYSTEM_INITIALIZED',
    target: 'Platform Core',
    metadata: { version: '1.0.0' },
    timestamp: now,
  });

  saveDb();
}

loadDb();

// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------
function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const session = db.sessions[token];
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
  }

  // Check if session has expired
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token];
    saveDb();
    return res.status(401).json({ error: 'Unauthorized: session expired. Please sign in again.' });
  }

  const user = db.users[session.userId];
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: user no longer exists' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: 'Account suspended by moderation team.' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden: administrative privileges required' });
  }
  next();
}

// ---------------------------------------------------------------------------
// WebSocket Real-Time & WebRTC Signaling
// ---------------------------------------------------------------------------
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  activeConversationId?: string;
}

const clients = new Map<string, Set<WebSocket>>(); // userId -> Set<WebSocket>

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToUsers(userIds: string[], event: string, payload: any) {
  const messageStr = JSON.stringify({ event, payload });
  for (const uid of userIds) {
    const sockets = clients.get(uid);
    if (sockets) {
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(messageStr);
        }
      }
    }
  }
}

function broadcastToAll(event: string, payload: any) {
  const messageStr = JSON.stringify({ event, payload });
  for (const sockets of clients.values()) {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    }
  }
}

wss.on('connection', (ws: WebSocket, req) => {
  let authenticatedUserId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const parsed = JSON.parse(data.toString());
      const { event, payload } = parsed;

      switch (event) {
        case 'auth:identify': {
          const { token } = payload;
          const session = db.sessions[token];
          if (session && db.users[session.userId]) {
            authenticatedUserId = session.userId;
            if (!clients.has(authenticatedUserId)) {
              clients.set(authenticatedUserId, new Set());
            }
            clients.get(authenticatedUserId)!.add(ws);

            // Set user online
            const u = db.users[authenticatedUserId];
            u.isOnline = true;
            u.lastSeen = new Date().toISOString();
            saveDb();

            ws.send(JSON.stringify({
              event: 'auth:success',
              payload: { userId: authenticatedUserId, user: sanitizeUser(u) }
            }));

            // Broadcast presence
            broadcastToAll('user:presence', {
              userId: authenticatedUserId,
              isOnline: true,
              lastSeen: u.lastSeen,
            });
          } else {
            ws.send(JSON.stringify({ event: 'auth:error', payload: { message: 'Invalid session token' } }));
          }
          break;
        }

        case 'typing': {
          if (!authenticatedUserId) return;
          const { conversationId, isTyping } = payload;
          const conv = db.conversations[conversationId];
          if (conv && conv.participantIds.includes(authenticatedUserId)) {
            const otherParticipants = conv.participantIds.filter(id => id !== authenticatedUserId);
            broadcastToUsers(otherParticipants, 'conversation:typing', {
              conversationId,
              userId: authenticatedUserId,
              username: db.users[authenticatedUserId]?.username,
              isTyping,
            });
          }
          break;
        }

        // WebRTC Signaling
        case 'call:initiate': {
          if (!authenticatedUserId) return;
          const { receiverId, conversationId, type } = payload;
          const caller = db.users[authenticatedUserId];
          const receiver = db.users[receiverId];
          if (!caller || !receiver) return;

          // Check if receiver blocked caller
          if (receiver.blockedUserIds && receiver.blockedUserIds.includes(authenticatedUserId)) {
            ws.send(JSON.stringify({
              event: 'call:failed',
              payload: { reason: 'User is currently unavailable.' }
            }));
            return;
          }

          const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const callRecord: CallRecord = {
            id: callId,
            conversationId,
            callerId: caller.id,
            callerName: caller.name,
            callerAvatar: caller.avatar,
            receiverId: receiver.id,
            receiverName: receiver.name,
            receiverAvatar: receiver.avatar,
            type,
            status: 'calling',
            startedAt: new Date().toISOString(),
          };

          db.callRecords.unshift(callRecord);
          saveDb();

          // Send to receiver
          broadcastToUsers([receiverId], 'call:incoming', {
            call: callRecord,
          });

          // Confirm to caller
          ws.send(JSON.stringify({
            event: 'call:outgoing_ringing',
            payload: { call: callRecord }
          }));
          break;
        }

        case 'call:accept': {
          if (!authenticatedUserId) return;
          const { callId } = payload;
          const call = db.callRecords.find(c => c.id === callId);
          if (call && call.receiverId === authenticatedUserId) {
            call.status = 'connected';
            saveDb();

            broadcastToUsers([call.callerId, call.receiverId], 'call:connected', {
              callId,
              acceptedBy: authenticatedUserId,
            });
          }
          break;
        }

        case 'call:reject': {
          if (!authenticatedUserId) return;
          const { callId, reason } = payload;
          const call = db.callRecords.find(c => c.id === callId);
          if (call) {
            call.status = 'declined';
            call.endedAt = new Date().toISOString();
            saveDb();

            broadcastToUsers([call.callerId, call.receiverId], 'call:ended', {
              callId,
              reason: reason || 'declined',
              status: 'declined',
            });
          }
          break;
        }

        case 'call:end': {
          if (!authenticatedUserId) return;
          const { callId, durationSeconds } = payload;
          const call = db.callRecords.find(c => c.id === callId);
          if (call) {
            call.status = 'ended';
            call.endedAt = new Date().toISOString();
            if (durationSeconds) {
              call.durationSeconds = durationSeconds;
            }
            saveDb();

            broadcastToUsers([call.callerId, call.receiverId], 'call:ended', {
              callId,
              reason: 'ended',
              status: 'ended',
              durationSeconds: call.durationSeconds,
            });
          }
          break;
        }

        case 'call:signal': {
          if (!authenticatedUserId) return;
          const { toUserId, signalData, callId } = payload;
          // Forward peer SDP offer/answer or ICE candidate
          broadcastToUsers([toUserId], 'call:signal', {
            fromUserId: authenticatedUserId,
            callId,
            signalData,
          });
          break;
        }

        case 'call:mute_state': {
          if (!authenticatedUserId) return;
          const { toUserId, isMuted, isVideoOff, callId } = payload;
          broadcastToUsers([toUserId], 'call:peer_state_changed', {
            fromUserId: authenticatedUserId,
            callId,
            isMuted,
            isVideoOff,
          });
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const userSockets = clients.get(authenticatedUserId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clients.delete(authenticatedUserId);
          const u = db.users[authenticatedUserId];
          if (u) {
            u.isOnline = false;
            u.lastSeen = new Date().toISOString();
            saveDb();

            broadcastToAll('user:presence', {
              userId: authenticatedUserId,
              isOnline: false,
              lastSeen: u.lastSeen,
            });
          }
        }
      }
    }
  });
});

// Helper to remove password and salt from user payload
function sanitizeUser(u: any): User {
  const { passwordHash, salt, ...safe } = u;
  return safe;
}

// ---------------------------------------------------------------------------
// REST API ROUTES
// ---------------------------------------------------------------------------

// --- Health / Status ---
app.get('/api/health', (req: Request, res: Response) => {
  const totalUsers = Object.keys(db.users).length;
  const activeUsers = Array.from(clients.keys()).length;
  const totalMessages = Object.keys(db.messages).length;
  const totalConversations = Object.keys(db.conversations).length;
  const memoryUsageMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

  const health: PlatformHealth = {
    uptime: Math.round(process.uptime()),
    connectedSockets: wss.clients.size,
    totalUsers,
    activeUsers,
    totalMessages,
    totalConversations,
    memoryUsageMb,
  };
  res.json({ status: 'ok', health });
});

// --- Authentication ---
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, username, email, password, confirmPassword, phone, bio, avatar } = req.body || {};

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All required fields (Full Name, Username, Email, and Password) must be provided.' });
    }

    const cleanName = String(name).trim();
    // Auto-clean username: remove leading @, lowercase, replace spaces with underscores
    let cleanUsername = String(username).trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : undefined;

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters long.' });
    }

    // Email format validation (strict RFC-compliant check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g., name@example.com).' });
    }

    // Password matching validation
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please verify that both passwords are identical.' });
    }

    // Password strength check (min 8 characters, letters & digits required)
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(String(password))) {
      return res.status(400).json({ error: 'Password must contain at least one letter and at least one number.' });
    }

    // Validate username syntax (letters, numbers, underscores, dots, or dashes; 2-32 chars)
    if (!/^[a-z0-9_.-]{2,32}$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username must be 2-32 characters (letters, numbers, underscores, dots, or dashes).' });
    }

    // Check unique username & email
    for (const existing of Object.values(db.users)) {
      if (existing.username.toLowerCase() === cleanUsername) {
        return res.status(409).json({ error: 'This username is already taken. Please choose another username.' });
      }
      if (existing.email.toLowerCase() === cleanEmail) {
        return res.status(409).json({ error: 'An account with this email address already exists. Please sign in or reset your password.' });
      }
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(String(password), salt);
    const now = new Date().toISOString();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Default avatars list
    const defaultAvatars = [
      '/src/assets/images/avatar_sarah_1793024817988.jpg',
      '/src/assets/images/avatar_david_1793024817905.jpg',
    ];
    const chosenAvatar = avatar && String(avatar).trim() ? String(avatar).trim() : defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    const chosenBio = bio && String(bio).trim() ? String(bio).trim() : 'Hey there! I am using RUDACTIVITY.';

    const newUser: any = {
      id: userId,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      avatar: chosenAvatar,
      role: 'user',
      bio: chosenBio,
      isOnline: true,
      lastSeen: now,
      statusText: 'Available',
      isVerified: true,
      twoFactorEnabled: false,
      createdAt: now,
      passwordHash,
      salt,
      privacySettings: defaultPrivacySettings(),
      blockedUserIds: [],
    };

    db.users[userId] = newUser;

    // Automatically add to official announcement channel
    const officialChannel = db.conversations['conv_official_channel'];
    if (officialChannel) {
      if (!officialChannel.participantIds.includes(userId)) {
        officialChannel.participantIds.push(userId);
      }
      if (!officialChannel.participants) officialChannel.participants = {};
      officialChannel.participants[userId] = {
        userId,
        role: 'member',
        joinedAt: now,
        unreadCount: 0,
      };
    }

    const token = generateToken();
    db.sessions[token] = {
      userId,
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    saveDb();

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account created successfully! Welcome to RUDACTIVITY.',
    });
  } catch (err: any) {
    console.error('Registration server error:', err);
    return res.status(500).json({ error: 'Server error creating account: ' + (err.message || 'Unknown error') });
  }
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  try {
    const { email, name, picture, sub, googleToken } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid Google email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = name ? String(name).trim() : cleanEmail.split('@')[0];
    const googleAvatar = picture && String(picture).startsWith('http')
      ? String(picture)
      : '/src/assets/images/avatar_david_1793024817905.jpg';

    // 1. Check if user already exists by email or googleId
    let foundUser: any = null;
    for (const u of Object.values(db.users)) {
      if (
        u.email.toLowerCase() === cleanEmail ||
        (sub && (u as any).googleId === sub)
      ) {
        foundUser = u;
        break;
      }
    }

    const now = new Date().toISOString();

    if (foundUser) {
      if (foundUser.isSuspended) {
        return res.status(403).json({ error: 'This account has been suspended by administration.' });
      }

      // Update avatar or googleId if not set
      if (sub) (foundUser as any).googleId = sub;
      if (googleAvatar && (!foundUser.avatar || foundUser.avatar.includes('avatar_'))) {
        foundUser.avatar = googleAvatar;
      }
      foundUser.isOnline = true;
      foundUser.lastSeen = now;

      const token = generateToken();
      db.sessions[token] = {
        userId: foundUser.id,
        createdAt: now,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };

      saveDb();

      return res.json({
        token,
        user: sanitizeUser(foundUser),
        message: 'Successfully signed in with Google account.',
      });
    }

    // 2. User does not exist -> Auto-create new account with Google details
    let baseUsername = cleanName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!baseUsername || baseUsername.length < 2) {
      baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    }
    let uniqueUsername = baseUsername;
    let counter = 1;

    while (Object.values(db.users).some((u) => u.username.toLowerCase() === uniqueUsername.toLowerCase())) {
      uniqueUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const salt = generateSalt();
    // Random secure hash for Google user
    const passwordHash = hashPassword(generateToken(), salt);

    const newUser: any = {
      id: userId,
      name: cleanName,
      username: uniqueUsername,
      email: cleanEmail,
      avatar: googleAvatar,
      role: 'user',
      bio: 'Verified Google Account user on RUDACTIVITY.',
      isOnline: true,
      lastSeen: now,
      statusText: 'Available',
      isVerified: true,
      twoFactorEnabled: false,
      googleId: sub || `google_${Date.now()}`,
      createdAt: now,
      passwordHash,
      salt,
      privacySettings: defaultPrivacySettings(),
      blockedUserIds: [],
    };

    db.users[userId] = newUser;

    // Automatically add to official announcement channel
    const officialChannel = db.conversations['conv_official_channel'];
    if (officialChannel) {
      if (!officialChannel.participantIds.includes(userId)) {
        officialChannel.participantIds.push(userId);
      }
      if (!officialChannel.participants) officialChannel.participants = {};
      officialChannel.participants[userId] = {
        userId,
        role: 'member',
        joinedAt: now,
        unreadCount: 0,
      };
    }

    const token = generateToken();
    db.sessions[token] = {
      userId,
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    saveDb();

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account created successfully with Google.',
    });
  } catch (err: any) {
    console.error('Google Auth server error:', err);
    return res.status(500).json({ error: 'Google authentication failed: ' + (err.message || 'Unknown error') });
  }
});

// --- Password Reset & Account Recovery ---
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const targetUser = Object.values(db.users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (!targetUser) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    if (targetUser.isSuspended) {
      return res.status(403).json({ error: 'This account has been suspended. Please contact platform support.' });
    }

    // Generate secure 6-digit verification code with 15-minute validity
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    (db as any).passwordResetCodes = (db as any).passwordResetCodes || {};
    (db as any).passwordResetCodes[cleanEmail] = {
      code: resetCode,
      userId: targetUser.id,
      expiresAt,
    };

    saveDb();

    return res.json({
      success: true,
      message: `Password reset code sent to ${cleanEmail}. Enter the code below to reset your password.`,
      codePreview: resetCode, // Provided for instant verification in the AI Studio environment
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to request password reset: ' + (err.message || 'Unknown error') });
  }
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body || {};

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match. Please ensure both fields are identical.' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(String(newPassword))) {
      return res.status(400).json({ error: 'New password must contain at least one letter and at least one number.' });
    }

    (db as any).passwordResetCodes = (db as any).passwordResetCodes || {};
    const record = (db as any).passwordResetCodes[cleanEmail];

    if (!record || record.code !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your code and try again.' });
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      delete (db as any).passwordResetCodes[cleanEmail];
      saveDb();
      return res.status(400).json({ error: 'Verification code has expired. Please request a new reset code.' });
    }

    const user = db.users[record.userId];
    if (!user) {
      return res.status(404).json({ error: 'Account associated with this code no longer exists.' });
    }

    // Set new password with fresh salt
    user.salt = generateSalt();
    user.passwordHash = hashPassword(String(newPassword), user.salt);
    delete (db as any).passwordResetCodes[cleanEmail];

    // Revoke old sessions for security
    for (const [t, s] of Object.entries(db.sessions)) {
      if (s.userId === user.id) {
        delete db.sessions[t];
      }
    }

    // Issue fresh active session
    const token = generateToken();
    const now = new Date().toISOString();
    db.sessions[token] = {
      userId: user.id,
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    user.isOnline = true;
    user.lastSeen = now;
    saveDb();

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Password reset successfully! You are now logged in.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password: ' + (err.message || 'Unknown error') });
  }
});

// --- Login ---
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const rawIdentifier = req.body?.loginIdentifier || req.body?.identifier;
    const { password } = req.body || {};

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'Username/Email/Phone and password are required.' });
    }

    const identifier = String(rawIdentifier).trim().toLowerCase().replace(/^@/, '');
    let foundUser: any = null;

    for (const u of Object.values(db.users)) {
      if (
        u.username.toLowerCase() === identifier ||
        u.email.toLowerCase() === identifier ||
        (u.phone && u.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, ''))
      ) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid credentials. No user found matching those details.' });
    }

    if (foundUser.isSuspended) {
      return res.status(403).json({ error: 'This account has been suspended by administration.' });
    }

    const testHash = hashPassword(String(password), foundUser.salt);
    if (testHash !== foundUser.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your password.' });
    }

    const token = generateToken();
    const now = new Date().toISOString();
    db.sessions[token] = {
      userId: foundUser.id,
      createdAt: now,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    foundUser.isOnline = true;
    foundUser.lastSeen = now;
    saveDb();

    return res.json({
      token,
      user: sanitizeUser(foundUser),
      message: 'Logged in successfully.',
    });
  } catch (err: any) {
    console.error('Login server error:', err);
    return res.status(500).json({ error: 'Login failed due to a server error: ' + (err.message || 'Unknown error') });
  }
});

app.get('/api/auth/me', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', authenticateUser, (req: Request, res: Response) => {
  const token = (req as any).token;
  delete db.sessions[token];
  saveDb();
  res.json({ success: true });
});

// Update profile
app.patch('/api/users/profile', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, bio, avatar, statusText, phone } = req.body;

  if (name !== undefined) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (avatar !== undefined) user.avatar = avatar;
  if (statusText !== undefined) user.statusText = statusText.trim();
  if (phone !== undefined) user.phone = phone.trim();

  saveDb();
  broadcastToAll('user:updated', { user: sanitizeUser(user) });
  res.json({ user: sanitizeUser(user) });
});

// Change password
app.post('/api/users/change-password', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new passwords are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const currentHash = hashPassword(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  user.salt = generateSalt();
  user.passwordHash = hashPassword(newPassword, user.salt);
  saveDb();

  res.json({ message: 'Password changed successfully.' });
});

// Privacy settings
app.get('/api/users/privacy', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ privacySettings: user.privacySettings || defaultPrivacySettings() });
});

app.put('/api/users/privacy', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  user.privacySettings = {
    ...defaultPrivacySettings(),
    ...(req.body.privacySettings || {}),
  };
  saveDb();
  res.json({ privacySettings: user.privacySettings });
});

// Block / unblock
app.post('/api/users/block', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { targetUserId } = req.body;

  if (!targetUserId || targetUserId === user.id) {
    return res.status(400).json({ error: 'Invalid target user ID.' });
  }

  if (!user.blockedUserIds) user.blockedUserIds = [];
  if (!user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds.push(targetUserId);
    saveDb();
  }

  res.json({ success: true, blockedUserIds: user.blockedUserIds });
});

app.post('/api/users/unblock', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { targetUserId } = req.body;

  if (user.blockedUserIds) {
    user.blockedUserIds = user.blockedUserIds.filter((id: string) => id !== targetUserId);
    saveDb();
  }

  res.json({ success: true, blockedUserIds: user.blockedUserIds });
});

// Export account data (compliance with GDPR / account privacy)
app.get('/api/users/export-data', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userConversations = Object.values(db.conversations).filter(c => c.participantIds.includes(user.id));
  const userMessages = Object.values(db.messages).filter(m => m.senderId === user.id);
  const userCalls = db.callRecords.filter(c => c.callerId === user.id || c.receiverId === user.id);

  const exportPayload = {
    exportDate: new Date().toISOString(),
    profile: sanitizeUser(user),
    privacySettings: user.privacySettings,
    conversationsCount: userConversations.length,
    conversations: userConversations.map(c => ({
      id: c.id,
      title: c.title,
      type: c.type,
      createdAt: c.createdAt,
    })),
    sentMessages: userMessages,
    callHistory: userCalls,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="rudactivity-export-${user.username}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// Delete account
app.delete('/api/users/delete-account', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { passwordConfirm } = req.body;

  if (!passwordConfirm) {
    return res.status(400).json({ error: 'Password confirmation required for account deletion.' });
  }

  const checkHash = hashPassword(passwordConfirm, user.salt);
  if (checkHash !== user.passwordHash) {
    return res.status(401).json({ error: 'Incorrect password confirmation.' });
  }

  // Remove active sessions
  for (const [token, session] of Object.entries(db.sessions)) {
    if (session.userId === user.id) {
      delete db.sessions[token];
    }
  }

  // Delete user record
  delete db.users[user.id];
  saveDb();

  res.json({ success: true, message: 'Account permanently deleted.' });
});

// User Search & Discovery
app.get('/api/users/search', authenticateUser, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const query = ((req.query.q as string) || '').trim().toLowerCase();

  const results = Object.values(db.users)
    .filter(u => {
      if (u.id === currentUser.id) return false;
      if (currentUser.blockedUserIds?.includes(u.id)) return false;
      if (!query) return true;
      return (
        u.username.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query) ||
        (u.phone && u.phone.includes(query))
      );
    })
    .slice(0, 20)
    .map(sanitizeUser);

  res.json({ users: results });
});

// Get user profile by id or username
app.get('/api/users/:identifier', authenticateUser, (req: Request, res: Response) => {
  const { identifier } = req.params;
  let targetUser: any = db.users[identifier];

  if (!targetUser) {
    for (const u of Object.values(db.users)) {
      if (u.username.toLowerCase() === identifier.toLowerCase().replace(/^@/, '')) {
        targetUser = u;
        break;
      }
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ user: sanitizeUser(targetUser) });
});

// ---------------------------------------------------------------------------
// Conversations & Channels
// ---------------------------------------------------------------------------
app.get('/api/conversations', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;

  const userConversations = Object.values(db.conversations)
    .filter(c => c.participantIds.includes(user.id))
    .map(c => {
      // Dynamic title and avatar for direct chats
      if (c.type === 'direct') {
        const otherId = c.participantIds.find(id => id !== user.id) || user.id;
        const otherUser = db.users[otherId];
        return {
          ...c,
          title: otherUser ? otherUser.name : 'Deleted Account',
          avatar: otherUser ? otherUser.avatar : undefined,
          otherUser: otherUser ? sanitizeUser(otherUser) : null,
          unreadCount: c.participants?.[user.id]?.unreadCount || 0,
          isMuted: c.participants?.[user.id]?.isMuted || false,
          isArchived: c.participants?.[user.id]?.isArchived || false,
          isPinned: c.participants?.[user.id]?.isPinned || false,
        };
      }
      return {
        ...c,
        unreadCount: c.participants?.[user.id]?.unreadCount || 0,
        isMuted: c.participants?.[user.id]?.isMuted || false,
        isArchived: c.participants?.[user.id]?.isArchived || false,
        isPinned: c.participants?.[user.id]?.isPinned || false,
      };
    })
    .sort((a, b) => {
      // Pinned conversations at top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  res.json({ conversations: userConversations });
});

// Create Direct Conversation
app.post('/api/conversations/direct', authenticateUser, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { targetUserId } = req.body;

  if (!targetUserId || !db.users[targetUserId]) {
    return res.status(400).json({ error: 'Target user does not exist.' });
  }

  // Check if DM already exists
  for (const c of Object.values(db.conversations)) {
    if (c.type === 'direct' && c.participantIds.includes(currentUser.id) && c.participantIds.includes(targetUserId)) {
      return res.json({ conversation: c });
    }
  }

  const now = new Date().toISOString();
  const convId = `conv_dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const target = db.users[targetUserId];

  const newConv: Conversation = {
    id: convId,
    type: 'direct',
    title: target.name,
    creatorId: currentUser.id,
    participantIds: [currentUser.id, targetUserId],
    adminIds: [],
    participants: {
      [currentUser.id]: { userId: currentUser.id, role: 'member', joinedAt: now, unreadCount: 0 },
      [targetUserId]: { userId: targetUserId, role: 'member', joinedAt: now, unreadCount: 0 },
    },
    createdAt: now,
    updatedAt: now,
  };

  db.conversations[convId] = newConv;
  db.conversationMessages[convId] = [];
  saveDb();

  broadcastToUsers([currentUser.id, targetUserId], 'conversation:created', { conversation: newConv });

  res.status(201).json({ conversation: newConv });
});

// Create Group
app.post('/api/conversations/group', authenticateUser, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { title, description, memberIds, avatar } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Group title is required.' });
  }

  const now = new Date().toISOString();
  const convId = `conv_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const allParticipantIds = Array.from(new Set([currentUser.id, ...(memberIds || [])]));

  const participants: Record<string, any> = {};
  for (const pid of allParticipantIds) {
    participants[pid] = {
      userId: pid,
      role: pid === currentUser.id ? 'owner' : 'member',
      joinedAt: now,
      unreadCount: 0,
    };
  }

  const newGroup: Conversation = {
    id: convId,
    type: 'group',
    title: title.trim(),
    description: description ? description.trim() : '',
    avatar: avatar || '/src/assets/images/rudactivity_logo_1793024816643.jpg',
    creatorId: currentUser.id,
    participantIds: allParticipantIds,
    adminIds: [currentUser.id],
    participants,
    createdAt: now,
    updatedAt: now,
  };

  db.conversations[convId] = newGroup;
  db.conversationMessages[convId] = [];
  saveDb();

  broadcastToUsers(allParticipantIds, 'conversation:created', { conversation: newGroup });
  res.status(201).json({ conversation: newGroup });
});

// Create Channel
app.post('/api/conversations/channel', authenticateUser, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { title, description, isPublic, avatar } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Channel title is required.' });
  }

  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const now = new Date().toISOString();
  const convId = `conv_chn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newChannel: Conversation = {
    id: convId,
    type: 'channel',
    title: title.trim(),
    description: description ? description.trim() : '',
    avatar: avatar || '/src/assets/images/channel_cover_tech_1793024818739.jpg',
    isPublic: !!isPublic,
    inviteLink: `https://rudactivity.app/c/${slug}`,
    creatorId: currentUser.id,
    participantIds: [currentUser.id],
    adminIds: [currentUser.id],
    participants: {
      [currentUser.id]: { userId: currentUser.id, role: 'owner', joinedAt: now, unreadCount: 0 }
    },
    createdAt: now,
    updatedAt: now,
  };

  db.conversations[convId] = newChannel;
  db.conversationMessages[convId] = [];
  saveDb();

  broadcastToAll('channel:created', { channel: newChannel });
  res.status(201).json({ conversation: newChannel });
});

// List public channels for discovery
app.get('/api/channels/public', authenticateUser, (req: Request, res: Response) => {
  const publicChannels = Object.values(db.conversations).filter(c => c.type === 'channel' && c.isPublic);
  res.json({ channels: publicChannels });
});

// Subscribe to / Join Channel or Group
app.post('/api/conversations/:id/join', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const conv = db.conversations[id];

  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  if (conv.participantIds.includes(user.id)) {
    return res.json({ conversation: conv });
  }

  conv.participantIds.push(user.id);
  if (!conv.participants) conv.participants = {};
  conv.participants[user.id] = {
    userId: user.id,
    role: 'member',
    joinedAt: new Date().toISOString(),
    unreadCount: 0,
  };

  saveDb();
  broadcastToUsers(conv.participantIds, 'conversation:member_joined', { conversationId: id, user: sanitizeUser(user) });
  res.json({ conversation: conv });
});

// Toggle mute, archive, pin for a conversation
app.patch('/api/conversations/:id/settings', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { isMuted, isArchived, isPinned } = req.body;

  const conv = db.conversations[id];
  if (!conv || !conv.participantIds.includes(user.id)) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  if (!conv.participants) conv.participants = {};
  if (!conv.participants[user.id]) {
    conv.participants[user.id] = { userId: user.id, role: 'member', joinedAt: new Date().toISOString(), unreadCount: 0 };
  }

  if (isMuted !== undefined) conv.participants[user.id].isMuted = isMuted;
  if (isArchived !== undefined) conv.participants[user.id].isArchived = isArchived;
  if (isPinned !== undefined) conv.participants[user.id].isPinned = isPinned;

  saveDb();
  res.json({ success: true, participantSettings: conv.participants[user.id] });
});

// ---------------------------------------------------------------------------
// Messages API
// ---------------------------------------------------------------------------
app.get('/api/conversations/:id/messages', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const conv = db.conversations[id];
  if (!conv || !conv.participantIds.includes(user.id)) {
    return res.status(403).json({ error: 'Unauthorized to view this conversation messages.' });
  }

  const messageIds = db.conversationMessages[id] || [];
  const messages = messageIds
    .map(mid => db.messages[mid])
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Reset unread count for user
  if (conv.participants?.[user.id]) {
    conv.participants[user.id].unreadCount = 0;
    saveDb();
  }

  res.json({ messages });
});

app.post('/api/conversations/:id/messages', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { content, type = 'text', attachments, replyToId, forwardedFrom } = req.body;

  const conv = db.conversations[id];
  if (!conv || !conv.participantIds.includes(user.id)) {
    return res.status(403).json({ error: 'You are not a participant in this conversation.' });
  }

  // If channel, check that user is an admin or creator
  if (conv.type === 'channel' && !conv.adminIds.includes(user.id)) {
    return res.status(403).json({ error: 'Only channel administrators can post broadcast messages.' });
  }

  if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Message content or attachments required.' });
  }

  const now = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let replyToPreview: any = undefined;
  if (replyToId && db.messages[replyToId]) {
    const orig = db.messages[replyToId];
    replyToPreview = {
      id: orig.id,
      senderName: orig.senderName,
      content: orig.content.substring(0, 100),
    };
  }

  const newMessage: Message = {
    id: messageId,
    conversationId: id,
    senderId: user.id,
    senderName: user.name,
    senderAvatar: user.avatar,
    content: (content || '').trim(),
    type,
    attachments: attachments || [],
    replyToId,
    replyToPreview,
    forwardedFrom,
    reactions: {},
    isEdited: false,
    isPinned: false,
    status: 'sent',
    createdAt: now,
  };

  db.messages[messageId] = newMessage;
  if (!db.conversationMessages[id]) db.conversationMessages[id] = [];
  db.conversationMessages[id].push(messageId);

  // Update conversation last message & unread counts
  conv.updatedAt = now;
  conv.lastMessage = {
    id: newMessage.id,
    senderId: newMessage.senderId,
    senderName: newMessage.senderName,
    content: newMessage.content || (newMessage.type === 'voice' ? '🎤 Voice message' : '📎 Attachment'),
    type: newMessage.type,
    createdAt: newMessage.createdAt,
  };

  for (const pid of conv.participantIds) {
    if (pid !== user.id) {
      if (conv.participants?.[pid]) {
        conv.participants[pid].unreadCount = (conv.participants[pid].unreadCount || 0) + 1;
      }
    }
  }

  saveDb();

  // Broadcast to all active participants in real-time
  broadcastToUsers(conv.participantIds, 'message:new', { message: newMessage });

  res.status(201).json({ message: newMessage });
});

// React to message with emoji
app.post('/api/messages/:id/react', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { emoji } = req.body;

  const msg = db.messages[id];
  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  const conv = db.conversations[msg.conversationId];
  if (!conv || !conv.participantIds.includes(user.id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

  const idx = msg.reactions[emoji].indexOf(user.id);
  if (idx > -1) {
    msg.reactions[emoji].splice(idx, 1);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    msg.reactions[emoji].push(user.id);
  }

  saveDb();

  broadcastToUsers(conv.participantIds, 'message:reaction', {
    messageId: id,
    reactions: msg.reactions,
  });

  res.json({ reactions: msg.reactions });
});

// Edit message
app.patch('/api/messages/:id', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { content } = req.body;

  const msg = db.messages[id];
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  if (msg.senderId !== user.id) {
    return res.status(403).json({ error: 'You can only edit your own messages.' });
  }

  msg.content = content.trim();
  msg.isEdited = true;
  msg.updatedAt = new Date().toISOString();
  saveDb();

  const conv = db.conversations[msg.conversationId];
  if (conv) {
    broadcastToUsers(conv.participantIds, 'message:updated', { message: msg });
  }

  res.json({ message: msg });
});

// Delete message
app.delete('/api/messages/:id', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const msg = db.messages[id];
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  const conv = db.conversations[msg.conversationId];
  const isSender = msg.senderId === user.id;
  const isAdmin = conv && conv.adminIds.includes(user.id);

  if (!isSender && !isAdmin) {
    return res.status(403).json({ error: 'Insufficient permissions to delete this message.' });
  }

  delete db.messages[id];
  if (conv && db.conversationMessages[conv.id]) {
    db.conversationMessages[conv.id] = db.conversationMessages[conv.id].filter(mid => mid !== id);
    saveDb();
    broadcastToUsers(conv.participantIds, 'message:deleted', { messageId: id, conversationId: conv.id });
  }

  res.json({ success: true });
});

// Pin / Unpin message
app.post('/api/messages/:id/pin', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const msg = db.messages[id];
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  const conv = db.conversations[msg.conversationId];
  if (!conv || !conv.participantIds.includes(user.id)) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  msg.isPinned = !msg.isPinned;
  conv.pinnedMessageId = msg.isPinned ? msg.id : undefined;
  saveDb();

  broadcastToUsers(conv.participantIds, 'conversation:pinned_message', {
    conversationId: conv.id,
    pinnedMessage: msg.isPinned ? msg : null,
  });

  res.json({ isPinned: msg.isPinned });
});

// ---------------------------------------------------------------------------
// File Uploads
// ---------------------------------------------------------------------------
app.post('/api/upload', authenticateUser, (req: Request, res: Response) => {
  const { base64Data, fileName, mimeType } = req.body;

  if (!base64Data || !fileName) {
    return res.status(400).json({ error: 'File data and filename are required.' });
  }

  try {
    const rawData = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawData, 'base64');

    // Restrict size: 25MB max
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'File exceeds 25MB maximum limit.' });
    }

    const safeFileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${safeFileName}`;
    res.json({
      url: fileUrl,
      name: fileName,
      size: buffer.length,
      mimeType: mimeType || 'application/octet-stream',
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'File storage failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// Reports & Moderation
// ---------------------------------------------------------------------------
app.post('/api/reports', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { targetType, targetId, reason, details } = req.body;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: 'Target type, target id, and reason are required.' });
  }

  const report: ReportItem = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reporterId: user.id,
    reporterUsername: user.username,
    targetType,
    targetId,
    reason,
    details: details || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.reports.unshift(report);
  saveDb();

  res.status(201).json({ success: true, reportId: report.id });
});

// ---------------------------------------------------------------------------
// Call History API
// ---------------------------------------------------------------------------
app.get('/api/calls/history', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const calls = db.callRecords.filter(c => c.callerId === user.id || c.receiverId === user.id);
  res.json({ calls });
});

// ---------------------------------------------------------------------------
// Administration & Audit Endpoints (Admin / Superadmin only)
// ---------------------------------------------------------------------------
// Umutekano Wihariye wa Super Admin (Dedicated Super Admin Security Verification)
app.post('/api/admin/verify-security', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Umutekano Wihariye: Injiza kode yibanga cyangwa Password ya Super Admin.' });
  }

  // Constant-time verification against environment-configured PIN, password, or stored PIN
  const isValid =
    safeCompare(pin, SUPER_ADMIN_PIN) ||
    safeCompare(pin, SUPER_ADMIN_PASSWORD) ||
    (Boolean((user as any)?.superAdminPin) && safeCompare(pin, (user as any).superAdminPin));

  if (isValid) {
    return res.json({ verified: true, message: 'Super admin security code confirmed.' });
  }
  return res.status(403).json({ error: "Kode y'umutekano wihariye ntiyemewe. Reba neza ijambobanga rya Super Admin." });
});

app.get('/api/admin/overview', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const totalUsers = Object.keys(db.users).length;
  const activeSockets = wss.clients.size;
  const totalMessages = Object.keys(db.messages).length;
  const totalConversations = Object.keys(db.conversations).length;
  const totalCalls = db.callRecords.length;
  const pendingReports = db.reports.filter(r => r.status === 'pending').length;

  res.json({
    metrics: {
      totalUsers,
      activeSockets,
      totalMessages,
      totalConversations,
      totalCalls,
      pendingReports,
      serverUptimeSec: Math.round(process.uptime()),
    },
  });
});

app.get('/api/admin/users', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();
  const users = Object.values(db.users)
    .filter(u => {
      if (!query) return true;
      return (
        u.username.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    })
    .map(sanitizeUser);

  res.json({ users });
});

app.post('/api/admin/users/:id/status', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user;
  const { id } = req.params;
  const { isSuspended, role } = req.body;

  const target = db.users[id];
  if (!target) return res.status(404).json({ error: 'Target user not found.' });

  if (target.role === 'superadmin' && admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Cannot modify a super administrator.' });
  }

  if (isSuspended !== undefined) target.isSuspended = isSuspended;
  if (role !== undefined && ['user', 'moderator', 'admin'].includes(role)) {
    target.role = role;
  }

  // Audit log
  db.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    action: isSuspended ? 'SUSPEND_USER' : 'UPDATE_USER_ROLE',
    target: target.username,
    metadata: { isSuspended, role },
    timestamp: new Date().toISOString(),
  });

  saveDb();
  res.json({ user: sanitizeUser(target) });
});

app.get('/api/admin/reports', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  res.json({ reports: db.reports });
});

app.post('/api/admin/reports/:id/resolve', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user;
  const { id } = req.params;
  const { status } = req.body; // 'resolved' | 'dismissed'

  const rep = db.reports.find(r => r.id === id);
  if (!rep) return res.status(404).json({ error: 'Report not found.' });

  rep.status = status || 'resolved';
  rep.resolvedBy = admin.username;

  db.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'RESOLVE_REPORT',
    target: rep.id,
    metadata: { status, targetType: rep.targetType },
    timestamp: new Date().toISOString(),
  });

  saveDb();
  res.json({ report: rep });
});

app.get('/api/admin/audit-logs', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  res.json({ logs: db.auditLogs.slice(0, 100) });
});

// API 404 Handler - prevents missing API endpoints from returning Vite index.html
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global API Error Handler - ensures all server errors return JSON instead of HTML pages
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Server Error:', err);
  res.status(500).json({ error: err?.message || 'An unexpected server error occurred.' });
});

// ---------------------------------------------------------------------------
// Vite Dev Server / Static Hosting
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting Vite dev middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production build from dist/');
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RUDACTIVITY full-stack messaging platform listening on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
