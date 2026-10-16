import React, { useEffect, useState } from 'react';

interface LoadingProps {
  /** پیام نمایش داده شده زیر اسپینر */
  message?: string;
  /** پیام فرعی کوچکتر */
  subMessage?: string;
  /** سایز اسپینر */
  size?: 'sm' | 'md' | 'lg';
  /** تم رنگی */
  variant?: 'default' | 'dark' | 'minimal';
}

/**
 * کامپوننت لودینگ زیبا با انیمیشن دوگانه
 */
const Loading: React.FC<LoadingProps> = ({
  message = 'در حال بارگذاری...',
  subMessage = 'لطفاً چند ثانیه صبر کنید',
  size = 'lg',
  variant = 'default',
}) => {
  const [dots, setDots] = useState('');

  // انیمیشن نقطه‌های متحرک زیر پیام
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }[size];

  const containerClass = {
    default:
      'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-700',
    dark: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
    minimal: 'bg-transparent text-slate-700 dark:text-white',
  }[variant];

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${containerClass}`}
    >
      {/* پس‌زمینه تزئینی */}
      {variant !== 'minimal' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
      )}

      <div className="relative flex flex-col items-center gap-6">
        {/* اسپینر دوگانه */}
        <div className={`relative ${sizeClass}`}>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-cyan-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-purple-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 opacity-60 blur-sm animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/50" />
          </div>
        </div>

        {/* متن‌ها */}
        <div className="text-center">
          <p className="text-lg font-black tracking-tight text-cyan-600 dark:text-cyan-400">
            {message}
            <span className="inline-block w-8 text-right">{dots}</span>
          </p>
          {subMessage && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subMessage}
            </p>
          )}
        </div>

        {/* نوار پیشرفت متحرک */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-1/2 animate-[loading-progress_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />
        </div>
      </div>

      <style>{`
        @keyframes loading-progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;
