import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { registerCompany } = useAuth();

  // Section A: Company Information
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');

  // Section B: Company Owner Account
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Email format validation
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Password strength checks
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
    setErrorMsg('');

    // Field-level validations
    if (!companyName.trim()) {
      setErrorMsg('Please enter the legal company name.');
      return;
    }
    if (!isValidEmail(companyEmail.trim())) {
      setErrorMsg('Please enter a valid official company email address.');
      return;
    }
    if (!companyPhone.trim()) {
      setErrorMsg('Please enter the company contact phone number.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter the primary operating city.');
      return;
    }
    if (!state.trim()) {
      setErrorMsg('Please enter the operating state.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter the complete office address.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter the company owner full name.');
      return;
    }
    if (!isValidEmail(ownerEmail.trim())) {
      setErrorMsg('Please enter a valid owner work email address.');
      return;
    }
    if (!isPasswordStrong) {
      setErrorMsg('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      const registeredAdmin = await registerCompany({
        companyName: companyName.trim(),
        companyEmail: companyEmail.trim().toLowerCase(),
        companyPhone: companyPhone.trim(),
        city: city.trim(),
        state: state.trim(),
        address: address.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        password,
        confirmPassword,
      });

      setSuccessData(registeredAdmin);
      setLoading(false);

      // Brief pause to display success banner before navigating to dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setLoading(false);
      let msg = err.message || 'Registration failed. Please check your inputs.';
      if (err.message === 'Network Error' || !err.response) {
        msg = 'Unable to connect to the backend server (http://localhost:5000). Please ensure the service is running.';
      }
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1220] text-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 select-none">
      <div className="w-full max-w-2xl bg-[#172337] border border-[#2B3B52] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header & Brand Identity */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-[#2B3B52] bg-[#111C30]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3B82F6] mb-3 text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
            Register Security Agency
          </h1>
          <p className="text-xs text-[#A8B6C9] mt-1 font-medium">
            Deploy your dedicated multi-tenant guard monitoring and voice verification platform
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[#F87171] text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
              <Shield className="w-4 h-4 shrink-0 text-[#F87171]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successData && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-sm">Company Registered Successfully!</p>
                <p className="text-[#A8B6C9] text-xs mt-0.5">
                  Welcome, {successData.fullName}. Setting up your workspace for {successData.company?.name || 'your agency'}...
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ======================================================== */}
            {/* SECTION A: Company Information */}
            {/* ======================================================== */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#2B3B52]">
                <Building2 className="w-4 h-4 text-[#3B82F6]" />
                <h2 className="text-sm font-semibold text-[#F8FAFC]">
                  Section A: Security Agency Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Legal Company Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Legal Company Name <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Security Solutions Pvt Ltd"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Official Company Email */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Official Company Email <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="operations@apexsecurity.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Company Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Company Phone Number <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Operating City <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Gurugram"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Operating State <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Haryana"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Complete Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Complete Registered Address <span className="text-[#F87171]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Tower 3, DLF Cyber City, Sector 24"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SECTION B: Company Owner Account */}
            {/* ======================================================== */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-[#2B3B52]">
                <User className="w-4 h-4 text-[#3B82F6]" />
                <h2 className="text-sm font-semibold text-[#F8FAFC]">
                  Section B: Company Owner & Primary Administrator
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Owner Full Name */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Owner Full Name <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Captain Rajesh Verma"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Owner Work Email */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Owner Work Email <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8B6C9]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="rajesh@apexsecurity.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#2B3B52] bg-[#0B1220] text-[#F8FAFC] placeholder-[#A8B6C9]/40 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                    Master Password <span className="text-[#F87171]">*</span>
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
              </div>

              {/* Password criteria checklist */}
              <div className="p-2.5 rounded-lg bg-[#111C30] border border-[#2B3B52] flex flex-wrap items-center gap-4 text-[11px] text-[#A8B6C9]">
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
                    Includes letters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordCriteria.hasNumber ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className={passwordCriteria.hasNumber ? 'text-emerald-400' : ''}>
                    Includes numbers
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
                      Passwords match
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !!successData}
                className="w-full py-2.5 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Company & Creating Owner Account...</span>
                  </>
                ) : successData ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Company Registered! Redirecting...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Agency Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Return to Login link */}
          <div className="pt-2 border-t border-[#2B3B52] text-center text-xs text-[#A8B6C9]">
            <span>Already have an AutoGuard agency registered? </span>
            <Link
              to="/login"
              className="font-medium text-[#60A5FA] hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#111C30] border-t border-[#2B3B52] text-center text-xs text-[#A8B6C9] flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#A8B6C9] shrink-0" />
          <span>AutoGuard Multi-Tenant Security SaaS Platform</span>
        </div>
      </div>
    </div>
  );
}
