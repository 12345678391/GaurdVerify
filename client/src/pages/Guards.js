import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Archive,
  PhoneCall,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  Building,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const Guards = () => {
  const location = useLocation();
  const { guards = [], locations = [], shifts = [], addGuard, updateGuard, archiveGuard, openCallModal } = useApp();

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('personal'); // 'personal' | 'shifts' | 'calls'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    joiningDate: '13-11-2026',
    assignedLocation: '',
    designation: 'Security Guard',
    employmentStatus: 'Active',
    currentShift: 'Morning Shift (06:00 - 14:00)',
    avatar: '',
  });

  // Listen to ?action=add query param from Dashboard Quick Action
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      handleOpenAdd();
    }
  }, [location.search]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      emergencyContact: '',
      joiningDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      assignedLocation: locations[0]?.name || '',
      designation: 'Security Officer',
      employmentStatus: 'Active',
      currentShift: shifts[0] ? `${shifts[0].name} (${shifts[0].startTime} - ${shifts[0].endTime})` : '',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (guard) => {
    setSelectedGuard(guard);
    setFormData({
      name: guard.name,
      phone: guard.phone,
      email: guard.email || '',
      address: guard.address || '',
      emergencyContact: guard.emergencyContact || '',
      joiningDate: guard.joiningDate,
      assignedLocation: guard.assignedLocation,
      designation: guard.designation,
      employmentStatus: guard.employmentStatus,
      currentShift: guard.currentShift,
      avatar: guard.avatar,
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const res = await addGuard(formData);
    if (res && res.success === false) {
      alert(`Guard registration failed: ${res.message}`);
    } else {
      setIsAddModalOpen(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const res = await updateGuard(selectedGuard.id, formData);
    if (res && res.success === false) {
      alert(`Guard update failed: ${res.message}`);
    } else {
      setIsEditModalOpen(false);
    }
  };

  const handleArchive = async (guard) => {
    if (window.confirm(`Archive guard ${guard.name}? Historical records will be retained.`)) {
      const res = await archiveGuard(guard.id);
      if (res && res.success === false) {
        alert(`Failed to archive guard: ${res.message}`);
      }
    }
  };

  const handleOpenProfile = (guard) => {
    setSelectedGuard(guard);
    setProfileTab('personal');
    setIsProfileModalOpen(true);
  };

  // Filter & Sort
  const filteredGuards = guards
    .filter((g) => {
      const matchSearch =
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.id.toLowerCase().includes(search.toLowerCase()) ||
        g.phone.includes(search) ||
        g.assignedLocation.toLowerCase().includes(search.toLowerCase());
      const matchLoc = locationFilter ? g.assignedLocation.includes(locationFilter) : true;
      const matchStatus = statusFilter ? g.employmentStatus === statusFilter : true;
      return matchSearch && matchLoc && matchStatus;
    })
    .sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (sortOrder === 'asc') return valA.localeCompare(valB);
      return valB.localeCompare(valA);
    });

  const totalPages = Math.ceil(filteredGuards.length / pageSize) || 1;
  const paginatedGuards = filteredGuards.slice((page - 1) * pageSize, page * pageSize);

  const activeCount = guards.filter((g) => g.employmentStatus === 'Active').length;

  return (
    <div className="w-full space-y-5">
      {/* 1. Guard Directory Heading */}
      <div className="bg-[#111C30] border border-[#2B3B52] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#60A5FA]" />
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
                Guard Management
              </h1>
            </div>
            <p className="text-xs text-[#A8B6C9] mt-0.5 leading-relaxed">
              Register new guards, search active roster, edit guard details, and manage deployment status.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-[#1E2D43] border border-[#2B3B52] text-xs font-semibold text-[#F8FAFC]">
              {guards.length} Total Registered
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs font-semibold text-[#22C55E]">
              {activeCount} Active Guards
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search and Filters Bar */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Controls: Search, Location, Status, Sort */}
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
              <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search guard name, ID, phone, site..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] font-medium"
              />
            </div>

            {/* Location Filter */}
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium cursor-pointer"
            >
              <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name} className="bg-[#111C30] text-[#F8FAFC]">
                  {loc.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium cursor-pointer"
            >
              <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Status</option>
              <option value="Active" className="bg-[#111C30] text-[#F8FAFC]">Active</option>
              <option value="Archived" className="bg-[#111C30] text-[#F8FAFC]">Archived</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field);
                setSortOrder(order);
              }}
              className="h-9 px-3 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium cursor-pointer"
            >
              <option value="name-asc" className="bg-[#111C30] text-[#F8FAFC]">Sort: Name (A to Z)</option>
              <option value="name-desc" className="bg-[#111C30] text-[#F8FAFC]">Sort: Name (Z to A)</option>
              <option value="id-asc" className="bg-[#111C30] text-[#F8FAFC]">Sort: Guard ID</option>
              <option value="joiningDate-desc" className="bg-[#111C30] text-[#F8FAFC]">Sort: Joining Date</option>
            </select>
          </div>

          {/* Add New Guard Button */}
          <button
            onClick={handleOpenAdd}
            className="h-9 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Guard</span>
          </button>
        </div>
      </div>

      {/* 3. Guard Directory Table Container */}
      <div className="bg-[#172337] rounded-xl border border-[#2B3B52] shadow-md overflow-hidden w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[960px]">
            <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#A8B6C9] uppercase tracking-wider font-semibold text-[11px] select-none">
              <tr>
                <th className="py-3 px-4 w-[110px] whitespace-nowrap">Guard ID</th>
                <th className="py-3 px-4 min-w-[210px]">Guard Details</th>
                <th className="py-3 px-4 w-[140px] whitespace-nowrap">Mobile Contact</th>
                <th className="py-3 px-4 min-w-[170px]">Assigned Location</th>
                <th className="py-3 px-4 w-[120px] whitespace-nowrap">Joining Date</th>
                <th className="py-3 px-4 min-w-[180px]">Current Shift</th>
                <th className="py-3 px-4 w-[90px] whitespace-nowrap">Status</th>
                <th className="py-3 px-4 w-[140px] whitespace-nowrap">Verification</th>
                <th className="py-3 px-4 w-[130px] whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
              {paginatedGuards.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-[#A8B6C9]">
                    No guards matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedGuards.map((guard) => (
                  <tr key={guard.id} className="hover:bg-[#1E2D43]/80 transition-colors">
                    {/* Guard ID */}
                    <td className="py-3 px-4 font-mono font-bold text-[#60A5FA] whitespace-nowrap">
                      {guard.id}
                    </td>

                    {/* Guard Details (Photo + Name + Designation) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={guard.avatar}
                          alt={guard.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-[#F8FAFC] block truncate">{guard.name}</span>
                          <span className="text-[11px] text-[#A8B6C9] block truncate">
                            {guard.designation}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-[#A8B6C9] whitespace-nowrap">
                      {guard.phone}
                    </td>

                    {/* Assigned Location */}
                    <td className="py-3 px-4 text-[#F8FAFC]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                        <span className="truncate">{guard.assignedLocation}</span>
                      </div>
                    </td>

                    {/* Joining Date */}
                    <td className="py-3 px-4 text-[#A8B6C9] font-mono text-[11px] whitespace-nowrap">
                      {guard.joiningDate}
                    </td>

                    {/* Current Shift */}
                    <td className="py-3 px-4 font-medium text-[#F8FAFC]">
                      <span className="truncate block">{guard.currentShift}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          guard.employmentStatus === 'Active'
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                            : 'bg-[#1E2D43] text-[#A8B6C9] border border-[#2B3B52]'
                        }`}
                      >
                        {guard.employmentStatus}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={guard.callStatus} theme="dark" />
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCallModal(guard)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] border border-[#2B3B52] transition-colors"
                          title="Call Guard (Automated Telephony Verification)"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenProfile(guard)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(guard)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] border border-[#2B3B52] transition-colors"
                          title="Edit Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(guard)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F87171] border border-[#2B3B52] transition-colors"
                          title="Archive Guard"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-[#2B3B52] bg-[#111C30] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A8B6C9]">
          <span>
            Showing {paginatedGuards.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, filteredGuards.length)} of {filteredGuards.length} guards
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#2B3B52] hover:bg-[#1E2D43] text-[#F8FAFC] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-[#F8FAFC] px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#2B3B52] hover:bg-[#1E2D43] text-[#F8FAFC] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Guard Form Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-2xl overflow-hidden text-[#F8FAFC] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#F8FAFC] text-base">
                  {isAddModalOpen ? 'Register Security Guard' : `Edit Guard: ${selectedGuard?.id}`}
                </h3>
                <p className="text-xs text-[#A8B6C9]">
                  Enter personal credentials, mobile contact, and site roster details
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-[#A8B6C9] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit}
              className="p-6 overflow-y-auto space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Mobile Number (+91) *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="Security Guard" className="bg-[#111C30] text-[#F8FAFC]">Security Guard</option>
                    <option value="Senior Security Officer" className="bg-[#111C30] text-[#F8FAFC]">Senior Security Officer</option>
                    <option value="Armed Guard" className="bg-[#111C30] text-[#F8FAFC]">Armed Guard</option>
                    <option value="Head Guard / Supervisor" className="bg-[#111C30] text-[#F8FAFC]">Head Guard / Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Assigned Operational Site</label>
                  <select
                    value={formData.assignedLocation}
                    onChange={(e) => setFormData({ ...formData, assignedLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    {locations.length === 0 ? (
                      <option value="" className="bg-[#111C30] text-[#A8B6C9]">
                        No sites registered yet (Unassigned)
                      </option>
                    ) : (
                      <>
                        <option value="" className="bg-[#111C30] text-[#A8B6C9]">Select Site...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.name} className="bg-[#111C30] text-[#F8FAFC]">
                            {loc.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Assigned Shift</label>
                  <select
                    value={formData.currentShift}
                    onChange={(e) => setFormData({ ...formData, currentShift: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    {shifts.length === 0 ? (
                      <option value="" className="bg-[#111C30] text-[#A8B6C9]">
                        No shifts registered yet (Unassigned)
                      </option>
                    ) : (
                      <>
                        <option value="" className="bg-[#111C30] text-[#A8B6C9]">Select Shift...</option>
                        {shifts.map((sh) => (
                          <option key={sh.id} value={`${sh.name} (${sh.startTime} - ${sh.endTime})`} className="bg-[#111C30] text-[#F8FAFC]">
                            {sh.name} ({sh.startTime} - {sh.endTime})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Residential Address</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md"
                >
                  {isAddModalOpen ? 'Register Guard' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guard Profile Details Modal */}
      {isProfileModalOpen && selectedGuard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-2xl overflow-hidden text-[#F8FAFC] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedGuard.avatar}
                  alt={selectedGuard.name}
                  className="w-12 h-12 rounded-full object-cover border border-[#2B3B52]"
                />
                <div>
                  <h3 className="font-bold text-[#F8FAFC] text-base">{selectedGuard.name}</h3>
                  <span className="font-mono text-xs text-[#60A5FA]">{selectedGuard.id}</span>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b border-[#2B3B52] px-6 text-xs bg-[#111C30]/50">
              <button
                onClick={() => setProfileTab('personal')}
                className={`py-3 px-4 border-b-2 font-semibold transition-all ${
                  profileTab === 'personal'
                    ? 'border-[#3B82F6] text-[#60A5FA] bg-[#1E2D43]/60'
                    : 'border-transparent text-[#A8B6C9] hover:text-[#F8FAFC]'
                }`}
              >
                Personal & Contact Details
              </button>
              <button
                onClick={() => setProfileTab('shifts')}
                className={`py-3 px-4 border-b-2 font-semibold transition-all ${
                  profileTab === 'shifts'
                    ? 'border-[#3B82F6] text-[#60A5FA] bg-[#1E2D43]/60'
                    : 'border-transparent text-[#A8B6C9] hover:text-[#F8FAFC]'
                }`}
              >
                Shift & Attendance History
              </button>
              <button
                onClick={() => setProfileTab('calls')}
                className={`py-3 px-4 border-b-2 font-semibold transition-all ${
                  profileTab === 'calls'
                    ? 'border-[#3B82F6] text-[#60A5FA] bg-[#1E2D43]/60'
                    : 'border-transparent text-[#A8B6C9] hover:text-[#F8FAFC]'
                }`}
              >
                Phone Verification Logs
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {profileTab === 'personal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#1E2D43] p-4 rounded-xl border border-[#2B3B52] space-y-2.5">
                    <h4 className="font-bold text-[#60A5FA] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Contact Credentials
                    </h4>
                    <div className="space-y-1.5 text-[#F8FAFC]">
                      <div className="flex justify-between">
                        <span className="text-[#A8B6C9]">Mobile Phone:</span>
                        <span className="font-mono text-[#F8FAFC] font-semibold">{selectedGuard.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8B6C9]">Email:</span>
                        <span>{selectedGuard.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8B6C9]">Emergency Phone:</span>
                        <span className="font-mono text-[#F8FAFC] font-semibold">
                          {selectedGuard.emergencyContact || 'Not Specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1E2D43] p-4 rounded-xl border border-[#2B3B52] space-y-2.5">
                    <h4 className="font-bold text-[#60A5FA] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      Assignment & Post
                    </h4>
                    <div className="space-y-1.5 text-[#F8FAFC]">
                      <div className="flex justify-between">
                        <span className="text-[#A8B6C9]">Assigned Site:</span>
                        <span className="font-semibold text-[#F8FAFC]">{selectedGuard.assignedLocation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8B6C9]">Assigned Shift:</span>
                        <span className="font-semibold text-[#60A5FA]">{selectedGuard.currentShift}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8B6C9]">Employment:</span>
                        <span className="text-[#22C55E] font-bold">{selectedGuard.employmentStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 bg-[#1E2D43] p-4 rounded-xl border border-[#2B3B52]">
                    <h4 className="font-bold text-[#60A5FA] uppercase text-[10px] tracking-wider mb-2">
                      Residential Address
                    </h4>
                    <p className="text-[#F8FAFC] leading-relaxed">
                      {selectedGuard.address || 'Address records on biometric file in HR archives.'}
                    </p>
                  </div>
                </div>
              )}

              {profileTab === 'shifts' && (
                <div className="space-y-3">
                  <div className="bg-[#1E2D43] p-4 rounded-xl border border-[#2B3B52] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#F8FAFC]">Current Active Shift</p>
                      <p className="text-[#A8B6C9] mt-0.5">{selectedGuard.currentShift}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#22C55E]/15 text-[#22C55E] font-bold border border-[#22C55E]/30">
                      ON DUTY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#1E2D43] p-3 rounded-xl border border-[#2B3B52] text-center">
                      <span className="text-[10px] text-[#A8B6C9] uppercase">Total Shifts</span>
                      <p className="text-lg font-bold text-[#F8FAFC] mt-1">
                        {selectedGuard.totalShiftsCompleted || 48}
                      </p>
                    </div>
                    <div className="bg-[#1E2D43] p-3 rounded-xl border border-[#2B3B52] text-center">
                      <span className="text-[10px] text-[#A8B6C9] uppercase">Missed Calls</span>
                      <p className="text-lg font-bold text-[#FBBF24] mt-1">
                        {selectedGuard.missedCallsCount || 0}
                      </p>
                    </div>
                    <div className="bg-[#1E2D43] p-3 rounded-xl border border-[#2B3B52] text-center">
                      <span className="text-[10px] text-[#A8B6C9] uppercase">SOS Alerts</span>
                      <p className="text-lg font-bold text-[#F87171] mt-1">
                        {selectedGuard.sosCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {profileTab === 'calls' && (
                <div className="space-y-2">
                  <div className="p-3 bg-[#1E2D43] rounded-xl border border-[#2B3B52] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#F8FAFC]">Automated Check-in Call #4421</p>
                        <p className="text-[11px] text-[#A8B6C9]">12 Nov 2026, 09:30 AM • Duration: 18s</p>
                      </div>
                    </div>
                    <span className="font-mono text-[#22C55E] font-bold">DTMF [1] Verified</span>
                  </div>

                  <div className="p-3 bg-[#1E2D43] rounded-xl border border-[#2B3B52] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#F8FAFC]">Automated Check-in Call #4418</p>
                        <p className="text-[11px] text-[#A8B6C9]">12 Nov 2026, 07:30 AM • Duration: 15s</p>
                      </div>
                    </div>
                    <span className="font-mono text-[#22C55E] font-bold">DTMF [1] Verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Footer Actions */}
            <div className="p-4 bg-[#111C30] border-t border-[#2B3B52] flex items-center justify-between">
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  openCallModal(selectedGuard);
                }}
                className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Trigger Verification Call</span>
              </button>

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Guards;
