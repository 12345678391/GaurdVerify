import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  X,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const CallGuardModal = () => {
  const { callModalState, closeCallModal, triggerCallSimulation } = useApp();
  const { isOpen, guard, step, simulatedOutcome } = callModalState;
  const [selectedDigit, setSelectedDigit] = useState('');
  const [keypadActive, setKeypadActive] = useState(false);

  if (!isOpen || !guard) return null;

  const keypadButtons = [
    { key: '1', sub: 'CONFIRM' },
    { key: '2', sub: 'SOS' },
    { key: '3', sub: 'DEF' },
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
    { key: '*', sub: '' },
    { key: '0', sub: '+' },
    { key: '#', sub: '' },
  ];

  const handleKeyPress = (digit) => {
    setSelectedDigit(digit);
    setKeypadActive(true);

    if (step === 'calling' || step === 'confirm') {
      if (digit === '1') {
        triggerCallSimulation({
          result: 'Answered',
          response: 'Keypad [1] - Duty Confirmed',
          status: 'Confirmed',
          isSuccess: true,
          badgeColor: 'emerald',
        });
      } else if (digit === '2') {
        triggerCallSimulation({
          result: 'Answered',
          response: 'Keypad [2] - Assistance / SOS Requested',
          status: 'Emergency SOS',
          isSuccess: false,
          badgeColor: 'rose',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-[#172337] border border-[#2B3B52] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-[#F8FAFC] relative">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#2B3B52] flex items-center justify-between bg-[#111C30]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white shrink-0 shadow-md">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#F8FAFC]">
                Automated Duty Verification Call
              </h3>
              <p className="text-xs text-[#A8B6C9]">
                Senior Voice Telephony Dispatch Gateway
              </p>
            </div>
          </div>

          <button
            onClick={closeCallModal}
            className="p-1.5 rounded-lg text-[#A8B6C9] hover:text-[#F8FAFC] hover:bg-[#1E2D43] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Guard Profile Summary Card */}
          <div className="p-3.5 rounded-xl bg-[#1E2D43] border border-[#2B3B52] flex items-center gap-3.5">
            <img
              src={guard.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80'}
              alt={guard.name}
              className="w-12 h-12 rounded-full object-cover border border-[#2B3B52] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#F8FAFC] text-sm truncate">
                  {guard.name}
                </h4>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#111C30] text-[#60A5FA] border border-[#2B3B52]">
                  {guard.id}
                </span>
              </div>
              <p className="text-xs text-[#60A5FA] mt-0.5 font-mono">{guard.phone}</p>
              <p className="text-xs text-[#A8B6C9] truncate mt-0.5">
                {guard.designation || 'Security Officer'} • {guard.assignedLocation}
              </p>
            </div>
          </div>

          {/* STEP 1: Confirmation Screen */}
          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Voice Message Preview Box */}
              <div className="p-3.5 bg-[#1E2D43] border border-[#3B82F6]/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#60A5FA]">
                  <Volume2 className="w-4 h-4" />
                  <span>Automated Voice Prompt Script:</span>
                </div>
                <p className="text-xs text-[#F8FAFC] italic leading-relaxed">
                  "Hello. This is the AutoGuard Shift Monitoring System. Your duty attendance verification is in progress. Press 1 to confirm on duty. Press 2 if you require assistance."
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2B3B52]">
                <button
                  type="button"
                  onClick={closeCallModal}
                  className="px-3.5 py-2 rounded-lg border border-[#2B3B52] text-[#A8B6C9] hover:bg-[#1E2D43] hover:text-[#F8FAFC] text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={() => triggerCallSimulation()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs transition-colors shadow-md"
                >
                  <PhoneForwarded className="w-3.5 h-3.5" />
                  <span>Initiate Verification Call</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Dialing / In-Call State */}
          {step === 'calling' && (
            <div className="py-3 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 text-[#60A5FA] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#F8FAFC]">
                  Dialing Guard Handset...
                </h4>
                <p className="text-xs text-[#A8B6C9] mt-0.5">
                  Delivering automated verification prompt. Awaiting DTMF keypad response:
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Outcome Result Screen */}
          {step === 'outcome' && simulatedOutcome && (
            <div className="space-y-4 py-2">
              <div
                className={`p-4 rounded-xl border text-center space-y-1.5 ${
                  simulatedOutcome.status === 'Confirmed'
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                    : simulatedOutcome.status === 'Emergency SOS'
                    ? 'bg-[#F87171]/15 border-[#F87171]/30 text-[#F87171]'
                    : 'bg-[#FBBF24]/15 border-[#FBBF24]/30 text-[#FBBF24]'
                }`}
              >
                {simulatedOutcome.status === 'Confirmed' ? (
                  <CheckCircle2 className="w-8 h-8 mx-auto" />
                ) : simulatedOutcome.status === 'Emergency SOS' ? (
                  <AlertTriangle className="w-8 h-8 mx-auto" />
                ) : (
                  <PhoneOff className="w-8 h-8 mx-auto" />
                )}

                <h4 className="text-sm font-bold text-[#F8FAFC]">
                  Verification Status: {simulatedOutcome.status}
                </h4>
                <p className="text-xs font-semibold">{simulatedOutcome.response}</p>
                <p className="text-xs text-[#A8B6C9]">
                  Call Connection: {simulatedOutcome.result} (Duration:{' '}
                  {simulatedOutcome.result === 'Answered' ? '22s' : '0s'})
                </p>
              </div>

              {/* Status Update Confirmation Notes */}
              <div className="bg-[#1E2D43] p-3.5 rounded-xl border border-[#2B3B52] text-xs space-y-1.5 text-[#F8FAFC]">
                <div className="flex justify-between items-center border-b border-[#2B3B52] pb-1.5">
                  <span className="text-[#A8B6C9]">Attendance Database:</span>
                  <span className="font-semibold text-[#22C55E] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Synchronized
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#A8B6C9]">Next Scheduled Verification:</span>
                  <span className="font-semibold text-[#F8FAFC]">In 30 Minutes</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={closeCallModal}
                  className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Interactive Telephone Keypad Simulation Section */}
          <div className="pt-2 border-t border-[#2B3B52]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider">
                Telephone DTMF Keypad Simulation
              </span>
              {selectedDigit && (
                <span className="text-xs font-mono font-bold text-[#60A5FA] bg-[#111C30] px-2.5 py-0.5 rounded border border-[#2B3B52]">
                  Keypad Digit: {selectedDigit}
                </span>
              )}
            </div>

            {/* Keypad Grid 3x4 */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {keypadButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => handleKeyPress(btn.key)}
                  className={`py-3 rounded-xl border font-bold transition-all flex flex-col items-center justify-center ${
                    selectedDigit === btn.key
                      ? 'bg-[#3B82F6] border-[#60A5FA] text-white ring-2 ring-[#60A5FA]/40 shadow-lg scale-95'
                      : 'bg-[#1E2D43] hover:bg-[#2B3B52] border-[#2B3B52] text-[#F8FAFC] active:scale-95'
                  }`}
                >
                  <span className="text-lg leading-tight">{btn.key}</span>
                  {btn.sub && (
                    <span
                      className={`text-[9px] font-semibold tracking-wider ${
                        btn.key === '1'
                          ? 'text-[#22C55E]'
                          : btn.key === '2'
                          ? 'text-[#F87171]'
                          : 'text-[#A8B6C9]'
                      }`}
                    >
                      {btn.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Explanation Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#2B3B52] text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="w-5 h-5 rounded bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </span>
                <span className="text-xs text-[#A8B6C9]">
                  Press 1 — <strong className="text-[#22C55E]">Confirm Present on Duty</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111C30] border border-[#2B3B52]">
                <span className="w-5 h-5 rounded bg-[#F87171]/20 text-[#F87171] flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </span>
                <span className="text-xs text-[#A8B6C9]">
                  Press 2 — <strong className="text-[#F87171]">Request Emergency SOS</strong>
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#111C30] border border-[#2B3B52] text-[11px] text-[#A8B6C9] mt-2 flex items-start gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#60A5FA] shrink-0 mt-0.5" />
              <span>
                Browser simulation interface. Live production calls receive DTMF audio signals via Plivo Webhook API without modifying backend logic.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallGuardModal;
