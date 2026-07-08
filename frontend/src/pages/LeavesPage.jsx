import { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  RiUserHeartLine, RiCheckDoubleLine, RiCloseCircleLine, RiFileList2Line, RiInboxLine
} from 'react-icons/ri';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  useGetMyLeavesQuery,
  useGetTeamLeavesQuery,
  useApplyLeaveMutation,
  useUpdateLeaveStatusMutation
} from '../store/apiSlice';

const LeavesPage = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(user?.role?.level) || user?.isSuperAdmin;

  const [activeTab, setActiveTab] = useState('my-leaves');

  // Leave Form States
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveDuration, setLeaveDuration] = useState('full_day');
  const [halfDaySession, setHalfDaySession] = useState('first_half');
  const [leaveReason, setLeaveReason] = useState('');

  // RTK Query Hooks
  const { data: myLeavesData, isLoading: loadingMyLeaves } = useGetMyLeavesQuery();
  const myLeaves = myLeavesData?.leaves || [];

  const { data: teamLeavesData, isLoading: loadingTeam, error: teamLeavesError } = useGetTeamLeavesQuery();
  const teamLeaves = teamLeavesData?.leaves || [];
  const hasTeamAccess = !teamLeavesError;

  const [applyLeave, { isLoading: submittingLeave }] = useApplyLeaveMutation();
  const [updateLeaveStatus] = useUpdateLeaveStatusMutation();

  // Submit leave request
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) {
      return toast.error('Please fill in all leave request fields');
    }

    try {
      await applyLeave({
        startDate: leaveStart,
        endDate: leaveEnd,
        leaveType,
        leaveDuration,
        halfDaySession: leaveDuration === 'half_day' ? halfDaySession : null,
        reason: leaveReason
      }).unwrap();
      toast.success('Leave request submitted successfully!');
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      setLeaveDuration('full_day');
      setHalfDaySession('first_half');
    } catch (err) {
      toast.error(err.data?.message || 'Failed to submit leave request');
    }
  };

  // Approval status change
  const handleLeaveStatusUpdate = async (id, status) => {
    try {
      await updateLeaveStatus({ id, status }).unwrap();
      toast.success(`Leave request has been ${status}`);
    } catch (err) {
      toast.error(err.data?.message || 'Action failed');
    }
  };

  return (
    <AppLayout title="Leave Management Portal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Top Widgets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          
          {/* Top Leave Request Form */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiUserHeartLine style={{ color: 'var(--accent)' }} /> Submit Leave Application
              </h3>
              <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>From Date</label>
                    <input type="date" className="form-control" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>To Date</label>
                    <input type="date" className="form-control" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Leave Type</label>
                    <select className="form-control" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="earned">Earned Leave</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Duration</label>
                    <select className="form-control" value={leaveDuration} onChange={e => setLeaveDuration(e.target.value)}>
                      <option value="full_day">Full Day</option>
                      <option value="half_day">Half Day</option>
                    </select>
                  </div>
                </div>

                {leaveDuration === 'half_day' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Half Day Session</label>
                      <select className="form-control" value={halfDaySession} onChange={e => setHalfDaySession(e.target.value)}>
                        <option value="first_half">First Half (Morning)</option>
                        <option value="second_half">Second Half (Afternoon)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Reason</label>
                  <textarea className="form-control" rows="2" placeholder="Describe the reason for leave" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} required />
                </div>

                <button type="submit" className="btn btn-primary" disabled={submittingLeave}>
                  {submittingLeave ? 'Submitting request...' : 'Apply Leave'}
                </button>
              </form>
            </div>
          </div>

          {/* Leave Quota & Policy Card */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                ℹ️ Leave Guidelines & Summary
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Quick overview of your leave requests for the current year.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', display: 'block' }}>
                  {myLeaves.filter(l => l.status === 'approved').length}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Approved</span>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', display: 'block' }}>
                  {myLeaves.filter(l => l.status === 'pending').length}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending</span>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', display: 'block' }}>
                  {myLeaves.filter(l => l.status === 'rejected').length}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rejected</span>
              </div>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              📢 <strong>Policy Rule:</strong> Half day leaves must be approved by the Department Head at least 24 hours in advance.
            </div>
          </div>

        </div>

        {/* Tab Selection */}
        <div className="flex border-b" style={{ borderBottom: '1px solid var(--border)', gap: 16 }}>
          {[
            { id: 'my-leaves', label: 'My Leave History', icon: <RiFileList2Line />, show: true },
            { id: 'team-leaves', label: 'Leave Requests Inbox', icon: <RiInboxLine />, show: isAdmin || hasTeamAccess }
          ].filter(tab => tab.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* My Leaves Tab */}
        {activeTab === 'my-leaves' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>My Applied Leaves</h3>
            {loadingMyLeaves ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : myLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No leaves logged yet.</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Dates</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(leave => (
                      <tr key={leave.id}>
                        <td style={{ fontWeight: 700 }}>
                          <div>{leave.startDate} to {leave.endDate}</div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                            {leave.leaveDuration === 'half_day' ? `Half Day: ${leave.halfDaySession === 'first_half' ? 'First Half (Morning)' : 'Second Half (Afternoon)'}` : 'Full Day'}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{leave.leaveType}</td>
                        <td>{leave.reason}</td>
                        <td>
                          <span className={`badge ${leave.status === 'approved' ? 'badge-success' : leave.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                            {leave.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Team Leaves Inbox Tab */}
        {activeTab === 'team-leaves' && (isAdmin || hasTeamAccess) && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Leave Approvals Inbox</h3>
            {loadingTeam ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : teamLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No pending or team leave requests found.</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Dates</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamLeaves.map(leave => (
                      <tr key={leave.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{leave.user?.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{leave.user?.email}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <div>{leave.startDate} to {leave.endDate}</div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                            {leave.leaveDuration === 'half_day' ? `Half Day: ${leave.halfDaySession === 'first_half' ? 'First Half' : 'Second Half'}` : 'Full Day'}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{leave.leaveType}</td>
                        <td>{leave.reason}</td>
                        <td>
                          <span className={`badge ${leave.status === 'approved' ? 'badge-success' : leave.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                            {leave.status}
                          </span>
                        </td>
                        <td>
                          {leave.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-success btn-xs" onClick={() => handleLeaveStatusUpdate(leave.id, 'approved')}>
                                <RiCheckDoubleLine /> Approve
                              </button>
                              <button className="btn btn-danger btn-xs" onClick={() => handleLeaveStatusUpdate(leave.id, 'rejected')}>
                                <RiCloseCircleLine /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default LeavesPage;
