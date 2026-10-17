import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Headphones,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  XCircle,
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
  representativeId: string;
  representativeName?: string;
  type: RequestType;
  subject: string;
  description: string;
  preferredTime?: string;
  status: RequestStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const typeLabels: Record<RequestType, string> = {
  warranty: 'درخواست گارانتی',
  'business-card': 'کارت ویزیت',
  banner: 'طراحی بنر',
  'new-shipment': 'بار جدید',
  visit: 'بازدید',
  'urgent-call': 'تماس فوری',
  meeting: 'رزرو زمان جلسه',
};

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

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'خطای غیرمنتظره رخ داد.';
}

function readableDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'تاریخ نامشخص'
    : date.toLocaleString('fa-IR');
}

async function requestApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem('token');

  if (!token) {
    throw new Error('نشست شما منقضی شده است. دوباره وارد شوید.');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.error ||
        body?.message ||
        'ارتباط با سرور ناموفق بود.',
    );
  }

  return (body?.data ?? body) as T;
}

export default function AdminSupportRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<RequestStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] =
    useState<RequestType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { status: RequestStatus; adminNote: string }
    >
  >({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await requestApi<SupportRequest[]>(
        '/admin/support-requests',
      );

      if (!Array.isArray(data)) {
        throw new Error('پاسخ سرور برای درخواست‌ها معتبر نیست.');
      }

      setRequests(data);
      setDrafts(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            {
              status: item.status,
              adminNote: item.adminNote || '',
            },
          ]),
        ),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return requests.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ||
        item.status === statusFilter;

      const matchesType =
        typeFilter === 'all' ||
        item.type === typeFilter;

      const matchesSearch =
        !query ||
        [
          item.subject,
          item.description,
          item.representativeId,
          item.representativeName || '',
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query);

      return (
        matchesStatus &&
        matchesType &&
        matchesSearch
      );
    });
  }, [
    requests,
    search,
    statusFilter,
    typeFilter,
  ]);

  const counts = useMemo(
    () => ({
      pending: requests.filter(
        (item) => item.status === 'pending',
      ).length,
      inProgress: requests.filter(
        (item) => item.status === 'in-progress',
      ).length,
      resolved: requests.filter(
        (item) => item.status === 'resolved',
      ).length,
      rejected: requests.filter(
        (item) => item.status === 'rejected',
      ).length,
    }),
    [requests],
  );

  const updateDraft = (
    id: string,
    changes: Partial<{
      status: RequestStatus;
      adminNote: string;
    }>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...changes,
      },
    }));
  };

  const saveRequest = async (
    item: SupportRequest,
  ) => {
    const draft = drafts[item.id];

    if (!draft || savingId) {
      return;
    }

    setSavingId(item.id);
    setError('');
    setSuccess('');

    try {
      const updated = await requestApi<SupportRequest>(
        `/admin/support-requests/${encodeURIComponent(
          item.id,
        )}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: draft.status,
            adminNote: draft.adminNote.trim(),
          }),
        },
      );

      setRequests((current) =>
        current.map((entry) =>
          entry.id === item.id ? updated : entry,
        ),
      );

      setDrafts((current) => ({
        ...current,
        [item.id]: {
          status: updated.status,
          adminNote: updated.adminNote || '',
        },
      }));

      setSuccess(
        'درخواست با موفقیت به‌روزرسانی شد.',
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      dir="rtl"
      className="space-y-6 text-slate-900 dark:text-white"
    >
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-l from-cyan-50 via-white to-violet-50 p-6 shadow-sm dark:border-slate-700 dark:from-cyan-950/40 dark:via-slate-900 dark:to-violet-950/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
              <Headphones className="h-7 w-7" />
            </span>

            <div>
              <h2 className="text-xl font-black sm:text-2xl">
                رسیدگی به درخواست‌ها
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                درخواست‌های پشتیبانی نمایندگان را بررسی و پیگیری کنید.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            به‌روزرسانی
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'در انتظار',
            value: counts.pending,
            icon: Clock3,
            tone: 'text-amber-600 dark:text-amber-300',
          },
          {
            label: 'در حال رسیدگی',
            value: counts.inProgress,
            icon: MessageSquareText,
            tone: 'text-blue-600 dark:text-blue-300',
          },
          {
            label: 'رسیدگی‌شده',
            value: counts.resolved,
            icon: CheckCircle2,
            tone:
              'text-emerald-600 dark:text-emerald-300',
          },
          {
            label: 'ردشده',
            value: counts.rejected,
            icon: XCircle,
            tone: 'text-rose-600 dark:text-rose-300',
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <Icon
                className={`h-6 w-6 ${stat.tone}`}
              />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-black">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          {success}
        </div>
      )}

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-400" />
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="جست‌وجو در عنوان، توضیحات یا نام نماینده"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <select
          aria-label="فیلتر وضعیت"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as
                | RequestStatus
                | 'all',
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">
            همهٔ وضعیت‌ها
          </option>
          {Object.entries(statusLabels).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>

        <select
          aria-label="فیلتر نوع درخواست"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value as
                | RequestType
                | 'all',
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">
            همهٔ موضوع‌ها
          </option>
          {Object.entries(typeLabels).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          در حال دریافت درخواست‌ها...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          درخواستی مطابق فیلترها پیدا نشد.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((item) => {
            const draft = drafts[item.id] ?? {
              status: item.status,
              adminNote: item.adminNote || '',
            };

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      {typeLabels[item.type] ||
                        item.type}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">
                      {item.subject}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusClasses[item.status]
                    }`}
                  >
                    {statusLabels[item.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    نماینده:{' '}
                    {item.representativeName ||
                      item.representativeId}
                  </span>
                  <span>
                    ثبت:{' '}
                    {readableDate(item.createdAt)}
                  </span>
                  {item.preferredTime && (
                    <span>
                      زمان پیشنهادی:{' '}
                      {item.preferredTime}
                    </span>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {item.description}
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
                  <label className="block space-y-2 text-sm">
                    <span>وضعیت رسیدگی</span>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        updateDraft(item.id, {
                          status:
                            event.target
                              .value as RequestStatus,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {Object.entries(
                        statusLabels,
                      ).map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2 text-sm">
                    <span>
                      پاسخ یا یادداشت برای نماینده
                    </span>
                    <textarea
                      value={draft.adminNote}
                      onChange={(event) =>
                        updateDraft(item.id, {
                          adminNote:
                            event.target.value,
                        })
                      }
                      rows={2}
                      maxLength={2000}
                      placeholder="پاسخ یا توضیح پیگیری را بنویسید"
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      void saveRequest(item)
                    }
                    disabled={savingId !== null}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {savingId === item.id && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    ذخیرهٔ تغییرات
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}