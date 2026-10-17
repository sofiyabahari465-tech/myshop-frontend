import React, {
  useRef,
  useState,
} from 'react';

import axios from 'axios';

import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  onUploadSuccess: () => void | Promise<void>;
}

interface UploadError {
  row?: number;
  rowNumber?: number;
  productName?: string;
  name?: string;
  error?: string;
  message?: string;
  reason?: string;
}

interface CreatedProduct {
  row?: number;
  rowNumber?: number;
  id?: string;
  name?: string;
  price?: number;
  category?: string;
}

interface UpdatedProduct {
  row?: number;
  rowNumber?: number;
  id?: string;
  name?: string;
  oldPrice?: number;
  newPrice?: number;
  oldCategory?: string;
  newCategory?: string;
}

interface UnchangedProduct {
  row?: number;
  rowNumber?: number;
  id?: string;
  name?: string;
  price?: number;
  category?: string;
}

interface SkippedRow {
  row?: number;
  rowNumber?: number;
  productName?: string;
  name?: string;
  reason?: string;
  message?: string;
}

interface UploadResult {
  fileName?: string;
  sheetName?: string;
  totalRows?: number;
  totalProducts?: number;
  createdCount?: number;
  updatedCount?: number;
  unchangedCount?: number;
  zeroPriceCount?: number;
  skippedCount?: number;
  createdProducts?: CreatedProduct[];
  updatedProducts?: UpdatedProduct[];
  unchangedProducts?: UnchangedProduct[];
  skippedRows?: SkippedRow[];
  errors?: UploadError[];
}

interface UploadResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: UploadResult;
}

const DEFAULT_API_URL =
  'http://localhost:5000/api';

const normalizeApiUrl = (
  value: string,
): string => {
  const cleanValue = String(value || '')
    .trim()
    .replace(/\/+$/, '');

  if (!cleanValue) {
    return DEFAULT_API_URL;
  }

  return cleanValue.endsWith('/api')
    ? cleanValue
    : `${cleanValue}/api`;
};

const API_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL ||
    DEFAULT_API_URL,
);

const getStoredToken = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const directKeys = [
    'token',
    'accessToken',
    'authToken',
    'adminToken',
    'jwt',
    'access_token',
  ];

  const objectKeys = [
    'authUser',
    'user',
    'currentUser',
    'auth',
    'admin',
    'session',
  ];

  const storages: Storage[] = [];

  if (window.sessionStorage) {
    storages.push(window.sessionStorage);
  }

  if (window.localStorage) {
    storages.push(window.localStorage);
  }

  for (const storage of storages) {
    for (const key of directKeys) {
      const raw = storage.getItem(key);

      if (
        raw &&
        raw !== 'null' &&
        raw !== 'undefined'
      ) {
        return raw
          .replace(/^Bearer\s+/i, '')
          .trim();
      }
    }

    for (const key of objectKeys) {
      const raw = storage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);

        const token =
          parsed?.token ||
          parsed?.accessToken ||
          parsed?.authToken ||
          parsed?.access_token ||
          parsed?.data?.token;

        if (token) {
          return String(token)
            .replace(/^Bearer\s+/i, '')
            .trim();
        }
      } catch {
        continue;
      }
    }
  }

  return '';
};

const toSafeNumber = (
  value: unknown,
): number => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
};

const toFaNumber = (
  value: unknown,
): string => {
  return toSafeNumber(value).toLocaleString(
    'fa-IR',
  );
};

const isExcelFile = (
  file: File,
): boolean => {
  const fileName = String(
    file?.name || '',
  ).toLowerCase();

  return (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  );
};

const getItemRow = (
  item: UploadError | SkippedRow,
): string => {
  return String(
    item.row ??
      item.rowNumber ??
      'نامشخص',
  );
};

const getItemError = (
  item: UploadError | SkippedRow,
): string => {
  if ('reason' in item && item.reason) {
    return item.reason;
  }

  if ('error' in item && item.error) {
    return item.error;
  }

  if ('message' in item && item.message) {
    return item.message;
  }

  return 'خطای نامشخص';
};

const getItemName = (
  item:
    | UploadError
    | SkippedRow
    | CreatedProduct
    | UpdatedProduct
    | UnchangedProduct,
): string => {
  if ('name' in item && item.name) {
    return item.name;
  }

  if (
    'productName' in item &&
    item.productName
  ) {
    return item.productName;
  }

  return 'بدون نام';
};

const getItemRowFromProduct = (
  item:
    | CreatedProduct
    | UpdatedProduct
    | UnchangedProduct,
): string => {
  return String(
    item.row ??
      item.rowNumber ??
      'نامشخص',
  );
};

const createUploadMessage = (
  selectedFileName: string,
  result: UploadResult,
  success: boolean,
  serverMessage?: string,
): string => {
  const createdCount =
    toSafeNumber(result.createdCount);

  const updatedCount =
    toSafeNumber(result.updatedCount);

  const unchangedCount =
    toSafeNumber(result.unchangedCount);

  const zeroPriceCount =
    toSafeNumber(result.zeroPriceCount);

  const skippedCount =
    toSafeNumber(result.skippedCount);

  const totalRows =
    toSafeNumber(result.totalRows);

  const totalProducts =
    toSafeNumber(result.totalProducts);

  const hasSkippedRows =
    skippedCount > 0;

  const hasUnchangedRows =
    unchangedCount > 0;

  const firstLine = !success
    ? '⚠️ فایل پردازش شد، اما تغییری ذخیره نشد'
    : hasSkippedRows
      ? '⚠️ فایل ذخیره شد، اما بعضی ردیف‌ها ثبت نشدند'
      : hasUnchangedRows
        ? '✅ فایل ذخیره شد؛ بعضی محصولات از قبل وجود داشتند'
        : '✅ فایل Excel با موفقیت ذخیره شد';

  const lines = [
    firstLine,
    '',
    `📄 نام فایل: ${selectedFileName}`,
    `📊 تعداد ردیف‌ها: ${toFaNumber(totalRows)}`,
    `➕ محصول جدید: ${toFaNumber(createdCount)}`,
    `🔄 محصول به‌روزشده: ${toFaNumber(updatedCount)}`,
    `⏭️ بدون تغییر: ${toFaNumber(unchangedCount)}`,
    `⚠️ قیمت صفر: ${toFaNumber(zeroPriceCount)}`,
    `❌ ثبت‌نشده: ${toFaNumber(skippedCount)}`,
    `📦 کل محصولات: ${toFaNumber(totalProducts)}`,
  ];

  if (
    serverMessage &&
    !success
  ) {
    lines.push('');
    lines.push(serverMessage);
  }

  if (
    result.createdProducts &&
    result.createdProducts.length > 0
  ) {
    lines.push('');
    lines.push(
      `محصولات اضافه‌شده (${toFaNumber(
        result.createdProducts.length,
      )} مورد):`,
    );

    result.createdProducts.forEach((item) => {
      lines.push(
        `• ردیف ${getItemRowFromProduct(item)}: ${
          getItemName(item)
        } — ${toFaNumber(item.price)} تومان`,
      );
    });
  }

  if (
    result.updatedProducts &&
    result.updatedProducts.length > 0
  ) {
    lines.push('');
    lines.push(
      `محصولات به‌روزشده (${toFaNumber(
        result.updatedProducts.length,
      )} مورد):`,
    );

    result.updatedProducts.forEach((item) => {
      lines.push(
        `• ردیف ${getItemRowFromProduct(item)}: ${
          getItemName(item)
        } — قیمت جدید: ${toFaNumber(
          item.newPrice,
        )} تومان`,
      );
    });
  }

  if (
    result.unchangedProducts &&
    result.unchangedProducts.length > 0
  ) {
    lines.push('');
    lines.push(
      `محصولات بدون تغییر (${toFaNumber(
        result.unchangedProducts.length,
      )} مورد):`,
    );

    result.unchangedProducts.forEach((item) => {
      lines.push(
        `• ردیف ${getItemRowFromProduct(item)}: ${
          getItemName(item)
        } — ${toFaNumber(item.price)} تومان`,
      );
    });
  }

  const errors: Array<
    UploadError | SkippedRow
  > = [
    ...(result.errors || []),
    ...(result.skippedRows || []),
  ];

  if (errors.length > 0) {
    lines.push('');
    lines.push(
      `جزئیات ردیف‌های ثبت‌نشده (${toFaNumber(
        errors.length,
      )} مورد):`,
    );

    errors.forEach((item) => {
      lines.push(
        `• ردیف ${getItemRow(item)}: ${getItemError(
          item,
        )}`,
      );
    });
  }

  return lines.join('\n');
};

const ExcelUpload: React.FC<Props> = ({
  onUploadSuccess,
}) => {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const openFilePicker = () => {
    if (uploading) {
      window.alert(
        '⏳ لطفاً صبر کنید؛ فایل قبلی هنوز در حال پردازش است.',
      );

      return;
    }

    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const uploadFile = async (file: File) => {
    if (!isExcelFile(file)) {
      const errorText =
        'فقط فایل Excel با فرمت .xlsx یا .xls مجاز است.';

      window.alert(
        `❌ خطا\n\n${errorText}`,
      );

      setMessage({
        type: 'error',
        text: errorText,
      });

      return;
    }

    if (uploading) {
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();

      formData.append('file', file);

      const token = getStoredToken();

      const headers: Record<
        string,
        string
      > = {
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await axios.post<UploadResponse>(
          `${API_URL}/products/upload`,
          formData,
          {
            withCredentials: true,
            headers,
            timeout: 120000,
          },
        );

      const result =
        response.data;

      const uploadResult =
        result.data || {};

      if (!result.success) {
        const errorMessage =
          createUploadMessage(
            file.name,
            uploadResult,
            false,
            result.error ||
              result.message,
          );

        window.alert(errorMessage);

        setMessage({
          type: 'error',
          text: errorMessage,
        });

        return;
      }

      const successMessage =
        createUploadMessage(
          file.name,
          uploadResult,
          true,
          result.message,
        );

      window.alert(successMessage);

      setMessage({
        type: 'success',
        text: successMessage,
      });

      try {
        await onUploadSuccess();
      } catch (refreshError) {
        console.error(
          'آپلود موفق بود، اما لیست تازه نشد:',
          refreshError,
        );

        setMessage({
          type: 'success',
          text:
            `${successMessage}\n\n` +
            '⚠️ فایل ذخیره شد، اما لیست صفحه تازه نشد.',
        });
      }
    } catch (error: unknown) {
      console.error(
        '❌ خطا در آپلود Excel:',
        error,
      );

      let errorText =
        'هنگام آپلود فایل خطای غیرمنتظره‌ای رخ داد.';

      if (
        axios.isAxiosError<UploadResponse>(
          error,
        )
      ) {
        const status =
          error.response?.status;

        const serverData =
          error.response?.data;

        if (serverData?.data) {
          errorText =
            createUploadMessage(
              file.name,
              serverData.data,
              false,
              serverData.error ||
                serverData.message,
            );
        } else {
          errorText =
            serverData?.error ||
            serverData?.message ||
            error.message ||
            errorText;
        }

        if (status === 401) {
          errorText =
            'جلسه ورود شما منقضی شده است؛ دوباره وارد شوید.';
        }

        if (status === 403) {
          errorText =
            'این حساب اجازه آپلود لیست قیمت را ندارد.';
        }

        if (status === 413) {
          errorText =
            'حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.';
        }

        if (!error.response) {
          errorText =
            'ارتباط با سرور برقرار نشد.';
        }
      } else if (
        error instanceof Error
      ) {
        errorText = error.message;
      }

      window.alert(
        `❌ خطا در آپلود Excel\n\n${errorText}`,
      );

      setMessage({
        type: 'error',
        text: errorText,
      });
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile =
      event.currentTarget.files?.[0];

    event.currentTarget.value = '';

    if (selectedFile) {
      void uploadFile(selectedFile);
    }
  };

  const handleDrag = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.type === 'dragenter' ||
      event.type === 'dragover'
    ) {
      setDragActive(true);
      return;
    }

    if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    if (uploading) {
      return;
    }

    const selectedFile =
      event.dataTransfer.files?.[0];

    if (selectedFile) {
      void uploadFile(selectedFile);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900 md:p-8">
      <div className="mb-6 text-center">
        <h2 className="mb-2 flex items-center justify-center gap-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
          <UploadCloud className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          آپلود هوشمند لیست قیمت
        </h2>

        <p className="text-gray-500 dark:text-gray-400">
          فایل Excel شامل عنوان محصول، قیمت محصول و دسته‌بندی
        </p>
      </div>

      <div
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all md:p-12 ${
          dragActive
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mb-4 flex justify-center text-purple-500 dark:text-purple-400">
          <FileSpreadsheet className="h-16 w-16" />
        </div>

        <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
          فایل Excel را اینجا بکشید و رها کنید
        </p>

        <p className="mb-4 text-sm text-gray-500">
          یا
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all ${
            uploading
              ? 'cursor-not-allowed bg-gray-400'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              در حال پردازش...
            </>
          ) : (
            <>
              <UploadCloud className="h-5 w-5" />
              انتخاب فایل Excel
            </>
          )}
        </button>

        {uploading ? (
          <div className="mt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              در حال ثبت محصولات و به‌روزرسانی لیست قیمت...
            </p>
          </div>
        ) : null}
      </div>

      {message ? (
        <div
          className={`mt-6 flex gap-3 rounded-xl border p-4 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          )}

          <p
            className={`whitespace-pre-line text-sm font-bold leading-7 ${
              message.type === 'success'
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
            }`}
          >
            {message.text}
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            قالب فایل Excel
          </p>

          <p className="mt-1 text-xs leading-6 text-blue-600 dark:text-blue-400">
            ستون‌های فایل باید شامل{' '}
            <strong>عنوان محصول</strong>،{' '}
            <strong>قیمت محصول</strong> و{' '}
            <strong>دسته‌بندی</strong>{' '}
            باشند. محصول بدون قیمت با قیمت صفر ثبت می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExcelUpload;