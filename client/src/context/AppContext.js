import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { guardsAPI, shiftsAPI, sitesAPI, supervisorsAPI, callsAPI, attendanceAPI, companyAPI } from '../services/api';
import {
  initialCompany,
  initialAdmins,
  initialLocations,
  initialShifts,
  initialGuards,
  initialDocuments,
  initialNotifications,
} from '../data/mockData';

// Helper to normalize backend CallLog objects into UI-friendly format
export const mapBackendCallLog = (log) => {
  const initiationDate = log.initiationTime ? new Date(log.initiationTime) : (log.createdAt ? new Date(log.createdAt) : null);
  const dateStr = initiationDate ? initiationDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const timeStr = initiationDate ? initiationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  let dtmfLabel = 'Awaiting verification call';
  if (log.dtmfResponse === '1') {
    dtmfLabel = 'Keypad [1] — Duty Confirmed';
  } else if (log.dtmfResponse === '2') {
    dtmfLabel = 'Keypad [2] — SOS Alert';
  } else if (log.verificationResult === 'CONFIRMED') {
    dtmfLabel = 'Keypad [1] — Confirmed';
  } else if (log.verificationResult === 'ASSISTANCE_REQUESTED') {
    dtmfLabel = 'Keypad [2] — SOS Alert';
  } else if (log.verificationResult === 'MISSED') {
    dtmfLabel = 'Unanswered (Timeout)';
  } else if (log.verificationResult === 'FAILED') {
    dtmfLabel = 'Call Failed';
  } else if (log.notes) {
    dtmfLabel = log.notes;
  }

  let formattedStatus = 'Pending';
  if (log.verificationResult === 'CONFIRMED') {
    formattedStatus = 'Duty Confirmed';
  } else if (log.verificationResult === 'ASSISTANCE_REQUESTED') {
    formattedStatus = 'Emergency SOS';
  } else if (log.verificationResult === 'MISSED') {
    formattedStatus = 'No Answer';
  } else if (log.verificationResult === 'FAILED') {
    formattedStatus = 'Failed';
  }

  return {
    ...log,
    id: log.callId || `CALL-${log._id}`,
    guardId: log.guardId?.guardId || log.guardId?.employeeId || (typeof log.guardId === 'string' ? log.guardId : 'N/A'),
    guardName: log.guardId?.fullName || log.guardName || 'Security Guard',
    phone: log.destinationNumber || log.guardId?.mobileNumber || log.phone || 'N/A',
    location: log.siteId?.siteName || log.location || 'Assigned Site',
    date: dateStr,
    time: timeStr,
    duration: `${log.durationSeconds || 0}s`,
    result: log.callStatus || 'Initiated',
    guardResponse: dtmfLabel,
    verificationStatus: formattedStatus,
    callerId: log.callerNumber || '+91 124 489-2100',
    isSimulated: Boolean(log.isSimulated),
  };
};

// Helper to normalize backend AttendanceRecord objects into UI-friendly format
export const mapBackendAttendance = (att) => {
  const checkInStr = att.firstVerificationTime
    ? new Date(att.firstVerificationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  let vStatus = 'Pending';
  if (att.totalConfirmedCalls > 0) {
    vStatus = 'Confirmed';
  } else if (att.totalMissedCalls > 0) {
    vStatus = 'Unanswered (Retry in 5m)';
  } else if (att.totalAssistanceRequests > 0) {
    vStatus = 'Emergency SOS';
  }

  return {
    ...att,
    id: att._id,
    guardId: att.guardId?.guardId || att.guardId?.employeeId || (typeof att.guardId === 'string' ? att.guardId : 'N/A'),
    guardName: att.guardId?.fullName || 'Security Guard',
    phone: att.guardId?.mobileNumber || '—',
    location: att.siteId?.siteName || 'Assigned Site',
    shiftStartTime: att.shiftId ? `${att.shiftId.startTime} - ${att.shiftId.endTime}` : '06:00 - 14:00',
    actualCheckIn: checkInStr,
    status: att.dutyStatus || 'Present',
    verificationStatus: vStatus,
  };
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { admin } = useAuth();

  // Theme state: default enterprise clean light
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ag_theme') || 'light';
  });

  // Collapsible sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ag_sidebar_collapsed') === 'true';
  });

  // Current logged in user (null by default; populated strictly from authenticated backend admin)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ag_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Company details (null by default; populated from authenticated user's company)
  const [company, setCompany] = useState(() => {
    try {
      const saved = localStorage.getItem('ag_company');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const lastCompanyIdRef = React.useRef(null);

  // Synchronize currentUser and company with real authenticated admin from AuthContext
  useEffect(() => {
    if (admin) {
      const currentCompanyId = admin.companyId?._id || admin.companyId || admin.company?._id || (admin.role === 'super_admin' ? 'super_admin' : null);
      if (lastCompanyIdRef.current && lastCompanyIdRef.current !== currentCompanyId) {
        // Authenticated company changed! Immediately purge previous tenant data from state and storage
        setGuards([]);
        setLocations([]);
        setShifts([]);
        setCallLogs([]);
        setAttendance([]);
        setNotifications([]);
        setSupervisors([]);
        setAdmins([]);
        localStorage.removeItem('ag_guards');
        localStorage.removeItem('ag_locations');
        localStorage.removeItem('ag_shifts');
        localStorage.removeItem('ag_call_logs');
        localStorage.removeItem('ag_attendance');
        localStorage.removeItem('ag_notifications');
        localStorage.removeItem('ag_supervisors');
        localStorage.removeItem('ag_admins');
      }
      lastCompanyIdRef.current = currentCompanyId;

      const profile = {
        ...admin,
        name: admin.fullName || admin.name || 'Company Administrator',
        avatar:
          admin.avatar ||
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      };
      setCurrentUser(profile);
      if (admin.company) {
        setCompany(admin.company);
      }
    } else {
      lastCompanyIdRef.current = null;
      setCurrentUser(null);
      setCompany(null);
      setGuards([]);
      setLocations([]);
      setShifts([]);
      setCallLogs([]);
      setAttendance([]);
      setNotifications([]);
      setSupervisors([]);
      setAdmins([]);
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
    }
  }, [admin]);

  // Synchronize company guards strictly from MongoDB backend for multi-tenant isolation
  useEffect(() => {
    const fetchCompanyGuards = async () => {
      if (admin) {
        try {
          const res = await guardsAPI.getAll({ limit: 100, includeArchived: true });
          if (res.data && res.data.success && Array.isArray(res.data.data)) {
            const mapped = res.data.data.map((g) => ({
              ...g,
              _id: g._id,
              id: g.guardId || g._id,
              guardId: g.guardId || g._id,
              name: g.fullName,
              phone: g.mobileNumber,
              email: g.email || '',
              address: g.residentialAddress || '',
              emergencyContact: g.emergencyContactNumber || '',
              designation: g.designation || 'Security Guard',
              assignedLocation: g.assignedSite?.siteName || g.city || 'Unassigned Site',
              currentShift: g.assignedShift?.shiftName || 'Unassigned Shift',
              attendanceStatus: g.attendanceStatus || 'Confirmed',
              employmentStatus:
                g.isDeleted || g.employmentStatus === 'Inactive' || g.employmentStatus === 'Archived'
                  ? 'Archived'
                  : (g.employmentStatus || 'Active'),
              avatar:
                g.profilePhotoUrl ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
            }));
            setGuards(mapped);
          }
        } catch (err) {
          console.warn('[AppContext] Could not fetch tenant guards from API:', err.message);
        }
      }
    };
    fetchCompanyGuards();
  }, [admin]);

  // Synchronize company shifts and sites strictly from MongoDB backend for multi-tenant isolation
  useEffect(() => {
    const fetchCompanyShiftsAndSites = async () => {
      if (admin) {
        try {
          const [shiftsRes, sitesRes, supervisorsRes, membersRes] = await Promise.all([
            shiftsAPI.getAll(),
            sitesAPI.getAll(),
            supervisorsAPI.getAll(),
            companyAPI.getMembers().catch(() => ({ data: { success: false, data: [] } })),
          ]);
          if (shiftsRes.data && shiftsRes.data.success && Array.isArray(shiftsRes.data.data)) {
            const mappedShifts = shiftsRes.data.data.map((s) => ({
              ...s,
              id: s._id,
              shiftId: s.shiftId,
              name: s.shiftName,
              startTime: s.startTime,
              endTime: s.endTime,
              status: s.isActive ? 'Active' : 'Inactive',
              assignedGuardsCount: s.guardCount || 0,
            }));
            setShifts(mappedShifts);
          }
          if (sitesRes.data && sitesRes.data.success && Array.isArray(sitesRes.data.data)) {
            const mappedSites = sitesRes.data.data.map((l) => ({
              ...l,
              id: l._id,
              _id: l._id,
              siteId: l.siteId,
              name: l.siteName,
              address: l.address,
              city: l.city,
              state: l.state,
              contactNumber: l.contactNumber,
              guardCapacity: l.guardCapacity || 5,
              totalGuards: l.guardCapacity || 5,
              activeGuards: l.guardCount || 0,
              guardCount: l.guardCount || 0,
              supervisor: l.assignedSupervisor
                ? (l.assignedSupervisor.fullName || l.assignedSupervisor.name || 'Assigned')
                : (typeof l.supervisor === 'string' ? l.supervisor : 'Unassigned'),
              assignedSupervisor: l.assignedSupervisor,
              currentShift: l.currentShift || 'General Shift',
              status: l.status || (l.isDeleted ? 'Inactive' : 'Operational'),
              attentionNeeded: false,
              isDeleted: l.isDeleted || false,
            }));
            setLocations(mappedSites);
          }
          if (supervisorsRes.data && supervisorsRes.data.success && Array.isArray(supervisorsRes.data.data)) {
            const mappedSupervisors = supervisorsRes.data.data.map((s) => ({
              ...s,
              id: s._id,
              _id: s._id,
              supervisorId: s.supervisorId,
              name: s.fullName,
              fullName: s.fullName,
              email: s.email || '',
              phone: s.mobileNumber,
              mobileNumber: s.mobileNumber,
              assignedSites: Array.isArray(s.assignedSites) ? s.assignedSites : [],
              employmentStatus: s.employmentStatus || 'Active',
              status: s.employmentStatus || 'Active',
              alertPreferences: s.alertPreferences || { sms: true, call: true, email: true },
              guardCount: s.guardCount || 0,
              isDeleted: s.isDeleted || false,
            }));
            setSupervisors(mappedSupervisors);
          }
          if (membersRes.data && membersRes.data.success && Array.isArray(membersRes.data.data)) {
            const mappedMembers = membersRes.data.data.map((m) => ({
              ...m,
              id: m._id,
              _id: m._id,
              name: m.fullName,
              fullName: m.fullName,
              email: m.email,
              phone: m.phone || '',
              role: m.role,
              accessStatus: m.isActive ? 'Active' : 'Inactive',
              isActive: m.isActive,
              mustChangePassword: Boolean(m.mustChangePassword),
              lastLogin: m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
            }));
            setAdmins(mappedMembers);
          }
        } catch (err) {
          console.warn('[AppContext] Failed to fetch company operations data:', err.message);
        }
      }
    };
    fetchCompanyShiftsAndSites();
  }, [admin]);

  // Guards
  const [guards, setGuards] = useState(() => {
    const token = localStorage.getItem('gc_token');
    if (!token) return [];
    const saved = localStorage.getItem('ag_guards');
    return saved ? JSON.parse(saved) : [];
  });

  // Locations
  const [locations, setLocations] = useState(() => {
    const token = localStorage.getItem('gc_token');
    if (!token) return [];
    const saved = localStorage.getItem('ag_locations');
    return saved ? JSON.parse(saved) : [];
  });

  // Supervisors
  const [supervisors, setSupervisors] = useState(() => {
    const token = localStorage.getItem('gc_token');
    if (!token) return [];
    const saved = localStorage.getItem('ag_supervisors');
    return saved ? JSON.parse(saved) : [];
  });

  // Shifts
  const [shifts, setShifts] = useState(() => {
    const token = localStorage.getItem('gc_token');
    if (!token) return [];
    const saved = localStorage.getItem('ag_shifts');
    return saved ? JSON.parse(saved) : [];
  });

  // Attendance (dynamically populated from MongoDB backend, in-memory for tenant safety)
  const [attendance, setAttendance] = useState([]);

  // Call Logs (dynamically populated from MongoDB backend, in-memory for tenant safety)
  const [callLogs, setCallLogs] = useState([]);

  // Synchronize company call logs strictly from MongoDB backend
  const fetchTenantCallLogs = useCallback(async (params = { limit: 100 }) => {
    if (admin) {
      try {
        const res = await callsAPI.getHistory(params);
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          const mapped = res.data.data.map(mapBackendCallLog);
          setCallLogs(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[AppContext] Failed to fetch call logs:', err.message);
      }
    }
    return [];
  }, [admin]);

  // Synchronize company attendance strictly from MongoDB backend
  const fetchTenantAttendance = useCallback(async (params = { limit: 100 }) => {
    if (admin) {
      try {
        const res = await attendanceAPI.getAttendance(params);
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          const mapped = res.data.data.map(mapBackendAttendance);
          setAttendance(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[AppContext] Failed to fetch attendance:', err.message);
      }
    }
    return [];
  }, [admin]);

  // Load live call logs and attendance when admin logs in
  useEffect(() => {
    if (admin) {
      fetchTenantCallLogs();
      fetchTenantAttendance();
    }
  }, [admin, fetchTenantCallLogs, fetchTenantAttendance]);

  // Documents
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('ag_documents');
    return saved ? JSON.parse(saved) : [];
  });

  // Admins
  const [admins, setAdmins] = useState(() => {
    const saved = localStorage.getItem('ag_admins');
    return saved ? JSON.parse(saved) : [];
  });

  // Notifications
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('ag_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Global Call Guard Simulator State
  const [callModalState, setCallModalState] = useState({
    isOpen: false,
    guard: null,
    step: 'confirm', // 'confirm' | 'calling' | 'outcome'
    simulatedOutcome: null,
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ag_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ag_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (admin) {
      localStorage.setItem('ag_guards', JSON.stringify(guards));
    }
  }, [guards, admin]);

  useEffect(() => {
    if (admin) {
      localStorage.setItem('ag_locations', JSON.stringify(locations));
    }
  }, [locations, admin]);

  useEffect(() => {
    if (admin) {
      localStorage.setItem('ag_supervisors', JSON.stringify(supervisors));
    }
  }, [supervisors, admin]);

  useEffect(() => {
    if (admin) {
      localStorage.setItem('ag_shifts', JSON.stringify(shifts));
    }
  }, [shifts, admin]);

  useEffect(() => {
    localStorage.setItem('ag_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('ag_admins', JSON.stringify(admins));
  }, [admins]);

  useEffect(() => {
    localStorage.setItem('ag_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ag_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ag_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (company) {
      localStorage.setItem('ag_company', JSON.stringify(company));
    } else {
      localStorage.removeItem('ag_company');
    }
  }, [company]);

  // Actions
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ag_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Guard Actions
  const addGuard = async (guardData) => {
    let savedGuard = null;
    let errorMessage = null;
    try {
      const payload = {
        fullName: (guardData.name || guardData.fullName || '').trim(),
        mobileNumber: (guardData.phone || guardData.mobileNumber || '').trim(),
        residentialAddress: guardData.address || guardData.residentialAddress || 'Headquarters Post',
        emergencyContactNumber: guardData.emergencyContact || guardData.emergencyContactNumber,
        designation: guardData.designation || 'Security Guard',
        employmentStatus: guardData.employmentStatus || 'Active',
      };
      if (guardData.email) {
        payload.email = guardData.email;
      }
      if (guardData.avatar) {
        payload.profilePhotoUrl = guardData.avatar;
      }

      // Link assignedSite ObjectId if matched from company locations
      if (guardData.assignedLocation) {
        const matchedSite = locations.find(
          (loc) => loc.name === guardData.assignedLocation || loc._id === guardData.assignedLocation || loc.id === guardData.assignedLocation
        );
        if (matchedSite && matchedSite._id) {
          payload.assignedSite = matchedSite._id;
        }
      }

      // Link assignedShift ObjectId if matched from company shifts
      if (guardData.currentShift) {
        const matchedShift = shifts.find(
          (sh) => guardData.currentShift.includes(sh.name) || sh._id === guardData.currentShift || sh.id === guardData.currentShift
        );
        if (matchedShift && matchedShift._id) {
          payload.assignedShift = matchedShift._id;
        }
      }

      const res = await guardsAPI.create(payload);
      if (res.data && res.data.success) {
        savedGuard = res.data.data;
      } else {
        throw new Error(res.data?.message || 'Failed to create guard.');
      }
    } catch (err) {
      errorMessage = err.response?.data?.message || err.message;
      console.warn('[AppContext] Guard creation via API failed:', errorMessage);
      return { success: false, message: errorMessage };
    }

    const nextId = savedGuard.guardId || `GC-GRD-${1000 + guards.length + 1}`;
    const newGuard = {
      ...guardData,
      _id: savedGuard._id,
      id: nextId,
      guardId: nextId,
      name: savedGuard.fullName || guardData.name,
      phone: savedGuard.mobileNumber || guardData.phone,
      email: savedGuard.email || guardData.email || '',
      address: savedGuard.residentialAddress || guardData.address || '',
      emergencyContact: savedGuard.emergencyContactNumber || guardData.emergencyContact || '',
      designation: savedGuard.designation || guardData.designation || 'Security Guard',
      assignedLocation: savedGuard.assignedSite?.siteName || guardData.assignedLocation || 'Unassigned Site',
      currentShift: savedGuard.assignedShift?.shiftName || guardData.currentShift || 'Unassigned Shift',
      attendanceStatus: savedGuard.attendanceStatus || guardData.attendanceStatus || 'Confirmed',
      employmentStatus: savedGuard.employmentStatus || guardData.employmentStatus || 'Active',
      callStatus: 'Pending Verification',
      performanceRating: '5.0 / 5.0',
      totalShiftsCompleted: 0,
      missedCallsCount: 0,
      sosCount: 0,
      avatar:
        savedGuard.profilePhotoUrl ||
        guardData.avatar ||
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    };

    setGuards((prev) => [newGuard, ...prev]);

    // Add activity notification
    addNotification({
      type: 'GUARD',
      severity: 'info',
      title: `New Guard Registered: ${newGuard.name}`,
      message: `${newGuard.name} (${newGuard.id}) added to roster at ${newGuard.assignedLocation || 'Main Duty Station'}.`,
      location: newGuard.assignedLocation || 'Main Duty Station',
    });
    return { success: true, data: newGuard };
  };

  const updateGuard = async (id, updatedFields) => {
    // 1. Locate the existing guard in state
    const existingGuard = guards.find((g) => g.id === id || g.guardId === id || g._id === id);
    if (!existingGuard) {
      console.error('[AppContext] Guard not found for update:', id);
      return { success: false, message: 'Guard not found.' };
    }

    // 2. Identify the target ID for the API
    const targetId = existingGuard._id || existingGuard.guardId || id;

    // 3. Prepare payload mapping frontend fields to backend schema
    const payload = {};
    if (updatedFields.name !== undefined || updatedFields.fullName !== undefined) {
      payload.fullName = (updatedFields.name || updatedFields.fullName || '').trim();
    }
    if (updatedFields.phone !== undefined || updatedFields.mobileNumber !== undefined) {
      payload.mobileNumber = (updatedFields.phone || updatedFields.mobileNumber || '').trim();
    }
    if (updatedFields.email !== undefined) {
      payload.email = updatedFields.email;
    }
    if (updatedFields.address !== undefined || updatedFields.residentialAddress !== undefined) {
      payload.residentialAddress = updatedFields.address || updatedFields.residentialAddress;
    }
    if (updatedFields.emergencyContact !== undefined || updatedFields.emergencyContactNumber !== undefined) {
      payload.emergencyContactNumber = updatedFields.emergencyContact || updatedFields.emergencyContactNumber;
    }
    if (updatedFields.designation !== undefined) {
      payload.designation = updatedFields.designation;
    }
    if (updatedFields.employmentStatus !== undefined) {
      payload.employmentStatus = updatedFields.employmentStatus;
    }
    if (updatedFields.avatar !== undefined || updatedFields.profilePhotoUrl !== undefined) {
      payload.profilePhotoUrl = updatedFields.avatar || updatedFields.profilePhotoUrl;
    }

    // Link assignedSite ObjectId if matched from company locations
    if (updatedFields.assignedLocation) {
      const matchedSite = locations.find(
        (loc) => loc.name === updatedFields.assignedLocation || loc._id === updatedFields.assignedLocation || loc.id === updatedFields.assignedLocation
      );
      if (matchedSite && matchedSite._id) {
        payload.assignedSite = matchedSite._id;
      }
    }

    // Link assignedShift ObjectId if matched from company shifts
    if (updatedFields.currentShift) {
      const matchedShift = shifts.find(
        (sh) => updatedFields.currentShift.includes(sh.name) || sh._id === updatedFields.currentShift || sh.id === updatedFields.currentShift
      );
      if (matchedShift && matchedShift._id) {
        payload.assignedShift = matchedShift._id;
      }
    }

    try {
      const res = await guardsAPI.update(targetId, payload);
      if (res.data && res.data.success && res.data.data) {
        const saved = res.data.data;
        const normalizedGuard = {
          ...existingGuard,
          ...saved,
          id: saved.guardId || existingGuard.id || id,
          guardId: saved.guardId || existingGuard.guardId || id,
          _id: saved._id || existingGuard._id,
          name: saved.fullName || updatedFields.name || existingGuard.name,
          phone: saved.mobileNumber || updatedFields.phone || existingGuard.phone,
          email: saved.email !== undefined ? saved.email : (updatedFields.email || existingGuard.email || ''),
          address: saved.residentialAddress || updatedFields.address || existingGuard.address || '',
          emergencyContact: saved.emergencyContactNumber || updatedFields.emergencyContact || existingGuard.emergencyContact || '',
          designation: saved.designation || updatedFields.designation || existingGuard.designation,
          employmentStatus: saved.employmentStatus || updatedFields.employmentStatus || existingGuard.employmentStatus,
          assignedLocation: saved.assignedSite?.siteName || updatedFields.assignedLocation || existingGuard.assignedLocation,
          currentShift: saved.assignedShift?.shiftName || updatedFields.currentShift || existingGuard.currentShift,
          avatar: saved.profilePhotoUrl || updatedFields.avatar || existingGuard.avatar,
        };

        setGuards((prev) =>
          prev.map((g) => (g.id === id || g.guardId === id || g._id === id ? normalizedGuard : g))
        );

        addNotification({
          type: 'GUARD',
          severity: 'info',
          title: `Guard Updated: ${normalizedGuard.name}`,
          message: `Profile updated for ${normalizedGuard.name} (${normalizedGuard.id}).`,
          location: normalizedGuard.assignedLocation || 'Main Duty Station',
        });

        return { success: true, data: normalizedGuard };
      } else {
        throw new Error(res.data?.message || 'Failed to update guard.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to update guard:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const archiveGuard = async (id) => {
    const existingGuard = guards.find((g) => g.id === id || g.guardId === id || g._id === id);
    if (!existingGuard) {
      console.error('[AppContext] Guard not found for archive:', id);
      return { success: false, message: 'Guard not found.' };
    }

    const targetId = existingGuard._id || existingGuard.guardId || id;

    try {
      const res = await guardsAPI.delete(targetId);
      if (res.data && res.data.success) {
        setGuards((prev) =>
          prev.map((g) =>
            g.id === id || g.guardId === id || g._id === id
              ? { ...g, employmentStatus: 'Archived', currentShift: 'Unassigned', isDeleted: true }
              : g
          )
        );

        addNotification({
          type: 'GUARD',
          severity: 'warning',
          title: `Guard Archived: ${existingGuard.name}`,
          message: `${existingGuard.name} (${existingGuard.id}) deactivated. Historical attendance & call records preserved.`,
          location: existingGuard.assignedLocation || 'Main Duty Station',
        });

        return { success: true, message: res.data.message };
      } else {
        throw new Error(res.data?.message || 'Failed to archive guard.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to archive guard:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const deleteGuard = async (id) => {
    return archiveGuard(id);
  };

  // Shift Actions (MongoDB backed with strict company tenant isolation)
  const addShift = async (shiftData) => {
    let savedShift = null;
    try {
      const payload = {
        shiftName: shiftData.name || shiftData.shiftName,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        isOvernight:
          shiftData.isOvernight !== undefined
            ? shiftData.isOvernight
            : shiftData.endTime < shiftData.startTime,
        verificationIntervalMinutes: shiftData.verificationIntervalMinutes || 30,
        workingDays:
          shiftData.workingDays || [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
        description: shiftData.description,
      };
      const res = await shiftsAPI.create(payload);
      if (res.data && res.data.success) {
        savedShift = res.data.data;
      }
    } catch (err) {
      console.warn('[AppContext] Shift creation via API failed, using fallback:', err.message);
    }

    const nextId = savedShift?._id || `SHF-0${shifts.length + 1}`;
    const newShift = {
      ...shiftData,
      id: nextId,
      _id: savedShift?._id,
      shiftId: savedShift?.shiftId,
      name: savedShift?.shiftName || shiftData.name,
      shiftName: savedShift?.shiftName || shiftData.name,
      startTime: savedShift?.startTime || shiftData.startTime,
      endTime: savedShift?.endTime || shiftData.endTime,
      isOvernight:
        savedShift?.isOvernight !== undefined
          ? savedShift.isOvernight
          : shiftData.endTime < shiftData.startTime,
      assignedGuardsCount: 0,
      guardCount: 0,
      status: shiftData.status || 'Active',
      isActive: true,
      description: savedShift?.description || shiftData.description || '',
    };
    setShifts((prev) => [...prev, newShift]);

    addNotification({
      type: 'SHIFT',
      severity: 'success',
      title: `Shift Configured: ${newShift.name}`,
      message: `${newShift.name} (${newShift.shiftId || nextId}) registered from ${newShift.startTime} to ${newShift.endTime}.`,
      location: 'Roster Schedule',
    });

    return { success: true, data: newShift };
  };

  const updateShift = async (id, updatedFields) => {
    const existingShift = shifts.find((s) => s.id === id || s.shiftId === id || s._id === id);
    const targetId = existingShift?._id || existingShift?.shiftId || id;

    try {
      const payload = {
        shiftName: updatedFields.name !== undefined ? updatedFields.name : updatedFields.shiftName,
        startTime: updatedFields.startTime,
        endTime: updatedFields.endTime,
        isOvernight:
          updatedFields.isOvernight !== undefined
            ? updatedFields.isOvernight
            : updatedFields.startTime && updatedFields.endTime
            ? updatedFields.endTime < updatedFields.startTime
            : undefined,
        verificationIntervalMinutes: updatedFields.verificationIntervalMinutes,
        workingDays: updatedFields.workingDays,
        description: updatedFields.description,
        status: updatedFields.status,
      };

      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      const res = await shiftsAPI.update(targetId, payload);
      if (res.data && res.data.success) {
        const saved = res.data.data;
        const normalized = {
          ...existingShift,
          ...saved,
          id: saved._id || existingShift?.id || id,
          _id: saved._id || existingShift?._id,
          shiftId: saved.shiftId || existingShift?.shiftId,
          name: saved.shiftName || updatedFields.name || existingShift?.name,
          shiftName: saved.shiftName || updatedFields.name || existingShift?.name,
          startTime: saved.startTime || updatedFields.startTime || existingShift?.startTime,
          endTime: saved.endTime || updatedFields.endTime || existingShift?.endTime,
          isOvernight:
            saved.isOvernight !== undefined ? saved.isOvernight : existingShift?.isOvernight,
          status: saved.isActive ? 'Active' : saved.status || 'Inactive',
          isActive: saved.isActive !== undefined ? saved.isActive : true,
          assignedGuardsCount:
            saved.guardCount !== undefined ? saved.guardCount : existingShift?.assignedGuardsCount,
          guardCount:
            saved.guardCount !== undefined ? saved.guardCount : existingShift?.guardCount,
          description:
            saved.description !== undefined ? saved.description : existingShift?.description,
        };

        setShifts((prev) =>
          prev.map((s) => (s.id === id || s.shiftId === id || s._id === id ? normalized : s))
        );

        addNotification({
          type: 'SHIFT',
          severity: 'info',
          title: `Shift Updated: ${normalized.name}`,
          message: `Duty shift timing updated for ${normalized.name} (${normalized.startTime} - ${normalized.endTime}).`,
          location: 'Roster Schedule',
        });

        return { success: true, data: normalized };
      } else {
        throw new Error(res.data?.message || 'Failed to update shift.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to update shift:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const deleteShift = async (id) => {
    const existingShift = shifts.find((s) => s.id === id || s.shiftId === id || s._id === id);
    if (!existingShift) {
      return { success: false, message: 'Shift not found.' };
    }
    const targetId = existingShift._id || existingShift.shiftId || id;

    try {
      const res = await shiftsAPI.delete(targetId);
      if (res.data && res.data.success) {
        setShifts((prev) =>
          prev.filter((s) => s.id !== id && s.shiftId !== id && s._id !== id)
        );

        // Safely update guards assigned to this shift in local state
        setGuards((prev) =>
          prev.map((g) =>
            g.assignedShift === targetId ||
            g.assignedShift?._id === targetId ||
            g.shiftId === targetId ||
            g.currentShift?.includes(existingShift.name)
              ? { ...g, currentShift: 'Unassigned', assignedShift: null, shiftId: null }
              : g
          )
        );

        addNotification({
          type: 'SHIFT',
          severity: 'warning',
          title: `Shift Deactivated: ${existingShift.name}`,
          message: `${existingShift.name} (${existingShift.shiftId || existingShift.id}) has been deactivated. Historical records preserved.`,
          location: 'Roster Schedule',
        });

        return { success: true, message: res.data.message };
      } else {
        throw new Error(res.data?.message || 'Failed to deactivate shift.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to deactivate shift:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const assignGuardToShift = async (guardId, shiftId, locationId) => {
    const targetShift = shifts.find((s) => s.id === shiftId || s._id === shiftId || s.shiftId === shiftId);
    const targetLoc = locations.find((l) => l.id === locationId || l._id === locationId || l.siteId === locationId);
    const targetGuard = guards.find((g) => g.id === guardId || g._id === guardId || g.guardId === guardId);

    // Persist via guardsAPI
    try {
      const mongoGuardId = targetGuard?._id || guardId;
      const mongoShiftId = targetShift?._id || targetShift?.id || shiftId;
      const mongoSiteId = targetLoc?._id || targetLoc?.id || (locationId || undefined);

      await guardsAPI.update(mongoGuardId, {
        assignedShift: mongoShiftId,
        assignedSite: mongoSiteId || undefined,
      });
    } catch (err) {
      console.warn('[AppContext] Backend guard shift assignment failed:', err.message);
    }

    if (targetShift) {
      updateGuard(guardId, {
        currentShift: `${targetShift.name} (${targetShift.startTime} - ${targetShift.endTime})`,
        assignedShift: targetShift,
        shiftId: targetShift.id,
        assignedLocation: targetLoc ? targetLoc.name : undefined,
        locationId: targetLoc ? targetLoc.id : undefined,
      });

      addNotification({
        type: 'ROSTER',
        severity: 'info',
        title: 'Guard Shift Assigned',
        message: `Guard assigned to ${targetShift.name} at ${targetLoc?.name || 'Selected Duty Station'}.`,
        location: targetLoc?.name || 'Assigned Site',
      });
    }
  };

  // Location Actions (MongoDB backed with strict company tenant isolation)
  const addLocation = async (locData) => {
    try {
      const payload = {
        siteName: locData.name || locData.siteName,
        address: locData.address,
        city: locData.city || 'Gurugram',
        state: locData.state || 'Haryana',
        contactNumber: locData.contactNumber,
        guardCapacity: locData.guardCapacity || locData.totalGuards || 5,
        assignedSupervisor: locData.assignedSupervisor || undefined,
      };

      const res = await sitesAPI.create(payload);
      if (res.data && res.data.success) {
        const savedSite = res.data.data;
        const normalizedLocation = {
          ...savedSite,
          id: savedSite._id,
          _id: savedSite._id,
          siteId: savedSite.siteId,
          name: savedSite.siteName,
          address: savedSite.address,
          city: savedSite.city,
          state: savedSite.state,
          contactNumber: savedSite.contactNumber,
          guardCapacity: savedSite.guardCapacity || 5,
          totalGuards: savedSite.guardCapacity || 5,
          activeGuards: 0,
          guardCount: 0,
          supervisor: savedSite.assignedSupervisor
            ? (savedSite.assignedSupervisor.fullName || savedSite.assignedSupervisor.name || 'Assigned')
            : (locData.supervisor || 'Unassigned'),
          assignedSupervisor: savedSite.assignedSupervisor,
          currentShift: locData.currentShift || 'General Shift',
          status: savedSite.status || 'Active',
          attentionNeeded: false,
          isDeleted: savedSite.isDeleted || false,
        };

        setLocations((prev) => [normalizedLocation, ...prev]);

        addNotification({
          type: 'LOCATION',
          severity: 'success',
          title: `Site Registered: ${normalizedLocation.name}`,
          message: `${normalizedLocation.name} (${normalizedLocation.siteId}) successfully registered and active.`,
          location: normalizedLocation.name,
        });

        return { success: true, data: normalizedLocation };
      } else {
        throw new Error(res.data?.message || 'Failed to create site.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to create site:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const updateLocation = async (id, updatedFields) => {
    const existingLoc = locations.find((l) => l.id === id || l.siteId === id || l._id === id);
    const targetId = existingLoc?._id || existingLoc?.siteId || id;

    try {
      const payload = {
        siteName: updatedFields.name !== undefined ? updatedFields.name : updatedFields.siteName,
        address: updatedFields.address,
        city: updatedFields.city,
        state: updatedFields.state,
        contactNumber: updatedFields.contactNumber,
        guardCapacity: updatedFields.guardCapacity || updatedFields.totalGuards,
        assignedSupervisor: updatedFields.assignedSupervisor || undefined,
        status: updatedFields.status,
      };

      // Clean undefined keys
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      const res = await sitesAPI.update(targetId, payload);
      if (res.data && res.data.success) {
        const saved = res.data.data;
        const normalized = {
          ...existingLoc,
          ...saved,
          id: saved._id || existingLoc?.id || id,
          _id: saved._id || existingLoc?._id,
          siteId: saved.siteId || existingLoc?.siteId,
          name: saved.siteName || updatedFields.name || existingLoc?.name,
          address: saved.address || updatedFields.address || existingLoc?.address,
          city: saved.city || updatedFields.city || existingLoc?.city,
          state: saved.state || updatedFields.state || existingLoc?.state,
          contactNumber: saved.contactNumber || updatedFields.contactNumber || existingLoc?.contactNumber,
          guardCapacity: saved.guardCapacity || updatedFields.totalGuards || existingLoc?.guardCapacity || 5,
          totalGuards: saved.guardCapacity || updatedFields.totalGuards || existingLoc?.totalGuards || 5,
          supervisor: saved.assignedSupervisor
            ? (saved.assignedSupervisor.fullName || saved.assignedSupervisor.name || 'Assigned')
            : (updatedFields.supervisor || existingLoc?.supervisor || 'Unassigned'),
          assignedSupervisor: saved.assignedSupervisor || existingLoc?.assignedSupervisor,
          status: saved.status || updatedFields.status || existingLoc?.status || 'Active',
        };

        setLocations((prev) =>
          prev.map((l) => (l.id === id || l.siteId === id || l._id === id ? normalized : l))
        );

        addNotification({
          type: 'LOCATION',
          severity: 'info',
          title: `Site Updated: ${normalized.name}`,
          message: `Operational site details updated for ${normalized.name}.`,
          location: normalized.name,
        });

        return { success: true, data: normalized };
      } else {
        throw new Error(res.data?.message || 'Failed to update site.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to update site:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const deleteLocation = async (id) => {
    const existingLoc = locations.find((l) => l.id === id || l.siteId === id || l._id === id);
    if (!existingLoc) {
      return { success: false, message: 'Site not found.' };
    }
    const targetId = existingLoc._id || existingLoc.siteId || id;

    try {
      const res = await sitesAPI.delete(targetId);
      if (res.data && res.data.success) {
        setLocations((prev) =>
          prev.filter((l) => l.id !== id && l.siteId !== id && l._id !== id)
        );

        addNotification({
          type: 'LOCATION',
          severity: 'warning',
          title: `Site Deactivated: ${existingLoc.name}`,
          message: `${existingLoc.name} (${existingLoc.siteId || existingLoc.id}) has been deactivated.`,
          location: existingLoc.name,
        });

        return { success: true, message: res.data.message };
      } else {
        throw new Error(res.data?.message || 'Failed to deactivate site.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to deactivate site:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Supervisor Actions (MongoDB backed with strict company tenant isolation)
  const addSupervisor = async (supData) => {
    try {
      const payload = {
        fullName: supData.name || supData.fullName,
        mobileNumber: supData.phone || supData.mobileNumber,
        email: supData.email || '',
        assignedSites: supData.assignedSites || [],
        employmentStatus: supData.employmentStatus || supData.status || 'Active',
        alertPreferences: supData.alertPreferences || { sms: true, call: true, email: true },
      };

      const res = await supervisorsAPI.create(payload);
      if (res.data && res.data.success) {
        const saved = res.data.data;
        const normalized = {
          ...saved,
          id: saved._id,
          _id: saved._id,
          supervisorId: saved.supervisorId,
          name: saved.fullName,
          fullName: saved.fullName,
          email: saved.email || '',
          phone: saved.mobileNumber,
          mobileNumber: saved.mobileNumber,
          assignedSites: Array.isArray(saved.assignedSites) ? saved.assignedSites : [],
          employmentStatus: saved.employmentStatus || 'Active',
          status: saved.employmentStatus || 'Active',
          alertPreferences: saved.alertPreferences || { sms: true, call: true, email: true },
          guardCount: 0,
          isDeleted: saved.isDeleted || false,
        };

        setSupervisors((prev) => [normalized, ...prev]);

        addNotification({
          type: 'SUPERVISOR',
          severity: 'success',
          title: `Supervisor Registered: ${normalized.name}`,
          message: `${normalized.name} (${normalized.supervisorId}) successfully registered as active field supervisor.`,
          location: 'Operations Command',
        });

        return { success: true, data: normalized };
      } else {
        throw new Error(res.data?.message || 'Failed to create supervisor.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to create supervisor:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const updateSupervisor = async (id, updatedFields) => {
    const existingSup = supervisors.find((s) => s.id === id || s.supervisorId === id || s._id === id);
    const targetId = existingSup?._id || existingSup?.supervisorId || id;

    try {
      const payload = {
        fullName: updatedFields.name !== undefined ? updatedFields.name : updatedFields.fullName,
        mobileNumber: updatedFields.phone !== undefined ? updatedFields.phone : updatedFields.mobileNumber,
        email: updatedFields.email,
        assignedSites: updatedFields.assignedSites,
        employmentStatus: updatedFields.employmentStatus || updatedFields.status,
        alertPreferences: updatedFields.alertPreferences,
      };

      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      const res = await supervisorsAPI.update(targetId, payload);
      if (res.data && res.data.success) {
        const saved = res.data.data;
        const normalized = {
          ...existingSup,
          ...saved,
          id: saved._id || existingSup?.id || id,
          _id: saved._id || existingSup?._id,
          supervisorId: saved.supervisorId || existingSup?.supervisorId,
          name: saved.fullName || updatedFields.name || existingSup?.name,
          fullName: saved.fullName || updatedFields.fullName || existingSup?.fullName,
          email: saved.email !== undefined ? saved.email : (updatedFields.email || existingSup?.email || ''),
          phone: saved.mobileNumber || updatedFields.phone || existingSup?.phone,
          mobileNumber: saved.mobileNumber || updatedFields.mobileNumber || existingSup?.mobileNumber,
          assignedSites: Array.isArray(saved.assignedSites) ? saved.assignedSites : (existingSup?.assignedSites || []),
          employmentStatus: saved.employmentStatus || updatedFields.employmentStatus || existingSup?.employmentStatus || 'Active',
          status: saved.employmentStatus || updatedFields.status || existingSup?.status || 'Active',
          alertPreferences: saved.alertPreferences || updatedFields.alertPreferences || existingSup?.alertPreferences,
        };

        setSupervisors((prev) =>
          prev.map((s) => (s.id === id || s.supervisorId === id || s._id === id ? normalized : s))
        );

        addNotification({
          type: 'SUPERVISOR',
          severity: 'info',
          title: `Supervisor Updated: ${normalized.name}`,
          message: `Supervisor profile updated for ${normalized.name} (${normalized.supervisorId}).`,
          location: 'Operations Command',
        });

        return { success: true, data: normalized };
      } else {
        throw new Error(res.data?.message || 'Failed to update supervisor.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to update supervisor:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const deleteSupervisor = async (id) => {
    const existingSup = supervisors.find((s) => s.id === id || s.supervisorId === id || s._id === id);
    if (!existingSup) {
      return { success: false, message: 'Supervisor not found.' };
    }
    const targetId = existingSup._id || existingSup.supervisorId || id;

    try {
      const res = await supervisorsAPI.delete(targetId);
      if (res.data && res.data.success) {
        setSupervisors((prev) =>
          prev.filter((s) => s.id !== id && s.supervisorId !== id && s._id !== id)
        );

        addNotification({
          type: 'SUPERVISOR',
          severity: 'warning',
          title: `Supervisor Deactivated: ${existingSup.name}`,
          message: `${existingSup.name} (${existingSup.supervisorId || existingSup.id}) has been deactivated.`,
          location: 'Operations Command',
        });

        return { success: true, message: res.data.message };
      } else {
        throw new Error(res.data?.message || 'Failed to deactivate supervisor.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('[AppContext] Failed to deactivate supervisor:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Attendance Actions
  const updateAttendanceStatus = (guardId, newStatus) => {
    setAttendance((prev) =>
      prev.map((att) => (att.guardId === guardId ? { ...att, status: newStatus } : att))
    );
    updateGuard(guardId, { attendanceStatus: newStatus });
  };

  // Call Verification Simulator Action (THE CORE REQUIREMENT)
  const openCallModal = (guard) => {
    setCallModalState({
      isOpen: true,
      guard,
      step: 'confirm',
      simulatedOutcome: null,
    });
  };

  const closeCallModal = () => {
    setCallModalState({
      isOpen: false,
      guard: null,
      step: 'confirm',
      simulatedOutcome: null,
    });
  };

  const triggerCallSimulation = (customOutcome = null) => {
    if (!callModalState.guard) return;

    setCallModalState((prev) => ({ ...prev, step: 'calling' }));

    // Simulate 2.5 second dialing and automated speech interaction
    setTimeout(() => {
      // Possible mock outcomes:
      const outcomes = [
        {
          result: "Answered",
          response: "Keypad [1] - Duty Confirmed",
          status: "Confirmed",
          isSuccess: true,
          badgeColor: "emerald",
        },
        {
          result: "Answered",
          response: "Keypad [1] - Duty Confirmed",
          status: "Confirmed",
          isSuccess: true,
          badgeColor: "emerald",
        },
        {
          result: "Answered",
          response: "Keypad [2] - Assistance / SOS Requested",
          status: "Emergency SOS",
          isSuccess: false,
          badgeColor: "rose",
        },
        {
          result: "No Answer",
          response: "No Keypad Input Received (Timeout)",
          status: "Unanswered (Retry in 5m)",
          isSuccess: false,
          badgeColor: "amber",
        },
        {
          result: "Busy",
          response: "Line Busy / Call Rejected",
          status: "Failed",
          isSuccess: false,
          badgeColor: "rose",
        },
      ];

      const outcome =
        customOutcome || outcomes[Math.floor(Math.random() * outcomes.length)];

      setCallModalState((prev) => ({
        ...prev,
        step: 'outcome',
        simulatedOutcome: outcome,
      }));

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Create new Call Log Entry
      const newCallLog = {
        id: `CALL-${1000 + callLogs.length + 1}`,
        guardId: callModalState.guard.id,
        guardName: callModalState.guard.name,
        phone: callModalState.guard.phone,
        location: callModalState.guard.assignedLocation,
        date: dateStr,
        time: timeStr,
        duration: outcome.result === 'Answered' ? '22s' : '0s',
        result: outcome.result,
        guardResponse: outcome.response,
        verificationStatus: outcome.status,
        callerId: "+91 124 489-2100 (AutoGuard Gateway)",
        apiReference: "API-SENIOR-AUTOMATED-CALL-V2 (Mock Ready for Integration)",
      };

      setCallLogs((prev) => [newCallLog, ...prev]);

      // Update Guard Status in Table
      updateGuard(callModalState.guard.id, {
        callStatus: outcome.status,
        lastCallTime: `Today, ${timeStr}`,
        attendanceStatus: outcome.isSuccess ? 'Present' : outcome.status === 'Emergency SOS' ? 'Present' : 'Absent',
      });

      // Update Attendance record
      setAttendance((prev) =>
        prev.map((att) =>
          att.guardId === callModalState.guard.id
            ? { ...att, verificationStatus: outcome.status, status: outcome.isSuccess ? 'Present' : att.status }
            : att
        )
      );

      // Trigger Notification
      if (outcome.status === 'Emergency SOS') {
        addNotification({
          type: 'SOS',
          severity: 'critical',
          title: `EMERGENCY ALERT: ${callModalState.guard.name}`,
          message: `Guard pressed 2 requesting supervisor assistance at ${callModalState.guard.assignedLocation}.`,
          location: callModalState.guard.assignedLocation,
        });
      } else if (outcome.result === 'No Answer') {
        addNotification({
          type: 'MISSED_CALL',
          severity: 'warning',
          title: `Unanswered Verification Call: ${callModalState.guard.name}`,
          message: `Call to ${callModalState.guard.phone} unanswered. Automated 5-min retry initiated.`,
          location: callModalState.guard.assignedLocation,
        });
      } else {
        addNotification({
          type: 'CALL',
          severity: 'info',
          title: `Duty Confirmed: ${callModalState.guard.name}`,
          message: `Guard verified on post at ${callModalState.guard.assignedLocation} via DTMF Keypad 1.`,
          location: callModalState.guard.assignedLocation,
        });
      }
    }, 2400);
  };

  // Document Actions
  const addDocument = (docData) => {
    const nextId = `DOC-${500 + documents.length + 1}`;
    const newDoc = {
      ...docData,
      id: nextId,
      uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Verified',
      fileSize: '1.5 MB',
      verifiedBy: currentUser.name,
    };
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const deleteDocument = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Notifications Actions
  const addNotification = (notifData) => {
    const newNotif = {
      ...notifData,
      id: `NOTIF-0${notifications.length + 1}`,
      time: 'Just now',
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Admin & Staff Actions
  const addAdmin = async (adminData) => {
    try {
      const res = await companyAPI.createMember(adminData);
      if (res.data && res.data.success && res.data.member) {
        const m = res.data.member;
        const formatted = {
          ...m,
          id: m._id,
          name: m.fullName,
          fullName: m.fullName,
          email: m.email,
          phone: m.phone || '',
          role: m.role,
          accessStatus: m.isActive ? 'Active' : 'Inactive',
          isActive: m.isActive,
          mustChangePassword: Boolean(m.mustChangePassword),
          lastLogin: 'Never',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
        };
        setAdmins((prev) => [formatted, ...prev]);
        return { success: true, member: formatted, temporaryPassword: res.data.temporaryPassword };
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const updateAdmin = async (id, updatedFields) => {
    try {
      const res = await companyAPI.updateMember(id, updatedFields);
      if (res.data && res.data.success && res.data.member) {
        const m = res.data.member;
        setAdmins((prev) =>
          prev.map((a) => (a.id === id || a._id === id ? { ...a, ...m, name: m.fullName } : a))
        );
        return { success: true, member: m };
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const toggleAdminStatus = async (id) => {
    try {
      const res = await companyAPI.toggleMemberStatus(id);
      if (res.data && res.data.success) {
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === id || a._id === id
              ? { ...a, isActive: res.data.isActive, accessStatus: res.data.isActive ? 'Active' : 'Inactive' }
              : a
          )
        );
        return { success: true, isActive: res.data.isActive };
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const resetAdminPassword = async (id, password) => {
    try {
      const res = await companyAPI.resetMemberPassword(id, { password });
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isSidebarCollapsed,
        toggleSidebar,
        currentUser,
        setCurrentUser,
        isAuthenticated: !!admin,
        company,
        setCompany,
        guards,
        addGuard,
        updateGuard,
        archiveGuard,
        deleteGuard,
        locations,
        addLocation,
        updateLocation,
        deleteLocation,
        supervisors,
        addSupervisor,
        updateSupervisor,
        deleteSupervisor,
        shifts,
        addShift,
        updateShift,
        deleteShift,
        assignGuardToShift,
        attendance,
        attendanceRecords: attendance,
        updateAttendanceStatus,
        callLogs,
        fetchCallLogs: fetchTenantCallLogs,
        fetchAttendance: fetchTenantAttendance,
        refreshCalls: fetchTenantCallLogs,
        refreshAttendance: fetchTenantAttendance,
        documents,
        addDocument,
        deleteDocument,
        admins,
        addAdmin,
        updateAdmin,
        toggleAdminStatus,
        resetAdminPassword,
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        // Call Simulator
        callModalState,
        openCallModal,
        closeCallModal,
        triggerCallSimulation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
