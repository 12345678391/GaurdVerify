import React, { useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sun,
  Moon,
  UserCheck,
  List,
  CalendarDays,
  Grid,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  Building2,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

const Shifts = () => {
  const {
    shifts = [],
    guards = [],
    locations = [],
    addShift,
    updateShift,
    deleteShift,
    assignGuardToShift,
  } = useApp();

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'daily' | 'weekly' | 'monthly' | 'schedules'
  const [selectedDate, setSelectedDate] = useState('2026-11-12');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateShiftModalOpen, setIsCreateShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deactivatingShift, setDeactivatingShift] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Form states
  const [assignForm, setAssignForm] = useState({
    guardId: '',
    shiftId: '',
    locationId: '',
    date: '2026-11-12',
    supervisor: 'Rajeshwar Sharma',
    instructions: 'Standard perimeter guard rotation. Report vehicle checks hourly.',
  });

  const [createShiftForm, setCreateShiftForm] = useState({
    name: '',
    startTime: '06:00',
    endTime: '14:00',
    duration: '8h 00m',
    isOvernight: false,
    verificationIntervalMinutes: 30,
    description: '',
    status: 'Active',
    assignedSite: '',
  });

  // Calculate Shift Dashboard Counters
  const activeShifts = shifts.filter((s) => s.status === 'Active' || s.isActive).length || 2;
  const upcomingShifts = shifts.filter((s) => s.status === 'Upcoming').length || 1;
  const completedShifts = (shifts.filter((s) => s.status === 'Completed').length || 0) + 8;
  const cancelledShifts = shifts.filter((s) => s.status === 'Cancelled' || s.isActive === false).length || 0;
  const unassignedGuards = guards.filter((g) => !g.assignedShift && (!g.currentShift || g.currentShift === 'Unassigned')).length;

  const handleOpenAssign = (preselectedGuard = null) => {
    setAssignForm({
      guardId: preselectedGuard?.id || guards[0]?.id || '',
      shiftId: preselectedGuard?.shiftId || shifts[0]?.id || '',
      locationId: preselectedGuard?.locationId || locations[0]?.id || '',
      date: '2026-11-12',
      supervisor: 'Rajeshwar Sharma',
      instructions: 'Standard perimeter patrol and visitor verification.',
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    assignGuardToShift(assignForm.guardId, assignForm.shiftId, assignForm.locationId);
    setIsAssignModalOpen(false);
  };

  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setCreateShiftForm({
      name: '',
      startTime: '06:00',
      endTime: '14:00',
      duration: '8h 00m',
      isOvernight: false,
      verificationIntervalMinutes: 30,
      description: '',
      status: 'Active',
      assignedSite: '',
    });
    setActionError('');
    setIsCreateShiftModalOpen(true);
  };

  const handleOpenEditShift = (sh) => {
    setEditingShift(sh);
    setCreateShiftForm({
      name: sh.shiftName || sh.name || '',
      startTime: sh.startTime || '06:00',
      endTime: sh.endTime || '14:00',
      duration: '8h 00m',
      isOvernight: Boolean(sh.isOvernight),
      verificationIntervalMinutes: sh.verificationIntervalMinutes || 30,
      description: sh.description || '',
      status: sh.status || (sh.isActive ? 'Active' : 'Inactive'),
      assignedSite: sh.assignedSite || '',
    });
    setActionError('');
    setIsCreateShiftModalOpen(true);
  };

  const handleCreateShiftSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      let res;
      if (editingShift) {
        const targetId = editingShift._id || editingShift.shiftId || editingShift.id;
        res = await updateShift(targetId, createShiftForm);
      } else {
        res = await addShift(createShiftForm);
      }
      if (res && res.success) {
        setIsCreateShiftModalOpen(false);
        setEditingShift(null);
      } else {
        setActionError(res?.message || 'Failed to save shift.');
      }
    } catch (err) {
      setActionError(err.message || 'Error saving shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeactivateShift = (sh) => {
    setDeactivatingShift(sh);
    setActionError('');
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingShift) return;
    setActionLoading(true);
    setActionError('');
    try {
      const targetId = deactivatingShift._id || deactivatingShift.shiftId || deactivatingShift.id;
      const res = await deleteShift(targetId);
      if (res && res.success) {
        setDeactivatingShift(null);
      } else {
        setActionError(res?.message || 'Failed to deactivate shift.');
      }
    } catch (err) {
      setActionError(err.message || 'Error deactivating shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setLocationFilter('');
    setStatusFilter('');
    setSelectedDate('2026-11-12');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    locationFilter !== '' ||
    statusFilter !== '' ||
    selectedDate !== '2026-11-12';

  // Helper for 12-hour time format with AM/PM
  const formatTime12h = (timeStr) => {
    if (!timeStr) return '—';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${minutes || '00'} ${ampm}`;
  };

  // Build full duty assignments list
  const dutyAssignments = guards.map((guard, idx) => {
    const shiftMatch = shifts.find(
      (s) => s.id === guard.shiftId || (guard.currentShift && guard.currentShift.includes(s.name))
    );

    let startTime = '06:00 AM';
    let endTime = '02:00 PM';
    let duration = '8h 00m';

    if (guard.currentShift?.includes('Morning')) {
      startTime = '06:00 AM';
      endTime = '02:00 PM';
    } else if (guard.currentShift?.includes('Evening')) {
      startTime = '02:00 PM';
      endTime = '10:00 PM';
    } else if (guard.currentShift?.includes('Night')) {
      startTime = '10:00 PM';
      endTime = '06:00 AM';
    } else if (shiftMatch) {
      startTime = formatTime12h(shiftMatch.startTime);
      endTime = formatTime12h(shiftMatch.endTime);
      duration = shiftMatch.duration || '8h 00m';
    }

    // Determine Status
    let status = 'Active';
    if (guard.currentShift === 'Unassigned' || !guard.assignedLocation) {
      status = 'Unassigned';
    } else if (guard.currentShift?.includes('Night')) {
      status = 'Upcoming';
    } else if (idx === 3 || idx === 7) {
      status = 'Completed';
    } else if (idx === 14) {
      status = 'Cancelled';
    }

    return {
      shiftId: guard.shiftId || shiftMatch?.id || `SHF-0${(idx % 4) + 1}`,
      guard,
      dutyLocation: guard.assignedLocation || 'Unassigned Facility',
      dutyDate: '12-11-2026',
      startTime,
      endTime,
      duration,
      status,
    };
  });

  const filteredAssignments = dutyAssignments.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.guard.name.toLowerCase().includes(q) ||
      item.guard.id.toLowerCase().includes(q) ||
      item.dutyLocation.toLowerCase().includes(q) ||
      item.shiftId.toLowerCase().includes(q);

    const matchLocation = locationFilter
      ? item.dutyLocation.toLowerCase().includes(locationFilter.toLowerCase())
      : true;

    const matchStatus = statusFilter ? item.status === statusFilter : true;

    return matchSearch && matchLocation && matchStatus;
  });

  // Mock Days for Weekly View
  const weekDays = [
    { day: 'Mon', date: '10 Nov', shifts: 18 },
    { day: 'Tue', date: '11 Nov', shifts: 19 },
    { day: 'Wed', date: '12 Nov', shifts: 22, isToday: true },
    { day: 'Thu', date: '13 Nov', shifts: 20 },
    { day: 'Fri', date: '14 Nov', shifts: 24 },
    { day: 'Sat', date: '15 Nov', shifts: 26 },
    { day: 'Sun', date: '16 Nov', shifts: 21 },
  ];

  return (
    <div className="w-full space-y-6">
      {/* 1. Duty Management Header */}
      <div className="bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Duty Management</h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Manage guard duty assignments, shift timings, and daily rosters across client sites.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreateShift}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#2B3B52] bg-transparent hover:bg-[#1E2D43] text-[#F8FAFC] text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-[#A8B6C9]" />
            <span>New Duty Shift</span>
          </button>

          <button
            onClick={() => handleOpenAssign()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>Assign Guard Duty</span>
          </button>
        </div>
      </div>

      {/* 2. Five Dark Enterprise KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Active Shifts */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#22C55E] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Active Shifts
            </span>
            <div className="p-2 rounded-lg bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{activeShifts}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Guards deployed on post</p>
          </div>
        </div>

        {/* 2. Upcoming Shifts */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#60A5FA] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Upcoming Shifts
            </span>
            <div className="p-2 rounded-lg bg-[#60A5FA]/10 text-[#60A5FA] border border-[#60A5FA]/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{upcomingShifts}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Next roster rotation</p>
          </div>
        </div>

        {/* 3. Completed Today */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#2DD4BF] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Completed Today
            </span>
            <div className="p-2 rounded-lg bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{completedShifts}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Shift handovers recorded</p>
          </div>
        </div>

        {/* 4. Cancelled Shifts */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#F87171] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Cancelled Shifts
            </span>
            <div className="p-2 rounded-lg bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{cancelledShifts}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Client closure requests</p>
          </div>
        </div>

        {/* 5. Unassigned Guards */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#FBBF24] rounded-xl p-4 shadow-md transition-all hover:border-[#3B82F6]/50 flex flex-col justify-between h-full col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Unassigned Guards
            </span>
            <div className="p-2 rounded-lg bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#F8FAFC]">{unassignedGuards}</p>
            <p className="text-xs text-[#A8B6C9] mt-0.5">Available reserve personnel</p>
          </div>
        </div>
      </div>

      {/* 3. Tabs & Filters */}
      <div className="bg-[#172337] p-4 rounded-xl border border-[#2B3B52] shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#111C30] border border-[#2B3B52]">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Shift Register Table</span>
          </button>

          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === 'daily'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Timeline</span>
          </button>

          <button
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === 'weekly'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Weekly Calendar</span>
          </button>

          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === 'monthly'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Monthly Overview</span>
          </button>

          <button
            onClick={() => setViewMode('schedules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewMode === 'schedules'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Shift Profiles ({shifts.length})</span>
          </button>
        </div>

        {/* Search & Location/Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by guard name, ID, or site..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] font-medium"
            />
          </div>

          {/* Location filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name} className="bg-[#111C30] text-[#F8FAFC]">
                {loc.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Shift Statuses</option>
            <option value="Active" className="bg-[#111C30] text-[#F8FAFC]">Active</option>
            <option value="Upcoming" className="bg-[#111C30] text-[#F8FAFC]">Upcoming</option>
            <option value="Completed" className="bg-[#111C30] text-[#F8FAFC]">Completed</option>
            <option value="Cancelled" className="bg-[#111C30] text-[#F8FAFC]">Cancelled</option>
            <option value="Unassigned" className="bg-[#111C30] text-[#F8FAFC]">Unassigned</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-lg border border-[#2B3B52] bg-[#1E2D43] text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#2B3B52] font-medium flex items-center gap-1.5 transition-colors"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Shift Register Table */}
      {viewMode === 'table' && (
        <div className="bg-[#172337] rounded-xl border border-[#2B3B52] shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#A8B6C9] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Shift ID</th>
                  <th className="py-3.5 px-4">Guard Name</th>
                  <th className="py-3.5 px-4">Guard ID</th>
                  <th className="py-3.5 px-4">Duty Location</th>
                  <th className="py-3.5 px-4">Duty Date</th>
                  <th className="py-3.5 px-4">Start Time</th>
                  <th className="py-3.5 px-4">End Time</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-[#A8B6C9]">
                      <p className="font-semibold text-sm text-[#F8FAFC]">No duty records found</p>
                      <p className="text-xs text-[#A8B6C9] mt-1">
                        No shift assignments match your current filter settings.
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
                  filteredAssignments.map((item) => (
                    <tr
                      key={item.guard.id}
                      className="hover:bg-[#1E2D43]/80 transition-colors"
                    >
                      {/* 1. Shift ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#60A5FA] whitespace-nowrap">
                        {item.shiftId}
                      </td>

                      {/* 2. Guard Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.guard.avatar ? (
                            <img
                              src={item.guard.avatar}
                              alt={item.guard.name}
                              className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1E2D43] text-[#F8FAFC] font-bold flex items-center justify-center text-xs border border-[#2B3B52] shrink-0">
                              {item.guard.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-[#F8FAFC] block truncate">
                              {item.guard.name}
                            </span>
                            <span className="text-[11px] text-[#A8B6C9] block truncate">
                              {item.guard.designation || 'Security Officer'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Guard ID */}
                      <td className="py-3.5 px-4 font-mono text-xs text-[#A8B6C9] whitespace-nowrap">
                        {item.guard.id}
                      </td>

                      {/* 4. Duty Location */}
                      <td className="py-3.5 px-4 font-medium text-[#F8FAFC]">
                        <span className="block max-w-[200px] truncate" title={item.dutyLocation}>
                          {item.dutyLocation}
                        </span>
                      </td>

                      {/* 5. Duty Date */}
                      <td className="py-3.5 px-4 font-mono text-[#A8B6C9] whitespace-nowrap">
                        {item.dutyDate}
                      </td>

                      {/* 6. Start Time */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#F8FAFC] whitespace-nowrap">
                        {item.startTime}
                      </td>

                      {/* 7. End Time */}
                      <td className="py-3.5 px-4 font-mono text-[#A8B6C9] whitespace-nowrap">
                        {item.endTime}
                      </td>

                      {/* 8. Duration */}
                      <td className="py-3.5 px-4 font-mono text-[#A8B6C9] whitespace-nowrap">
                        {item.duration}
                      </td>

                      {/* 9. Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} theme="dark" />
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAssign(item.guard)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] border border-[#2B3B52] transition-colors"
                        >
                          Reassign
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Daily Schedule Timeline */}
      {viewMode === 'daily' && (
        <div className="bg-[#172337] rounded-xl border border-[#2B3B52] p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2B3B52] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Daily Schedule: Wednesday, 12 Nov 2026
              </h3>
              <p className="text-xs text-[#A8B6C9]">
                Visual post assignments across 24-hour monitoring timeline
              </p>
            </div>
            <span className="font-mono text-xs text-[#60A5FA] bg-[#1E2D43] px-3 py-1.5 rounded-lg border border-[#2B3B52] font-semibold self-start sm:self-auto">
              Active Shift: Evening (14:00 - 22:00)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {shifts.map((sh) => (
              <div
                key={sh.id}
                className="p-4 rounded-xl bg-[#1E2D43] border border-[#2B3B52] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#3B82F6]/20 text-[#60A5FA]">
                      {sh.isOvernight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#F8FAFC] text-xs">{sh.name}</h4>
                      <span className="font-mono text-[11px] text-[#A8B6C9]">
                        {formatTime12h(sh.startTime)} - {formatTime12h(sh.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#172337] border border-[#2B3B52] text-[#A8B6C9]">
                      {sh.assignedGuardsCount || sh.guardCount || 0} Guards
                    </span>
                    <button
                      onClick={() => handleOpenEditShift(sh)}
                      title="Edit Shift Profile"
                      className="p-1 rounded bg-[#172337] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#60A5FA] border border-[#2B3B52] transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleOpenDeactivateShift(sh)}
                      title="Deactivate Shift"
                      className="p-1 rounded bg-[#172337] hover:bg-[#F87171]/20 text-[#A8B6C9] hover:text-[#F87171] border border-[#2B3B52] hover:border-[#F87171]/40 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#2B3B52] text-xs">
                  {guards.slice(0, 3).map((g) => (
                    <div
                      key={g.id}
                      className="p-2 rounded-lg bg-[#172337] border border-[#2B3B52] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {g.avatar ? (
                          <img
                            src={g.avatar}
                            alt={g.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#1E2D43] text-[#F8FAFC] font-bold flex items-center justify-center text-[10px]">
                            {g.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-[#F8FAFC]">{g.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#A8B6C9]">
                        {g.assignedLocation ? g.assignedLocation.split(' ')[0] : 'HQ'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Weekly Calendar View */}
      {viewMode === 'weekly' && (
        <div className="bg-[#172337] rounded-xl border border-[#2B3B52] p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b border-[#2B3B52] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Weekly Guard Roster View (10 Nov - 16 Nov 2026)
              </h3>
              <p className="text-xs text-[#A8B6C9]">
                Weekly workforce coverage across operational facilities
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {weekDays.map((wd) => (
              <div
                key={wd.day}
                className={`p-3.5 rounded-xl border text-center space-y-2 ${
                  wd.isToday
                    ? 'bg-[#1E2D43] border-[#3B82F6] ring-2 ring-[#3B82F6]/40'
                    : 'bg-[#1E2D43] border-[#2B3B52]'
                }`}
              >
                <span className="font-bold text-xs text-[#F8FAFC] block">{wd.day}</span>
                <span className="font-mono text-[11px] text-[#A8B6C9] block">{wd.date}</span>
                <div className="pt-2 border-t border-[#2B3B52]">
                  <span className="text-base font-bold text-[#F8FAFC] block">{wd.shifts}</span>
                  <span className="text-[10px] text-[#60A5FA] font-semibold block mt-0.5">
                    Shifts Roster
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: Monthly Overview */}
      {viewMode === 'monthly' && (
        <div className="bg-[#172337] rounded-xl border border-[#2B3B52] p-8 shadow-md text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-[#60A5FA] mx-auto" />
          <h3 className="text-sm font-bold text-[#F8FAFC]">Monthly Master Roster Schedule</h3>
          <p className="text-xs text-[#A8B6C9] max-w-md mx-auto">
            November 2026 scheduling calendar: 720 total shifts assigned with automated telephony
            verification intervals.
          </p>
        </div>
      )}

      {/* VIEW 5: Shift Profiles & Schedules (Full Edit & Deactivate Management) */}
      {viewMode === 'schedules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111C30] p-4 rounded-xl border border-[#2B3B52]">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Company Shift Configurations ({shifts.length})
              </h3>
              <p className="text-xs text-[#A8B6C9] mt-0.5">
                Manage operational duty shifts, timing windows, overnight rotations, and automated verification checkpoints
              </p>
            </div>
            <button
              onClick={handleOpenCreateShift}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure New Shift</span>
            </button>
          </div>

          {shifts.length === 0 ? (
            <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl p-12 text-center max-w-xl mx-auto shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1E2D43] border border-[#2B3B52] flex items-center justify-center text-[#60A5FA]">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-[#F8FAFC] mb-1">No Duty Shifts Configured</h2>
              <p className="text-xs text-[#A8B6C9] mb-6 leading-relaxed">
                Create standard duty shift profiles (e.g., Morning, Evening, Night) to organize guard schedules, automate check-ins, and track attendance.
              </p>
              <button
                onClick={handleOpenCreateShift}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Configure First Shift Profile</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.map((sh) => {
                const assignedGuards = guards.filter(
                  (g) =>
                    g.isDeleted !== true &&
                    g.employmentStatus !== 'Archived' &&
                    (g.assignedShift === sh._id ||
                      g.assignedShift === sh.id ||
                      g.shiftId === sh.id ||
                      g.shiftId === sh.shiftId ||
                      (g.currentShift && g.currentShift.includes(sh.name)))
                );
                const isActive = (sh.status || (sh.isActive ? 'Active' : 'Inactive')) === 'Active';

                return (
                  <div
                    key={sh.id || sh._id || sh.shiftId}
                    className="p-5 rounded-xl border border-[#2B3B52] bg-[#172337] hover:border-[#3B82F6]/50 shadow-md flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl ${
                              sh.isOvernight
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {sh.isOvernight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#F8FAFC]">
                              {sh.shiftName || sh.name}
                            </h4>
                            <span className="font-mono text-[10px] text-[#60A5FA] font-bold">
                              {sh.shiftId || sh.id}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isActive
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                              : 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-[#A8B6C9]">
                        <div className="p-2.5 rounded-lg bg-[#111C30] border border-[#2B3B52] flex items-center justify-between font-mono">
                          <span className="text-[#A8B6C9] text-[11px]">Shift Timing:</span>
                          <span className="font-bold text-[#F8FAFC] text-[11px]">
                            {formatTime12h(sh.startTime)} — {formatTime12h(sh.endTime)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span>Shift Type:</span>
                          <span className="font-semibold text-[#F8FAFC]">
                            {sh.isOvernight ? '🌙 Overnight Shift' : '☀️ Day Shift'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span>Verification Interval:</span>
                          <span className="font-semibold text-[#60A5FA]">
                            Every {sh.verificationIntervalMinutes || 30} mins
                          </span>
                        </div>

                        {sh.description && (
                          <p className="text-[11px] text-[#A8B6C9] line-clamp-2 pt-1 border-t border-[#2B3B52]/40">
                            {sh.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#2B3B52] flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#A8B6C9] flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>{assignedGuards.length || sh.guardCount || 0} Guards On Roster</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditShift(sh)}
                          title="Edit Shift Configuration"
                          className="px-2.5 py-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] font-semibold text-xs flex items-center gap-1 border border-[#2B3B52] transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenDeactivateShift(sh)}
                          title="Deactivate Shift"
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#F87171]/20 text-[#A8B6C9] hover:text-[#F87171] border border-[#2B3B52] hover:border-[#F87171]/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Assign Guard Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <h3 className="font-bold text-[#F8FAFC] text-sm">Assign Guard to Shift Schedule</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Select Security Guard *
                </label>
                <select
                  value={assignForm.guardId}
                  onChange={(e) => setAssignForm({ ...assignForm, guardId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                >
                  {guards.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#111C30] text-[#F8FAFC]">
                      {g.name} ({g.id}) - {g.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Select Operational Site *
                </label>
                <select
                  value={assignForm.locationId}
                  onChange={(e) => setAssignForm({ ...assignForm, locationId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-[#111C30] text-[#F8FAFC]">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Select Shift *</label>
                <select
                  value={assignForm.shiftId}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                >
                  {shifts.map((sh) => (
                    <option key={sh.id} value={sh.id} className="bg-[#111C30] text-[#F8FAFC]">
                      {sh.name} ({formatTime12h(sh.startTime)} - {formatTime12h(sh.endTime)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Duty Date</label>
                  <input
                    type="date"
                    value={assignForm.date}
                    onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">
                    Assigned Supervisor
                  </label>
                  <input
                    type="text"
                    value={assignForm.supervisor}
                    onChange={(e) => setAssignForm({ ...assignForm, supervisor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Post Instructions
                </label>
                <textarea
                  rows="2"
                  value={assignForm.instructions}
                  onChange={(e) => setAssignForm({ ...assignForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New / Edit Shift Type Modal */}
      {isCreateShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">
                  {editingShift ? 'Edit Shift Configuration' : 'Configure New Shift Type'}
                </h3>
                {editingShift && (
                  <span className="text-[10px] font-mono font-bold text-[#60A5FA] px-2 py-0.5 rounded bg-[#1E2D43] border border-[#2B3B52]">
                    {editingShift.shiftId || editingShift.id}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsCreateShiftModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] text-base font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="m-4 p-3 rounded-lg bg-[#F87171]/15 border border-[#F87171]/30 text-[#F87171] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateShiftSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  value={createShiftForm.name}
                  onChange={(e) =>
                    setCreateShiftForm({ ...createShiftForm, name: e.target.value })
                  }
                  placeholder="e.g. Morning Shift, Night Shift"
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">
                    Start Time (24h) *
                  </label>
                  <input
                    type="time"
                    required
                    value={createShiftForm.startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const autoOvernight = createShiftForm.endTime ? createShiftForm.endTime < newStart : createShiftForm.isOvernight;
                      setCreateShiftForm({
                        ...createShiftForm,
                        startTime: newStart,
                        isOvernight: autoOvernight,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">End Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={createShiftForm.endTime}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      const autoOvernight = createShiftForm.startTime ? newEnd < createShiftForm.startTime : createShiftForm.isOvernight;
                      setCreateShiftForm({
                        ...createShiftForm,
                        endTime: newEnd,
                        isOvernight: autoOvernight,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overnightInput"
                  checked={createShiftForm.isOvernight}
                  onChange={(e) =>
                    setCreateShiftForm({ ...createShiftForm, isOvernight: e.target.checked })
                  }
                  className="rounded border-[#2B3B52] bg-[#111C30] text-[#3B82F6] focus:ring-[#3B82F6]"
                />
                <label htmlFor="overnightInput" className="text-[#A8B6C9] font-medium cursor-pointer">
                  Overnight Shift (crosses midnight, e.g. 22:00 to 06:00)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">
                    Default Facility Post
                  </label>
                  <select
                    value={createShiftForm.assignedSite || ''}
                    onChange={(e) =>
                      setCreateShiftForm({ ...createShiftForm, assignedSite: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="">All Company Facilities</option>
                    {locations.map((loc) => (
                      <option key={loc.id || loc._id} value={loc._id || loc.id}>
                        {loc.name} ({loc.siteId || loc.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">
                    Check-in Verification
                  </label>
                  <select
                    value={createShiftForm.verificationIntervalMinutes || 30}
                    onChange={(e) =>
                      setCreateShiftForm({
                        ...createShiftForm,
                        verificationIntervalMinutes: parseInt(e.target.value, 10) || 30,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes (Standard)</option>
                    <option value="45">Every 45 minutes</option>
                    <option value="60">Every 60 minutes</option>
                  </select>
                </div>
              </div>

              {editingShift && (
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Shift Status</label>
                  <select
                    value={createShiftForm.status || 'Active'}
                    onChange={(e) =>
                      setCreateShiftForm({ ...createShiftForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Description & Standing Orders
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Standard perimeter rotation and hourly checkpoint verification."
                  value={createShiftForm.description || ''}
                  onChange={(e) =>
                    setCreateShiftForm({ ...createShiftForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsCreateShiftModalOpen(false)}
                  className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md disabled:opacity-50"
                >
                  {actionLoading
                    ? 'Saving...'
                    : editingShift
                    ? 'Save Changes'
                    : 'Save Shift Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Shift Confirmation Modal */}
      {deactivatingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#F8FAFC]">Deactivate Duty Shift?</h3>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Are you sure you want to deactivate{' '}
                  <strong className="text-white">
                    {deactivatingShift.shiftName || deactivatingShift.name}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            <p className="text-xs text-[#A8B6C9] bg-[#111C30] p-3 rounded-xl border border-[#2B3B52] leading-relaxed">
              This shift will be removed from active duty roster rotations and any assigned guards will be safely set to Unassigned. Historical shift logs, past attendance records, and call verification data remain preserved for compliance reporting.
            </p>

            {actionError && (
              <div className="p-3 rounded-lg bg-[#F87171]/15 border border-[#F87171]/30 text-[#F87171] text-xs">
                {actionError}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-[#2B3B52]">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeactivatingShift(null)}
                className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeactivate}
                className="px-5 py-2 bg-[#F87171] hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
              >
                {actionLoading ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shifts;
