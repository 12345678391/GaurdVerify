import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Shield, Eye, EyeOff, AlertCircle, CheckCircle2, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { admin, updateCurrentAdmin, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current temporary password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('New password cannot be the same as your temporary password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Password updated successfully! Redirecting to dashboard...');
        updateCurrentAdmin({ mustChangePassword: false });

        setTimeout(() => {
          if (admin?.role === 'super_admin' || admin?.role === 'platform_admin') {
            navigate('/platform-admin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 1200);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to update password. Please check your credentials.';
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">Password Change Required</h1>
          <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
            Your account was initialized with a temporary password. You must establish a new permanent password to access the platform.
          </p>
        </div>

        {/* User Info Pill */}
        {admin && (
          <div className="mb-5 p-3 rounded-xl bg-[#162032] border border-[#23324A] text-xs flex items-center justify-between">
            <div>
              <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Logged In As</span>
              <span className="text-[#F8FAFC] font-medium">{admin.fullName}</span>
              <span className="text-[#94A3B8] text-[11px] block">{admin.email}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {admin.role === 'super_admin'
                ? 'Main Admin'
                : admin.role === 'platform_admin'
                ? 'Platform Admin'
                : 'Company Admin'}
            </span>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              Current Temporary Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter provided temporary password"
                disabled={loading || Boolean(successMsg)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#334155] bg-[#162032] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#94A3B8] transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              New Permanent Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                disabled={loading || Boolean(successMsg)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#334155] bg-[#162032] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#94A3B8] transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={loading || Boolean(successMsg)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#334155] bg-[#162032] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#94A3B8] transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(successMsg)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Set Password & Proceed</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Logout Option */}
        <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#64748B]">
          <span>Need to sign in as a different user?</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
