import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';

// Core Layout & Modals
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import NotificationDrawer from './components/NotificationDrawer';
import CallGuardModal from './components/CallGuardModal';

// All 11 AutoGuard Modules & Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AcceptInvitation from './pages/AcceptInvitation';
import Dashboard from './pages/Dashboard';
import PlatformAdmin from './pages/PlatformAdmin';
import CompanyManagement from './pages/CompanyManagement';
import AdminManagement from './pages/AdminManagement';
import Guards from './pages/Guards';
import Shifts from './pages/Shifts';
import Attendance from './pages/Attendance';
import FieldOperations from './pages/FieldOperations';
import Supervisors from './pages/Supervisors';
import CallVerification from './pages/CallVerification';
import Workforce from './pages/Workforce';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import ChangePassword from './pages/ChangePassword';

// Protected Layout with Navigation & Modals
const ProtectedLayout = ({ children }) => {
  const { isAuthenticated, loading, admin } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B1220] text-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#A8B6C9] font-medium">Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (admin?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B1220] text-[#F8FAFC] font-sans antialiased">
      {/* AutoGuard Compact Enterprise Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {(admin?.isDemo || admin?.role === 'demo_user') && (
          <div className="bg-amber-950/80 border-b border-amber-600/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px] uppercase tracking-wider">
                Demo Workspace
              </span>
              <span className="text-[11px] text-amber-200/90">
                Read-Only Mode: Exploring with isolated sample data. Record modifications are disabled.
              </span>
            </div>
            <span className="text-[10px] text-amber-400/80 hidden sm:inline">AutoGuard Live Preview</span>
          </div>
        )}
        <Header onOpenNotifications={() => setIsNotificationsOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[#0B1220] text-[#F8FAFC]">
          <div className="w-full pb-10">
            {children}
          </div>
        </main>
      </div>

      {/* Slide-over Incident & Dispatch Alerts Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Senior Telephony Voice Verification Simulation Modal */}
      <CallGuardModal />
    </div>
  );
};

// Route Switcher
const AppRoutes = () => {
  const { isAuthenticated, loading, admin } = useAuth();
  const isSuperAdmin = admin?.role === 'super_admin' || admin?.role === 'platform_admin';
  const mustChangePassword = Boolean(admin?.mustChangePassword);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !loading && isAuthenticated ? (
            mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : isSuperAdmin ? (
              <Navigate to="/company-management" replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/change-password"
        element={
          loading ? (
            <div className="flex h-screen w-full items-center justify-center bg-[#0B1220] text-[#F8FAFC]">
              <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : !mustChangePassword ? (
            <Navigate to="/" replace />
          ) : (
            <ChangePassword />
          )
        }
      />
      <Route
        path="/register"
        element={<Navigate to="/login" replace />}
      />
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

      {/* Level 1: Company Management (Platform Administrator Only) */}
      <Route
        path="/company-management"
        element={
          !loading && isAuthenticated && !isSuperAdmin ? (
            <Navigate to="/" replace />
          ) : (
            <ProtectedLayout>
              <CompanyManagement />
            </ProtectedLayout>
          )
        }
      />

      {/* Alias /platform-admin to /company-management */}
      <Route
        path="/platform-admin"
        element={<Navigate to="/company-management" replace />}
      />

      {/* 1. Overview Dashboard (Company Owner / Staff Workspace; Super Admin redirected to Company Management) */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            {isSuperAdmin ? <Navigate to="/company-management" replace /> : <Dashboard />}
          </ProtectedLayout>
        }
      />

      {/* 2. Admin & Staff Management */}
      <Route
        path="/admin-management"
        element={
          <ProtectedLayout>
            <AdminManagement />
          </ProtectedLayout>
        }
      />
      <Route path="/staff-management" element={<Navigate to="/admin-management" replace />} />
      <Route path="/team-management" element={<Navigate to="/admin-management" replace />} />

      {/* 3. Guard Management */}
      <Route
        path="/guards"
        element={
          <ProtectedLayout>
            <Guards />
          </ProtectedLayout>
        }
      />

      {/* 4. Shift Management */}
      <Route
        path="/shifts"
        element={
          <ProtectedLayout>
            <Shifts />
          </ProtectedLayout>
        }
      />

      {/* 5. Attendance Management */}
      <Route
        path="/attendance"
        element={
          <ProtectedLayout>
            <Attendance />
          </ProtectedLayout>
        }
      />

      {/* 6. Field Operations & Operational Sites */}
      <Route
        path="/field-operations"
        element={
          <ProtectedLayout>
            <FieldOperations />
          </ProtectedLayout>
        }
      />
      <Route
        path="/sites"
        element={<Navigate to="/field-operations" replace />}
      />

      {/* Supervisors Management */}
      <Route
        path="/supervisors"
        element={
          <ProtectedLayout>
            <Supervisors />
          </ProtectedLayout>
        }
      />

      {/* 7. Call Verification (Senior Telephony Integration Hub) */}
      <Route
        path="/call-verification"
        element={
          <ProtectedLayout>
            <CallVerification />
          </ProtectedLayout>
        }
      />

      {/* 8. Workforce Management */}
      <Route
        path="/workforce"
        element={
          <ProtectedLayout>
            <Workforce />
          </ProtectedLayout>
        }
      />

      {/* 9. Reports & Analytics */}
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <Reports />
          </ProtectedLayout>
        }
      />

      {/* 10. Document Management */}
      <Route
        path="/documents"
        element={
          <ProtectedLayout>
            <Documents />
          </ProtectedLayout>
        }
      />

      {/* 11. System Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <Settings />
          </ProtectedLayout>
        }
      />

      {/* Fallback to Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}
