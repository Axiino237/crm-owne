import { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  RiAddLine, RiDeleteBin7Line, RiSettings4Line, RiBuildingLine, RiCheckboxCircleLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import {
  useGetChatServersQuery,
  useCreateChatServerMutation,
  useUpdateChatServerMutation,
  useDeleteChatServerMutation
} from '../../store/apiSlice';

const ChatSettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(user?.role?.level) || user?.isSuperAdmin;

  // Form states
  const [serverName, setServerName] = useState('');
  const [selectedServer, setSelectedServer] = useState(null); // Server being configured
  const [selectedCompanies, setSelectedCompanies] = useState([]); // Array of companyIds linked to selectedServer

  // RTK Queries
  const { data: serversData, isLoading, refetch } = useGetChatServersQuery();
  const servers = serversData?.servers || [];
  const companies = serversData?.companies || [];

  const [createChatServer, { isLoading: creating }] = useCreateChatServerMutation();
  const [updateChatServer, { isLoading: updating }] = useUpdateChatServerMutation();
  const [deleteChatServer] = useDeleteChatServerMutation();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!serverName.trim()) return toast.error('Server name is required');

    try {
      await createChatServer({ name: serverName }).unwrap();
      toast.success('Chat server created successfully!');
      setServerName('');
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create server');
    }
  };

  const handleOpenConfig = (server) => {
    setSelectedServer(server);
    // Gather companyIds linked to this server
    const linkedIds = server.companies?.map(c => c.id) || [];
    setSelectedCompanies(linkedIds);
  };

  const handleToggleCompany = (companyId) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const handleSaveConfig = async () => {
    if (!selectedServer) return;
    try {
      await updateChatServer({
        id: selectedServer.id,
        companyIds: selectedCompanies
      }).unwrap();
      toast.success('Server company connections updated!');
      setSelectedServer(null);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to update connections');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chat server? All shared connections will be unlinked.')) return;
    try {
      await deleteChatServer(id).unwrap();
      toast.success('Chat server deleted successfully');
      if (selectedServer?.id === id) setSelectedServer(null);
    } catch (err) {
      toast.error('Failed to delete chat server');
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout title="Access Denied">
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <h3>Unauthorized Access</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You must be an Administrator to manage chat connection servers.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Chat Workspace Manager">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          
          {/* Create Server Form */}
          <div className="card" style={{ padding: 24, height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiAddLine style={{ color: 'var(--accent)' }} /> Create Chat Workspace Server
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Server Workspace Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Call Center Server, Design Workspace" 
                  value={serverName}
                  onChange={e => setServerName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating Workspace...' : 'Create Server'}
              </button>
            </form>
          </div>

          {/* Active Servers List */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🌐 Active Connection Servers
            </h3>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : servers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No workspace servers created yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {servers.map(server => (
                  <div key={server.id} style={{ 
                    padding: 16, 
                    borderRadius: 8, 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>🌐 # {server.name}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-xs" onClick={() => handleOpenConfig(server)} title="Configure Server Connections">
                          <RiSettings4Line /> Edit Links
                        </button>
                        <button className="btn btn-outline btn-xs" onClick={() => handleDelete(server.id)} style={{ color: 'var(--danger)' }} title="Delete Server">
                          <RiDeleteBin7Line />
                        </button>
                      </div>
                    </div>
                    {/* Display linked companies */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {server.companies && server.companies.length > 0 ? (
                        server.companies.map(c => (
                          <span key={c.id} style={{ fontSize: '0.68rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            🏢 {c.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No companies connected. Users remain isolated.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Company Connections Configuration Modal/Panel */}
        {selectedServer && (
          <div className="card" style={{ padding: 24, border: '2px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ⚙️ Connect Companies to # {selectedServer.name}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Select which companies share this server workspace room.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedServer(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveConfig} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Connections'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {companies.map(comp => {
                const isSelected = selectedCompanies.includes(comp.id);
                const isLinkedToOther = comp.chatServerId && comp.chatServerId !== selectedServer.id;
                const otherServer = isLinkedToOther ? servers.find(s => s.id === comp.chatServerId) : null;

                return (
                  <div 
                    key={comp.id} 
                    onClick={() => {
                      if (!isLinkedToOther) handleToggleCompany(comp.id);
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                      border: isSelected ? '1px solid var(--success)' : '1px solid var(--border)',
                      cursor: isLinkedToOther ? 'not-allowed' : 'pointer',
                      opacity: isLinkedToOther ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>🏢 {comp.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {isLinkedToOther ? `Connected to # ${otherServer?.name || 'Other Server'}` : isSelected ? 'Linked to this Server' : 'Isolated / Standalone'}
                      </div>
                    </div>
                    {isSelected && (
                      <RiCheckboxCircleLine style={{ color: 'var(--success)', fontSize: '1.25rem' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default ChatSettingsPage;
