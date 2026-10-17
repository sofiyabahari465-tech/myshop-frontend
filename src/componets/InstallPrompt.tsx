import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showFloatingButton, setShowFloatingButton] =
    useState(false);

  useEffect(() => {
    // چک کن آیا قبلاً نصب شده
    const isInstalled = window.matchMedia(
      '(display-mode: standalone)',
    ).matches;

    if (isInstalled) {
      return;
    }

    // چک کن آیا قبلاً رد کرده
    const dismissed = localStorage.getItem(
      'pwa-install-dismissed',
    );

    if (dismissed) {
      // بعد از ۷ روز دوباره نشون بده
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // گوش به رویداد beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(
        e as BeforeInstallPromptEvent,
      );

      // بعد از ۵ ثانیه بنر رو نشون بده
      setTimeout(() => {
        setShowBanner(true);
      }, 5000);

      // بعد از ۱۰ ثانیه دکمه شناور رو هم نشون بده
      setTimeout(() => {
        setShowFloatingButton(true);
      }, 10000);
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt,
    );

    // اگه نصب شد، بنر رو ببند
    const handleAppInstalled = () => {
      setShowBanner(false);
      setShowFloatingButton(false);
      setDeferredPrompt(null);
      console.log('PWA installed successfully');
    };

    window.addEventListener(
      'appinstalled',
      handleAppInstalled,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener(
        'appinstalled',
        handleAppInstalled,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // اگه beforeinstallprompt فعال نیست (مثل iOS)
      // راهنمایی کاربر برای دستی نصب کنه
      alert(
        'برای نصب اپلیکیشن:\n\n' +
          'اندروید (کروم):\n' +
          '۱. روی منوی سه‌نقطه بالا بزنید\n' +
          '۲. "افزودن به صفحه اصلی" رو انتخاب کنید\n\n' +
          'iOS (سافاری):\n' +
          '۱. روی دکمه Share بزنید\n' +
          '۲. "Add to Home Screen" رو انتخاب کنید',
      );
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      console.log('User accepted install');
    } else {
      console.log('User dismissed install');
    }

    setShowBanner(false);
    setShowFloatingButton(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(
      'pwa-install-dismissed',
      Date.now().toString(),
    );
  };

  // بنر اصلی (بالای سایت)
  if (showBanner) {
    return (
      <div
        dir="rtl"
        className="fixed inset-x-0 top-0 z-[9999] animate-[slideDown_0.4s_ease-out]"
      >
        <div className="mx-auto max-w-4xl m-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 p-4 shadow-2xl ring-1 ring-white/20">
            {/* پس‌زمینه تزئینی */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="relative flex items-center gap-3">
              {/* آیکون */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Smartphone className="h-6 w-6 text-white" />
              </div>

              {/* متن‌ها */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white sm:text-base">
                  نصب اپلیکیشن پنل مدیریت
                </p>
                <p className="mt-0.5 text-xs text-white/80 sm:text-sm">
                  دسترسی سریع‌تر، بدون مرورگر
                </p>
              </div>

              {/* دکمه‌ها */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50 sm:px-4 sm:text-sm"
                >
                  <Download className="h-4 w-4" />
                  نصب
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="بستن"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  // دکمه شناور (بعد از بستن بنر)
  if (showFloatingButton) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="fixed bottom-6 left-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/40 transition hover:scale-110"
        aria-label="نصب اپلیکیشن"
        title="نصب اپلیکیشن"
      >
        <Download className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
        </span>
      </button>
    );
  }

  return null;
};

export default InstallPrompt;
