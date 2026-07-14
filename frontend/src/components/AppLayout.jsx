import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  RiDashboardLine, RiTeamLine, RiShieldUserLine,
  RiKey2Line, RiBuildingLine, RiBuilding2Line,
  RiGroupLine, RiLogoutBoxLine, RiSettings4Line, RiStarLine,
  RiOrganizationChart, RiTargetLine, RiFilePaper2Line, RiBarChart2Line,
  RiCheckboxCircleLine, RiDraftLine, RiPaletteLine, RiFileList2Line,
  RiCheckDoubleLine, RiCalendarLine, RiChat3Line, RiBellLine
} from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

// Sidebar
const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SA';
  const navItems = [
    { section: 'Main', items: [{ to: '/dashboard', icon: <RiDashboardLine />, label: 'Dashboard', always: true }] },
    {
      section: 'User Management', items: [
        { to: '/uam/users', icon: <RiTeamLine />, label: 'Users', show: hasPermission('uam', 'users-list', 'canView') },
        { to: '/uam/roles', icon: <RiShieldUserLine />, label: 'Roles', show: hasPermission('roles', 'roles-list', 'canView') },
        { to: '/uam/permissions', icon: <RiKey2Line />, label: 'Permissions', show: hasPermission('permissions', 'permissions-list', 'canView') },
        { to: '/audit-logs', icon: <RiFileList2Line />, label: 'Audit Logs', show: hasPermission('uam', 'audit-logs-list', 'canView') }
      ]
    },
    {
      section: 'Organization', items: [
        { to: '/organizations', icon: <RiBuildingLine />, label: 'Organizations', show: user?.isSuperAdmin },
        { to: '/companies', icon: <RiBuilding2Line />, label: 'Companies', show: hasPermission('companies', 'companies-list', 'canView') },
        { to: '/departments', icon: <RiGroupLine />, label: 'Departments', show: hasPermission('departments', 'departments-list', 'canView') },
        { to: '/org-overview', icon: <RiOrganizationChart />, label: 'Org Overview', show: hasPermission('dashboard', 'org-overview', 'canView') }
      ]
    },
    {
      section: 'Sales', items: [
        { to: '/leads', icon: <RiTargetLine />, label: 'Leads', show: hasPermission('leads', 'leads-list', 'canView') },
        { to: '/quotation', icon: <RiFilePaper2Line />, label: 'Quotation', show: hasPermission('quotations', 'quotations-list', 'canView') },
        { to: '/performance', icon: <RiBarChart2Line />, label: 'Performance', show: hasPermission('performance', 'performance-view', 'canView') },
        { to: '/closed-sales', icon: <RiCheckboxCircleLine />, label: 'Closed Sales', show: hasPermission('closed_sales', 'closed-sales-list', 'canView') }
      ]
    },
    {
      section: 'Design', items: [
        { to: '/design', icon: <RiDraftLine />, label: 'Design Orders', show: hasPermission('design', 'design-list', 'canView') },
        { to: '/my-projects', icon: <RiPaletteLine />, label: 'My Projects', show: hasPermission('design', 'my-projects-list', 'canView') },
        { to: '/completed-models', icon: <RiCheckDoubleLine />, label: 'Completed Models', show: hasPermission('design', 'completed-models-list', 'canView') }
      ]
    },
    {
      section: 'HR Management', items: [
        { to: '/attendance', icon: <RiCalendarLine />, label: 'Attendance Portal', show: hasPermission('attendance', 'attendance-list', 'canView') },
        { to: '/leaves', icon: <RiFileList2Line />, label: 'Leave Portal', show: hasPermission('attendance', 'attendance-list', 'canView') }
      ]
    },
    {
      section: 'Collaboration', items: [
        { to: '/chat', icon: <RiChat3Line />, label: 'Chat Room', show: hasPermission('chat', 'chat-room', 'canView') },
        { to: '/chat-settings', icon: <RiSettings4Line />, label: 'Chat Workspaces', show: hasPermission('chat', 'chat-workspaces', 'canView') }
      ]
    }
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><div className="logo-icon">&#x26A1;</div><div><div className="logo-text">CRM Pro</div><div className="logo-sub">Access Management</div></div></div>
      <nav className="sidebar-nav">
        {navItems.map(section => {
          const visibleItems = section.items.filter(item => item.always || item.show !== false);
          if (visibleItems.length === 0) return null;
          return (<div key={section.section}><div className="nav-section-label">{section.section}</div>{visibleItems.map(item => (<NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">{item.icon}</span>{item.label}</NavLink>))}</div>);
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="user-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, flexGrow: 1, textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
            <div className="avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {user?.avatar ? <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
            </div>
            <div className="user-info" style={{ minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div className="user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.isSuperAdmin ? 'Super Admin' : user?.role?.name}</div>
            </div>
          </Link>
          <button className="logout-btn" onClick={logout} title="Logout" style={{ flexShrink: 0 }}><RiLogoutBoxLine /></button>
        </div>
      </div>
    </aside>
  );
};

// NotificationBell
const NotificationBell = ({ user }) => {
  const STORAGE_KEY = user?.id ? `crm_notifications_${user.id}` : 'crm_notifications';

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Migrate old HTML entity icons to actual emoji
      const ICON_MAP = { '&#x1F4AC;': '💬', '&#x1F3A8;': '🎨', '&#x1F515;': '🔕' };
      return parsed.map(n => ({
        ...n,
        icon: ICON_MAP[n.icon] || n.icon
      }));
    } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50))); } catch {}
  }, [notifications, STORAGE_KEY]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token || !user) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token } });
    socket.on('new_message', (data) => {
      const notif = { id: `msg-${Date.now()}`, type: 'message', icon: '💬', title: `New message from ${data.senderName || 'Someone'}`, body: data.isEncrypted ? 'Encrypted message' : (data.preview || 'Sent you a message'), channel: data.channelName || 'Chat', time: new Date(), read: false, link: '/chat' };
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const n = new Notification(notif.title, { body: notif.body, icon: '/favicon.ico', tag: `chat-${Date.now()}` });
        n.onclick = () => { window.focus(); n.close(); };
        setTimeout(() => n.close(), 5000);
      }
    });
    socket.on('project_assigned', (data) => {
      const notif = { id: `proj-${Date.now()}`, type: 'project', icon: '🎨', title: 'New Project Assigned!', body: data.message || `Assigned: "${data.projectName || ''}"`, channel: data.assignedBy ? `By ${data.assignedBy}` : 'Design Team', deadline: data.deadline, time: new Date(), read: false, link: '/my-projects' };
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(notif.title, { body: notif.body, icon: '/favicon.ico', tag: `project-${Date.now()}`, requireInteraction: true });
        n.onclick = () => { window.focus(); n.close(); };
      }
    });
    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    const onOut = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const clearAll = () => {
    setNotifications([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };
  const markRead = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const timeAgo = (d) => { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button id="notification-bell-btn" onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }} title="Notifications"
        style={{ background: open ? 'var(--accent)' : 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: open ? '#fff' : (unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)'), position: 'relative', transition: 'all 0.2s', fontSize: '1.15rem' }}>
        <RiBellLine />
        {unreadCount > 0 && (<span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', fontSize: '0.58rem', fontWeight: 800, minWidth: 17, height: 17, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)', padding: '0 3px' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>)}
      </button>
      {open && (
        <div id="notification-panel" style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 370, maxHeight: 500, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Notifications {notifications.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>({notifications.length})</span>}</span>
            {notifications.length > 0 && (<div style={{ display: 'flex', gap: 12 }}><button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>Mark all read</button><button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>Clear all</button></div>)}
          </div>
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔕</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No notifications yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Chat messages and project assignments will appear here</div>
              </div>
            ) : notifications.map(notif => (
              <Link key={notif.id} to={notif.link} onClick={() => { markRead(notif.id); setOpen(false); }}
                style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--border)', background: notif.read ? 'transparent' : 'rgba(99,102,241,0.06)', textDecoration: 'none', color: 'inherit', alignItems: 'flex-start', transition: 'background 0.15s' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: notif.type === 'message' ? 'rgba(99,102,241,0.15)' : 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{notif.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {notif.title}
                    {!notif.read && <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.body}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: notif.type === 'message' ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.12)', color: notif.type === 'message' ? 'var(--accent)' : '#a78bfa' }}>{notif.type === 'message' ? 'Chat' : 'Project'}</span>
                    <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{notif.channel}</span>
                    <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(notif.time)}</span>
                  </div>
                  {notif.deadline && <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginTop: 3, fontWeight: 600 }}>Deadline: {new Date(notif.deadline).toLocaleDateString()}</div>}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/chat" onClick={() => setOpen(false)} style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Open Chat Room</Link>
            <Link to="/my-projects" onClick={() => setOpen(false)} style={{ fontSize: '0.76rem', color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>My Projects</Link>
          </div>
        </div>
      )}
    </div>
  );
};


// Header
const Header = ({ title }) => {
  const { user } = useAuth();
  return (
    <header className="header">
      <div className="header-title">{title}</div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.isSuperAdmin && (<span className="super-admin-chip"><RiStarLine /> Super Admin</span>)}
        <NotificationBell user={user} />
        <Link to="/profile" className="avatar avatar-sm" style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          {user?.avatar ? <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </Link>
      </div>
    </header>
  );
};

// AppLayout
const AppLayout = ({ children, title = 'Dashboard' }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Header title={title} />
      <main className="page-wrapper">{children}</main>
    </div>
  </div>
);

export { Sidebar, Header };
export default AppLayout;
