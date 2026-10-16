import axios from 'axios';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  Loader2,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';

type ShipmentStatus =
  | 'registered'
  | 'confirmed'
  | 'preparing'
  | 'loading'
  | 'shipping'
  | 'delivered'
  | 'pending'
  | 'sent';

interface ShipmentItem {
  id?: string | number;
  productName?: string;
  brand?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

interface StatusHistoryEntry {
  status: string;
  label?: string;
  changedAt?: string;
  createdAt?: string;
  note?: string;
}

interface Shipment {
  id: string | number;
  shipmentNumber?: string;
  representativeId?: string | number;
  receiver?: string;
  warehouse?: string;
  shipmentDate?: string;
  excelFileName?: string;
  status?: ShipmentStatus;
  items?: ShipmentItem[];
  itemsCount?: number;
  totalItems?: number;
  totalValue?: number;
  statusHistory?: StatusHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface Props {
  apiUrl?: string;
  token?: string;
}

const STATUS_STEPS = [
  { value: 'registered', label: 'ثبت شده' },
  { value: 'confirmed', label: 'تأیید شده' },
  { value: 'preparing', label: 'در حال آماده‌سازی' },
  { value: 'loading', label: 'بارگیری' },
  { value: 'shipping', label: 'در حال ارسال' },
  { value: 'delivered', label: 'تحویل شده' },
] as const;

const formatNumber = (value: unknown) => {
  const numericValue = Number(value ?? 0);

  return Number.isFinite(numericValue)
    ? new Intl.NumberFormat('fa-IR').format(
        numericValue,
      )
    : '—';
};

const formatDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'fa-IR-u-ca-persian',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
};

const getStatusLabel = (status?: string) => {
  if (status === 'pending') {
    return 'در انتظار';
  }

  if (status === 'sent') {
    return 'ارسال شده';
  }

  return (
    STATUS_STEPS.find(
      (step) => step.value === status,
    )?.label || 'نامشخص'
  );
};

const getStatusIndex = (status?: string) => {
  if (status === 'pending') return 0;
  if (status === 'sent') return 4;

  return STATUS_STEPS.findIndex(
    (step) => step.value === status,
  );
};

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as
      | ApiResponse<unknown>
      | undefined;

    if (error.response?.status === 401) {
      return 'نشست شما معتبر نیست؛ دوباره وارد حساب نمایندگی شوید.';
    }

    if (error.response?.status === 403) {
      return 'دسترسی به این بخش برای حساب شما مجاز نیست.';
    }

    if (error.response?.status === 404) {
      return 'مسیر «بارهای من» در بک‌اند هنوز ایجاد نشده است.';
    }

    return (
      response?.error ||
      response?.message ||
      'دریافت بارها ناموفق بود.'
    );
  }

  return error instanceof Error
    ? error.message
    : 'دریافت بارها ناموفق بود.';
};

const MyShipments: React.FC<Props> = ({
  apiUrl = String(
    import.meta.env.VITE_API_URL ||
      'https://myshop-backend-8nu7.onrender.com/api',
  ),
  token,
}) => {
  const [shipments, setShipments] =
    useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const normalizedApiUrl = apiUrl.replace(
    /\/+$/,
    '',
  );

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get<
        ApiResponse<Shipment[]>
      >(`${normalizedApiUrl}/shipments/my`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            }
          : {
              Accept: 'application/json',
            },
        withCredentials: true,
      });

      if (response.data.success === false) {
        throw new Error(
          response.data.error ||
            'دریافت بارها ناموفق بود.',
        );
      }

      setShipments(
        Array.isArray(response.data.data)
          ? response.data.data
          : [],
      );
    } catch (caughtError) {
      console.error(
        'خطا در دریافت بارهای نماینده:',
        caughtError,
      );

      setShipments([]);
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [normalizedApiUrl, token]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const sortedShipments = useMemo(() => {
    return [...shipments].sort((first, second) => {
      return (
        new Date(
          second.createdAt ||
            second.updatedAt ||
            0,
        ).getTime() -
        new Date(
          first.createdAt ||
            first.updatedAt ||
            0,
        ).getTime()
      );
    });
  }, [shipments]);

  const activeCount = useMemo(
    () =>
      shipments.filter(
        (shipment) =>
          shipment.status !== 'delivered',
      ).length,
    [shipments],
  );

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
      >
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mr-3 text-sm font-bold text-gray-600 dark:text-gray-300">
          در حال دریافت بارهای شما...
        </span>
      </div>
    );
  }

  return (
    <section
      dir="rtl"
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6"
    >
      <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-gray-800 dark:text-white sm:text-2xl">
            <Truck className="h-6 w-6 text-blue-600" />
            بارهای من
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            وضعیت ارسال بارهای مربوط به حساب نمایندگی شما
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadShipments()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          به‌روزرسانی
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {!error ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                کل بارها
              </p>
              <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-100">
                {formatNumber(shipments.length)}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                در جریان
              </p>
              <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-100">
                {formatNumber(activeCount)}
              </p>
            </div>
          </div>

          {sortedShipments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center dark:border-gray-700 dark:bg-gray-800/40">
              <Package className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="font-black text-gray-700 dark:text-gray-200">
                هنوز باری برای شما ثبت نشده است.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedShipments.map((shipment) => {
                const id = String(shipment.id);
                const isExpanded =
                  expandedId === id;
                const currentStatusIndex =
                  getStatusIndex(
                    shipment.status,
                  );

                const productTypes =
                  shipment.items?.length ??
                  shipment.itemsCount ??
                  0;

                const totalQuantity =
                  shipment.items?.reduce(
                    (sum, item) =>
                      sum +
                      (Number(item.quantity) || 0),
                    0,
                  ) ??
                  shipment.totalItems ??
                  0;

                return (
                  <article
                    key={id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/60"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            شماره حواله:{' '}
                            {shipment.shipmentNumber ||
                              id}
                          </p>

                          <h3 className="mt-1 text-lg font-black text-gray-800 dark:text-white">
                            بار ارسالی به نمایندگی شما
                          </h3>
                        </div>

                        <span className="w-fit rounded-full bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          {getStatusLabel(
                            shipment.status,
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900">
                          <p className="text-xs text-gray-500">
                            نوع کالا
                          </p>
                          <p className="mt-1 font-black text-gray-800 dark:text-white">
                            {formatNumber(
                              productTypes,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900">
                          <p className="text-xs text-gray-500">
                            مجموع تعداد
                          </p>
                          <p className="mt-1 font-black text-gray-800 dark:text-white">
                            {formatNumber(
                              totalQuantity,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900">
                          <p className="text-xs text-gray-500">
                            تاریخ ارسال
                          </p>
                          <p className="mt-1 font-black text-gray-800 dark:text-white">
                            {shipment.shipmentDate ||
                              '—'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 dark:bg-gray-900">
                          <p className="text-xs text-gray-500">
                            تاریخ ثبت
                          </p>
                          <p className="mt-1 text-xs font-black text-gray-800 dark:text-white">
                            {formatDate(
                              shipment.createdAt,
                            )}
                          </p>
                        </div>
                      </div>

                      <div
                        aria-label="مراحل ارسال بار"
                        className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6"
                      >
                        {STATUS_STEPS.map(
                          (step, index) => {
                            const reached =
                              index <=
                              currentStatusIndex;

                            return (
                              <div
                                key={step.value}
                                className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-[10px] font-bold sm:text-xs ${
                                  reached
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {reached ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span>{step.label}</span>
                              </div>
                            );
                          },
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(
                            isExpanded
                              ? null
                              : id,
                          )
                        }
                        aria-expanded={
                          isExpanded
                        }
                        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}

                        {isExpanded
                          ? 'بستن جزئیات'
                          : 'مشاهدهٔ کالاها و جزئیات'}
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="space-y-5 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <p className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800 dark:text-gray-200">
                            گیرنده:{' '}
                            <strong>
                              {shipment.receiver ||
                                '—'}
                            </strong>
                          </p>

                          <p className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800 dark:text-gray-200">
                            انبار مبدأ:{' '}
                            <strong>
                              {shipment.warehouse ||
                                '—'}
                            </strong>
                          </p>

                          <p className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800 dark:text-gray-200">
                            <CalendarDays className="h-4 w-4" />
                            ثبت:{' '}
                            {formatDate(
                              shipment.createdAt,
                            )}
                          </p>

                          <p className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800 dark:text-gray-200">
                            <FileSpreadsheet className="h-4 w-4 shrink-0" />
                            <span className="break-all">
                              {shipment.excelFileName ||
                                'نام فایل ثبت نشده'}
                            </span>
                          </p>
                        </div>

                        <div>
                          <h4 className="mb-3 flex items-center gap-2 font-black text-gray-800 dark:text-white">
                            <Package className="h-5 w-5" />
                            کالاهای این بار
                          </h4>

                          {!shipment.items?.length ? (
                            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                              جزئیات اقلام برای این بار
                              موجود نیست. بارهای قدیمی
                              ممکن است فقط نام فایل را
                              ذخیره کرده باشند.
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                              {/* نسخه موبایل: کارت‌های باکسی - بدون اسکرول افقی */}
                              <div className="divide-y divide-gray-100 dark:divide-gray-700 sm:hidden">
                                {shipment.items.map(
                                  (
                                    item,
                                    index,
                                  ) => (
                                    <div
                                      key={String(
                                        item.id ??
                                          index,
                                      )}
                                      className="bg-gray-50 p-3 dark:bg-gray-800"
                                    >
                                      <p className="font-black text-gray-800 dark:text-white">
                                        {item.productName ||
                                          '—'}
                                      </p>

                                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
                                          <p className="text-gray-500">
                                            تعداد
                                          </p>
                                          <p className="font-black text-gray-800 dark:text-white">
                                            {formatNumber(
                                              item.quantity,
                                            )}
                                          </p>
                                        </div>

                                        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
                                          <p className="text-gray-500">
                                            قیمت واحد
                                          </p>
                                          <p className="font-black text-gray-800 dark:text-white">
                                            {formatNumber(
                                              item.unitPrice,
                                            )}{' '}
                                            تومان
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                        {item.brand ? (
                                          <span className="rounded-full bg-white px-2 py-0.5 dark:bg-gray-900">
                                            برند: {item.brand}
                                          </span>
                                        ) : null}

                                        {item.category ? (
                                          <span className="rounded-full bg-white px-2 py-0.5 dark:bg-gray-900">
                                            دسته: {item.category}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>

                              {/* نسخه دسکتاپ: جدول - بدون اسکرول افقی */}
                              <div className="hidden overflow-x-auto sm:block">
                                <table className="w-full text-right text-sm">
                                  <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                    <tr>
                                      <th className="p-3">
                                        کالا
                                      </th>
                                      <th className="p-3">
                                        برند
                                      </th>
                                      <th className="p-3">
                                        دسته‌بندی
                                      </th>
                                      <th className="p-3">
                                        تعداد
                                      </th>
                                      <th className="p-3">
                                        قیمت واحد
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {shipment.items.map(
                                      (
                                        item,
                                        index,
                                      ) => (
                                        <tr
                                          key={String(
                                            item.id ??
                                              index,
                                          )}
                                          className="border-t border-gray-100 dark:border-gray-700 dark:text-gray-200"
                                        >
                                          <td className="p-3 font-bold">
                                            {item.productName ||
                                              '—'}
                                          </td>

                                          <td className="p-3">
                                            {item.brand ||
                                              '—'}
                                          </td>

                                          <td className="p-3">
                                            {item.category ||
                                              '—'}
                                          </td>

                                          <td className="p-3">
                                            {formatNumber(
                                              item.quantity,
                                            )}
                                          </td>

                                          <td className="p-3">
                                            {formatNumber(
                                              item.unitPrice,
                                            )}{' '}
                                            تومان
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="mb-3 flex items-center gap-2 font-black text-gray-800 dark:text-white">
                            <ClipboardCheck className="h-5 w-5" />
                            تاریخچهٔ وضعیت
                          </h4>

                          {shipment.statusHistory?.length ? (
                            <div className="space-y-2">
                              {shipment.statusHistory.map(
                                (
                                  entry,
                                  index,
                                ) => (
                                  <div
                                    key={`${entry.status}-${index}`}
                                    className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700 dark:text-gray-200"
                                  >
                                    <p className="font-black">
                                      {entry.label ||
                                        getStatusLabel(
                                          entry.status,
                                        )}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatDate(
                                        entry.changedAt ||
                                          entry.createdAt,
                                      )}
                                    </p>

                                    {entry.note ? (
                                      <p className="mt-2">
                                        {entry.note}
                                      </p>
                                    ) : null}
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800">
                              تاریخچه‌ای برای این بار ثبت
                              نشده است.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
};

export default MyShipments;
