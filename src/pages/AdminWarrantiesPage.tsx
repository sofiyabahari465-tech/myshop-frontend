import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileText,
  ImageOff,
  LoaderCircle,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';


type WarrantyStatus =
  | 'pending'
  | 'approved'
  | 'rejected';


type WarrantySmsStatus =
  | 'not_sent'
  | 'sending'
  | 'sent'
  | 'skipped'
  | 'failed';


type WarrantyRequest = {
  id: string;

  representativeId: string;
  representativeName: string;
  representativeCode: string;
  representativeCity: string;

  customerName: string;
  customerPhone: string;

  productId: string;
  warehouseItemId: string;
  productName: string;
  brand: string;
  category?: string;

  quantity: number;
  issueDescription: string;

  image?: string;

  requestDate?: string;
  createdAt: string;
  updatedAt?: string;

  status: WarrantyStatus;

  adminNote?: string;
  decidedAt?: string | null;
  decidedBy?: string;

  stockDeductedAt?: string | null;
  stockDeductedBy?: string;

  smsStatus?: WarrantySmsStatus;
  smsSentAt?: string | null;
  smsError?: string;
  smsResponse?: unknown;
};


type WarrantyListResponse = {
  success: boolean;
  count?: number;
  data?: WarrantyRequest[];
  error?: string;
};


type WarrantyDecisionResponse = {
  success: boolean;
  message?: string;
  data?: {
    warranty?: WarrantyRequest;
    warehouseItem?: {
      id?: string;
      productId?: string;
      productName?: string;
      quantity?: number;
    } | null;
  };
  error?: string;
};


const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


const API_BASE_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL.slice(0, -4)
  : RAW_API_URL;


const getToken = () => {
  return (
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  );
};


const getImageUrl = (imagePath?: string) => {
  if (!imagePath) {
    return '';
  }

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }

  return `${API_BASE_URL}${imagePath}`;
};


const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};


const statusConfig: Record<
  WarrantyStatus,
  {
    label: string;
    className: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: 'در انتظار بررسی',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
    icon: ShieldAlert,
  },

  approved: {
    label: 'تأیید شده',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },

  rejected: {
    label: 'رد شده',
    className:
      'border-rose-200 bg-rose-50 text-rose-700',
    icon: XCircle,
  },
};


const StatusBadge: React.FC<{
  status: WarrantyStatus;
}> = ({ status }) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1.5 text-[10px] font-black sm:px-2.5 sm:text-xs',
        config.className,
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {config.label}
    </span>
  );
};


const SmsStatusCard: React.FC<{
  warranty: WarrantyRequest;
}> = ({ warranty }) => {
  if (warranty.status !== 'approved') {
    return null;
  }

  if (warranty.smsStatus === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />

          <div className="min-w-0">
            <h3 className="font-black text-emerald-900">
              پیامک تأیید گارانتی ارسال شد
            </h3>

            <p className="mt-1 text-sm font-medium leading-7 text-emerald-800">
              پیامک اطلاع‌رسانی تأیید گارانتی برای مشتری ارسال شده است.
            </p>

            <p className="mt-2 text-xs font-bold text-emerald-700">
              زمان ارسال:{' '}
              {formatDateTime(warranty.smsSentAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (warranty.smsStatus === 'sending') {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <LoaderCircle className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-sky-600" />

          <div>
            <h3 className="font-black text-sky-900">
              در حال ارسال پیامک
            </h3>

            <p className="mt-1 text-sm font-medium leading-7 text-sky-800">
              درخواست تأیید شده و وضعیت ارسال پیامک در حال بررسی است.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (warranty.smsStatus === 'skipped') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />

          <div className="min-w-0">
            <h3 className="font-black text-amber-900">
              پیامک ارسال نشد
            </h3>

            <p className="mt-1 text-sm font-medium leading-7 text-amber-800">
              گارانتی تأیید شده است، اما پیامک برای مشتری ارسال نشد.
            </p>

            {warranty.smsError ? (
              <p className="mt-2 break-words text-xs font-bold leading-6 text-amber-700">
                دلیل: {warranty.smsError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (warranty.smsStatus === 'failed') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />

          <div className="min-w-0">
            <h3 className="font-black text-rose-900">
              ارسال پیامک ناموفق بود
            </h3>

            <p className="mt-1 text-sm font-medium leading-7 text-rose-800">
              گارانتی تأیید و موجودی انبار کم شده است، اما سامانه پیامک پاسخ موفق نداده است.
            </p>

            {warranty.smsError ? (
              <p className="mt-2 break-words text-xs font-bold leading-6 text-rose-700">
                خطا: {warranty.smsError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <Phone className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" />

        <div>
          <h3 className="font-black text-slate-800">
            وضعیت پیامک گارانتی ثبت نشده است
          </h3>

          <p className="mt-1 text-sm font-medium leading-7 text-slate-600">
            این درخواست ممکن است پیش از فعال‌شدن پیامک گارانتی تأیید شده باشد.
          </p>
        </div>
      </div>
    </div>
  );
};


const AdminWarrantiesPage: React.FC = () => {
  const [warranties, setWarranties] = useState<
    WarrantyRequest[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<
    'all' | WarrantyStatus
  >('all');

  const [selectedWarranty, setSelectedWarranty] =
    useState<WarrantyRequest | null>(null);

  const [adminNote, setAdminNote] = useState('');

  const [decisionLoading, setDecisionLoading] =
    useState<WarrantyStatus | null>(null);

  const [actionError, setActionError] = useState<
    string | null
  >(null);

  const [actionMessage, setActionMessage] = useState<
    string | null
  >(null);

  const [imageFailed, setImageFailed] = useState(false);


  const loadWarranties = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();

      if (!token) {
        throw new Error(
          'توکن ورود پیدا نشد. دوباره وارد شوید.',
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/warranties/admin/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const result: WarrantyListResponse =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            'دریافت درخواست‌های گارانتی ناموفق بود.',
        );
      }

      setWarranties(
        Array.isArray(result.data)
          ? result.data
          : [],
      );
    } catch (fetchError) {
      console.error(
        'خطا در دریافت درخواست‌های گارانتی:',
        fetchError,
      );

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'خطا در ارتباط با سرور.',
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    void loadWarranties();
  }, []);


  useEffect(() => {
    if (!selectedWarranty) {
      return;
    }

    setAdminNote(selectedWarranty.adminNote || '');
    setActionError(null);
    setActionMessage(null);
    setImageFailed(false);
  }, [selectedWarranty]);


  const filteredWarranties = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLocaleLowerCase('fa-IR');

    return warranties.filter((warranty) => {
      const matchesStatus =
        statusFilter === 'all' ||
        warranty.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        warranty.id,
        warranty.representativeName,
        warranty.representativeCode,
        warranty.representativeCity,
        warranty.customerName,
        warranty.customerPhone,
        warranty.productName,
        warranty.brand,
        warranty.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fa-IR');

      return searchableText.includes(normalizedSearch);
    });
  }, [
    searchTerm,
    statusFilter,
    warranties,
  ]);


  const counts = useMemo(() => {
    return warranties.reduce(
      (result, warranty) => {
        result.total += 1;
        result[warranty.status] += 1;

        return result;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      },
    );
  }, [warranties]);


  const updateWarrantyInState = (
    updatedWarranty: WarrantyRequest,
  ) => {
    setWarranties((current) => {
      return current.map((warranty) => {
        return warranty.id === updatedWarranty.id
          ? updatedWarranty
          : warranty;
      });
    });

    setSelectedWarranty(updatedWarranty);
  };


  const closeModal = () => {
    if (decisionLoading) {
      return;
    }

    setSelectedWarranty(null);
    setActionError(null);
    setActionMessage(null);
  };


  const handleDecision = async (
    decision: WarrantyStatus,
  ) => {
    if (
      !selectedWarranty ||
      selectedWarranty.status !== 'pending'
    ) {
      return;
    }

    if (
      decision !== 'approved' &&
      decision !== 'rejected'
    ) {
      return;
    }

    const confirmText =
      decision === 'approved'
        ? `آیا از تأیید این درخواست مطمئن هستید؟\n\n${selectedWarranty.quantity} عدد از محصول «${selectedWarranty.productName}» از انبار نماینده کم می‌شود و پیامک تأیید برای مشتری ارسال خواهد شد.`
        : 'آیا از رد این درخواست مطمئن هستید؟\n\nموجودی انبار تغییری نمی‌کند.';

    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      setDecisionLoading(decision);
      setActionError(null);
      setActionMessage(null);

      const token = getToken();

      if (!token) {
        throw new Error(
          'توکن ادمین پیدا نشد. دوباره وارد شوید.',
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/warranties/admin/${selectedWarranty.id}/decision`,
        {
          method: 'PATCH',

          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            status: decision,
            adminNote: adminNote.trim(),
          }),
        },
      );

      const result: WarrantyDecisionResponse =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            'ثبت تصمیم ادمین ناموفق بود.',
        );
      }

      if (result.data?.warranty) {
        updateWarrantyInState(result.data.warranty);
      }

      setActionMessage(
        result.message ||
          'تصمیم با موفقیت ثبت شد.',
      );
    } catch (decisionError) {
      console.error(
        'خطا در ثبت تصمیم گارانتی:',
        decisionError,
      );

      setActionError(
        decisionError instanceof Error
          ? decisionError.message
          : 'خطا در ارتباط با سرور.',
      );
    } finally {
      setDecisionLoading(null);
    }
  };


  if (loading) {
    return (
      <section
        dir="rtl"
        className="flex min-h-[440px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-10 w-10 animate-spin text-sky-600" />

          <p className="text-sm font-black text-slate-600">
            در حال دریافت درخواست‌های گارانتی...
          </p>
        </div>
      </section>
    );
  }


  if (error) {
    return (
      <section
        dir="rtl"
        className="rounded-3xl border border-rose-200 bg-rose-50 p-7 text-center"
      >
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />

        <h2 className="mt-4 text-lg font-black text-rose-800">
          دریافت اطلاعات ناموفق بود
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-rose-700">
          {error}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadWarranties();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-rose-700"
        >
          <RefreshCw className="h-4 w-4" />
          تلاش دوباره
        </button>
      </section>
    );
  }

   return (
    <section
      dir="rtl"
      className="w-full min-w-0 space-y-5 overflow-x-hidden pb-10"
    >
      <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-xl shadow-sky-950/5">
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-950 via-sky-950 to-cyan-700 px-5 py-7 text-white md:px-8">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-24 right-20 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-sky-100">
                <ShieldCheck className="h-5 w-5" />

                <span className="text-sm font-bold">
                  مدیریت خدمات پس از فروش
                </span>
              </div>

              <h1 className="text-2xl font-black md:text-3xl">
                بررسی درخواست‌های گارانتی
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-sky-100">
                درخواست‌ها را بررسی کنید و پس از تأیید، موجودی کالای نماینده را به‌صورت خودکار کاهش دهید.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadWarranties();
              }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              به‌روزرسانی
            </button>
          </div>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5">
            <p className="text-xs font-bold text-slate-500">
              کل درخواست‌ها
            </p>

            <p className="mt-2 text-3xl font-black text-slate-800">
              {counts.total.toLocaleString('fa-IR')}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-xs font-bold text-amber-600">
              در انتظار بررسی
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {counts.pending.toLocaleString('fa-IR')}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-xs font-bold text-emerald-600">
              تأیید شده
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-700">
              {counts.approved.toLocaleString('fa-IR')}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-xs font-bold text-rose-600">
              رد شده
            </p>

            <p className="mt-2 text-3xl font-black text-rose-700">
              {counts.rejected.toLocaleString('fa-IR')}
            </p>
          </div>
        </div>
      </div>


      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              placeholder="جست‌وجو در مشتری، نماینده، محصول یا برند..."
              className="h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white py-3 pr-11 pl-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="relative min-w-0">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as
                    | 'all'
                    | WarrantyStatus,
                );
              }}
              className="h-12 w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-4 pl-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">
                همه وضعیت‌ها
              </option>

              <option value="pending">
                در انتظار بررسی
              </option>

              <option value="approved">
                تأیید شده
              </option>

              <option value="rejected">
                رد شده
              </option>
            </select>

            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>


      <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-l from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-sky-600" />

            <h2 className="truncate font-black text-slate-800">
              فهرست درخواست‌ها
            </h2>
          </div>

          <p className="text-xs font-bold text-slate-500">
            نمایش{' '}
            {filteredWarranties.length.toLocaleString('fa-IR')}{' '}
            درخواست
          </p>
        </div>


        {filteredWarranties.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <ClipboardCheck className="mx-auto h-14 w-14 text-slate-300" />

            <p className="mt-4 font-black text-slate-700">
              درخواستی پیدا نشد
            </p>

            <p className="mt-2 text-sm text-slate-500">
              جست‌وجو یا فیلتر وضعیت را تغییر دهید.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {filteredWarranties.map((warranty) => (
                <article
                  key={warranty.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">
                        {warranty.productName || 'بدون نام'}
                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        {warranty.brand || 'بدون برند'}
                      </p>
                    </div>

                    <StatusBadge status={warranty.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400">
                        نماینده
                      </p>

                      <p className="mt-1 truncate text-xs font-black text-slate-700">
                        {warranty.representativeName || '—'}
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 truncate text-[10px] text-slate-500"
                      >
                        {warranty.representativeCode || '—'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400">
                        مشتری
                      </p>

                      <p className="mt-1 truncate text-xs font-black text-slate-700">
                        {warranty.customerName || '—'}
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 truncate text-[10px] text-slate-500"
                      >
                        {warranty.customerPhone || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400">
                        تعداد
                      </p>

                      <p className="mt-1 text-xs font-black text-sky-700">
                        {Number(
                          warranty.quantity || 0,
                        ).toLocaleString('fa-IR')}{' '}
                        عدد
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400">
                        تاریخ ثبت
                      </p>

                      <p className="mt-1 text-[10px] font-bold leading-5 text-slate-600">
                        {formatDateTime(
                          warranty.requestDate ||
                            warranty.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWarranty(warranty);
                      }}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 transition-colors hover:bg-sky-100"
                    >
                      <Eye className="h-4 w-4" />
                      بررسی کامل درخواست
                    </button>
                  </div>
                </article>
              ))}
            </div>


            <div className="hidden w-full overflow-hidden md:block">
              <table className="w-full table-fixed text-right">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="w-[18%] border-b border-slate-200 px-3 py-4 text-xs font-black lg:w-[16%]">
                      نماینده
                    </th>

                    <th className="w-[18%] border-b border-slate-200 px-3 py-4 text-xs font-black lg:w-[15%]">
                      مشتری
                    </th>

                    <th className="w-[30%] border-b border-slate-200 px-3 py-4 text-xs font-black lg:w-[27%]">
                      محصول
                    </th>

                    <th className="hidden border-b border-slate-200 px-2 py-4 text-xs font-black lg:table-cell lg:w-[7%]">
                      تعداد
                    </th>

                    <th className="hidden border-b border-slate-200 px-2 py-4 text-xs font-black xl:table-cell xl:w-[13%]">
                      تاریخ
                    </th>

                    <th className="w-[20%] border-b border-slate-200 px-2 py-4 text-xs font-black lg:w-[16%]">
                      وضعیت
                    </th>

                    <th className="w-[14%] border-b border-slate-200 px-2 py-4 text-center text-xs font-black lg:w-[12%]">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredWarranties.map((warranty) => (
                    <tr
                      key={warranty.id}
                      className="transition-colors hover:bg-sky-50/60"
                    >
                      <td className="min-w-0 px-3 py-4 align-top">
                        <p
                          title={warranty.representativeName}
                          className="truncate text-xs font-black text-slate-800 lg:text-sm"
                        >
                          {warranty.representativeName || '—'}
                        </p>

                        <p
                          dir="ltr"
                          title={warranty.representativeCode}
                          className="mt-1 truncate text-[10px] font-medium text-slate-500 lg:text-xs"
                        >
                          {warranty.representativeCode || '—'}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-slate-400">
                          {warranty.representativeCity || '—'}
                        </p>
                      </td>

                      <td className="min-w-0 px-3 py-4 align-top">
                        <p
                          title={warranty.customerName}
                          className="truncate text-xs font-bold text-slate-800 lg:text-sm"
                        >
                          {warranty.customerName || '—'}
                        </p>

                        <p
                          dir="ltr"
                          title={warranty.customerPhone}
                          className="mt-1 truncate text-[10px] font-medium text-slate-500 lg:text-xs"
                        >
                          {warranty.customerPhone || '—'}
                        </p>
                      </td>

                      <td className="min-w-0 px-3 py-4 align-top">
                        <p
                          title={warranty.productName}
                          className="truncate text-xs font-bold text-slate-800 lg:text-sm"
                        >
                          {warranty.productName || '—'}
                        </p>

                        <p
                          title={warranty.brand}
                          className="mt-1 truncate text-[10px] text-slate-500 lg:text-xs"
                        >
                          {warranty.brand || 'بدون برند'}
                        </p>
                      </td>

                      <td className="hidden px-2 py-4 align-top lg:table-cell">
                        <span className="inline-flex rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-black text-sky-700">
                          {Number(
                            warranty.quantity || 0,
                          ).toLocaleString('fa-IR')}
                        </span>
                      </td>

                      <td className="hidden px-2 py-4 align-top text-[10px] font-medium leading-5 text-slate-600 xl:table-cell">
                        {formatDateTime(
                          warranty.requestDate ||
                            warranty.createdAt,
                        )}
                      </td>

                      <td className="min-w-0 px-2 py-4 align-top">
                        <StatusBadge
                          status={warranty.status}
                        />
                      </td>

                      <td className="px-2 py-4 text-center align-top">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWarranty(warranty);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 lg:h-auto lg:w-auto lg:gap-1.5 lg:px-3 lg:py-2"
                          title="بررسی درخواست"
                          aria-label="بررسی درخواست"
                        >
                          <Eye className="h-4 w-4" />

                          <span className="hidden xl:inline">
                            بررسی
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>


      {selectedWarranty ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="بررسی درخواست گارانتی"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-6xl sm:rounded-3xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate font-black text-slate-800">
                    بررسی درخواست گارانتی
                  </h2>

                  <p
                    dir="ltr"
                    className="mt-1 truncate text-xs font-bold text-slate-500"
                  >
                    {selectedWarranty.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(decisionLoading)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>


            <div className="min-h-0 overflow-y-auto p-5 md:p-7">
              {actionError ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

                  <p className="text-sm font-bold leading-7">
                    {actionError}
                  </p>
                </div>
              ) : null}

              {actionMessage ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <p className="text-sm font-bold leading-7">
                    {actionMessage}
                  </p>
                </div>
              ) : null}


              <div className="mb-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    وضعیت درخواست
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={selectedWarranty.status}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    تاریخ ثبت
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-700">
                    {formatDateTime(
                      selectedWarranty.requestDate ||
                        selectedWarranty.createdAt,
                    )}
                  </p>
                </div>
              </div>


              <div className="mb-6">
                <SmsStatusCard
                  warranty={selectedWarranty}
                />
              </div>


              <div className="grid gap-5 xl:grid-cols-2">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <Store className="h-5 w-5 text-sky-600" />

                      <h3 className="font-black text-slate-800">
                        اطلاعات نماینده
                      </h3>
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">
                          نام نماینده
                        </p>

                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                          {selectedWarranty.representativeName || '—'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">
                          کد نمایندگی
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 truncate text-sm font-black text-slate-800"
                        >
                          {selectedWarranty.representativeCode || '—'}
                        </p>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        <p className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          شهر
                        </p>

                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                          {selectedWarranty.representativeCity || '—'}
                        </p>
                      </div>
                    </div>
                  </div>


                  <div className="rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <UserRound className="h-5 w-5 text-sky-600" />

                      <h3 className="font-black text-slate-800">
                        اطلاعات مشتری
                      </h3>
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">
                          نام مشتری
                        </p>

                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                          {selectedWarranty.customerName || '—'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          موبایل
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 truncate text-sm font-black text-slate-800"
                        >
                          {selectedWarranty.customerPhone || '—'}
                        </p>
                      </div>
                    </div>
                  </div>


                  <div className="rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <Package className="h-5 w-5 text-sky-600" />

                      <h3 className="font-black text-slate-800">
                        کالای درخواست‌شده
                      </h3>
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <div className="min-w-0 sm:col-span-2">
                        <p className="text-xs font-bold text-slate-500">
                          محصول
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-slate-800">
                          {selectedWarranty.productName || '—'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">
                          برند
                        </p>

                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                          {selectedWarranty.brand || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-500">
                          تعداد
                        </p>

                        <p className="mt-1 text-sm font-black text-sky-700">
                          {Number(
                            selectedWarranty.quantity || 0,
                          ).toLocaleString('fa-IR')}{' '}
                          عدد
                        </p>
                      </div>
                    </div>
                  </div>
                </div>


                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                      <FileText className="h-5 w-5 text-sky-600" />

                      <h3 className="font-black text-slate-800">
                        شرح مشکل
                      </h3>
                    </div>

                    <p className="min-h-32 break-words whitespace-pre-wrap p-4 text-sm font-medium leading-8 text-slate-700">
                      {selectedWarranty.issueDescription ||
                        'شرحی ثبت نشده است.'}
                    </p>
                  </div>


                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                      <Eye className="h-5 w-5 text-sky-600" />

                      <h3 className="font-black text-slate-800">
                        تصویر یا فایل پیوست
                      </h3>
                    </div>

                    {selectedWarranty.image &&
                    !imageFailed ? (
                      <a
                        href={getImageUrl(
                          selectedWarranty.image,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-100"
                      >
                        <img
                          src={getImageUrl(
                            selectedWarranty.image,
                          )}
                          alt="پیوست درخواست گارانتی"
                          onError={() => {
                            setImageFailed(true);
                          }}
                          className="h-64 w-full object-contain sm:h-72"
                        />
                      </a>
                    ) : (
                      <div className="flex h-64 flex-col items-center justify-center p-4 text-center sm:h-72">
                        <ImageOff className="h-12 w-12 text-slate-300" />

                        <p className="mt-3 text-sm font-bold text-slate-500">
                          فایل پیوست در دسترس نیست.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
                    <BadgeCheck className="h-5 w-5 text-sky-600" />
                    یادداشت ادمین
                  </span>

                  <textarea
                    rows={4}
                    value={adminNote}
                    disabled={
                      selectedWarranty.status !== 'pending' ||
                      Boolean(decisionLoading)
                    }
                    onChange={(event) => {
                      setAdminNote(event.target.value);
                    }}
                    placeholder="یادداشت بررسی یا علت رد درخواست را بنویسید..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                {selectedWarranty.status !== 'pending' ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600">
                    این درخواست قبلاً توسط{' '}
                    <span className="font-black text-slate-800">
                      {selectedWarranty.decidedBy || 'ادمین'}
                    </span>{' '}
                    در تاریخ{' '}
                    <span className="font-black text-slate-800">
                      {formatDateTime(
                        selectedWarranty.decidedAt,
                      )}
                    </span>{' '}
                    نهایی شده است.
                  </div>
                ) : null}
              </div>


              {selectedWarranty.status === 'pending' ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />

                    <div className="min-w-0">
                      <h3 className="font-black text-amber-900">
                        هشدار تأیید
                      </h3>

                      <p className="mt-1 break-words text-sm font-medium leading-7 text-amber-800">
                        با تأیید،{' '}
                        <span className="font-black">
                          {Number(
                            selectedWarranty.quantity || 0,
                          ).toLocaleString('fa-IR')}{' '}
                          عدد
                        </span>{' '}
                        از محصول «
                        <span className="font-black">
                          {selectedWarranty.productName}
                        </span>
                        » از انبار نماینده کم می‌شود و پیامک تأیید برای مشتری ارسال خواهد شد.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}


              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={Boolean(decisionLoading)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  بستن
                </button>

                {selectedWarranty.status === 'pending' ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={Boolean(decisionLoading)}
                      onClick={() => {
                        void handleDecision('rejected');
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {decisionLoading === 'rejected' ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}

                      رد درخواست
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(decisionLoading)}
                      onClick={() => {
                        void handleDecision('approved');
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-700 to-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition-all hover:-translate-y-0.5 hover:from-emerald-800 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {decisionLoading === 'approved' ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}

                      تأیید و کسر از انبار
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-black text-slate-600">
                    {selectedWarranty.status ===
                    'approved' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-600" />
                    )}

                    این درخواست نهایی شده است.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};


export default AdminWarrantiesPage;