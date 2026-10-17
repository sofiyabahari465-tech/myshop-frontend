import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowDown,
  Banknote,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  Package,
  PackageX,
  RefreshCw,
  Search,
  Store,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import * as XLSX from 'xlsx';

import type {
  Representative,
  RepresentativeWarehouseData,
  RepresentativeWarehouseItem,
  RepresentativeWarehouseMovement,
} from '../types';

interface Props {
  representative: Representative;
  apiUrl: string;
  products?: unknown[];
  onBack: () => void;
  onWarehouseChanged: () => void | Promise<void>;
  onProductsChanged?: () => void;
}

interface ApiResponse<T> {
  success: boolean;
  code?: string;
  error?: string;
  message?: string;
  warning?: string;
  data?: T;
}

interface PreviewItem {
  rowIndex: number;
  excelName: string;
  brand: string;
  category: string;
  qty: number;
  price: number;
  unitPrice?: number;
  status:
    | 'ready'
    | 'empty_name'
    | 'invalid_qty'
    | 'invalid_price';
}

interface ImportRowResult {
  rowIndex?: number | string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  previouslyAcceptedQuantity?: number;
  acceptedNowQuantity?: number;
  acceptedQuantity?: number;
  remainingQuantity?: number;
  rejectedQuantity?: number;
  status?: string;
  reason?: string;
}

// ===== تابع کمکی برای هدر احراز هویت =====
const buildAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

interface ImportResult {
  importedCount?: number;
  acceptedRowsCount?: number;
  acceptedQuantity?: number;
  rejectedRowsCount?: number;
  rejectedQuantity?: number;
  importedAmount?: number;
  completed?: boolean;
  summarySaved?: boolean;
  rowResults?: ImportRowResult[];
  rejectedItems?: ImportRowResult[];
  validationErrors?: {
    rowIndex?: number | string;
    name?: string;
    reason?: string;
  }[];
}

const WAREHOUSE_CATEGORIES = [
  'لنت ترمز خودرو',
  'جلوبندی خودرو',
  'برق خودرو',
  'بدنه خودرو',
  'قطعات موتوری',
  'انواع تسمه',
  'لوازم اسپرت',
  'روغن خودرو',
] as const;

const PRODUCT_COLUMN_NAMES = [
  'عنوان',
  'نام',
  'عنوان',
  'عنوان',
  'کالا',
  'محصول',
  'Name',
  'name',
  'Product',
  'product',
];

const BRAND_COLUMN_NAMES = [
  'برند',
  'نام برند',
  'Brand',
  'brand',
];

const CATEGORY_COLUMN_NAMES = [
  'دسته‌بندی',
  'دسته بندی',
  'دسته',
  'گروه',
  'گروه کالا',
  'Category',
  'category',
];

const QUANTITY_COLUMN_NAMES = [
  'تعداد',
  'تعداد کالا',
  'تعداد موجودی',
  'تعداد محصول',
  'تعداد اقلام',
  'موجودی',
  'موجودی کالا',
  'موجودی انبار',
  'مقدار',
  'تعداد/موجودی',
  'Qty',
  'QTY',
  'quantity',
  'Quantity',
  'stock',
  'Stock',
  'count',
  'Count',
];

const PRICE_COLUMN_NAMES = [
  'قیمت',
  'قیمت',
  'قیمت کالا',
  'قیمت محصول',
  'مبلغ',
  'قیمت',
  'Price',
  'price',
  'unitPrice',
  'Unit Price',
];

const normalizeDigits = (value: unknown): string => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );
};

const normalizeText = (value: unknown): string => {
  return normalizeDigits(value)
    .replace(/\u200c/g, ' ')
    .replace(/[\u200e\u200f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const normalizeExcelHeader = (value: unknown): string => {
  return normalizeText(value)
    .replace(/[/\\|_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getNumber = (value: unknown): number => {
  const normalized = normalizeDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/٫/g, '.')
    .replace(/[^\d.-]/g, '');

  if (!normalized) {
    return 0;
  }

  const result = Number(normalized);

  return Number.isFinite(result) ? result : 0;
};

const formatNumber = (value: unknown): string => {
  return getNumber(value).toLocaleString('fa-IR');
};

const formatDate = (value?: string): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getApiBaseUrl = (apiUrl: string): string => {
  const base = (
    apiUrl ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api'
  ).replace(/\/+$/, '');

  return base.endsWith('/api') ? base : `${base}/api`;
};

const getStoredToken = (): string => {
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

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of directKeys) {
      const raw = storage.getItem(key);

      if (raw && raw !== 'null' && raw !== 'undefined') {
        const token = raw.replace(/^Bearer\s+/i, '').trim();

        if (token) {
          return token;
        }
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
          return String(token).replace(/^Bearer\s+/i, '').trim();
        }
      } catch {
        continue;
      }
    }
  }

  return '';
};

const getAuthHeaders = (
  json = false,
): Record<string, string> => {
  const token = getStoredToken();

  return {
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readApiResponse = async <T,>(
  response: Response,
): Promise<ApiResponse<T>> => {
  const text = await response.text();

  if (!text) {
    throw new Error(
      `پاسخ سرور خالی است. کد: ${response.status}`,
    );
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(
      `پاسخ بک‌اند معتبر نیست. کد: ${response.status}`,
    );
  }
};

const getApiError = <T,>(
  response: Response,
  result: ApiResponse<T>,
  fallback: string,
): string => {
  if (result.error || result.message) {
    return result.error || result.message || fallback;
  }

  if (response.status === 401) {
    return 'ابتدا وارد حساب ادمین شوید.';
  }

  if (response.status === 403) {
    return 'این حساب اجازه انجام این عملیات را ندارد.';
  }

  return `${fallback} کد: ${response.status}`;
};

const getExcelValue = (
  row: Record<string, unknown>,
  names: string[],
): unknown => {
  const normalizedNames = names.map(normalizeExcelHeader);

  for (const [key, value] of Object.entries(row)) {
    if (
      normalizedNames.includes(normalizeExcelHeader(key)) &&
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return '';
};

const hasExcelColumn = (
  rows: Record<string, unknown>[],
  names: string[],
): boolean => {
  const normalizedNames = names.map(normalizeExcelHeader);

  return Object.keys(rows[0] || {}).some((key) =>
    normalizedNames.includes(normalizeExcelHeader(key)),
  );
};

const getItemValue = (
  item: RepresentativeWarehouseItem,
): number => {
  return (
    Math.max(0, getNumber(item.quantity)) *
    Math.max(0, getNumber(item.unitPrice))
  );
};

const getPreviewStatus = (
  status: PreviewItem['status'],
): string => {
  switch (status) {
    case 'ready':
      return 'معتبر';
    case 'empty_name':
      return 'نام خالی';
    case 'invalid_qty':
      return 'تعداد نامعتبر';
    case 'invalid_price':
      return 'قیمت نامعتبر';
  }
};

const RepresentativeWarehouseDashboard: React.FC<Props> = ({
  representative,
  apiUrl,
  onBack,
  onWarehouseChanged,
}) => {
  const [items, setItems] = useState<
    RepresentativeWarehouseItem[]
  >([]);

  const [movements, setMovements] = useState<
    RepresentativeWarehouseMovement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileKey, setUploadedFileKey] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  const [importResult, setImportResult] =
    useState<ImportResult | null>(null);

  const operationRef = useRef(false);
  const fileProcessingRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const mountedRef = useRef(true);

  const warehouseUrl = `${getApiBaseUrl(
    apiUrl,
  )}/representatives/${encodeURIComponent(
    String(representative.id),
  )}/warehouse`;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSequenceRef.current += 1;
    };
  }, []);

  const loadWarehouse = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;

    setLoading(true);

    try {
      const response = await fetch(
        `${warehouseUrl}?_=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: getAuthHeaders(),
        },
      );

      const result =
        await readApiResponse<RepresentativeWarehouseData>(
          response,
        );

      if (!response.ok || !result.success) {
        throw new Error(
          getApiError(
            response,
            result,
            'دریافت انبار ناموفق بود.',
          ),
        );
      }

      if (!Array.isArray(result.data?.items)) {
        throw new Error(
          'لیست کالاهای انبار در پاسخ سرور وجود ندارد.',
        );
      }

      if (
        mountedRef.current &&
        sequence === loadSequenceRef.current
      ) {
        setItems(result.data.items);

        setMovements(
          Array.isArray(result.data.movements)
            ? result.data.movements
            : [],
        );
      }

      return true;
    } catch (error) {
      if (
        mountedRef.current &&
        sequence === loadSequenceRef.current
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'خطا در دریافت انبار.',
        );
      }

      return false;
    } finally {
      if (
        mountedRef.current &&
        sequence === loadSequenceRef.current
      ) {
        setLoading(false);
      }
    }
  }, [warehouseUrl]);

  useEffect(() => {
    setItems([]);
    setMovements([]);
    setMessage('');
    setErrorMessage('');
    setImportResult(null);
    setPreviewItems([]);
    setShowPreview(false);
    setUploadedFileName('');
    setUploadedFileKey('');
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');

    void loadWarehouse();
  }, [loadWarehouse]);

  const notifyWarehouseChanged = async () => {
    try {
      await onWarehouseChanged();
    } catch (error) {
      console.error('خطا در بروزرسانی صفحه والد:', error);

      if (mountedRef.current) {
        setErrorMessage((current) =>
          [
            current,
            'عملیات انبار انجام شد، اما بروزرسانی لیست نمایندگان ناموفق بود.',
          ]
            .filter(Boolean)
            .join(' '),
        );
      }
    }
  };

  const stockedItems = useMemo(
    () =>
      items.filter((item) => getNumber(item.quantity) > 0),
    [items],
  );

  const totalProductTypes = stockedItems.length;

  const totalValue = useMemo(
    () =>
      stockedItems.reduce(
        (sum, item) => sum + getItemValue(item),
        0,
      ),
    [stockedItems],
  );

  const latestMovements = useMemo(
    () =>
      [...movements]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [movements],
  );

  const brands = useMemo(
    () =>
      [
        ...new Set(
          stockedItems
            .map((item) => String(item.brand || '').trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, 'fa')),
    [stockedItems],
  );

  const categories = useMemo(
    () =>
      [
        ...new Set([
          ...WAREHOUSE_CATEGORIES,
          ...stockedItems
            .map((item) => String(item.category || '').trim())
            .filter(Boolean),
        ]),
      ].sort((a, b) => a.localeCompare(b, 'fa')),
    [stockedItems],
  );

  const filteredItems = useMemo(() => {
    const query = normalizeText(searchTerm);

    return stockedItems.filter((item) => {
      const name = normalizeText(item.productName);
      const brand = String(item.brand || '').trim();
      const category = String(item.category || '').trim();

      return (
        (!query ||
          name.includes(query) ||
          normalizeText(brand).includes(query)) &&
        (!selectedCategory || category === selectedCategory) &&
        (!selectedBrand || brand === selectedBrand)
      );
    });
  }, [
    stockedItems,
    searchTerm,
    selectedCategory,
    selectedBrand,
  ]);

  const validPreviewItems = useMemo(
    () =>
      previewItems.filter((item) => item.status === 'ready'),
    [previewItems],
  );

  const previewQuantity = useMemo(
    () =>
      validPreviewItems.reduce(
        (sum, item) => sum + item.qty,
        0,
      ),
    [validPreviewItems],
  );

  const previewAmount = useMemo(
    () =>
      validPreviewItems.reduce(
        (sum, item) => sum + item.qty * item.price,
        0,
      ),
    [validPreviewItems],
  );

  // فقط ردیف‌های مشکل‌دار نمایش داده می‌شوند.
  const displayedImportRows = useMemo<ImportRowResult[]>(() => {
    if (!importResult) {
      return [];
    }

    const validationRows: ImportRowResult[] =
      importResult.validationErrors?.map((row) => ({
        ...row,
        status: 'invalid',
      })) || [];

    if (importResult.rowResults?.length) {
      const problemRows = importResult.rowResults.filter(
        (row) => {
          const remaining =
            row.remainingQuantity ??
            row.rejectedQuantity ??
            0;

          return (
            remaining > 0 ||
            row.status === 'invalid' ||
            row.status === 'budget_exceeded'
          );
        },
      );

      return [...problemRows, ...validationRows];
    }

    if (importResult.rejectedItems?.length) {
      return [
        ...importResult.rejectedItems,
        ...validationRows,
      ];
    }

    return validationRows;
  }, [importResult]);

  const handleDeleteItem = async (
    item: RepresentativeWarehouseItem,
  ) => {
    if (
      operationRef.current ||
      loading ||
      processingFile
    ) {
      return;
    }

    const confirmed = window.confirm(
      `کالای «${item.productName}» با تمام موجودی و گردش‌های مرتبط حذف شود؟`,
    );

    if (!confirmed) {
      return;
    }

    operationRef.current = true;
    setSaving(true);
    setMessage('');
    setErrorMessage('');
    setImportResult(null);

    try {
      const response = await fetch(
        `${warehouseUrl}/items/${encodeURIComponent(
          String(item.id),
        )}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: getAuthHeaders(),
        },
      );

      const result = await readApiResponse<unknown>(response);

      if (!response.ok || !result.success) {
        throw new Error(
          getApiError(
            response,
            result,
            'حذف کالا ناموفق بود.',
          ),
        );
      }

      setItems((current) =>
        current.filter(
          (entry) => String(entry.id) !== String(item.id),
        ),
      );

      if (item.productId) {
        setMovements((current) =>
          current.filter(
            (movement) =>
              String(movement.productId) !==
              String(item.productId),
          ),
        );
      }

      setMessage(
        result.message ||
          `کالای «${item.productName}» حذف شد.`,
      );

      await loadWarehouse();
      await notifyWarehouseChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'حذف کالا ناموفق بود.',
      );

      await loadWarehouse();
    } finally {
      operationRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleDeleteAllWarehouse = async () => {
    if (
      operationRef.current ||
      loading ||
      processingFile
    ) {
      return;
    }

    const confirmed = window.confirm(
      `تمام کالاها، گردش‌ها و سابقه فایل‌های انبار «${
        representative.name || 'نماینده'
      }» حذف شود؟ این عملیات قابل بازگشت نیست.`,
    );

    if (!confirmed) {
      return;
    }

    operationRef.current = true;
    setSaving(true);
    setMessage('');
    setErrorMessage('');
    setImportResult(null);

    try {
      const response = await fetch(warehouseUrl, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      const result = await readApiResponse<unknown>(response);

      if (!response.ok || !result.success) {
        throw new Error(
          getApiError(
            response,
            result,
            'حذف کل موجودی ناموفق بود.',
          ),
        );
      }

      setItems([]);
      setMovements([]);
      setPreviewItems([]);
      setShowPreview(false);
      setUploadedFileName('');
      setUploadedFileKey('');
      setSearchTerm('');
      setSelectedCategory('');
      setSelectedBrand('');

      setMessage(
        result.message || 'کل موجودی انبار حذف شد.',
      );

      await loadWarehouse();
      await notifyWarehouseChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'حذف کل موجودی ناموفق بود.',
      );

      await loadWarehouse();
    } finally {
      operationRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = '';

    if (
      !file ||
      operationRef.current ||
      fileProcessingRef.current
    ) {
      return;
    }

    fileProcessingRef.current = true;
    setProcessingFile(true);
    setMessage('');
    setErrorMessage('');
    setImportResult(null);
    setPreviewItems([]);
    setShowPreview(false);
    setUploadedFileName('');
    setUploadedFileKey('');

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: 'array',
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          'هیچ شیتی در فایل اکسل پیدا نشد.',
        );
      }

         const worksheet = workbook.Sheets[sheetName];

      const rawRows =
        XLSX.utils.sheet_to_json<unknown[]>(
          worksheet,
          {
            header: 1,
            defval: '',
            raw: true,
            blankrows: false,
          },
        );

      const knownHeaders = [
        ...PRODUCT_COLUMN_NAMES,
        ...BRAND_COLUMN_NAMES,
        ...CATEGORY_COLUMN_NAMES,
        ...QUANTITY_COLUMN_NAMES,
        ...PRICE_COLUMN_NAMES,
      ].map(normalizeExcelHeader);

      const headerRowIndex = rawRows.findIndex(
        (row) =>
          Array.isArray(row) &&
          row.some(
            (cell) =>
              cell !== null &&
              cell !== undefined &&
              String(cell).trim() !== '' &&
              knownHeaders.includes(
                normalizeExcelHeader(cell),
              ),
          ),
      );

      if (headerRowIndex < 0) {
        throw new Error(
          'هیچ سطری شامل عنوان ستون‌های شناخته‌شده پیدا نشد. لطفاً یک سطر شامل «عنوان»، «تعداد» و «قیمت» داشته باشید.',
        );
      }

      const headers = (rawRows[headerRowIndex] || []).map(
        (header, index) =>
          normalizeExcelHeader(header) ||
          `column_${index}`,
      );

      const dataRows = rawRows
        .slice(headerRowIndex + 1)
        .filter(
          (row) =>
            Array.isArray(row) &&
            row.some(
              (cell) =>
                cell !== null &&
                cell !== undefined &&
                String(cell).trim() !== '',
            ),
        );

      const rows = dataRows.map((row) => {
        const item: Record<string, unknown> = {};

        headers.forEach((header, index) => {
          item[header] = row[index] ?? '';
        });

        return item;
      });

      if (!rows.length) {
        throw new Error('فایل اکسل خالی است.');
      }

      if (rows.length > 5000) {
        throw new Error(
          'فایل نباید بیشتر از ۵۰۰۰ ردیف داشته باشد.',
        );
      }

      const columns = Object.keys(rows[0]).join(' | ');

      if (!hasExcelColumn(rows, PRODUCT_COLUMN_NAMES)) {
        throw new Error(
          `ستون عنوان پیدا نشد. ستون‌ها: ${columns}`,
        );
      }

      if (!hasExcelColumn(rows, QUANTITY_COLUMN_NAMES)) {
        throw new Error(
          `ستون تعداد پیدا نشد. ستون‌ها: ${columns}`,
        );
      }

      if (!hasExcelColumn(rows, PRICE_COLUMN_NAMES)) {
        throw new Error(
          `ستون قیمت پیدا نشد. ستون‌ها: ${columns}`,
        );
      }

      const preview: PreviewItem[] = rows.map(
        (row, index) => {
          const name = String(
            getExcelValue(row, PRODUCT_COLUMN_NAMES),
          ).trim();

          const brand = String(
            getExcelValue(row, BRAND_COLUMN_NAMES),
          ).trim();

          const category = String(
            getExcelValue(row, CATEGORY_COLUMN_NAMES),
          ).trim();

          const qty = getNumber(
            getExcelValue(row, QUANTITY_COLUMN_NAMES),
          );

          const price = getNumber(
            getExcelValue(row, PRICE_COLUMN_NAMES),
          );

          let status: PreviewItem['status'] = 'ready';

          if (!name) {
            status = 'empty_name';
          } else if (
            !Number.isSafeInteger(qty) ||
            qty <= 0
          ) {
            status = 'invalid_qty';
          } else if (
            price <= 0 ||
            !Number.isFinite(qty * price)
          ) {
            status = 'invalid_price';
          }

          return {
            rowIndex: index + 2,
            excelName: name || '(خالی)',
            brand,
            category,
            qty,
            price,
            status,
          };
        },
      );

      setPreviewItems(preview);
      setUploadedFileName(file.name);

      setUploadedFileKey(
        `${file.name}-${file.size}-${file.lastModified}`,
      );

      setShowPreview(true);

      setMessage(
        `فایل «${file.name}» خوانده شد. ثبت نهایی و سقف مالی پس از ارسال به سرور بررسی می‌شود.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'پردازش فایل اکسل ناموفق بود.',
      );
    } finally {
      fileProcessingRef.current = false;

      if (mountedRef.current) {
        setProcessingFile(false);
      }
    }
  };

  const updateExistingInfo = async () => {
    if (!validPreviewItems.length) {
      return;
    }

    try {
      await fetch(`${warehouseUrl}/update-info`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          items: validPreviewItems.map((item) => ({
            name: item.excelName,
            brand: item.brand,
            category: item.category,
            unitPrice: item.unitPrice,
          })),
        }),
      });
    } catch {
      // اگر بروزرسانی اطلاعات ناموفق بود، ثبت موجودی متوقف نمی‌شود.
    }
  };
  const submitBulkImport = async () => {
    await updateExistingInfo();
    if (
      operationRef.current ||
      processingFile ||
      loading
    ) {
      return;
    }

    if (!validPreviewItems.length) {
      setErrorMessage(
        'هیچ ردیف معتبری برای ثبت وجود ندارد.',
      );
      return;
    }

    if (!uploadedFileKey) {
      setErrorMessage(
        'شناسه فایل موجود نیست؛ فایل را دوباره انتخاب کنید.',
      );
      return;
    }

    operationRef.current = true;
    setSaving(true);
    setMessage('');
    setErrorMessage('');
    setImportResult(null);

    try {
      const response = await fetch(
        `${warehouseUrl}/import`,
        {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            fileName: uploadedFileName,
            requestId: uploadedFileKey,
            items: validPreviewItems.map((item) => ({
              name: item.excelName,
              brand: item.brand,
              category: item.category,
              quantity: item.qty,
              unitPrice: item.price,
              rowIndex: item.rowIndex,
            })),
          }),
        },
      );

      const result =
        await readApiResponse<ImportResult>(response);

      setImportResult(result.data || null);

      if (!response.ok || !result.success) {
        setErrorMessage(
          getApiError(
            response,
            result,
            'ثبت اکسل ناموفق بود.',
          ),
        );

        await loadWarehouse();
        await notifyWarehouseChanged();
        return;
      }

      const data = result.data;

      const acceptedRows =
        data?.acceptedRowsCount ?? data?.importedCount;

      const acceptedQuantity = data?.acceptedQuantity;
      const rejectedQuantity = data?.rejectedQuantity;

      const fallbackParts = [
        acceptedRows !== undefined
          ? `${formatNumber(acceptedRows)} ردیف پذیرفته شد.`
          : 'سرور ثبت فایل را تأیید کرد.',
        acceptedQuantity !== undefined
          ? `${formatNumber(
              acceptedQuantity,
            )} قطعه در این درخواست ثبت شد.`
          : '',
        rejectedQuantity !== undefined &&
        rejectedQuantity > 0
          ? `${formatNumber(
              rejectedQuantity,
            )} قطعه به دلیل سقف مالی مجاز اضافه نشد.`
          : '',
      ].filter(Boolean);

      setMessage(
        result.message || fallbackParts.join(' '),
      );

      if (
        result.warning ||
        data?.summarySaved === false
      ) {
        setErrorMessage(
          result.warning ||
            'کالاها ثبت شدند، اما خلاصه نماینده بروزرسانی نشد.',
        );
      }

      const hasRemaining =
        data?.completed === false ||
        (data?.rejectedQuantity ?? 0) > 0 ||
        (data?.rejectedRowsCount ?? 0) > 0;

      if (!hasRemaining) {
        setShowPreview(false);
        setPreviewItems([]);
        setUploadedFileName('');
        setUploadedFileKey('');
      }

      await loadWarehouse();
      await notifyWarehouseChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'ثبت اکسل ناموفق بود.',
      );
    } finally {
      operationRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const cancelPreview = () => {
    if (
      operationRef.current ||
      processingFile
    ) {
      return;
    }

    setShowPreview(false);
    setPreviewItems([]);
    setUploadedFileName('');
    setUploadedFileKey('');
  };

  const busy = saving || processingFile || loading;

  if (loading && !items.length) {
    return (
      <div dir="rtl" className="space-y-4 px-3 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />

          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
            در حال دریافت انبار{' '}
            {representative.name || 'نماینده'}...
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-50"
        >
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="w-full min-w-0 space-y-4 overflow-x-hidden pb-6 sm:space-y-6"
    >
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white">
              <Store className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-lg font-black text-gray-800 dark:text-gray-100">
                انبار {representative.name || 'نماینده'}
              </h2>

              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  کد: {representative.code || '-'}
                </span>

                <span>
                  شهر: {representative.city || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setErrorMessage('');
                void loadWarehouse();
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              بروزرسانی
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={saving || processingFile}
              className="min-h-11 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              بازگشت
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-bold leading-6 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
        >
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />
          <p className="break-words">{message}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        >
          <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
          <p className="break-words">{errorMessage}</p>
        </div>
      ) : null}

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                تعداد نوع کالاهای دارای موجودی
              </p>

              <Package className="h-5 w-5 text-blue-500" />
            </div>

            <p className="mt-3 text-3xl font-black text-blue-900 dark:text-blue-100">
              {formatNumber(totalProductTypes)}
            </p>

            <p className="mt-2 text-xs leading-6 text-blue-700 dark:text-blue-300">
              تعداد ردیف‌های دارای موجودی؛ نه جمع تعداد
              قطعات و نه ردیف‌های ثبت‌نشدهٔ اکسل
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-green-700 dark:text-green-300">
                ارزش کل موجودی انبار
              </p>

              <Banknote className="h-5 w-5 text-green-500" />
            </div>

            <p className="mt-3 break-words text-2xl font-black text-green-900 dark:text-green-100">
              {formatNumber(totalValue)}
            </p>

            <p className="mt-2 text-xs text-green-700 dark:text-green-300">
              تومان
            </p>
          </div>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
              آخرین گردش‌ها
            </h3>

            <span className="text-xs text-gray-500">
              {formatNumber(latestMovements.length)}
            </span>
          </div>

          <div className="max-h-[280px] space-y-2 overflow-y-auto p-3">
            {latestMovements.map((movement) => {
              const incoming = movement.type === 'in';

              return (
                <article
                  key={movement.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-xs font-bold text-gray-800 dark:text-gray-200">
                      {movement.productName}
                    </p>

                    <span
                      className={`shrink-0 rounded px-2 py-1 text-xs font-black ${
                        incoming
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {incoming ? '+' : '-'}
                      {formatNumber(movement.quantity)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                      <ArrowDown
                        className={`h-3 w-3 ${
                          incoming
                            ? 'text-green-600'
                            : 'rotate-180 text-orange-600'
                        }`}
                      />

                      {incoming ? 'ورود' : 'خروج'}
                    </span>

                    <span className="text-[10px] text-gray-500">
                      {formatDate(movement.createdAt)}
                    </span>
                  </div>
                </article>
              );
            })}

            {!latestMovements.length ? (
              <div className="py-8 text-center">
                <History className="mx-auto mb-2 h-8 w-8 text-gray-300" />

                <p className="text-xs text-gray-500">
                  گردشی ثبت نشده است.
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        <label
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white ${
            busy || showPreview
              ? 'cursor-not-allowed bg-gray-400'
              : 'cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-600'
          }`}
        >
          {processingFile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="h-5 w-5" />
          )}

          {processingFile
            ? 'در حال خواندن فایل...'
            : saving
              ? 'در حال انجام عملیات...'
              : 'ارسال بار؛ آپلود اکسل'}

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={busy || showPreview}
            className="hidden"
          />
        </label>

        {showPreview && previewItems.length > 0 ? (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-base font-black text-blue-900 dark:text-blue-100">
                  <Eye className="h-5 w-5 shrink-0" />
                  پیش‌نمایش فایل
                </h3>

                <p className="mt-2 break-words text-xs text-gray-600 dark:text-gray-300">
                  {uploadedFileName}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelPreview}
                disabled={saving}
                aria-label="بستن پیش‌نمایش"
                className="rounded-lg p-1 text-red-500 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                ردیف‌های فایل:{' '}
                {formatNumber(previewItems.length)}
              </span>

              <span className="rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                ردیف‌های معتبر:{' '}
                {formatNumber(validPreviewItems.length)}
              </span>

              <span className="rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                تعداد درخواستی:{' '}
                {formatNumber(previewQuantity)} قطعه
              </span>

              <span className="rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                مبلغ درخواستی:{' '}
                {formatNumber(previewAmount)} تومان
              </span>
            </div>

            <p className="mt-3 text-xs leading-6 text-blue-800 dark:text-blue-200">
              وضعیت «معتبر» فقط نام، تعداد و قیمت را
              تأیید می‌کند. سقف مالی و سابقه ثبت فایل
              هنگام ارسال به سرور بررسی می‌شوند.
            </p>

            <div className="mt-4 max-h-[360px] overflow-y-auto rounded-xl border border-gray-200">
              <table className="w-full table-fixed text-right text-xs">
                <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <tr>
                    <th className="w-[8%] p-2">ردیف</th>
                    <th className="w-[26%] p-2">عنوان</th>
                    <th className="w-[15%] p-2">برند</th>
                    <th className="w-[17%] p-2">دسته</th>
                    <th className="w-[9%] p-2">تعداد</th>
                    <th className="w-[13%] p-2">
                      قیمت
                    </th>
                    <th className="w-[12%] p-2">
                      وضعیت
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {previewItems.map((item) => (
                    <tr
                      key={item.rowIndex}
                      className={
                        item.status === 'ready'
                          ? 'bg-green-50 text-gray-800 dark:bg-green-900/10 dark:text-gray-200'
                          : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                      }
                    >
                      <td className="break-words p-2">
                        {formatNumber(item.rowIndex)}
                      </td>

                      <td className="break-words p-2 font-bold">
                        {item.excelName}
                      </td>

                      <td className="break-words p-2">
                        {item.brand || '—'}
                      </td>

                      <td className="break-words p-2">
                        {item.category || '—'}
                      </td>

                      <td className="break-words p-2">
                        {formatNumber(item.qty)}
                      </td>

                      <td className="break-words p-2">
                        {formatNumber(item.price)}
                      </td>

                      <td className="break-words p-2 font-bold">
                        {getPreviewStatus(item.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void submitBulkImport();
                }}
                disabled={
                  busy || !validPreviewItems.length
                }
                className="min-h-11 flex-1 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving
                  ? 'در حال بررسی و ثبت...'
                  : 'بررسی سقف مالی و ثبت ردیف‌های معتبر'}
              </button>

              <button
                type="button"
                onClick={cancelPreview}
                disabled={saving}
                className="min-h-11 rounded-xl bg-gray-200 px-5 py-3 text-sm font-bold text-gray-700 disabled:opacity-50"
              >
                بستن پیش‌نمایش
              </button>
            </div>
          </section>
        ) : null}

        {importResult ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
              نتیجه واقعی درخواست ثبت
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-xs text-green-700 dark:text-green-300">
                  ردیف‌های پذیرفته‌شده در این درخواست
                </p>

                <p className="mt-2 text-xl font-black text-green-900 dark:text-green-100">
                  {importResult.acceptedRowsCount !==
                    undefined ||
                  importResult.importedCount !== undefined
                    ? formatNumber(
                        importResult.acceptedRowsCount ??
                          importResult.importedCount,
                      )
                    : 'گزارش نشده'}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  قطعات ثبت‌شده در این درخواست
                </p>

                <p className="mt-2 text-xl font-black text-blue-900 dark:text-blue-100">
                  {importResult.acceptedQuantity !==
                  undefined
                    ? formatNumber(
                        importResult.acceptedQuantity,
                      )
                    : 'گزارش نشده'}
                </p>
              </div>

              <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-900/20">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  قطعات ثبت‌نشده یا باقی‌مانده
                </p>

                <p className="mt-2 text-xl font-black text-orange-900 dark:text-orange-100">
                  {importResult.rejectedQuantity !==
                  undefined
                    ? formatNumber(
                        importResult.rejectedQuantity,
                      )
                    : 'گزارش نشده'}
                </p>
              </div>
            </div>

            {(importResult.completed === false ||
              (importResult.rejectedQuantity ?? 0) > 0) &&
            showPreview ? (
              <p className="mt-4 rounded-xl bg-orange-50 p-3 text-xs leading-6 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200">
                بخشی از فایل باقی مانده است. پس از
                افزایش سقف مؤثر مالی در صفحه نماینده،
                می‌توانی همین پیش‌نمایش را دوباره ارسال
                کنی. بک‌اندِ دارای ثبت مرحله‌ای، فقط
                تعداد باقی‌مانده را ثبت می‌کند.
              </p>
            ) : null}

            {displayedImportRows.length > 0 ? (
  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/10">
    <div className="flex items-start gap-2">
      <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-300" />

      <div>
        <h4 className="text-sm font-black text-orange-800 dark:text-orange-200">
          بعضی از کالاها ثبت نشدند
        </h4>

        <p className="mt-2 text-xs leading-6 text-orange-700 dark:text-orange-300">
          به دلیل سقف مالی مجاز، بخشی از کالاهای این فایل
          اضافه نشدند. فقط کالاهایی که ثبت شده‌اند در موجودی
          انبار نمایش داده می‌شوند.
        </p>
      </div>
    </div>
  </div>
) : null}
          </section>
        ) : null}
      </section>

      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-800 dark:text-gray-100">
              موجودی واقعی انبار نماینده
            </h3>

            <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
              فقط ردیف‌هایی که موجودی بیشتر از صفر دارند
              در این جدول و کارت تعداد محاسبه می‌شوند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {formatNumber(filteredItems.length)}
              {' از '}
              {formatNumber(totalProductTypes)}
              {' نوع کالا'}
            </span>

            <button
              type="button"
              onClick={() => {
                void handleDeleteAllWarehouse();
              }}
              disabled={
                busy ||
                (!items.length && !movements.length)
              }
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              حذف کل موجودی
            </button>
          </div>
        </div>

        <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="جست‌وجوی نام یا برند"
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">
              همه دسته‌بندی‌ها
            </option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(event) =>
              setSelectedBrand(event.target.value)
            }
            className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">همه برندها</option>

            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="break-words text-sm font-black leading-6 text-gray-800 dark:text-gray-100">
                {item.productName}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-purple-50 p-3 dark:bg-purple-900/20">
                  <p className="text-purple-600 dark:text-purple-300">
                    برند
                  </p>

                  <p className="mt-2 break-words font-bold text-gray-800 dark:text-gray-100">
                    {item.brand || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-blue-600 dark:text-blue-300">
                    تعداد ذخیره‌شده این کالا
                  </p>

                  <p className="mt-2 font-black text-gray-800 dark:text-gray-100">
                    {formatNumber(item.quantity)} عدد
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                  <p className="text-gray-500 dark:text-gray-300">
                    دسته‌بندی
                  </p>

                  <p className="mt-2 break-words font-bold text-gray-800 dark:text-gray-100">
                    {item.category || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                  

                  <p className="mt-2 break-words font-bold text-gray-800 dark:text-gray-100">
                    {formatNumber(item.unitPrice)} تومان
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-xs text-green-700 dark:text-green-300">
                  ارزش موجودی این کالا
                </p>

                <p className="mt-2 break-words text-sm font-black text-green-900 dark:text-green-100">
                  {formatNumber(getItemValue(item))} تومان
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleDeleteItem(item);
                }}
                disabled={busy}
                className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                حذف کالا
              </button>
            </article>
          ))}
        </div>

        <div className="hidden md:block">
          <table className="w-full table-fixed text-center text-[6px] lg:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700  dark:bg-gray-800 dark:text-gray-400">
                <th className="w-[30%] p-3">عنوان</th>
                <th className="w-[16%] p-3">
                  دسته‌بندی
                </th>
                <th className="w-[20%] p-3">
                  تعداد  
                </th>
                <th className="w-[16%] p-3">
                  قیمت
                </th>
                <th className="w-[18%] p-3">
                   موجودی
                </th>
                <th className="w-[10%] p-3">
                  عملیات
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 dark:border-gray-700"
                >
                  <td className="break-words p-3 font-black text-gray-800 dark:text-gray-100">
                    {item.productName}

                    <p className="mt-2 text-xs font-normal text-gray-500">
                      برند: {item.brand || '—'}
                    </p>
                  </td>

                  <td className="break-words p-3 text-gray-600 dark:text-gray-300">
                    {item.category || '—'}
                  </td>

                  <td className="break-words p-3 font-black text-gray-800 dark:text-gray-100">
                    {formatNumber(item.quantity)}
                  </td>

                  <td className="break-words p-3 text-gray-600 dark:text-gray-300">
                    {formatNumber(item.unitPrice)}
                    <span className="block text-[10px]">
                      تومان
                    </span>
                  </td>

                  <td className="break-words p-3 font-black text-green-700 dark:text-green-300">
                    {formatNumber(getItemValue(item))}
                    <span className="block text-[10px]">
                      تومان
                    </span>
                  </td>

                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteItem(item);
                      }}
                      disabled={busy}
                      aria-label={`حذف ${item.productName}`}
                      className="inline-flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-600 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredItems.length ? (
          <div className="py-12 text-center">
            <PackageX className="mx-auto mb-3 h-12 w-12 text-gray-300" />

            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
              {stockedItems.length
                ? 'کالایی با این فیلتر پیدا نشد.'
                : 'کالای دارای موجودی ثبت نشده است.'}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default RepresentativeWarehouseDashboard;

