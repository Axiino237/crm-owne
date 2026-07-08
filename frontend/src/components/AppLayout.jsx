import { NavLink, useLocation } from 'react-router-dom';
import {
  RiDashboardLine, RiTeamLine, RiShieldUserLine,
  RiKey2Line, RiBuildingLine, RiBuilding2Line,
  RiGroupLine, RiLogoutBoxLine, RiSettings4Line, RiStarLine,
  RiOrganizationChart, RiTargetLine, RiFilePaper2Line, RiBarChart2Line, RiCheckboxCircleLine, RiDraftLine, RiPaletteLine, RiFileList2Line, RiCheckDoubleLine, RiCalendarLine, RiChat3Line
} from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SA';

  const navItems = [
    {
      section: 'Main',
      items: [
        { to: '/dashboard', icon: <RiDashboardLine />, label: 'Dashboard', always: true }
      ]
    },
    {
      section: 'User Management',
      items: [
        {
          to: '/uam/users',
          icon: <RiTeamLine />,
          label: 'Users',
          show: hasPermission('uam', 'users-list', 'canView')
        },
        {
          to: '/uam/roles',
          icon: <RiShieldUserLine />,
          label: 'Roles',
          show: hasPermission('roles', 'roles-list', 'canView')
        },
        {
          to: '/uam/permissions',
          icon: <RiKey2Line />,
          label: 'Permissions',
          show: hasPermission('permissions', 'permissions-list', 'canView')
        },
        {
          to: '/audit-logs',
          icon: <RiFileList2Line />,
          label: 'Audit Logs',
          show: hasPermission('uam', 'audit-logs-list', 'canView')
        }
      ]
    },
    {
      section: 'Organization',
      items: [
        {
          to: '/organizations',
          icon: <RiBuildingLine />,
          label: 'Organizations',
          show: user?.isSuperAdmin
        },
        {
          to: '/companies',
          icon: <RiBuilding2Line />,
          label: 'Companies',
          show: hasPermission('companies', 'companies-list', 'canView')
        },
        {
          to: '/departments',
          icon: <RiGroupLine />,
          label: 'Departments',
          show: hasPermission('departments', 'departments-list', 'canView')
        },
        {
          to: '/org-overview',
          icon: <RiOrganizationChart />,
          label: 'Org Overview',
          show: hasPermission('dashboard', 'org-overview', 'canView')
        }
      ]
    },
    {
      section: 'Sales',
      items: [
        {
          to: '/leads',
          icon: <RiTargetLine />,
          label: 'Leads',
          show: hasPermission('leads', 'leads-list', 'canView')
        },
        {
          to: '/quotation',
          icon: <RiFilePaper2Line />,
          label: 'Quotation',
          show: hasPermission('quotations', 'quotations-list', 'canView')
        },
        {
          to: '/performance',
          icon: <RiBarChart2Line />,
          label: 'Performance',
          show: hasPermission('performance', 'performance-view', 'canView')
        },
        {
          to: '/closed-sales',
          icon: <RiCheckboxCircleLine />,
          label: 'Closed Sales',
          show: hasPermission('closed_sales', 'closed-sales-list', 'canView')
        }
      ]
    },
    {
      section: 'Design',
      items: [
        {
          to: '/design',
          icon: <RiDraftLine />,
          label: 'Design Orders',
          show: hasPermission('design', 'design-list', 'canView')
        },
        {
          to: '/my-projects',
          icon: <RiPaletteLine />,
          label: 'My Projects',
          show: hasPermission('design', 'my-projects-list', 'canView')
        },
        {
          to: '/completed-models',
          icon: <RiCheckDoubleLine />,
          label: 'Completed Models',
          show: hasPermission('design', 'completed-models-list', 'canView')
        }
      ]
    },
    {
      section: 'HR Management',
      items: [
        {
          to: '/attendance',
          icon: <RiCalendarLine />,
          label: 'Attendance Portal',
          show: hasPermission('attendance', 'attendance-list', 'canView')
        },
        {
          to: '/leaves',
          icon: <RiFileList2Line />,
          label: 'Leave Portal',
          show: hasPermission('attendance', 'attendance-list', 'canView')
        }
      ]
    },
    {
      section: 'Collaboration',
      items: [
        {
          to: '/chat',
          icon: <RiChat3Line />,
          label: 'Chat Room',
          show: hasPermission('attendance', 'attendance-list', 'canView')
        },
        {
          to: '/chat-settings',
          icon: <RiSettings4Line />,
          label: 'Chat Workspaces',
          show: hasPermission('attendance', 'attendance-list', 'canView')
        }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-text">CRM Pro</div>
          <div className="logo-sub">Access Management</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(section => {
          const visibleItems = section.items.filter(item => item.always || item.show !== false);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.isSuperAdmin ? '⭐ Super Admin' : user?.role?.name}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <RiLogoutBoxLine />
          </button>
        </div>
      </div>
    </aside>
  );
};

const Header = ({ title }) => {
  const { user } = useAuth();
  return (
    <header className="header">
      <div className="header-title">{title}</div>
      <div className="header-right">
        {user?.isSuperAdmin && (
          <span className="super-admin-chip">
          <RiStarLine /> Super Admin
          </span>
        )}
        <div className="avatar avatar-sm">
          {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      </div>
    </header>
  );
};

const AppLayout = ({ children, title = 'Dashboard' }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header title={title} />
        <main className="page-wrapper">
          {children}
        </main>
      </div>
    </div>
  );
};

export { Sidebar, Header };
export default AppLayout;
