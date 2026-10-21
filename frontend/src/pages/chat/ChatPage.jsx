import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { 
  RiChat3Line, RiSendPlane2Line, RiUserLine, RiBuildingLine, RiFolderUserLine, RiUserSmileLine, RiShieldKeyholeLine, RiLock2Line, RiLockUnlockLine
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {isEncrypted && <RiLock2Line style={{ color: 'var(--success)', display: 'inline', fontSize: '0.85rem' }} />}
      {decryptedText}
    </span>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  // E2EE Keys state
  const [privateKeyJwk, setPrivateKeyJwk] = useState(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState(null);

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

          // Click the notification to focus and navigate to the CRM
          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          // Auto-close after 5 seconds
          setTimeout(() => notification.close(), 5000);
        }
      }
    });

    socket.on('status_change', (data) => {
      // Instantly refresh members cache
      dispatch(apiSlice.util.invalidateTags(['ChatMembers']));
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);
  
  // Selected Channel state: 
  // can be:
  // - { type: 'server', id: string, name: string } (Global Shared Workspace)
  // - { type: 'company', id: string, name: string } (Private Company Channel)
  // - { type: 'dm', id: string, name: string } (Direct Message with User ID)
  const [selectedChannel, setSelectedChannel] = useState(null);

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
    pollingInterval: 15000 // Refresh active members and online/offline status dots as a safety fallback
  });
  const members = membersData?.members || [];

  // Find user's server
  const userServer = userCompany && userCompany.chatServerId 
    ? servers.find(s => s.id === userCompany.chatServerId) 
    : servers.length > 0 ? servers[0] : null; // Fallback to first server for admins

  // Set default channel on load (prioritizing company channel or first direct message)
  useEffect(() => {
    if (!selectedChannel) {
      if (userCompany) {
        setSelectedChannel({ type: 'company', id: userCompany.id, name: userCompany.name || 'Company Channel' });
      } else if (members.length > 0) {
        setSelectedChannel({ type: 'dm', id: members[0].id, name: members[0].name });
      }
    }
  }, [userCompany, members, selectedChannel]);

  // Active channel query parameters
  const queryParams = {
    chatServerId: selectedChannel?.type === 'server' ? selectedChannel.id : null,
    companyId: selectedChannel?.type === 'company' ? selectedChannel.id : null,
    receiverId: selectedChannel?.type === 'dm' ? selectedChannel.id : null
  };

  const skipQuery = !selectedChannel;

  // Fetch messages with 15-second fallback polling interval
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
    e.preventDefault();
    if (!messageText.trim() || !selectedChannel) return;

    let msgToSend = messageText;

    if (selectedChannel.type === 'dm') {
      const receiver = members.find(m => m.id === selectedChannel.id);
      if (receiver && receiver.publicKey && publicKeyJwk) {
        try {
          msgToSend = await encryptE2EEMessage(
            messageText,
            JSON.parse(receiver.publicKey),
            publicKeyJwk
          );
        } catch (error) {
          console.warn('E2EE encryption fallback to standard message transport:', error);
          msgToSend = messageText;
        }
      } else {
        // Send directly so messaging is never blocked if user is offline or hasn't generated keys!
        msgToSend = messageText;
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

  const selectDirectMessage = (member) => {
    setSelectedChannel({ type: 'dm', id: member.id, name: member.name });
  };

  const activeDMRecipient = selectedChannel?.type === 'dm' ? members.find(m => m.id === selectedChannel.id) : null;
  const isE2EEDM = activeDMRecipient && activeDMRecipient.publicKey && publicKeyJwk;

  const placeholderText = selectedChannel 
    ? (selectedChannel.type === 'dm' 
        ? `Send message to ${selectedChannel.name}...` 
        : `Send message to # ${selectedChannel.name}...`)
    : 'Select a conversation...';

  return (
    <AppLayout title="Collaboration Chat Room">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '280px 1fr', 
        gap: 0, 
        height: 'calc(100vh - 140px)',
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        
        {/* Left Sidebar - Channels & Direct Messages list */}
        <div style={{ 
          borderRight: '1px solid var(--border)', 
          padding: '20px 14px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 20, 
          background: 'var(--bg-secondary)',
          overflowY: 'auto'
        }}>
          {/* Company Channel (if company assigned) */}
          {userCompany && (
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
                📢 Team Channel
              </h4>
              <button
                onClick={() => setSelectedChannel({ type: 'company', id: userCompany.id, name: userCompany.name || 'Team Channel' })}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: selectedChannel?.type === 'company' ? 'var(--accent)' : 'transparent',
                  color: selectedChannel?.type === 'company' ? '#ffffff' : 'var(--text-primary)',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background 0.2s'
                }}
              >
                🏢 # {userCompany.name || 'Company Channel'}
              </button>
            </div>
          )}

          {/* Direct Messages list */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
              💬 Direct Messages ({members.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMembers ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Loading members...</div>
              ) : members.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 4 }}>No organization members found.</div>
              ) : (
                members.map(member => {
                  const isSelected = selectedChannel?.type === 'dm' && selectedChannel.id === member.id;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => selectDirectMessage(member)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(56, 189, 248, 0.12)',
                            color: isSelected ? '#ffffff' : 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 800
                          }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: member.isOnline ? 'var(--success)' : 'var(--text-muted)',
                            border: '2px solid var(--bg-secondary)',
                            position: 'absolute', bottom: -1, right: -1
                          }} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', opacity: isSelected ? 0.85 : 0.65, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {member.roleName || member.deptName || 'Member'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Center - Message Log Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ 
            padding: '16px 24px', 
            borderBottom: '1px solid var(--border)', 
            background: 'var(--bg-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 10 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RiChat3Line style={{ color: 'var(--accent)', fontSize: '1.25rem' }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  # {selectedChannel ? selectedChannel.name : 'Loading Channel...'}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {selectedChannel?.type === 'company' ? 'Private organization channel' : 'Direct Message session'}
                </span>
              </div>
            </div>

            {/* Session Security Badge */}
            {selectedChannel?.type === 'dm' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: isE2EEDM ? 'var(--success)' : 'var(--accent)',
                fontSize: '0.75rem',
                background: isE2EEDM ? 'rgba(34, 197, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                padding: '4px 10px',
                borderRadius: 20,
                fontWeight: 700
              }}>
                <RiLock2Line /> {isE2EEDM ? 'End-to-End Encrypted' : 'Direct Message'}
              </span>
            )}
          </div>

          {/* Messages Feed */}
          <div style={{ 
            flexGrow: 1, 
            padding: 24, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16 
          }}>
            {loadingMessages ? (
              <div style={{ display: 'flex', justifyContent: 'center', margin: 'auto' }}><div className="spinner" /></div>
            ) : messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RiUserSmileLine style={{ fontSize: '3rem', color: 'var(--border)', marginBottom: 12 }} />
                <div>This is the start of direct/workspace chat logs.</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type and send a message below to start chatting!</div>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                const initials = msg.sender?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                
                return (
                  <div key={msg.id} style={{ 
                    display: 'flex', 
                    gap: 12, 
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    flexDirection: isMe ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    <div style={{ 
                       width: 36, 
                       height: 36, 
                       borderRadius: '50%', 
                       background: isMe ? 'var(--accent)' : 'var(--bg-secondary)', 
                       color: isMe ? '#ffffff' : 'var(--text-primary)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       fontSize: '0.78rem',
                       fontWeight: 800,
                       border: '1px solid var(--border)',
                       flexShrink: 0
                    }}>
                      {initials}
                    </div>

                    {/* Content */}
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        marginBottom: 4,
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {isMe ? 'You' : msg.sender?.name}
                        </span>
                        {!isMe && (
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                            {msg.sender?.company?.name || 'Unassigned'}
                          </span>
                        )}
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div style={{ 
                        background: isMe ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: isMe ? '#ffffff' : 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        whiteSpace: 'pre-wrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {msg.receiverId ? (
                          <DecryptedMessage 
                            rawMessage={msg.message} 
                            privateKeyJwk={privateKeyJwk} 
                            isSender={msg.senderId === user?.id} 
                          />
                        ) : (
                          msg.message
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Input form */}
          <form onSubmit={handleSend} style={{ 
            padding: 16, 
            borderTop: '1px solid var(--border)', 
            background: 'var(--bg-secondary)',
            display: 'flex',
            gap: 12
          }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder={placeholderText}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              disabled={!selectedChannel || sending}
              style={{ flexGrow: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={!selectedChannel || !messageText.trim() || sending} style={{ padding: '0 20px' }}>
              <RiSendPlane2Line /> Send
            </button>
          </form>
        </div>

      </div>
    </AppLayout>
  );
};

export default ChatPage;
