import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiUserStarLine, RiMoneyDollarCircleLine, RiCalendarCheckLine, RiTimeLine,
  RiSearchLine, RiFilterLine, RiEditLine, RiCloseLine, RiBuildingLine,
  RiFolderUserLine, RiCheckLine, RiAlertLine, RiUserLine, RiRefreshLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

const MONTHS = [
  { value: '', label: 'All Year' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1);

const StaffSummaryPage = () => {
  const { user } = useAuth();
  const isSuper = user?.isSuperAdmin || user?.role?.level === 'super_admin';

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState('');

  // Data state
  const [staff, setStaff] = useState([]);
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    totalPayroll: 0,
    totalApprovedLeaves: 0,
    totalPendingLeaves: 0,
    avgLeavesPerStaff: 0
  });
  const [filterOptions, setFilterOptions] = useState({
    organizations: [],
    departments: [],
    roles: []
  });
  const [loading, setLoading] = useState(true);

  // Edit Modal state
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    baseSalary: '',
    monthlyLeaveQuota: 1,
    paidLeaves: 12,
    casualLeaves: 10,
    sickLeaves: 8
  });
  const [saving, setSaving] = useState(false);

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedOrg) params.append('organizationId', selectedOrg);
      if (selectedDept) params.append('departmentId', selectedDept);
      if (selectedRole) params.append('roleId', selectedRole);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);

      const res = await api.get(`/staff-summary?${params.toString()}`);
      if (res.data.success) {
        setStaff(res.data.staff || []);
        setMetrics(res.data.metrics || {});
        if (res.data.filterOptions) {
          setFilterOptions(res.data.filterOptions);
        }
      }
    } catch (err) {
      toast.error('Failed to load organization staff summary');
    } finally {
      setLoading(false);
    }
  }, [search, selectedOrg, selectedDept, selectedRole, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Open Edit Modal
  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEditForm({
      baseSalary: emp.baseSalary || 0,
      monthlyLeaveQuota: emp.monthlyLeaveQuota || 1,
      paidLeaves: emp.paidLeaves || 12,
      casualLeaves: emp.casualLeaves || 10,
      sickLeaves: emp.sickLeaves || 8
    });
  };

  // Handle Save
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setSaving(true);
    try {
      const res = await api.put(`/staff-summary/${editingEmployee.id}`, editForm);
      if (res.data.success) {
        toast.success(res.data.message || 'Updated successfully!');
        setEditingEmployee(null);
        fetchSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update employee details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Staff Overview & Payroll">
      <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
        
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <RiUserStarLine style={{ color: 'var(--accent)' }} /> Organization Staff & Payroll Summary
            </h1>
            <p className="page-subtitle" style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Track organization workforce, evaluate leave consumption, quota balances, and salary compensation.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={fetchSummary}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RiRefreshLine className={loading ? 'spinner' : ''} /> Refresh
          </button>
        </div>

        {/* Aggregate KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          
          {/* Total Employees */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              <RiUserLine />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Active Workforce
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {metrics.totalStaff} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>members</span>
              </div>
            </div>
          </div>

          {/* Total Leaves Taken */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              <RiCalendarCheckLine />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Leaves Taken (Period)
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {metrics.totalApprovedLeaves} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
              </div>
            </div>
          </div>

          {/* Total Payroll */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              <RiMoneyDollarCircleLine />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Monthly Payroll
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
                {formatCurrency(metrics.totalPayroll)}
              </div>
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.12)', color: 'rgb(245, 158, 11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              <RiTimeLine />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Pending Leave Requests
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {metrics.totalPendingLeaves} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>pending</span>
              </div>
            </div>
          </div>

        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <RiSearchLine style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search staff by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <RiCloseLine />
                </button>
              )}
            </div>

            {/* Organization Dropdown (Visible for Super Admin) */}
            {isSuper && filterOptions.organizations.length > 0 && (
              <div style={{ minWidth: 180 }}>
                <select
                  className="form-control"
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                >
                  <option value="">All Organizations</option>
                  {filterOptions.organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Department Dropdown */}
            <div style={{ minWidth: 170 }}>
              <select
                className="form-control"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Role Dropdown */}
            <div style={{ minWidth: 160 }}>
              <select
                className="form-control"
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {filterOptions.roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div style={{ minWidth: 120 }}>
              <select
                className="form-control"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {[currentYear, currentYear - 1, currentYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div style={{ minWidth: 140 }}>
              <select
                className="form-control"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(search || selectedOrg || selectedDept || selectedRole || selectedMonth) && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setSelectedOrg('');
                  setSelectedDept('');
                  setSelectedRole('');
                  setSelectedMonth('');
                }}
                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              >
                Clear Filters
              </button>
            )}

          </div>
        </div>

        {/* Staff Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-secondary)' }}>Loading staff records and leave metrics...</div>
          </div>
        ) : staff.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            No staff records found matching your filters.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Organization / Dept</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'right' }}>Base Salary</th>
                    <th style={{ textAlign: 'center' }}>Leaves Taken</th>
                    <th>Leave Breakdown</th>
                    <th style={{ textAlign: 'center' }}>Quota Balance</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(emp => {
                    const quotaUsedPercent = emp.totalQuota > 0 ? Math.min(100, Math.round((emp.leavesTaken / emp.totalQuota) * 100)) : 0;
                    const isHighLeave = emp.leavesTaken > 15;

                    return (
                      <tr key={emp.id}>
                        {/* Member */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.8rem', fontWeight: 800, flexShrink: 0
                            }}>
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Org / Dept */}
                        <td>
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <RiBuildingLine style={{ color: 'var(--accent)' }} /> {emp.organization?.name || 'Umshiv'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
                              {emp.department?.name || 'General Dept'}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)'
                          }}>
                            {emp.role?.name || 'Staff'}
                          </span>
                        </td>

                        {/* Base Salary */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: emp.baseSalary > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {formatCurrency(emp.baseSalary)}
                          </span>
                        </td>

                        {/* Leaves Taken */}
                        <td style={{ textAlign: 'center' }}>
                          <div>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: isHighLeave ? 'var(--danger)' : emp.leavesTaken > 0 ? '#f59e0b' : 'var(--success)'
                            }}>
                              {emp.leavesTaken} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
                            </span>

                            {/* Mini progress bar */}
                            <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '4px auto 0', overflow: 'hidden' }}>
                              <div style={{
                                width: `${quotaUsedPercent}%`,
                                height: '100%',
                                background: isHighLeave ? 'var(--danger)' : quotaUsedPercent > 60 ? '#f59e0b' : 'var(--success)',
                                borderRadius: 2
                              }} />
                            </div>
                          </div>
                        </td>

                        {/* Breakdown */}
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }} title="Casual Leaves Taken">
                              CL: {emp.leaveBreakdown.casual}
                            </span>
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }} title="Sick Leaves Taken">
                              SL: {emp.leaveBreakdown.sick}
                            </span>
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }} title="Paid Leaves Taken">
                              PL: {emp.leaveBreakdown.paid}
                            </span>
                            {emp.leaveBreakdown.lop > 0 && (
                              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontWeight: 700 }} title="Loss of Pay (LOP) Days">
                                LOP: {emp.leaveBreakdown.lop}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quota Balance */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: emp.leavesRemaining > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {emp.leavesRemaining} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {emp.totalQuota}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee Salary & Leave Quotas"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <RiEditLine /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Salary & Leave Quota Modal */}
        {editingEmployee && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)',
            padding: 16
          }}>
            <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24, position: 'relative' }}>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                style={{
                  position: 'absolute', top: 16, right: 16, background: 'none',
                  border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem'
                }}
              >
                <RiCloseLine />
              </button>

              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiEditLine style={{ color: 'var(--accent)' }} /> Edit Employee Financials & Quotas
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Adjusting compensation and annual leave limits for <strong>{editingEmployee.name}</strong> ({editingEmployee.email}).
              </p>

              <form onSubmit={handleSaveEmployee}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  
                  {/* Base Salary */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Base Monthly Salary (INR)
                    </label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={editForm.baseSalary}
                      onChange={e => setEditForm(p => ({ ...p, baseSalary: e.target.value }))}
                      placeholder="e.g. 50000"
                    />
                  </div>

                  {/* Monthly Leave Quota */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Monthly Leave Accrual / Quota
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editForm.monthlyLeaveQuota}
                      onChange={e => setEditForm(p => ({ ...p, monthlyLeaveQuota: e.target.value }))}
                      placeholder="e.g. 1"
                    />
                  </div>

                  {/* Leave Quota Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        Casual Leaves
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editForm.casualLeaves}
                        onChange={e => setEditForm(p => ({ ...p, casualLeaves: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        Sick Leaves
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editForm.sickLeaves}
                        onChange={e => setEditForm(p => ({ ...p, sickLeaves: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        Paid Leaves
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editForm.paidLeaves}
                        onChange={e => setEditForm(p => ({ ...p, paidLeaves: e.target.value }))}
                      />
                    </div>
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingEmployee(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Financial Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default StaffSummaryPage;
