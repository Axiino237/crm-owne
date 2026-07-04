import { useEffect, useState, useCallback } from 'react';
import {
  RiBuildingLine, RiBuilding2Line, RiGroupLine,
  RiTeamLine, RiShieldUserLine, RiSearchLine,
  RiRefreshLine, RiArrowDownSLine, RiArrowRightSLine,
  RiUserLine, RiMailLine, RiPhoneLine, RiCheckboxCircleLine,
  RiCloseCircleLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const roleColorMap = {
  'SUPER_ADMIN': { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  'ADMIN': { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
  default: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' }
};

const getRoleStyle = (code) => roleColorMap[code] || roleColorMap.default;

const MemberRow = ({ member }) => {
  const roleStyle = getRoleStyle(member.role?.code);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      borderRadius: 8,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(129,140,248,0.07)',
      transition: 'background 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.875rem', fontWeight: 700, color: '#fff'
      }}>
        {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {member.name}
          {member.isActive
            ? <RiCheckboxCircleLine style={{ color: 'var(--success)', fontSize: '0.75rem' }} />
            : <RiCloseCircleLine style={{ color: 'var(--danger)', fontSize: '0.75rem' }} />
          }
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', align: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RiMailLine />{member.email}</span>
          {member.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RiPhoneLine />{member.phone}</span>}
        </div>
      </div>

      {/* Role badge */}
      {member.role && (
        <span style={{
          background: roleStyle.bg,
          color: roleStyle.color,
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
          border: `1px solid ${roleStyle.color}30`
        }}>
          {member.role.name}
        </span>
      )}
    </div>
  );
};

const DepartmentCard = ({ dept, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false);
  const members = dept.members || [];

  return (
    <div style={{
      border: '1px solid rgba(129,140,248,0.12)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 10
    }}>
      {/* Department header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: 'rgba(129,140,248,0.04)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(129,140,248,0.04)'}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'rgba(16,185,129,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--success)', fontSize: '1rem'
        }}>
          <RiGroupLine />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
            {dept.name}
            {dept.code && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>({dept.code})</span>}
          </div>
          {dept.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{dept.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: 'rgba(129,140,248,0.12)', color: 'var(--accent)',
            padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700
          }}>
            <RiUserLine style={{ verticalAlign: 'middle', marginRight: 3 }} />
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <RiArrowDownSLine />
          </span>
        </div>
      </button>

      {/* Members list */}
      {open && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <RiTeamLine style={{ fontSize: '1.5rem', marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
              No members assigned to this department
            </div>
          ) : (
            members.map(m => <MemberRow key={m.id} member={m} />)
          )}
        </div>
      )}
    </div>
  );
};

const CompanyCard = ({ company, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false);
  const departments = company.departments || [];
  const totalMembers = departments.reduce((sum, d) => sum + (d.members?.length || 0), 0);

  return (
    <div style={{
      border: '1px solid rgba(129,140,248,0.15)',
      borderRadius: 12, marginBottom: 16,
      overflow: 'hidden'
    }}>
      {/* Company header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 20px', background: 'rgba(129,140,248,0.06)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.15s', borderBottom: open ? '1px solid rgba(129,140,248,0.1)' : 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = open ? 'rgba(129,140,248,0.06)' : 'rgba(129,140,248,0.06)'}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', fontSize: '1.1rem'
        }}>
          <RiBuilding2Line />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {company.name}
            {company.code && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>({company.code})</span>}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12 }}>
            {company.email && <span>{company.email}</span>}
            {company.phone && <span>{company.phone}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
            <RiGroupLine style={{ verticalAlign: 'middle', marginRight: 3 }} />{departments.length} dept{departments.length !== 1 && 's'}
          </span>
          <span style={{ background: 'rgba(129,140,248,0.1)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
            <RiTeamLine style={{ verticalAlign: 'middle', marginRight: 3 }} />{totalMembers} users
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <RiArrowDownSLine />
          </span>
        </div>
      </button>

      {/* Departments */}
      {open && (
        <div style={{ padding: '16px 20px' }}>
          {departments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <RiGroupLine style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 6px' }} />
              No departments in this company
            </div>
          ) : (
            departments.map(dept => <DepartmentCard key={dept.id} dept={dept} defaultOpen={departments.length === 1} />)
          )}
        </div>
      )}
    </div>
  );
};

const OrgOverviewPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/org-overview');
      setOrganizations(res.data.organizations || []);
      // Auto-expand first org
      if (res.data.organizations?.length > 0) {
        setExpandedOrgs({ [res.data.organizations[0].id]: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load org overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOrg = (id) => {
    setExpandedOrgs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = organizations.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.code?.toLowerCase().includes(search.toLowerCase())
  );

  // Overall stats
  const totalDepts = organizations.reduce((s, o) => s + (o.totalDepartments || 0), 0);
  const totalUsers = organizations.reduce((s, o) => s + (o.totalUsers || 0), 0);

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiBuildingLine style={{ color: 'var(--accent)' }} />
            Org Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Organization → Company → Department → Members with Roles
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
          <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ textAlign: 'center', background: 'var(--bg-glass)' }}>
          <div style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: 4 }}><RiBuildingLine /></div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{organizations.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Organizations</div>
        </div>
        <div className="card" style={{ textAlign: 'center', background: 'var(--bg-glass)' }}>
          <div style={{ fontSize: '2rem', color: '#818cf8', marginBottom: 4 }}><RiBuilding2Line /></div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {organizations.reduce((s, o) => s + (o.companies?.length || 0), 0)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Companies</div>
        </div>
        <div className="card" style={{ textAlign: 'center', background: 'var(--bg-glass)' }}>
          <div style={{ fontSize: '2rem', color: 'var(--success)', marginBottom: 4 }}><RiGroupLine /></div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalDepts}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Departments</div>
        </div>
        <div className="card" style={{ textAlign: 'center', background: 'var(--bg-glass)' }}>
          <div style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: 4 }}><RiTeamLine /></div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalUsers}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Total Members</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 20 }}>
        <RiSearchLine className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search organization by name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)' }}>Loading organization hierarchy...</div>
        </div>
      )}

      {/* No data */}
      {!loading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RiBuildingLine style={{ fontSize: '3rem', color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            No organizations found
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {search ? `No results for "${search}"` : 'No organizations have been set up yet.'}
          </div>
        </div>
      )}

      {/* Organizations list */}
      {!loading && filtered.map(org => {
        const isOpen = !!expandedOrgs[org.id];
        const companies = org.companies || [];
        const totalMem = org.totalUsers || 0;

        return (
          <div key={org.id} className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            {/* Org Header */}
            <button
              onClick={() => toggleOrg(org.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                padding: '20px 24px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: isOpen ? '1px solid rgba(129,140,248,0.1)' : 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Org Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(129,140,248,0.1))',
                border: '1px solid rgba(129,140,248,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontSize: '1.4rem'
              }}>
                <RiBuildingLine />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {org.name}
                  </span>
                  {org.code && (
                    <span style={{
                      background: 'rgba(129,140,248,0.1)', color: 'var(--accent)',
                      padding: '1px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700
                    }}>
                      {org.code}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {org.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><RiMailLine />{org.email}</span>}
                  {org.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><RiPhoneLine />{org.phone}</span>}
                </div>
              </div>

              {/* Stats pills */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{
                  background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <RiBuilding2Line />{companies.length} {companies.length === 1 ? 'company' : 'companies'}
                </span>
                <span style={{
                  background: 'rgba(16,185,129,0.1)', color: 'var(--success)',
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <RiGroupLine />{org.totalDepartments} dept{org.totalDepartments !== 1 && 's'}
                </span>
                <span style={{
                  background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <RiTeamLine />{totalMem} users
                </span>
              </div>

              <span style={{
                color: 'var(--text-muted)', fontSize: '1.4rem', marginLeft: 8,
                transition: 'transform 0.25s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
              }}>
                <RiArrowDownSLine />
              </span>
            </button>

            {/* Companies */}
            {isOpen && (
              <div style={{ padding: '20px 24px' }}>
                {companies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                    <RiBuilding2Line style={{ fontSize: '2rem', display: 'block', margin: '0 auto 8px' }} />
                    No companies under this organization
                  </div>
                ) : (
                  companies.map(company => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      defaultOpen={companies.length === 1}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </AppLayout>
  );
};

export default OrgOverviewPage;
