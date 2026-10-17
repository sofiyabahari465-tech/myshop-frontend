import axios from 'axios';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileText,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  UserRound,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type { ReturnRequest } from '../types';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type RequestStatus =
  | 'pending'
  | 'registered'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'received';

interface ApiResponse {
  success?: boolean;
  count?: number;
  message?: string;
  error?: string;
  data?: ReturnRequest[];
}

interface UpdateApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: ReturnRequest;
}

type ReturnRequestWithAdminNote = ReturnRequest & {
  adminNote?: string | null;
  productBrand?: string | null;
  productCategory?: string | null;
};

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
  const normalized = toEnglishDigits(value).replace(
    /[^\d.-]/g,
    '',
  );

  const result = Number(normalized);

  return Number.isFinite(result) ? result : 0;
};

const toPersianNumber = (value: unknown) => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getStatusDetails = (status: unknown) => {
  const normalizedStatus = String(status || 'pending')
    .trim()
    .toLowerCase() as RequestStatus;

  if (normalizedStatus === 'approved') {
    return {
      label: 'تأیید شده',
      wrapperClass:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
      Icon: CheckCircle2,
    };
  }

  if (normalizedStatus === 'rejected') {
    return {
      label: 'رد شده',
      wrapperClass:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300',
      Icon: XCircle,
    };
  }

  if (normalizedStatus === 'received') {
    return {
      label: 'دریافت شده',
      wrapperClass:
        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
      Icon: CheckCircle2,
    };
  }

  if (normalizedStatus === 'reviewing') {
    return {
      label: 'در حال بررسی',
      wrapperClass:
        'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-500/10 dark:text-violet-300',
      Icon: Clock3,
    };
  }

  return {
    label: 'در انتظار بررسی',
    wrapperClass:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    Icon: Clock3,
  };
};

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

const getAuthToken = () => {
  return (
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    ''
  );
};

const escapeHtml = (value: unknown) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const ReturnRequests: React.FC = () => {
  const [returnRequests, setReturnRequests] = useState<
    ReturnRequest[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [submittingId, setSubmittingId] = useState<string | null>(
    null,
  );

  const [rejectingRequest, setRejectingRequest] =
    useState<ReturnRequest | null>(null);

  const [rejectNote, setRejectNote] = useState('');

  const loadReturnRequests = useCallback(async () => {
    const token = getAuthToken();

    if (!token) {
      setErrorMessage(
        'توکن ورود پیدا نشد. لطفاً دوباره وارد حساب شوید.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await axios.get<ApiResponse>(
        `${API_URL}/admin/return-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const requests = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setReturnRequests(requests);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'خطا در دریافت درخواست‌های مرجوعی.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReturnRequests();
  }, [loadReturnRequests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLocaleLowerCase('fa-IR');

    if (!normalizedSearch) {
      return returnRequests;
    }

    return returnRequests.filter((request) => {
      const searchableValues = [
        request.id,
        request.title,
        request.productName,
        request.representativeName,
        request.representativeCode,
        request.returnDate,
        request.status,
      ];

      return searchableValues.some((value) => {
        return String(value ?? '')
          .toLocaleLowerCase('fa-IR')
          .includes(normalizedSearch);
      });
    });
  }, [returnRequests, searchTerm]);

  const pendingCount = returnRequests.filter((request) => {
    const status = String(request.status || '').toLowerCase();

    return (
      status === 'pending' ||
      status === 'registered' ||
      status === 'reviewing'
    );
  }).length;

  const approvedCount = returnRequests.filter((request) => {
    const status = String(request.status || '').toLowerCase();

    return status === 'approved' || status === 'received';
  }).length;

  const rejectedCount = returnRequests.filter((request) => {
    return String(request.status || '').toLowerCase() === 'rejected';
  }).length;

  const updateRequestInList = (updatedRequest: ReturnRequest) => {
    setReturnRequests((currentRequests) => {
      return currentRequests.map((currentRequest) => {
        return String(currentRequest.id) === String(updatedRequest.id)
          ? updatedRequest
          : currentRequest;
      });
    });
  };

  const approveRequest = async (request: ReturnRequest) => {
    const token = getAuthToken();

    if (!token) {
      alert('توکن ورود پیدا نشد. لطفاً دوباره وارد حساب شوید.');
      return;
    }

    const productTitle =
      request.productName || request.title || 'بدون عنوان';

    const confirmed = window.confirm(
      `آیا درخواست مرجوعی «${productTitle}» از نماینده «${request.representativeName || 'نامشخص'}» تأیید شود؟`,
    );

    if (!confirmed) {
      return;
    }

    setSubmittingId(String(request.id));

    try {
      const response = await axios.patch<UpdateApiResponse>(
        `${API_URL}/admin/return-requests/${request.id}/status`,
        {
          status: 'approved',
          adminNote: 'درخواست مرجوعی توسط ادمین تأیید شد.',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data?.data) {
        updateRequestInList(response.data.data);
      } else {
        await loadReturnRequests();
      }

      alert(
        response.data?.message ||
          'درخواست مرجوعی با موفقیت تأیید شد.',
      );
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'خطا در تأیید درخواست مرجوعی.',
        ),
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const openRejectModal = (request: ReturnRequest) => {
    setRejectingRequest(request);
    setRejectNote('');
  };

  const closeRejectModal = () => {
    if (submittingId) {
      return;
    }

    setRejectingRequest(null);
    setRejectNote('');
  };

  /*
   * چاپ در پنجره مستقل:
   * به همین دلیل منو، سایدبار، هدر و هیچ‌کدام از اجزای سایت
   * وارد پرینت نمی‌شوند.
   */
  const openPrintView = (request: ReturnRequest) => {
    const printWindow = window.open(
      '',
      '_blank',
      'width=900,height=700',
    );

    if (!printWindow) {
      alert(
        'پنجرهٔ چاپ باز نشد. لطفاً اجازهٔ باز شدن پنجره‌های جدید (Pop-up) را در مرورگر فعال کنید.',
      );
      return;
    }

    const printableRequest =
      request as ReturnRequestWithAdminNote;

    const unitPrice = toNumber(
      request.unitPrice ?? request.price ?? 0,
    );

    const quantity = toNumber(request.quantity || 1);
    const totalPrice = unitPrice * quantity;

    const statusLabel = getStatusDetails(
      request.status,
    ).label;

    const productTitle =
      request.productName || request.title || '—';

    const brand =
      printableRequest.productBrand ||
      request.brand ||
      '—';

    const category =
      printableRequest.productCategory ||
      request.category ||
      '—';

    const adminNote = printableRequest.adminNote || '';

    printWindow.document.open();

    printWindow.document.write(`
      <!doctype html>
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>
            برگه مرجوعی - ${escapeHtml(request.id)}
          </title>

          <style>
            @page {
              size: A4;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              font-family: Tahoma, Arial, sans-serif;
              direction: rtl;
            }

            body {
              padding: 8px;
            }

            .sheet {
              width: 100%;
              max-width: 180mm;
              margin: 0 auto;
            }

            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }

            .title {
              margin: 0;
              font-size: 23px;
              font-weight: 900;
            }

            .subtitle {
              margin-top: 7px;
              color: #4b5563;
              font-size: 12px;
              line-height: 1.9;
            }

            .header-details {
              text-align: left;
              color: #374151;
              font-size: 12px;
              line-height: 2;
            }

            .status {
              display: inline-block;
              border: 1px solid #6b7280;
              border-radius: 999px;
              padding: 1px 10px;
              font-size: 11px;
              font-weight: 700;
            }

            .section {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 15px;
              margin-bottom: 16px;
              page-break-inside: avoid;
            }

            .section-title {
              margin: 0 0 12px;
              font-size: 16px;
              font-weight: 900;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 26px;
              font-size: 13px;
              line-height: 2;
            }

            .full {
              grid-column: 1 / -1;
            }

            .label {
              font-weight: 700;
            }

            .reason {
              white-space: pre-wrap;
              font-size: 13px;
              line-height: 2;
            }

            .footer {
              border-top: 1px solid #d1d5db;
              margin-top: 26px;
              padding-top: 12px;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
              line-height: 2;
            }

            @media print {
              html,
              body {
                width: 100%;
                height: auto;
              }

              body {
                padding: 0;
              }

              .sheet {
                max-width: none;
              }
            }
          </style>
        </head>

        <body>
          <main class="sheet">
            <header class="header">
              <div>
                <h1 class="title">برگه درخواست مرجوعی</h1>

                <div class="subtitle">
                  شماره درخواست:
                  ${escapeHtml(request.id || '—')}
                </div>
              </div>

              <div class="header-details">
                <div>
                  تاریخ ثبت:
                  ${escapeHtml(formatDateTime(request.createdAt))}
                </div>

                <div>
                  وضعیت:
                  <span class="status">
                    ${escapeHtml(statusLabel)}
                  </span>
                </div>
              </div>
            </header>

            <section class="section">
              <h2 class="section-title">اطلاعات نماینده</h2>

              <div class="grid">
                <div>
                  <span class="label">نام نماینده:</span>
                  ${escapeHtml(
                    request.representativeName || '—',
                  )}
                </div>

                <div>
                  <span class="label">کد نمایندگی:</span>
                  ${escapeHtml(
                    request.representativeCode || '—',
                  )}
                </div>

                <div class="full">
                  <span class="label">شهر:</span>
                  ${escapeHtml(
                    request.representativeCity || '—',
                  )}
                </div>
              </div>
            </section>

            <section class="section">
              <h2 class="section-title">
                اطلاعات کالای مرجوعی
              </h2>

              <div class="grid">
                <div class="full">
                  <span class="label">عنوان کالا:</span>
                  ${escapeHtml(productTitle)}
                </div>

                <div>
                  <span class="label">برند:</span>
                  ${escapeHtml(brand)}
                </div>

                <div>
                  <span class="label">دسته‌بندی:</span>
                  ${escapeHtml(category)}
                </div>

                <div>
                  <span class="label">تعداد مرجوعی:</span>
                  ${toPersianNumber(quantity)} قلم
                </div>

                <div>
                  
                  ${toPersianNumber(unitPrice)} تومان
                </div>

                <div>
                  <span class="label">جمع کل:</span>
                  ${toPersianNumber(totalPrice)} تومان
                </div>

                <div>
                  <span class="label">تاریخ مرجوعی:</span>
                  ${escapeHtml(request.returnDate || '—')}
                </div>
              </div>
            </section>

            ${
              request.reason
                ? `
                  <section class="section">
                    <h2 class="section-title">دلیل مرجوعی</h2>

                    <div class="reason">
                      ${escapeHtml(request.reason)}
                    </div>
                  </section>
                `
                : ''
            }

            ${
              adminNote
                ? `
                  <section class="section">
                    <h2 class="section-title">توضیح ادمین</h2>

                    <div class="reason">
                      ${escapeHtml(adminNote)}
                    </div>
                  </section>
                `
                : ''
            }

            <footer class="footer">
              <div>
                این برگه به‌صورت خودکار توسط سامانه تولید شده است.
              </div>

              <div>
                تاریخ چاپ:
                ${escapeHtml(
                  formatDateTime(
                    new Date().toISOString(),
                  ),
                )}
              </div>
            </footer>
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();

      window.setTimeout(() => {
        printWindow.print();
      }, 300);

      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  const rejectRequest = async () => {
    const token = getAuthToken();

    if (!rejectingRequest || !token) {
      return;
    }

    const adminNote = rejectNote.trim();

    if (!adminNote) {
      alert('لطفاً دلیل رد درخواست را وارد کنید.');
      return;
    }

    setSubmittingId(String(rejectingRequest.id));

    try {
      const response = await axios.patch<UpdateApiResponse>(
        `${API_URL}/admin/return-requests/${rejectingRequest.id}/status`,
        {
          status: 'rejected',
          adminNote,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data?.data) {
        updateRequestInList(response.data.data);
      } else {
        await loadReturnRequests();
      }

      setRejectingRequest(null);
      setRejectNote('');

      alert(
        response.data?.message || 'درخواست مرجوعی رد شد.',
      );
    } catch (error) {
      alert(
        getErrorMessage(
          error,
          'خطا در رد درخواست مرجوعی.',
        ),
      );
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[400px] items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-900"
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-11 w-11 animate-spin text-cyan-600 dark:text-cyan-400" />

          <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
            در حال دریافت درخواست‌های مرجوعی...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-red-900/20"
      >
        <CircleAlert className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />

        <h2 className="mt-4 text-lg font-black text-red-700 dark:text-red-300">
          خطا در دریافت اطلاعات
        </h2>

        <p className="mt-2 text-sm leading-7 text-red-600 dark:text-red-400">
          {errorMessage}
        </p>

        <div className="mt-5 rounded-xl border border-red-200/70 bg-white/60 p-3 text-right text-xs leading-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          آدرس مورد انتظار API:
          <span dir="ltr" className="mr-1 font-bold">
            {API_URL}/admin/return-requests
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadReturnRequests();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-amber-900/40 dark:bg-gray-900">
          <div className="absolute -left-5 -top-5 h-20 w-20 rounded-full bg-amber-100/70 blur-2xl dark:bg-amber-500/10" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                در انتظار بررسی
              </p>

              <p className="mt-3 text-3xl font-black text-amber-600 dark:text-amber-400">
                {toPersianNumber(pendingCount)}
              </p>

              <p className="mt-2 text-xs font-bold text-amber-500 dark:text-amber-300">
                درخواست نیازمند تصمیم ادمین
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-400">
              <Clock3 className="h-6 w-6" />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-emerald-900/40 dark:bg-gray-900">
          <div className="absolute -left-5 -top-5 h-20 w-20 rounded-full bg-emerald-100/70 blur-2xl dark:bg-emerald-500/10" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                تأیید شده
              </p>

              <p className="mt-3 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {toPersianNumber(approvedCount)}
              </p>

              <p className="mt-2 text-xs font-bold text-emerald-500 dark:text-emerald-300">
                درخواست‌های پذیرفته‌شده
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-red-900/40 dark:bg-gray-900">
          <div className="absolute -left-5 -top-5 h-20 w-20 rounded-full bg-red-100/70 blur-2xl dark:bg-red-900/10" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                رد شده
              </p>

              <p className="mt-3 text-3xl font-black text-red-600 dark:text-red-400">
                {toPersianNumber(rejectedCount)}
              </p>

              <p className="mt-2 text-xs font-bold text-red-500 dark:text-red-300">
                درخواست‌های ردشده
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700 shadow-sm dark:bg-red-500/15 dark:text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 bg-gradient-to-l from-cyan-50/70 via-white to-purple-50/70 p-5 dark:border-gray-700 dark:from-cyan-950/20 dark:via-gray-900 dark:to-purple-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                <ClipboardCheck className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">
                  درخواست‌های مرجوعی
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  بررسی، تأیید یا رد درخواست‌های ثبت‌شده توسط نمایندگان
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadReturnRequests();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 shadow-sm transition-all hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-cyan-500 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
            >
              <RefreshCw className="h-4 w-4" />
              بروزرسانی
            </button>
          </div>

          <label className="relative mt-5 block">
            <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              placeholder="جست‌وجو بر اساس نام نماینده، کد، عنوان، وضعیت یا تاریخ..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pr-12 pl-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </label>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <ClipboardCheck className="h-8 w-8" />
            </div>

            <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
              درخواستی برای نمایش وجود ندارد.
            </p>

            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              اگر درخواست مرجوعی ثبت شده است، دکمه بروزرسانی را بزنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:p-5">
            {filteredRequests.map((request) => {
              const requestId = String(request.id);
              const isSubmitting = submittingId === requestId;

              const status = String(
                request.status || 'pending',
              ).toLowerCase();

              const requestIsPending =
                status === 'pending' ||
                status === 'registered' ||
                status === 'reviewing';

              const statusDetails = getStatusDetails(
                request.status,
              );

              const StatusIcon = statusDetails.Icon;

              const requestWithAdminNote =
                request as ReturnRequestWithAdminNote;

              const adminNote =
                requestWithAdminNote.adminNote || '';

              const unitPrice =
                request.unitPrice || request.price || 0;

              return (
                <article
                  key={requestId}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-cyan-700"
                >
                  <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-l from-cyan-500 via-blue-500 to-purple-500 opacity-70" />

                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-purple-500/20">
                          <UserRound className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black text-gray-800 dark:text-white">
                            {request.representativeName || '—'}
                          </p>

                          <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                            کد نمایندگی:{' '}
                            {request.representativeCode || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusDetails.wrapperClass}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusDetails.label}
                        </span>

                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                          ثبت: {formatDateTime(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400">
                        <PackageSearch className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        عنوان کالای مرجوعی
                      </div>

                      <p className="mt-2 text-base font-black text-gray-800 dark:text-white">
                        {request.productName ||
                          request.title ||
                          'بدون عنوان'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-900/15">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          <Wallet className="h-4 w-4" />
                          قیمت واحد
                        </div>

                        <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-400">
                          {toPersianNumber(unitPrice)} تومان
                        </p>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/40 dark:bg-blue-900/15">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                          <PackageSearch className="h-4 w-4" />
                          تعداد
                        </div>

                        <p className="mt-2 text-lg font-black text-blue-700 dark:text-blue-400">
                          {toPersianNumber(request.quantity)} قلم
                        </p>
                      </div>

                      <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3.5 dark:border-purple-900/40 dark:bg-purple-900/15">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                          <CalendarDays className="h-4 w-4" />
                          تاریخ مرجوعی
                        </div>

                        <p className="mt-2 text-lg font-black text-purple-700 dark:text-purple-400">
                          {request.returnDate || '—'}
                        </p>
                      </div>
                    </div>

                    {adminNote ? (
                      <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                        <div className="flex items-center gap-2 text-xs font-black text-violet-700 dark:text-violet-300">
                          <FileText className="h-4 w-4" />
                          توضیح ادمین
                        </div>

                        <p className="mt-2 text-sm leading-7 text-violet-900 dark:text-violet-200">
                          {adminNote}
                        </p>
                      </div>
                    ) : null}

                    <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                      {requestIsPending ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              void approveRequest(request);
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Check className="h-5 w-5" />
                            )}

                            تأیید درخواست
                          </button>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              openRejectModal(request);
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X className="h-5 w-5" />
                            رد درخواست
                          </button>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              openPrintView(request);
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FileText className="h-5 w-5" />
                            چاپ / پرینت
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div
                            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black ${statusDetails.wrapperClass}`}
                          >
                            <StatusIcon className="h-5 w-5" />
                            وضعیت: {statusDetails.label}
                          </div>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              openPrintView(request);
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FileText className="h-5 w-5" />
                            چاپ / پرینت
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {rejectingRequest ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            dir="rtl"
            className="w-full max-w-lg rounded-3xl border border-white/30 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  <XCircle className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white">
                    رد درخواست مرجوعی
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    دلیل رد درخواست «
                    {rejectingRequest.productName ||
                      rejectingRequest.title ||
                      'بدون عنوان'}
                    » را وارد کنید. این توضیح برای نماینده نمایش داده می‌شود.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                disabled={Boolean(submittingId)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-gray-800"
                title="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <textarea
              value={rejectNote}
              onChange={(event) => {
                setRejectNote(event.target.value);
              }}
              rows={5}
              placeholder="مثال: لطفاً کالا را همراه فاکتور و تصاویر خسارت ارسال کنید."
              className="mt-5 w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={
                  submittingId ===
                  String(rejectingRequest.id)
                }
                onClick={() => {
                  void rejectRequest();
                }}
                className="min-h-11 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingId === String(rejectingRequest.id)
                  ? 'در حال ثبت...'
                  : 'ثبت رد درخواست'}
              </button>

              <button
                type="button"
                disabled={Boolean(submittingId)}
                onClick={closeRejectModal}
                className="min-h-11 rounded-xl bg-gray-100 px-4 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReturnRequests;