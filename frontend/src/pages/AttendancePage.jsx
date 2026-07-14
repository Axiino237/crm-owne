import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  RiLoginBoxLine, RiLogoutBoxLine, 
  RiTimeLine, RiDeleteBin7Line
} from 'react-icons/ri';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  useGetMySummaryQuery,
  useGetTeamTodayQuery,
  useGetAllHolidaysQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useAddHolidayMutation,
  useDeleteHolidayMutation
} from '../store/apiSlice';

const AttendancePage = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(user?.role?.level) || user?.isSuperAdmin;

  const [activeTab, setActiveTab] = useState('my-attendance');

  // Admin holidays states
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState('public');
  const [holidayDesc, setHolidayDesc] = useState('');

  // Calendar parameters
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // RTK Query hooks
  const { data: summaryData, isLoading: loadingSummary } = useGetMySummaryQuery({ year: currentYear, month: currentMonth });
  const logs = summaryData?.logs || [];
  const leaves = summaryData?.leaves || [];
  const holidays = summaryData?.holidays || [];
  const hasTeamAccess = summaryData?.hasTeamAccess || false;

  const { data: teamData, isLoading: loadingTeam, refetch: refetchTeamData } = useGetTeamTodayQuery(undefined, {
    skip: !isAdmin && !hasTeamAccess
  });
  const teamAttendance = teamData?.teamAttendance || [];

  // Calculate departments list dynamically from team attendance logs
  const departmentsList = ['All', ...new Set(teamAttendance.map(m => m.department).filter(Boolean))];

  // Filter team attendance logs
  const filteredTeamAttendance = teamAttendance.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.role && member.role.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDept === 'All' || member.department === selectedDept;

    const statusStr = member.log ? member.log.status : 'absent';
    const matchesStatus = selectedStatus === 'All' || statusStr === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Client-side CSV export function
  const handleExportCSV = () => {
    const headers = ['Member Name', 'Department', 'Role', 'Check-in Time', 'Check-out Time', 'Work Duration', 'Status'];
    const rows = filteredTeamAttendance.map(member => [
      member.name,
      member.department || 'Unassigned',
      member.role || 'User',
      member.log?.checkIn ? new Date(member.log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      member.log?.checkOut ? new Date(member.log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      member.log ? calculateDuration(member.log.checkIn, member.log.checkOut) : '-',
      member.log ? member.log.status.toUpperCase() : 'ABSENT'
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toLocaleDateString('en-CA');
    link.setAttribute("download", `attendance_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance report exported successfully!');
  };

  const { data: holidaysData } = useGetAllHolidaysQuery(undefined, {
    skip: !isAdmin
  });
  const allHolidays = holidaysData?.holidays || [];

  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();
  const [addHoliday, { isLoading: addingHoliday }] = useAddHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  // Check if user checked in today
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayLog = logs.find(l => l.date === todayStr) || null;

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      const res = await checkIn().unwrap();
      toast.success(res.message || 'Checked in successfully!');
    } catch (err) {
      toast.error(err.data?.message || 'Check-in failed');
    }
  };

  // Handle check-out
  const handleCheckOut = useCallback(async () => {
    try {
      const res = await checkOut().unwrap();
      toast.success(res.message || 'Checked out successfully!');
    } catch (err) {
      toast.error(err.data?.message || 'Check-out failed');
    }
  }, [checkOut]);

  // ── Auto-checkout timer (8 hours from check-in) ───────────────────────────
  const AUTO_CHECKOUT_MS = 8 * 60 * 60 * 1000;
  const WARN_BEFORE_MS   = 15 * 60 * 1000;
  const [extensionMs, setExtensionMs]             = useState(0);
  const [timeLeft, setTimeLeft]                   = useState(null);
  const [showExtendWarning, setShowExtendWarning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!todayLog?.checkIn || todayLog?.checkOut) {
      clearInterval(intervalRef.current);
      setTimeLeft(null);
      setShowExtendWarning(false);
      return;
    }
    const checkInTime = new Date(todayLog.checkIn).getTime();
    const tick = () => {
      const remaining = (checkInTime + AUTO_CHECKOUT_MS + extensionMs) - Date.now();
      setTimeLeft(remaining);
      if (remaining <= WARN_BEFORE_MS && remaining > 0) setShowExtendWarning(true);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setShowExtendWarning(false);
        handleCheckOut();
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [todayLog?.checkIn, todayLog?.checkOut, extensionMs, handleCheckOut]);

  const handleExtend = (extraMinutes) => {
    setExtensionMs(prev => prev + extraMinutes * 60 * 1000);
    setShowExtendWarning(false);
    toast.success(`⏰ Session extended by ${extraMinutes} minutes!`);
  };

  const formatTimeLeft = (ms) => {
    if (!ms || ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hrs  = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Admin holiday actions
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayName || !holidayDate) {
      return toast.error('Name and Date are required');
    }

    try {
      await addHoliday({
        name: holidayName,
        date: holidayDate,
        type: holidayType,
        description: holidayDesc
      }).unwrap();
      toast.success('Holiday added successfully!');
      setHolidayName('');
      setHolidayDate('');
      setHolidayDesc('');
    } catch (err) {
      toast.error(err.data?.message || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await deleteHoliday(id).unwrap();
      toast.success('Holiday deleted');
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  // Generate Calendar dates
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();

  const calendarDays = [];
  // Add empty slots for first week padding
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return '-';
    const diffMs = new Date(checkOutTime) - new Date(checkInTime);
    if (diffMs < 0) return '-';
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs} hrs ${mins} mins`;
  };

  const getDayStatus = (day) => {
    if (!day) return null;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 1. Check holidays
    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      return { type: 'holiday', label: `Holiday: ${holiday.name}`, color: '#c084fc', typeCode: holiday.type };
    }

    // 2. Check attendance logs
    const log = logs.find(l => l.date === dateStr);
    if (log) {
      const duration = log.checkOut ? calculateDuration(log.checkIn, log.checkOut) : 'Active';
      if (log.status === 'present') return { type: 'present', label: `Present (${formatTime(log.checkIn)})`, color: 'var(--success)', duration };
      if (log.status === 'late') return { type: 'late', label: `Late Arrival (${formatTime(log.checkIn)})`, color: '#f59e0b', duration };
      if (log.status === 'on_leave') return { type: 'leave', label: 'On Leave', color: '#38bdf8' };
      if (log.status === 'half_day') return { type: 'half_day', label: 'Half Day Leave', color: '#e0f2fe' };
      return { type: log.status, label: log.status, color: 'var(--accent)', duration };
    }

    // 3. Check approved leaves
    const leave = leaves.find(l => {
      return dateStr >= l.startDate && dateStr <= l.endDate;
    });
    if (leave) {
      const statusLabel = leave.leaveDuration === 'half_day' ? 'Half Day Leave' : 'On Leave';
      const statusColor = leave.leaveDuration === 'half_day' ? '#e0f2fe' : '#38bdf8';
      const statusType = leave.leaveDuration === 'half_day' ? 'half_day' : 'leave';
      return { type: statusType, label: statusLabel, color: statusColor };
    }

    // 4. Future dates or weekends
    const checkDate = new Date(currentYear, currentMonth - 1, day);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (checkDate > today) {
      return { type: 'future', label: 'Future', color: 'var(--text-muted)' };
    }

    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { type: 'weekend', label: 'Weekend', color: 'var(--bg-secondary)' };
    }

    return { type: 'absent', label: 'Absent / No Record', color: 'var(--danger)' };
  };

  return (
    <AppLayout title="Attendance Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Top Widgets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          
          {/* Check-In/Out Card */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiTimeLine style={{ color: 'var(--accent)' }} /> Mark Attendance
              </h3>
              <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 12, border: '1px solid var(--border)', display: 'inline-block' }}>
                ⏰ Office Shift: 09:30 AM - 06:30 PM
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Check-in daily before 09:30 AM to avoid late check-in marking.
              </p>
            </div>

            <div>
              {loadingSummary ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><div className="spinner" /></div>
              ) : todayLog ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Check-in time:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatTime(todayLog.checkIn)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <span className={`badge ${todayLog.status === 'present' ? 'badge-success' : todayLog.status === 'late' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'uppercase' }}>
                      {todayLog.status}
                    </span>
                  </div>
                  {todayLog.checkOut ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Check-out time:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{formatTime(todayLog.checkOut)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginTop: 4, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Work Duration:</span>
                        <strong style={{ color: 'var(--accent)' }}>{calculateDuration(todayLog.checkIn, todayLog.checkOut)}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Countdown Timer */}
                      {timeLeft !== null && (
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', borderRadius: 8,
                          background: timeLeft < WARN_BEFORE_MS ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.07)',
                          border: `1px solid ${timeLeft < WARN_BEFORE_MS ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)'}`
                        }}>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            ⏱ Auto-checkout in
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.06em', color: timeLeft < WARN_BEFORE_MS ? '#ef4444' : '#10b981' }}>
                            {formatTimeLeft(timeLeft)}
                          </span>
                        </div>
                      )}

                      {/* Extend Warning Banner */}
                      {showExtendWarning && (
                        <div style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.07)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
                            ⚠️ Auto-checkout soon! Extend session?
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleExtend(30)}
                              style={{ flex: 1, padding: '7px 0', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>
                              +30 min
                            </button>
                            <button onClick={() => handleExtend(60)}
                              style={{ flex: 1, padding: '7px 0', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>
                              +1 hour
                            </button>
                            <button onClick={() => setShowExtendWarning(false)}
                              style={{ padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      )}

                      <button className="btn btn-outline-danger" onClick={handleCheckOut} style={{ width: '100%', marginTop: 4 }}>
                        <RiLogoutBoxLine /> Check Out Now
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button className="btn btn-primary" onClick={handleCheckIn} style={{ width: '100%', padding: '14px' }}>
                  <RiLoginBoxLine /> Check In Now
                </button>
              )}
            </div>
          </div>

          {/* Attendance Stats Summary */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                📊 Monthly Stats Summary
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Overview of your checked logs for this month.
              </p>
            </div>

            {loadingSummary ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', flexGrow: 1 }}><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', display: 'block' }}>
                    {logs.filter(l => l.status === 'present').length}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Present Days</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', display: 'block' }}>
                    {logs.filter(l => l.status === 'late').length}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Late Arrivals</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', display: 'block' }}>
                    {logs.filter(l => l.status === 'on_leave' || l.status === 'half_day').length}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>On Leave</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Tab Selection */}
        <div className="flex border-b" style={{ borderBottom: '1px solid var(--border)', gap: 16 }}>
          {[
            { id: 'my-attendance', label: 'My Attendance Calendar', show: true },
            { id: 'team-attendance', label: 'Team Daily Logs', show: isAdmin || hasTeamAccess },
            { id: 'admin-holidays', label: 'Holidays Configuration', show: isAdmin }
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
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Calendar View Tab */}
        {activeTab === 'my-attendance' && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => {
                  if (currentMonth === 1) {
                    setCurrentMonth(12);
                    setCurrentYear(y => y - 1);
                  } else {
                    setCurrentMonth(m => m - 1);
                  }
                }}>&lt; Previous</button>
                <button className="btn btn-outline btn-sm" onClick={() => {
                  if (currentMonth === 12) {
                    setCurrentMonth(1);
                    setCurrentYear(y => y + 1);
                  } else {
                    setCurrentMonth(m => m + 1);
                  }
                }}>Next &gt;</button>
              </div>
            </div>

            {loadingSummary ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : (
              <div>
                {/* Calendar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', paddingBottom: 8 }}>{d}</div>
                  ))}
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} style={{ background: 'transparent' }} />;
                    
                    const status = getDayStatus(day);
                    const isHoliday = status?.type === 'holiday';
                    const isWeekend = status?.type === 'weekend';
                    const isPresent = status?.type === 'present' || status?.type === 'late';
                    
                    return (
                      <div 
                        key={day} 
                        style={{
                          minHeight: 80,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: isHoliday ? 'rgba(192, 132, 252, 0.08)' : isWeekend ? 'var(--bg-secondary)' : 'var(--bg-card)',
                          padding: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          opacity: status?.type === 'future' ? 0.4 : 1
                        }}
                        title={status?.label}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{day}</span>
                        {status && status.type !== 'future' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, width: '100%' }}>
                            <span 
                              style={{ 
                                fontSize: '0.62rem', 
                                fontWeight: 700, 
                                color: status.color, 
                                background: isHoliday ? 'rgba(192, 132, 252, 0.12)' : isPresent ? 'rgba(16, 185, 129, 0.12)' : status.type === 'half_day' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                padding: '2px 4px',
                                borderRadius: 4,
                                maxWidth: '100%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {status.type === 'holiday' ? status.label.replace('Holiday: ', '') : status.type}
                            </span>
                            {status.duration && status.duration !== '-' && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                ⏱️ {status.duration.replace(' hrs', 'h').replace(' mins', 'm')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Attendance Logs */}
        {activeTab === 'team-attendance' && (isAdmin || hasTeamAccess) && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Today's Presence Dashboard</h3>
              <button className="btn btn-outline btn-sm" onClick={refetchTeamData}>Refresh Logs</button>
            </div>

            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 20,
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              alignItems: 'center'
            }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Search Member / Role</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search by name or role..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                />
              </div>
              
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Department</label>
                <select 
                  className="form-control" 
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  {departmentsList.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Presence Status</label>
                <select 
                  className="form-control" 
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', marginLeft: 'auto' }}>
                <button 
                  type="button"
                  className="btn btn-outline btn-sm" 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDept('All');
                    setSelectedStatus('All');
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  Reset
                </button>
                <button 
                  type="button"
                  className="btn btn-primary btn-sm" 
                  onClick={handleExportCSV}
                  disabled={filteredTeamAttendance.length === 0}
                  style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  📥 Export CSV ({filteredTeamAttendance.length})
                </button>
              </div>
            </div>

            {loadingTeam ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : filteredTeamAttendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No attendance logs found matching the selected filters.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamAttendance.map(member => (
                      <tr key={member.id}>
                        <td style={{ fontWeight: 700 }}>{member.name}</td>
                        <td>{member.department}</td>
                        <td>{member.role}</td>
                        <td>{member.log?.checkIn ? formatTime(member.log.checkIn) : '-'}</td>
                        <td>{member.log?.checkOut ? formatTime(member.log.checkOut) : '-'}</td>
                        <td style={{ fontWeight: 600, color: member.log?.checkOut ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {calculateDuration(member.log?.checkIn, member.log?.checkOut)}
                        </td>
                        <td>
                          {member.log ? (
                            <span className={`badge ${member.log.status === 'present' ? 'badge-success' : member.log.status === 'late' ? 'badge-warning' : member.log.status === 'half_day' ? 'badge-info' : 'badge-primary'}`} style={{ textTransform: 'uppercase' }}>
                              {member.log.status}
                            </span>
                          ) : (
                            <span className="badge badge-danger">ABSENT</span>
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

        {/* Holidays Config (Admins only) */}
        {activeTab === 'admin-holidays' && isAdmin && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Create Holiday form */}
            <div className="card" style={{ padding: 24, height: 'fit-content' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Add Office Holiday</h3>
              <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">Holiday Name</label>
                  <input type="text" className="form-control" placeholder="e.g. Diwali, New Year" value={holidayName} onChange={e => setHolidayName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Holiday Date</label>
                  <input type="date" className="form-control" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-control" value={holidayType} onChange={e => setHolidayType(e.target.value)}>
                    <option value="public">National/Public Holiday</option>
                    <option value="restricted">Restricted Holiday</option>
                    <option value="company">Company Holiday</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Description (Optional)</label>
                  <textarea className="form-control" rows="2" placeholder="Brief description" value={holidayDesc} onChange={e => setHolidayDesc(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={addingHoliday}>
                  {addingHoliday ? 'Adding...' : 'Save Holiday'}
                </button>
              </form>
            </div>

            {/* List of holidays */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Office Holiday Calendar List</h3>
              {allHolidays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No office holidays created yet.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Holiday Name</th>
                        <th>Type</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allHolidays.map(hol => (
                        <tr key={hol.id}>
                          <td style={{ fontWeight: 700 }}>{hol.date}</td>
                          <td>{hol.name}</td>
                          <td>
                            <span className={`badge ${hol.type === 'restricted' ? 'badge-warning' : 'badge-accent'}`}>
                              {hol.type}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-outline btn-xs" onClick={() => handleDeleteHoliday(hol.id)} style={{ color: 'var(--danger)' }}>
                              <RiDeleteBin7Line />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default AttendancePage;
