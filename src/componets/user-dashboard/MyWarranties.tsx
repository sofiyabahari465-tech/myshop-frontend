import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  X,
} from 'lucide-react';

interface WarrantyItem {
  productName: string;
  brand?: string;
  quantity: number;
}

interface Warranty {
  id: string;
  trackingCode?: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  brand?: string;
  quantity: number;
  issueDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  requestDate?: string;
  createdAt: string;
  decidedAt?: string;
  smsStatus?: string;
}

interface ApiResponse {
  success?: boolean;
  data?: Warranty[];
  error?: string;
  count?: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://myshop-backend-8nu7.onrender.com/api';

const getStoredToken = (): string => {
  return (
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    ''
  );
};

const formatDate = (value?: string): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'approved':
      return {
        label: 'تأیید شده',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        icon: CheckCircle2,
      };
    case 'rejected':
      return {
        label: 'رد شده',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        icon: X,
      };
    default:
      return {
        label: 'در انتظار بررسی',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        icon: Clock,
      };
  }
};

const MyWarranties: React.FC = () => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWarranties = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getStoredToken();

      if (!token) {
        setError('توکن ورود پیدا نشد. دوباره وارد شوید.');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/warranties/my`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'دریافت گارانتی‌ها ناموفق بود.',
        );
      }

      setWarranties(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'خطا در دریافت گارانتی‌ها.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWarranties();
  }, [loadWarranties]);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      >
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        <span className="mr-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          در حال دریافت گارانتی‌های شما...
        </span>
      </div>
    );
  }

  return (
    <section
      dir="rtl"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-white">
            <BadgeCheck className="h-5 w-5 text-sky-600" />
            گارانتی‌های ثبت‌شده من
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {warranties.length} درخواست گارانتی ثبت شده
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadWarranties()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          به‌روزرسانی
        </button>
      </header>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {!error && warranties.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <Package className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="font-bold text-slate-600 dark:text-slate-300">
            هنوز درخواست گارانتی ثبت نکرده‌اید.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            با استفاده از فرم بالا، اولین درخواست گارانتی خود را ثبت کنید.
          </p>
        </div>
      ) : null}

      {!error && warranties.length > 0 ? (
        <div className="space-y-3">
          {warranties.map((warranty) => {
            const status = getStatusInfo(warranty.status);
            const StatusIcon = status.icon;

            return (
              <article
                key={warranty.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
              >
                {/* هدر کارت */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-3 dark:border-slate-700 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      کد پیگیری:{' '}
                      <span className="font-black text-slate-700 dark:text-slate-200">
                        {warranty.trackingCode || warranty.id}
                      </span>
                    </p>
                    <h4 className="mt-1 text-sm font-black text-slate-800 dark:text-white sm:text-base">
                      {warranty.productName}
                    </h4>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black sm:text-xs ${status.color}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>

                {/* اطلاعات مشتری */}
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4">
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                    <p className="text-[10px] text-slate-500 sm:text-xs">
                      مشتری
                    </p>
                    <p className="mt-0.5 text-xs font-black text-slate-800 dark:text-white sm:text-sm">
                      {warranty.customerName}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                    <p className="text-[10px] text-slate-500 sm:text-xs">
                      موبایل
                    </p>
                    <p className="mt-0.5 text-xs font-black text-slate-800 dark:text-white sm:text-sm" dir="ltr">
                      {warranty.customerPhone}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                    <p className="text-[10px] text-slate-500 sm:text-xs">
                      تعداد
                    </p>
                    <p className="mt-0.5 text-xs font-black text-slate-800 dark:text-white sm:text-sm">
                      {warranty.quantity} عدد
                    </p>
                  </div>
                </div>

                {/* توضیحات مشکل */}
                {warranty.issueDescription ? (
                  <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-700 sm:px-4">
                    <p className="text-[10px] font-bold text-slate-500 sm:text-xs">
                      شرح مشکل:
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
                      {warranty.issueDescription}
                    </p>
                  </div>
                ) : null}

                {/* یادداشت ادمین */}
                {warranty.adminNote ? (
                  <div className="border-t border-slate-100 bg-amber-50 px-3 py-2 dark:border-slate-700 dark:bg-amber-950/20 sm:px-4">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 sm:text-xs">
                      یادداشت ادمین:
                    </p>
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200 sm:text-sm">
                      {warranty.adminNote}
                    </p>
                  </div>
                ) : null}

                {/* تاریخ ثبت */}
                <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-700 sm:px-4">
                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    ثبت: {formatDate(warranty.createdAt)}
                    {warranty.decidedAt
                      ? ` · تصمیم: ${formatDate(warranty.decidedAt)}`
                      : ''}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default MyWarranties;
