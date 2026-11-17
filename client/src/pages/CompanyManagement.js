import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Phone,
  Mail,
  RefreshCw,
  Copy,
  Check,
  Edit3,
  Calendar,
  Clock,
  Layers,
  FileText,
  Lock,
} from 'lucide-react';
import { platformAPI } from '../services/api';

export default function CompanyManagement() {
  // State
  const [companies, setCompanies] = useState([]);
  const [overview, setOverview] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    totalGuards: 0,
    totalSites: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'active' | 'inactive' | 'suspended'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  const [viewCompany, setViewCompany] = useState(null);

  const [editCompany, setEditCompany] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const [resetModalCompany, setResetModalCompany] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Add Company Form State
  const initialAddForm = {
    companyName: '',
    registrationNumber: '',
    contactPerson: '',
    officialEmail: '',
    contactNumber: '',
    officeAddress: '',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '',
    status: 'active',
    initialPassword: '',
  };
  const [addForm, setAddForm] = useState(initialAddForm);

  // Edit Company Form State
  const [editForm, setEditForm] = useState({
    companyName: '',
    registrationNumber: '',
    contactPerson: '',
    officialEmail: '',
    contactNumber: '',
    officeAddress: '',
    city: '',
    state: '',
    pinCode: '',
    status: 'active',
  });

  // Fetch companies and overview
  const fetchCompaniesData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [overviewRes, companiesRes] = await Promise.all([
        platformAPI.getOverview(),
        platformAPI.getCompanies(),
      ]);

      if (overviewRes.data && overviewRes.data.success) {
        setOverview(overviewRes.data.data);
      }
      if (companiesRes.data && companiesRes.data.success) {
        setCompanies(companiesRes.data.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load company records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompaniesData();
  }, []);

  // Filtered companies based on search and status
  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const compStatus = (comp.status || (comp.isActive ? 'active' : 'suspended')).toLowerCase();
        if (compStatus !== statusFilter.toLowerCase()) return false;
      }

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const name = (comp.name || '').toLowerCase();
      const code = (comp.code || '').toLowerCase();
      const regNo = (comp.registrationNumber || '').toLowerCase();
      const contact = (comp.contactPerson || comp.owner?.fullName || '').toLowerCase();
      const email = (comp.email || '').toLowerCase();
      const city = (comp.city || '').toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term) ||
        regNo.includes(term) ||
        contact.includes(term) ||
        email.includes(term) ||
        city.includes(term)
      );
    });
  }, [companies, searchTerm, statusFilter]);

  // Handle Add Company
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!addForm.companyName.trim()) {
      setErrorMsg('Company Name is required.');
      return;
    }
    if (!addForm.contactPerson.trim()) {
      setErrorMsg('Contact Person is required.');
      return;
    }
    if (!addForm.officialEmail.trim()) {
      setErrorMsg('Official Email is required.');
      return;
    }
    if (!addForm.contactNumber.trim()) {
      setErrorMsg('Contact Number is required.');
      return;
    }
    if (!addForm.officeAddress.trim()) {
      setErrorMsg('Office Address is required.');
      return;
    }
    if (!addForm.city.trim() || !addForm.state.trim()) {
      setErrorMsg('City and State are required.');
      return;
    }
    if (!addForm.pinCode.trim()) {
      setErrorMsg('PIN Code is required.');
      return;
    }
    if (!addForm.initialPassword || addForm.initialPassword.length < 8) {
      setErrorMsg('Initial Password must be at least 8 characters long.');
      return;
    }

    setAddLoading(true);
    try {
      const payload = {
        companyName: addForm.companyName.trim(),
        registrationNumber: addForm.registrationNumber.trim(),
        contactPerson: addForm.contactPerson.trim(),
        officialEmail: addForm.officialEmail.trim(),
        contactNumber: addForm.contactNumber.trim(),
        officeAddress: addForm.officeAddress.trim(),
        city: addForm.city.trim(),
        state: addForm.state.trim(),
        pinCode: addForm.pinCode.trim(),
        status: addForm.status,
        initialPassword: addForm.initialPassword,
      };

      const res = await platformAPI.createCompany(payload);
      if (res.data && res.data.success) {
        setSuccessMsg(`Company "${addForm.companyName}" registered successfully! Initial owner account provisioned.`);
        setIsAddOpen(false);
        setAddForm(initialAddForm);
        fetchCompaniesData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to register company.');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (comp) => {
    setEditCompany(comp);
    setEditForm({
      companyName: comp.name || '',
      registrationNumber: comp.registrationNumber || '',
      contactPerson: comp.contactPerson || comp.owner?.fullName || '',
      officialEmail: comp.email || '',
      contactNumber: comp.phone || '',
      officeAddress: comp.address || '',
      city: comp.city || '',
      state: comp.state || '',
      pinCode: comp.pincode || '',
      status: comp.status || (comp.isActive ? 'active' : 'suspended'),
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editCompany) return;
    setErrorMsg('');
    setSuccessMsg('');
    setEditLoading(true);

    try {
      const payload = {
        name: editForm.companyName.trim(),
        registrationNumber: editForm.registrationNumber.trim(),
        contactPerson: editForm.contactPerson.trim(),
        officialEmail: editForm.officialEmail.trim(),
        contactNumber: editForm.contactNumber.trim(),
        officeAddress: editForm.officeAddress.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        pinCode: editForm.pinCode.trim(),
        status: editForm.status,
      };

      const res = await platformAPI.updateCompany(editCompany.id, payload);
      if (res.data && res.data.success) {
        setSuccessMsg(`Company "${editForm.companyName}" details updated successfully.`);
        setEditCompany(null);
        fetchCompaniesData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update company details.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Quick Status Toggle (Active <-> Suspended)
  const handleToggleStatus = async (comp) => {
    const currentStatus = comp.status || (comp.isActive ? 'active' : 'suspended');
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmPrompt =
      newStatus === 'suspended'
        ? `Are you sure you want to suspend "${comp.name}"? Staff and guards will be immediately blocked from logging in.`
        : `Activate "${comp.name}" and restore operational access?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await platformAPI.updateStatus(comp.id, newStatus);
      if (res.data && res.data.success) {
        setSuccessMsg(`Company "${comp.name}" is now ${newStatus}.`);
        fetchCompaniesData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update company status.');
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (comp) => {
    setResetModalCompany(comp);
    setResetPassword('');
    setResetConfirmPassword('');
    setShowResetPassword(false);
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModalCompany) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (resetPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await platformAPI.resetCompanyPassword(resetModalCompany.id, {
        password: resetPassword,
      });
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || `Password for "${resetModalCompany.name}" owner has been reset.`);
        setResetModalCompany(null);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // Copy code helper
  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#2B3B52]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Company Management</h1>
              <p className="text-xs text-[#A8B6C9] mt-0.5">
                Register and administer multi-tenant security agencies on the AutoGuard platform.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCompaniesData}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium text-[#A8B6C9] hover:text-[#F8FAFC] bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3B82F6]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0F172A] border border-[#2B3B52]">
          <div className="flex items-center justify-between text-[#A8B6C9] mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Companies</span>
            <Building2 className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#F8FAFC]">
            {overview.totalCompanies || companies.length}
          </div>
          <p className="text-[10px] text-[#A8B6C9] mt-1">Registered agencies</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[#2B3B52]">
          <div className="flex items-center justify-between text-[#A8B6C9] mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {overview.activeCompanies || companies.filter((c) => c.status === 'active' || c.isActive).length}
          </div>
          <p className="text-[10px] text-[#A8B6C9] mt-1">Operational accounts</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[#2B3B52]">
          <div className="flex items-center justify-between text-[#A8B6C9] mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Suspended</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {overview.suspendedCompanies || companies.filter((c) => c.status === 'suspended' || c.status === 'inactive' || !c.isActive).length}
          </div>
          <p className="text-[10px] text-[#A8B6C9] mt-1">Inactive or blocked</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[#2B3B52]">
          <div className="flex items-center justify-between text-[#A8B6C9] mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Platform Guards</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#F8FAFC]">{overview.totalGuards}</div>
          <p className="text-[10px] text-[#A8B6C9] mt-1">Across all companies</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[#2B3B52]">
          <div className="flex items-center justify-between text-[#A8B6C9] mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Protected Sites</span>
            <MapPin className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-[#F8FAFC]">{overview.totalSites}</div>
          <p className="text-[10px] text-[#A8B6C9] mt-1">Active guard posts</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#2B3B52] flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company, ID, email, contact..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#1E2D43] text-[#F8FAFC] placeholder-[#A8B6C9] rounded-lg border border-[#2B3B52] focus:outline-none focus:border-[#3B82F6] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8B6C9] hover:text-[#F8FAFC]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-[#A8B6C9] font-medium mr-1.5 shrink-0">Status:</span>
          {['ALL', 'active', 'inactive', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#1E2D43] text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#2B3B52]'
              }`}
            >
              {st === 'ALL' ? 'All Companies' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Companies Table / List */}
      <div className="rounded-xl bg-[#0F172A] border border-[#2B3B52] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#2B3B52] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Registered Security Companies</h2>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#1E2D43] text-[#A8B6C9] border border-[#2B3B52]">
              {filteredCompanies.length} of {companies.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#A8B6C9]">Loading security company records...</span>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-16 text-center text-[#A8B6C9]">
            <Building2 className="w-10 h-10 mx-auto text-[#2B3B52] mb-3" />
            <p className="text-sm font-medium text-[#F8FAFC]">No companies found</p>
            <p className="text-xs mt-1">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Click "Add Company" to register your first security agency.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#A8B6C9]">
              <thead className="bg-[#1E2D43]/60 text-[11px] uppercase tracking-wider text-[#A8B6C9] border-b border-[#2B3B52]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Company ID & Code</th>
                  <th className="py-3 px-4 font-semibold">Company Name</th>
                  <th className="py-3 px-4 font-semibold">Contact Person</th>
                  <th className="py-3 px-4 font-semibold">Official Contact</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-center">Guards / Sites</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B52]/50">
                {filteredCompanies.map((comp) => {
                  const compStatus = comp.status || (comp.isActive ? 'active' : 'suspended');
                  const isActive = compStatus === 'active';
                  const isSuspended = compStatus === 'suspended';

                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-[#1E2D43]/40 transition-colors group"
                    >
                      {/* Code / Unique ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#1E2D43] text-[#3B82F6] font-mono font-semibold text-[11px] border border-[#2B3B52]">
                            {comp.code || 'AG-CMP'}
                          </span>
                          <button
                            onClick={() => handleCopyCode(comp.code)}
                            title="Copy Company ID"
                            className="text-[#A8B6C9] hover:text-[#F8FAFC] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedId === comp.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Company Name & Registration */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm text-[#F8FAFC]">{comp.name}</div>
                        {comp.registrationNumber ? (
                          <div className="text-[11px] text-[#A8B6C9] mt-0.5">
                            Reg: <span className="font-mono text-[#F8FAFC]/80">{comp.registrationNumber}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#A8B6C9]/60 mt-0.5">Reg: Not specified</div>
                        )}
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#F8FAFC]">
                          {comp.contactPerson || comp.owner?.fullName || 'Company Admin'}
                        </div>
                        <div className="text-[10px] text-[#A8B6C9] mt-0.5">Primary Contact</div>
                      </td>

                      {/* Official Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#F8FAFC]">
                          <Mail className="w-3 h-3 text-[#A8B6C9] shrink-0" />
                          <span className="truncate max-w-[180px]">{comp.email}</span>
                        </div>
                        {comp.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#A8B6C9] mt-1">
                            <Phone className="w-3 h-3 text-[#A8B6C9] shrink-0" />
                            <span>{comp.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[#F8FAFC] font-medium">{comp.city || '—'}</div>
                        <div className="text-[10px] text-[#A8B6C9]">
                          {comp.state || ''} {comp.pincode ? `(${comp.pincode})` : ''}
                        </div>
                      </td>

                      {/* Guards / Sites */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1E2D43] border border-[#2B3B52]">
                          <span className="text-[#3B82F6] font-semibold">{comp.guardsCount || 0}</span>
                          <span className="text-[#A8B6C9] text-[10px]">Guards</span>
                          <span className="text-[#2B3B52]">|</span>
                          <span className="text-purple-400 font-semibold">{comp.sitesCount || 0}</span>
                          <span className="text-[#A8B6C9] text-[10px]">Sites</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : isSuspended ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewCompany(comp)}
                            title="View Full Company Details"
                            className="p-1.5 rounded-lg text-[#A8B6C9] hover:text-white hover:bg-[#1E2D43] border border-transparent hover:border-[#2B3B52] transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(comp)}
                            title="Edit Company Details"
                            className="p-1.5 rounded-lg text-[#A8B6C9] hover:text-[#3B82F6] hover:bg-[#1E2D43] border border-transparent hover:border-[#2B3B52] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Reset Owner Password */}
                          <button
                            onClick={() => openResetPasswordModal(comp)}
                            title="Set / Reset Owner Password"
                            className="p-1.5 rounded-lg text-[#A8B6C9] hover:text-amber-400 hover:bg-[#1E2D43] border border-transparent hover:border-[#2B3B52] transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            onClick={() => handleToggleStatus(comp)}
                            title={isActive ? 'Deactivate / Suspend Company' : 'Activate Company'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isActive
                                ? 'text-emerald-400 hover:text-red-400 hover:bg-red-500/10 border-emerald-500/20 hover:border-red-500/30'
                                : 'text-red-400 hover:text-emerald-400 hover:bg-emerald-500/10 border-red-500/20 hover:border-emerald-500/30'
                            }`}
                          >
                            {isActive ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD COMPANY */}
      {/* ========================================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-[#2B3B52] rounded-2xl shadow-2xl p-6 sm:p-7 text-[#F8FAFC] my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2B3B52] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Register New Security Company</h3>
                  <p className="text-xs text-[#A8B6C9]">
                    Creates company profile & initial Owner/Admin credentials in MongoDB.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-[#A8B6C9] hover:text-white hover:bg-[#1E2D43] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Row 1: Company Name & Registration Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.companyName}
                    onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })}
                    placeholder="e.g. Apex Force Security Services"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Company Registration Number <span className="text-[#A8B6C9]/60 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.registrationNumber}
                    onChange={(e) => setAddForm({ ...addForm, registrationNumber: e.target.value })}
                    placeholder="e.g. CIN / GSTIN / SEC-REG-987"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Row 2: Contact Person & Official Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Contact Person <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.contactPerson}
                    onChange={(e) => setAddForm({ ...addForm, contactPerson: e.target.value })}
                    placeholder="e.g. Sanjay Deshmukh (Managing Director)"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <p className="text-[10px] text-[#A8B6C9]/70 mt-1">
                    Name for the company's initial Owner/Administrator account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Official Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={addForm.officialEmail}
                    onChange={(e) => setAddForm({ ...addForm, officialEmail: e.target.value })}
                    placeholder="contact@apexforce.in"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <p className="text-[10px] text-[#A8B6C9]/70 mt-1">
                    Used for official notices and Owner login.
                  </p>
                </div>
              </div>

              {/* Row 3: Contact Number & Company Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Contact Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={addForm.contactNumber}
                    onChange={(e) => setAddForm({ ...addForm, contactNumber: e.target.value })}
                    placeholder="+91 98220 54321"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Company Status <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="active">Active (Operational immediately)</option>
                    <option value="inactive">Inactive (Pending onboarding)</option>
                    <option value="suspended">Suspended (Access blocked)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Office Address */}
              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Office Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.officeAddress}
                  onChange={(e) => setAddForm({ ...addForm, officeAddress: e.target.value })}
                  placeholder="e.g. Plot 12, Sector 18, Commercial Belt"
                  className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Row 5: City, State, PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    placeholder="e.g. Noida"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.state}
                    onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    PIN Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.pinCode}
                    onChange={(e) => setAddForm({ ...addForm, pinCode: e.target.value })}
                    placeholder="e.g. 201301"
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Row 6: Initial Company Owner Password */}
              <div className="pt-2 border-t border-[#2B3B52]">
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Initial Owner / Admin Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={addForm.initialPassword}
                    onChange={(e) => setAddForm({ ...addForm, initialPassword: e.target.value })}
                    placeholder="Minimum 8 characters (letters, numbers, symbols)"
                    className="w-full pl-3 pr-10 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B6C9] hover:text-[#F8FAFC]"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#A8B6C9] mt-1 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#3B82F6]" />
                  Securely hashed with bcrypt before storing in MongoDB. Never stored in plaintext.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#A8B6C9] hover:text-[#F8FAFC] bg-[#1E2D43] hover:bg-[#2B3B52] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {addLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to MongoDB...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Register Company</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW COMPANY DETAILS */}
      {/* ========================================================================= */}
      {viewCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-[#0F172A] border border-[#2B3B52] rounded-2xl shadow-2xl p-6 text-[#F8FAFC] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2B3B52] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{viewCompany.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-[#3B82F6] px-1.5 py-0.2 rounded bg-[#1E2D43] border border-[#2B3B52]">
                      {viewCompany.code}
                    </span>
                    <span className="text-[10px] text-[#A8B6C9]">
                      Status: <strong className="capitalize text-white">{viewCompany.status}</strong>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewCompany(null)}
                className="p-1 rounded-lg text-[#A8B6C9] hover:text-white hover:bg-[#1E2D43]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Registration & Basic info */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52]">
                <div>
                  <span className="text-[#A8B6C9] block text-[10px] uppercase">Registration Number</span>
                  <span className="font-mono text-white text-xs mt-0.5 block">
                    {viewCompany.registrationNumber || 'Not Registered / Specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[#A8B6C9] block text-[10px] uppercase">Contact Person</span>
                  <span className="text-white font-medium text-xs mt-0.5 block">
                    {viewCompany.contactPerson || viewCompany.owner?.fullName || 'Company Admin'}
                  </span>
                </div>
                <div>
                  <span className="text-[#A8B6C9] block text-[10px] uppercase">Official Email</span>
                  <span className="text-white text-xs mt-0.5 block truncate">{viewCompany.email}</span>
                </div>
                <div>
                  <span className="text-[#A8B6C9] block text-[10px] uppercase">Contact Number</span>
                  <span className="text-white text-xs mt-0.5 block">{viewCompany.phone || '—'}</span>
                </div>
              </div>

              {/* Office Address */}
              <div className="p-3.5 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52]">
                <span className="text-[#A8B6C9] block text-[10px] uppercase mb-1">Registered Office Address</span>
                <p className="text-white">
                  {viewCompany.address || '—'}
                </p>
                <p className="text-[#A8B6C9] text-[11px] mt-0.5">
                  {viewCompany.city}, {viewCompany.state} — {viewCompany.pincode}
                </p>
              </div>

              {/* Operational Stats */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52] text-center">
                  <span className="text-[10px] text-[#A8B6C9] uppercase block truncate">Guards</span>
                  <div className="text-lg font-bold text-[#3B82F6] mt-0.5">{viewCompany.guardsCount || 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52] text-center">
                  <span className="text-[10px] text-[#A8B6C9] uppercase block truncate">Sites</span>
                  <div className="text-lg font-bold text-purple-400 mt-0.5">{viewCompany.sitesCount || 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52] text-center">
                  <span className="text-[10px] text-[#A8B6C9] uppercase block truncate">Shifts</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{viewCompany.shiftsCount || 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52] text-center">
                  <span className="text-[10px] text-[#A8B6C9] uppercase block truncate">Supervisors</span>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{viewCompany.supervisorsCount || 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52] text-center col-span-3 sm:col-span-1">
                  <span className="text-[10px] text-[#A8B6C9] uppercase block truncate">Calls</span>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">{viewCompany.callsCount || 0}</div>
                </div>
              </div>

              {/* Owner Account Details */}
              {viewCompany.owner && (
                <div className="p-3.5 rounded-xl bg-[#1E2D43]/50 border border-[#2B3B52]">
                  <span className="text-[#A8B6C9] block text-[10px] uppercase mb-2">
                    Initial Owner / Admin Account
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#A8B6C9]">Name:</span>{' '}
                      <span className="text-white font-medium">{viewCompany.owner.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[#A8B6C9]">Email:</span>{' '}
                      <span className="text-white">{viewCompany.owner.email}</span>
                    </div>
                    <div>
                      <span className="text-[#A8B6C9]">Account Status:</span>{' '}
                      <span className={viewCompany.owner.isActive ? 'text-emerald-400' : 'text-red-400'}>
                        {viewCompany.owner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A8B6C9]">Last Login:</span>{' '}
                      <span className="text-[#A8B6C9]">
                        {viewCompany.owner.lastLogin
                          ? new Date(viewCompany.owner.lastLogin).toLocaleDateString('en-IN')
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 mt-5 border-t border-[#2B3B52]">
              <button
                type="button"
                onClick={() => {
                  const comp = viewCompany;
                  setViewCompany(null);
                  openEditModal(comp);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Company</span>
              </button>
              <button
                type="button"
                onClick={() => setViewCompany(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT COMPANY DETAILS */}
      {/* ========================================================================= */}
      {editCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-[#2B3B52] rounded-2xl shadow-2xl p-6 sm:p-7 text-[#F8FAFC] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#2B3B52] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Edit Company Details</h3>
                  <p className="text-xs text-[#A8B6C9]">
                    Updating <strong className="text-white">{editCompany.name}</strong> ({editCompany.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditCompany(null)}
                className="p-1 rounded-lg text-[#A8B6C9] hover:text-white hover:bg-[#1E2D43]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={editForm.registrationNumber}
                    onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Contact Person <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Official Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.officialEmail}
                    onChange={(e) => setEditForm({ ...editForm, officialEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Contact Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editForm.contactNumber}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Company Status <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Office Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.officeAddress}
                  onChange={(e) => setEditForm({ ...editForm, officeAddress: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    PIN Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.pinCode}
                    onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={() => setEditCompany(null)}
                  className="px-4 py-2 text-xs font-medium text-[#A8B6C9] hover:text-[#F8FAFC] bg-[#1E2D43] hover:bg-[#2B3B52] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SET / RESET OWNER PASSWORD */}
      {/* ========================================================================= */}
      {resetModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#0F172A] border border-[#2B3B52] rounded-2xl shadow-2xl p-6 text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2B3B52] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Owner Password</h3>
                  <p className="text-[11px] text-[#A8B6C9] mt-0.5">
                    For agency: <strong className="text-white">{resetModalCompany.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalCompany(null)}
                className="p-1 rounded-lg text-[#A8B6C9] hover:text-white hover:bg-[#1E2D43]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#1E2D43]/60 border border-[#2B3B52] text-xs">
                <span className="text-[#A8B6C9] block text-[10px] uppercase">Associated Owner Account:</span>
                <span className="text-white font-medium block mt-0.5">
                  {resetModalCompany.owner?.email || resetModalCompany.email}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new secure password (min 8 chars)"
                    className="w-full pl-3 pr-10 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B6C9] hover:text-[#F8FAFC]"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Confirm New Password <span className="text-red-400">*</span>
                </label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  className="w-full px-3 py-2 text-xs bg-[#1E2D43] rounded-lg border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <p className="text-[10px] text-[#A8B6C9] flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#3B82F6]" />
                Password is saved securely hashed. Never stored or shared in plaintext.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={() => setResetModalCompany(null)}
                  className="px-4 py-2 text-xs font-medium text-[#A8B6C9] hover:text-[#F8FAFC] bg-[#1E2D43] hover:bg-[#2B3B52] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {resetLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
