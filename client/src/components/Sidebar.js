import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  UserCheck,
  UserCog,
  CalendarClock,
  ClipboardCheck,
  PhoneCall,
  BarChart3,
  Settings,
  LogOut,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { isSidebarCollapsed, toggleSidebar, currentUser, company } = useApp();
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = admin?.role === 'super_admin' || admin?.role === 'platform_admin';
  const isCompanyAdmin =
    admin?.role === 'company_owner' ||
    admin?.role === 'company_admin' ||
    admin?.role === 'admin';

  // Role-specific navigation items
  const navItems = isSuperAdmin
    ? [
        { name: 'Company Management', path: '/company-management', icon: Building2 },
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    : [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        ...(isCompanyAdmin
          ? [{ name: 'Staff Management', path: '/admin-management', icon: UserCog }]
          : []),
        { name: 'Guard Management', path: '/guards', icon: Users },
        { name: 'Operational Sites', path: '/field-operations', icon: Building2 },
        { name: 'Supervisors', path: '/supervisors', icon: UserCheck },
        { name: 'Duty Management', path: '/shifts', icon: CalendarClock },
        { name: 'Attendance', path: '/attendance', icon: ClipboardCheck },
        { name: 'Call Records', path: '/call-verification', icon: PhoneCall },
        { name: 'Reports', path: '/reports', icon: BarChart3 },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {!isSidebarCollapsed && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Modern AutoGuard Enterprise Sidebar */}
      <aside
        className={`${
          isSidebarCollapsed
            ? '-translate-x-full md:translate-x-0 md:w-[72px]'
            : 'fixed inset-y-0 left-0 z-40 md:relative md:z-20 w-64 translate-x-0'
        } bg-[#0F172A] text-[#94A3B8] flex flex-col shrink-0 border-r border-[#2B3B52] h-full select-none transition-all duration-300 ease-in-out shadow-xl md:shadow-none`}
      >
        {/* Header / Brand Identity */}
        <div className="h-16 px-4 border-b border-[#2B3B52] flex items-center justify-between gap-3 bg-[#0F172A] shrink-0">
          <div className={`flex items-center ${isSidebarCollapsed ? 'md:justify-center w-full' : 'gap-3 min-w-0'}`}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden min-w-0 flex-1">
                <span className="font-bold text-base tracking-tight text-[#F8FAFC] block leading-tight truncate">
                  AutoGuard
                </span>
                <p className="text-[11px] text-[#94A3B8] font-medium truncate leading-tight mt-0.5">
                  {isSuperAdmin ? 'Platform Administration' : (company?.name || 'Security Operations')}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] border border-transparent hover:border-[#2B3B52] transition-colors cursor-pointer"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] md:hidden cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed State Quick Expand Button (Desktop Only) */}
        {isSidebarCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-[#2B3B52]/40 bg-[#0F172A]">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {!isSidebarCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
              Main Menu
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-3' : 'px-3.5 py-2.5 gap-3'
                  } rounded-xl text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                  }`
                }
                title={isSidebarCollapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    {/* Subtle active indicator accent on left edge */}
                    {isActive && !isSidebarCollapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
                    )}

                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                      }`}
                    />

                    {!isSidebarCollapsed && (
                      <span className="truncate leading-tight text-[13px] font-medium tracking-tight">
                        {item.name}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3.5 border-t border-[#2B3B52] bg-[#0B1220] shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={
                    currentUser?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser?.name || 'Admin'}
                  className="w-8 h-8 rounded-full object-cover border border-[#2B3B52] shrink-0"
                />
                <div className="overflow-hidden min-w-0">
                  <span className="font-semibold text-xs text-[#F8FAFC] block truncate leading-tight">
                    {admin?.fullName || currentUser?.name || (isSuperAdmin ? 'Head Admin' : 'Company Admin')}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block truncate leading-tight mt-0.5">
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
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] transition-colors cursor-pointer shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
