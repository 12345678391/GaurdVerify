import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  PhoneCall, 
  Eye,
  Building,
  Award,
  X
} from 'lucide-react';

export default function Workforce() {
  const { guards, locations, openCallModal } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Stats
  const totalWorkforce = guards.length;
  const activeStaff = guards.filter(g => g.status === 'active').length;
  const onDutyStaff = guards.filter(g => g.shift !== 'Unassigned' && g.status === 'active').length;
  const archivedStaff = guards.filter(g => g.status === 'archived').length;

  // Designations breakdown
  const designations = Array.from(new Set(guards.map(g => g.designation)));

  // Filter guards
  const filteredGuards = guards.filter(guard => {
    const matchesSearch = 
      guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guard.guardId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guard.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || guard.status === statusFilter;
    const matchesDesignation = designationFilter === 'all' || guard.designation === designationFilter;
    const matchesLocation = locationFilter === 'all' || guard.location === locationFilter;
    return matchesSearch && matchesStatus && matchesDesignation && matchesLocation;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111C30] border border-[#2B3B52] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#F8FAFC] tracking-tight">Workforce Management</h1>
          <p className="text-xs md:text-sm text-[#A8B6C9] mt-1">
            Complete company personnel roster, designation deployment, and location distribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-[#172337] border border-[#2B3B52] text-xs text-[#A8B6C9] font-mono">
            {totalWorkforce} Total Personnel
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {onDutyStaff} On Shift Deployment
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={totalWorkforce}
          icon={Users}
          color="blue"
          subtext="Security personnel registered"
        />
        <StatCard
          title="Active Personnel"
          value={activeStaff}
          icon={UserCheck}
          color="green"
          subtext={`${((activeStaff / (totalWorkforce || 1)) * 100).toFixed(0)}% workforce readiness`}
        />
        <StatCard
          title="Currently Deployed"
          value={onDutyStaff}
          icon={Briefcase}
          color="cyan"
          subtext="Assigned to live client sites"
        />
        <StatCard
          title="Archived / Inactive"
          value={archivedStaff}
          icon={UserX}
          color="amber"
          subtext="Offboarded or on leave"
        />
      </div>

      {/* Designation & Deployment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#172337] border border-[#2B3B52] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#60A5FA]" />
              Designation & Hierarchy Breakdown
            </h3>
            <span className="text-xs text-[#A8B6C9]">Total {designations.length} Specialized Tiers</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {designations.map(desig => {
              const count = guards.filter(g => g.designation === desig).length;
              const percent = ((count / (totalWorkforce || 1)) * 100).toFixed(0);
              return (
                <div key={desig} className="bg-[#0B1220] border border-[#2B3B52] rounded-lg p-3.5 hover:border-[#3B82F6]/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-[#A8B6C9] font-medium">{desig}</p>
                      <h4 className="text-lg font-bold text-[#F8FAFC] mt-0.5">{count}</h4>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#172337] text-[#60A5FA] border border-[#2B3B52]">
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full bg-[#111C30] rounded-full h-1.5 mt-3 overflow-hidden">
                    <div 
                      className="bg-[#3B82F6] h-1.5 rounded-full" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location distribution summary */}
        <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#2DD4BF]" />
              Site Deployment
            </h3>
            <span className="text-xs text-[#A8B6C9]">{locations.length} Sites</span>
          </div>
          <div className="space-y-2.5 overflow-y-auto max-h-[190px] pr-1">
            {locations.map(loc => {
              const guardCount = guards.filter(g => g.location === loc.name).length;
              return (
                <div key={loc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1220] border border-[#2B3B52]/40 hover:bg-[#1E2D43]/60 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[#2DD4BF] flex-shrink-0" />
                    <span className="text-xs text-[#F8FAFC] font-medium truncate">{loc.name}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
                    {guardCount} guards
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Staff Register Filter & Table */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
            Security Personnel Registry
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A8B6C9]" />
              <input
                type="text"
                placeholder="Search staff, ID, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] w-48 sm:w-60"
              />
            </div>

            {/* Designation Filter */}
            <select
              value={designationFilter}
              onChange={e => setDesignationFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">All Designations</option>
              {designations.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Location Filter */}
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[#2B3B52]">
          <table className="w-full text-left text-sm text-[#F8FAFC]">
            <thead className="text-[11px] uppercase bg-[#111C30] text-[#A8B6C9] border-b border-[#2B3B52] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Guard ID & Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Assigned Post</th>
                <th className="py-3 px-4">Current Shift</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/50">
              {filteredGuards.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#A8B6C9] text-xs">
                    No workforce records matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredGuards.map(guard => (
                  <tr key={guard.id} className="hover:bg-[#1E2D43]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={guard.photo}
                          alt={guard.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#2B3B52]"
                        />
                        <div>
                          <p className="font-semibold text-[#F8FAFC] text-xs md:text-sm">{guard.name}</p>
                          <span className="text-[11px] font-mono text-[#60A5FA]">{guard.guardId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-[#F8FAFC]">
                      {guard.designation}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-[#A8B6C9]">
                      {guard.phone}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#A8B6C9]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#A8B6C9] flex-shrink-0" />
                        <span className="truncate max-w-[160px] text-[#F8FAFC]">{guard.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#1E2D43] text-[#A8B6C9] border border-[#2B3B52]">
                        {guard.shift}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={guard.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStaff(guard)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors cursor-pointer"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openCallModal(guard)}
                          className="p-1.5 rounded-lg bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#60A5FA] hover:text-blue-300 border border-[#3B82F6]/30 transition-colors cursor-pointer"
                          title="Verify via AutoGuard Phone Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Details Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl w-full max-w-lg p-6 shadow-2xl relative text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-4 border-b border-[#2B3B52]">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#60A5FA]" />
                Workforce Member Profile
              </h3>
              <button 
                onClick={() => setSelectedStaff(null)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedStaff.photo}
                  alt={selectedStaff.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-[#3B82F6]/50 shadow-md"
                />
                <div>
                  <h4 className="text-base font-bold text-[#F8FAFC]">{selectedStaff.name}</h4>
                  <p className="text-xs text-[#60A5FA] font-mono">{selectedStaff.guardId} • {selectedStaff.designation}</p>
                  <p className="text-xs text-[#A8B6C9] mt-1">Joined: {selectedStaff.joiningDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#0B1220] p-4 rounded-xl border border-[#2B3B52]">
                <div>
                  <span className="text-[#A8B6C9]">Mobile Phone:</span>
                  <p className="text-[#F8FAFC] font-mono font-medium mt-0.5">{selectedStaff.phone}</p>
                </div>
                <div>
                  <span className="text-[#A8B6C9]">Emergency Contact:</span>
                  <p className="text-[#F8FAFC] font-mono font-medium mt-0.5">{selectedStaff.emergencyContact}</p>
                </div>
                <div>
                  <span className="text-[#A8B6C9]">Assigned Post:</span>
                  <p className="text-[#F8FAFC] font-medium mt-0.5">{selectedStaff.location}</p>
                </div>
                <div>
                  <span className="text-[#A8B6C9]">Shift Schedule:</span>
                  <p className="text-[#F8FAFC] font-medium mt-0.5">{selectedStaff.shift}</p>
                </div>
                <div>
                  <span className="text-[#A8B6C9]">Residential City:</span>
                  <p className="text-[#F8FAFC] font-medium mt-0.5">{selectedStaff.address}</p>
                </div>
                <div>
                  <span className="text-[#A8B6C9]">Employment Status:</span>
                  <div className="mt-0.5">
                    <StatusBadge status={selectedStaff.status} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    const guardToCall = selectedStaff;
                    setSelectedStaff(null);
                    openCallModal(guardToCall);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Initiate Telephony Call
                </button>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="py-2.5 px-4 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] text-xs font-medium transition-colors border border-[#2B3B52] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
