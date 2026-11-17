import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

/**
 * Reusable StatusBadge Component
 * - Confirmed / Present: Light green background, dark green text, check-circle icon
 * - Pending: Light orange background, dark orange text, clock icon
 * - Late: Light amber background, dark amber text, clock icon
 * - Early Clock-out: Light purple background, dark purple text, clock icon
 * - No Answer: Light orange background, dark orange text, warning icon
 * - Failed / Absent / Missed: Light red background, dark red text, X or alert icon
 * - Assistance Requested: Light red background, dark red text, shield alert icon
 */
const StatusBadge = ({ status, label, size = 'sm', theme = 'dark' }) => {
  const norm = (status || '').toLowerCase().trim();

  let config = {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
    label: label || status || 'Scheduled',
  };

  // 1. Confirmed / Present / Active / Completed: Light green
  if (
    norm.includes('confirmed') ||
    norm === 'present' ||
    norm === 'active' ||
    norm === 'answered' ||
    norm === 'completed' ||
    norm === 'duty confirmed'
  ) {
    config = {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      label:
        label ||
        (norm === 'present'
          ? 'Present'
          : norm === 'active'
          ? 'Active'
          : norm === 'completed'
          ? 'Completed'
          : 'Confirmed'),
    };
  }
  // 2. Upcoming: Light blue with Clock icon
  else if (norm.includes('upcoming')) {
    config = {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Clock,
      label: label || 'Upcoming',
    };
  }
  // 3. Unassigned: Light amber / orange with AlertTriangle
  else if (norm.includes('unassigned')) {
    config = {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertTriangle,
      label: label || 'Unassigned',
    };
  }
  // 4. Early Clock-out / Early Out: Light purple
  else if (norm.includes('early')) {
    config = {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: Clock,
      label: label || 'Early Clock-out',
    };
  }
  // 5. Late Check-in: Light amber / orange with Clock
  else if (norm === 'late' || norm.includes('late')) {
    config = {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock,
      label: label || 'Late',
    };
  }
  // 6. Pending: Light orange background, dark orange text and clock icon
  else if (norm.includes('pending')) {
    config = {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: Clock,
      label: label || 'Pending',
    };
  }
  // 7. No Answer: Light orange background with a clear warning icon
  else if (
    norm.includes('no answer') ||
    norm.includes('unanswered') ||
    norm.includes('timeout')
  ) {
    config = {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: AlertTriangle,
      label: label || 'No Answer',
    };
  }
  // 8. Assistance Requested: Light red background with shield alert icon
  else if (
    norm.includes('sos') ||
    norm.includes('emergency') ||
    norm.includes('assistance')
  ) {
    config = {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: ShieldAlert,
      label: label || 'Assistance Requested',
    };
  }
  // 9. Cancelled: Light red background with XCircle icon
  else if (norm.includes('cancel')) {
    config = {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle,
      label: label || 'Cancelled',
    };
  }
  // 10. Failed / Absent / Missed: Light red background, dark red text and XCircle icon
  else if (
    norm.includes('failed') ||
    norm.includes('rejected') ||
    norm.includes('busy') ||
    norm.includes('missed') ||
    norm === 'absent'
  ) {
    config = {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle,
      label: label || (norm === 'absent' ? 'Absent' : norm.includes('missed') ? 'Missed' : 'Failed'),
    };
  }
  // Default / Scheduled / Upcoming
  else if (norm.includes('upcoming') || norm.includes('scheduled')) {
    config = {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: Clock,
      label: label || 'Scheduled',
    };
  }

  // Dark theme override matching AutoGuard dark enterprise palette
  if (theme === 'dark') {
    if (
      norm === 'active' ||
      norm.includes('active') ||
      norm === 'present' ||
      norm.includes('confirmed')
    ) {
      config.bg = 'bg-[#22C55E]/15';
      config.text = 'text-[#22C55E]';
      config.border = 'border-[#22C55E]/30';
    } else if (norm === 'completed' || norm.includes('completed')) {
      config.bg = 'bg-[#2DD4BF]/15';
      config.text = 'text-[#2DD4BF]';
      config.border = 'border-[#2DD4BF]/30';
    } else if (norm.includes('upcoming') || norm.includes('scheduled')) {
      config.bg = 'bg-[#60A5FA]/15';
      config.text = 'text-[#60A5FA]';
      config.border = 'border-[#60A5FA]/30';
    } else if (
      norm.includes('cancel') ||
      norm.includes('failed') ||
      norm === 'absent' ||
      norm.includes('missed')
    ) {
      config.bg = 'bg-[#F87171]/15';
      config.text = 'text-[#F87171]';
      config.border = 'border-[#F87171]/30';
    } else if (
      norm.includes('unassigned') ||
      norm.includes('pending') ||
      norm.includes('late') ||
      norm.includes('no answer')
    ) {
      config.bg = 'bg-[#FBBF24]/15';
      config.text = 'text-[#FBBF24]';
      config.border = 'border-[#FBBF24]/30';
    }
  }

  const IconComponent = config.icon;
  const paddingClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${paddingClasses} whitespace-nowrap`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
