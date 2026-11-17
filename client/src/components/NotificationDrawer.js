import React from 'react';
import { X, Bell, AlertTriangle, Info, CheckCheck, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NotificationDrawer = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs select-none">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#172337] border-l border-[#2B3B52] shadow-2xl flex flex-col text-[#F8FAFC]">
          {/* Header */}
          <div className="p-4 bg-[#111C30] border-b border-[#2B3B52] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#3B82F6]/20 text-[#60A5FA]">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-[#F8FAFC] text-sm">
                Incident & Dispatch Alerts
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-[#60A5FA] hover:text-[#3B82F6] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#1E2D43] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {(!notifications || notifications.length === 0) ? (
              <div className="text-center py-12 text-[#A8B6C9] text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No active notifications
              </div>
            ) : (
              notifications.map((item) => {
                const isCritical = item.severity === 'critical' || item.type === 'SOS';
                const isWarning = item.severity === 'warning';
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-colors text-xs ${
                      item.isRead
                        ? 'bg-[#1E2D43]/60 border-[#2B3B52] opacity-60'
                        : isCritical
                        ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#F8FAFC]'
                        : isWarning
                        ? 'bg-[#FBBF24]/15 border-[#FBBF24]/30 text-[#F8FAFC]'
                        : 'bg-[#1E2D43] border-[#2B3B52] text-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {isCritical ? (
                          <ShieldAlert className="w-4 h-4 text-[#F87171] shrink-0" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-[#60A5FA] shrink-0" />
                        )}
                        <span>{item.title}</span>
                      </div>
                      <span className="text-[10px] text-[#A8B6C9] shrink-0">
                        {item.time}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[#A8B6C9]">
                      {item.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-[#2B3B52]">
                      <span className="font-medium text-[#A8B6C9]">
                        {item.location}
                      </span>
                      {!item.isRead && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          className="text-[#60A5FA] hover:underline font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
