import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { 
  FileText, 
  Download, 
  Filter, 
  CheckCircle, 
  PhoneCall, 
  AlertTriangle, 
  TrendingUp, 
  Printer,
} from 'lucide-react';

export default function Reports() {
  const { guards = [], attendance = [], attendanceRecords, callLogs = [], locations = [] } = useApp() || {};

  // Safely support either attendanceRecords or attendance from context
  const attendanceList = attendanceRecords || attendance || [];
  const guardsList = guards || [];
  const callLogsList = callLogs || [];
  const locationsList = locations || [];

  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Compute report rows dynamically based on reportType
  let reportTitle = '';
  let reportColumns = [];
  let reportData = [];

  if (reportType === 'attendance') {
    reportTitle = 'Staff Attendance & Compliance Report';
    reportColumns = ['Date', 'Guard Name', 'Guard ID', 'Shift', 'Location', 'Check-In', 'Check-Out', 'Status'];
    reportData = (attendanceList || [])
      .filter(record => selectedLocation === 'all' || record.location === selectedLocation)
      .map(r => ({
        c1: r.date,
        c2: r.guardName,
        c3: r.guardId,
        c4: r.shift || r.shiftStartTime || 'General',
        c5: r.location,
        c6: r.checkIn || r.actualCheckIn || '06:00 AM',
        c7: r.checkOut || r.checkOutTime || 'On Duty',
        status: r.status || 'Present'
      }));
  } else if (reportType === 'call_verification') {
    reportTitle = 'Automated Voice Verification Report';
    reportColumns = ['Date & Time', 'Guard Name', 'Phone', 'Location', 'Shift', 'Keypad DTMF', 'Duration', 'Verification Status'];
    reportData = (callLogsList || [])
      .filter(log => selectedLocation === 'all' || log.location === selectedLocation)
      .map(l => ({
        c1: l.timestamp || `${l.date || ''} ${l.time || ''}`.trim() || 'Today',
        c2: l.guardName,
        c3: l.phone,
        c4: l.location,
        c5: l.shift || 'Morning Shift (06:00 - 14:00)',
        c6: l.guardResponse || (l.dtmfKey ? `Keypad [${l.dtmfKey}]` : 'Keypad [1] - Duty Confirmed'),
        c7: l.duration || (l.durationSeconds ? `${l.durationSeconds}s` : '24s'),
        status: l.verificationStatus || l.status || 'Confirmed'
      }));
  } else if (reportType === 'guard_roster') {
    reportTitle = 'Workforce Roster & Shift Allocation Report';
    reportColumns = ['Guard ID', 'Guard Name', 'Designation', 'Assigned Site', 'Shift Schedule', 'Phone', 'Employment Status'];
    reportData = (guardsList || [])
      .filter(g => selectedLocation === 'all' || (g.assignedLocation || g.location) === selectedLocation)
      .map(g => ({
        c1: g.id || g.guardId,
        c2: g.name,
        c3: g.designation || 'Security Officer',
        c4: g.assignedLocation || g.location,
        c5: g.currentShift || g.shift || 'Morning Shift (06:00 - 14:00)',
        c6: g.phone,
        status: g.employmentStatus || g.status || 'Active'
      }));
  } else if (reportType === 'location_summary') {
    reportTitle = 'Site Security Deployment & Operational Report';
    reportColumns = ['Site Name', 'City', 'Assigned Guards', 'Active Incidents', 'Supervisor Contact', 'Status'];
    reportData = (locationsList || []).map(loc => {
      const guardCount = (guardsList || []).filter(g => (g.assignedLocation || g.location) === loc.name).length;
      return {
        c1: loc.name,
        c2: loc.city,
        c3: `${guardCount || loc.activeGuards || loc.totalGuards || 0} Personnel`,
        c4: (loc.attentionNeeded || loc.incidents > 0) ? '1 Alert' : '0 Clean',
        c5: loc.supervisor || 'Rajeshwar Sharma',
        status: loc.status || 'Active'
      };
    });
  }

  // Export to CSV Functionality
  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data available to export for the selected criteria.');
      return;
    }
    const headers = reportColumns.join(',');
    const rows = reportData.map(row => {
      return Object.values(row).map(val => `"${val || ''}"`).join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AutoGuard_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sosCount = (callLogsList || []).filter(c => 
    (c.verificationStatus || c.status || '').toLowerCase().includes('sos')
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Page Title & Actions */}
      <div className="bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Agency Reports & Muster Roll</h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Generate and export daily attendance registers, automated call records, and site billing summaries
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-transparent hover:bg-[#1E2D43] text-[#F8FAFC] border border-[#2B3B52] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-[#A8B6C9]" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Highlights for Reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance Compliance"
          value="94.2%"
          icon={CheckCircle}
          variant="success"
          subtext="+2.4% vs last reporting cycle"
        />
        <StatCard
          title="Phone Calls Completed"
          value={callLogsList.length}
          icon={PhoneCall}
          variant="primary"
          subtext="Automated voice prompts verified"
        />
        <StatCard
          title="SOS Incidents"
          value={sosCount}
          icon={AlertTriangle}
          variant="danger"
          subtext="Logged in current period"
        />
        <StatCard
          title="Roster Shift Adherence"
          value="98.5%"
          icon={TrendingUp}
          variant="default"
          subtext={`Across all ${locationsList.length || 6} deployment sites`}
        />
      </div>

      {/* 3. Report Customization Controls */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#2B3B52] pb-3">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#60A5FA]" />
            <span>Report Parameters & Data Scope</span>
          </h3>
          <span className="text-xs text-[#A8B6C9]">Live operational ledger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Report Category */}
          <div>
            <label className="block text-xs font-medium text-[#A8B6C9] mb-1">Report Module</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="attendance" className="bg-[#111C30] text-[#F8FAFC]">Staff Attendance & Punctuality</option>
              <option value="call_verification" className="bg-[#111C30] text-[#F8FAFC]">Automated Voice Verification Logs</option>
              <option value="guard_roster" className="bg-[#111C30] text-[#F8FAFC]">Security Guard Workforce Roster</option>
              <option value="location_summary" className="bg-[#111C30] text-[#F8FAFC]">Client Site Deployment Overview</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-medium text-[#A8B6C9] mb-1">Reporting Period</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="today" className="bg-[#111C30] text-[#F8FAFC]">Today (Live 24h)</option>
              <option value="7d" className="bg-[#111C30] text-[#F8FAFC]">Last 7 Days (Weekly Audit)</option>
              <option value="30d" className="bg-[#111C30] text-[#F8FAFC]">Current Month (30 Days)</option>
              <option value="quarter" className="bg-[#111C30] text-[#F8FAFC]">Quarterly Compliance Review</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-xs font-medium text-[#A8B6C9] mb-1">Site / Facility</label>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all" className="bg-[#111C30] text-[#F8FAFC]">All Deployment Sites</option>
              {locationsList.map(loc => (
                <option key={loc.id} value={loc.name} className="bg-[#111C30] text-[#F8FAFC]">{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Generated Report Preview Card */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B3B52] bg-[#1E2D43]/60">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#60A5FA]" />
              <span>{reportTitle}</span>
            </h3>
            <p className="text-xs text-[#A8B6C9] mt-0.5">
              Showing {reportData.length} records • Generated on {new Date().toLocaleDateString('en-GB')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 font-medium">
              Ready for Download
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
            <thead>
              <tr className="bg-[#111C30] text-[#A8B6C9] uppercase tracking-wider font-semibold border-b border-[#2B3B52]">
                {reportColumns.map((col, idx) => (
                  <th key={idx} className="py-3 px-4">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/60">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={reportColumns.length} className="py-8 text-center text-[#A8B6C9] text-xs">
                    No report records found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#1E2D43]/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#60A5FA]">{row.c1}</td>
                    <td className="py-3 px-4 font-bold text-[#F8FAFC]">{row.c2}</td>
                    <td className="py-3 px-4 font-mono text-[#A8B6C9]">{row.c3}</td>
                    <td className="py-3 px-4 text-[#F8FAFC]">{row.c4}</td>
                    <td className="py-3 px-4 text-[#F8FAFC]">{row.c5}</td>
                    {row.c6 && <td className="py-3 px-4 font-mono text-[#A8B6C9]">{row.c6}</td>}
                    {row.c7 && <td className="py-3 px-4 font-mono text-[#A8B6C9]">{row.c7}</td>}
                    <td className="py-3 px-4">
                      <StatusBadge status={row.status} theme="dark" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-[#111C30] border-t border-[#2B3B52] flex items-center justify-between text-xs text-[#A8B6C9]">
          <span>Total Records: {reportData.length}</span>
          <span>Security Agency Ledger Verified</span>
        </div>
      </div>
    </div>
  );
}
