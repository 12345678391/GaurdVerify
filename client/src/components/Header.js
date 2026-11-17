import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const Header = ({ onOpenNotifications }) => {
  const {
    toggleSidebar,
    currentUser,
    notifications,
  } = useApp();
  const { admin, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Clean Route Breadcrumb & Title Mapping
  const routeMeta = {
    '/': { title: 'Agency Dashboard', breadcrumb: 'Dashboard' },
    '/company-management': { title: 'Company Management', breadcrumb: 'Platform / Companies' },
    '/platform-admin': { title: 'Platform Company Administration', breadcrumb: 'Platform / Companies' },
    '/guards': { title: 'Guard Management', breadcrumb: 'Guard Management' },
    '/shifts': { title: 'Duty Management', breadcrumb: 'Duty Management' },
    '/attendance': { title: 'Attendance Register', breadcrumb: 'Attendance' },
    '/call-verification': { title: 'Call Records & Verification', breadcrumb: 'Call Records' },
    '/reports': { title: 'Agency Reports & Summary', breadcrumb: 'Reports' },
    '/settings': { title: 'System & Agency Settings', breadcrumb: 'Settings' },
    '/admin-management': { title: 'Admin & Staff Management', breadcrumb: 'Settings / Staff' },
    '/field-operations': { title: 'Client Sites & Locations', breadcrumb: 'Settings / Sites' },
    '/documents': { title: 'Document & PSARA Compliance', breadcrumb: 'Settings / Documents' },
    '/workforce': { title: 'Workforce Overview', breadcrumb: 'Reports / Workforce' },
  };

  const currentMeta = routeMeta[location.pathname] || {
    title: 'Agency Dashboard',
    breadcrumb: 'Dashboard',
  };

  const unreadCount = notifications ? notifications.filter((n) => !n.isRead).length : 0;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/guards?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-[#111C30] border-b border-[#2B3B52] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none shadow-md">
      {/* 1. Sidebar Toggle, Breadcrumbs & Current Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] transition-colors"
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <nav className="flex items-center gap-1.5 text-xs text-[#A8B6C9] font-normal">
            <span>AutoGuard</span>
            <span>/</span>
            <span className="text-[#60A5FA] font-medium">{currentMeta.breadcrumb}</span>
          </nav>
          <h1 className="text-base font-semibold text-[#F8FAFC] leading-tight">
            {currentMeta.title}
          </h1>
        </div>
      </div>

      {/* 2. Global Search */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center w-72 lg:w-96 relative"
      >
        <Search className="w-4 h-4 text-[#A8B6C9] absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search guards, mobile, site..."
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#2B3B52] bg-[#172337] text-[#F8FAFC] placeholder:text-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] transition-colors"
        />
      </form>

      {/* 3. Notifications & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] transition-colors"
          title="Alerts & Missed Calls"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#EF4444] text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#2B3B52] hidden sm:block" />

        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#1E2D43] transition-colors"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Admin'}
              className="w-8 h-8 rounded-full object-cover border border-[#2B3B52]"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#F8FAFC] leading-tight">
                {admin?.fullName || currentUser?.name || 'Administrator'}
              </span>
              <span className="text-[10px] text-[#A8B6C9] leading-tight">
                {admin?.role === 'super_admin'
                  ? 'Head Admin'
                  : admin?.role === 'platform_admin'
                  ? 'Platform Admin'
                  : admin?.role === 'company_owner'
                  ? 'Company Owner'
                  : admin?.role === 'demo_user' || admin?.isDemo
                  ? 'Demo User (Read-Only)'
                  : 'Company Admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#A8B6C9] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#172337] border border-[#2B3B52] shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-4 py-2 border-b border-[#2B3B52]">
                <p className="font-semibold text-[#F8FAFC]">{admin?.fullName || currentUser?.name}</p>
                <p className="text-[11px] text-[#A8B6C9] truncate">{admin?.email || currentUser?.email}</p>
              </div>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-2 text-left text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Agency Settings</span>
              </button>

              {admin?.role !== 'super_admin' && admin?.role !== 'platform_admin' ? (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/admin-management');
                  }}
                  className="w-full px-4 py-2 text-left text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Supervisors & Staff</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/company-management');
                  }}
                  className="w-full px-4 py-2 text-left text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Manage Companies</span>
                </button>
              )}

              <div className="border-t border-[#2B3B52] my-1" />

              <button
                onClick={async () => {
                  setProfileOpen(false);
                  await logout();
                  navigate('/login');
                }}
                className="w-full px-4 py-2 text-left text-[#F87171] hover:bg-[#1E2D43] flex items-center gap-2 font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
