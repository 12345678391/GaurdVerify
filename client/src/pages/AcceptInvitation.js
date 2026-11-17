import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Shield,
  Check,
  X,
  BadgeCheck,
} from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvitation } = useAuth();

  // Invitation fetch state
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState(null); // 'expired' | 'revoked' | 'accepted' | 'invalid'

  // Form states
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate invitation token on load
  useEffect(() => {
    let isMounted = true;
    const checkToken = async () => {
      if (!token) {
        if (isMounted) {
          setTokenError('Invitation token is missing from the link.');
          setTokenStatus('invalid');
          setValidating(false);
        }
        return;
      }

      try {
        const res = await authAPI.validateInvitation(token);
        if (isMounted && res.data && res.data.success) {
          setInviteData(res.data.invitation);
          setFullName(res.data.invitation.fullName || '');
          setValidating(false);
        }
      } catch (err) {
        if (isMounted) {
          const status = err.response?.data?.status || 'invalid';
          const msg =
            err.response?.data?.message ||
            'Unable to validate invitation. The link may be broken or expired.';
          setTokenStatus(status);
          setTokenError(msg);
          setValidating(false);
        }
      }
    };

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Password criteria
  const passwordCriteria = {
    hasMinLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const isPasswordStrong =
    passwordCriteria.hasMinLength &&
    passwordCriteria.hasLetter &&
    passwordCriteria.hasNumber;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!isPasswordStrong) {
      setFormError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await acceptInvitation({
        token,
        fullName: fullName.trim(),
        password,
        confirmPassword,
      });

      setSuccess(true);
      setSubmitting(false);

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setSubmitting(false);
      setFormError(
        err.response?.data?.message || err.message || 'Failed to accept invitation. Please try again.'
      );
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'supervisor_admin':
        return { label: 'Supervisor Administrator', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'operator':
        return { label: 'Duty Operator', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      default:
        return { label: role || 'Member', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1220] text-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-[#172337] border border-[#2B3B52] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Brand Header */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-[#2B3B52] bg-[#111C30]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3B82F6] mb-3 text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
            AutoGuard Team Invitation
          </h1>
          <p className="text-xs text-[#A8B6C9] mt-1 font-medium">
            Join your security operations team workspace
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Loading validation */}
          {validating && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#A8B6C9] font-medium">
                Verifying secure invitation credentials...
              </p>
            </div>
          )}

          {/* Error / Inactive State */}
          {!validating && tokenError && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-[#F87171] mx-auto flex items-center justify-center">
                {tokenStatus === 'expired' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#F8FAFC]">
                  {tokenStatus === 'expired'
                    ? 'Invitation Expired'
                    : tokenStatus === 'revoked'
                    ? 'Invitation Revoked'
                    : tokenStatus === 'accepted'
                    ? 'Invitation Already Used'
                    : 'Invalid Invitation Link'}
                </h2>
                <p className="text-xs text-[#A8B6C9] mt-1 max-w-sm mx-auto">
                  {tokenError}
                </p>
              </div>

              <div className="pt-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] text-[#F8FAFC] text-xs font-semibold transition-colors"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Valid Invitation Form */}
          {!validating && !tokenError && inviteData && (
            <div className="space-y-5">
              {/* Invitation Welcome Card */}
              <div className="p-4 rounded-xl bg-[#111C30] border border-[#2B3B52] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center shrink-0 text-[#60A5FA]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#A8B6C9]">You have been invited to join</p>
                    <h2 className="text-base font-bold text-[#F8FAFC] truncate">
                      {inviteData.company?.name || 'AutoGuard Security Solutions'}
                    </h2>
                    {inviteData.company?.city && (
                      <p className="text-[11px] text-[#A8B6C9]/80">
                        {inviteData.company.city}
                        {inviteData.company.state ? `, ${inviteData.company.state}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#2B3B52]/60 text-xs">
                  <span className="text-[#A8B6C9]">Assigned Role:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      getRoleBadge(inviteData.role).color
                    }`}
                  >
                    {getRoleBadge(inviteData.role).label}
                  </span>
                </div>
              </div>

              {/* Form Feedback */}
              {formError && (
                <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[#F87171] text-xs font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-[#F87171]" />
                  <span>{formError}</span>
                </div>
              )}

              {success && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2.5">
                  <BadgeCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-semibold text-sm">Invitation Accepted!</p>
                    <p className="text-xs text-[#A8B6C9] mt-0.5">
                      Account established successfully. Redirecting to workspace...
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Invited Email (Read-only) */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Invited Work Email (Locked)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      disabled
                      value={inviteData.email}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#111C30] text-[#A8B6C9] font-mono cursor-not-allowed select-all"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Your Full Name <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Vikram Batra"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Create Password <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, letters & numbers"
                      className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Confirm Password <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A8B6C9] hover:text-[#F8FAFC] cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Criteria */}
                <div className="p-2.5 rounded-lg bg-[#111C30] border border-[#2B3B52] flex flex-wrap items-center gap-3.5 text-[11px] text-[#A8B6C9]">
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasMinLength ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordCriteria.hasMinLength ? 'text-emerald-400' : ''}>
                      8+ characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasLetter ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordCriteria.hasLetter ? 'text-emerald-400' : ''}>
                      Letters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordCriteria.hasNumber ? 'text-emerald-400' : ''}>
                      Numbers
                    </span>
                  </div>
                  {confirmPassword && (
                    <div className="flex items-center gap-1.5">
                      {password === confirmPassword ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#F87171]" />
                      )}
                      <span className={password === confirmPassword ? 'text-emerald-400' : 'text-[#F87171]'}>
                        Match
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Setting Up Your Account...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Account Ready! Entering Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation & Join Team</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-[#2B3B52] text-center text-xs text-[#A8B6C9]">
                <span>Already have credentials? </span>
                <Link
                  to="/login"
                  className="font-medium text-[#60A5FA] hover:text-blue-400 transition-colors"
                >
                  Sign in directly
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#111C30] border-t border-[#2B3B52] text-center text-xs text-[#A8B6C9] flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#A8B6C9] shrink-0" />
          <span>AutoGuard Security Management Infrastructure</span>
        </div>
      </div>
    </div>
  );
}
