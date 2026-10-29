/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { WebSocketProvider } from './context/WebSocketContext.tsx';
import { ChatProvider, useChat } from './context/ChatContext.tsx';
import { CallProvider } from './context/CallContext.tsx';

import { Sidebar } from './components/layout/Sidebar.tsx';
import { ChatArea } from './components/layout/ChatArea.tsx';
import { RightPanel } from './components/layout/RightPanel.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { CallModal } from './components/calling/CallModal.tsx';
import { IncomingCallBanner } from './components/calling/IncomingCallBanner.tsx';
import { CreateModal } from './components/modals/CreateModal.tsx';
import { SettingsModal } from './components/modals/SettingsModal.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { MediaLightbox } from './components/media/MediaLightbox.tsx';
import { AutoInstallModal } from './components/pwa/AutoInstallModal.tsx';
import { OfflineIndicator } from './components/pwa/OfflineIndicator.tsx';

function MainLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeConversationId, setActiveConversationId } = useChat();
  const { t } = useLanguage();

  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [createModalState, setCreateModalState] = useState<{ isOpen: boolean; tab: 'direct' | 'group' | 'channel' }>({
    isOpen: false,
    tab: 'direct',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ url: string | null; type: 'image' | 'video' | null; name?: string }>({
    url: null,
    type: null,
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <img
          src="/src/assets/images/rudactivity_logo_1793024816643.jpg"
          alt="E-RUDACTIVITY"
          className="w-16 h-16 rounded-2xl animate-pulse ring-2 ring-indigo-500/30 object-cover"
        />
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
          <span>{t.connecting}</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Incoming Call Ringing Toast */}
      <IncomingCallBanner />

      {/* Main 3-Panel Responsive Workspace */}
      <div className="flex-1 flex w-full h-full overflow-hidden">
        {/* Left Sidebar (Hidden on mobile if conversation selected) */}
        <div
          className={`${
            activeConversationId ? 'hidden md:flex' : 'flex'
          } h-full shrink-0`}
        >
          <Sidebar
            onOpenCreate={(tab = 'direct') => setCreateModalState({ isOpen: true, tab })}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        </div>

        {/* Center Chat Area (Hidden on mobile if no conversation selected) */}
        <div
          className={`${
            !activeConversationId ? 'hidden md:flex' : 'flex'
          } flex-1 h-full min-w-0`}
        >
          <ChatArea
            onToggleInfoPanel={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
            onOpenLightbox={(url, type, name) => setLightboxState({ url, type, name })}
            onBackToSidebar={() => setActiveConversationId(null)}
          />
        </div>

        {/* Right Info Drawer (Desktop or toggled) */}
        {isInfoPanelOpen && (
          <div className="hidden lg:flex h-full shrink-0 animate-in slide-in-from-right duration-200">
            <RightPanel
              isOpen={isInfoPanelOpen}
              onClose={() => setIsInfoPanelOpen(false)}
              onOpenLightbox={(url, type, name) => setLightboxState({ url, type, name })}
            />
          </div>
        )}
      </div>

      {/* WebRTC Video / Audio Calling Overlay */}
      <CallModal />

      {/* Modals & Dialogs */}
      <CreateModal
        isOpen={createModalState.isOpen}
        initialTab={createModalState.tab}
        onClose={() => setCreateModalState({ isOpen: false, tab: 'direct' })}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <MediaLightbox
        url={lightboxState.url}
        type={lightboxState.type}
        name={lightboxState.name}
        onClose={() => setLightboxState({ url: null, type: null })}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WebSocketProvider>
          <ChatProvider>
            <CallProvider>
              <MainLayout />
              <AutoInstallModal />
              <OfflineIndicator />
            </CallProvider>
          </ChatProvider>
        </WebSocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
