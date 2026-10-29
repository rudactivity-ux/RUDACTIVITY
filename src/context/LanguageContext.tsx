import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'rw';

export interface Translations {
  // Common / Brand
  appName: string;
  appTagline: string;
  connecting: string;
  cancel: string;
  save: string;
  saving: string;
  saved: string;
  delete: string;
  confirm: string;
  back: string;
  next: string;
  loading: string;
  error: string;
  success: string;
  or: string;
  search: string;

  // Language switcher
  language: string;
  selectLanguage: string;
  english: string;
  kinyarwanda: string;

  // Auth & Onboarding
  signIn: string;
  createAccount: string;
  continueWithGoogle: string;
  forgotPassword: string;
  passwordRecovery: string;
  sendResetCode: string;
  enterResetCode: string;
  resetPassword: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step1Subtitle: string;
  step2Subtitle: string;
  step3Subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  countryLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  bioLabel: string;
  bioPlaceholder: string;
  profilePhotoLabel: string;
  chooseFromDevice: string;
  uploadingPhoto: string;
  removePhoto: string;
  presetAvatars: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  usernameHint: string;
  usernameAvailable: string;
  usernameTaken: string;
  suggestUsername: string;
  memberCardPreview: string;
  completeRegistration: string;
  loginSuccess: string;
  registerSuccess: string;
  logout: string;

  // Sidebar & Navigation
  chats: string;
  groups: string;
  channels: string;
  calls: string;
  archived: string;
  settings: string;
  adminPanel: string;
  newChat: string;
  newGroup: string;
  newChannel: string;
  noConversations: string;
  online: string;
  offline: string;
  typing: string;
  pinConversation: string;
  unpinConversation: string;
  muteConversation: string;
  unmuteConversation: string;
  archiveConversation: string;

  // Chat Area
  typeMessage: string;
  send: string;
  reply: string;
  copy: string;
  edit: string;
  deleteMessage: string;
  forward: string;
  pinnedMessage: string;
  voiceMessage: string;
  recordingVoice: string;
  attachMedia: string;
  selectToStartChat: string;

  // Calls
  startVoiceCall: string;
  startVideoCall: string;
  incomingCall: string;
  callInProgress: string;
  callEnded: string;
  acceptCall: string;
  declineCall: string;

  // Settings
  profileSettings: string;
  privacySettings: string;
  securitySettings: string;
  appearanceSettings: string;
  dataSettings: string;
  statusLabel: string;
  statusPlaceholder: string;
  currentPassword: string;
  newPasswordLabel: string;
  changePasswordBtn: string;
  installApp: string;
  installAppPcPhone: string;
  pwaInstalled: string;
  exportData: string;
  deleteAccount: string;
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    // Brand
    appName: 'E-RUDACTIVITY',
    appTagline: 'Global Social Messaging, High-Definition Calls & Channels',
    connecting: 'CONNECTING TO E-RUDACTIVITY NETWORK',
    cancel: 'Cancel',
    save: 'Save Changes',
    saving: 'Saving...',
    saved: 'Saved successfully!',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    or: 'OR',
    search: 'Search...',

    // Language switcher
    language: 'Language',
    selectLanguage: 'Select Language',
    english: 'English (US)',
    kinyarwanda: 'Ikinyarwanda (RW)',

    // Auth & Onboarding
    signIn: 'Sign In',
    createAccount: 'Create Account',
    continueWithGoogle: 'Continue with Google',
    forgotPassword: 'Forgot password?',
    passwordRecovery: 'Password Recovery',
    sendResetCode: 'Send Reset Code',
    enterResetCode: 'Enter 6-Digit Code',
    resetPassword: 'Set New Password',
    step1Title: '1. Credentials & Phone',
    step2Title: '2. Full Name & Bio',
    step3Title: '3. Username (@handle)',
    step1Subtitle: 'Secure account login credentials and international phone contact',
    step2Subtitle: 'Your display name, personal bio, and profile picture',
    step3Subtitle: 'Choose your unique username handle and view your member card',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Minimum 8 characters (letters & numbers)',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    countryLabel: 'Country / Code',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'e.g. 788 123 456',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'e.g. Eric Rukundo',
    bioLabel: 'Bio / Status',
    bioPlaceholder: 'Hey there! I am using E-RUDACTIVITY.',
    profilePhotoLabel: 'Profile Photo',
    chooseFromDevice: 'Upload from phone or computer',
    uploadingPhoto: 'Uploading image...',
    removePhoto: 'Remove photo',
    presetAvatars: 'Or choose a preset avatar',
    usernameLabel: 'Create Username (@handle)',
    usernamePlaceholder: 'e.g. eric_rukundo',
    usernameHint: 'Unique handle for messaging, calls, and discovery across the platform.',
    usernameAvailable: 'Username is available!',
    usernameTaken: 'Username is already taken, try another.',
    suggestUsername: 'Suggest Username',
    memberCardPreview: 'E-RUDACTIVITY MEMBER ID CARD PREVIEW',
    completeRegistration: 'Complete Registration',
    loginSuccess: 'Logged in successfully!',
    registerSuccess: 'Account created successfully! Welcome to E-RUDACTIVITY.',
    logout: 'Log Out',

    // Sidebar & Navigation
    chats: 'Direct Chats',
    groups: 'Groups',
    channels: 'Channels',
    calls: 'Calls',
    archived: 'Archived',
    settings: 'Settings',
    adminPanel: 'Admin Dashboard',
    newChat: 'New Direct Chat',
    newGroup: 'New Group',
    newChannel: 'New Channel',
    noConversations: 'No conversations found',
    online: 'Online',
    offline: 'Offline',
    typing: 'is typing...',
    pinConversation: 'Pin to top',
    unpinConversation: 'Unpin conversation',
    muteConversation: 'Mute notifications',
    unmuteConversation: 'Unmute notifications',
    archiveConversation: 'Archive conversation',

    // Chat Area
    typeMessage: 'Type a message...',
    send: 'Send',
    reply: 'Reply',
    copy: 'Copy text',
    edit: 'Edit message',
    deleteMessage: 'Delete message',
    forward: 'Forward',
    pinnedMessage: 'Pinned Message',
    voiceMessage: 'Voice Message',
    recordingVoice: 'Recording voice...',
    attachMedia: 'Attach photo or file',
    selectToStartChat: 'Select a conversation or start a new chat to begin messaging.',

    // Calls
    startVoiceCall: 'Start Voice Call',
    startVideoCall: 'Start Video Call',
    incomingCall: 'Incoming Call',
    callInProgress: 'Call in progress',
    callEnded: 'Call ended',
    acceptCall: 'Accept',
    declineCall: 'Decline',

    // Settings
    profileSettings: 'Edit Profile',
    privacySettings: 'Privacy & Security',
    securitySettings: 'Password & Security',
    appearanceSettings: 'Appearance & Theme',
    dataSettings: 'Data & Account',
    statusLabel: 'Status Text',
    statusPlaceholder: 'What is on your mind?',
    currentPassword: 'Current Password',
    newPasswordLabel: 'New Password',
    changePasswordBtn: 'Update Password',
    installApp: 'Install E-RUDACTIVITY App',
    installAppPcPhone: 'Install App on PC / Phone',
    pwaInstalled: 'E-RUDACTIVITY is installed as an app.',
    exportData: 'Export Personal Data (JSON)',
    deleteAccount: 'Delete Account Permanently',
  },
  rw: {
    // Brand
    appName: 'E-RUDACTIVITY',
    appTagline: 'Urubuga Mpuzamahanga rwo Koherezanya Ubutumwa, Guhamagara & Amatsinda',
    connecting: 'KWINJIRA MURI E-RUDACTIVITY NETWORK',
    cancel: 'Kureka',
    save: 'Kubika Impinduka',
    saving: 'Birimo kubikwa...',
    saved: 'Byabitswe neza!',
    delete: 'Gusiba',
    confirm: 'Kwemeza',
    back: 'Inyuma',
    next: 'Komeza',
    loading: 'Tegereza gato...',
    error: 'Havutse ikibazo',
    success: 'Byagenze neza',
    or: 'CYANGWA',
    search: 'Shakisha...',

    // Language switcher
    language: 'Ururimi',
    selectLanguage: 'Hitamo Ururimi',
    english: 'English (US)',
    kinyarwanda: 'Ikinyarwanda (RW)',

    // Auth & Onboarding
    signIn: 'Kwinjira',
    createAccount: 'Kwiyandikisha',
    continueWithGoogle: 'Gukomeza na Google',
    forgotPassword: 'Wibagiwe ijambobanga?',
    passwordRecovery: 'Guhindura Ijambobanga',
    sendResetCode: 'Ohereza Kode yo Guhindura',
    enterResetCode: 'Injiza Kode y\'imibare 6',
    resetPassword: 'Shyiraho Ijambobanga Rishya',
    step1Title: '1. Umwirondoro & Nimero ya Telefoni',
    step2Title: '2. Amazina & Ifoto ya Porofayili',
    step3Title: '3. Izina ry\'Ukoresha (@handle)',
    step1Subtitle: 'Injiza email yawe, ijambobanga, n\'igihugu ubamo hamwe na nimero ya telefone',
    step2Subtitle: 'Injiza amazina yawe yose, amagambo akuranga, n\'ifoto ya porofayili yawe',
    step3Subtitle: 'Hitamo izina ryihariye uzajya ukoresha (@handle) unarebe ikarita yawe ya E-RUDACTIVITY',
    emailLabel: 'Aderesi ya Email',
    emailPlaceholder: 'izina@urugero.com',
    passwordLabel: 'Ijambobanga',
    passwordPlaceholder: 'Nibura inyuguti n\'imibare 8',
    confirmPasswordLabel: 'Emeza Ijambobanga',
    confirmPasswordPlaceholder: 'Subiramo ijambobanga ryawe',
    countryLabel: 'Igihugu / Kode',
    phoneLabel: 'Nimero ya Telefoni',
    phonePlaceholder: 'urugero: 788 123 456',
    fullNameLabel: 'Amazina Yose',
    fullNamePlaceholder: 'urugero: Eric Rukundo',
    bioLabel: 'Amagambo Akuranga (Bio)',
    bioPlaceholder: 'Muraho! Ndi gukoresha E-RUDACTIVITY.',
    profilePhotoLabel: 'Ifoto ya Porofayili',
    chooseFromDevice: 'Hitamo ifoto muri telefone cyangwa mudasobwa',
    uploadingPhoto: 'Ifoto irimo koherezwa...',
    removePhoto: 'Kuraho iyi foto',
    presetAvatars: 'Cyangwa hitamo muri aya mafoto aboneka hano',
    usernameLabel: 'Gukora Username (@handle)',
    usernamePlaceholder: 'urugero: eric_rukundo',
    usernameHint: 'Izina ryihariye rizakuranga mu kohereza ubutumwa, guhamagara, no kubonwa n\'abandi.',
    usernameAvailable: 'Iri zina riraboneka, uraryemerewe!',
    usernameTaken: 'Iri zina ryarafashwe, gerageza irindi.',
    suggestUsername: 'Inama y\'Izina',
    memberCardPreview: 'IKARITA NDIRANGA YA E-RUDACTIVITY',
    completeRegistration: 'Rangiza Kwiyandikisha',
    loginSuccess: 'Winjiye neza!',
    registerSuccess: 'Konte yawe yakozwe neza! Murakaza neza muri E-RUDACTIVITY.',
    logout: 'Gusohoka',

    // Sidebar & Navigation
    chats: 'Ubutumwa Butaziguye',
    groups: 'Amatsinda (Groups)',
    channels: 'Imiyoboro (Channels)',
    calls: 'Guhamagara',
    archived: 'Ububiko (Archived)',
    settings: 'Ibyifuzo (Settings)',
    adminPanel: 'Ubugenzuzi (Admin)',
    newChat: 'Tangiza Ubutumwa Bushya',
    newGroup: 'Kora Itsinda Rishya',
    newChannel: 'Kora Umuyoboro Mushya',
    noConversations: 'Nta butumwa buraboneka',
    online: 'Ku Murongo',
    offline: 'Ntari ku Murongo',
    typing: 'arimo kwandika...',
    pinConversation: 'Funga hejuru (Pin)',
    unpinConversation: 'Kura hejuru (Unpin)',
    muteConversation: 'Hagarika amajwi y\'ubutumwa',
    unmuteConversation: 'Fungura amajwi y\'ubutumwa',
    archiveConversation: 'Bika mu bubiko (Archive)',

    // Chat Area
    typeMessage: 'Andika ubutumwa hano...',
    send: 'Ohereza',
    reply: 'Subiza',
    copy: 'Koporora amagambo',
    edit: 'Kosora ubutumwa',
    deleteMessage: 'Siba ubutumwa',
    forward: 'Ohereza ahandi',
    pinnedMessage: 'Ubutumwa Bwafunzwe Hejuru',
    voiceMessage: 'Ubutumwa bw\'Ijwi',
    recordingVoice: 'Ijwi ririmo gufatwa...',
    attachMedia: 'Ongeraho ifoto cyangwa inyandiko',
    selectToStartChat: 'Hitamo uwo mwaganira cyangwa utangize ubutumwa bushya.',

    // Calls
    startVoiceCall: 'Hamagara n\'Ijwi',
    startVideoCall: 'Hamagara na Video',
    incomingCall: 'Guhamagarwa Biraje',
    callInProgress: 'Ihamagara rirakomeje',
    callEnded: 'Ihamagara ryarangiye',
    acceptCall: 'Itaba',
    declineCall: 'Kanga',

    // Settings
    profileSettings: 'Hindura Umwirondoro',
    privacySettings: 'Umutekano & Ibanga',
    securitySettings: 'Ijambobanga & Umutekano',
    appearanceSettings: 'Ishusho & Amabara',
    dataSettings: 'Amakuru & Konte',
    statusLabel: 'Ubutumwa bwa Status',
    statusPlaceholder: 'Ni iki kiri mu ntekerezo zawe?',
    currentPassword: 'Ijambobanga Usanganwe',
    newPasswordLabel: 'Ijambobanga Rishya',
    changePasswordBtn: 'Hindura Ijambobanga',
    installApp: 'Shyira E-RUDACTIVITY App muri Telefoni/PC',
    installAppPcPhone: 'Shyira App muri Telefoni / Mudasobwa',
    pwaInstalled: 'E-RUDACTIVITY yamaze gushyirwa nk\'App.',
    exportData: 'Kuramo Amakuru Yanjye (JSON)',
    deleteAccount: 'Siba Konte Burundu',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'erudactivity_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'rw') return saved;
      // Default to Kinyarwanda as requested or English if browser preference
      return 'rw';
    } catch {
      return 'rw';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'rw' ? 'en' : 'rw');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: TRANSLATIONS[language] || TRANSLATIONS.rw,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
