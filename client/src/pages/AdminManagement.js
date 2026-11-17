import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  Eye,
  Shield,
  X,
  Copy,
  Check,
  Ban,
  Clock,
  AlertTriangle,
  Mail,
  User,
  ExternalLink,
  Users,
  Send,
  KeyRound,
  RefreshCw,
  Lock,
  Phone,
  Power,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { companyAPI } from '../services/api';

// Helper to generate secure temporary password on the client
function generateClientTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = upper + lower + digits + symbols;
  let res = '';
  res += upper[Math.floor(Math.random() * upper.length)];
  res += lower[Math.floor(Math.random() * lower.length)];
  res += digits[Math.floor(Math.random() * digits.length)];
  res += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 8; i++) {
    res += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return res.split('').sort(() => 0.5 - Math.random()).join('');
}

const AdminManagement = () => {
  const {
    admins = [],
    addAdmin,
    updateAdmin,
    toggleAdminStatus,
    resetAdminPassword,
    currentUser,
  } = useApp();
  const { admin: authAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations'
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // 1. Direct Add Member State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'admin',
    password: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // 2. Edit Member State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    role: 'admin',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // 3. Reset Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetAdmin, setResetTargetAdmin] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessCreds, setResetSuccessCreds] = useState(null);

  // 4. View Profile Modal State
  const [viewingAdmin, setViewingAdmin] = useState(null);

  // 5. Invitation State
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    fullName: '',
    email: '',
    role: 'admin',
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Status toggle state
  const [togglingId, setTogglingId] = useState(null);

  // Role authorization
  const currentRole = authAdmin?.role || currentUser?.role;
  const isOwnerOrSuper = currentRole === 'company_owner' || currentRole === 'super_admin';
  const canManageUsers = isOwnerOrSuper || currentRole === 'company_admin' || currentRole === 'admin';

  // Fetch company invitations
  const fetchInvitations = async () => {
    if (!canManageUsers) return;
    setInvitationsLoading(true);
    try {
      const res = await companyAPI.getInvitations();
      if (res.data && res.data.success) {
        setInvitations(res.data.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch invitations:', err.message);
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [canManageUsers]);

  // Copy helper
  const handleCopy = (text, id = 'copy') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Handlers: Direct User Creation ---
  const handleOpenAddModal = () => {
    const tempPass = generateClientTempPassword();
    setAddFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'admin',
      password: tempPass,
    });
    setAddError('');
    setCreatedCredentials(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addFormData.fullName.trim() || !addFormData.email.trim()) {
      setAddError('Full name and work email are required.');
      return;
    }

    if (addFormData.password && addFormData.password.length < 8) {
      setAddError('Password must be at least 8 characters long.');
      return;
    }

    setAddSubmitting(true);
    try {
      const result = await addAdmin({
        fullName: addFormData.fullName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        phone: addFormData.phone.trim(),
        role: addFormData.role,
        password: addFormData.password,
      });

      if (result && result.success) {
        setCreatedCredentials({
          fullName: addFormData.fullName.trim(),
          email: addFormData.email.trim().toLowerCase(),
          role: addFormData.role,
          temporaryPassword: result.temporaryPassword || addFormData.password,
        });
        setActionSuccess(`User ${addFormData.fullName.trim()} registered successfully.`);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setAddError(err.response?.data?.message || err.message || 'Failed to create company user.');
    } finally {
      setAddSubmitting(false);
    }
  };

  // --- Handlers: Edit User ---
  const handleOpenEdit = (adm) => {
    setEditingAdmin(adm);
    setEditFormData({
      fullName: adm.fullName || adm.name || '',
      phone: adm.phone || '',
      role: adm.role === 'company_owner' ? 'company_admin' : (adm.role || 'admin'),
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editFormData.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const targetId = editingAdmin._id || editingAdmin.id;
      const res = await updateAdmin(targetId, {
        fullName: editFormData.fullName.trim(),
        phone: editFormData.phone.trim(),
        ...(editingAdmin.role !== 'company_owner' ? { role: editFormData.role } : {}),
      });

      if (res && res.success) {
        setIsEditModalOpen(false);
        setActionSuccess(`User ${editFormData.fullName.trim()} updated successfully.`);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // --- Handlers: Toggle Status (Activate / Deactivate) ---
  const handleToggleStatus = async (adm) => {
    const targetId = adm._id || adm.id;
    const isCurrentlyActive = adm.isActive !== false && adm.accessStatus !== 'Inactive';
    const actionLabel = isCurrentlyActive ? 'deactivate' : 'activate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${adm.fullName || adm.name}? ${isCurrentlyActive ? 'Deactivated users cannot log in.' : ''}`)) {
      return;
    }

    setTogglingId(targetId);
    setActionError('');
    try {
      const res = await toggleAdminStatus(targetId);
      if (res && res.success) {
        setActionSuccess(`User ${adm.fullName || adm.name} has been ${res.isActive ? 'activated' : 'deactivated'}.`);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || `Failed to ${actionLabel} user.`);
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setTogglingId(null);
    }
  };

  // --- Handlers: Reset Password ---
  const handleOpenReset = (adm) => {
    setResetTargetAdmin(adm);
    setResetPasswordVal(generateClientTempPassword());
    setResetError('');
    setResetSuccessCreds(null);
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!resetPasswordVal || resetPasswordVal.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }

    setResetSubmitting(true);
    try {
      const targetId = resetTargetAdmin._id || resetTargetAdmin.id;
      const res = await resetAdminPassword(targetId, resetPasswordVal);

      if (res && res.success) {
        setResetSuccessCreds({
          fullName: resetTargetAdmin.fullName || resetTargetAdmin.name,
          email: resetTargetAdmin.email,
          temporaryPassword: res.temporaryPassword || resetPasswordVal,
        });
        setActionSuccess(`Password reset successfully for ${resetTargetAdmin.fullName || resetTargetAdmin.name}.`);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setResetError(err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // --- Handlers: Invitations ---
  const handleOpenInvite = () => {
    setInviteFormData({
      fullName: '',
      email: '',
      role: 'admin',
    });
    setInviteError('');
    setGeneratedInvite(null);
    setIsInviteModalOpen(true);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');

    if (!inviteFormData.fullName.trim() || !inviteFormData.email.trim()) {
      setInviteError('Please fill in both full name and work email.');
      return;
    }

    setInviteSubmitting(true);
    try {
      const res = await companyAPI.createInvitation({
        fullName: inviteFormData.fullName.trim(),
        email: inviteFormData.email.trim().toLowerCase(),
        role: inviteFormData.role,
      });

      if (res.data && res.data.success) {
        setGeneratedInvite(res.data);
        fetchInvitations();
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || err.message || 'Failed to generate invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to revoke this pending invitation?')) return;
    try {
      await companyAPI.revokeInvitation(invitationId);
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === invitationId ? { ...inv, status: 'revoked' } : inv))
      );
      setActionSuccess('Invitation revoked successfully.');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke invitation.');
    }
  };

  // --- Filtering & Sorting ---
  const filteredAdmins = admins.filter((adm) => {
    const nameMatch = (adm.fullName || adm.name || '').toLowerCase().includes(search.toLowerCase());
    const emailMatch = (adm.email || '').toLowerCase().includes(search.toLowerCase());
    const roleMatch = (adm.role || '').toLowerCase().includes(search.toLowerCase());
    const passesSearch = nameMatch || emailMatch || roleMatch;
    const passesRole = roleFilter ? adm.role === roleFilter : true;
    return passesSearch && passesRole;
  });

  const filteredInvitations = invitations.filter((inv) => {
    const nameMatch = (inv.fullName || '').toLowerCase().includes(search.toLowerCase());
    const emailMatch = (inv.email || '').toLowerCase().includes(search.toLowerCase());
    const roleMatch = (inv.role || '').toLowerCase().includes(search.toLowerCase());
    const passesSearch = nameMatch || emailMatch || roleMatch;
    const passesRole = roleFilter ? inv.role === roleFilter : true;
    return passesSearch && passesRole;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'company_owner':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Company Owner
          </span>
        );
      case 'company_admin':
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30">
            Company Admin
          </span>
        );
      case 'supervisor_admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Supervisor Admin
          </span>
        );
      case 'operator':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Duty Operator
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            {role || 'Staff User'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Team & Staff Management</h1>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Manage company administrators, supervisors, and duty staff with multi-role access controls.
          </p>
        </div>

        {canManageUsers && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>

            <button
              onClick={handleOpenInvite}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#172337] hover:bg-[#1E2D43] border border-[#2B3B52] text-[#60A5FA] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Invite via Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2B3B52] pb-1">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'members'
              ? 'bg-[#3B82F6] text-white shadow-xs'
              : 'bg-[#172337] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Members ({admins.length})</span>
        </button>

        {canManageUsers && (
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'invitations'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'bg-[#172337] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52]'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>
              Invitations ({invitations.filter((i) => i.status === 'pending').length} pending)
            </span>
          </button>
        )}
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-[#172337] p-4 rounded-xl border border-[#2B3B52] shadow-md flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'members'
                ? 'Search by staff name, email, or role...'
                : 'Search invitations by name or email...'
            }
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] font-medium"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="" className="bg-[#111C30] text-[#F8FAFC]">All Roles</option>
          <option value="company_owner" className="bg-[#111C30] text-[#F8FAFC]">Company Owner</option>
          <option value="company_admin" className="bg-[#111C30] text-[#F8FAFC]">Company Admin</option>
          <option value="admin" className="bg-[#111C30] text-[#F8FAFC]">Administrator</option>
          <option value="supervisor_admin" className="bg-[#111C30] text-[#F8FAFC]">Supervisor Admin</option>
          <option value="operator" className="bg-[#111C30] text-[#F8FAFC]">Duty Operator</option>
        </select>
      </div>

      {/* 4. Active Tab: Staff Members */}
      {activeTab === 'members' && (
        <div className="bg-[#172337] rounded-xl border border-[#2B3B52] shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#A8B6C9] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Must Change Pwd</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((adm) => {
                    const isActive = adm.isActive !== false && adm.accessStatus !== 'Inactive';
                    const isSelf = authAdmin?._id === adm._id || authAdmin?.id === adm.id;
                    const isOwner = adm.role === 'company_owner';

                    return (
                      <tr key={adm._id || adm.id} className="hover:bg-[#1E2D43]/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-[#60A5FA] flex items-center justify-center font-bold text-xs shrink-0">
                              {(adm.fullName || adm.name || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-[#F8FAFC] block">
                                {adm.fullName || adm.name}
                                {isSelf && (
                                  <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300">
                                    You
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-[#A8B6C9] font-mono">
                                {adm.phone || 'No phone recorded'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#A8B6C9] font-mono">{adm.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(adm.role)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-300 border border-red-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {adm.mustChangePassword ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Yes (Required)
                            </span>
                          ) : (
                            <span className="text-[#A8B6C9] text-[11px]">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile */}
                            <button
                              onClick={() => setViewingAdmin(adm)}
                              className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors cursor-pointer"
                              title="View User Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Member Details */}
                            {canManageUsers && (!isOwner || isOwnerOrSuper) && (
                              <button
                                onClick={() => handleOpenEdit(adm)}
                                className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] border border-[#2B3B52] transition-colors cursor-pointer"
                                title="Edit User Details & Role"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Reset Password */}
                            {canManageUsers && (!isOwner || isOwnerOrSuper) && (
                              <button
                                onClick={() => handleOpenReset(adm)}
                                className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-amber-400 border border-[#2B3B52] transition-colors cursor-pointer"
                                title="Reset Temporary Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Toggle Active / Deactivate */}
                            {canManageUsers && !isSelf && !isOwner && (
                              <button
                                onClick={() => handleToggleStatus(adm)}
                                disabled={togglingId === (adm._id || adm.id)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}
                                title={isActive ? 'Deactivate User (Prevents login)' : 'Activate User Account'}
                              >
                                <Power className="w-3.5 h-3.5" />
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
      )}

      {/* 5. Active Tab: Pending Invitations */}
      {activeTab === 'invitations' && (
        <div className="bg-[#172337] rounded-xl border border-[#2B3B52] shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111C30] border-b border-[#2B3B52] text-[#A8B6C9] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Invited Member</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                {invitationsLoading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
                        <span>Loading company invitations...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#A8B6C9]">
                      No invitations found. Click &quot;Invite via Link&quot; above to generate one.
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => {
                    const appUrl = window.location.origin;
                    const inviteUrl = `${appUrl}/accept-invitation/${inv.token || ''}`;

                    return (
                      <tr key={inv.id || inv._id} className="hover:bg-[#1E2D43]/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#F8FAFC]">{inv.fullName}</td>
                        <td className="py-3 px-4 text-[#A8B6C9] font-mono">{inv.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(inv.role)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                              inv.status === 'accepted'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : inv.status === 'revoked'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#A8B6C9]">
                          {inv.expiresAt
                            ? new Date(inv.expiresAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '7 days'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleCopy(inv.invitationUrl || inviteUrl, inv.id)}
                                  className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#60A5FA] border border-[#2B3B52] transition-colors cursor-pointer"
                                  title="Copy Invitation Link"
                                >
                                  {copiedId === inv.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                                  title="Revoke Invitation"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </>
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
      )}

      {/* MODAL 1: Direct User Creation */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Add Staff Member (Direct)</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdCredentials ? (
              /* Success Screen displaying temporary credentials */
              <div className="p-6 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">User Created Successfully!</p>
                    <p className="text-[#A8B6C9] text-xs mt-0.5">
                      Share these login credentials with{' '}
                      <span className="text-[#F8FAFC] font-semibold">{createdCredentials.fullName}</span>.
                      They will be required to change their password on first login.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3.5 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                  <div>
                    <label className="text-[11px] text-[#A8B6C9] block">Login Email:</label>
                    <span className="font-mono font-semibold text-[#F8FAFC]">{createdCredentials.email}</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A8B6C9] block">Temporary Password:</label>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {createdCredentials.temporaryPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdCredentials.temporaryPassword, 'pwd_copy')}
                        className="px-2.5 py-1 rounded bg-[#3B82F6] hover:bg-blue-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'pwd_copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === 'pwd_copy' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2B3B52] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setCreatedCredentials(null);
                    }}
                    className="px-5 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] rounded-lg font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* User Input Form */
              <form onSubmit={handleAddSubmit} className="p-6 space-y-3.5 text-xs">
                {addError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addFormData.fullName}
                    onChange={(e) => setAddFormData({ ...addFormData, fullName: e.target.value })}
                    placeholder="e.g. Major Rohit Sharma"
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    placeholder="rohit@company.com"
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="+91 98111 22334"
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Role & Permissions *</label>
                  <select
                    value={addFormData.role}
                    onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  >
                    <option value="admin" className="bg-[#111C30] text-[#F8FAFC]">
                      Company Admin (Users, Guards, Sites, Shifts, Reports)
                    </option>
                    <option value="supervisor_admin" className="bg-[#111C30] text-[#F8FAFC]">
                      Supervisor Admin (Assigned Sites, Guards & Attendance)
                    </option>
                    <option value="operator" className="bg-[#111C30] text-[#F8FAFC]">
                      Duty Operator (Read-Only Operational & Call Records)
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-[#A8B6C9]">Temporary Password *</label>
                    <button
                      type="button"
                      onClick={() => setAddFormData({ ...addFormData, password: generateClientTempPassword() })}
                      className="text-[#60A5FA] hover:text-blue-400 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-amber-300 font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                  <p className="text-[11px] text-[#A8B6C9] mt-1">
                    User will be forced to change this password on first login.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {addSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Member</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User Details */}
      {isEditModalOpen && editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Edit Staff Member</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-3.5 text-xs">
              {editError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Work Email (Immutable)</label>
                <input
                  type="email"
                  disabled
                  value={editingAdmin.email}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#A8B6C9] cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#A8B6C9] mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-mono"
                />
              </div>

              {editingAdmin.role !== 'company_owner' && (
                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Assigned Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  >
                    <option value="admin" className="bg-[#111C30] text-[#F8FAFC]">
                      Company Admin (Users, Guards, Sites, Shifts, Reports)
                    </option>
                    <option value="supervisor_admin" className="bg-[#111C30] text-[#F8FAFC]">
                      Supervisor Admin (Assigned Sites, Guards & Attendance)
                    </option>
                    <option value="operator" className="bg-[#111C30] text-[#F8FAFC]">
                      Duty Operator (Read-Only Operational & Call Records)
                    </option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Temporary Password */}
      {isResetModalOpen && resetTargetAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Reset Password</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccessCreds ? (
              <div className="p-6 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Password Reset Complete!</p>
                    <p className="text-[#A8B6C9] text-xs mt-0.5">
                      New temporary password generated for{' '}
                      <span className="text-[#F8FAFC] font-semibold">{resetSuccessCreds.fullName}</span>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111C30] border border-[#2B3B52] space-y-2">
                  <label className="text-[11px] text-[#A8B6C9] block">New Temporary Password:</label>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {resetSuccessCreds.temporaryPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(resetSuccessCreds.temporaryPassword, 'reset_copy')}
                      className="px-2.5 py-1 rounded bg-[#3B82F6] hover:bg-blue-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'reset_copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'reset_copy' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2B3B52] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetModalOpen(false);
                      setResetSuccessCreds(null);
                    }}
                    className="px-5 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] rounded-lg font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="p-6 space-y-3.5 text-xs">
                {resetError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <p className="text-[#A8B6C9]">
                  Assign a new temporary password for{' '}
                  <span className="font-bold text-[#F8FAFC]">
                    {resetTargetAdmin.fullName || resetTargetAdmin.name}
                  </span>{' '}
                  ({resetTargetAdmin.email}).
                </p>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-[#A8B6C9]">Temporary Password *</label>
                    <button
                      type="button"
                      onClick={() => setResetPasswordVal(generateClientTempPassword())}
                      className="text-[#60A5FA] hover:text-blue-400 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-amber-300 font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                  <p className="text-[11px] text-[#A8B6C9] mt-1">
                    The user will be required to change their password on their next login.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-bold shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {resetSubmitting ? 'Resetting...' : 'Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Invite Team Member (via Link) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl">
            <div className="p-5 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="font-bold text-[#F8FAFC] text-sm">Invite Team Member via Link</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedInvite ? (
              <div className="p-6 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Invitation Generated!</p>
                    <p className="text-[#A8B6C9] text-xs mt-0.5">
                      Share this invitation link with{' '}
                      <span className="text-[#F8FAFC] font-semibold">{generatedInvite.invitation?.fullName}</span>.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1.5">
                    Invitation URL (Valid for 7 days)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.invitationUrl}
                      className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#60A5FA] font-mono text-[11px] select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedInvite.invitationUrl, 'invite_modal_copy')}
                      className="px-3 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      {copiedId === 'invite_modal_copy' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2B3B52] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setGeneratedInvite(null);
                    }}
                    className="px-5 py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] rounded-lg font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 text-xs">
                {inviteError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteFormData.fullName}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, fullName: e.target.value })}
                    placeholder="e.g. Major Rohit Sharma"
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteFormData.email}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                    placeholder="rohit@company.com"
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#A8B6C9] mb-1">Role *</label>
                  <select
                    value={inviteFormData.role}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] font-medium"
                  >
                    <option value="admin" className="bg-[#111C30] text-[#F8FAFC]">
                      Company Admin (Users, Guards, Sites, Shifts, Reports)
                    </option>
                    <option value="supervisor_admin" className="bg-[#111C30] text-[#F8FAFC]">
                      Supervisor Admin (Assigned Sites, Guards & Attendance)
                    </option>
                    <option value="operator" className="bg-[#111C30] text-[#F8FAFC]">
                      Duty Operator (Read-Only Operational & Call Records)
                    </option>
                  </select>
                </div>

                <div className="pt-3 border-t border-[#2B3B52] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {inviteSubmitting ? 'Generating...' : 'Generate Invitation Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: View Profile */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl w-full max-w-md overflow-hidden text-[#F8FAFC] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2B3B52]">
              <h3 className="font-bold text-[#F8FAFC] text-sm">Staff Member Profile</h3>
              <button
                onClick={() => setViewingAdmin(null)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-[#60A5FA] flex items-center justify-center font-bold text-lg shrink-0">
                {(viewingAdmin.fullName || viewingAdmin.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-[#F8FAFC] text-base">{viewingAdmin.fullName || viewingAdmin.name}</h4>
                <div className="mt-1">{getRoleBadge(viewingAdmin.role)}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111C30] border border-[#2B3B52] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A8B6C9]">Email:</span>
                <span className="font-mono text-[#F8FAFC]">{viewingAdmin.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A8B6C9]">Phone:</span>
                <span className="font-mono text-[#F8FAFC]">{viewingAdmin.phone || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A8B6C9]">Account Status:</span>
                <span className={`font-semibold ${viewingAdmin.isActive !== false ? 'text-emerald-400' : 'text-red-400'}`}>
                  {viewingAdmin.isActive !== false ? 'Active (Permitted)' : 'Inactive (Deactivated)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A8B6C9]">Password Change:</span>
                <span className={viewingAdmin.mustChangePassword ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                  {viewingAdmin.mustChangePassword ? 'Required on Login' : 'Up to date'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewingAdmin(null)}
              className="w-full py-2 bg-[#1E2D43] hover:bg-[#2B3B52] text-[#F8FAFC] rounded-lg font-semibold text-xs transition-colors cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
