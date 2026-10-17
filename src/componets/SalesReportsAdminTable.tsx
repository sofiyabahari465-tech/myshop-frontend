'use client';

import {
  AlertCircle,
  CalendarDays,
  ClipboardCheck,
  Eye,
  Loader2,
  MapPin,
  PackageOpen,
  Printer,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { SalesReport } from '../types';

type SalesReportItem = {
  productId?: string | number;
  productName?: string;
  title?: string;
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  totalPrice?: number | string;
  totalAmount?: number | string;
};

type SalesReportApi = SalesReport & {
  id: string;
  representativeId?: string;
  representativeCode?: string;
  representativeName?: string;
  representativeCity?: string;
  itemsCount?: number | string;
  totalItems?: number | string;
  totalAmount?: number | string;
  saleDate?: string;
  createdAt?: string;
  items?: SalesReportItem[];
};

type PrintSettings = {
  companyName: string;
  companySubtitle: string;
  reportTitle: string;
  reportDescription: string;
  companyAddress: string;
  companyPhone: string;
  companyWebsite: string;
  reportNumber: string;
  preparedBy: string;
  salesManager: string;
  notes: string;
};

type PrintMode = 'all' | 'single';

type SalesReportsAdminTableProps = {
  token?: string;
  apiBaseUrl?: string;
};

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  companyName: 'نام شرکت شما',
  companySubtitle: 'سامانه مدیریت فروش و انبار',
  reportTitle: 'گزارش جامع اعلام فروش نمایندگان',
  reportDescription:
    'این گزارش بر اساس اطلاعات ثبت‌شده توسط نمایندگان در سامانه فروش و انبار تهیه شده است.',
  companyAddress: 'آدرس شرکت، شهر، استان',
  companyPhone: '۰۲۱-۱۲۳۴۵۶۷۸',
  companyWebsite: 'www.example.com',
  reportNumber: '',
  preparedBy: '',
  salesManager: '',
  notes:
    'این گزارش بر اساس اطلاعات ثبت‌شده در سامانه تهیه شده است. لطفاً پیش از امضا، تعداد کالاها، مبلغ کل فروش و جزئیات نمایندگان را بررسی کنید.',
};

const TOKEN_STORAGE_KEYS = [
  'admin_access_token',
  'adminAccessToken',
  'admin_token',
  'adminToken',
  'accessToken',
  'authToken',
  'token',
] as const;

const toEnglishDigits = (value: unknown) => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => {
      return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
    })
    .replace(/[٠-٩]/g, (digit) => {
      return String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
    });
};

const toNumber = (value: unknown) => {
  const normalized = toEnglishDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');

  const result = Number(normalized);

  return Number.isFinite(result) ? result : 0;
};

const formatFaNumber = (value: unknown) => {
  return new Intl.NumberFormat('fa-IR').format(toNumber(value));
};

const formatToman = (value: unknown) => {
  return `${formatFaNumber(value)} تومان`;
};

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  for (const key of TOKEN_STORAGE_KEYS) {
    const localStorageToken = window.localStorage.getItem(key);

    if (localStorageToken?.trim()) {
      return localStorageToken.trim();
    }

    const sessionStorageToken = window.sessionStorage.getItem(key);

    if (sessionStorageToken?.trim()) {
      return sessionStorageToken.trim();
    }
  }

  return '';
};

const getErrorMessageFromResponse = async (response: Response) => {
  try {
    const result = await response.json();

    if (typeof result === 'string') {
      return result;
    }

    return (
      result?.error ||
      result?.message ||
      result?.detail ||
      'دریافت اعلام فروش‌ها با خطا مواجه شد.'
    );
  } catch {
    if (response.status === 401) {
      return 'نشست ادمین نامعتبر یا منقضی شده است. لطفاً دوباره وارد حساب ادمین شوید.';
    }

    if (response.status === 403) {
      return 'شما دسترسی لازم برای مشاهده اعلام فروش‌ها را ندارید.';
    }

    return 'دریافت اعلام فروش‌ها با خطا مواجه شد.';
  }
};

const formatPersianDate = (
  saleDate?: string,
  createdAt?: string,
) => {
  if (saleDate) {
    return saleDate;
  }

  if (!createdAt) {
    return '—';
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
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
  ).format(parsedDate);
};

const formatPrintDate = () => {
  return new Date().toLocaleDateString('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatPrintTime = () => {
  return new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getReportDate = (report: SalesReportApi) => {
  const rawDate = report.createdAt || report.saleDate;

  if (!rawDate) {
    return null;
  }

  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const getProductName = (item: SalesReportItem) => {
  return (
    item.productName ||
    item.title ||
    item.name ||
    'کالای بدون نام'
  );
};

const getItemUnitPrice = (item: SalesReportItem) => {
  return toNumber(item.unitPrice ?? item.price);
};

const getItemTotalPrice = (item: SalesReportItem) => {
  const explicitTotal = toNumber(
    item.totalPrice ?? item.totalAmount,
  );

  if (explicitTotal > 0) {
    return explicitTotal;
  }

  return toNumber(item.quantity) * getItemUnitPrice(item);
};

// نرمال‌سازی API_URL: اگر با /api تمام شده بود، آن را حذف می‌کنیم
const RAW_API_URL =
  typeof window !== 'undefined'
    ? (import.meta.env.VITE_API_URL ||
      'http://localhost:5000/api')
    : 'http://localhost:5000/api';

const API_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL.slice(0, -4)
  : RAW_API_URL;

const SalesReportsAdminTable = ({
  token,
}: SalesReportsAdminTableProps) => {
  const [reports, setReports] = useState<SalesReportApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedReport, setSelectedReport] =
    useState<SalesReportApi | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('all');
  const [printReport, setPrintReport] =
    useState<SalesReportApi | null>(null);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(
    DEFAULT_PRINT_SETTINGS,
  );

  const loadSalesReports = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const authToken = token?.trim() || getStoredToken();

      if (!authToken) {
        throw new Error(
          'توکن ورود ادمین پیدا نشد. لطفاً یک‌بار خارج و دوباره وارد حساب ادمین شوید.',
        );
      }

      const response = await fetch(
        `${API_URL}/api/sales-from-warehouse/admin/all`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        const message = await getErrorMessageFromResponse(response);

        if (response.status === 401) {
          setReports([]);
        }

        throw new Error(message);
      }

      const result = await response.json();

      if (!result?.success) {
        throw new Error(
          result?.error ||
            result?.message ||
            'دریافت اعلام فروش‌ها با خطا مواجه شد.',
        );
      }

      const receivedReports = Array.isArray(result?.data)
        ? result.data
        : [];

      setReports(receivedReports);
    } catch (error) {
      console.error('خطا در دریافت اعلام فروش‌ها:', error);

      setReports([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'خطا در دریافت اعلام فروش‌ها از سرور.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSalesReports();
  }, [loadSalesReports]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (showPrintPreview) {
        setShowPrintPreview(false);
        setPrintReport(null);
        return;
      }

      if (selectedReport) {
        setSelectedReport(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedReport, showPrintPreview]);

  const totalReports = useMemo(() => {
    return reports.length;
  }, [reports]);

  const totalAllItems = useMemo(() => {
    return reports.reduce((total, report) => {
      return total + toNumber(report.totalItems);
    }, 0);
  }, [reports]);

  const totalSalesAmount = useMemo(() => {
    return reports.reduce((total, report) => {
      return total + toNumber(report.totalAmount);
    }, 0);
  }, [reports]);

  const representativesCount = useMemo(() => {
    const representativeIds = reports
      .map((report) => {
        return String(
          report.representativeId ||
            report.representativeCode ||
            report.representativeName ||
            '',
        );
      })
      .filter(Boolean);

    return new Set(representativeIds).size;
  }, [reports]);

  // مبلغ فروش ۱۰ روز گذشته
  const salesAmountLastTenDays = useMemo(() => {
    const now = new Date();
    const tenDaysAgo = new Date(now);

    tenDaysAgo.setHours(0, 0, 0, 0);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);

    return reports
      .filter((report) => {
        const reportDate = getReportDate(report);

        if (!reportDate) {
          return false;
        }

        return reportDate >= tenDaysAgo && reportDate <= now;
      })
      .reduce((total, report) => {
        return total + toNumber(report.totalAmount);
      }, 0);
  }, [reports]);

  // مبلغ فروش ماهانه نمایندگان
  const salesAmountCurrentMonth = useMemo(() => {
    const currentMonthKey = new Intl.DateTimeFormat(
      'fa-IR-u-ca-persian',
      {
        year: 'numeric',
        month: '2-digit',
      },
    ).format(new Date());

    return reports
      .filter((report) => {
        const reportDate = getReportDate(report);

        if (!reportDate) {
          return false;
        }

        const reportMonthKey = new Intl.DateTimeFormat(
          'fa-IR-u-ca-persian',
          {
            year: 'numeric',
            month: '2-digit',
          },
        ).format(reportDate);

        return reportMonthKey === currentMonthKey;
      })
      .reduce((total, report) => {
        return total + toNumber(report.totalAmount);
      }, 0);
  }, [reports]);

  const reportsLastTenDays = useMemo(() => {
    const now = new Date();
    const tenDaysAgo = new Date(now);

    tenDaysAgo.setHours(0, 0, 0, 0);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);

    return reports.filter((report) => {
      const reportDate = getReportDate(report);

      if (!reportDate) {
        return false;
      }

      return reportDate >= tenDaysAgo && reportDate <= now;
    }).length;
  }, [reports]);

  const reportsCurrentMonth = useMemo(() => {
    const currentMonthKey = new Intl.DateTimeFormat(
      'fa-IR-u-ca-persian',
      {
        year: 'numeric',
        month: '2-digit',
      },
    ).format(new Date());

    return reports.filter((report) => {
      const reportDate = getReportDate(report);

      if (!reportDate) {
        return false;
      }

      const reportMonthKey = new Intl.DateTimeFormat(
        'fa-IR-u-ca-persian',
        {
          year: 'numeric',
          month: '2-digit',
        },
      ).format(reportDate);

      return reportMonthKey === currentMonthKey;
    }).length;
  }, [reports]);

  const selectedReportItems = useMemo(() => {
    if (!selectedReport || !Array.isArray(selectedReport.items)) {
      return [];
    }

    return selectedReport.items;
  }, [selectedReport]);

  const printReports = useMemo(() => {
    if (printMode === 'single' && printReport) {
      return [printReport];
    }

    return reports;
  }, [printMode, printReport, reports]);

  const printReportsTotalItems = useMemo(() => {
    return printReports.reduce((total, report) => {
      return total + toNumber(report.totalItems);
    }, 0);
  }, [printReports]);

  const printReportsTotalAmount = useMemo(() => {
    return printReports.reduce((total, report) => {
      return total + toNumber(report.totalAmount);
    }, 0);
  }, [printReports]);

  const getDefaultReportNumber = (
    mode: PrintMode,
    report?: SalesReportApi | null,
  ) => {
    const datePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date())
      .replace(/\//g, '');

    const suffix =
      mode === 'single' && report?.id
        ? String(report.id).slice(-6)
        : String(reports.length).padStart(4, '0');

    return `ADM-${toEnglishDigits(datePart)}-${suffix}`;
  };

  const updatePrintSetting = (
    field: keyof PrintSettings,
    value: string,
  ) => {
    setPrintSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  };

  const openAllReportsPrint = () => {
    if (reports.length === 0) {
      setErrorMessage('هیچ اعلام فروشی برای چاپ وجود ندارد.');
      return;
    }

    setPrintMode('all');
    setPrintReport(null);

    setPrintSettings((currentSettings) => ({
      ...currentSettings,
      reportTitle: 'گزارش جامع اعلام فروش نمایندگان',
      reportDescription:
        'این گزارش شامل تمام اعلام فروش‌های ثبت‌شده توسط نمایندگان است.',
      reportNumber: getDefaultReportNumber('all'),
    }));

    setShowPrintPreview(true);
  };

  const openSingleReportPrint = (report: SalesReportApi) => {
    setPrintMode('single');
    setPrintReport(report);

    setPrintSettings((currentSettings) => ({
      ...currentSettings,
      reportTitle: `گزارش اعلام فروش نمایندگی ${
        report.representativeName || ''
      }`,
      reportDescription:
        'این گزارش شامل اطلاعات و جزئیات یک اعلام فروش ثبت‌شده توسط نمایندگی است.',
      reportNumber: getDefaultReportNumber('single', report),
    }));

    setShowPrintPreview(true);
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
    setPrintReport(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <section className="flex min-h-[360px] items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-500" />

          <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
            در حال دریافت اعلام فروش‌های نمایندگان...
          </p>
        </div>
      </section>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            direction: rtl !important;
            font-family: Tahoma, Arial, sans-serif !important;
          }

          body * {
            visibility: hidden !important;
          }

          .admin-print-only,
          .admin-print-only * {
            visibility: visible !important;
          }

          .admin-print-only {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #111827 !important;
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .admin-invoice-page {
            width: 100% !important;
            min-height: 270mm !important;
            position: relative !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          .admin-invoice-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 12px !important;
            padding: 12px 14px !important;
            border: 2px solid #0f766e !important;
            border-radius: 10px !important;
            background: #ecfdf5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-company-name {
            margin: 0 !important;
            color: #115e59 !important;
            font-size: 20px !important;
            font-weight: 900 !important;
          }

          .admin-company-subtitle {
            margin: 6px 0 0 !important;
            color: #374151 !important;
            font-size: 11px !important;
          }

          .admin-company-logo {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 54px !important;
            height: 54px !important;
            flex-shrink: 0 !important;
            border: 2px solid #0f766e !important;
            border-radius: 50% !important;
            color: #115e59 !important;
            font-size: 18px !important;
            font-weight: 900 !important;
            background: #ffffff !important;
          }

          .admin-invoice-title-box {
            margin-top: 12px !important;
            padding: 10px 12px !important;
            text-align: center !important;
            border: 1px solid #9ca3af !important;
            border-radius: 8px !important;
          }

          .admin-invoice-title {
            margin: 0 !important;
            color: #111827 !important;
            font-size: 18px !important;
            font-weight: 900 !important;
          }

          .admin-invoice-description {
            margin: 5px 0 0 !important;
            color: #4b5563 !important;
            font-size: 10px !important;
          }

          .admin-invoice-info-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-top: 12px !important;
          }

          .admin-invoice-info-card {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
            padding: 8px 10px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 6px !important;
            background: #f9fafb !important;
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-invoice-label {
            color: #4b5563 !important;
            font-weight: 700 !important;
          }

          .admin-invoice-value {
            color: #111827 !important;
            font-weight: 900 !important;
          }

          .admin-invoice-table {
            width: 100% !important;
            margin-top: 14px !important;
            border-collapse: collapse !important;
            direction: rtl !important;
            color: #111827 !important;
            font-size: 9px !important;
          }

          .admin-invoice-table th,
          .admin-invoice-table td {
            border: 1px solid #6b7280 !important;
            padding: 7px 5px !important;
            text-align: right !important;
            vertical-align: middle !important;
            line-height: 1.8 !important;
            word-break: break-word !important;
          }

          .admin-invoice-table th {
            background: #115e59 !important;
            color: #ffffff !important;
            font-weight: 900 !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-invoice-table tbody tr:nth-child(even) td {
            background: #f9fafb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-invoice-table tfoot td {
            background: #ecfdf5 !important;
            color: #064e3b !important;
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-details-line {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.8 !important;
          }

          .admin-invoice-summary {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-top: 14px !important;
          }

          .admin-summary-card {
            padding: 10px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 7px !important;
            background: #f9fafb !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-summary-label {
            margin: 0 !important;
            color: #4b5563 !important;
            font-size: 10px !important;
            font-weight: 700 !important;
          }

          .admin-summary-value {
            margin: 5px 0 0 !important;
            color: #111827 !important;
            font-size: 13px !important;
            font-weight: 900 !important;
          }

          .admin-invoice-notes {
            margin-top: 14px !important;
            padding: 10px 12px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 7px !important;
            background: #fffbeb !important;
            color: #374151 !important;
            font-size: 10px !important;
            line-height: 1.9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .admin-notes-title {
            margin: 0 0 5px !important;
            color: #92400e !important;
            font-weight: 900 !important;
          }

          .admin-signatures {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 16px !important;
            margin-top: 28px !important;
            text-align: center !important;
            font-size: 10px !important;
          }

          .admin-signature-box {
            min-height: 75px !important;
            padding-top: 8px !important;
            border-top: 1px solid #111827 !important;
            color: #111827 !important;
          }

          .admin-invoice-footer {
            margin-top: 18px !important;
            padding-top: 9px !important;
            border-top: 1px solid #9ca3af !important;
            color: #4b5563 !important;
            text-align: center !important;
            font-size: 9px !important;
            line-height: 1.8 !important;
          }

          .admin-print-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* کارت‌های آماری */}
     {/* کارت‌های آماری – طراحی خفن و هم‌سطح */}
<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
  {/* باکس ۱: تعداد اعلام فروش‌ها */}
  <div className="group relative flex h-36 overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl dark:border-cyan-900/50 dark:from-cyan-950/30 dark:via-gray-900 dark:to-gray-900">
    <div className="relative z-10 flex w-full items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
          تعداد اعلام فروش‌ها
        </p>

        <p className="mt-2 text-3xl font-black text-cyan-900 dark:text-cyan-100">
          {formatFaNumber(totalReports)}
        </p>

        <p className="mt-1 truncate text-xs font-bold text-cyan-600 dark:text-cyan-400">
          از {formatFaNumber(representativesCount)} نمایندگی
        </p>
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-600/40 transition-transform group-hover:scale-110 group-hover:rotate-3">
        <ClipboardCheck className="h-7 w-7" />
      </div>
    </div>

    {/* افکت پس‌زمینه */}
    <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-cyan-400/10" />
  </div>

  {/* باکس ۲: مبلغ فروش ۱۰ روز گذشته */}
  <div className="group relative flex h-36 overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl dark:border-violet-900/50 dark:from-violet-950/30 dark:via-gray-900 dark:to-gray-900">
    <div className="relative z-10 flex w-full items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          مبلغ فروش ۱۰ روز گذشته
        </p>

        <p className="mt-2 text-3xl font-black text-violet-900 dark:text-violet-100">
          {formatToman(salesAmountLastTenDays)}
        </p>

        <p className="mt-1 truncate text-xs font-bold text-violet-600 dark:text-violet-400">
          فروش نمایندگان در ۱۰ روز اخیر
        </p>
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-600/40 transition-transform group-hover:scale-110 group-hover:rotate-3">
        <CalendarDays className="h-7 w-7" />
      </div>
    </div>

    <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-violet-400/10" />
  </div>

  {/* باکس ۳: مبلغ فروش ماهانه نمایندگان */}
  <div className="group relative flex h-36 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl dark:border-blue-900/50 dark:from-blue-950/30 dark:via-gray-900 dark:to-gray-900">
    <div className="relative z-10 flex w-full items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          مبلغ فروش ماهانه نمایندگان
        </p>

        <p className="mt-2 text-3xl font-black text-blue-900 dark:text-blue-100">
          {formatToman(salesAmountCurrentMonth)}
        </p>

        <p className="mt-1 truncate text-xs font-bold text-blue-600 dark:text-blue-400">
          فروش نمایندگان در ماه جاری
        </p>
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/40 transition-transform group-hover:scale-110 group-hover:rotate-3">
        <TrendingUp className="h-7 w-7" />
      </div>
    </div>

    <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-blue-400/10" />
  </div>

  {/* باکس ۴: مجموع مبلغ فروش */}
  <div className="group relative flex h-36 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-gray-900 dark:to-gray-900">
    <div className="relative z-10 flex w-full items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          مجموع مبلغ فروش
        </p>

        <p className="mt-2 text-3xl font-black text-emerald-900 dark:text-emerald-100">
          {formatToman(totalSalesAmount)}
        </p>

        <p className="mt-1 truncate text-xs font-bold text-emerald-600 dark:text-emerald-400">
          مجموع اعلام فروش‌های ثبت‌شده
        </p>
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/40 transition-transform group-hover:scale-110 group-hover:rotate-3">
        <TrendingUp className="h-7 w-7" />
      </div>
    </div>

    <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-emerald-400/10" />
  </div>
</section>

      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-gray-700 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h2 className="font-black text-gray-800 dark:text-white md:text-lg">
              لیست اعلام فروش نمایندگان
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              اطلاعات مستقیماً از سرور دریافت می‌شود.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAllReportsPrint}
              disabled={reports.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-black text-cyan-700 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50"
            >
              <Printer className="h-4 w-4" />
              چاپ گزارش‌ها
            </button>

            <button
              type="button"
              onClick={() => {
                void loadSalesReports();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              بروزرسانی از سرور
            </button>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

            <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
              هنوز هیچ اعلام فروشی ثبت نشده است.
            </p>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              بعد از ثبت فروش در پنل نماینده، گزارش آن در همین بخش برای ادمین نمایش داده می‌شود.
            </p>
          </div>
        ) : (
          <>
            {/* کارت‌های موبایل */}
            <div className="space-y-4 p-4 md:hidden">
              {reports.map((report) => {
                const reportItems = Array.isArray(report.items)
                  ? report.items
                  : [];

                return (
                  <article
                    key={report.id}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="border-b border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            نمایندگی
                          </p>

                          <h3 className="mt-1 truncate font-black text-gray-800 dark:text-white">
                            {report.representativeName || 'نمایندگی بدون نام'}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                              کد: {report.representativeCode || '—'}
                            </span>

                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                              <MapPin className="h-3.5 w-3.5 text-rose-500" />
                              {report.representativeCity || 'شهر ثبت نشده'}
                            </span>
                          </div>
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                          <UserRound className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          تاریخ ثبت اعلام فروش
                        </p>

                        <p className="mt-1 text-sm font-black text-gray-800 dark:text-white">
                          {formatPersianDate(
                            report.saleDate,
                            report.createdAt,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          تعداد کل فروش
                        </p>

                        <p className="mt-1 font-black text-amber-900 dark:text-amber-100">
                          {formatFaNumber(report.totalItems)} قلم
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          مبلغ کل فروش
                        </p>

                        <p className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-200">
                          {formatToman(report.totalAmount)}
                        </p>
                      </div>

                      {reportItems.length > 0 ? (
                        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                          <p className="mb-2 text-xs font-black text-gray-700 dark:text-gray-200">
                            خلاصه کالاها
                          </p>

                          <div className="space-y-1.5">
                            {reportItems.slice(0, 2).map(
                              (item, itemIndex) => (
                                <p
                                  key={`${report.id}-${
                                    item.productId || itemIndex
                                  }`}
                                  className="text-xs leading-6 text-gray-600 dark:text-gray-300"
                                >
                                  <span className="font-bold text-gray-800 dark:text-gray-100">
                                    {getProductName(item)}
                                  </span>
                                  {' — '}
                                  {formatFaNumber(item.quantity)} قلم
                                </p>
                              ),
                            )}

                            {reportItems.length > 2 ? (
                              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                                و {formatFaNumber(reportItems.length - 2)} کالای دیگر...
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                          }}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-cyan-700"
                        >
                          <Eye className="h-4 w-4" />
                          جزئیات
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            openSingleReportPrint(report);
                          }}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                          <Printer className="h-4 w-4" />
                          چاپ
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* جدول دسکتاپ */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[900px] w-full text-right text-sm">
                <thead className="bg-gray-50 text-ellipsis text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-4 font-black">
                      تاریخ ثبت
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black">
                      کد نمایندگی
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black">
                      نام نمایندگی
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black">
                      شهر
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black">
                      مجموع اقلام
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 font-black">
                      مبلغ کل فروش
                    </th>

                    <th className="whitespace-nowrap px-5 text-center py-4 font-black">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {formatPersianDate(
                          report.saleDate,
                          report.createdAt,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex rounded-lg bg-cyan-50 px-3 py-1.5 font-black text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                          {report.representativeCode || '—'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center gap-2 font-black text-gray-800 dark:text-white">
                          <UserRound className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          {report.representativeName || '—'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <MapPin className="h-4 w-4 text-rose-500" />
                          {report.representativeCity || '—'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-black text-amber-700 dark:text-amber-300">
                          {formatFaNumber(report.totalItems)} قلم
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-black text-emerald-700 dark:text-emerald-300">
                          {formatToman(report.totalAmount)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-black text-white transition-colors hover:bg-cyan-700"
                          >
                            <Eye className="h-4 w-4" />
                            مشاهده جزئیات
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              openSingleReportPrint(report);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                          >
                            <Printer className="h-4 w-4" />
                            چاپ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {selectedReport ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm no-print"
          onMouseDown={() => {
            setSelectedReport(null);
          }}
        >
          <section
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="جزئیات اعلام فروش"
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                  <ShoppingBag className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="font-black text-gray-800 dark:text-white md:text-lg">
                    جزئیات اعلام فروش
                  </h3>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    اطلاعات فروش ثبت‌شده توسط نمایندگی
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                aria-label="بستن پنجره جزئیات"
                title="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5 md:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20">
                  <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                    نام نمایندگی
                  </p>

                  <p className="mt-2 font-black text-cyan-900 dark:text-cyan-100">
                    {selectedReport.representativeName || '—'}
                  </p>

                  <p className="mt-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    کد: {selectedReport.representativeCode || '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
                    شهر نمایندگی
                  </p>

                  <p className="mt-2 font-black text-violet-900 dark:text-violet-100">
                    {selectedReport.representativeCity || '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    مبلغ کل فروش
                  </p>

                  <p className="mt-2 font-black text-emerald-900 dark:text-emerald-100">
                    {formatToman(selectedReport.totalAmount)}
                  </p>

                  <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatFaNumber(selectedReport.totalItems)} قلم
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      تاریخ ثبت اعلام فروش
                    </p>

                    <p className="mt-1 font-black text-gray-800 dark:text-white">
                      {formatPersianDate(
                        selectedReport.saleDate,
                        selectedReport.createdAt,
                      )}
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                    <ClipboardCheck className="h-4 w-4 text-cyan-500" />
                    شناسه گزارش: {selectedReport.id}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/70">
                  <PackageOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />

                  <h4 className="font-black text-gray-800 dark:text-white">
                    کالاهای فروخته‌شده
                  </h4>
                </div>

                {selectedReportItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <PackageOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

                    <p className="mt-3 text-sm font-black text-gray-600 dark:text-gray-300">
                      جزئیات کالاهای این اعلام فروش از سرور دریافت نشده است.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 p-4 md:hidden">
                      {selectedReportItems.map((item, index) => (
                        <article
                          key={`${selectedReport.id}-${item.productId || index}`}
                          className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                کالا {formatFaNumber(index + 1)}
                              </p>

                              <p className="mt-1 break-words font-black text-gray-800 dark:text-white">
                                {getProductName(item)}
                              </p>
                            </div>

                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              {formatFaNumber(item.quantity)} قلم
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                              

                              <p className="mt-1 text-xs font-black text-gray-700 dark:text-gray-100">
                                {formatToman(getItemUnitPrice(item))}
                              </p>
                            </div>

                            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                مبلغ کل
                              </p>

                              <p className="mt-1 text-xs font-black text-emerald-800 dark:text-emerald-200">
                                {formatToman(getItemTotalPrice(item))}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-[700px] w-full text-right text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                          <tr>
                            <th className="px-5 py-4 font-black">
                              ردیف
                            </th>

                            <th className="px-5 py-4 font-black">
                              نام کالا
                            </th>

                            <th className="px-5 py-4 font-black">
                              تعداد فروش
                            </th>

                            <th className="px-5 py-4 font-black">
                              قیمت واحد
                            </th>

                            <th className="px-5 py-4 font-black">
                              مبلغ کل
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {selectedReportItems.map((item, index) => (
                            <tr
                              key={`${selectedReport.id}-${item.productId || index}`}
                              className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/60"
                            >
                              <td className="px-5 py-4 font-black text-gray-500 dark:text-gray-400">
                                {formatFaNumber(index + 1)}
                              </td>

                              <td className="px-5 py-4 font-black text-gray-800 dark:text-white">
                                {getProductName(item)}
                              </td>

                              <td className="px-5 py-4 font-black text-amber-700 dark:text-amber-300">
                                {formatFaNumber(item.quantity)} قلم
                              </td>

                              <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                {formatToman(getItemUnitPrice(item))}
                              </td>

                              <td className="px-5 py-4 font-black text-emerald-700 dark:text-emerald-300">
                                {formatToman(getItemTotalPrice(item))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 md:px-6">
              <button
                type="button"
                onClick={() => {
                  openSingleReportPrint(selectedReport);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-cyan-700"
              >
                <Printer className="h-4 w-4" />
                تنظیم و چاپ گزارش
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-black text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                بستن
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showPrintPreview ? (
        <div className="admin-print-only">
          <div className="admin-invoice-page">
            <header className="admin-invoice-header">
              <div>
                <h1 className="admin-company-name">
                  {printSettings.companyName || '—'}
                </h1>

                <p className="admin-company-subtitle">
                  {printSettings.companySubtitle || '—'}
                </p>
              </div>

              <div className="admin-company-logo">
                {(printSettings.companyName || 'ش').slice(0, 1)}
              </div>
            </header>

            <section className="admin-invoice-title-box">
              <h2 className="admin-invoice-title">
                {printSettings.reportTitle || 'گزارش اعلام فروش'}
              </h2>

              <p className="admin-invoice-description">
                {printSettings.reportDescription || '—'}
              </p>
            </section>

            <section className="admin-invoice-info-grid">
              <div className="admin-invoice-info-card">
                <span className="admin-invoice-label">شماره گزارش</span>

                <span className="admin-invoice-value">
                  {printSettings.reportNumber || '—'}
                </span>
              </div>

              <div className="admin-invoice-info-card">
                <span className="admin-invoice-label">تاریخ چاپ</span>

                <span className="admin-invoice-value">
                  {formatPrintDate()}
                </span>
              </div>

              <div className="admin-invoice-info-card">
                <span className="admin-invoice-label">ساعت چاپ</span>

                <span className="admin-invoice-value">
                  {formatPrintTime()}
                </span>
              </div>

              <div className="admin-invoice-info-card">
                <span className="admin-invoice-label">نوع گزارش</span>

                <span className="admin-invoice-value">
                  {printMode === 'all'
                    ? 'تمام اعلام فروش نمایندگان'
                    : 'اعلام فروش یک نمایندگی'}
                </span>
              </div>
            </section>

            <table className="admin-invoice-table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>تاریخ ثبت</th>
                  <th>کد نمایندگی</th>
                  <th>نام نمایندگی</th>
                  <th>شهر</th>
                  <th>تعداد اقلام</th>
                  <th>مبلغ کل</th>
                  <th>جزئیات کالاها</th>
                </tr>
              </thead>

              <tbody>
                {printReports.map((report, index) => {
                  const items = Array.isArray(report.items)
                    ? report.items
                    : [];

                  return (
                    <tr
                      key={report.id || index}
                      className="admin-print-row"
                    >
                      <td>{formatFaNumber(index + 1)}</td>

                      <td>
                        {formatPersianDate(
                          report.saleDate,
                          report.createdAt,
                        )}
                      </td>

                      <td>{report.representativeCode || '—'}</td>

                      <td>{report.representativeName || '—'}</td>

                      <td>{report.representativeCity || '—'}</td>

                      <td>{formatFaNumber(report.totalItems)} قلم</td>

                      <td>{formatToman(report.totalAmount)}</td>

                      <td>
                        <div>
                          {items.length > 0 ? (
                            items.map((item, itemIndex) => (
                              <p
                                key={`${report.id}-${
                                  item.productId || itemIndex
                                }`}
                                className="admin-details-line"
                              >
                                {getProductName(item)}
                                {' — '}
                                {formatFaNumber(item.quantity)} قلم
                                {getItemUnitPrice(item) > 0
                                  ? ` — ${formatToman(
                                      getItemUnitPrice(item),
                                    )}`
                                  : ''}
                              </p>
                            ))
                          ) : (
                            <span>جزئیات کالا دریافت نشده است</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={5}>جمع کل گزارش</td>
                  <td>{formatFaNumber(printReportsTotalItems)} قلم</td>
                  <td>{formatToman(printReportsTotalAmount)}</td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>

            <section className="admin-invoice-summary">
              <div className="admin-summary-card">
                <p className="admin-summary-label">
                  تعداد گزارش‌های چاپ‌شده
                </p>

                <p className="admin-summary-value">
                  {formatFaNumber(printReports.length)} گزارش
                </p>
              </div>

              <div className="admin-summary-card">
                <p className="admin-summary-label">
                  تعداد کل اقلام فروخته‌شده
                </p>

                <p className="admin-summary-value">
                  {formatFaNumber(printReportsTotalItems)} قلم
                </p>
              </div>

              <div className="admin-summary-card">
                <p className="admin-summary-label">مبلغ کل فروش</p>

                <p className="admin-summary-value">
                  {formatToman(printReportsTotalAmount)}
                </p>
              </div>
            </section>

            <section className="admin-invoice-notes">
              <p className="admin-notes-title">
                توضیحات و شرایط گزارش
              </p>

              <p>{printSettings.notes || '—'}</p>
            </section>

            <section className="admin-signatures">
              <div className="admin-signature-box">
                <p>تنظیم‌کننده گزارش</p>
                <p>{printSettings.preparedBy || 'نام و امضا'}</p>
              </div>

              <div className="admin-signature-box">
                <p>تأیید مسئول فروش</p>
                <p>{printSettings.salesManager || 'نام و امضا'}</p>
              </div>

              <div className="admin-signature-box">
                <p>مهر و امضای شرکت</p>
                <p>تاریخ تأیید</p>
              </div>
            </section>

            <footer className="admin-invoice-footer">
              <div>{printSettings.companyAddress || '—'}</div>

              <div>
                تلفن: {printSettings.companyPhone || '—'}
                {' | '}
                وب‌سایت: {printSettings.companyWebsite || '—'}
              </div>

              <div>این سند به‌صورت سیستمی تولید شده است.</div>
            </footer>
          </div>
        </div>
      ) : null}

      {showPrintPreview ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm no-print">
          <section
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تنظیم و چاپ گزارش فروش نمایندگان"
            className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 md:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-black text-gray-800 dark:text-white">
                  تنظیم و پیش‌نمایش چاپ گزارش
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  اطلاعات چاپ را تنظیم و پیش‌نمایش را بررسی کنید.
                </p>
              </div>

              <button
                type="button"
                onClick={closePrintPreview}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                aria-label="بستن پیش‌نمایش چاپ"
                title="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    نوع گزارش
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintMode('all');
                        setPrintReport(null);
                        setPrintSettings((currentSettings) => ({
                          ...currentSettings,
                          reportTitle: 'گزارش جامع اعلام فروش نمایندگان',
                          reportDescription:
                            'این گزارش شامل تمام اعلام فروش‌های ثبت‌شده توسط نمایندگان است.',
                          reportNumber: getDefaultReportNumber('all'),
                        }));
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                        printMode === 'all'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      تمام گزارش‌ها
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrintMode('single');
                        setPrintSettings((currentSettings) => ({
                          ...currentSettings,
                          reportTitle: `گزارش اعلام فروش نمایندگی ${
                            printReport?.representativeName || ''
                          }`,
                          reportDescription:
                            'این گزارش شامل اطلاعات و جزئیات یک اعلام فروش ثبت‌شده توسط نمایندگی است.',
                          reportNumber: getDefaultReportNumber(
                            'single',
                            printReport,
                          ),
                        }));
                      }}
                      disabled={!printReport}
                      className={`rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        printMode === 'single'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      یک گزارش
                    </button>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      نام شرکت
                    </label>

                    <input
                      type="text"
                      value={printSettings.companyName}
                      onChange={(event) => {
                        updatePrintSetting(
                          'companyName',
                          event.target.value,
                        );
                      }}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-cyan-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      عنوان گزارش
                    </label>

                    <input
                      type="text"
                      value={printSettings.reportTitle}
                      onChange={(event) => {
                        updatePrintSetting(
                          'reportTitle',
                          event.target.value,
                        );
                      }}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-cyan-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      شماره گزارش
                    </label>

                    <input
                      type="text"
                      value={printSettings.reportNumber}
                      onChange={(event) => {
                        updatePrintSetting(
                          'reportNumber',
                          event.target.value,
                        );
                      }}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-cyan-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      توضیحات
                    </label>

                    <textarea
                      value={printSettings.notes}
                      onChange={(event) => {
                        updatePrintSetting('notes', event.target.value);
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-cyan-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-cyan-700"
                  >
                    <Printer className="h-4 w-4" />
                    چاپ گزارش
                  </button>

                  <button
                    type="button"
                    onClick={closePrintPreview}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-black text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    بستن
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    پیش‌نمایش چاپ
                  </p>

                  <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                      <div className="admin-invoice-page">
                        <header className="admin-invoice-header">
                          <div>
                            <h1 className="admin-company-name">
                              {printSettings.companyName || '—'}
                            </h1>

                            <p className="admin-company-subtitle">
                              {printSettings.companySubtitle || '—'}
                            </p>
                          </div>

                          <div className="admin-company-logo">
                            {(printSettings.companyName || 'ش').slice(0, 1)}
                          </div>
                        </header>

                        <section className="admin-invoice-title-box">
                          <h2 className="admin-invoice-title">
                            {printSettings.reportTitle || 'گزارش اعلام فروش'}
                          </h2>

                          <p className="admin-invoice-description">
                            {printSettings.reportDescription || '—'}
                          </p>
                        </section>

                        <section className="admin-invoice-info-grid">
                          <div className="admin-invoice-info-card">
                            <span className="admin-invoice-label">شماره گزارش</span>

                            <span className="admin-invoice-value">
                              {printSettings.reportNumber || '—'}
                            </span>
                          </div>

                          <div className="admin-invoice-info-card">
                            <span className="admin-invoice-label">تاریخ چاپ</span>

                            <span className="admin-invoice-value">
                              {formatPrintDate()}
                            </span>
                          </div>

                          <div className="admin-invoice-info-card">
                            <span className="admin-invoice-label">ساعت چاپ</span>

                            <span className="admin-invoice-value">
                              {formatPrintTime()}
                            </span>
                          </div>

                          <div className="admin-invoice-info-card">
                            <span className="admin-invoice-label">نوع گزارش</span>

                            <span className="admin-invoice-value">
                              {printMode === 'all'
                                ? 'تمام اعلام فروش نمایندگان'
                                : 'اعلام فروش یک نمایندگی'}
                            </span>
                          </div>
                        </section>

                        <table className="admin-invoice-table">
                          <thead>
                            <tr>
                              <th>ردیف</th>
                              <th>تاریخ ثبت</th>
                              <th>کد نمایندگی</th>
                              <th>نام نمایندگی</th>
                              <th>شهر</th>
                              <th>تعداد اقلام</th>
                              <th>مبلغ کل</th>
                              <th>جزئیات کالاها</th>
                            </tr>
                          </thead>

                          <tbody>
                            {printReports.map((report, index) => {
                              const items = Array.isArray(report.items)
                                ? report.items
                                : [];

                              return (
                                <tr
                                  key={report.id || index}
                                  className="admin-print-row"
                                >
                                  <td>{formatFaNumber(index + 1)}</td>

                                  <td>
                                    {formatPersianDate(
                                      report.saleDate,
                                      report.createdAt,
                                    )}
                                  </td>

                                  <td>{report.representativeCode || '—'}</td>

                                  <td>{report.representativeName || '—'}</td>

                                  <td>{report.representativeCity || '—'}</td>

                                  <td>{formatFaNumber(report.totalItems)} قلم</td>

                                  <td>{formatToman(report.totalAmount)}</td>

                                  <td>
                                    <div>
                                      {items.length > 0 ? (
                                        items.map((item, itemIndex) => (
                                          <p
                                            key={`${report.id}-${
                                              item.productId || itemIndex
                                            }`}
                                            className="admin-details-line"
                                          >
                                            {getProductName(item)}
                                            {' — '}
                                            {formatFaNumber(item.quantity)} قلم
                                            {getItemUnitPrice(item) > 0
                                              ? ` — ${formatToman(
                                                  getItemUnitPrice(item),
                                                )}`
                                              : ''}
                                          </p>
                                        ))
                                      ) : (
                                        <span>جزئیات کالا دریافت نشده است</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          <tfoot>
                            <tr>
                              <td colSpan={5}>جمع کل گزارش</td>
                              <td>{formatFaNumber(printReportsTotalItems)} قلم</td>
                              <td>{formatToman(printReportsTotalAmount)}</td>
                              <td>—</td>
                            </tr>
                          </tfoot>
                        </table>

                        <section className="admin-invoice-summary">
                          <div className="admin-summary-card">
                            <p className="admin-summary-label">
                              تعداد گزارش‌های چاپ‌شده
                            </p>

                            <p className="admin-summary-value">
                              {formatFaNumber(printReports.length)} گزارش
                            </p>
                          </div>

                          <div className="admin-summary-card">
                            <p className="admin-summary-label">
                              تعداد کل اقلام فروخته‌شده
                            </p>

                            <p className="admin-summary-value">
                              {formatFaNumber(printReportsTotalItems)} قلم
                            </p>
                          </div>

                          <div className="admin-summary-card">
                            <p className="admin-summary-label">مبلغ کل فروش</p>

                            <p className="admin-summary-value">
                              {formatToman(printReportsTotalAmount)}
                            </p>
                          </div>
                        </section>

                        <section className="admin-invoice-notes">
                          <p className="admin-notes-title">
                            توضیحات و شرایط گزارش
                          </p>

                          <p>{printSettings.notes || '—'}</p>
                        </section>

                        <section className="admin-signatures">
                          <div className="admin-signature-box">
                            <p>تنظیم‌کننده گزارش</p>
                            <p>{printSettings.preparedBy || 'نام و امضا'}</p>
                          </div>

                          <div className="admin-signature-box">
                            <p>تأیید مسئول فروش</p>
                            <p>{printSettings.salesManager || 'نام و امضا'}</p>
                          </div>

                          <div className="admin-signature-box">
                            <p>مهر و امضای شرکت</p>
                            <p>تاریخ تأیید</p>
                          </div>
                        </section>

                        <footer className="admin-invoice-footer">
                          <div>{printSettings.companyAddress || '—'}</div>

                          <div>
                            تلفن: {printSettings.companyPhone || '—'}
                            {' | '}
                            وب‌سایت: {printSettings.companyWebsite || '—'}
                          </div>

                          <div>این سند به‌صورت سیستمی تولید شده است.</div>
                        </footer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default SalesReportsAdminTable;