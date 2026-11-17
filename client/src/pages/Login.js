import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const loggedInAdmin = await login(trimmedEmail, password, false);
      setLoading(false);
      if (loggedInAdmin?.mustChangePassword) {
        navigate('/change-password');
      } else if (loggedInAdmin?.role === 'super_admin' || loggedInAdmin?.role === 'platform_admin') {
        navigate('/company-management');
      } else {
        navigate('/');
      }
    } catch (err) {
      setLoading(false);
      let msg = err.message || 'Invalid email or password.';
      if (err.message === 'Network Error' || !err.response) {
        msg = 'Unable to connect to the backend server. Please verify the service is running.';
      }
      setErrorMsg(msg);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg('');
    setDemoLoading(true);

    try {
      await demoLogin();
      setDemoLoading(false);
      navigate('/');
    } catch (err) {
      setDemoLoading(false);
      let msg = err.message || 'Unable to start demo session.';
      if (err.message === 'Network Error' || !err.response) {
        msg = 'Unable to connect to the backend server. Please verify the service is running.';
      }
      setErrorMsg(msg);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await authAPI.forgotPassword({ email: forgotEmail.trim() });
      setForgotSubmitted(true);
    } catch (err) {
      setForgotSubmitted(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-xs p-6 sm:p-8">
        {/* Header / Brand Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600 text-white mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">AutoGuard</h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise Guard Shift & Verification System</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSubmitted(false);
                  setForgotModalOpen(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-3 pr-9 py-2 text-xs rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs tracking-wide shadow-xs transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-2 text-gray-400 font-medium tracking-wider">Or</span>
          </div>
        </div>

        {/* Explore Demo Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading || demoLoading}
          className="w-full py-2 px-4 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium text-xs tracking-wide shadow-2xs transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          {demoLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin" />
              <span>Launching Demo Workspace...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Explore Demo</span>
            </>
          )}
        </button>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm w-full text-gray-900 shadow-xl space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Reset Password</h2>
              <p className="text-xs text-gray-500 mt-1">
                Enter your registered administrator email to receive password recovery instructions.
              </p>
            </div>

            {forgotSubmitted ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>If an account exists for {forgotEmail}, password reset instructions have been sent.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-xs transition-colors cursor-pointer"
                >
                  {forgotLoading ? 'Sending...' : 'Send Recovery Link'}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setForgotModalOpen(false);
                setForgotSubmitted(false);
              }}
              className="w-full py-1 text-xs text-gray-500 hover:text-gray-700 text-center transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
