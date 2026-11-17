import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  UserPlus,
  CalendarClock,
  ClipboardCheck,
  ArrowRight,
  Search,
  AlertCircle,
  Clock,
  PhoneForwarded,
  Building2,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { guards, shifts, openCallModal, company } = useApp();
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === 'super_admin' || admin?.role === 'platform_admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');

  // Format date as Indian standard: DD-MM-YYYY
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const formattedToday = `${day}-${month}-${year}`;

  // Helper to convert shift times into Indian 12-hour AM/PM format
  const formatDutyTime = (shiftString) => {
    if (!shiftString) return '08:00 AM - 04:00 PM';
    if (shiftString.includes('06:00') && shiftString.includes('14:00')) {
      return '06:00 AM - 02:00 PM (Morning)';
    }
    if (shiftString.includes('14:00') && shiftString.includes('22:00')) {
      return '02:00 PM - 10:00 PM (Evening)';
    }
    if (shiftString.includes('22:00') && shiftString.includes('06:00')) {
      return '10:00 PM - 06:00 AM (Night)';
    }
    if (shiftString.includes('10:00') && shiftString.includes('18:00')) {
      return '10:00 AM - 06:00 PM (General)';
    }
    return shiftString;
  };

  // Four Essential Statistic Calculations
  const totalGuardsCount = guards.length;

  const guardsOnDutyCount = guards.filter(
    (g) => g.attendanceStatus === 'Present' || g.employmentStatus === 'Active'
  ).filter((g) => g.attendanceStatus === 'Present').length;

  const attendanceConfirmedCount = guards.filter(
    (g) => (g.callStatus || '').toLowerCase().includes('confirmed')
  ).length;

  const unconfirmedGuards = guards.filter((g) => {
    const status = (g.callStatus || '').toLowerCase();
    return (
      status.includes('missed') ||
      status.includes('no answer') ||
      status.includes('sos') ||
      status.includes('pending') ||
      g.attendanceStatus === 'Absent'
    );
  });

  const missedCallsCount = unconfirmedGuards.length;

  // Filter Today's Duty Status table
  const filteredGuards = guards.filter((guard) => {
    const matchesSearch =
      searchQuery === '' ||
      guard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guard.phone.includes(searchQuery) ||
      (guard.assignedLocation || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSite =
      siteFilter === 'All' ||
      (guard.assignedLocation || '').toLowerCase().includes(siteFilter.toLowerCase());

    return matchesSearch && matchesSite;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Agency Date (DD-MM-YYYY in Asia/Kolkata) */}
      <div className="bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">
            {isSuperAdmin ? 'AutoGuard Platform Dashboard' : 'Daily Operations Dashboard'}
          </h2>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            {isSuperAdmin ? 'Central Platform Overview' : (company?.name || 'AutoGuard Security Solutions')} • Date: <strong className="text-[#60A5FA]">{formattedToday}</strong> (IST)
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Platform Admin Action: Company Management */}
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/company-management')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Company Management</span>
            </button>
          )}

          {/* Action 1: Add New Guard */}
          <button
            onClick={() => navigate('/guards?action=add')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Guard</span>
          </button>

          {/* Action 2: Assign Duty */}
          <button
            onClick={() => navigate('/shifts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-[#1E2D43] border border-[#2B3B52] text-[#F8FAFC] rounded-lg text-xs font-semibold transition-colors"
          >
            <CalendarClock className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Assign Duty</span>
          </button>

          {/* Action 3: View Attendance */}
          <button
            onClick={() => navigate('/attendance')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-[#1E2D43] border border-[#2B3B52] text-[#F8FAFC] rounded-lg text-xs font-semibold transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>View Attendance</span>
          </button>
        </div>
      </div>

      {/* 2. Four Dark Enterprise Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Guards"
          value={totalGuardsCount}
          subtext="Registered in agency roster"
          icon={Users}
          variant="default"
          onClick={() => navigate('/guards')}
        />

        <StatCard
          title="Guards on Duty"
          value={guardsOnDutyCount}
          subtext="Currently posted at client sites"
          icon={UserCheck}
          variant="primary"
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Attendance Confirmed"
          value={attendanceConfirmedCount}
          subtext="Verified via keypad call"
          icon={CheckCircle2}
          variant="success"
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Missed Calls"
          value={missedCallsCount}
          subtext="Requires supervisor callback"
          icon={AlertCircle}
          variant="danger"
          onClick={() => navigate('/call-verification')}
        />
      </div>

      {/* 3. Pending Call Verification (Unconfirmed Guards Only) */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b border-[#2B3B52] bg-[#1E2D43]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20">
              <PhoneCall className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Pending Call Verification ({unconfirmedGuards.length})
              </h3>
              <p className="text-xs text-[#A8B6C9]">
                Guards who have not confirmed duty attendance. Call immediately to verify post vigilance.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/call-verification')}
            className="text-xs font-semibold text-[#60A5FA] hover:text-[#3B82F6] inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Call Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111C30] text-[#A8B6C9] text-xs font-semibold uppercase tracking-wider border-b border-[#2B3B52]">
                <th className="py-3 px-4">Guard Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Site Name</th>
                <th className="py-3 px-4">Last Call Status</th>
                <th className="py-3 px-4">Next Retry</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/60 text-xs text-[#F8FAFC]">
              {unconfirmedGuards.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-[#A8B6C9]">
                    All deployed guards have confirmed attendance today. No pending verifications.
                  </td>
                </tr>
              ) : (
                unconfirmedGuards.map((guard, idx) => {
                  const retryTime = idx === 0 ? 'Immediate Action' : idx === 1 ? 'In 5 mins' : 'In 15 mins';
                  return (
                    <tr key={guard.id} className="hover:bg-[#1E2D43]/80 transition-colors">
                      {/* Guard Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={guard.avatar}
                            alt={guard.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-[#F8FAFC] block">
                              {guard.name}
                            </span>
                            <span className="text-[10px] text-[#A8B6C9] font-mono">
                              {guard.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mobile Number (+91) */}
                      <td className="py-3 px-4 font-mono text-[#A8B6C9]">
                        {guard.phone}
                      </td>

                      {/* Site */}
                      <td className="py-3 px-4 text-[#F8FAFC] font-medium truncate max-w-[200px]">
                        {guard.assignedLocation}
                      </td>

                      {/* Last Call Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={guard.callStatus} />
                      </td>

                      {/* Next Retry */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[#A8B6C9] font-medium">
                          <Clock className="w-3 h-3 text-[#60A5FA]" />
                          <span>{retryTime}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openCallModal(guard)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                          title="Call guard now"
                        >
                          <PhoneForwarded className="w-3 h-3" />
                          <span>Call Now</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Today's Duty Status Table */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl shadow-md overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-[#2B3B52] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Today's Duty Status
            </h3>
            <p className="text-xs text-[#A8B6C9]">
              List of guards deployed across security sites for {formattedToday}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A8B6C9] absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search guard or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        {/* Duty Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111C30] text-[#A8B6C9] text-xs font-semibold uppercase tracking-wider border-b border-[#2B3B52]">
                <th className="py-3 px-4">Guard Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Site Name</th>
                <th className="py-3 px-4">Duty Time</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/60 text-xs text-[#F8FAFC]">
              {filteredGuards.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                    No guards found matching your search.
                  </td>
                </tr>
              ) : (
                filteredGuards.slice(0, 10).map((guard) => {
                  return (
                    <tr key={guard.id} className="hover:bg-[#1E2D43]/80 transition-colors">
                      {/* Guard Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={guard.avatar}
                            alt={guard.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-[#F8FAFC] block leading-tight">
                              {guard.name}
                            </span>
                            <span className="text-[10px] text-[#A8B6C9] font-mono leading-tight">
                              {guard.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mobile Number (+91) */}
                      <td className="py-3 px-4 font-mono text-[#A8B6C9]">
                        {guard.phone}
                      </td>

                      {/* Site Name */}
                      <td className="py-3 px-4 text-[#F8FAFC]">
                        <p className="font-medium truncate max-w-[220px]">
                          {guard.assignedLocation}
                        </p>
                      </td>

                      {/* Duty Time (12-Hour AM/PM) */}
                      <td className="py-3 px-4 text-[#A8B6C9] font-medium">
                        {formatDutyTime(guard.currentShift)}
                      </td>

                      {/* Attendance Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={guard.attendanceStatus || 'Active'} />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openCallModal(guard)}
                            className="px-2.5 py-1 bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] text-[#60A5FA] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Call guard"
                          >
                            <PhoneCall className="w-3 h-3 text-[#60A5FA]" />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={() => navigate('/guards')}
                            className="px-2 py-1 bg-transparent hover:bg-[#1E2D43] text-[#A8B6C9] hover:text-[#F8FAFC] rounded-lg text-xs font-medium transition-colors"
                          >
                            Details
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
          <span>
            Showing {Math.min(filteredGuards.length, 10)} of {filteredGuards.length} deployed guards
          </span>
          <button
            onClick={() => navigate('/shifts')}
            className="text-[#60A5FA] hover:text-[#3B82F6] font-semibold inline-flex items-center gap-1"
          >
            <span>Manage All Duties</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
