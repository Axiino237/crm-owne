import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  RiChat3Line, RiSendPlane2Line, RiUserLine, RiBuildingLine, RiFolderUserLine, RiUserSmileLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import {
  useGetChatServersQuery,
  useGetChatMessagesQuery,
  useGetChatMembersQuery,
  useSendChatMessageMutation
} from '../../store/apiSlice';

const ChatPage = () => {
  const { user } = useAuth();
  
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
    pollingInterval: 3000 // Refresh active members and online/offline status dots every 3s
  });
  const members = membersData?.members || [];

  // Find user's server
  const userServer = userCompany && userCompany.chatServerId 
    ? servers.find(s => s.id === userCompany.chatServerId) 
    : servers.length > 0 ? servers[0] : null; // Fallback to first server for admins

  // Set default channel on load (prioritizing Global Chat server channel)
  useEffect(() => {
    if (!selectedChannel && !loadingServers) {
      if (userServer) {
        setSelectedChannel({ type: 'server', id: userServer.id, name: 'Global Chat' });
      } else if (userCompany) {
        setSelectedChannel({ type: 'company', id: userCompany.id, name: 'Private Channel' });
      }
    }
  }, [loadingServers, userServer, userCompany, selectedChannel]);

  // Active channel query parameters
  const queryParams = {
    chatServerId: selectedChannel?.type === 'server' ? selectedChannel.id : null,
    companyId: selectedChannel?.type === 'company' ? selectedChannel.id : null,
    receiverId: selectedChannel?.type === 'dm' ? selectedChannel.id : null
  };

  const skipQuery = !selectedChannel;

  // Fetch messages with 3-second polling interval (real-time chat updates!)
  const { data: messagesData, isLoading: loadingMessages } = useGetChatMessagesQuery(queryParams, {
    skip: skipQuery,
    pollingInterval: 3000
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

    try {
      await sendMessage({
        message: messageText,
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

  return (
    <AppLayout title="Collaboration Chat Room">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '260px 1fr 260px', 
        gap: 20, 
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
          {/* Channels list */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
              📢 Channels
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {userServer && (
                <button
                  onClick={() => setSelectedChannel({ type: 'server', id: userServer.id, name: 'Global Chat' })}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: selectedChannel?.type === 'server' ? 'var(--accent)' : 'transparent',
                    color: selectedChannel?.type === 'server' ? '#ffffff' : 'var(--text-primary)',
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
                  🌐 # Global Chat
                </button>
              )}

              {userCompany && (
                <button
                  onClick={() => setSelectedChannel({ type: 'company', id: userCompany.id, name: 'Private Channel' })}
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
                  🏢 # Private Channel
                </button>
              )}
            </div>
          </div>

          {/* Direct Messages list */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
              💬 Direct Messages
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMembers ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Loading...</div>
              ) : members.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 4 }}>No workspace members found.</div>
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
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        transition: 'background 0.2s'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: member.isOnline ? 'var(--success)' : 'var(--text-muted)',
                          boxShadow: member.isOnline && !isSelected ? '0 0 6px var(--success)' : 'none',
                          flexShrink: 0
                        }} />
                        {member.name}
                      </span>
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
            gap: 10 
          }}>
            <RiChat3Line style={{ color: 'var(--accent)', fontSize: '1.25rem' }} />
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                # {selectedChannel ? selectedChannel.name : 'Loading Channel...'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {selectedChannel?.type === 'server' ? `Shared Server workspace: ${userServer?.name || 'Default'}` : 
                 selectedChannel?.type === 'company' ? 'Private isolated company channel' : 'Direct Message session'}
              </span>
            </div>
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
                        {msg.message}
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
              placeholder={selectedChannel ? `Send message to # ${selectedChannel.name}...` : 'Select a channel or member...'}
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

        {/* Right Sidebar - Active Members and Click-to-DM triggers */}
        <div style={{ 
          borderLeft: '1px solid var(--border)', 
          padding: '20px 14px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 20, 
          background: 'var(--bg-secondary)',
          overflowY: 'auto'
        }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
              👥 Active Members ({members.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingMembers ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Loading...</div>
              ) : members.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 4 }}>No members.</div>
              ) : (
                members.map(member => (
                  <div 
                    key={member.id} 
                    onClick={() => selectDirectMessage(member)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10, 
                      padding: '8px 10px', 
                      borderRadius: 8, 
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'border 0.2s, background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = '1px solid var(--accent)';
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = '1px solid var(--border)';
                      e.currentTarget.style.background = 'var(--bg-card)';
                    }}
                    title={`Click to Direct Message ${member.name}`}
                  >
                    {/* Status dot */}
                    <div style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      background: member.isOnline ? 'var(--success)' : 'var(--text-muted)',
                      boxShadow: member.isOnline ? '0 0 8px var(--success)' : 'none',
                      flexShrink: 0
                    }} />

                    {/* Member Details */}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <RiBuildingLine /> {member.companyName}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
                          <RiFolderUserLine /> {member.roleName}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default ChatPage;
