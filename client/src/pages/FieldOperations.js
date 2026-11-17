import React, { useState } from 'react';
import {
  MapPin,
  Building2,
  Plus,
  Users,
  UserCheck,
  Phone,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

const FieldOperations = () => {
  const {
    locations = [],
    supervisors = [],
    guards = [],
    addLocation,
    updateLocation,
    deleteLocation,
    openCallModal,
  } = useApp();

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deactivatingLocation, setDeactivatingLocation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Initial form states
  const emptyFormData = {
    name: '',
    address: '',
    city: 'Gurugram',
    state: 'Haryana',
    contactNumber: '',
    totalGuards: 5,
    assignedSupervisor: '',
  };

  const [formData, setFormData] = useState(emptyFormData);
  const [editFormData, setEditFormData] = useState(emptyFormData);

  // Helper to match guards assigned to a location
  const getGuardsForLocation = (loc) => {
    if (!loc) return [];
    return guards.filter(
      (g) =>
        g.isDeleted !== true &&
        g.employmentStatus !== 'Archived' &&
        (g.assignedLocation === loc.name ||
          g.assignedSite === loc._id ||
          g.assignedSite === loc.id ||
          g.assignedSite?.siteName === loc.name ||
          g.assignedSite?._id === loc._id)
    );
  };

  // Dynamic Company KPIs
  const totalLocationsCount = locations.length;
  const activeGuardsList = guards.filter(
    (g) => g.isDeleted !== true && g.employmentStatus !== 'Archived'
  );
  const deployedGuardsCount = activeGuardsList.filter(
    (g) => g.assignedLocation || g.assignedSite
  ).length;
  const totalCapacity = locations.reduce(
    (sum, loc) => sum + (loc.guardCapacity || loc.totalGuards || 0),
    0
  );
  const unassignedGuardsCount = activeGuardsList.filter(
    (g) => !g.assignedLocation && !g.assignedSite
  ).length;

  // Add Location Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      const res = await addLocation(formData);
      if (res && res.success) {
        setIsAddModalOpen(false);
        setFormData(emptyFormData);
      } else {
        setActionError(res?.message || 'Failed to create site.');
      }
    } catch (err) {
      setActionError(err.message || 'Error creating site.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (loc) => {
    setEditingLocation(loc);
    setEditFormData({
      name: loc.name || '',
      address: loc.address || '',
      city: loc.city || 'Gurugram',
      state: loc.state || 'Haryana',
      contactNumber: loc.contactNumber || '',
      totalGuards: loc.guardCapacity || loc.totalGuards || 5,
      assignedSupervisor: (typeof loc.assignedSupervisor === 'object' ? loc.assignedSupervisor?._id : loc.assignedSupervisor) || '',
    });
    setActionError('');
    setIsEditModalOpen(true);
  };

  // Edit Location Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLocation) return;
    setActionLoading(true);
    setActionError('');
    try {
      const targetId = editingLocation._id || editingLocation.siteId || editingLocation.id;
      const res = await updateLocation(targetId, editFormData);
      if (res && res.success) {
        setIsEditModalOpen(false);
        setEditingLocation(null);
        if (selectedLocation && (selectedLocation.id === targetId || selectedLocation._id === targetId)) {
          setSelectedLocation(res.data);
        }
      } else {
        setActionError(res?.message || 'Failed to update site.');
      }
    } catch (err) {
      setActionError(err.message || 'Error updating site.');
    } finally {
      setActionLoading(false);
    }
  };

  // Deactivate Location
  const handleConfirmDeactivate = async () => {
    if (!deactivatingLocation) return;
    setActionLoading(true);
    setActionError('');
    try {
      const targetId =
        deactivatingLocation._id || deactivatingLocation.siteId || deactivatingLocation.id;
      const res = await deleteLocation(targetId);
      if (res && res.success) {
        setDeactivatingLocation(null);
        if (
          selectedLocation &&
          (selectedLocation.id === targetId || selectedLocation._id === targetId)
        ) {
          setSelectedLocation(null);
        }
      } else {
        setActionError(res?.message || 'Failed to deactivate site.');
      }
    } catch (err) {
      setActionError(err.message || 'Error deactivating site.');
    } finally {
      setActionLoading(false);
    }
  };

  // Guards for drawer
  const locationGuards = selectedLocation ? getGuardsForLocation(selectedLocation) : [];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
            Operational Sites & Security Posts
          </h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Manage commercial facilities, post-level guard deployments, and active command checkpoints
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
          <span>Add New Site</span>
        </button>
      </div>

      {/* 2. Four Dark Enterprise Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#3B82F6] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Operational Sites
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{totalLocationsCount}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">Guarded commercial facilities</span>
        </div>

        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#22C55E] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Guards Deployed
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{deployedGuardsCount}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">On active facility posts</span>
        </div>

        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#FBBF24] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Total Capacity
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{totalCapacity}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">Authorized guard slots</span>
        </div>

        <div className="p-4 rounded-xl bg-[#172337] border border-[#2B3B52] border-t-2 border-t-[#8B5CF6] shadow-md flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#A8B6C9] tracking-wider">
            Unassigned Guards
          </span>
          <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{unassignedGuardsCount}</p>
          <span className="text-xs text-[#A8B6C9] mt-0.5">Available for site dispatch</span>
        </div>
      </div>

      {/* 3. Empty State or Sites Grid */}
      {locations.length === 0 ? (
        <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl p-12 text-center max-w-xl mx-auto shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1E2D43] border border-[#2B3B52] flex items-center justify-center text-[#60A5FA]">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#F8FAFC] mb-1">No Operational Sites Registered</h2>
          <p className="text-xs text-[#A8B6C9] mb-6 leading-relaxed">
            Register your company's operational client locations and security posts to organize
            duty rosters, assign verified guards, and track on-site presence.
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
            <span>Register First Site</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations.map((loc) => {
            const assignedGuards = getGuardsForLocation(loc);
            const isAttention = loc.attentionNeeded;

            return (
              <div
                key={loc.id || loc._id || loc.siteId}
                className={`rounded-xl border p-5 shadow-md flex flex-col justify-between transition-all ${
                  isAttention
                    ? 'bg-[#172337] border-[#F87171] ring-1 ring-[#F87171]/30'
                    : 'bg-[#172337] border-[#2B3B52] hover:border-[#3B82F6]/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-lg ${
                          isAttention
                            ? 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                            : 'bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#F8FAFC] text-sm leading-snug">{loc.name}</h3>
                        <span className="font-mono text-[10px] text-[#60A5FA] font-bold">
                          {loc.siteId || loc.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                        {loc.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[#A8B6C9]">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#60A5FA] shrink-0 mt-0.5" />
                      <span>
                        {loc.address}
                        {loc.city ? `, ${loc.city}` : ''}
                        {loc.state ? `, ${loc.state}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                      <span>
                        Supervisor: <strong className="text-[#F8FAFC]">{loc.supervisor || 'Unassigned'}</strong>
                      </span>
                    </div>

                    {loc.contactNumber && (
                      <div className="flex items-center gap-2 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                        <span>{loc.contactNumber}</span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-[#111C30] border border-[#2B3B52] flex items-center justify-between text-[11px] mt-2">
                      <span className="text-[#A8B6C9]">Guard Post Capacity:</span>
                      <span className="font-semibold text-[#F8FAFC]">
                        {loc.guardCapacity || loc.totalGuards || 5} Guards
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#2B3B52] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#A8B6C9] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#60A5FA]" />
                    <span>{assignedGuards.length} Deployed</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedLocation(loc)}
                      title="View Post Details"
                      className="px-2.5 py-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] font-semibold text-xs flex items-center gap-1 border border-[#2B3B52] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(loc)}
                      title="Edit Site Details"
                      className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeactivatingLocation(loc);
                        setActionError('');
                      }}
                      title="Deactivate Site"
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

      {/* 4. Location Details Modal Drawer */}
      {selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-2xl overflow-hidden text-[#F8FAFC] shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-[#2B3B52]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#F8FAFC]">{selectedLocation.name}</h3>
                  <span className="text-[10px] font-mono font-bold text-[#60A5FA] px-2 py-0.5 rounded bg-[#1E2D43] border border-[#2B3B52]">
                    {selectedLocation.siteId || selectedLocation.id}
                  </span>
                </div>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  {selectedLocation.address}
                  {selectedLocation.city ? `, ${selectedLocation.city}` : ''}
                  {selectedLocation.state ? `, ${selectedLocation.state}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="text-[10px] text-[#A8B6C9] uppercase font-bold">Assigned Supervisor</span>
                <p className="font-bold text-[#F8FAFC] mt-0.5">
                  {selectedLocation.supervisor || 'Unassigned'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="text-[10px] text-[#A8B6C9] uppercase font-bold">Gate Desk Contact</span>
                <p className="font-mono font-bold text-[#60A5FA] mt-0.5">
                  {selectedLocation.contactNumber || 'Not configured'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="text-[10px] text-[#A8B6C9] uppercase font-bold">Roster Capacity</span>
                <p className="font-bold text-[#22C55E] mt-0.5">
                  {selectedLocation.guardCapacity || selectedLocation.totalGuards || 5} Guards
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#F8FAFC] text-xs mb-2">
                Guards Deployed at this Facility ({locationGuards.length}):
              </h4>
              <div className="divide-y divide-[#2B3B52]/60 max-h-60 overflow-y-auto border border-[#2B3B52] rounded-xl bg-[#111C30]">
                {locationGuards.length === 0 ? (
                  <p className="text-center py-6 text-[#A8B6C9] text-xs">
                    No guards currently assigned to this location. Use Guard Management to deploy guards.
                  </p>
                ) : (
                  locationGuards.map((g) => (
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
                            setSelectedLocation(null);
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
                  const loc = selectedLocation;
                  setSelectedLocation(null);
                  handleOpenEdit(loc);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] rounded-lg text-xs font-semibold border border-[#2B3B52] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Site Info</span>
              </button>
              <button
                onClick={() => setSelectedLocation(null)}
                className="px-5 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] rounded-lg text-xs font-semibold transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Location Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Register Operational Site</h3>
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
                <label className="block font-semibold text-[#A8B6C9] mb-1">Site / Facility Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cyber City Tech Towers"
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Sector, Corridor, Highway"
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Gate Desk Phone</label>
                  <input
                    type="text"
                    placeholder="+91 124 4567890"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Guard Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalGuards}
                    onChange={(e) =>
                      setFormData({ ...formData, totalGuards: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Assigned Field Supervisor
                </label>
                <select
                  value={formData.assignedSupervisor || ''}
                  onChange={(e) => setFormData({ ...formData, assignedSupervisor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="">Unassigned</option>
                  {supervisors.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.fullName || s.name} ({s.supervisorId || s.id})
                    </option>
                  ))}
                </select>
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
                  {actionLoading ? 'Saving...' : 'Register Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Location Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Edit Operational Site</h3>
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
                <label className="block font-semibold text-[#A8B6C9] mb-1">Site / Facility Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">State</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Gate Desk Phone</label>
                  <input
                    type="text"
                    value={editFormData.contactNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, contactNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Guard Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.totalGuards}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        totalGuards: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">
                  Assigned Field Supervisor
                </label>
                <select
                  value={editFormData.assignedSupervisor || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, assignedSupervisor: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="">Unassigned</option>
                  {supervisors.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.fullName || s.name} ({s.supervisorId || s.id})
                    </option>
                  ))}
                </select>
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

      {/* 7. Deactivate Site Confirmation Modal */}
      {deactivatingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#F8FAFC]">Deactivate Operational Site?</h3>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Are you sure you want to deactivate <strong className="text-white">{deactivatingLocation.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-[#A8B6C9] bg-[#111C30] p-3 rounded-xl border border-[#2B3B52] leading-relaxed">
              This site will be deactivated from active duty rotations. Historical logs and past shift records will remain fully intact for compliance reporting.
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
                onClick={() => setDeactivatingLocation(null)}
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

export default FieldOperations;
