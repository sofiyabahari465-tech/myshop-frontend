import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type LoginRole = 'admin' | 'representative';

interface LoginUser {
  id: string | number;
  username?: string;
  name?: string;
  role: LoginRole;
  representativeId?: string | number;
  code?: string | number;
  city?: string;
  phone?: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  user?: LoginUser;
}

// ===== اصلاح شده: آدرس واقعی بک‌اند + fallback درست =====
const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://myshop-backend-8nu7.onrender.com/api' // ← آدرس واقعی رندر به‌عنوان fallback
).replace(/\/+$/, '');

// ===== اصلاح شده: timeout زیاد برای پلن رایگان Render (cold start) =====
const LOGIN_TIMEOUT = 90000; // 90 ثانیه - برای زمان cold start پلن رایگان Render

const normalizeValue = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );
};

const clearStoredSession = () => {
  const keys = [
    'token',
    'accessToken',
    'authToken',
    'adminToken',
    'jwt',
    'access_token',
    'authUser',
    'isLoggedIn',
    'userRole',
    'representativeId',
    'activeSection',
  ];

  for (const key of keys) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
};

const getLoginErrorMessage = (
  error: unknown,
  role: LoginRole,
): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'ورود انجام نشد. دوباره تلاش کنید.';
  }

  const status = error.response?.status;

  const apiMessage =
    error.response?.data?.error ||
    error.response?.data?.message;

  if (typeof apiMessage === 'string' && apiMessage) {
    return apiMessage;
  }

  if (status === 401) {
    return role === 'admin'
      ? 'نام کاربری یا رمز عبور ادمین اشتباه است.'
      : 'نام نماینده یا کد نمایندگی اشتباه است.';
  }

  if (status === 403) {
    return 'حساب کاربری شما غیرفعال است یا اجازهٔ ورود ندارد.';
  }

  if (status === 404) {
    return 'مسیر ورود در بک‌اند پیدا نشد. اتصال auth.routes.js در index.js را بررسی کنید.';
  }

  // ===== اصلاح شده: پیام واضح برای تایم‌اوت =====
  if (
    error.code === 'ECONNABORTED' ||
    error.message?.includes('timeout')
  ) {
    return 'سرور در حال آماده‌سازی است (پلن رایگان Render). لطفاً چند ثانیه صبر کرده و دوباره تلاش کنید.';
  }

  if (!error.response) {
    return 'ارتباط با بک‌اند برقرار نشد. اجرای بک‌اند و تنظیمات CORS را بررسی کنید.';
  }

  return 'ورود انجام نشد. لطفاً دوباره تلاش کنید.';
};

// ===== تابع کمکی: صبر کردن قبل از retry =====
const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<LoginRole>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const changeRole = (nextRole: LoginRole) => {
    if (loading) {
      return;
    }

    setRole(nextRole);
    setUsername('');
    setPassword('');
    setName('');
    setCode('');
    setErrorMessage('');
  };

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMessage('');

    const normalizedUsername = normalizeValue(username);
    const normalizedName = name.trim();
    const normalizedCode = normalizeValue(code);

    if (
      role === 'admin' &&
      (!normalizedUsername || !password)
    ) {
      setErrorMessage(
        'نام کاربری و رمز عبور را وارد کنید.',
      );
      return;
    }

    if (
      role === 'representative' &&
      (!normalizedName || !normalizedCode)
    ) {
      setErrorMessage(
        'نام و کد نمایندگی را وارد کنید.',
      );
      return;
    }

    const endpoint =
      role === 'admin'
        ? '/auth/admin/login'
        : '/auth/representative/login';

    const body =
      role === 'admin'
        ? {
            username: normalizedUsername,
            password,
          }
        : {
            name: normalizedName,
            code: normalizedCode,
          };

    setLoading(true);

    // ===== اصلاح شده: retry logic برای پلن رایگان Render =====
    const MAX_RETRIES = 2;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post<LoginResponse>(
          `${API_URL}${endpoint}`,
          body,
          {
            withCredentials: true,
            timeout: LOGIN_TIMEOUT, // ← تایم‌اوت زیاد
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        );

        const result = response.data;
        const token = result.token?.trim();
        const user = result.user;

        if (
          !result.success ||
          !token ||
          !user ||
          !user.id ||
          !user.role
        ) {
          throw new Error(
            result.error ||
              'پاسخ ورود از سرور ناقص است.',
          );
        }

        if (user.role !== role) {
          throw new Error(
            'نوع حساب دریافتی با نوع ورود انتخاب‌شده یکسان نیست.',
          );
        }

        clearStoredSession();

        // ذخیره در sessionStorage (برای تب موقت)
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('authUser', JSON.stringify(user));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userRole', user.role);
        sessionStorage.setItem('activeSection', 'dashboard');

        // ذخیره در localStorage (برای اپ نصب‌شده - دائمی)
        localStorage.setItem('token', token);
        localStorage.setItem('authUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('activeSection', 'dashboard');

        if (user.role === 'representative') {
          const repId = String(user.representativeId ?? user.id);
          sessionStorage.setItem('representativeId', repId);
          localStorage.setItem('representativeId', repId);

          navigate('/user-dashboard', {
            replace: true,
          });

          return;
        }

        sessionStorage.removeItem('representativeId');
        localStorage.removeItem('representativeId');

        navigate('/', {
          replace: true,
        });

        return; // موفقیت‌آمیز بود، از حلقه خارج شو
      } catch (error) {
        lastError = error;

        // اگه ارور 401 یا 403 بود (ناموفق بودن اعتبار)، retry نکن
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 ||
            error.response?.status === 403 ||
            error.response?.status === 400)
        ) {
          break;
        }

        // اگه تلاش آخر نبود، ۲ ثانیه صبر کن و retry کن
        if (attempt < MAX_RETRIES) {
          await sleep(2000);
        }
      }
    }

    // اگه به اینجا رسیدیم، یعنی همه تلاش‌ها شکست خوردن
    console.error('خطا در ورود:', lastError);
    setErrorMessage(getLoginErrorMessage(lastError, role));
    setLoading(false);
  };

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4"
    >
      {/* پس‌زمینهٔ تزئینی با گوی‌های درخشان و الگوی شبکه‌ای */}
      <div className="pointer-events-none absolute inset-0">
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

      {/* قاب درخشان دور کارت */}
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-400/30 via-purple-400/30 to-indigo-400/30 blur-lg" />

        {/* کارت اصلی با سایهٔ سه‌بعدی چندلایه‌ای */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6),0_15px_30px_-10px_rgba(0,0,0,0.4),0_5px_15px_-5px_rgba(0,0,0,0.3)] ring-1 ring-white/20">
          {/* سربرگ با گرادیان و عمق سه‌بعدی */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-7 py-10 text-center text-white shadow-[inset_0_-8px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 15% 50%, rgba(56, 189, 248, 0.45), transparent 50%), radial-gradient(circle at 85% 0%, rgba(168, 85, 247, 0.45), transparent 50%)',
              }}
            />

            {/* لوگو با عمق سه‌بعدی (های‌لایت درونی + سایهٔ بیرونی) */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 opacity-70 blur-lg" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-purple-500 text-4xl font-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-4px_8px_rgba(0,0,0,0.35),0_10px_20px_rgba(56,189,248,0.5)] ring-1 ring-white/40">
                P
              </div>
            </div>

            <h1 className="relative text-2xl font-black tracking-tight drop-shadow-lg">
              ورود به پنل شرکت
            </h1>

            <p className="relative mt-2 text-sm text-cyan-100/80">
              نوع ورود را انتخاب کنید
            </p>
          </div>

          <div className="bg-gradient-to-b from-gray-50 to-gray-200 p-6 sm:p-8">
            {/* زبانه‌های انتخاب نقش - ظرف فروبرفته با دکمه‌های سه‌بعدی */}
            <div className="relative mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-gray-300/70 p-2 shadow-[inset_0_3px_6px_rgba(0,0,0,0.18),inset_0_-1px_2px_rgba(255,255,255,0.7)]">
              <button
                type="button"
                disabled={loading}
                onClick={() => changeRole('admin')}
                className={`relative flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-all duration-150 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  role === 'admin'
                    ? 'bg-gradient-to-b from-cyan-400 to-cyan-600 text-white shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_5px_0_#0e7490,0_7px_12px_rgba(8,145,178,0.55)] active:shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_1px_0_#0e7490,0_2px_5px_rgba(8,145,178,0.55)]'
                    : 'bg-gray-100 text-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_1px_0_rgba(255,255,255,0.9)] hover:bg-white hover:text-gray-900'
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                ادمین
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => changeRole('representative')}
                className={`relative flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-all duration-150 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  role === 'representative'
                    ? 'bg-gradient-to-b from-purple-400 to-purple-600 text-white shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_5px_0_#5b21b6,0_7px_12px_rgba(126,34,206,0.55)] active:shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_1px_0_#5b21b6,0_2px_5px_rgba(126,34,206,0.55)]'
                    : 'bg-gray-100 text-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_1px_0_rgba(255,255,255,0.9)] hover:bg-white hover:text-gray-900'
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                نماینده
              </button>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-right text-sm font-bold leading-6 text-red-700 shadow-[inset_0_2px_4px_rgba(220,38,38,0.2),0_3px_6px_rgba(220,38,38,0.25)]"
              >
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-5">
              {role === 'admin' ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold leading-6 text-cyan-700 shadow-[inset_0_1px_3px_rgba(8,145,178,0.18)]">
                    <svg
                      className="h-4 w-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    ورود مدیر سیستم با نام کاربری و رمز عبور
                  </div>

                  <div>
                    <label
                      htmlFor="admin-username"
                      className="mb-2 block text-sm font-bold text-gray-700"
                    >
                      نام کاربری
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <input
                        id="admin-username"
                        type="text"
                        value={username}
                        onChange={(event) =>
                          setUsername(event.target.value)
                        }
                        autoComplete="username"
                        className="min-h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-100 pr-12 pl-4 text-right text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-cyan-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_5px_rgba(8,145,178,0.12),0_0_0_4px_rgba(8,145,178,0.15)]"
                        placeholder="admin"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-password"
                      className="mb-2 block text-sm font-bold text-gray-700"
                    >
                      رمز عبور
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        autoComplete="current-password"
                        className="min-h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-100 pr-12 pl-4 text-right text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-cyan-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_5px_rgba(8,145,178,0.12),0_0_0_4px_rgba(8,145,178,0.15)]"
                        placeholder="رمز عبور"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-bold leading-6 text-purple-700 shadow-[inset_0_1px_3px_rgba(126,34,206,0.18)]">
                    <svg
                      className="h-4 w-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    نماینده فقط به اطلاعات، بارها و انبار شخصی خودش دسترسی دارد.
                  </div>

                  <div>
                    <label
                      htmlFor="representative-name"
                      className="mb-2 block text-sm font-bold text-gray-700"
                    >
                      نام نماینده
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <input
                        id="representative-name"
                        type="text"
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        autoComplete="name"
                        className="min-h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-100 pr-12 pl-4 text-right text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-purple-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_5px_rgba(126,34,206,0.12),0_0_0_4px_rgba(126,34,206,0.15)]"
                        placeholder="نام ثبت‌شده نماینده"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="representative-code"
                      className="mb-2 block text-sm font-bold text-gray-700"
                    >
                      کد نمایندگی
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </div>
                      <input
                        id="representative-code"
                        type="text"
                        value={code}
                        onChange={(event) =>
                          setCode(event.target.value)
                        }
                        inputMode="numeric"
                        autoComplete="off"
                        className="min-h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-100 pr-12 pl-4 text-right text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-purple-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_5px_rgba(126,34,206,0.12),0_0_0_4px_rgba(126,34,206,0.15)]"
                        placeholder="مثلاً 1001"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`group relative min-h-[52px] w-full overflow-hidden rounded-xl px-4 py-3 text-base font-black text-white transition-all duration-150 active:translate-y-1.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  role === 'admin'
                    ? 'bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_6px_0_#0c4a6e,0_9px_18px_rgba(8,47,73,0.55)] hover:from-cyan-500 hover:to-blue-700 active:shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_0_0_#0c4a6e,0_3px_8px_rgba(8,47,73,0.55)]'
                    : 'bg-gradient-to-b from-purple-400 to-indigo-600 shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_6px_0_#312e81,0_9px_18px_rgba(49,46,129,0.55)] hover:from-purple-500 hover:to-indigo-700 active:shadow-[inset_0_2px_2px_rgba(255,255,255,0.35),0_0_0_#312e81,0_3px_8px_rgba(49,46,129,0.55)]'
                }`}
              >
                {/* جلوهٔ درخشش هنگام هاور */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      در حال ورود... ممکن است چند ثانیه طول بکشد
                    </>
                  ) : role === 'admin' ? (
                    'ورود به پنل ادمین'
                  ) : (
                    'ورود به داشبورد شخصی'
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
