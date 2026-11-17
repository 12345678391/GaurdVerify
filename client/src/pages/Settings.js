import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Building2,
  User,
  PhoneCall,
  Bell,
  MapPin,
  FileText,
  Save,
  CheckCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, company, locations, admins, documents } = useApp();
  const [activeTab, setActiveTab] = useState('agency');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Agency Profile Form states
  const [agencyName, setAgencyName] = useState(company?.name || 'AutoGuard Security Solutions Ltd.');
  const [agencyEmail, setAgencyEmail] = useState(company?.email || 'operations@autoguardsecurity.com');
  const [agencyPhone, setAgencyPhone] = useState(company?.phone || '+91 (124) 489-2100');
  const [agencyAddress, setAgencyAddress] = useState(
    company?.address
      ? `${company.address}, ${company.city}, ${company.state} - ${company.pincode}`
      : 'Tower 3, Cyber City Hub, Phase II, Gurugram, Haryana - 122002'
  );
  const [psaraNumber, setPsaraNumber] = useState('PSARA/HR/GGN/2023/8841');
  const [gstNumber, setGstNumber] = useState('06AAACA1234B1Z5');

  // Call Verification Settings
  const [callInterval, setCallInterval] = useState('60'); // mins
  const [retryLimit, setRetryLimit] = useState('3');
  const [presentKey, setPresentKey] = useState('1');
  const [sosKey, setSosKey] = useState('2');

  // Alert toggles
  const [notifySos, setNotifySos] = useState(true);
  const [notifyMissed, setNotifyMissed] = useState(true);
  const [dailySmsDigest, setDailySmsDigest] = useState(true);

  React.useEffect(() => {
    if (company) {
      if (company.name) setAgencyName(company.name);
      if (company.email) setAgencyEmail(company.email);
      if (company.phone) setAgencyPhone(company.phone);
      if (company.address) {
        setAgencyAddress(
          `${company.address}${company.city ? ', ' + company.city : ''}${company.state ? ', ' + company.state : ''}${company.pincode ? ' - ' + company.pincode : ''}`
        );
      }
    }
  }, [company]);

  const handleSave = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="bg-[#111C30] p-5 rounded-xl border border-[#2B3B52] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">
            Agency Settings & Management
          </h2>
          <p className="text-xs text-[#A8B6C9] mt-0.5">
            Manage agency registration details, client sites, supervisors, PSARA records, and automated calling parameters.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-1.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto">
            <CheckCircle className="w-4 h-4 text-[#22C55E]" />
            <span>Settings Saved Successfully</span>
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#2B3B52]">
        {[
          { id: 'agency', label: 'Agency Profile', icon: Building2 },
          { id: 'sites', label: 'Client Sites & Locations', icon: MapPin },
          { id: 'supervisors', label: 'Supervisors & Staff', icon: User },
          { id: 'documents', label: 'Documents & PSARA', icon: FileText },
          { id: 'telephony', label: 'Call Verification Rules', icon: PhoneCall },
          { id: 'alerts', label: 'Alert Preferences', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#3B82F6] text-white shadow-xs font-semibold'
                  : 'bg-[#172337] text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] border border-[#2B3B52]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Panels */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-5 sm:p-6 shadow-md">
        {/* 1. Agency Profile Tab */}
        {activeTab === 'agency' && (
          <form onSubmit={handleSave} className="space-y-5 max-w-3xl">
            <div className="border-b border-[#2B3B52] pb-3">
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Security Agency Registration Details
              </h3>
              <p className="text-xs text-[#A8B6C9] mt-0.5">
                Official agency credentials printed on duty rosters and attendance registers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Agency Registered Name
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={agencyEmail}
                  onChange={(e) => setAgencyEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Head Office Mobile / Phone (+91)
                </label>
                <input
                  type="text"
                  value={agencyPhone}
                  onChange={(e) => setAgencyPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  PSARA License Number
                </label>
                <input
                  type="text"
                  value={psaraNumber}
                  onChange={(e) => setPsaraNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  GST Registration Number
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Default Timezone
                </label>
                <input
                  type="text"
                  disabled
                  value="Asia/Kolkata (IST +05:30)"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#A8B6C9] font-medium opacity-80"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                Registered Office Address
              </label>
              <textarea
                rows="2"
                value={agencyAddress}
                onChange={(e) => setAgencyAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Agency Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. Client Sites & Locations Tab */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B3B52] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  Client Sites & Security Locations
                </h3>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Commercial premises and posts where guards are deployed.
                </p>
              </div>

              <button
                onClick={() => navigate('/field-operations')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage in Field Operations</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#111C30] text-[#A8B6C9] font-semibold uppercase tracking-wider border-b border-[#2B3B52]">
                    <th className="py-2.5 px-3">Site ID</th>
                    <th className="py-2.5 px-3">Site Name</th>
                    <th className="py-2.5 px-3">City / Address</th>
                    <th className="py-2.5 px-3">Field Supervisor</th>
                    <th className="py-2.5 px-3">Guards Deployed</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                  {locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-[#1E2D43]/80">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#60A5FA]">
                        {loc.id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#F8FAFC]">
                        {loc.name}
                      </td>
                      <td className="py-2.5 px-3 text-[#A8B6C9]">
                        {loc.address}, {loc.city}
                      </td>
                      <td className="py-2.5 px-3 text-[#F8FAFC]">
                        {loc.supervisor}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#F8FAFC]">
                        {loc.activeGuards} / {loc.totalGuards} Guards
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                          {loc.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Supervisors & Staff Tab */}
        {activeTab === 'supervisors' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B3B52] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  Agency Staff & Field Supervisors
                </h3>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Authorized personnel who manage shift assignments, patrol audits, and guard calls.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => navigate('/supervisors')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2D43] hover:bg-[#2B3B52] border border-[#2B3B52] text-[#60A5FA] rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>Field Supervisors</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigate('/admin-management')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <span>Full Staff Directory</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  className="p-3.5 rounded-xl border border-[#2B3B52] bg-[#1E2D43] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={adm.avatar}
                      alt={adm.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#2B3B52] shrink-0"
                    />
                    <div>
                      <p className="font-bold text-[#F8FAFC]">{adm.name}</p>
                      <p className="text-[11px] text-[#A8B6C9]">{adm.role}</p>
                      <p className="text-[11px] text-[#60A5FA] font-mono mt-0.5">
                        {adm.phone}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-semibold">
                    {adm.accessStatus || 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Documents & PSARA Compliance Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B3B52] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  Agency Documents & PSARA Records
                </h3>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  PSARA licenses, guard police verification certificates, and site agreements.
                </p>
              </div>

              <button
                onClick={() => navigate('/documents')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md self-start sm:self-auto"
              >
                <span>All Documents Archive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#111C30] text-[#A8B6C9] font-semibold uppercase tracking-wider border-b border-[#2B3B52]">
                    <th className="py-2.5 px-3">Document Code</th>
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3B52]/60 text-[#F8FAFC]">
                  {documents.slice(0, 6).map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#1E2D43]/80">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#60A5FA]">
                        {doc.id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#F8FAFC]">
                        {doc.title}
                      </td>
                      <td className="py-2.5 px-3 text-[#A8B6C9]">{doc.category}</td>
                      <td className="py-2.5 px-3 text-[#A8B6C9] font-mono">{doc.expiryDate}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                          {doc.status || 'Verified'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Call Verification Rules Tab */}
        {activeTab === 'telephony' && (
          <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
            <div className="border-b border-[#2B3B52] pb-3">
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Automated Verification Call Parameters
              </h3>
              <p className="text-xs text-[#A8B6C9] mt-0.5">
                Set duty check frequency, retry rules, and keypad response keys for guards.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Call Interval
                </label>
                <select
                  value={callInterval}
                  onChange={(e) => setCallInterval(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="60" className="bg-[#111C30] text-[#F8FAFC]">Every 1 Hour (60 mins)</option>
                  <option value="90" className="bg-[#111C30] text-[#F8FAFC]">Every 1.5 Hours (90 mins)</option>
                  <option value="120" className="bg-[#111C30] text-[#F8FAFC]">Every 2 Hours (120 mins - Recommended)</option>
                  <option value="180" className="bg-[#111C30] text-[#F8FAFC]">Every 3 Hours (180 mins)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Max Retries on No Answer
                </label>
                <select
                  value={retryLimit}
                  onChange={(e) => setRetryLimit(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="1" className="bg-[#111C30] text-[#F8FAFC]">1 Attempt only</option>
                  <option value="2" className="bg-[#111C30] text-[#F8FAFC]">2 Attempts (5 min gap)</option>
                  <option value="3" className="bg-[#111C30] text-[#F8FAFC]">3 Attempts (Standard Agency Rule)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Keypad Key: Confirm Duty
                </label>
                <input
                  type="text"
                  maxLength="1"
                  value={presentKey}
                  onChange={(e) => setPresentKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#22C55E] font-mono text-center font-bold"
                />
                <p className="text-[10px] text-[#A8B6C9] mt-1">Guard presses 1 to confirm on post</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">
                  Keypad Key: Emergency SOS
                </label>
                <input
                  type="text"
                  maxLength="1"
                  value={sosKey}
                  onChange={(e) => setSosKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111C30] border border-[#2B3B52] text-[#F87171] font-mono text-center font-bold"
                />
                <p className="text-[10px] text-[#A8B6C9] mt-1">Guard presses 2 if in danger / distress</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Call Rules</span>
              </button>
            </div>
          </form>
        )}

        {/* 6. Alert Preferences Tab */}
        {activeTab === 'alerts' && (
          <form onSubmit={handleSave} className="space-y-4 max-w-xl">
            <div className="border-b border-[#2B3B52] pb-3">
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Supervisor Notification Rules
              </h3>
              <p className="text-xs text-[#A8B6C9] mt-0.5">
                Configure immediate mobile SMS alerts sent to field officers.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1E2D43] border border-[#2B3B52] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySos}
                  onChange={(e) => setNotifySos(e.target.checked)}
                  className="mt-0.5 rounded text-[#3B82F6]"
                />
                <div>
                  <span className="font-bold text-[#F8FAFC] block">
                    Immediate SOS & Emergency Alert
                  </span>
                  <span className="text-[#A8B6C9] text-[11px]">
                    Send immediate SMS and phone call to supervisor when Keypad 2 is pressed.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1E2D43] border border-[#2B3B52] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyMissed}
                  onChange={(e) => setNotifyMissed(e.target.checked)}
                  className="mt-0.5 rounded text-[#3B82F6]"
                />
                <div>
                  <span className="font-bold text-[#F8FAFC] block">
                    Missed Call Verification Alert
                  </span>
                  <span className="text-[#A8B6C9] text-[11px]">
                    Notify operations room after 3 consecutive unanswered verification calls.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1E2D43] border border-[#2B3B52] cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailySmsDigest}
                  onChange={(e) => setDailySmsDigest(e.target.checked)}
                  className="mt-0.5 rounded text-[#3B82F6]"
                />
                <div>
                  <span className="font-bold text-[#F8FAFC] block">
                    Daily Morning Duty Muster Summary
                  </span>
                  <span className="text-[#A8B6C9] text-[11px]">
                    Send 07:00 AM summary of present and absent guards to agency management.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Alert Rules</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
