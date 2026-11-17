import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PhoneForwarded,
  Cpu,
  PhoneOff,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useApp, mapBackendCallLog } from '../context/AppContext';
import { callsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const CallVerification = () => {
  const { guards = [], callLogs = [], locations = [], openCallModal, fetchCallLogs } = useApp();

  const [activeTab, setActiveTab] = useState('active_guards'); // 'active_guards' | 'history'
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [callStatusFilter, setCallStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveCalls, setLiveCalls] = useState(callLogs);
  const [totalCount, setTotalCount] = useState(0);

  // Synchronize with AppContext callLogs
  useEffect(() => {
    if (callLogs && callLogs.length > 0) {
      setLiveCalls(callLogs);
      setTotalCount((prev) => (prev > 0 ? prev : callLogs.length));
    }
  }, [callLogs]);

  // Fetch actual call history directly from backend API
  const loadCallHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callsAPI.getHistory({ limit: 100 });
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map(mapBackendCallLog);
        setLiveCalls(mapped);
        setTotalCount(res.data.pagination?.total || mapped.length);
      }
    } catch (err) {
      console.error('[CallVerification] Failed to fetch call history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load call verification history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCallHistory();
  }, [loadCallHistory]);

  // 6 Core KPI Metrics strictly calculated from real records (no hardcoded additions)
  const totalCallsCount = totalCount || liveCalls.length;
  const successfulCalls = liveCalls.filter((c) => {
    const res = (c.verificationResult || c.verificationStatus || '').toUpperCase();
    const status = (c.callStatus || c.result || '').toLowerCase();
    return (
      (res === 'CONFIRMED' || res === 'DUTY CONFIRMED' || status === 'completed' || status === 'answered') &&
      res !== 'ASSISTANCE_REQUESTED' &&
      res !== 'FAILED'
    );
  }).length;

  const confirmedDutyCalls = liveCalls.filter((c) => {
    const res = (c.verificationResult || c.verificationStatus || '').toUpperCase();
    return res === 'CONFIRMED' || res === 'DUTY CONFIRMED' || c.dtmfResponse === '1';
  }).length;

  const pendingCalls = liveCalls.filter((c) =>
    (c.verificationResult || c.verificationStatus || '').toUpperCase() === 'PENDING'
  ).length;

  const unansweredCalls = liveCalls.filter((c) => {
    const res = (c.verificationResult || c.verificationStatus || '').toUpperCase();
    const status = (c.callStatus || c.result || '').toLowerCase();
    return res === 'MISSED' || status.includes('no answer') || res.includes('UNANSWERED');
  }).length;

  const failedCalls = liveCalls.filter((c) => {
    const res = (c.verificationResult || c.verificationStatus || '').toUpperCase();
    const status = (c.callStatus || c.result || '').toLowerCase();
    return (
      res === 'ASSISTANCE_REQUESTED' ||
      res.includes('SOS') ||
      res === 'FAILED' ||
      status.includes('failed') ||
      status.includes('busy')
    );
  }).length;

  // Filter guards in Tab 1
  const filteredGuards = guards.filter((g) => {
    const matchSearch =
      search === '' ||
      (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.phone || '').includes(search);

    const matchLoc =
      locationFilter === '' ||
      (g.assignedLocation || '').toLowerCase().includes(locationFilter.toLowerCase());

    const matchStatus =
      callStatusFilter === '' ||
      (g.callStatus || '').toLowerCase() === callStatusFilter.toLowerCase();

    return matchSearch && matchLoc && matchStatus;
  });

  // Filter call logs in Tab 2
  const filteredLogs = liveCalls.filter((log) => {
    const matchSearch =
      search === '' ||
      (log.guardName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.guardId || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.phone || '').includes(search) ||
      (log.id || '').toLowerCase().includes(search.toLowerCase());

    const matchLoc =
      locationFilter === '' ||
      (log.location || '').toLowerCase().includes(locationFilter.toLowerCase());

    return matchSearch && matchLoc;
  });

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Section */}
      <div className="bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
              Call Records & Verification
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30">
              Automated Calling
            </span>
          </div>
          <p className="text-xs text-[#A8B6C9] mt-1">
            Automated outbound calls to guards' mobile numbers (Keypad 1 = Present on Duty, Keypad 2 = Emergency SOS)
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={loadCallHistory}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] text-xs font-medium text-[#A8B6C9] hover:text-[#F8FAFC] flex items-center gap-1.5 transition-colors"
            title="Refresh Call Records from Backend"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#60A5FA]' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="px-3.5 py-2 rounded-lg bg-[#1E2D43] border border-[#2B3B52] text-xs text-[#A8B6C9] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#60A5FA]" />
            <span className="font-medium">Telephony Gateway: <strong className="text-[#22C55E]">Active</strong></span>
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
            onClick={loadCallHistory}
            className="px-3 py-1 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-semibold text-red-200 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Modern 6 Dark Enterprise KPI Cards (Computed from Real MongoDB Records) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Total Calls */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#3B82F6] rounded-xl p-4 shadow-md hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Total Calls
            </span>
            <div className="p-1.5 rounded-lg bg-[#3B82F6]/10 text-[#60A5FA]">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-2">{totalCallsCount}</p>
          <p className="text-xs text-[#A8B6C9] mt-0.5">Automated call ledger</p>
        </div>

        {/* KPI 2: Successful Calls */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#22C55E] rounded-xl p-4 shadow-md hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Connected
            </span>
            <div className="p-1.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-2">{successfulCalls}</p>
          <p className="text-xs text-[#A8B6C9] mt-0.5">Handset connected</p>
        </div>

        {/* KPI 3: Duty Confirmed */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#22C55E] rounded-xl p-4 shadow-md hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Confirmed
            </span>
            <div className="p-1.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-2">{confirmedDutyCalls}</p>
          <p className="text-xs text-[#A8B6C9] mt-0.5">Keypad [1] confirmed</p>
        </div>

        {/* KPI 4: Pending Verification */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#60A5FA] rounded-xl p-4 shadow-md hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Pending
            </span>
            <div className="p-1.5 rounded-lg bg-[#60A5FA]/10 text-[#60A5FA]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-2">{pendingCalls}</p>
          <p className="text-xs text-[#A8B6C9] mt-0.5">Next in queue</p>
        </div>

        {/* KPI 5: Unanswered Calls */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#FBBF24] rounded-xl p-4 shadow-md hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Unanswered
            </span>
            <div className="p-1.5 rounded-lg bg-[#FBBF24]/10 text-[#FBBF24]">
              <PhoneOff className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-2">{unansweredCalls}</p>
          <p className="text-xs text-[#A8B6C9] mt-0.5">Ringing / timeout</p>
        </div>

        {/* KPI 6: Failed Calls / SOS */}
        <div className="bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#F87171] rounded-xl p-4 shadow-md hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A8B6C9] uppercase tracking-wider">
              Failed / SOS
            </span>
            <div className="p-1.5 rounded-lg bg-[#F87171]/10 text-[#F87171]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-2">{failedCalls}</p>
          <p className="text-xs text-[#A8B6C9] mt-0.5">Requires attention</p>
        </div>
      </div>

      {/* 3. Tabs & Filters Bar */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Verification History Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#111C30] border border-[#2B3B52] rounded-lg">
          <button
            onClick={() => setActiveTab('active_guards')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'active_guards'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            Live Guard Verification ({filteredGuards.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#A8B6C9] hover:text-[#F8FAFC]'
            }`}
          >
            Call Audit Log Trail ({filteredLogs.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guard, mobile, ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id || loc._id} value={loc.name} className="bg-[#111C30] text-[#F8FAFC]">
                {loc.name}
              </option>
            ))}
          </select>

          {/* Status Filter (Only in Tab 1) */}
          {activeTab === 'active_guards' && (
            <select
              value={callStatusFilter}
              onChange={(e) => setCallStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Call Status</option>
              <option value="Confirmed" className="bg-[#111C30] text-[#F8FAFC]">Confirmed</option>
              <option value="Pending" className="bg-[#111C30] text-[#F8FAFC]">Pending</option>
              <option value="Missed" className="bg-[#111C30] text-[#F8FAFC]">Missed</option>
              <option value="Assistance Requested" className="bg-[#111C30] text-[#F8FAFC]">Assistance Requested</option>
            </select>
          )}
        </div>
      </div>

      {/* 4. Main Tables */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl shadow-md overflow-hidden">
        {/* TAB 1: Live Guard Verification Status */}
        {activeTab === 'active_guards' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#111C30] text-[#A8B6C9] uppercase tracking-wider font-semibold border-b border-[#2B3B52]">
                  <th className="py-3 px-4">Guard Details</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Assigned Location</th>
                  <th className="py-3 px-4">Shift Timings</th>
                  <th className="py-3 px-4">Last Verification</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">Keypad Input</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                {filteredGuards.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-[#A8B6C9] text-xs">
                      <PhoneOff className="w-8 h-8 text-[#A8B6C9]/40 mx-auto mb-2" />
                      <p className="font-semibold text-sm text-[#F8FAFC]">No guards match the filter criteria.</p>
                      <p className="text-xs text-[#A8B6C9] mt-1">Try adjusting your search or location filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredGuards.map((guard) => (
                    <tr
                      key={guard.id || guard._id}
                      className="hover:bg-[#1E2D43]/80 transition-colors"
                    >
                      {/* 1. Guard Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              guard.avatar ||
                              guard.profilePhotoUrl ||
                              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80'
                            }
                            alt={guard.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-[#F8FAFC] block leading-tight">
                              {guard.name}
                            </span>
                            <span className="text-[10px] text-[#A8B6C9] font-mono block mt-0.5">
                              {guard.id || guard.guardId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Mobile Number */}
                      <td className="py-3 px-4 font-mono text-[#A8B6C9]">
                        {guard.phone || guard.mobileNumber}
                      </td>

                      {/* 3. Location */}
                      <td className="py-3 px-4 text-[#F8FAFC] font-medium">
                        <span className="truncate block max-w-[180px]">
                          {guard.assignedLocation || 'Main Duty Station'}
                        </span>
                      </td>

                      {/* 4. Shift Timings */}
                      <td className="py-3 px-4 text-[#A8B6C9] font-medium">
                        {guard.currentShift || 'Morning Shift (06:00 - 14:00)'}
                      </td>

                      {/* 5. Last Verification */}
                      <td className="py-3 px-4 text-[#A8B6C9]">
                        {guard.lastCallTime || guard.lastCallResponse || 'Pending Verification'}
                      </td>

                      {/* 6. Status Badge */}
                      <td className="py-3 px-4">
                        <StatusBadge status={guard.callStatus || guard.attendanceStatus} theme="dark" />
                      </td>

                      {/* 7. Keypad Response */}
                      <td className="py-3 px-4 font-medium">
                        {(guard.callStatus || guard.attendanceStatus || '').toLowerCase().includes('confirmed') ? (
                          <span className="inline-flex items-center gap-1 text-[#22C55E] text-[11px] font-semibold">
                            <span>Keypad [1] — Confirmed</span>
                          </span>
                        ) : (guard.callStatus || guard.attendanceStatus || '').toLowerCase().includes('sos') ||
                          (guard.callStatus || guard.attendanceStatus || '').toLowerCase().includes('assistance') ? (
                          <span className="inline-flex items-center gap-1 text-[#F87171] text-[11px] font-semibold">
                            <span>Keypad [2] — SOS Alert</span>
                          </span>
                        ) : (guard.callStatus || guard.attendanceStatus || '').toLowerCase().includes('missed') ||
                          (guard.callStatus || guard.attendanceStatus || '').toLowerCase().includes('no answer') ? (
                          <span className="text-[#FBBF24] text-[11px]">
                            Unanswered (Timeout)
                          </span>
                        ) : (
                          <span className="text-[#A8B6C9] text-[11px] italic">
                            Awaiting verification call
                          </span>
                        )}
                      </td>

                      {/* 8. Call Guard Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openCallModal(guard)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs shadow-md transition-colors"
                          title="Trigger automated call to guard"
                        >
                          <PhoneForwarded className="w-3.5 h-3.5" />
                          <span>Call Guard</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="p-3 bg-[#111C30] border-t border-[#2B3B52] flex items-center justify-between text-xs text-[#A8B6C9]">
              <span>Showing {filteredGuards.length} guards</span>
              <span>All automated calls routed via AutoGuard Telephony Bridge</span>
            </div>
          </div>
        )}

        {/* TAB 2: Call Verification Audit Trail Log (Real MongoDB Data) */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#111C30] text-[#A8B6C9] uppercase tracking-wider font-semibold border-b border-[#2B3B52]">
                  <th className="py-3 px-4">Call Log ID</th>
                  <th className="py-3 px-4">Guard Personnel</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Call Result</th>
                  <th className="py-3 px-4">Guard DTMF Response</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                {loading && filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-[#A8B6C9] text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6] mx-auto mb-2" />
                      <span>Loading real call history from MongoDB...</span>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-[#A8B6C9] text-xs">
                      <PhoneOff className="w-8 h-8 text-[#A8B6C9]/40 mx-auto mb-2" />
                      <p className="font-semibold text-sm text-[#F8FAFC]">No Call Records Found</p>
                      <p className="text-xs text-[#A8B6C9] mt-1">
                        No call verification records in MongoDB match your filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log._id || log.id}
                      className="hover:bg-[#1E2D43]/80 transition-colors"
                    >
                      {/* 1. Call Log ID */}
                      <td className="py-3 px-4 font-mono font-semibold text-[#60A5FA]">
                        {log.id || log.callId}
                      </td>

                      {/* 2. Guard Personnel */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#F8FAFC] block leading-tight">
                          {log.guardName}
                        </span>
                        <span className="text-[10px] text-[#A8B6C9] font-mono block mt-0.5">
                          {log.guardId}
                        </span>
                      </td>

                      {/* 3. Phone Number */}
                      <td className="py-3 px-4 font-mono text-[#A8B6C9]">
                        {log.phone}
                      </td>

                      {/* 4. Location */}
                      <td className="py-3 px-4 text-[#F8FAFC] font-medium">
                        {log.location}
                      </td>

                      {/* 5. Date & Time */}
                      <td className="py-3 px-4 text-[#A8B6C9]">
                        {log.date} • {log.time}
                      </td>

                      {/* 6. Duration */}
                      <td className="py-3 px-4 font-mono text-[#A8B6C9]">
                        {log.duration}
                      </td>

                      {/* 7. Mode: Live Plivo vs Simulation */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            log.isSimulated
                              ? 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30'
                              : 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30'
                          }`}
                        >
                          {log.isSimulated ? 'Simulation' : 'Plivo Live'}
                        </span>
                      </td>

                      {/* 8. Call Result */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            log.result === 'Answered' || log.result === 'Completed'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                              : 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30'
                          }`}
                        >
                          {log.result}
                        </span>
                      </td>

                      {/* 9. DTMF Response */}
                      <td className="py-3 px-4 text-[#F8FAFC] font-medium">
                        {log.guardResponse}
                      </td>

                      {/* 10. Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={log.verificationStatus} theme="dark" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="p-3 bg-[#111C30] border-t border-[#2B3B52] flex items-center justify-between text-xs text-[#A8B6C9]">
              <span>Total Audit Records: {filteredLogs.length}</span>
              <span>Telephony Ledger Synced with MongoDB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallVerification;
