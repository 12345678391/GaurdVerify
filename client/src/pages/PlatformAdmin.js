import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  ShieldCheck,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Phone,
  Mail,
  RefreshCw,
  Copy,
  Check,
  Shield,
  UserPlus,
  Lock,
} from 'lucide-react';
import { platformAPI } from '../services/api';

export default function PlatformAdmin() {
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' | 'admins'

  // Overview and Companies State
  const [overview, setOverview] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    totalGuards: 0,
    totalSites: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Register Company Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [regForm, setRegForm] = useState({
    companyName: '',
    companyCode: '',
    companyEmail: '',
    companyPhone: '',
    city: '',
    state: '',
    address: '',
    pincode: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
  });

  // Manage Owner Modal State
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Administrator Management State
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('ALL'); // 'ALL' | 'platform_admin' | 'company_admin' | 'super_admin'

  // Create Admin Modal State
  const [createAdminModalOpen, setCreateAdminModalOpen] = useState(false);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'platform_admin', // 'platform_admin' | 'company_admin'
    companyId: '',
  });

  // One-time Temporary Password Modal State
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false);
  const [generatedTempPassword, setGeneratedTempPassword] = useState('');
  const [tempPasswordAdminInfo, setTempPasswordAdminInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
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
        setCompanies(companiesRes.data.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await platformAPI.getAdmins();
      if (res.data && res.data.success) {
        setAdmins(res.data.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load administrator list.');
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAdmins();
  }, []);

  const handleRegisterCompany = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setRegisterLoading(true);

    try {
      const res = await platformAPI.createCompany(regForm);
      if (res.data && res.data.success) {
        setSuccessMsg(`Company "${regForm.companyName}" registered successfully!`);
        setIsRegisterOpen(false);
        setRegForm({
          companyName: '',
          companyCode: '',
          companyEmail: '',
          companyPhone: '',
          city: '',
          state: '',
          address: '',
          pincode: '',
          ownerName: '',
          ownerEmail: '',
          ownerPhone: '',
          ownerPassword: '',
        });
        fetchData();
        fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to register company.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleStatusToggle = async (company) => {
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    const confirmMsg =
      newStatus === 'suspended'
        ? `Are you sure you want to suspend "${company.name}"? Their staff and guards will be blocked from accessing the system.`
        : `Activate "${company.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await platformAPI.updateStatus(company.id, newStatus);
      if (res.data && res.data.success) {
        setSuccessMsg(`"${company.name}" is now ${newStatus}.`);
        fetchData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update company status.');
    }
  };

  const openOwnerModal = (company) => {
    setSelectedCompany(company);
    setOwnerForm({
      fullName: company.owner?.fullName || '',
      email: company.owner?.email || '',
      phone: company.owner?.phone || '',
      password: '',
    });
    setOwnerModalOpen(true);
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setOwnerLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        fullName: ownerForm.fullName.trim(),
        email: ownerForm.email.trim(),
        phone: ownerForm.phone.trim(),
      };
      if (ownerForm.password.trim()) {
        payload.password = ownerForm.password.trim();
      }

      const res = await platformAPI.manageOwner(selectedCompany.id, payload);
      if (res.data && res.data.success) {
        setSuccessMsg(`Owner account for "${selectedCompany.name}" updated successfully.`);
        setOwnerModalOpen(false);
        fetchData();
        fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update owner credentials.');
    } finally {
      setOwnerLoading(false);
    }
  };

  // Create Administrator Handler
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCreateAdminLoading(true);

    try {
      const payload = {
        fullName: adminForm.fullName.trim(),
        email: adminForm.email.trim(),
        phone: adminForm.phone.trim(),
        role: adminForm.role,
      };

      if (adminForm.role === 'company_admin') {
        if (!adminForm.companyId) {
          setErrorMsg('Please select an assigned company for Company Admin.');
          setCreateAdminLoading(false);
          return;
        }
        payload.companyId = adminForm.companyId;
      }

      const res = await platformAPI.createAdmin(payload);
      if (res.data && res.data.success) {
        setGeneratedTempPassword(res.data.temporaryPassword);
        setTempPasswordAdminInfo({
          fullName: res.data.admin.fullName,
          email: res.data.admin.email,
          role: res.data.admin.role,
          company: res.data.admin.company,
          isReset: false,
        });
        setCreateAdminModalOpen(false);
        setTempPasswordModalOpen(true);
        setAdminForm({
          fullName: '',
          email: '',
          phone: '',
          role: 'platform_admin',
          companyId: '',
        });
        fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create administrator account.');
    } finally {
      setCreateAdminLoading(false);
    }
  };

  // Toggle Admin Status
  const handleToggleAdminStatus = async (adminItem) => {
    const action = adminItem.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} administrator "${adminItem.fullName}"?`)) {
      return;
    }

    try {
      const res = await platformAPI.toggleAdminStatus(adminItem.id);
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message);
        fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to change administrator status.');
    }
  };

  // Reset Admin Password
  const handleResetAdminPassword = async (adminItem) => {
    if (
      !window.confirm(
        `Generate a new temporary password for "${adminItem.fullName}" (${adminItem.email})? They will be forced to change it on their next login.`
      )
    ) {
      return;
    }

    try {
      const res = await platformAPI.resetAdminPassword(adminItem.id);
      if (res.data && res.data.success) {
        setGeneratedTempPassword(res.data.temporaryPassword);
        setTempPasswordAdminInfo({
          fullName: adminItem.fullName,
          email: adminItem.email,
          role: adminItem.role,
          company: adminItem.company,
          isReset: true,
        });
        setTempPasswordModalOpen(true);
        fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to reset administrator password.');
    }
  };

  const copyPasswordToClipboard = () => {
    if (!generatedTempPassword) return;
    navigator.clipboard.writeText(generatedTempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filters
  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.owner?.fullName?.toLowerCase().includes(q) ||
      c.owner?.email?.toLowerCase().includes(q)
    );
  });

  const filteredAdmins = admins.filter((a) => {
    const q = adminSearch.toLowerCase();
    const matchesSearch =
      a.fullName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.aliasEmail?.toLowerCase().includes(q) ||
      a.company?.name?.toLowerCase().includes(q);

    if (adminRoleFilter === 'ALL') return matchesSearch;
    if (adminRoleFilter === 'platform_admin') return matchesSearch && (a.role === 'platform_admin' || a.role === 'super_admin');
    if (adminRoleFilter === 'company_admin') return matchesSearch && (a.role === 'company_admin' || a.role === 'company_owner' || a.role === 'admin');
    return matchesSearch && a.role === adminRoleFilter;
  });

  const platformAdminsCount = admins.filter((a) => a.role === 'super_admin' || a.role === 'platform_admin').length;
  const companyAdminsCount = admins.filter((a) => a.role === 'company_admin' || a.role === 'company_owner' || a.role === 'admin').length;
  const activeAdminsCount = admins.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#2B3B52]">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span>Platform Administration Hub</span>
          </h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Head Admin Control Panel: Manage security agencies, platform administrators, and company staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchData();
              fetchAdmins();
            }}
            disabled={loading || adminsLoading}
            className="p-2 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-white border border-[#2B3B52] transition-colors cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading || adminsLoading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'companies' ? (
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="py-2 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Company</span>
            </button>
          ) : (
            <button
              onClick={() => setCreateAdminModalOpen(true)}
              className="py-2 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Administrator</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#2B3B52]">
        <button
          onClick={() => setActiveTab('companies')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'companies'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-[#A8B6C9] hover:text-[#F8FAFC]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Security Agencies ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'admins'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-[#A8B6C9] hover:text-[#F8FAFC]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Administrator Management ({admins.length})</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: COMPANIES */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          {/* Platform Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Total Registered Agencies</span>
              <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{overview.totalCompanies}</p>
              <span className="text-[11px] text-blue-400 mt-1 block">Active SaaS Tenants</span>
            </div>

            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Active Companies</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{overview.activeCompanies}</p>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">Operational Status</span>
            </div>

            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Suspended Companies</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{overview.suspendedCompanies}</p>
              <span className="text-[11px] text-amber-400/80 mt-1 block">Access Locked</span>
            </div>

            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Total Guards Across Platform</span>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{overview.totalGuards}</p>
              <span className="text-[11px] text-cyan-400/80 mt-1 block">Monitored Personnel</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A8B6C9]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company name, code, city or owner..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#172337] text-[#F8FAFC] placeholder-[#A8B6C9]/60 focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-[#A8B6C9]">
              Showing {filteredCompanies.length} of {companies.length} companies
            </span>
          </div>

          {/* Companies List Table */}
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#A8B6C9]">
                <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#F8FAFC] uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Company Name & Code</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Company Owner</th>
                    <th className="py-3 px-4">Guards / Sites</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3B52]">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                        <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <div>Loading registered companies...</div>
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                        No companies found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp) => (
                      <tr key={comp.id} className="hover:bg-[#1E2D43]/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#F8FAFC]">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                              {comp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-[#F8FAFC]">{comp.name}</p>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0F172A] border border-[#2B3B52] text-blue-400">
                                {comp.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[#F8FAFC]">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>
                              {comp.city}, {comp.state}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#A8B6C9] block mt-0.5">{comp.email}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {comp.owner ? (
                            <div>
                              <p className="font-medium text-[#F8FAFC]">{comp.owner.fullName}</p>
                              <span className="text-[11px] text-[#A8B6C9]">{comp.owner.email}</span>
                              {comp.owner.phone && (
                                <span className="text-[11px] text-[#A8B6C9] block">{comp.owner.phone}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-400 text-xs italic">No owner assigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded bg-[#0F172A] text-cyan-400 border border-[#2B3B52]">
                              {comp.guardsCount} Guards
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#0F172A] text-purple-400 border border-[#2B3B52]">
                              {comp.sitesCount} Sites
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {comp.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                              <XCircle className="w-3 h-3" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openOwnerModal(comp)}
                              className="py-1 px-2 rounded-md bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] border border-[#2B3B52] transition-colors cursor-pointer flex items-center gap-1"
                              title="Manage owner account"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                              <span>Owner</span>
                            </button>

                            <button
                              onClick={() => handleStatusToggle(comp)}
                              className={`py-1 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                comp.status === 'active'
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {comp.status === 'active' ? 'Suspend' : 'Activate'}
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
        </div>
      )}

      {/* TAB 2: ADMINISTRATOR MANAGEMENT */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          {/* Admin Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Total Administrators</span>
              <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{admins.length}</p>
              <span className="text-[11px] text-blue-400 mt-1 block">Platform & Company Staff</span>
            </div>

            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Platform Admins</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{platformAdminsCount}</p>
              <span className="text-[11px] text-indigo-400/80 mt-1 block">Global Platform Level</span>
            </div>

            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Company Admins & Owners</span>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{companyAdminsCount}</p>
              <span className="text-[11px] text-cyan-400/80 mt-1 block">Agency-Scoped Level</span>
            </div>

            <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-4">
              <span className="text-xs text-[#A8B6C9] font-medium">Active Accounts</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{activeAdminsCount}</p>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">Operational Logins</span>
            </div>
          </div>

          {/* Search & Role Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A8B6C9]" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search administrators by name, email or company..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#172337] text-[#F8FAFC] placeholder-[#A8B6C9]/60 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={adminRoleFilter}
                onChange={(e) => setAdminRoleFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-lg border border-[#2B3B52] bg-[#172337] text-[#F8FAFC] focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Roles ({admins.length})</option>
                <option value="platform_admin">Platform Admins ({platformAdminsCount})</option>
                <option value="company_admin">Company Admins & Owners ({companyAdminsCount})</option>
              </select>

              <button
                onClick={() => setCreateAdminModalOpen(true)}
                className="py-2 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Administrator</span>
              </button>
            </div>
          </div>

          {/* Administrator Table */}
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#A8B6C9]">
                <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#F8FAFC] uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Company</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3B52]">
                  {adminsLoading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                        <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <div>Loading administrator list...</div>
                      </td>
                    </tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                        No administrators found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((adm) => {
                      const isHeadAdmin =
                        adm.email === 'headadmin@autoguard.com' ||
                        adm.aliasEmail === 'vikrant@autoguardsecurity.com';
                      const isPlatformLevel = adm.role === 'super_admin' || adm.role === 'platform_admin';

                      return (
                        <tr key={adm.id} className="hover:bg-[#1E2D43]/50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-[#F8FAFC]">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  adm.role === 'super_admin'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : adm.role === 'platform_admin'
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {adm.fullName?.charAt(0) || 'A'}
                              </div>
                              <div>
                                <p className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                                  <span>{adm.fullName}</span>
                                  {isHeadAdmin && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                      Main
                                    </span>
                                  )}
                                </p>
                                <span className="text-[11px] text-[#A8B6C9]">{adm.email}</span>
                                {adm.aliasEmail && (
                                  <span className="text-[10px] text-[#64748B] block">
                                    Alias: {adm.aliasEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                adm.role === 'super_admin'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : adm.role === 'platform_admin'
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : adm.role === 'company_owner'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              <span>
                                {adm.role === 'super_admin'
                                  ? 'Main Admin'
                                  : adm.role === 'platform_admin'
                                  ? 'Platform Admin'
                                  : adm.role === 'company_owner'
                                  ? 'Company Owner'
                                  : 'Company Admin'}
                              </span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isPlatformLevel ? (
                              <span className="text-[11px] font-medium text-indigo-400 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Platform-Wide Scope</span>
                              </span>
                            ) : adm.company ? (
                              <div>
                                <p className="font-medium text-[#F8FAFC]">{adm.company.name}</p>
                                <span className="text-[10px] font-mono px-1 rounded bg-[#0F172A] border border-[#2B3B52] text-blue-400">
                                  {adm.company.code}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-400 text-xs italic">Unassigned</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {adm.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                                  <XCircle className="w-3 h-3" />
                                  <span>Deactivated</span>
                                </span>
                              )}

                              {adm.mustChangePassword && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Must Change Password</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[#A8B6C9]">
                            {adm.createdAt
                              ? new Date(adm.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {/* Reset Password Button */}
                              <button
                                onClick={() => handleResetAdminPassword(adm)}
                                disabled={isHeadAdmin}
                                className="py-1 px-2 rounded-md bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] border border-[#2B3B52] transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Reset password and generate new temporary credential"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                <span>Reset Pass</span>
                              </button>

                              {/* Activate / Deactivate Toggle */}
                              {!isHeadAdmin && (
                                <button
                                  onClick={() => handleToggleAdminStatus(adm)}
                                  className={`py-1 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                    adm.isActive
                                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                >
                                  {adm.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ADMINISTRATOR MODAL */}
      {createAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-6 max-w-md w-full text-[#F8FAFC] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B3B52] pb-3">
              <div>
                <h2 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  <span>Create Administrator</span>
                </h2>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Provision a new Platform Admin or Company Admin with a secure temporary password.
                </p>
              </div>
              <button
                onClick={() => setCreateAdminModalOpen(false)}
                className="text-[#A8B6C9] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">Administrator Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminForm({ ...adminForm, role: 'platform_admin', companyId: '' })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      adminForm.role === 'platform_admin'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-[#0F172A] text-[#A8B6C9] border-[#2B3B52] hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Platform Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminForm({ ...adminForm, role: 'company_admin' })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      adminForm.role === 'company_admin'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#0F172A] text-[#A8B6C9] border-[#2B3B52] hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Company Admin</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#A8B6C9] mt-1.5">
                  {adminForm.role === 'platform_admin'
                    ? 'Platform Admins have global multi-tenant management and platform oversight capabilities.'
                    : 'Company Admins are strictly scoped to their assigned security company workspace.'}
                </p>
              </div>

              {/* Company Selection (Required if Company Admin) */}
              {adminForm.role === 'company_admin' && (
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Assigned Security Company *</label>
                  <select
                    required
                    value={adminForm.companyId}
                    onChange={(e) => setAdminForm({ ...adminForm, companyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a company...</option>
                    {companies
                      .filter((c) => c.status === 'active')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}) - {c.city}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vikram@agency.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Security Policy Notice */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Security Policy:</strong> A cryptographically secure temporary password will be generated automatically and displayed once. The user must change it on their first login.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={() => setCreateAdminModalOpen(false)}
                  className="py-1.5 px-3.5 text-xs text-[#A8B6C9] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdminLoading}
                  className="py-1.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  {createAdminLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME TEMPORARY PASSWORD DISPLAY MODAL */}
      {tempPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-6 max-w-md w-full text-[#F8FAFC] shadow-2xl space-y-4">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-base text-[#F8FAFC]">
                {tempPasswordAdminInfo?.isReset ? 'Password Reset Successful' : 'Administrator Created Successfully'}
              </h2>
              <p className="text-xs text-[#A8B6C9] mt-0.5">
                Share this temporary credential securely with the administrator.
              </p>
            </div>

            {/* Account Details */}
            {tempPasswordAdminInfo && (
              <div className="p-3 rounded-lg bg-[#0F172A] border border-[#2B3B52] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#A8B6C9]">Name:</span>
                  <span className="font-semibold text-white">{tempPasswordAdminInfo.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A8B6C9]">Email:</span>
                  <span className="font-mono text-white">{tempPasswordAdminInfo.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A8B6C9]">Role:</span>
                  <span className="text-blue-400 font-medium capitalize">
                    {tempPasswordAdminInfo.role?.replace('_', ' ')}
                  </span>
                </div>
                {tempPasswordAdminInfo.company && (
                  <div className="flex justify-between">
                    <span className="text-[#A8B6C9]">Company:</span>
                    <span className="text-cyan-400 font-medium">{tempPasswordAdminInfo.company.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Temporary Password Box */}
            <div>
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                Temporary Password (One-Time View)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-[#0B1220] border-2 border-amber-500/40 text-amber-300 font-mono text-sm font-bold tracking-widest text-center select-all">
                  {generatedTempPassword}
                </div>
                <button
                  onClick={copyPasswordToClipboard}
                  className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  title="Copy password to clipboard"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copied && (
                <span className="text-[11px] text-emerald-400 mt-1 block text-right font-medium">
                  ✓ Copied to clipboard!
                </span>
              )}
            </div>

            {/* Warning Callout */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Warning:</strong> This password is not stored in plaintext and will <strong>never be shown again</strong>. The user must use it to sign in once, and will be forced to choose a new password immediately.
              </span>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setTempPasswordModalOpen(false);
                  setGeneratedTempPassword('');
                  setTempPasswordAdminInfo(null);
                  setCopied(false);
                }}
                className="w-full py-2 px-4 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-white font-medium text-xs border border-[#2B3B52] transition-colors cursor-pointer"
              >
                I Have Securely Copied This Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW COMPANY MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-6 max-w-lg w-full text-[#F8FAFC] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2B3B52] pb-3">
              <div>
                <h2 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <span>Register Security Company</span>
                </h2>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Create a new multi-tenant security agency and assign initial owner credentials.
                </p>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-[#A8B6C9] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterCompany} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-blue-400 tracking-wider">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={regForm.companyName}
                      onChange={(e) => setRegForm({ ...regForm, companyName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Company Code / Prefix</label>
                    <input
                      type="text"
                      placeholder="e.g. VALIANT"
                      value={regForm.companyCode}
                      onChange={(e) => setRegForm({ ...regForm, companyCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Official Email *</label>
                    <input
                      type="email"
                      required
                      value={regForm.companyEmail}
                      onChange={(e) => setRegForm({ ...regForm, companyEmail: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Official Phone</label>
                    <input
                      type="text"
                      value={regForm.companyPhone}
                      onChange={(e) => setRegForm({ ...regForm, companyPhone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={regForm.city}
                      onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">State / Province</label>
                    <input
                      type="text"
                      value={regForm.state}
                      onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#2B3B52]">
                <h3 className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">
                  Initial Company Owner
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regForm.ownerName}
                      onChange={(e) => setRegForm({ ...regForm, ownerName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Owner Email *</label>
                    <input
                      type="email"
                      required
                      value={regForm.ownerEmail}
                      onChange={(e) => setRegForm({ ...regForm, ownerEmail: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Owner Phone</label>
                    <input
                      type="text"
                      value={regForm.ownerPhone}
                      onChange={(e) => setRegForm({ ...regForm, ownerPhone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A8B6C9] mb-1">Initial Owner Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={regForm.ownerPassword}
                      onChange={(e) => setRegForm({ ...regForm, ownerPassword: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="py-1.5 px-3 text-xs text-[#A8B6C9] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="py-1.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {registerLoading ? 'Registering...' : 'Register Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE OWNER MODAL */}
      {ownerModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-6 max-w-md w-full text-[#F8FAFC] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B3B52] pb-3">
              <div>
                <h2 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-500" />
                  <span>Manage Owner Account</span>
                </h2>
                <p className="text-xs text-[#A8B6C9] mt-0.5">{selectedCompany.name}</p>
              </div>
              <button
                onClick={() => setOwnerModalOpen(false)}
                className="text-[#A8B6C9] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOwnerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-[#A8B6C9] mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={ownerForm.fullName}
                  onChange={(e) => setOwnerForm({ ...ownerForm, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A8B6C9] mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={ownerForm.email}
                  onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A8B6C9] mb-1">Owner Mobile Phone</label>
                <input
                  type="text"
                  value={ownerForm.phone}
                  onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A8B6C9] mb-1">
                  Reset Password (leave blank to keep current)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    value={ownerForm.password}
                    onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#A8B6C9] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={() => setOwnerModalOpen(false)}
                  className="py-1.5 px-3 text-xs text-[#A8B6C9] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ownerLoading}
                  className="py-1.5 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {ownerLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
