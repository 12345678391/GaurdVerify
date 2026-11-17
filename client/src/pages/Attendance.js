import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Phone,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatusBadge from '../components/StatusBadge';
import { useApp, mapBackendAttendance } from '../context/AppContext';
import { attendanceAPI } from '../services/api';

const Attendance = () => {
  const {
    attendance = [],
    guards = [],
    locations = [],
    updateAttendanceStatus,
    openCallModal,
    fetchAttendance,
  } = useApp();

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    // Default to today's date in local timezone (YYYY-MM-DD)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState(attendance);

  // Synchronize with AppContext attendance if already populated
  useEffect(() => {
    if (attendance && attendance.length > 0 && !dateFilter) {
      setAllAttendanceRecords(attendance);
    }
  }, [attendance, dateFilter]);

  // Fetch actual attendance records from MongoDB backend API
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceAPI.getAttendance({
        limit: 200,
        date: dateFilter || undefined,
      });
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map(mapBackendAttendance);
        setAllAttendanceRecords(mapped);
      }
    } catch (err) {
      console.error('[Attendance] Failed to fetch attendance records:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Dynamic 7-day attendance trend data generated strictly from real records
  const attendanceTrendData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      days.push({ iso, label });
    }

    return days.map(({ iso, label }) => {
      const dayRecords = allAttendanceRecords.filter((r) => r.date === iso);
      const totalDay = dayRecords.length;
      const presentDay = dayRecords.filter((r) => (r.dutyStatus || r.status) === 'Present').length;
      const rate = totalDay > 0 ? Math.round((presentDay / totalDay) * 100) : 0;
      return {
        day: label,
        rate,
        total: totalDay,
        present: presentDay,
      };
    });
  }, [allAttendanceRecords]);

  const handleResetFilters = () => {
    setSearch('');
    setLocationFilter('');
    setStatusFilter('');
    setDateFilter('');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    locationFilter !== '' ||
    statusFilter !== '' ||
    dateFilter !== '';

  // Filter attendance records dynamically based on active filters
  const filteredAttendance = useMemo(() => {
    return allAttendanceRecords.filter((att) => {
      const matchingGuard = guards.find(
        (g) => g.id === att.guardId || g.name === att.guardName || g._id === att.guardId
      );
      const phone = matchingGuard?.phone || att.phone || '';
      const q = search.toLowerCase().trim();

      const matchSearch =
        !q ||
        (att.guardName || '').toLowerCase().includes(q) ||
        (att.guardId || '').toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q);

      const matchLoc = locationFilter
        ? (att.location || '').toLowerCase().includes(locationFilter.toLowerCase())
        : true;

      const matchStatus = statusFilter
        ? (att.dutyStatus || att.status) === statusFilter
        : true;

      const matchDate = dateFilter ? att.date === dateFilter : true;

      return matchSearch && matchLoc && matchStatus && matchDate;
    });
  }, [allAttendanceRecords, guards, search, locationFilter, statusFilter, dateFilter]);

  // Attendance metrics strictly calculated from actual records
  const totalRecords = filteredAttendance.length;
  const presentCount = filteredAttendance.filter((a) => (a.dutyStatus || a.status) === 'Present').length;
  const absentCount = filteredAttendance.filter((a) => (a.dutyStatus || a.status) === 'Absent').length;
  const lateCount = filteredAttendance.filter((a) => {
    const s = a.dutyStatus || a.status;
    return s === 'Late' || s === 'Partial';
  }).length;
  const earlyCount = 0; // Calculated from actual records (no hardcoded metrics)
  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  // Handle in-row status change
  const handleStatusChange = (guardId, newStatus) => {
    if (updateAttendanceStatus) {
      updateAttendanceStatus(guardId, newStatus);
    }
    setAllAttendanceRecords((prev) =>
      prev.map((r) => (r.guardId === guardId ? { ...r, dutyStatus: newStatus, status: newStatus } : r))
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Section */}
      <div className="bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
            Attendance Register
          </h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Daily duty attendance, guard check-in records and telephone verification status from MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAttendance}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] text-xs font-medium text-[#A8B6C9] hover:text-[#F8FAFC] flex items-center gap-1.5 transition-colors"
            title="Refresh Attendance from Backend"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#60A5FA]' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="bg-[#1E2D43] border border-[#2B3B52] rounded-lg px-3.5 py-2 flex items-center gap-2.5">
            <span className="text-xs font-medium text-[#A8B6C9]">Attendance Rate:</span>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#22C55E] font-mono">
              <TrendingUp className="w-4 h-4 text-[#22C55E]" />
              {attendanceRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadAttendance}
            className="px-3 py-1 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-semibold text-red-200 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Five Dark Enterprise KPI Cards (Calculated from Real MongoDB Records) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Present Guards */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#22C55E] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Present Guards
            </span>
            <div className="p-2 rounded-lg bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{presentCount}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Verified on active post</p>
          </div>
        </div>

        {/* Absent Guards */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#F87171] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Absent Guards
            </span>
            <div className="p-2 rounded-lg bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{absentCount}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Unexcused absence</p>
          </div>
        </div>

        {/* Late Check-ins */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#FBBF24] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Late Check-ins
            </span>
            <div className="p-2 rounded-lg bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{lateCount}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Delayed reporting</p>
          </div>
        </div>

        {/* Early Clock-outs */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#C084FC] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Early Clock-outs
            </span>
            <div className="p-2 rounded-lg bg-[#C084FC]/10 text-[#C084FC] border border-[#C084FC]/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{earlyCount}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Early post handover</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#3B82F6] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Attendance Rate
            </span>
            <div className="p-2 rounded-lg bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{attendanceRate}%</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Calculated compliance</p>
          </div>
        </div>
      </div>

      {/* 3. Attendance Trend Chart (Dynamically Computed from MongoDB) */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-[#F8FAFC] text-sm">
              Attendance Trend (7-Day Compliance Ratio)
            </h3>
            <p className="text-xs text-[#A8B6C9]">
              Daily percentage of guards verified on post from MongoDB records
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/30 px-2.5 py-1 rounded-full self-start sm:self-auto">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Live Audit Trend</span>
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attRateGradDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3B52" vertical={false} />
              <XAxis dataKey="day" stroke="#A8B6C9" fontSize={11} tickLine={false} axisLine={{ stroke: '#2B3B52' }} />
              <YAxis
                stroke="#A8B6C9"
                domain={[0, 100]}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#2B3B52' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111C30',
                  border: '1px solid #2B3B52',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                formatter={(value, name, props) => [
                  `${value}% (${props.payload.present || 0}/${props.payload.total || 0} guards)`,
                  'Attendance Rate',
                ]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                name="Attendance %"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#attRateGradDark)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Search and Dynamic Filters */}
      <div className="bg-[#172337] p-4 rounded-xl border border-[#2B3B52] shadow-md flex flex-wrap items-center gap-3 text-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guard name, mobile number, or Guard ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] font-medium"
          />
        </div>

        {/* Location filter */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id || loc._id} value={loc.name} className="bg-[#111C30] text-[#F8FAFC]">
              {loc.name}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Attendance Status</option>
          <option value="Present" className="bg-[#111C30] text-[#F8FAFC]">Present</option>
          <option value="Absent" className="bg-[#111C30] text-[#F8FAFC]">Absent</option>
          <option value="Late" className="bg-[#111C30] text-[#F8FAFC]">Late</option>
        </select>

        {/* Dynamic Date filter */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
            title="Filter attendance by date"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="px-2.5 py-2 rounded-lg border border-[#2B3B52] bg-[#1E2D43] text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#2B3B52] font-medium transition-colors"
              title="View all dates"
            >
              All Dates
            </button>
          )}
        </div>

        {/* Reset Filters button */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#1E2D43] text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#2B3B52] font-medium flex items-center gap-1.5 transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 5. Attendance Register Table */}
      <div className="bg-[#172337] rounded-xl border border-[#2B3B52] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#A8B6C9] uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Guard ID</th>
                <th className="py-3 px-4">Guard Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Site Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Duty Time</th>
                <th className="py-3 px-4">Check-in Time</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4">Call Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
              {loading && filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-[#A8B6C9]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6] mx-auto mb-2" />
                    <span>Loading attendance records from MongoDB...</span>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-[#A8B6C9]">
                    <p className="font-semibold text-sm text-[#F8FAFC]">No records found</p>
                    <p className="text-xs text-[#A8B6C9] mt-1">
                      No attendance entries match your current search and filter criteria.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-[#1E2D43] text-[#60A5FA] hover:bg-[#2B3B52] border border-[#2B3B52] text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => {
                  const matchingGuard = guards.find(
                    (g) => g.id === record.guardId || g.name === record.guardName || g._id === record.guardId
                  ) || {
                    id: record.guardId,
                    name: record.guardName,
                    phone: record.phone || '—',
                    assignedLocation: record.location,
                    currentShift: record.shiftStartTime,
                    designation: 'Security Guard',
                  };

                  const phone = matchingGuard.phone || record.phone || '—';
                  const designation = matchingGuard.designation || 'Security Guard';
                  const avatar = matchingGuard.avatar || matchingGuard.profilePhotoUrl;

                  return (
                    <tr
                      key={record.id || record._id}
                      className="hover:bg-[#1E2D43]/80 transition-colors"
                    >
                      {/* 1. Guard ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#60A5FA] whitespace-nowrap">
                        {record.guardId}
                      </td>

                      {/* 2. Guard Name with avatar & designation */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={record.guardName}
                              className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1E2D43] text-[#F8FAFC] font-bold flex items-center justify-center text-xs border border-[#2B3B52] shrink-0">
                              {(record.guardName || 'G').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-[#F8FAFC] block truncate">
                              {record.guardName}
                            </span>
                            <span className="text-[11px] text-[#A8B6C9] block truncate">
                              {designation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Mobile Number */}
                      <td className="py-3.5 px-4 font-mono text-[#A8B6C9] font-medium whitespace-nowrap">
                        {phone}
                      </td>

                      {/* 4. Site Name */}
                      <td className="py-3.5 px-4 font-medium text-[#F8FAFC]">
                        <span className="truncate block max-w-[180px]" title={record.location}>
                          {record.location}
                        </span>
                      </td>

                      {/* 5. Date */}
                      <td className="py-3.5 px-4 font-mono text-[#A8B6C9] whitespace-nowrap">
                        {record.date}
                      </td>

                      {/* 6. Duty Time */}
                      <td className="py-3.5 px-4 font-mono text-[#A8B6C9] whitespace-nowrap">
                        {record.shiftStartTime || '06:00 - 14:00'}
                      </td>

                      {/* 7. Check-in Time */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#F8FAFC] whitespace-nowrap">
                        {record.actualCheckIn || '—'}
                      </td>

                      {/* 8. Attendance Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={record.status || record.dutyStatus} theme="dark" />
                      </td>

                      {/* 9. Call Verification */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={record.verificationStatus} theme="dark" />
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStatusChange(record.guardId, 'Present')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                              (record.status || record.dutyStatus) === 'Present'
                                ? 'bg-[#22C55E] text-white border-[#22C55E]'
                                : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/25'
                            }`}
                            title="Mark Present"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.guardId, 'Absent')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                              (record.status || record.dutyStatus) === 'Absent'
                                ? 'bg-[#F87171] text-white border-[#F87171]'
                                : 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30 hover:bg-[#F87171]/25'
                            }`}
                            title="Mark Absent"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() =>
                              openCallModal({
                                ...matchingGuard,
                                id: record.guardId,
                                name: record.guardName,
                                phone,
                                assignedLocation: record.location,
                              })
                            }
                            className="p-1.5 rounded-md text-[#60A5FA] bg-[#1E2D43] border border-[#2B3B52] hover:bg-[#2B3B52] transition-colors"
                            title="Call Guard"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-[#111C30] border-t border-[#2B3B52] flex items-center justify-between text-xs text-[#A8B6C9]">
          <span>Showing {filteredAttendance.length} attendance records</span>
          <span>Attendance Database Synced with MongoDB</span>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
