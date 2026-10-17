import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  ClipboardCheck,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ShoppingCart,
} from 'lucide-react';
import axios from 'axios';
import SalesAnnouncementPrint from './SalesAnnouncementPrint';

type WarehouseSaleProduct = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  minimumStock?: number;
  brand?: string;
  category?: string;
  status?: 'normal' | 'low' | 'out' | string;
  lastUpdated?: string;
};

type SalesReportItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
};

type SalesReportApi = {
  id: string;
  representativeName?: string;
  representativeCode?: string;
  representativeCity?: string;
  items?: SalesReportItem[];
  totalAmount?: number;
  totalItems?: number;
  itemsCount?: number;
  saleDate?: string;
  saleDateJalali?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SalesPeriod = {
  representativeId?: string;
  allowed?: boolean;
  allowedDays?: number[];
  todayJalali?: string;
  nextAllowedAt?: string | null;
  nextAllowedAtFa?: string | null;
  nextAllowedJalali?: {
    year: number;
    month: number;
    day: number;
    formatted: string;
  } | null;
  daysUntilNextAllowed?: number;
};

type PrintSettings = {
  companyName?: string;
  companySubtitle?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  fontFamily?: string;
  headerTitle?: string;
  footerText?: string;
  showLogo?: boolean;
  showCompanyName?: boolean;
  showRepresentativeInfo?: boolean;
  showReportNumber?: boolean;
  showDate?: boolean;
};

type SalesAnnouncementProps = {
  onSaleRegistered?: () => void;
  printSettings?: PrintSettings;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
      salesPeriod?: SalesPeriod;
    };
  };
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const toEnglishDigits = (value: unknown): string => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );
};

const toNumber = (value: unknown): number => {
  const normalized = toEnglishDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');

  const result = Number(normalized);

  return Number.isFinite(result) ? result : 0;
};

const formatFaNumber = (value: unknown): string => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};

const formatToman = (value: unknown): string => {
  return `${formatFaNumber(value)} تومان`;
};

const formatCreatedAt = (value?: string): string => {
  if (!value) {
    return '—';
  }

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

const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    '';

  return {
    Authorization: `Bearer ${token}`,
  };
};

const getReportItemTotal = (
  item: SalesReportItem,
): number => {
  const savedTotal = toNumber(item.totalPrice);

  if (savedTotal > 0) {
    return savedTotal;
  }

  return (
    toNumber(item.quantity) *
    toNumber(item.unitPrice)
  );
};

const getReportItemsCount = (
  report: SalesReportApi,
): number => {
  if (toNumber(report.itemsCount) > 0) {
    return toNumber(report.itemsCount);
  }

  return Array.isArray(report.items)
    ? report.items.length
    : 0;
};

const getReportTotalItems = (
  report: SalesReportApi,
): number => {
  if (toNumber(report.totalItems) > 0) {
    return toNumber(report.totalItems);
  }

  return Array.isArray(report.items)
    ? report.items.reduce(
        (total, item) =>
          total + toNumber(item.quantity),
        0,
      )
    : 0;
};

const getReportTotalAmount = (
  report: SalesReportApi,
): number => {
  if (toNumber(report.totalAmount) > 0) {
    return toNumber(report.totalAmount);
  }

  return Array.isArray(report.items)
    ? report.items.reduce(
        (total, item) =>
          total + getReportItemTotal(item),
        0,
      )
    : 0;
};

const SalesAnnouncement = ({
  onSaleRegistered,
  printSettings,
}: SalesAnnouncementProps) => {
  const [saleProducts, setSaleProducts] =
    useState<WarehouseSaleProduct[]>([]);

  const [saleQuantities, setSaleQuantities] =
    useState<Record<string, string>>({});

  const [saleConfirmed, setSaleConfirmed] =
    useState(false);

  const [loadingSaleProducts, setLoadingSaleProducts] =
    useState(false);

  const [loadingSalesReports, setLoadingSalesReports] =
    useState(false);

  const [submittingSalesReport, setSubmittingSalesReport] =
    useState(false);

  const [salesReports, setSalesReports] =
    useState<SalesReportApi[]>([]);

  const [salesReportMessage, setSalesReportMessage] =
    useState('');

  const [salesPeriod, setSalesPeriod] =
    useState<SalesPeriod>({
      allowed: true,
    });

  const [printReport, setPrintReport] =
    useState<SalesReportApi | null>(null);

  const [printAllReports, setPrintAllReports] =
    useState(false);

  const saleRegistrationBlocked =
    salesPeriod.allowed === false;

  const effectivePrintSettings = useMemo(
    () => ({
      companyName:
        printSettings?.companyName ||
        'نام شرکت',
      companySubtitle:
        printSettings?.companySubtitle ||
        'گزارش اعلام فروش',
      logoUrl: printSettings?.logoUrl || '',
      primaryColor:
        printSettings?.primaryColor ||
        '#0f766e',
      secondaryColor:
        printSettings?.secondaryColor ||
        '#ecfdf5',
      textColor:
        printSettings?.textColor ||
        '#111827',
      fontFamily:
        printSettings?.fontFamily ||
        'Tahoma',
      headerTitle:
        printSettings?.headerTitle ||
        'گزارش اعلام فروش',
      footerText:
        printSettings?.footerText ||
        'این گزارش به صورت سیستمی صادر شده است.',
      showLogo:
        printSettings?.showLogo ?? true,
      showCompanyName:
        printSettings?.showCompanyName ?? true,
      showRepresentativeInfo:
        printSettings?.showRepresentativeInfo ?? true,
      showReportNumber:
        printSettings?.showReportNumber ?? true,
      showDate:
        printSettings?.showDate ?? true,
    }),
    [printSettings],
  );

  const loadSaleProducts = useCallback(
    async () => {
      setLoadingSaleProducts(true);

      try {
        const response = await axios.get<{
          success: boolean;
          count: number;
          data: WarehouseSaleProduct[];
          salesPeriod?: SalesPeriod;
        }>(
          `${API_URL}/sales-from-warehouse/products`,
          {
            headers: getAuthHeaders(),
          },
        );

        const products = Array.isArray(
          response.data.data,
        )
          ? response.data.data
          : [];

        setSaleProducts(products);

        setSalesPeriod(
          response.data.salesPeriod || {
            allowed: true,
          },
        );

        setSaleQuantities(
          (currentQuantities) => {
            const nextQuantities: Record<
              string,
              string
            > = {};

            products.forEach((product) => {
              const productId = String(
                product.productId ||
                  product.id ||
                  '',
              );

              nextQuantities[productId] =
                currentQuantities[productId] || '';
            });

            return nextQuantities;
          },
        );
      } catch (error) {
        const apiError = error as ApiError;

        setSaleProducts([]);

        setSalesReportMessage(
          `❌ ${
            apiError.response?.data?.error ||
            apiError.response?.data?.message ||
            'خطا در دریافت موجودی انبار.'
          }`,
        );
      } finally {
        setLoadingSaleProducts(false);
      }
    },
    [],
  );

  const loadSalesReports = useCallback(
    async () => {
      setLoadingSalesReports(true);

      try {
        const response = await axios.get<{
          success: boolean;
          count: number;
          data: SalesReportApi[];
          salesPeriod?: SalesPeriod;
        }>(
          `${API_URL}/sales-from-warehouse/my`,
          {
            headers: getAuthHeaders(),
          },
        );

        setSalesReports(
          Array.isArray(response.data.data)
            ? response.data.data
            : [],
        );

        setSalesPeriod(
          response.data.salesPeriod || {
            allowed: true,
          },
        );
      } catch (error) {
        const apiError = error as ApiError;

        setSalesReportMessage(
          `❌ ${
            apiError.response?.data?.error ||
            apiError.response?.data?.message ||
            'خطا در دریافت تاریخچه فروش.'
          }`,
        );
      } finally {
        setLoadingSalesReports(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSaleProducts();
    void loadSalesReports();
  }, [
    loadSaleProducts,
    loadSalesReports,
  ]);

  const selectedSaleItems = useMemo(() => {
    return saleProducts
      .map((product) => {
        const productId = String(
          product.productId ||
            product.id ||
            '',
        );

        const saleQuantity = toNumber(
          saleQuantities[productId] || 0,
        );

        return {
          product,
          productId,
          saleQuantity,
          totalAmount:
            saleQuantity *
            toNumber(product.unitPrice),
        };
      })
      .filter((item) => item.saleQuantity > 0);
  }, [saleProducts, saleQuantities]);

  const selectedProductsCount =
    selectedSaleItems.length;

  const selectedItemsQuantity =
    selectedSaleItems.reduce(
      (total, item) =>
        total + item.saleQuantity,
      0,
    );

  const selectedSaleTotal =
    selectedSaleItems.reduce(
      (total, item) =>
        total + item.totalAmount,
      0,
    );

  const changeSaleQuantity = (
    product: WarehouseSaleProduct,
    change: number,
  ) => {
    if (saleRegistrationBlocked) {
      setSalesReportMessage(
        `❌ ثبت اعلام فروش فقط در روزهای ۱۰، ۲۰ و ۳۰ هر ماه شمسی مجاز است.${
          salesPeriod.todayJalali
            ? ` امروز ${salesPeriod.todayJalali} است.`
            : ''
        }${
          salesPeriod.nextAllowedAtFa
            ? ` نوبت بعدی: ${salesPeriod.nextAllowedAtFa}.`
            : ''
        }`,
      );

      return;
    }

    const productId = String(
      product.productId ||
        product.id ||
        '',
    );

    const currentQuantity = toNumber(
      saleQuantities[productId] || 0,
    );

    const availableQuantity = toNumber(
      product.quantity,
    );

    if (
      change > 0 &&
      currentQuantity >= availableQuantity
    ) {
      setSalesReportMessage(
        `❌ تعداد فروش «${product.productName}» نمی‌تواند بیشتر از موجودی (${formatFaNumber(
          availableQuantity,
        )}) باشد.`,
      );

      return;
    }

    const nextQuantity = Math.max(
      0,
      Math.min(
        availableQuantity,
        currentQuantity + change,
      ),
    );

    setSaleQuantities((currentQuantities) => ({
      ...currentQuantities,
      [productId]:
        nextQuantity > 0
          ? String(nextQuantity)
          : '',
    }));

    setSalesReportMessage('');
  };

  const handleSalesReportSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (saleRegistrationBlocked) {
      setSalesReportMessage(
        `❌ ثبت اعلام فروش فقط در روزهای ۱۰، ۲۰ و ۳۰ هر ماه شمسی مجاز است.${
          salesPeriod.todayJalali
            ? ` امروز ${salesPeriod.todayJalali} است.`
            : ''
        }${
          salesPeriod.nextAllowedAtFa
            ? ` نوبت بعدی: ${salesPeriod.nextAllowedAtFa}.`
            : ''
        }`,
      );

      return;
    }

    if (selectedSaleItems.length === 0) {
      setSalesReportMessage(
        '❌ حداقل برای یک کالا تعداد فروش بیشتر از صفر وارد کنید.',
      );

      return;
    }

    if (!saleConfirmed) {
      setSalesReportMessage(
        '❌ برای ثبت فروش باید تأیید صحت اطلاعات را فعال کنید.',
      );

      return;
    }

    try {
      setSubmittingSalesReport(true);
      setSalesReportMessage('');

      const response = await axios.post<{
        success: boolean;
        message?: string;
        error?: string;
        data?: SalesReportApi;
        warehouse?: WarehouseSaleProduct[];
        salesPeriod?: SalesPeriod;
      }>(
        `${API_URL}/sales-from-warehouse`,
        {
          confirmedSale: true,
          items: selectedSaleItems.map((item) => ({
            productId: item.productId,
            quantity: item.saleQuantity,
          })),
        },
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.data.data) {
        setSalesReports((currentReports) => [
          response.data.data as SalesReportApi,
          ...currentReports,
        ]);
      }

      setSalesPeriod(
        response.data.salesPeriod || {
          allowed: true,
        },
      );

      if (response.data.warehouse) {
        setSaleProducts(
          response.data.warehouse.filter(
            (product) =>
              toNumber(product.quantity) > 0,
          ),
        );
      } else {
        await loadSaleProducts();
      }

      setSaleQuantities({});
      setSaleConfirmed(false);

      setSalesReportMessage(
        `✅ ${
          response.data.message ||
          'فروش با موفقیت ثبت شد و موجودی انبار به‌روزرسانی شد.'
        }`,
      );

      await loadSalesReports();
      onSaleRegistered?.();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.response?.data?.salesPeriod) {
        setSalesPeriod(
          apiError.response.data.salesPeriod,
        );
      }

      setSalesReportMessage(
        `❌ ${
          apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'خطا در ثبت اعلام فروش.'
        }`,
      );
    } finally {
      setSubmittingSalesReport(false);
    }
  };

  const getScheduleMessage = () => {
    return `ثبت اعلام فروش فقط در روزهای ۱۰، ۲۰ و ۳۰ هر ماه شمسی مجاز است.${
      salesPeriod.todayJalali
        ? ` امروز ${salesPeriod.todayJalali} است.`
        : ''
    }${
      salesPeriod.nextAllowedAtFa
        ? ` نوبت بعدی: ${salesPeriod.nextAllowedAtFa}.`
        : ''
    }`;
  };

  return (
    <>
      <div
        dir="rtl"
        className="sales-announcement-page space-y-6"
      >
        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-5 dark:border-gray-700 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                  <ShoppingCart className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-black text-gray-800 dark:text-white md:text-lg">
                    ثبت اعلام فروش از انبار
                  </h2>

                  <p className="mt-1 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    فقط کالاهای واقعی موجود در انبار شما نمایش داده می‌شوند.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void Promise.all([
                    loadSaleProducts(),
                    loadSalesReports(),
                  ]);
                }}
                disabled={
                  loadingSaleProducts ||
                  loadingSalesReports
                }
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loadingSaleProducts ||
                    loadingSalesReports
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                بروزرسانی
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSalesReportSubmit}
            className="p-5 md:p-6"
          >
            {saleRegistrationBlocked ? (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />

                  <div>
                    <p className="font-black text-amber-900 dark:text-amber-100">
                      ثبت اعلام فروش فعلاً غیرفعال است
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
                      {getScheduleMessage()}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {loadingSaleProducts ? (
              <div className="flex min-h-48 items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />

                  <p className="mt-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                    در حال دریافت کالاهای انبار...
                  </p>
                </div>
              </div>
            ) : saleProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
                <PackageOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

                <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
                  کالای قابل فروش در انبار شما وجود ندارد.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {saleProducts.map((product) => {
                    const productId = String(
                      product.productId ||
                        product.id ||
                        '',
                    );

                    const enteredQuantity =
                      toNumber(
                        saleQuantities[productId] || 0,
                      );

                    const availableQuantity =
                      toNumber(product.quantity);

                    const saleAmount =
                      enteredQuantity *
                      toNumber(product.unitPrice);

                    return (
                      <article
                        key={productId}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                      >
                        <p className="font-black text-gray-800 dark:text-white">
                          {product.productName}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-amber-50 p-2.5 text-center dark:bg-amber-950/30">
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                              موجودی
                            </p>

                            <p className="mt-1 font-black text-amber-900 dark:text-amber-100">
                              {formatFaNumber(
                                product.quantity,
                              )}{' '}
                              قلم
                            </p>
                          </div>

                          <div className="rounded-xl bg-indigo-50 p-2.5 text-center dark:bg-indigo-950/30">
                            

                            <p className="mt-1 font-black text-indigo-900 dark:text-indigo-100">
                              {formatToman(
                                product.unitPrice,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                            <button
                              type="button"
                              onClick={() => {
                                changeSaleQuantity(
                                  product,
                                  1,
                                );
                              }}
                              disabled={
                                submittingSalesReport ||
                                saleRegistrationBlocked ||
                                enteredQuantity >=
                                  availableQuantity
                              }
                              className="flex h-11 w-11 items-center justify-center border-l border-gray-200 text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:border-gray-700 dark:text-cyan-300 dark:hover:bg-cyan-500/10 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
                            >
                              <Plus className="h-5 w-5" />
                            </button>

                            <span className="flex h-11 min-w-12 items-center justify-center px-3 text-sm font-black text-gray-800 dark:text-white">
                              {formatFaNumber(
                                enteredQuantity,
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                changeSaleQuantity(
                                  product,
                                  -1,
                                );
                              }}
                              disabled={
                                submittingSalesReport ||
                                saleRegistrationBlocked ||
                                enteredQuantity <= 0
                              }
                              className="flex h-11 w-11 items-center justify-center border-r border-gray-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:border-gray-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
                            >
                              <Minus className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center dark:bg-emerald-950/30">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              مبلغ فروش
                            </p>

                            <p className="mt-0.5 font-black text-emerald-900 dark:text-emerald-100">
                              {formatToman(saleAmount)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 lg:block dark:border-gray-700">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                      <tr>
                        <th className="px-5 py-4 font-black">
                          عنوان
                        </th>

                        <th className="px-5 py-4 font-black">
                          موجودی انبار
                        </th>

                        <th className="px-5 py-4 font-black">
                          قیمت
                        </th>

                        <th className="px-5 py-4 font-black">
                          تعداد فروش
                        </th>

                        <th className="px-5 py-4 font-black">
                          مبلغ فروش
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {saleProducts.map((product) => {
                        const productId = String(
                          product.productId ||
                            product.id ||
                            '',
                        );

                        const enteredQuantity =
                          toNumber(
                            saleQuantities[productId] ||
                              0,
                          );

                        const availableQuantity =
                          toNumber(product.quantity);

                        const saleAmount =
                          enteredQuantity *
                          toNumber(product.unitPrice);

                        return (
                          <tr
                            key={productId}
                            className="transition hover:bg-gray-50/80 dark:hover:bg-gray-800/60"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-black text-gray-800 dark:text-white">
                              {product.productName}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-black text-amber-700 dark:text-amber-300">
                              {formatFaNumber(
                                product.quantity,
                              )}{' '}
                              قلم
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                              {formatToman(
                                product.unitPrice,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex w-fit items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    changeSaleQuantity(
                                      product,
                                      1,
                                    );
                                  }}
                                  disabled={
                                    submittingSalesReport ||
                                    saleRegistrationBlocked ||
                                    enteredQuantity >=
                                      availableQuantity
                                  }
                                  className="flex h-11 w-11 items-center justify-center border-l border-gray-200 text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:border-gray-700 dark:text-cyan-300 dark:hover:bg-cyan-500/10 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
                                >
                                  <Plus className="h-5 w-5" />
                                </button>

                                <span className="flex h-11 min-w-12 items-center justify-center px-3 text-sm font-black text-gray-800 dark:text-white">
                                  {formatFaNumber(
                                    enteredQuantity,
                                  )}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    changeSaleQuantity(
                                      product,
                                      -1,
                                    );
                                  }}
                                  disabled={
                                    submittingSalesReport ||
                                    saleRegistrationBlocked ||
                                    enteredQuantity <= 0
                                  }
                                  className="flex h-11 w-11 items-center justify-center border-r border-gray-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:border-gray-700 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
                                >
                                  <Minus className="h-5 w-5" />
                                </button>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-black text-emerald-700 dark:text-emerald-300">
                              {formatToman(saleAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      کالاهای انتخاب‌شده
                    </p>

                    <p className="mt-2 text-xl font-black text-indigo-900 dark:text-indigo-100">
                      {formatFaNumber(
                        selectedProductsCount,
                      )}{' '}
                      کالا
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      تعداد کل فروش
                    </p>

                    <p className="mt-2 text-xl font-black text-amber-900 dark:text-amber-100">
                      {formatFaNumber(
                        selectedItemsQuantity,
                      )}{' '}
                      قلم
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      مبلغ کل فروش
                    </p>

                    <p className="mt-2 text-xl font-black text-emerald-900 dark:text-emerald-100">
                      {formatToman(selectedSaleTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={saleConfirmed}
                      onChange={(event) => {
                        setSaleConfirmed(
                          event.target.checked,
                        );
                        setSalesReportMessage('');
                      }}
                      disabled={
                        submittingSalesReport ||
                        saleRegistrationBlocked
                      }
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />

                    <span className="leading-6">
                      تعداد کالاهای فروخته‌شده را تأیید می‌کنم. پس از ثبت، موجودی کالاها از انبار من کم می‌شود.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={
                      submittingSalesReport ||
                      saleRegistrationBlocked ||
                      selectedSaleItems.length === 0 ||
                      !saleConfirmed
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700 sm:w-auto"
                  >
                    {submittingSalesReport ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        ثبت نهایی
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {salesReportMessage ? (
              <div
                className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${
                  salesReportMessage.startsWith('✅')
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                }`}
              >
                {salesReportMessage}
              </div>
            ) : null}
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-5 dark:border-gray-700 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-6 w-6 text-emerald-600" />

                <div>
                  <h2 className="font-black text-gray-800 dark:text-white md:text-lg">
                    تاریخچه اعلام فروش من
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    گزارش‌های ثبت‌شده از طریق سرور
                  </p>
                </div>
              </div>

              {salesReports.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setPrintAllReports(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-700"
                >
                  <Printer className="h-4 w-4" />
                  چاپ همه گزارش‌ها
                </button>
              ) : null}
            </div>
          </div>

          {loadingSalesReports ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-cyan-500" />
            </div>
          ) : salesReports.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

              <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
                هنوز اعلام فروشی ثبت نکرده‌اید.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-5 lg:hidden">
                {salesReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          تاریخ ثبت
                        </p>

                        <p className="mt-1 font-black text-gray-800 dark:text-white">
                          {formatCreatedAt(
                            report.createdAt ||
                              report.saleDate,
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPrintReport(report);
                        }}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300"
                      >
                        <Printer className="h-4 w-4" />
                        چاپ
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/30">
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          تعداد نوع کالا
                        </p>

                        <p className="mt-1 font-black text-indigo-900 dark:text-indigo-100">
                          {formatFaNumber(
                            getReportItemsCount(report),
                          )}{' '}
                          کالا
                        </p>
                      </div>

                      <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          تعداد کل فروش
                        </p>

                        <p className="mt-1 font-black text-amber-900 dark:text-amber-100">
                          {formatFaNumber(
                            getReportTotalItems(report),
                          )}{' '}
                          قلم
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          مبلغ کل
                        </p>

                        <p className="mt-1 font-black text-emerald-900 dark:text-emerald-100">
                          {formatToman(
                            getReportTotalAmount(report),
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-4 font-black">
                        تاریخ ثبت
                      </th>

                      <th className="px-5 py-4 font-black">
                        تعداد نوع کالا
                      </th>

                      <th className="px-5 py-4 font-black">
                        تعداد کل فروش
                      </th>

                      <th className="px-5 py-4 font-black">
                        مبلغ کل فروش
                      </th>

                      <th className="px-5 py-4 font-black">
                        عملیات
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {salesReports.map((report) => (
                      <tr
                        key={report.id}
                        className="transition hover:bg-gray-50/80 dark:hover:bg-gray-800/60"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-gray-600 dark:text-gray-300">
                          {formatCreatedAt(
                            report.createdAt ||
                              report.saleDate,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-black text-indigo-700 dark:text-indigo-300">
                          {formatFaNumber(
                            getReportItemsCount(report),
                          )}{' '}
                          کالا
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-black text-amber-700 dark:text-amber-300">
                          {formatFaNumber(
                            getReportTotalItems(report),
                          )}{' '}
                          قلم
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-black text-emerald-700 dark:text-emerald-300">
                          {formatToman(
                            getReportTotalAmount(report),
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setPrintReport(report);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300"
                          >
                            <Printer className="h-4 w-4" />
                            چاپ گزارش
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {printReport ? (
  <SalesAnnouncementPrint
    report={printReport}
    settings={effectivePrintSettings}
    onClose={() => {
      setPrintReport(null);
    }}
  />
) : null}

{printAllReports ? (
  <SalesAnnouncementPrint
    reports={salesReports}
    settings={effectivePrintSettings}
    onClose={() => {
      setPrintAllReports(false);
    }}
  />
) : null}
    </>
  );
};

export default SalesAnnouncement;