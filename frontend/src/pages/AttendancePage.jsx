import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  RiLoginBoxLine, RiLogoutBoxLine, 
  RiTimeLine, RiDeleteBin7Line,
  RiEditBoxLine, RiCheckDoubleLine, RiCloseCircleLine, RiMoneyDollarCircleLine,
  RiFileList2Line, RiUserStarLine, RiRefreshLine
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
  useDeleteHolidayMutation,
  useGetMyRegularizationsQuery,
  useGetTeamRegularizationsQuery,
  useApplyRegularizationMutation,
  useUpdateRegularizationStatusMutation,
  useGetPayrollSummaryQuery
} from '../store/apiSlice';

const AttendancePage = () => {
  const { user, hasPermission } = useAuth();
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
  const todayDateStr = new Date().toLocaleDateString('en-CA');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Date Period & Monthly Filter States
  const [periodPreset, setPeriodPreset] = useState('today'); // 'today' | 'this_month' | 'last_month' | 'month_picker' | 'custom'
  const [startDate, setStartDate] = useState(todayDateStr);
  const [endDate, setEndDate] = useState(todayDateStr);
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  // Handlers for period selection
  const handlePeriodPresetChange = (preset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;

    if (preset === 'today') {
      const t = now.toLocaleDateString('en-CA');
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'this_month') {
      const mStr = String(currMonth).padStart(2, '0');
      const lastDay = new Date(currYear, currMonth, 0).getDate();
      setStartDate(`${currYear}-${mStr}-01`);
      setEndDate(`${currYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
      setFilterMonth(String(currMonth));
      setFilterYear(String(currYear));
    } else if (preset === 'last_month') {
      const lastMonthDate = new Date(currYear, currMonth - 2, 1);
      const lmYear = lastMonthDate.getFullYear();
      const lmMonth = lastMonthDate.getMonth() + 1;
      const mStr = String(lmMonth).padStart(2, '0');
      const lastDay = new Date(lmYear, lmMonth, 0).getDate();
      setStartDate(`${lmYear}-${mStr}-01`);
      setEndDate(`${lmYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
      setFilterMonth(String(lmMonth));
      setFilterYear(String(lmYear));
    }
  };

  const handleMonthYearChange = (m, y) => {
    const selM = parseInt(m, 10);
    const selY = parseInt(y, 10);
    const mStr = String(selM).padStart(2, '0');
    const lastDay = new Date(selY, selM, 0).getDate();
    setFilterMonth(String(selM));
    setFilterYear(String(selY));
    setStartDate(`${selY}-${mStr}-01`);
    setEndDate(`${selY}-${mStr}-${String(lastDay).padStart(2, '0')}`);
  };

  // RTK Query hooks
  const { data: summaryData, isLoading: loadingSummary, refetch: refetchSummary } = useGetMySummaryQuery({ year: currentYear, month: currentMonth });
  const logs = summaryData?.logs || [];
  const leaves = summaryData?.leaves || [];
  const holidays = summaryData?.holidays || [];
  const hasTeamAccess = summaryData?.hasTeamAccess || false;

  // UAM Permissions for Attendance Scoping
  const hasTeamPerm = hasPermission('attendance', ['attendance-team', 'attendance-all-departments'], 'canView');
  const hasAllDeptsPerm = hasPermission('attendance', 'attendance-all-departments', 'canView');
  const canAccessTeam = isAdmin || hasTeamAccess || hasTeamPerm;

  const { data: teamData, isLoading: loadingTeam, refetch: refetchTeamData } = useGetTeamTodayQuery({
    startDate,
    endDate
  }, {
    skip: !canAccessTeam
  });
  const teamAttendance = teamData?.teamAttendance || [];
  const canSwitchAllDepts = isAdmin || hasAllDeptsPerm || Boolean(teamData?.canSwitchAllDepts);

  // Calculate departments list dynamically from team attendance logs or user's department
  const availableDepts = [...new Set(teamAttendance.map(m => m.department).filter(Boolean))];
  const departmentsList = canSwitchAllDepts
    ? ['All', ...availableDepts]
    : (availableDepts.length > 0 ? availableDepts : [user?.department?.name || teamData?.userDeptName || 'Your Department']);

  // Auto-lock selected department to user's assigned department if no all-departments permission
  useEffect(() => {
    if (!canSwitchAllDepts) {
      const userDept = user?.department?.name || teamData?.userDeptName || (availableDepts[0] || '');
      if (userDept && selectedDept !== userDept) {
        setSelectedDept(userDept);
      }
    }
  }, [canSwitchAllDepts, user?.department?.name, teamData?.userDeptName, availableDepts.length]);

  // Filter team attendance logs
  const filteredTeamAttendance = teamAttendance.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.role && member.role.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDept === 'All' || member.department === selectedDept;

    const statusStr = member.log ? member.log.status : 'absent';
    const matchesStatus = selectedStatus === 'All' || statusStr === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const isMultiDay = startDate !== endDate;

  // Client-side CSV export function supporting single date and date range / month
  const handleExportCSV = () => {
    const headers = isMultiDay
      ? ['Date', 'Member Name', 'Department', 'Role', 'Check-in Time', 'Check-out Time', 'Work Duration', 'Status', 'Notes']
      : ['Member Name', 'Department', 'Role', 'Check-in Time', 'Check-out Time', 'Work Duration', 'Status'];

    const rows = filteredTeamAttendance.map(member => {
      const checkInStr = member.log?.checkIn ? new Date(member.log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const checkOutStr = member.log?.checkOut ? new Date(member.log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const durationStr = member.log?.checkIn ? calculateDuration(member.log.checkIn, member.log.checkOut) : '-';
      const statusStr = member.log ? member.log.status.toUpperCase() : 'ABSENT';
      const notesStr = member.log?.notes || '-';

      if (isMultiDay) {
        return [
          member.date || startDate,
          member.name,
          member.department || 'Unassigned',
          member.role || 'User',
          checkInStr,
          checkOutStr,
          durationStr,
          statusStr,
          notesStr
        ];
      } else {
        return [
          member.name,
          member.department || 'Unassigned',
          member.role || 'User',
          checkInStr,
          checkOutStr,
          durationStr,
          statusStr
        ];
      }
    });

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = isMultiDay
      ? `team_attendance_${startDate}_to_${endDate}.csv`
      : `team_attendance_${startDate}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredTeamAttendance.length} records (${isMultiDay ? `${startDate} to ${endDate}` : startDate})`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept(canSwitchAllDepts ? 'All' : (user?.department?.name || 'Your Department'));
    setSelectedStatus('All');
    handlePeriodPresetChange('today');
  };

  const { data: holidaysData } = useGetAllHolidaysQuery(undefined, {
    skip: !isAdmin
  });
  const allHolidays = holidaysData?.holidays || [];

  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();
  const [addHoliday, { isLoading: addingHoliday }] = useAddHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  // Regularization States & Hooks
  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regInTime, setRegInTime] = useState('09:30');
  const [regOutTime, setRegOutTime] = useState('18:30');
  const [regReason, setRegReason] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  const { data: myRegsData, isLoading: loadingMyRegs, refetch: refetchMyRegs } = useGetMyRegularizationsQuery();
  const myRegs = myRegsData?.requests || [];

  const { data: teamRegsData, isLoading: loadingTeamRegs, refetch: refetchTeamRegs } = useGetTeamRegularizationsQuery(undefined, {
    skip: !isAdmin && !hasTeamAccess
  });
  const teamRegs = teamRegsData?.requests || [];

  const [applyRegularization] = useApplyRegularizationMutation();
  const [updateRegularizationStatus] = useUpdateRegularizationStatusMutation();

  // Payroll Summary States & Hooks
  const [payrollMonth, setPayrollMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const { data: payrollData, isLoading: loadingPayroll } = useGetPayrollSummaryQuery({ month: payrollMonth }, {
    skip: !isAdmin && !hasTeamAccess
  });
  const payrollEmployees = payrollData?.employees || [];

  // Handle Apply Regularization
  const handleApplyRegularization = async (e) => {
    e.preventDefault();
    if (!regDate || !regReason) {
      return toast.error('Date and reason are required');
    }
    setSubmittingReg(true);
    try {
      const res = await applyRegularization({
        date: regDate,
        checkIn: `${regDate}T${regInTime}:00`,
        checkOut: `${regDate}T${regOutTime}:00`,
        reason: regReason
      }).unwrap();
      toast.success(res.message || 'Correction request submitted!');
      setShowRegularizeModal(false);
      setRegDate('');
      setRegReason('');
      if (refetchMyRegs) refetchMyRegs();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to submit correction request');
    } finally {
      setSubmittingReg(false);
    }
  };

  // Handle Update Regularization Status (Approve/Reject)
  const handleRegularizationStatus = async (id, status) => {
    try {
      const res = await updateRegularizationStatus({ id, status }).unwrap();
      toast.success(res.message || `Correction request ${status}`);
      if (refetchTeamRegs) refetchTeamRegs();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to update request');
    }
  };

  // Check if user checked in today
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayLog = logs.find(l => l.date === todayStr) || null;

  // Track if current time is past 09:30 AM shift start cutoff
  const [isPastShiftStart, setIsPastShiftStart] = useState(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(9, 30, 59, 999);
    return now > cutoff;
  });

  useEffect(() => {
    const checkCutoff = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(9, 30, 59, 999);
      setIsPastShiftStart(now > cutoff);
    };
    checkCutoff();
    const timer = setInterval(checkCutoff, 10000);
    return () => clearInterval(timer);
  }, []);

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      const res = await checkIn().unwrap();
      toast.success(res.message || 'Checked in successfully!');
      if (refetchSummary) refetchSummary();
      if (refetchTeamData) refetchTeamData();
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          
          {/* Check-In/Out Card */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiTimeLine style={{ color: 'var(--accent)' }} /> Mark Attendance
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, border: '1px solid var(--border)' }}>
                  ⏰ Office Shift: 09:30 AM - 06:30 PM
                </div>
                {!todayLog && (
                  <span className={`badge ${isPastShiftStart ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem', padding: '4px 8px', textTransform: 'uppercase', fontWeight: 700 }}>
                    {isPastShiftStart ? '⚠️ Late Window (> 09:30 AM)' : '✅ On-Time Window'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                {isPastShiftStart && !todayLog 
                  ? 'Current time has exceeded 09:30 AM. Checking in now will be recorded as Late arrival.'
                  : 'Check-in daily before 09:30 AM to avoid late check-in marking.'}
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
                    <span className={`badge ${todayLog.status === 'present' ? 'badge-success' : todayLog.status === 'late' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                      {todayLog.status === 'late' ? '⚠️ LATE' : todayLog.status}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {isPastShiftStart && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1.5px solid rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.8rem',
                      color: '#f59e0b',
                      fontWeight: 600
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>⏰</span>
                      <div>
                        <strong>Shift started at 09:30 AM.</strong>
                        <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Check-in will be marked as <span style={{ fontWeight: 800, textDecoration: 'underline' }}>LATE</span>.</div>
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn btn-primary" 
                    onClick={handleCheckIn} 
                    style={{ 
                      width: '100%', 
                      padding: '14px',
                      background: isPastShiftStart ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined,
                      borderColor: isPastShiftStart ? '#f59e0b' : undefined,
                      boxShadow: isPastShiftStart ? '0 4px 14px rgba(245, 158, 11, 0.3)' : undefined
                    }}
                  >
                    <RiLoginBoxLine /> {isPastShiftStart ? 'Check In Now (Late Check-in)' : 'Check In Now'}
                  </button>
                </div>
              )}

              {/* Missed Punch / Regularization Button */}
              <button 
                className="btn btn-outline" 
                onClick={() => setShowRegularizeModal(true)} 
                style={{ width: '100%', marginTop: 10, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <RiEditBoxLine /> Missed Punch / Absent Correction
              </button>
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
        <div className="flex border-b" style={{ borderBottom: '1px solid var(--border)', gap: 16, overflowX: 'auto' }}>
          {[
            { id: 'my-attendance', label: 'My Attendance Calendar', show: true },
            { id: 'my-regularizations', label: 'My Correction Requests', show: true },
            { id: 'team-regularizations', label: `Correction Approvals ${teamRegs.filter(r => r.status === 'pending').length > 0 ? `(${teamRegs.filter(r => r.status === 'pending').length})` : ''}`, show: canAccessTeam },
            { id: 'payroll-summary', label: 'Monthly Payroll & Deductions', show: canAccessTeam },
            { id: 'team-attendance', label: 'Team Daily Logs', show: canAccessTeam },
            { id: 'admin-holidays', label: 'Holidays Configuration', show: isAdmin }
          ].filter(tab => tab.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
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
        {activeTab === 'team-attendance' && canAccessTeam && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{isMultiDay ? '🗓️ Team Presence Logs' : '📅 Today\'s Presence Dashboard'}</span>
                  <span className="badge" style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', fontWeight: 700 }}>
                    {isMultiDay ? `${startDate} to ${endDate}` : startDate}
                  </span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isMultiDay
                    ? `Showing team check-ins, leaves, and attendance logs across ${startDate} to ${endDate}`
                    : 'Real-time check-in, check-out, and active duty status for today'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={refetchTeamData}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.8rem' }}
                >
                  <RiRefreshLine className={loadingTeam ? 'spinner' : ''} /> Refresh Logs
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginBottom: 20,
              padding: '16px 18px',
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}>
              {/* Filter Controls Row */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                alignItems: 'center'
              }}>
                {/* Search Member / Role */}
                <div style={{ flex: '1 1 200px', minWidth: 170 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Search Member / Role</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search by name or role..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                  />
                </div>
                
                {/* Department Filter */}
                <div style={{ flex: '1 1 160px', minWidth: 150 }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <span>Department</span>
                    {!canSwitchAllDepts && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🔒 (Your Dept)</span>
                    )}
                  </label>
                  <select 
                    className="form-control" 
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    disabled={!canSwitchAllDepts}
                    title={!canSwitchAllDepts ? 'Department locked to your assigned department' : 'Switch department'}
                    style={{
                      fontSize: '0.8rem',
                      padding: '7px 12px',
                      cursor: canSwitchAllDepts ? 'pointer' : 'default',
                      opacity: canSwitchAllDepts ? 1 : 0.85
                    }}
                  >
                    {departmentsList.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Presence Status */}
                <div style={{ flex: '1 1 130px', minWidth: 120 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Presence Status</label>
                  <select 
                    className="form-control" 
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="late">Late Arrival</option>
                    <option value="half_day">Half Day</option>
                    <option value="on_leave">On Leave</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                {/* Period Mode Selector */}
                <div style={{ flex: '1 1 170px', minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Date / Range Filter</label>
                  <select
                    className="form-control"
                    value={periodPreset}
                    onChange={e => handlePeriodPresetChange(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '7px 12px', fontWeight: 600 }}
                  >
                    <option value="today">📅 Today ({todayDateStr})</option>
                    <option value="this_month">🗓️ This Month ({new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })})</option>
                    <option value="last_month">🗓️ Last Month</option>
                    <option value="month_picker">📆 Specific Month...</option>
                    <option value="custom">🔍 Custom Date Range...</option>
                  </select>
                </div>

                {/* Specific Month / Year selector if month_picker is active */}
                {periodPreset === 'month_picker' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flex: '1 1 200px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Month</label>
                      <select
                        className="form-control"
                        value={filterMonth}
                        onChange={e => handleMonthYearChange(e.target.value, filterYear)}
                        style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                      >
                        {[
                          { m: '1', l: 'January' }, { m: '2', l: 'February' }, { m: '3', l: 'March' },
                          { m: '4', l: 'April' }, { m: '5', l: 'May' }, { m: '6', l: 'June' },
                          { m: '7', l: 'July' }, { m: '8', l: 'August' }, { m: '9', l: 'September' },
                          { m: '10', l: 'October' }, { m: '11', l: 'November' }, { m: '12', l: 'December' }
                        ].map(({ m, l }) => (
                          <option key={m} value={m}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 85 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Year</label>
                      <select
                        className="form-control"
                        value={filterYear}
                        onChange={e => handleMonthYearChange(filterMonth, e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                      >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Custom Date Range if custom is active */}
                {periodPreset === 'custom' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flex: '1 1 230px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>From Date</label>
                      <input 
                        type="date"
                        className="form-control"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>To Date</label>
                      <input 
                        type="date"
                        className="form-control"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', marginLeft: 'auto' }}>
                  <button 
                    type="button"
                    className="btn btn-outline btn-sm" 
                    onClick={handleResetFilters}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    Reset
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary btn-sm" 
                    onClick={handleExportCSV}
                    disabled={filteredTeamAttendance.length === 0}
                    style={{
                      padding: '8px 18px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(99,102,241,0.25)'
                    }}
                  >
                    📥 Export CSV ({filteredTeamAttendance.length})
                  </button>
                </div>
              </div>

              {/* Summary Metrics Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
                  Filtered Metrics ({isMultiDay ? `${startDate} to ${endDate}` : startDate}):
                </span>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent)', fontSize: '0.72rem', padding: '3px 8px' }}>
                  Total: {filteredTeamAttendance.length}
                </span>
                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)', fontSize: '0.72rem', padding: '3px 8px' }}>
                  Present: {filteredTeamAttendance.filter(m => m.log?.status === 'present').length}
                </span>
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '0.72rem', padding: '3px 8px' }}>
                  Late: {filteredTeamAttendance.filter(m => m.log?.status === 'late').length}
                </span>
                <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', fontSize: '0.72rem', padding: '3px 8px' }}>
                  Half Day: {filteredTeamAttendance.filter(m => m.log?.status === 'half_day').length}
                </span>
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', fontSize: '0.72rem', padding: '3px 8px' }}>
                  Absent / Leave: {filteredTeamAttendance.filter(m => !m.log || m.log?.status === 'absent' || m.log?.status === 'on_leave').length}
                </span>
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
                      {isMultiDay && <th style={{ minWidth: 105 }}>Date</th>}
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
                        {isMultiDay && (
                          <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            📅 {member.date || member.log?.date || startDate}
                          </td>
                        )}
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
                            <span className={`badge ${member.log.status === 'present' ? 'badge-success' : member.log.status === 'late' ? 'badge-warning' : member.log.status === 'half_day' ? 'badge-info' : member.log.status === 'on_leave' ? 'badge-primary' : 'badge-danger'}`} style={{ textTransform: 'uppercase' }}>
                              {member.log.status === 'on_leave' ? 'ON LEAVE' : member.log.status}
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

            {/* Developed by axiino.com credit line */}
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Developed by <a href="https://axiino.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>axiino.com</a>
            </div>
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

        {/* My Correction Requests Tab */}
        {activeTab === 'my-regularizations' && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>My Attendance Correction Requests</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Requests submitted to convert absent days to present with approval from your manager.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRegularizeModal(true)}>
                <RiEditBoxLine /> Apply New Correction
              </button>
            </div>

            {loadingMyRegs ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : myRegs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                No attendance correction requests submitted.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Correction Date</th>
                      <th>Expected In / Out</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Approved By</th>
                      <th>Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRegs.map(reg => (
                      <tr key={reg.id}>
                        <td style={{ fontWeight: 700 }}>{reg.date}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {reg.checkIn ? new Date(reg.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:30 AM'}
                          {' — '}
                          {reg.checkOut ? new Date(reg.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:30 PM'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{reg.reason}</td>
                        <td>
                          {reg.status === 'approved' && (
                            <span className="badge badge-success">✅ Approved (Present)</span>
                          )}
                          {reg.status === 'pending' && (
                            <span className="badge badge-warning">⏳ Pending Approval</span>
                          )}
                          {reg.status === 'rejected' && (
                            <span className="badge badge-danger">❌ Rejected (Absent)</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {reg.approver?.name || '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(reg.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Team Correction Approvals Tab (Mapped Manager & Admin only) */}
        {activeTab === 'team-regularizations' && (isAdmin || hasTeamAccess) && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Team Attendance Correction Approvals</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Review and approve correction requests for employees mapped to you. Approving a request marks the day as <strong>PRESENT</strong> and removes salary deduction.
              </p>
            </div>

            {loadingTeamRegs ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : teamRegs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                No attendance correction requests from your team members.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Timing</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRegs.map(reg => (
                      <tr key={reg.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700 }}>{reg.user?.name}</span>
                            {reg.user?.department?.name && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 600, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                {reg.user.department.name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{reg.user?.email}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{reg.date}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {reg.checkIn ? new Date(reg.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:30 AM'}
                          {' — '}
                          {reg.checkOut ? new Date(reg.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:30 PM'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{reg.reason}</td>
                        <td>
                          {reg.status === 'approved' && <span className="badge badge-success">Approved (Present)</span>}
                          {reg.status === 'pending' && <span className="badge badge-warning">Pending Review</span>}
                          {reg.status === 'rejected' && <span className="badge badge-danger">Rejected</span>}
                        </td>
                        <td>
                          {reg.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button 
                                className="btn btn-success btn-xs" 
                                onClick={() => handleRegularizationStatus(reg.id, 'approved')}
                                title="Approve and mark Present"
                              >
                                <RiCheckDoubleLine /> Approve (Mark Present)
                              </button>
                              <button 
                                className="btn btn-danger btn-xs" 
                                onClick={() => handleRegularizationStatus(reg.id, 'rejected')}
                                title="Reject request"
                              >
                                <RiCloseCircleLine /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reviewed</span>
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

        {/* Monthly Payroll & Deductions Summary Tab */}
        {activeTab === 'payroll-summary' && (isAdmin || hasTeamAccess) && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiMoneyDollarCircleLine style={{ color: '#10b981', fontSize: '1.2rem' }} /> Monthly Payroll & Absent Deductions
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Salary calculation based on base salary, monthly free leave quota, unregularized absences, and excess leaves (LOP).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Month:</label>
                <input 
                  type="month" 
                  className="form-control" 
                  style={{ width: 'auto', padding: '6px 12px' }}
                  value={payrollMonth} 
                  onChange={e => setPayrollMonth(e.target.value)} 
                />
              </div>
            </div>

            {/* KPI Cards */}
            {payrollData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Employees</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{payrollData.totalEmployees || 0}</div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Gross Base Payroll</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#93c5fd', marginTop: 4 }}>₹{(payrollData.totalBasePayroll || 0).toLocaleString()}</div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Total Deductions (Absent/LOP)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fca5a5', marginTop: 4 }}>-₹{(payrollData.totalDeductions || 0).toLocaleString()}</div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Net Payable Payroll</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6ee7b7', marginTop: 4 }}>₹{(payrollData.totalNetPayroll || 0).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Payroll Table */}
            {loadingPayroll ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
            ) : payrollEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No active employees found for this month.</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Manager</th>
                      <th>Base Salary</th>
                      <th>Present</th>
                      <th>Free Leave (Paid)</th>
                      <th>Absent Days</th>
                      <th>Excess Leave (LOP)</th>
                      <th>Total Deduction</th>
                      <th>Net Payable Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollEmployees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.department} • {emp.role}</div>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {emp.manager !== 'None' ? (
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>👤 {emp.manager}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Direct</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>₹{emp.baseSalary.toLocaleString()}</strong>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>₹{emp.perDaySalary}/day</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--success)' }}>{emp.presentDays} d</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>{emp.paidLeaveDays} / {emp.monthlyQuota} d</span>
                        </td>
                        <td>
                          {emp.absentDays > 0 ? (
                            <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{emp.absentDays} d</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td>
                          {emp.excessLeaveDays > 0 ? (
                            <span style={{ fontWeight: 800, color: '#f59e0b' }}>{emp.excessLeaveDays} d (LOP)</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td>
                          {emp.totalDeductionAmount > 0 ? (
                            <div>
                              <strong style={{ color: 'var(--danger)' }}>-₹{emp.totalDeductionAmount.toLocaleString()}</strong>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.totalDeductionDays} day(s) cut</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>₹0</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                            ₹{emp.netPayableSalary.toLocaleString()}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Regularization / Attendance Correction Modal */}
        {showRegularizeModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiEditBoxLine style={{ color: 'var(--accent)' }} /> Apply Attendance Correction
                </h3>
                <button className="btn btn-icon" onClick={() => setShowRegularizeModal(false)}>✕</button>
              </div>
              <form onSubmit={handleApplyRegularization}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    💡 If you missed check-in or had punch errors, request a correction here. Once your mapped manager approves, your attendance will be updated to <strong>PRESENT</strong>, saving salary deductions.
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Date of Correction *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      max={new Date().toLocaleDateString('en-CA')} 
                      value={regDate} 
                      onChange={e => setRegDate(e.target.value)} 
                      required 
                      id="reg-date"
                    />
                  </div>

                  <div className="grid-2">
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Check-In Time</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        value={regInTime} 
                        onChange={e => setRegInTime(e.target.value)} 
                        required 
                        id="reg-in-time"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Check-Out Time</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        value={regOutTime} 
                        onChange={e => setRegOutTime(e.target.value)} 
                        required 
                        id="reg-out-time"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Reason for Correction *</label>
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      placeholder="e.g. Forgot to punch in / Client on-duty visit / Network device glitch" 
                      value={regReason} 
                      onChange={e => setRegReason(e.target.value)} 
                      required 
                      id="reg-reason"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowRegularizeModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingReg} id="reg-submit-btn">
                    {submittingReg ? 'Submitting...' : 'Submit Request'}
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

export default AttendancePage;
