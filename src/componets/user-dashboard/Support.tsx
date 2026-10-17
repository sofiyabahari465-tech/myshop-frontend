import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Headphones,
  Image,
  LoaderCircle,
  Megaphone,
  PackagePlus,
  PhoneCall,
  Send,
  X,
} from 'lucide-react';

type RequestType =
  | 'warranty'
  | 'business-card'
  | 'banner'
  | 'new-shipment'
  | 'visit'
  | 'urgent-call'
  | 'meeting';

type RequestStatus =
  | 'pending'
  | 'in-progress'
  | 'resolved'
  | 'rejected';

type SupportRequest = {
  id: string;
  type: RequestType;
  subject: string;
  description: string;
  preferredTime?: string;
  status: RequestStatus;
  adminNote?: string;
  createdAt: string;
};

type CardInfo = {
  id: RequestType;
  title: string;
  subtitle: string;
  icon: typeof Headphones;
  gradient: string;
  iconColor: string;
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const cards: CardInfo[] = [
  {
    id: 'warranty',
    title: 'درخواست گارانتی',
    subtitle: 'ثبت مشکل کالا و پیگیری خدمات گارانتی',
    icon: BadgeCheck,
    gradient: 'from-sky-500/15 to-cyan-500/5',
    iconColor: 'text-sky-600 dark:text-sky-300',
  },
  {
    id: 'business-card',
    title: 'کارت ویزیت',
    subtitle: 'درخواست طراحی یا چاپ کارت ویزیت',
    icon: Image,
    gradient: 'from-violet-500/15 to-fuchsia-500/5',
    iconColor: 'text-violet-600 dark:text-violet-300',
  },
  {
    id: 'banner',
    title: 'طراحی بنر',
    subtitle: 'ثبت سفارش طراحی بنر تبلیغاتی',
    icon: Megaphone,
    gradient: 'from-pink-500/15 to-rose-500/5',
    iconColor: 'text-pink-600 dark:text-pink-300',
  },
  {
    id: 'new-shipment',
    title: 'بار جدید',
    subtitle: 'درخواست هماهنگی برای بار جدید',
    icon: PackagePlus,
    gradient: 'from-amber-500/15 to-orange-500/5',
    iconColor: 'text-amber-600 dark:text-amber-300',
  },
  {
    id: 'visit',
    title: 'بازدید',
    subtitle: 'درخواست بازدید یا هماهنگی حضوری',
    icon: Headphones,
    gradient: 'from-emerald-500/15 to-teal-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    id: 'urgent-call',
    title: 'تماس فوری',
    subtitle: 'درخواست تماس سریع از تیم پشتیبانی',
    icon: PhoneCall,
    gradient: 'from-red-500/15 to-rose-500/5',
    iconColor: 'text-red-600 dark:text-red-300',
  },
  {
    id: 'meeting',
    title: 'رزرو زمان جلسه',
    subtitle: 'پیشنهاد زمان برای جلسه با مجموعه',
    icon: CalendarDays,
    gradient: 'from-indigo-500/15 to-blue-500/5',
    iconColor: 'text-indigo-600 dark:text-indigo-300',
  },
];

const statusLabels: Record<RequestStatus, string> = {
  pending: 'در انتظار رسیدگی',
  'in-progress': 'در حال رسیدگی',
  resolved: 'رسیدگی‌شده',
  rejected: 'ردشده',
};

const statusClasses: Record<RequestStatus, string> = {
  pending:
    'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  'in-progress':
    'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  resolved:
    'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  rejected:
    'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'خطای غیرمنتظره رخ داد.';
}

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('token');

  if (!token) {
    throw new Error('نشست شما موجود نیست. دوباره وارد شوید.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function readableDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'تاریخ نامشخص'
    : date.toLocaleString('fa-IR');
}

const Support: React.FC = () => {
  const [selected, setSelected] = useState<CardInfo | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch(
          `${API_URL}/support-requests/mine`,
          {
            headers: getAuthHeaders(),
          },
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            body?.error ||
              body?.message ||
              'دریافت درخواست‌ها ناموفق بود.',
          );
        }

        const data = body?.data ?? body;

        if (!Array.isArray(data)) {
          throw new Error(
            'پاسخ سرور برای درخواست‌ها معتبر نیست.',
          );
        }

        if (!cancelled) {
          setRequests(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const openForm = (card: CardInfo) => {
    setSelected(card);
    setSubject('');
    setDescription('');
    setPreferredTime('');
    setError('');
    setSuccess('');

    // اسکرول به فرم
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const submitRequest = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selected || submitting) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/support-requests`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: selected.id,
            subject: subject.trim(),
            description: description.trim(),
            preferredTime: preferredTime.trim(),
          }),
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error ||
            body?.message ||
            'ثبت درخواست ناموفق بود.',
        );
      }

      const data = body?.data ?? body;

      if (!data?.id) {
        throw new Error('پاسخ ثبت درخواست معتبر نیست.');
      }

      setRequests((current) => [
        data as SupportRequest,
        ...current,
      ]);
      setSelected(null);
      setSuccess(
        'درخواست شما ثبت شد و در انتظار رسیدگی است.',
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-full space-y-8 text-slate-900 dark:text-white"
    >
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-cyan-50 via-white to-violet-50 p-6 shadow-xl dark:border-cyan-500/20 dark:from-cyan-950/40 dark:via-slate-900 dark:to-violet-950/30 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-100 dark:border-cyan-400/30 dark:bg-cyan-400/10">
            <Headphones className="h-7 w-7 text-cyan-700 dark:text-cyan-300" />
          </div>

          <div>
            <p className="text-sm text-cyan-700 dark:text-cyan-300">
              همراه شما هستیم
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              مرکز پشتیبانی نمایندگان
            </h1>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          موضوع موردنظرتان را انتخاب کنید، توضیحات را بنویسید و وضعیت
          درخواست را از همین صفحه دنبال کنید.
        </p>
      </header>

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          {success}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <section aria-labelledby="support-categories">
        <h2
          id="support-categories"
          className="mb-4 text-lg font-bold"
        >
          چه کمکی نیاز دارید؟
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.id}
                className={`group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-gradient-to-br ${card.gradient} bg-white p-5 text-right shadow-lg transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50 dark:border-white/10 dark:bg-slate-900`}
              >
                <div className="mb-5 flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-slate-900/60">
                    <Icon
                      className={`h-6 w-6 ${card.iconColor}`}
                    />
                  </span>

                  <ArrowLeft className="h-5 w-5 text-slate-500 transition group-hover:-translate-x-1 group-hover:text-cyan-500 dark:text-slate-400" />
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {card.title}
                </h3>

                <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">
                  {card.subtitle}
                </p>

                <button
                  type="button"
                  onClick={() => openForm(card)}
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  ثبت درخواست
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {selected && (
        <section
          ref={formRef}
          aria-labelledby="support-form-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-cyan-500/25 dark:bg-slate-900 sm:p-7"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-cyan-700 dark:text-cyan-300">
                ثبت درخواست جدید
              </p>
              <h2
                id="support-form-title"
                className="mt-1 text-xl font-bold"
              >
                {selected.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="بستن فرم"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={submitRequest}
            className="space-y-5"
          >
            <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <span>عنوان درخواست</span>
              <input
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                required
                maxLength={120}
                placeholder="عنوان کوتاه و مشخص بنویسید"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <span>توضیحات</span>
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                required
                maxLength={2000}
                rows={5}
                placeholder="جزئیاتی که به رسیدگی کمک می‌کند بنویسید"
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

            {selected.id === 'meeting' && (
              <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <span>زمان پیشنهادی جلسه</span>
                <input
                  value={preferredTime}
                  onChange={(event) =>
                    setPreferredTime(event.target.value)
                  }
                  required
                  maxLength={120}
                  placeholder="مثلاً شنبه ساعت ۱۰ تا ۱۲"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {submitting
                ? 'در حال ثبت...'
                : 'ارسال درخواست'}
            </button>
          </form>
        </section>
      )}

      <section aria-labelledby="my-requests">
        <h2
          id="my-requests"
          className="mb-4 text-lg font-bold"
        >
          درخواست‌های من
        </h2>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            در حال دریافت درخواست‌ها...
          </p>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            هنوز درخواستی ثبت نکرده‌اید.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      {cards.find(
                        (card) =>
                          card.id === request.type,
                      )?.title ||
                        'درخواست پشتیبانی'}
                    </p>

                    <h3 className="mt-1 font-bold">
                      {request.subject}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusClasses[request.status] ||
                      statusClasses.pending
                    }`}
                  >
                    {statusLabels[request.status] ||
                      request.status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {request.description}
                </p>

                {request.adminNote && (
                  <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                    <p className="mb-1 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                      پاسخ پشتیبانی
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-slate-200">
                      {request.adminNote}
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {readableDate(request.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Support;