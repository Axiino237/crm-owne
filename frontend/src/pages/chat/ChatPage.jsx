import { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { 
  RiChat3Line, RiSendPlane2Line, RiUserLine, RiBuildingLine, RiFolderUserLine, 
  RiUserSmileLine, RiShieldKeyholeLine, RiLock2Line, RiLockUnlockLine, RiArrowLeftLine,
  RiSearchLine, RiCheckDoubleLine, RiShieldCheckLine, RiCloseLine, RiRadioButtonLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import {
  useGetChatServersQuery,
  useGetChatMessagesQuery,
  useGetChatMembersQuery,
  useSendChatMessageMutation,
  apiSlice
} from '../../store/apiSlice';
import api from '../../api/axios';
import { generateE2EEKeys, encryptE2EEMessage, decryptE2EEMessage } from '../../utils/crypto';

// Sub-component to handle E2EE decryption asynchronously
const DecryptedMessage = ({ rawMessage, privateKeyJwk, isSender }) => {
  const [decryptedText, setDecryptedText] = useState(rawMessage);

  useEffect(() => {
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.startsWith('{"encryptedPayload"')) {
      setDecryptedText(rawMessage);
      return;
    }

    const decrypt = async () => {
      if (!privateKeyJwk) {
        setDecryptedText('🔑 [Encrypted Message]');
        return;
      }
      try {
        const decrypted = await decryptE2EEMessage(rawMessage, privateKeyJwk, isSender);
        setDecryptedText(decrypted);
      } catch (e) {
        setDecryptedText(rawMessage);
      }
    };
    decrypt();
  }, [rawMessage, privateKeyJwk, isSender]);

  const isEncrypted = typeof rawMessage === 'string' && rawMessage.startsWith('{"encryptedPayload"');

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {isEncrypted && (
        <RiLock2Line style={{ color: isSender ? 'rgba(255,255,255,0.9)' : 'var(--success)', fontSize: '0.82rem', flexShrink: 0 }} />
      )}
      <span>{decryptedText}</span>
    </span>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  // E2EE Keys state
  const [privateKeyJwk, setPrivateKeyJwk] = useState(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState(null);

  // Search and filter states
  const [memberSearch, setMemberSearch] = useState('');
  const [onlineFilterOnly, setOnlineFilterOnly] = useState(false);

  // Track the currently active channel for notification filtering
  const activeChannelRef = useRef(null);

  // Initialize E2EE Keys
  useEffect(() => {
    const initKeys = async () => {
      if (!user) return;
      const pubKeyName = `e2ee_public_key_${user.id}`;
      const privKeyName = `e2ee_private_key_${user.id}`;
      
      let pubKey = localStorage.getItem(pubKeyName);
      let privKey = localStorage.getItem(privKeyName);
      
      if (!pubKey || !privKey) {
        try {
          const keys = await generateE2EEKeys();
          localStorage.setItem(pubKeyName, JSON.stringify(keys.publicKeyJwk));
          localStorage.setItem(privKeyName, JSON.stringify(keys.privateKeyJwk));
          pubKey = JSON.stringify(keys.publicKeyJwk);
          privKey = JSON.stringify(keys.privateKeyJwk);
        } catch (e) {
          console.error("Failed to generate E2EE keys", e);
          return;
        }
      }
      
      setPrivateKeyJwk(JSON.parse(privKey));
      setPublicKeyJwk(JSON.parse(pubKey));
      
      // Upload public key to backend if it's missing or changed
      if (user && user.publicKey !== pubKey) {
        try {
          await api.put('/auth/public-key', { publicKey: pubKey });
        } catch (e) {
          console.error("Failed to upload public key", e);
        }
      }
    };
    initKeys();
  }, [user]);

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket Server');
    });

    socket.on('new_message', (data) => {
      // Instantly refresh message cache
      dispatch(apiSlice.util.invalidateTags(['ChatMessages']));

      // Fire system notification if the tab is hidden or user is in a different channel
      if ('Notification' in window && Notification.permission === 'granted') {
        const isTabHidden = document.hidden;
        const isSameChannel = activeChannelRef.current &&
          data.channelId && activeChannelRef.current === data.channelId;
        
        if (isTabHidden || !isSameChannel) {
          const senderName = data.senderName || 'Someone';
          const channelName = data.channelName || 'a channel';
          const preview = data.isEncrypted ? '🔒 Encrypted message' : (data.preview || 'Sent you a message');

          const notification = new Notification(`💬 New message from ${senderName}`, {
            body: `${channelName}: ${preview}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `chat-${data.channelId || 'general'}`,
            requireInteraction: false,
            silent: false,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          setTimeout(() => notification.close(), 5000);
        }
      }
    });

    socket.on('status_change', () => {
      dispatch(apiSlice.util.invalidateTags(['ChatMembers']));
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);
  
  // Selected Channel state
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showMobileList, setShowMobileList] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // Message input state
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  // RTK Queries
  const { data: serversData, isLoading: loadingServers } = useGetChatServersQuery();
  const servers = serversData?.servers || [];
  const companies = serversData?.companies || [];

  // Determine active company and connected workspace server for current user
  const userCompanyId = user?.companyId;
  const userCompany = companies.find(c => c.id === userCompanyId);

  // Fetch members in this workspace context
  const { data: membersData, isLoading: loadingMembers } = useGetChatMembersQuery(undefined, {
    pollingInterval: 15000
  });
  const members = membersData?.members || [];

  // Filter members based on search and online status
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !memberSearch.trim() || 
        m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.roleName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.deptName?.toLowerCase().includes(memberSearch.toLowerCase());
      const matchOnline = !onlineFilterOnly || m.isOnline;
      return matchSearch && matchOnline;
    });
  }, [members, memberSearch, onlineFilterOnly]);

  const onlineCount = useMemo(() => members.filter(m => m.isOnline).length, [members]);

  // Set default channel on load (prioritizing direct message)
  useEffect(() => {
    if (!selectedChannel && members.length > 0) {
      setSelectedChannel({ type: 'dm', id: members[0].id, name: members[0].name });
      activeChannelRef.current = members[0].id;
    }
  }, [members, selectedChannel]);

  // Update activeChannelRef when selectedChannel changes
  useEffect(() => {
    if (selectedChannel) {
      activeChannelRef.current = selectedChannel.id;
    }
  }, [selectedChannel]);

  // Active channel query parameters
  const queryParams = {
    chatServerId: selectedChannel?.type === 'server' ? selectedChannel.id : null,
    companyId: selectedChannel?.type === 'company' ? selectedChannel.id : null,
    receiverId: selectedChannel?.type === 'dm' ? selectedChannel.id : null
  };

  const skipQuery = !selectedChannel;

  // Fetch messages
  const { data: messagesData, isLoading: loadingMessages } = useGetChatMessagesQuery(queryParams, {
    skip: skipQuery,
    pollingInterval: 15000
  });
  const messages = messagesData?.messages || [];

  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !selectedChannel || sending) return;

    let msgToSend = messageText.trim();

    if (selectedChannel.type === 'dm') {
      const receiver = members.find(m => m.id === selectedChannel.id);
      if (receiver && receiver.publicKey && publicKeyJwk) {
        try {
          msgToSend = await encryptE2EEMessage(
            messageText.trim(),
            JSON.parse(receiver.publicKey),
            publicKeyJwk
          );
        } catch (error) {
          console.warn('E2EE encryption fallback to standard message transport:', error);
          msgToSend = messageText.trim();
        }
      } else {
        msgToSend = messageText.trim();
      }
    }

    try {
      await sendMessage({
        message: msgToSend,
        chatServerId: selectedChannel.type === 'server' ? selectedChannel.id : null,
        companyId: selectedChannel.type === 'company' ? selectedChannel.id : null,
        receiverId: selectedChannel.type === 'dm' ? selectedChannel.id : null
      }).unwrap();
      setMessageText('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectDirectMessage = (member) => {
    setSelectedChannel({ type: 'dm', id: member.id, name: member.name });
    setShowMobileList(false);
  };

  const activeDMRecipient = selectedChannel?.type === 'dm' ? members.find(m => m.id === selectedChannel.id) : null;
  const isE2EEDM = activeDMRecipient && activeDMRecipient.publicKey && publicKeyJwk;

  const placeholderText = selectedChannel 
    ? (selectedChannel.type === 'dm' 
        ? `Write a message to ${selectedChannel.name}...` 
        : `Write a message to # ${selectedChannel.name}...`)
    : 'Select a conversation to start...';

  return (
    <AppLayout title="Collaboration Chat">
      <div className={`chat-layout ${showMobileList ? 'show-sidebar' : 'show-chat'}`}>
        
        {/* Left Sidebar - Team Members & Channels */}
        <div className="chat-sidebar" style={{ 
          borderRight: '1px solid var(--border)', 
          padding: '16px 14px', 
          flexDirection: 'column', 
          gap: 14, 
          background: 'var(--bg-secondary)',
          overflowY: 'auto'
        }}>
          {/* Header & Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.95rem'
              }}>
                <RiChat3Line />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Messages
              </span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--success)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
              {onlineCount} Online
            </span>
          </div>

          {/* Member Search Bar */}
          <div style={{ position: 'relative' }}>
            <RiSearchLine style={{ 
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', 
              color: 'var(--text-muted)', fontSize: '0.85rem' 
            }} />
            <input 
              type="text" 
              className="search-input"
              placeholder="Search team members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 30,
                paddingRight: memberSearch ? 26 : 10,
                paddingTop: 7,
                paddingBottom: 7,
                fontSize: '0.78rem',
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)'
              }}
            />
            {memberSearch && (
              <button 
                type="button" 
                onClick={() => setMemberSearch('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: 0, display: 'flex'
                }}
              >
                <RiCloseLine size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setOnlineFilterOnly(false)}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: !onlineFilterOnly ? 'var(--accent)' : 'var(--border)',
                background: !onlineFilterOnly ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                color: !onlineFilterOnly ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlineFilterOnly(true)}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: onlineFilterOnly ? 'var(--success)' : 'var(--border)',
                background: onlineFilterOnly ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: onlineFilterOnly ? 'var(--success)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Active ({onlineCount})
            </button>
          </div>

          {/* Direct Messages list */}
          <div style={{ flexGrow: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMembers ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <div className="spinner" style={{ width: 14, height: 14 }} /> Loading team...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '16px 6px', textAlign: 'center' }}>
                  No members found {memberSearch && `for "${memberSearch}"`}
                </div>
              ) : (
                filteredMembers.map(member => {
                  const isSelected = selectedChannel?.type === 'dm' && selectedChannel.id === member.id;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => selectDirectMessage(member)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 10px',
                        borderRadius: 10,
                        background: isSelected 
                          ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.08) 100%)' 
                          : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: isSelected 
                              ? 'linear-gradient(135deg, #4f46e5, #6366f1)' 
                              : 'rgba(255, 255, 255, 0.06)',
                            color: isSelected ? '#ffffff' : 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.78rem', fontWeight: 800,
                            boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.35)' : 'none',
                            overflow: 'hidden'
                          }}>
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              member.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{
                            width: 9, height: 9, borderRadius: '50%',
                            background: member.isOnline ? 'var(--success)' : 'var(--text-muted)',
                            border: '2px solid var(--bg-secondary)',
                            boxShadow: member.isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                            position: 'absolute', bottom: -2, right: -2
                          }} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ 
                            fontSize: '0.82rem', 
                            fontWeight: isSelected ? 800 : 600, 
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' 
                          }}>
                            {member.name}
                          </div>
                          <div style={{ 
                            fontSize: '0.68rem', 
                            color: isSelected ? 'var(--accent)' : 'var(--text-muted)', 
                            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' 
                          }}>
                            {member.roleName || member.deptName || 'Member'}
                          </div>
                        </div>
                      </div>

                      {member.publicKey && (
                        <RiShieldKeyholeLine 
                          title="E2EE Security Key Active" 
                          style={{ fontSize: '0.8rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', opacity: 0.7, flexShrink: 0 }} 
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Center - Message Log Panel */}
        <div className="chat-main" style={{ flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
          {/* Header */}
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border)', 
            background: 'var(--bg-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 10 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm mobile-chat-back-btn"
                onClick={() => setShowMobileList(true)}
                style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                title="Back to Conversations"
              >
                <RiArrowLeftLine /> Chats
              </button>

              {activeDMRecipient && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                    overflow: 'hidden'
                  }}>
                    {activeDMRecipient.avatar ? (
                      <img src={activeDMRecipient.avatar} alt={activeDMRecipient.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      activeDMRecipient.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: activeDMRecipient.isOnline ? 'var(--success)' : 'var(--text-muted)',
                    border: '2px solid var(--bg-secondary)',
                    boxShadow: activeDMRecipient.isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                    position: 'absolute', bottom: -2, right: -2
                  }} />
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ 
                    fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', 
                    margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' 
                  }}>
                    {selectedChannel ? selectedChannel.name : 'Select a Conversation'}
                  </h3>
                  {activeDMRecipient?.roleName && (
                    <span style={{ 
                      fontSize: '0.65rem', 
                      background: 'rgba(255,255,255,0.06)', 
                      border: '1px solid var(--border)',
                      padding: '1px 6px', 
                      borderRadius: 4, 
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}>
                      {activeDMRecipient.roleName}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: activeDMRecipient?.isOnline ? 'var(--success)' : 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeDMRecipient?.isOnline ? 'var(--success)' : 'var(--text-muted)' }} />
                  {activeDMRecipient?.isOnline ? 'Active Now' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Session Security Badge */}
            {selectedChannel?.type === 'dm' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: isE2EEDM ? 'var(--success)' : 'var(--accent)',
                fontSize: '0.72rem',
                background: isE2EEDM ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                border: isE2EEDM ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                padding: '4px 10px',
                borderRadius: 20,
                fontWeight: 700,
                flexShrink: 0
              }}>
                {isE2EEDM ? <RiShieldCheckLine /> : <RiLock2Line />}
                <span>{isE2EEDM ? 'E2EE Encrypted' : 'Direct Chat'}</span>
              </span>
            )}
          </div>

          {/* Messages Feed */}
          <div style={{ 
            flexGrow: 1, 
            padding: '20px 24px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 14 
          }}>
            {loadingMessages ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto', gap: 12 }}>
                <div className="spinner" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Decrypting conversation logs...</span>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ 
                margin: 'auto', 
                maxWidth: 380, 
                textAlign: 'center', 
                padding: '32px 24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px dashed var(--border)'
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
                  color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', margin: '0 auto 14px'
                }}>
                  <RiUserSmileLine />
                </div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Direct Workspace Channel
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  This is the start of your secure conversation with <strong style={{ color: 'var(--text-primary)' }}>{selectedChannel?.name}</strong>. Messages are delivered in real time.
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                const initials = msg.sender?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                const timeString = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={msg.id} style={{ 
                    display: 'flex', 
                    gap: 10, 
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    flexDirection: isMe ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 10, 
                        background: 'rgba(255, 255, 255, 0.07)', 
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                        marginTop: 2,
                        overflow: 'hidden'
                      }}>
                        {msg.sender?.avatar ? (
                          <img src={msg.sender.avatar} alt={msg.sender.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          initials
                        )}
                      </div>
                    )}
                    {isMe && (
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 10, 
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)', 
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        marginTop: 2,
                        overflow: 'hidden'
                      }}>
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ME'
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          marginBottom: 4,
                          paddingLeft: 2
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {msg.sender?.name}
                          </span>
                          {msg.sender?.company?.name && (
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 4 }}>
                              {msg.sender?.company?.name}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div style={{ 
                        background: isMe 
                          ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' 
                          : 'var(--bg-secondary)',
                        color: isMe ? '#ffffff' : 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 2px 10px rgba(79, 70, 229, 0.25)' : '0 1px 3px rgba(0,0,0,0.12)',
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {msg.receiverId ? (
                          <DecryptedMessage 
                            rawMessage={msg.message} 
                            privateKeyJwk={privateKeyJwk} 
                            isSender={isMe} 
                          />
                        ) : (
                          msg.message
                        )}

                        {/* Message Timestamp & Delivery Indicator */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end', 
                          gap: 4, 
                          marginTop: 4, 
                          fontSize: '0.65rem',
                          color: isMe ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)'
                        }}>
                          <span>{timeString}</span>
                          {isMe && <RiCheckDoubleLine style={{ fontSize: '0.8rem', opacity: 0.85 }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Input Composer */}
          <form onSubmit={handleSend} style={{ 
            padding: '12px 18px', 
            borderTop: '1px solid var(--border)', 
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder={placeholderText}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedChannel || sending}
                style={{ 
                  width: '100%',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!selectedChannel || !messageText.trim() || sending} 
              style={{ 
                padding: '10px 18px', 
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: '0.85rem',
                flexShrink: 0
              }}
            >
              {sending ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <>
                  <RiSendPlane2Line /> <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </AppLayout>
  );
};

export default ChatPage;

