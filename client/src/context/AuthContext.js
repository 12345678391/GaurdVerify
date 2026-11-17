import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('gc_admin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('gc_token') || null);
  const [loading, setLoading] = useState(true);

  const clearTenantStorage = () => {
    localStorage.removeItem('gc_token');
    localStorage.removeItem('gc_admin');
    localStorage.removeItem('ag_current_user');
    localStorage.removeItem('ag_company');
    localStorage.removeItem('ag_guards');
    localStorage.removeItem('ag_locations');
    localStorage.removeItem('ag_shifts');
    localStorage.removeItem('ag_call_logs');
    localStorage.removeItem('ag_attendance');
    localStorage.removeItem('ag_notifications');
    localStorage.removeItem('ag_supervisors');
    localStorage.removeItem('ag_admins');
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('gc_token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          if (res.data && res.data.success) {
            setAdmin(res.data.admin);
            localStorage.setItem('gc_admin', JSON.stringify(res.data.admin));
          } else {
            throw new Error('Failed to retrieve user session');
          }
        } catch (err) {
          console.warn('[AuthContext] Session invalid or expired.');
          clearTenantStorage();
          setAdmin(null);
          setToken(null);
        }
      } else {
        clearTenantStorage();
        setAdmin(null);
        setToken(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, rememberMe = true) => {
    try {
      const res = await authAPI.login({ email, password });
      if (res.data && res.data.success) {
        const { token: receivedToken, admin: receivedAdmin } = res.data;
        // Cleanse any prior tenant or user cache to guarantee zero cross-account bleeding
        clearTenantStorage();
        setToken(receivedToken);
        setAdmin(receivedAdmin);
        localStorage.setItem('gc_token', receivedToken);
        localStorage.setItem('gc_admin', JSON.stringify(receivedAdmin));
        if (rememberMe) {
          localStorage.setItem('gc_remember_email', email);
        } else {
          localStorage.removeItem('gc_remember_email');
        }
        return receivedAdmin;
      }
      throw new Error(res.data?.message || 'Login failed.');
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Authentication failed. Please verify your credentials.';
      const customError = new Error(message);
      customError.response = err.response;
      throw customError;
    }
  };

  const demoLogin = async () => {
    try {
      const res = await authAPI.demoLogin();
      if (res.data && res.data.success) {
        const { token: receivedToken, admin: receivedAdmin } = res.data;
        // Cleanse any prior tenant or user cache to guarantee zero cross-account bleeding
        clearTenantStorage();
        setToken(receivedToken);
        setAdmin(receivedAdmin);
        localStorage.setItem('gc_token', receivedToken);
        localStorage.setItem('gc_admin', JSON.stringify(receivedAdmin));
        return receivedAdmin;
      }
      throw new Error(res.data?.message || 'Demo login failed.');
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to initialize demo workspace.';
      const customError = new Error(message);
      customError.response = err.response;
      throw customError;
    }
  };

  const registerCompany = async (companyData) => {
    try {
      const res = await authAPI.registerCompany(companyData);
      if (res.data && res.data.success) {
        const { token: receivedToken, admin: receivedAdmin } = res.data;
        // Cleanse any prior tenant or user cache to guarantee zero cross-account bleeding
        clearTenantStorage();
        setToken(receivedToken);
        setAdmin(receivedAdmin);
        localStorage.setItem('gc_token', receivedToken);
        localStorage.setItem('gc_admin', JSON.stringify(receivedAdmin));
        return receivedAdmin;
      }
      throw new Error(res.data?.message || 'Company registration failed.');
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Registration failed. Please check your inputs.';
      const customError = new Error(message);
      customError.response = err.response;
      throw customError;
    }
  };

  const acceptInvitation = async (invitationPayload) => {
    try {
      const res = await authAPI.acceptInvitation(invitationPayload);
      if (res.data && res.data.success) {
        const { token: receivedToken, admin: receivedAdmin } = res.data;
        // Cleanse any prior tenant or user cache to guarantee zero cross-account bleeding
        clearTenantStorage();
        setToken(receivedToken);
        setAdmin(receivedAdmin);
        localStorage.setItem('gc_token', receivedToken);
        localStorage.setItem('gc_admin', JSON.stringify(receivedAdmin));
        return receivedAdmin;
      }
      throw new Error(res.data?.message || 'Failed to accept invitation.');
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Invitation acceptance failed.';
      const customError = new Error(message);
      customError.response = err.response;
      throw customError;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // Proceed with local logout regardless
    }
    clearTenantStorage();
    setToken(null);
    setAdmin(null);
  };

  const updateCurrentAdmin = (updatedData) => {
    setAdmin((prev) => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('gc_admin', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        loading,
        login,
        demoLogin,
        registerCompany,
        acceptInvitation,
        logout,
        updateCurrentAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
