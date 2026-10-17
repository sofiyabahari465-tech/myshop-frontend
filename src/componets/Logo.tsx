import React from 'react';

interface LogoProps {
  /** سایز لوگو */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** نمایش متن کنار آیکون */
  showText?: boolean;
  /** نوع نمایش */
  variant?: 'default' | 'compact' | 'full';
  /** تم رنگی */
  theme?: 'gradient' | 'dark' | 'light' | 'minimal';
}

/**
 * لوگوی "یدک مهر" - بازرگانی مهر امین
 * با آیکون خفن و گرادیان
 */
const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  variant = 'default',
  theme = 'gradient',
}) => {
  const sizeClasses = {
    sm: { box: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-sm', sub: 'text-[10px]' },
    md: { box: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-base', sub: 'text-xs' },
    lg: { box: 'h-14 w-14', icon: 'h-7 w-7', text: 'text-lg', sub: 'text-xs' },
    xl: { box: 'h-20 w-20', icon: 'h-10 w-10', text: 'text-2xl', sub: 'text-sm' },
  }[size];

  const themeClasses = {
    gradient: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30',
    dark: 'bg-slate-900 text-white shadow-lg',
    light: 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200',
    minimal: 'bg-transparent text-cyan-600 dark:text-cyan-400',
  }[theme];

  return (
    <div className="flex items-center gap-2.5">
      {/* آیکون لوگو - با SVG سفارشی */}
      <div
        className={`relative flex ${sizeClasses.box} items-center justify-center rounded-2xl ${themeClasses} transition-transform hover:scale-105`}
      >
        {/* درخشش پس‌زمینه */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />

        {/* آیکون دست و مهر (سمبل یدک مهر) */}
        <svg
          className={`relative ${sizeClasses.icon}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* دایره مهر */}
          <circle cx="12" cy="12" r="9" />
          {/* ستاره وسط (نماد مهر) */}
          <polygon
            points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10"
            fill="currentColor"
            stroke="none"
            opacity="0.9"
          />
        </svg>

        {/* نقطه تزئینی بالا */}
        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-300 ring-1 ring-white/50" />
      </div>

      {/* متن‌ها */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-black leading-tight tracking-tight ${sizeClasses.text} ${
              theme === 'light'
                ? 'text-slate-900 dark:text-white'
                : theme === 'minimal'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-900 dark:text-white'
            }`}
          >
            یدک مهر
          </span>
          {variant !== 'compact' && (
            <span
              className={`${sizeClasses.sub} font-medium leading-tight text-slate-500 dark:text-slate-400`}
            >
              بازرگانی مهر امین
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
