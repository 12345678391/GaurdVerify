import React, { useState } from 'react';
import {
  UserCheck,
  Building2,
  Plus,
  Users,
  Phone,
  Mail,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Bell,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

const Supervisors = () => {
  const {
    supervisors = [],
    locations = [],
    guards = [],
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    openCallModal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const [deactivatingSupervisor, setDeactivatingSupervisor] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Initial form states
  const emptyFormData = {
    name: '',
    phone: '',
    email: '',
    assignedSites: [],
    employmentStatus: 'Active',
    alertPreferences: {
      sms: true,
      call: true,
      email: true,
    },
  };

  const [formData, setFormData] = useState(emptyFormData);
  const [editFormData, setEditFormData] = useState(emptyFormData);

  // Helper to resolve site details from assignedSites array
  const getAssignedSiteNames = (assignedSites) => {
    if (!assignedSites || !Array.isArray(assignedSites)) return [];
    return assignedSites.map((siteRef) => {
      if (typeof siteRef === 'object' && siteRef !== null) {
        return siteRef.siteName || siteRef.name || 'Site Post';
      }
      const match = locations.find((l) => l._id === siteRef || l.id === siteRef || l.siteId === siteRef);
      return match ? match.name : 'Facility Post';
    });
  };

  // Helper to match guards reporting to a supervisor
  const getGuardsForSupervisor = (sup) => {
    if (!sup) return [];
    const supId = sup._id || sup.id;
    return guards.filter(
      (g) =>
        g.isDeleted !== true &&
        g.employmentStatus !== 'Archived' &&
        (g.assignedSupervisor === supId ||
          g.assignedSupervisor?._id === supId ||
          g.assignedSupervisor === sup.supervisorId)
    );
  };

  // KPIs
  const totalSupervisorsCount = supervisors.length;
  const activeSupervisorsCount = supervisors.filter(
    (s) => (s.employmentStatus || s.status) === 'Active'
  ).length;
  const uniqueSupervisedSiteIds = new Set();
  supervisors.forEach((s) => {
    if (Array.isArray(s.assignedSites)) {
      s.assignedSites.forEach((siteRef) => {
        const id = typeof siteRef === 'object' ? siteRef._id : siteRef;
        if (id) uniqueSupervisedSiteIds.add(id);
      });
    }
  });
  const totalSupervisedSites = uniqueSupervisedSiteIds.size;
  const totalReportingGuards = supervisors.reduce(
    (sum, s) => sum + (s.guardCount || getGuardsForSupervisor(s).length || 0),
    0
  );

  // Filtered list
  const filteredSupervisors = supervisors.filter((sup) => {
    const q = searchTerm.toLowerCase();
    const name = (sup.name || sup.fullName || '').toLowerCase();
    const supId = (sup.supervisorId || sup.id || '').toLowerCase();
    const phone = (sup.phone || sup.mobileNumber || '').toLowerCase();
    const email = (sup.email || '').toLowerCase();

    const matchesQuery = name.includes(q) || supId.includes(q) || phone.includes(q) || email.includes(q);
    const status = sup.employmentStatus || sup.status || 'Active';
    const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      const res = await addSupervisor(formData);
      if (res && res.success) {
        setIsAddModalOpen(false);
        setFormData(emptyFormData);
      } else {
        setActionError(res?.message || 'Failed to create supervisor.');
      }
    } catch (err) {
      setActionError(err.message || 'Error creating supervisor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (sup) => {
    setEditingSupervisor(sup);
    const assignedIds = Array.isArray(sup.assignedSites)
      ? sup.assignedSites.map((s) => (typeof s === 'object' ? s._id : s))
      : [];

    setEditFormData({
      name: sup.fullName || sup.name || '',
      phone: sup.mobileNumber || sup.phone || '',
      email: sup.email || '',
      assignedSites: assignedIds,
      employmentStatus: sup.employmentStatus || sup.status || 'Active',
      alertPreferences: sup.alertPreferences || { sms: true, call: true, email: true },
    });
    setActionError('');
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSupervisor) return;
    setActionLoading(true);
    setActionError('');
    try {
      const targetId = editingSupervisor._id || editingSupervisor.supervisorId || editingSupervisor.id;
      const res = await updateSupervisor(targetId, editFormData);
      if (res && res.success) {
        setIsEditModalOpen(false);
        setEditingSupervisor(null);
        if (selectedSupervisor && (selectedSupervisor.id === targetId || selectedSupervisor._id === targetId)) {
          setSelectedSupervisor(res.data);
        }
      } else {
        setActionError(res?.message || 'Failed to update supervisor.');
      }
    } catch (err) {
      setActionError(err.message || 'Error updating supervisor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivatingSupervisor) return;
    setActionLoading(true);
    setActionError('');
    try {
      const targetId =
        deactivatingSupervisor._id ||
        deactivatingSupervisor.supervisorId ||
        deactivatingSupervisor.id;
      const res = await deleteSupervisor(targetId);
      if (res && res.success) {
        setDeactivatingSupervisor(null);
        if (
          selectedSupervisor &&
          (selectedSupervisor.id === targetId || selectedSupervisor._id === targetId)
        ) {
          setSelectedSupervisor(null);
        }
      } else {
        setActionError(res?.message || 'Failed to deactivate supervisor.');
      }
    } catch (err) {
      setActionError(err.message || 'Error deactivating supervisor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reporting guards for selected supervisor drawer
  const drawerGuards = selectedSupervisor ? getGuardsForSupervisor(selectedSupervisor) : [];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
            Supervisor Management & Field Command
          </h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Manage field supervisors, facility post assignments, reporting guard rosters, and automated alert routing
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(emptyFormData);
            setActionError('');
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supervisor</span>
        </button>
      </div>

      {/* 2. Four Dark Enterprise Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#3B82F6] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Total Supervisors
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{totalSupervisorsCount}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">Field operations leads</span>
        </div>

        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#22C55E] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Active On Duty
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{activeSupervisorsCount}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">On active patrol rotation</span>
        </div>

        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#FBBF24] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Supervised Posts
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{totalSupervisedSites}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">Active facility locations</span>
        </div>

        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#8B5CF6] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Reporting Guards
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{totalReportingGuards}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">Supervised guard force</span>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      {supervisors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#172337] p-3 rounded-xl border border-[#2B3B52]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by supervisor name, ID, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#111C30] border border-[#2B3B52] rounded-lg text-xs text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#A8B6C9]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#111C30] border border-[#2B3B52] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      )}

      {/* 4. Empty State or Supervisors Grid */}
      {supervisors.length === 0 ? (
        <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl p-12 text-center max-w-xl mx-auto shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1E2D43] border border-[#2B3B52] flex items-center justify-center text-[#60A5FA]">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#F8FAFC] mb-1">No Field Supervisors Registered</h2>
          <p className="text-xs text-[#A8B6C9] mb-6 leading-relaxed">
            Register your company's field operations supervisors to oversee security posts, manage
            guard assignments, and receive automated incident and shift verification alerts.
          </p>
          <button
            onClick={() => {
              setFormData(emptyFormData);
              setActionError('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register First Supervisor</span>
          </button>
        </div>
      ) : filteredSupervisors.length === 0 ? (
        <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-8 text-center text-xs text-[#A8B6C9]">
          No supervisors match your search filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSupervisors.map((sup) => {
            const assignedSiteNames = getAssignedSiteNames(sup.assignedSites);
            const managedGuards = getGuardsForSupervisor(sup);
            const status = sup.employmentStatus || sup.status || 'Active';
            const isActive = status === 'Active';

            return (
              <div
                key={sup.id || sup._id || sup.supervisorId}
                className="rounded-xl border border-[#2B3B52] bg-[#172337] hover:border-[#3B82F6]/50 p-5 shadow-md flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA] font-bold text-sm shrink-0">
                        {(sup.fullName || sup.name || 'S')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#F8FAFC] text-sm leading-snug">
                          {sup.fullName || sup.name}
                        </h3>
                        <span className="font-mono text-[10px] text-[#60A5FA] font-bold">
                          {sup.supervisorId || sup.id}
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
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[#A8B6C9]">
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                      <span>{sup.mobileNumber || sup.phone}</span>
                    </div>

                    {sup.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                        <span className="truncate">{sup.email}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <span className="text-[10px] font-semibold text-[#A8B6C9] uppercase tracking-wider block mb-1">
                        Assigned Facility Posts ({assignedSiteNames.length}):
                      </span>
                      {assignedSiteNames.length === 0 ? (
                        <span className="text-[11px] text-[#A8B6C9]/70 italic">
                          No facility posts assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                          {assignedSiteNames.map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#111C30] border border-[#2B3B52] text-[10px] text-[#F8FAFC] flex items-center gap-1"
                            >
                              <Building2 className="w-2.5 h-2.5 text-[#60A5FA]" />
                              <span>{name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alert Preference Indicators */}
                    <div className="p-2 rounded-lg bg-[#111C30] border border-[#2B3B52] flex items-center justify-between text-[10px] mt-2">
                      <span className="text-[#A8B6C9] flex items-center gap-1">
                        <Bell className="w-3 h-3 text-[#FBBF24]" />
                        <span>Alert Routing:</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span
                          className={
                            sup.alertPreferences?.sms ? 'text-[#22C55E]' : 'text-[#A8B6C9]/40'
                          }
                        >
                          SMS
                        </span>
                        <span className="text-[#2B3B52]">•</span>
                        <span
                          className={
                            sup.alertPreferences?.call ? 'text-[#22C55E]' : 'text-[#A8B6C9]/40'
                          }
                        >
                          Call
                        </span>
                        <span className="text-[#2B3B52]">•</span>
                        <span
                          className={
                            sup.alertPreferences?.email ? 'text-[#22C55E]' : 'text-[#A8B6C9]/40'
                          }
                        >
                          Email
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#2B3B52] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#A8B6C9] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#60A5FA]" />
                    <span>{managedGuards.length || sup.guardCount || 0} Guards</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedSupervisor(sup)}
                      title="View Supervisor Details"
                      className="px-2.5 py-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] font-semibold text-xs flex items-center gap-1 border border-[#2B3B52] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sup)}
                      title="Edit Supervisor"
                      className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeactivatingSupervisor(sup);
                        setActionError('');
                      }}
                      title="Deactivate Supervisor"
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

      {/* 5. Supervisor Details Modal Drawer */}
      {selectedSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-2xl overflow-hidden text-[#F8FAFC] shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-[#2B3B52]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {selectedSupervisor.fullName || selectedSupervisor.name}
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-[#60A5FA] px-2 py-0.5 rounded bg-[#1E2D43] border border-[#2B3B52]">
                    {selectedSupervisor.supervisorId || selectedSupervisor.id}
                  </span>
                </div>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Field Operations Supervisor •{' '}
                  <span className="text-[#22C55E]">
                    {selectedSupervisor.employmentStatus || selectedSupervisor.status || 'Active'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSupervisor(null)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="text-[10px] text-[#A8B6C9] uppercase font-bold">Mobile Number</span>
                <p className="font-mono font-bold text-[#60A5FA] mt-0.5">
                  {selectedSupervisor.mobileNumber || selectedSupervisor.phone}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="text-[10px] text-[#A8B6C9] uppercase font-bold">Email Address</span>
                <p className="font-bold text-[#F8FAFC] mt-0.5 truncate">
                  {selectedSupervisor.email || 'Not configured'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="text-[10px] text-[#A8B6C9] uppercase font-bold">Supervised Posts</span>
                <p className="font-bold text-[#22C55E] mt-0.5">
                  {getAssignedSiteNames(selectedSupervisor.assignedSites).length} Facilities
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#F8FAFC] text-xs mb-2">
                Guards Reporting to this Supervisor ({drawerGuards.length}):
              </h4>
              <div className="divide-y divide-[#2B3B52]/60 max-h-60 overflow-y-auto border border-[#2B3B52] rounded-xl bg-[#111C30]">
                {drawerGuards.length === 0 ? (
                  <p className="text-center py-6 text-[#A8B6C9] text-xs">
                    No security guards currently assigned to this supervisor.
                  </p>
                ) : (
                  drawerGuards.map((g) => (
                    <div key={g.id || g._id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            g.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={g.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#2B3B52]"
                        />
                        <div>
                          <span className="font-bold text-[#F8FAFC] block">{g.name}</span>
                          <span className="text-[10px] font-mono text-[#60A5FA]">
                            {g.phone || g.guardId}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={g.callStatus || 'Idle'} theme="dark" />
                        <button
                          onClick={() => {
                            setSelectedSupervisor(null);
                            openCallModal(g);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] font-bold text-[10px] border border-[#2B3B52] transition-colors"
                        >
                          Call Guard
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#2B3B52]">
              <button
                onClick={() => {
                  const sup = selectedSupervisor;
                  setSelectedSupervisor(null);
                  handleOpenEdit(sup);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] rounded-lg text-xs font-semibold border border-[#2B3B52] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Supervisor Info</span>
              </button>
              <button
                onClick={() => setSelectedSupervisor(null)}
                className="px-5 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] rounded-lg text-xs font-semibold transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Supervisor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Register Field Supervisor</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="m-4 p-3 rounded-lg bg-[#F87171]/15 border border-[#F87171]/30 text-[#F87171] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="supervisor@agency.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Assign Facility Posts
                </label>
                {locations.length === 0 ? (
                  <p className="text-[11px] text-[#A8B6C9]/60 italic p-2 bg-[#111C30] rounded border border-[#2B3B52]">
                    No operational sites registered yet. Register sites under Operational Sites to assign.
                  </p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-[#111C30] rounded-lg border border-[#2B3B52]">
                    {locations.map((loc) => {
                      const locId = loc._id || loc.id;
                      const isChecked = formData.assignedSites.includes(locId);
                      return (
                        <label
                          key={locId}
                          className="flex items-center gap-2 text-[11px] text-[#F8FAFC] cursor-pointer hover:bg-[#1E2D43] p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assignedSites: [...formData.assignedSites, locId],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assignedSites: formData.assignedSites.filter((id) => id !== locId),
                                });
                              }
                            }}
                            className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6] focus:ring-0"
                          />
                          <span className="truncate">{loc.name}</span>
                          <span className="text-[10px] text-[#60A5FA] font-mono">({loc.siteId || loc.id})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Automated Alert Routing Channels
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded bg-[#111C30] border border-[#2B3B52] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alertPreferences.sms}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alertPreferences: { ...formData.alertPreferences, sms: e.target.checked },
                        })
                      }
                      className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6]"
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-[#111C30] border border-[#2B3B52] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alertPreferences.call}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alertPreferences: { ...formData.alertPreferences, call: e.target.checked },
                        })
                      }
                      className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6]"
                    />
                    <span>Phone Call</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-[#111C30] border border-[#2B3B52] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alertPreferences.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alertPreferences: { ...formData.alertPreferences, email: e.target.checked },
                        })
                      }
                      className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6]"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Register Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Edit Supervisor Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Edit Supervisor Profile</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="m-4 p-3 rounded-lg bg-[#F87171]/15 border border-[#F87171]/30 text-[#F87171] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Employment Status</label>
                <select
                  value={editFormData.employmentStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, employmentStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Assign Facility Posts
                </label>
                {locations.length === 0 ? (
                  <p className="text-[11px] text-[#A8B6C9]/60 italic p-2 bg-[#111C30] rounded border border-[#2B3B52]">
                    No operational sites registered.
                  </p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-[#111C30] rounded-lg border border-[#2B3B52]">
                    {locations.map((loc) => {
                      const locId = loc._id || loc.id;
                      const isChecked = editFormData.assignedSites.includes(locId);
                      return (
                        <label
                          key={locId}
                          className="flex items-center gap-2 text-[11px] text-[#F8FAFC] cursor-pointer hover:bg-[#1E2D43] p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFormData({
                                  ...editFormData,
                                  assignedSites: [...editFormData.assignedSites, locId],
                                });
                              } else {
                                setEditFormData({
                                  ...editFormData,
                                  assignedSites: editFormData.assignedSites.filter((id) => id !== locId),
                                });
                              }
                            }}
                            className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6] focus:ring-0"
                          />
                          <span className="truncate">{loc.name}</span>
                          <span className="text-[10px] text-[#60A5FA] font-mono">({loc.siteId || loc.id})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Automated Alert Routing Channels
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded bg-[#111C30] border border-[#2B3B52] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.alertPreferences.sms}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          alertPreferences: { ...editFormData.alertPreferences, sms: e.target.checked },
                        })
                      }
                      className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6]"
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-[#111C30] border border-[#2B3B52] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.alertPreferences.call}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          alertPreferences: { ...editFormData.alertPreferences, call: e.target.checked },
                        })
                      }
                      className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6]"
                    />
                    <span>Phone Call</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-[#111C30] border border-[#2B3B52] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.alertPreferences.email}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          alertPreferences: { ...editFormData.alertPreferences, email: e.target.checked },
                        })
                      }
                      className="rounded border-[#2B3B52] bg-[#172337] text-[#3B82F6]"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Deactivate Confirmation Modal */}
      {deactivatingSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#F8FAFC]">Deactivate Field Supervisor?</h3>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Are you sure you want to deactivate{' '}
                  <strong className="text-white">
                    {deactivatingSupervisor.fullName || deactivatingSupervisor.name}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            <p className="text-xs text-[#A8B6C9] bg-[#111C30] p-3 rounded-xl border border-[#2B3B52] leading-relaxed">
              This supervisor will be removed from active field operations rotations. Historical shift logs, patrol records, and incident reports remain preserved for audit compliance.
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
                onClick={() => setDeactivatingSupervisor(null)}
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

export default Supervisors;
