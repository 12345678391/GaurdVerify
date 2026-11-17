import React from 'react';

const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  // Dark Enterprise icon background tints & top borders
  const variantStyles = {
    default: {
      icon: 'bg-[#60A5FA]/10 text-[#60A5FA] border border-[#60A5FA]/20',
      topBorder: 'border-t-2 border-t-[#60A5FA]',
    },
    primary: {
      icon: 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20',
      topBorder: 'border-t-2 border-t-[#3B82F6]',
    },
    success: {
      icon: 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20',
      topBorder: 'border-t-2 border-t-[#22C55E]',
    },
    danger: {
      icon: 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20',
      topBorder: 'border-t-2 border-t-[#F87171]',
    },
    warning: {
      icon: 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20',
      topBorder: 'border-t-2 border-t-[#FBBF24]',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div
      onClick={onClick}
      className={`bg-[#172337] border border-[#2B3B52] ${style.topBorder} rounded-xl p-4 shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:border-[#3B82F6]/60 hover:shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#A8B6C9] uppercase tracking-wider truncate mr-2">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg shrink-0 ${style.icon}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline">
        <span className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          {value}
        </span>
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-[#A8B6C9] truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default StatCard;
