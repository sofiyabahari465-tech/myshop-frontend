import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Store,
  CheckCircle2,
  Package,
  Banknote,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import type { Representative } from '../types';

interface WarehouseProps {
  representatives?: Representative[];
  onOpenRepresentativeWarehouse: (
    representativeId: string,
  ) => void;
  apiUrl?: string;
}

interface WarehouseItem {
  id?: string | number;
  quantity?: unknown;
  unitPrice?: unknown;
}

interface WarehouseResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    items?: WarehouseItem[];
  };
}

interface InventorySummary {
  itemCount: number;
  totalValue: number;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const normalizeDigits = (value: unknown): string => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );
};

const getNumber = (value: unknown): number => {
  const text = normalizeDigits(value)
    .replace(/[,٬،\s]/g, '');

  const number = Number(text);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
};

const formatNumber = (value: unknown): string => {
  return getNumber(value).toLocaleString('fa-IR');
};

const normalizeSearch = (value: unknown): string => {
  return normalizeDigits(value)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim()
    .toLowerCase();
};

const getApiBase = (value?: string): string => {
  const base = (
    value ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api'
  ).replace(/\/+$/, '');

  return base.endsWith('/api')
    ? base
    : `${base}/api`;
};

const getToken = (): string => {
  const keys = [
    'token',
    'accessToken',
    'authToken',
    'adminToken',
    'jwt',
    'access_token',
  ];

  for (const storage of [
    sessionStorage,
    localStorage,
  ]) {
    for (const key of keys) {
      const value = storage.getItem(key);

      if (
        value &&
        value !== 'null' &&
        value !== 'undefined'
      ) {
        const token = value
          .replace(/^Bearer\s+/i, '')
          .trim();

        if (token) {
          return token;
        }
      }
    }
  }

  return '';
};

const Warehouse: React.FC<WarehouseProps> = ({
  representatives = [],
  onOpenRepresentativeWarehouse,
  apiUrl,
}) => {
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [summaries, setSummaries] = useState<
    Record<string, InventorySummary>
  >({});

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);

  const [reloadKey, setReloadKey] = useState(0);

  const safeRepresentatives = useMemo(
    () =>
      Array.isArray(representatives)
        ? representatives
        : [],
    [representatives],
  );

  const apiBase = getApiBase(apiUrl);

  const idsKey = JSON.stringify(
    [
      ...new Set(
        safeRepresentatives.map((representative) =>
          String(representative.id),
        ),
      ),
    ].sort(),
  );

  // تغییر خلاصهٔ والد پس از ورود یا حذف کالا،
  // باعث دریافت دوبارهٔ موجودی می‌شود.
  const inventoryVersionKey = JSON.stringify(
    safeRepresentatives.map((representative) => [
      String(representative.id),
      representative.storeItemsCount,
      representative.storeItemsTotalValue,
    ]),
  );

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const ids = JSON.parse(idsKey) as string[];

    const loadInventories = async () => {
      setLoading(true);
      setErrors({});

      if (!ids.length) {
        setSummaries({});
        setLoading(false);
        return;
      }

      const nextSummaries:
        Record<string, InventorySummary> = {};

      const nextErrors:
        Record<string, string> = {};

      const token = getToken();

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let nextIndex = 0;

      const worker = async () => {
        while (
          nextIndex < ids.length &&
          !controller.signal.aborted
        ) {
          const id = ids[nextIndex];
          nextIndex += 1;

          try {
            const response = await fetch(
              `${apiBase}/representatives/${encodeURIComponent(
                id,
              )}/warehouse?_=${Date.now()}`,
              {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers,
                signal: controller.signal,
              },
            );

            const text = await response.text();

            let result: WarehouseResponse;

            try {
              result = JSON.parse(text);
            } catch {
              throw new Error(
                `پاسخ انبار معتبر نیست. کد: ${response.status}`,
              );
            }

            if (
              !response.ok ||
              !result.success
            ) {
              throw new Error(
                result.error ||
                  result.message ||
                  `دریافت انبار ناموفق بود. کد: ${response.status}`,
              );
            }

            if (!Array.isArray(result.data?.items)) {
              throw new Error(
                'لیست کالاهای انبار در پاسخ سرور موجود نیست.',
              );
            }

            const stockedItems =
              result.data.items.filter(
                (item) =>
                  getNumber(item.quantity) > 0,
              );

            nextSummaries[id] = {
              itemCount: stockedItems.length,

              totalValue: stockedItems.reduce(
                (sum, item) =>
                  sum +
                  getNumber(item.quantity) *
                    getNumber(item.unitPrice),
                0,
              ),
            };
          } catch (error) {
            if (controller.signal.aborted) {
              return;
            }

            nextErrors[id] =
              error instanceof Error
                ? error.message
                : 'دریافت موجودی ناموفق بود.';
          }
        }
      };

      await Promise.all(
        Array.from(
          { length: Math.min(4, ids.length) },
          () => worker(),
        ),
      );

      if (!controller.signal.aborted) {
        setSummaries(nextSummaries);
        setErrors(nextErrors);
        setLoading(false);
      }
    };

    void loadInventories();

    return () => {
      controller.abort();
    };
  }, [
    apiBase,
    idsKey,
    inventoryVersionKey,
    reloadKey,
  ]);

  const filteredRepresentatives = useMemo(() => {
    const query = normalizeSearch(search);

    return safeRepresentatives.filter(
      (representative) => {
        const isActive =
          representative.status !== 'inactive';

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active'
            ? isActive
            : !isActive);

        const matchesSearch =
          !query ||
          [
            representative.name,
            representative.code,
            representative.city,
            representative.phone,
          ].some((value) =>
            normalizeSearch(value).includes(query),
          );

        return matchesStatus && matchesSearch;
      },
    );
  }, [
    safeRepresentatives,
    search,
    statusFilter,
  ]);

  const totals = useMemo(() => {
    return safeRepresentatives.reduce(
      (sum, representative) => {
        const summary =
          summaries[String(representative.id)];

        if (!summary) {
          return sum;
        }

        return {
          itemCount:
            sum.itemCount + summary.itemCount,
          totalValue:
            sum.totalValue + summary.totalValue,
        };
      },
      {
        itemCount: 0,
        totalValue: 0,
      },
    );
  }, [safeRepresentatives, summaries]);

  const activeRepresentatives =
    safeRepresentatives.filter(
      (representative) =>
        representative.status !== 'inactive',
    ).length;

  const failedCount =
    Object.keys(errors).length;

  const totalsUnavailable =
    !loading && failedCount > 0;

  const renderStatus = (
    representative: Representative,
  ) => {
    const active =
      representative.status !== 'inactive';

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
          active
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {active ? 'فعال' : 'غیرفعال'}
      </span>
    );
  };

  const renderInventoryCount = (id: string) => {
    if (loading) {
      return (
        <span className="text-xs text-gray-500">
          در حال دریافت...
        </span>
      );
    }

    if (errors[id] || !summaries[id]) {
      return (
        <span className="text-xs text-red-600">
          نامشخص
        </span>
      );
    }

    const count = summaries[id].itemCount;

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
          count > 0
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {count > 0
          ? `${formatNumber(count)} نوع کالا`
          : 'بدون موجودی'}
      </span>
    );
  };

  const renderValue = (id: string): string => {
    if (loading) {
      return 'در حال دریافت...';
    }

    if (errors[id] || !summaries[id]) {
      return 'نامشخص';
    }

    return `${formatNumber(
      summaries[id].totalValue,
    )} تومان`;
  };

  const renderOpenButton = (id: string) => (
    <button
      type="button"
      onClick={() =>
        onOpenRepresentativeWarehouse(id)
      }
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-black text-white hover:from-cyan-700 hover:to-blue-700"
    >
      <Store className="h-4 w-4" />
      ورود به انبار
    </button>
  );

  const statText = (value: number): string => {
    if (loading) {
      return '...';
    }

    if (totalsUnavailable) {
      return 'نامشخص';
    }

    return formatNumber(value);
  };

  return (
    <div
      dir="rtl"
      className="w-full min-w-0 space-y-4 pb-6 sm:space-y-6"
    >
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white">
              <Store className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 sm:text-2xl">
                انبار نمایندگان
              </h2>

              <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">
                فقط کالاهای دارای موجودی در انبار
                شمارش می‌شوند؛ ردیف‌های ثبت‌نشدهٔ
                اکسل در این تعداد حساب نمی‌شوند.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            بروزرسانی موجودی
          </button>
        </div>
      </section>

      {failedCount > 0 && !loading ? (
        <section
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-1 h-4 w-4 shrink-0" />

            <p>
              موجودی {formatNumber(failedCount)} نماینده
              دریافت نشد. مجموع کل تا دریافت اطلاعات
              همهٔ انبارها نمایش داده نمی‌شود.
            </p>
          </div>

          {safeRepresentatives
            .filter(
              (representative) =>
                errors[String(representative.id)],
            )
            .map((representative) => (
              <p
                key={String(representative.id)}
                className="mt-2 break-words"
              >
                {representative.name || 'نماینده'}:
                {' '}
                {errors[String(representative.id)]}
              </p>
            ))}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-green-700 dark:text-green-300">
              نمایندگان فعال
            </p>

            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>

          <p className="mt-3 text-2xl font-black text-green-900 dark:text-green-100">
            {formatNumber(activeRepresentatives)}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
              تعداد کالاهای دارای موجودی
            </p>

            <Package className="h-5 w-5 text-blue-600" />
          </div>

          <p className="mt-3 text-2xl font-black text-blue-900 dark:text-blue-100">
            {statText(totals.itemCount)}
          </p>

          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
            مجموع ردیف‌های دارای موجودی در انبارها
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
              مجموع نمایندگان
            </p>

            <Banknote className="h-5 w-5 text-purple-600" />
          </div>

          <p className="mt-3 break-words text-xl font-black text-purple-900 dark:text-purple-100">
            {statText(totals.totalValue)}
          </p>

          <p className="mt-2 text-xs text-purple-700 dark:text-purple-300">
            تومان
          </p>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
        <h3 className="text-lg font-black text-gray-800 dark:text-gray-100">
          لیست انبارهای نمایندگی
        </h3>

        <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
          تعداد کالا، تعداد ردیف‌های دارای موجودی
          در انبار است؛ نه تعداد قطعات و نه تعداد
          ردیف‌های فایل اکسل.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
            className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">
              همه نمایندگان
            </option>

            <option value="active">
              نمایندگان فعال
            </option>

            <option value="inactive">
              نمایندگان غیرفعال
            </option>
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="جست‌وجوی نام، کد، شهر یا شماره"
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          {filteredRepresentatives.map(
            (representative) => {
              const id = String(representative.id);

              return (
                <article
                  key={id}
                  className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-gray-800 dark:text-gray-100">
                        {representative.name || 'بدون نام'}
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 text-right text-xs text-gray-500"
                      >
                        {representative.phone ||
                          'شماره ثبت نشده'}
                      </p>
                    </div>

                    {renderStatus(representative)}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                      <p className="text-gray-500 dark:text-gray-300">
                        کد نمایندگی
                      </p>

                      <p className="mt-2 break-words font-bold text-gray-800 dark:text-gray-100">
                        {representative.code || '-'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                      <p className="text-gray-500 dark:text-gray-300">
                        شهر
                      </p>

                      <p className="mt-2 break-words font-bold text-gray-800 dark:text-gray-100">
                        {representative.city || '-'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
                      <p className="mb-2 text-blue-700 dark:text-blue-300">
                        کالاهای دارای موجودی
                      </p>

                      {renderInventoryCount(id)}
                    </div>

                    <div className="rounded-xl bg-purple-50 p-3 dark:bg-purple-900/20">
                      <p className="text-purple-700 dark:text-purple-300">
                        مجموع
                      </p>

                      <p className="mt-2 break-words font-black text-purple-900 dark:text-purple-100">
                        {renderValue(id)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {renderOpenButton(id)}
                  </div>
                </article>
              );
            },
          )}
        </div>

        <div className="mt-5 hidden lg:block">
          <table className="w-full table-fixed text-right text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <th className="w-[22%] p-3">
                  نماینده
                </th>

                <th className="w-[10%] p-3">
                  کد
                </th>

                <th className="w-[10%] p-3">
                  شهر
                </th>

                <th className="w-[10%] p-3">
                  وضعیت
                </th>

                <th className="w-[16%] p-3">
                  کالاهای دارای موجودی
                </th>

                <th className="w-[18%] p-3">
                  مجموع
                </th>

                <th className="w-[14%] p-3">
                  عملیات
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRepresentatives.map(
                (representative) => {
                  const id = String(representative.id);

                  return (
                    <tr
                      key={id}
                      className="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td className="break-words p-3">
                        <p className="font-black text-gray-800 dark:text-gray-100 text-lg">
                          {representative.name || 'بدون نام'}
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 break-all text-right text-gray-500"
                        >
                          {representative.phone ||
                            'شماره ثبت نشده'}
                        </p>
                      </td>

                      <td className="break-words p-3 text-gray-700 dark:text-gray-200">
                        {representative.code || '-'}
                      </td>

                      <td className="break-words p-3 text-gray-700 dark:text-gray-200">
                        {representative.city || '-'}
                      </td>

                      <td className="p-3">
                        {renderStatus(representative)}
                      </td>

                      <td className="p-3">
                        {renderInventoryCount(id)}
                      </td>

                      <td className="break-words p-3 font-bold text-gray-800 dark:text-gray-100">
                        {renderValue(id)}
                      </td>

                      <td className="p-3">
                        {renderOpenButton(id)}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        {!filteredRepresentatives.length ? (
          <div className="py-12 text-center">
            <Store className="mx-auto h-10 w-10 text-gray-400" />

            <p className="mt-3 text-sm font-bold text-gray-600 dark:text-gray-300">
              {safeRepresentatives.length
                ? 'نماینده‌ای با این مشخصات پیدا نشد.'
                : 'هنوز نماینده‌ای ثبت نشده است.'}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default Warehouse;