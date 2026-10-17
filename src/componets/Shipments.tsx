import axios from 'axios';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Truck,
  UploadCloud,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';


interface Representative {
  id: string | number;
  name?: string;
  code?: string | number;
  city?: string;
  phone?: string;
  status?: string;
}


type ShipmentStatus =
  | 'registered'
  | 'confirmed'
  | 'preparing'
  | 'loading'
  | 'shipping'
  | 'delivered';


interface ShipmentItem {
  id?: string | number;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rowIndex?: number;
}


interface StatusHistoryEntry {
  status: ShipmentStatus | string;
  label?: string;
  changedAt?: string;
  createdAt?: string;
  changedBy?: string;
  note?: string;
}


interface Shipment {
  id: string | number;
  shipmentNumber?: string;
  receiver?: string;
  warehouse?: string;
  representativeId?: string | number;
  representativeName?: string;
  representativeCode?: string | number;
  representativeCity?: string;
  items?: ShipmentItem[];
  itemsCount?: number;
  totalItems?: number;
  totalValue?: number;
  status?: ShipmentStatus;
  shipmentDate?: string;
  createdAt?: string;
  updatedAt?: string;
  excelFileName?: string;
  statusHistory?: StatusHistoryEntry[];
}


interface PreviewRow extends ShipmentItem {
  rowIndex: number;
  error: string;
}


interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  sms?: {
    sent?: boolean;
    message?: string;
  };
}


const API_URL = String(
  import.meta.env.VITE_API_URL ||
    'https://myshop-backend-8nu7.onrender.com/api',
).replace(/\/+$/, '');


const STATUS_STEPS: Array<{
  value: ShipmentStatus;
  label: string;
}> = [
  {
    value: 'registered',
    label: 'ثبت شده',
  },
  {
    value: 'confirmed',
    label: 'تأیید شده',
  },
  {
    value: 'preparing',
    label: 'در حال آماده‌سازی',
  },
  {
    value: 'loading',
    label: 'بارگیری',
  },
  {
    value: 'shipping',
    label: 'در حال ارسال',
  },
  {
    value: 'delivered',
    label: 'تحویل شده',
  },
];


const COLUMN_ALIASES = {
  name: [
    'عنوان',
     'عنوان',
    'عنوان',
    'نام',
    'کالا',
    'محصول',
    'productName',
    'Product',
    'Name',
  ],
  brand: [
    'برند',
    'نام برند',
    'Brand',
  ],
  category: [
    'دسته‌بندی',
    'دسته بندی',
    'دسته',
    'گروه کالا',
    'Category',
  ],
  quantity: [
    'تعداد',
    'تعداد کالا',
    'تعداد موجودی',
    'موجودی',
    'موجودی کالا',
    'مقدار',
    'quantity',
    'Qty',
    'Stock',
    'Count',
  ],
  price: [
    'قیمت',
    'قیمت',
    'قیمت',
    'unitPrice',
    'Unit Price',
    'Price',
  ],
};


const getAdminToken = () =>
  sessionStorage.getItem('token') ||
  sessionStorage.getItem('accessToken') ||
  sessionStorage.getItem('authToken') ||
  '';


const getAdminAuthHeaders = () => {
  const token = getAdminToken();

  if (!token) {
    throw new Error(
      'توکن ادمین پیدا نشد. دوباره وارد شوید.',
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
};


const normalizeDigits = (value: unknown) =>
  String(value ?? '')
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );


const normalizeText = (value: unknown) =>
  normalizeDigits(value)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200e\u200f\u00a0]/g, ' ')
    .replace(/[/\\|_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();


const toNumber = (value: unknown) => {
  const normalized = normalizeDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');

  if (!normalized) {
    return Number.NaN;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : Number.NaN;
};


const formatNumber = (value: unknown) => {
  const number = toNumber(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat('fa-IR').format(
        number,
      )
    : '—';
};


const getCell = (
  row: Record<string, unknown>,
  aliases: string[],
) => {
  const aliasesSet = new Set(
    aliases.map(normalizeText),
  );

  const entry = Object.entries(row).find(
    ([header]) =>
      aliasesSet.has(normalizeText(header)),
  );

  return entry?.[1] ?? '';
};


const hasColumn = (
  row: Record<string, unknown>,
  aliases: string[],
) => {
  const aliasesSet = new Set(
    aliases.map(normalizeText),
  );

  return Object.keys(row).some((header) =>
    aliasesSet.has(normalizeText(header)),
  );
};


const getStatusLabel = (
  status?: ShipmentStatus,
) =>
  STATUS_STEPS.find(
    (step) => step.value === status,
  )?.label || 'نامشخص';


const getStatusIndex = (
  status?: ShipmentStatus,
) =>
  STATUS_STEPS.findIndex(
    (step) => step.value === status,
  );


const getNextStatus = (
  currentStatus?: ShipmentStatus,
): ShipmentStatus | null => {
  const currentIndex = getStatusIndex(
    currentStatus,
  );

  if (currentIndex < 0) {
    return 'confirmed';
  }

  if (
    currentIndex >=
    STATUS_STEPS.length - 1
  ) {
    return null;
  }

  return STATUS_STEPS[currentIndex + 1].value;
};


const getTodayJalali = () =>
  new Intl.DateTimeFormat(
    'fa-IR-u-ca-persian',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  )
    .format(new Date())
    .replace(/[\u200e\u200f]/g, '')
    .replace(/-/g, '/')
    .split('/')
    .map((part) => normalizeDigits(part))
    .join('/');


const getErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | ApiResponse<unknown>
      | undefined;

    return (
      data?.error ||
      data?.message ||
      fallback
    );
  }

  return error instanceof Error
    ? error.message
    : fallback;
};


const parseExcelFile = async (
  file: File,
): Promise<PreviewRow[]> => {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: 'array',
  });

  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    throw new Error(
      'فایل اکسل هیچ برگه‌ای ندارد.',
    );
  }

  const sheet = workbook.Sheets[firstSheet];

  const rows = XLSX.utils.sheet_to_json<
    Record<string, unknown>
  >(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error('فایل اکسل خالی است.');
  }

  const missingColumns: string[] = [];

  if (
    !hasColumn(
      rows[0],
      COLUMN_ALIASES.name,
    )
  ) {
    missingColumns.push('عنوان');
  }

  if (
    !hasColumn(
      rows[0],
      COLUMN_ALIASES.quantity,
    )
  ) {
    missingColumns.push('تعداد');
  }

  if (missingColumns.length > 0) {
    throw new Error(
      `ستون‌های لازم پیدا نشد: ${missingColumns.join(
        '، ',
      )}`,
    );
  }

  return rows.map((row, index) => {
    const rowIndex = index + 2;

    const productName = String(
      getCell(row, COLUMN_ALIASES.name),
    ).trim();

    const brand = String(
      getCell(row, COLUMN_ALIASES.brand),
    ).trim();

    const category = String(
      getCell(row, COLUMN_ALIASES.category),
    ).trim();

    const quantity = toNumber(
      getCell(
        row,
        COLUMN_ALIASES.quantity,
      ),
    );

    const priceCell = getCell(
      row,
      COLUMN_ALIASES.price,
    );

    const unitPrice =
      String(priceCell).trim() === ''
        ? 0
        : toNumber(priceCell);

    let error = '';

    if (!productName) {
      error = 'عنوان خالی است.';
    } else if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      error =
        'تعداد باید عدد صحیح و بزرگ‌تر از صفر باشد.';
    } else if (
      !Number.isSafeInteger(unitPrice) ||
      unitPrice < 0
    ) {
      error =
        'قیمت باید عدد صحیح و نامنفی باشد.';
    }

    return {
      rowIndex,
      productName,
      brand,
      category,
      quantity: Number.isFinite(quantity)
        ? quantity
        : 0,
      unitPrice: Number.isFinite(unitPrice)
        ? unitPrice
        : 0,
      totalPrice:
        Number.isFinite(quantity) &&
        Number.isFinite(unitPrice)
          ? quantity * unitPrice
          : 0,
      error,
    };
  });
};


const Shipments: React.FC = () => {
  const [shipments, setShipments] =
    useState<Shipment[]>([]);

  const [representatives, setRepresentatives] =
    useState<Representative[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    changingStatusId,
    setChangingStatusId,
  ] = useState<string | null>(null);

  const [
    deletingShipmentId,
    setDeletingShipmentId,
  ] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalError, setModalError] =
    useState('');

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [
    selectedShipment,
    setSelectedShipment,
  ] = useState<Shipment | null>(null);

  const [
    representativeId,
    setRepresentativeId,
  ] = useState('');

  const [warehouse, setWarehouse] =
    useState('');

  const [
    shipmentDate,
    setShipmentDate,
  ] = useState(getTodayJalali);

  const [fileName, setFileName] =
    useState('');

  const [previewRows, setPreviewRows] =
    useState<PreviewRow[]>([]);

  const [
    filterRepresentative,
    setFilterRepresentative,
  ] = useState('');

  const [filterStatus, setFilterStatus] =
    useState('');

  const [search, setSearch] = useState('');

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const representativesById = useMemo(
    () =>
      new Map(
        representatives.map(
          (representative) => [
            normalizeDigits(
              representative.id,
            ).trim(),
            representative,
          ],
        ),
      ),
    [representatives],
  );

  const selectedRepresentative =
    representativesById.get(
      representativeId,
    );

  const validRows = useMemo(
    () =>
      previewRows.filter(
        (row) => !row.error,
      ),
    [previewRows],
  );

  const invalidRows = useMemo(
    () =>
      previewRows.filter(
        (row) => Boolean(row.error),
      ),
    [previewRows],
  );

  const filteredShipments = useMemo(() => {
    const query = normalizeText(search);

    return shipments.filter(
      (shipment) => {
        const representative =
          representativesById.get(
            normalizeDigits(
              shipment.representativeId,
            ).trim(),
          );

        const matchesRepresentative =
          !filterRepresentative ||
          normalizeDigits(
            shipment.representativeId,
          ).trim() === filterRepresentative;

        const matchesStatus =
          !filterStatus ||
          shipment.status === filterStatus;

        const haystack = normalizeText(
          [
            shipment.shipmentNumber,
            shipment.representativeName,
            representative?.name,
            shipment.warehouse,
            shipment.excelFileName,
          ].join(' '),
        );

        return (
          matchesRepresentative &&
          matchesStatus &&
          haystack.includes(query)
        );
      },
    );
  }, [
    shipments,
    representativesById,
    filterRepresentative,
    filterStatus,
    search,
  ]);

  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        setLoading(true);
      }

      try {
        const headers = getAdminAuthHeaders();

        const [
          shipmentsResponse,
          representativesResponse,
        ] = await Promise.all([
          axios.get<ApiResponse<Shipment[]>>(
            `${API_URL}/shipments`,
            { headers },
          ),
          axios.get<
            ApiResponse<Representative[]>
          >(`${API_URL}/representatives`, {
            headers,
          }),
        ]);

        if (
          shipmentsResponse.data.success ===
            false ||
          representativesResponse.data.success ===
            false
        ) {
          throw new Error(
            shipmentsResponse.data.error ||
              representativesResponse.data
                .error ||
              'دریافت اطلاعات ناموفق بود.',
          );
        }

        setShipments(
          Array.isArray(
            shipmentsResponse.data.data,
          )
            ? shipmentsResponse.data.data
            : [],
        );

        setRepresentatives(
          Array.isArray(
            representativesResponse.data.data,
          )
            ? representativesResponse.data.data
            : [],
        );
      } catch (caughtError) {
        setError(
          getErrorMessage(
            caughtError,
            'دریافت اطلاعات ناموفق بود.',
          ),
        );
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setRepresentativeId('');
    setWarehouse('');
    setShipmentDate(getTodayJalali());
    setFileName('');
    setPreviewRows([]);
    setModalError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShipmentDate(getTodayJalali());
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    setFileName('');
    setPreviewRows([]);
    setModalError('');

    if (!file) {
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setModalError(
        'فقط فایل اکسل xlsx یا xls پذیرفته می‌شود.',
      );

      event.target.value = '';
      return;
    }

    try {
      const rows = await parseExcelFile(file);

      setFileName(file.name);
      setPreviewRows(rows);
    } catch (caughtError) {
      setModalError(
        getErrorMessage(
          caughtError,
          'خواندن فایل اکسل ناموفق بود.',
        ),
      );

      event.target.value = '';
    }
  };

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setModalError('');
    setError('');
    setSuccess('');

    if (!selectedRepresentative) {
      setModalError(
        'نماینده را انتخاب کنید.',
      );
      return;
    }

    // بررسی اینکه آیا id نماینده معتبر هست
    const repId = String(
      selectedRepresentative.id || '',
    ).trim();

    if (!repId || repId === 'undefined' || repId === 'null') {
      setModalError(
        'شناسه نماینده نامعتبر است. لطفاً صفحه را رفرش کرده و دوباره تلاش کنید.',
      );
      return;
    }

    // ردیف‌های نامعتبر رو خودکار فیلتر می‌کنیم - جلوی ثبت رو نمی‌گیریم
    // فقط اگه فایل اکسل اصلاً ستون‌های لازم رو نداشت، ارور می‌دیم

    setSaving(true);

    try {
      // اگه فایل اکسل نبود یا همه ردیف‌ها نامعتبر بودن، یه آیتم پیش‌فرض می‌سازیم
      // اگه فایل اکسل داشتیم، فقط ردیف‌های معتبر رو می‌فرستیم (نامعتبرها رو خودکار حذف می‌کنیم)
      let itemsToSend;
      let skippedInvalidRows = 0;

      if (validRows.length > 0) {
        itemsToSend = validRows.map((row) => ({
          productName: row.productName,
          brand: row.brand,
          category: row.category,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          rowIndex: row.rowIndex,
        }));
        skippedInvalidRows = invalidRows.length;
      } else {
        itemsToSend = [
          {
            productName: 'بار دستی',
            brand: '',
            category: '',
            quantity: 1,
            unitPrice: 0,
            rowIndex: 1,
          },
        ];
      }

      console.log('🚀 Sending shipment request:', {
        url: `${API_URL}/shipments`,
        representativeId: repId,
        warehouse: warehouse.trim() || 'انبار مرکزی',
        itemsCount: itemsToSend.length,
        skippedInvalidRows,
      });

      const response = await axios.post<
        ApiResponse<Shipment>
      >(
        `${API_URL}/shipments`,
        {
          representativeId: repId,
          warehouse: warehouse.trim() || 'انبار مرکزی',
          shipmentDate,
          excelFileName: fileName || '',
          items: itemsToSend,
        },
        {
          headers: {
            ...getAdminAuthHeaders(),
            'Content-Type':
              'application/json',
          },
        },
      );

      if (response.data.success === false) {
        throw new Error(
          response.data.error ||
            'ثبت بار ناموفق بود.',
        );
      }

      setIsModalOpen(false);

      resetForm();

      setSuccess(
        response.data.message ||
          'بار با موفقیت ثبت شد.',
      );

      void loadData(false);
    } catch (caughtError) {
      setModalError(
        getErrorMessage(
          caughtError,
          'ثبت بار ناموفق بود.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    shipment: Shipment,
    nextStatus: ShipmentStatus,
  ) => {
    if (shipment.status === nextStatus) {
      return;
    }

    const accepted = window.confirm(
      `وضعیت بار «${
        shipment.shipmentNumber ||
        shipment.id
      }» به «${getStatusLabel(
        nextStatus,
      )}» تغییر کند؟`,
    );

    if (!accepted) {
      return;
    }

    setChangingStatusId(
      String(shipment.id),
    );

    setError('');
    setSuccess('');

    try {
      const response = await axios.patch<
        ApiResponse<Shipment>
      >(
        `${API_URL}/shipments/${encodeURIComponent(
          String(shipment.id),
        )}/status`,
        {
          status: nextStatus,
        },
        {
          headers: getAdminAuthHeaders(),
        },
      );

      if (response.data.success === false) {
        throw new Error(
          response.data.error ||
            'تغییر وضعیت ناموفق بود.',
        );
      }

      if (response.data.data) {
        setShipments((current) =>
          current.map((item) =>
            String(item.id) ===
            String(shipment.id)
              ? response.data.data!
              : item,
          ),
        );
      } else {
        void loadData(false);
      }

      // ---------- نمایش پیام موفقیت + وضعیت SMS ----------
      let successMessage =
        response.data.message ||
        'وضعیت بار تغییر کرد.';

      // اگر بک‌اند اطلاعات SMS فرستاده بود
      if (response.data.sms) {
        if (response.data.sms.sent) {
          successMessage +=
            ' پیامک برای نماینده ارسال شد.';
        } else {
          successMessage +=
            ' (ارسال پیامک ناموفق بود.)';
        }
      }
      // ----------------------------------------------------

      setSuccess(successMessage);
    } catch (caughtError) {
      setError(
        getErrorMessage(
          caughtError,
          'تغییر وضعیت ناموفق بود.',
        ),
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  const handleAdvanceStatus = async (
    shipment: Shipment,
  ) => {
    const nextStatus = getNextStatus(
      shipment.status,
    );

    if (!nextStatus) {
      setError(
        'بار در آخرین وضعیت است. برای تغییر دستی از انتخاب‌گر وضعیت استفاده کنید.',
      );
      return;
    }

    await updateStatus(
      shipment,
      nextStatus,
    );
  };

  const handleDelete = async (
    shipment: Shipment,
  ) => {
    const shipmentLabel =
      shipment.shipmentNumber ||
      shipment.id;

    const accepted = window.confirm(
      `آیا از حذف بار «${shipmentLabel}» مطمئن هستید؟`,
    );

    if (!accepted) {
      return;
    }

    setDeletingShipmentId(
      String(shipment.id),
    );

    setError('');
    setSuccess('');

    try {
      const response = await axios.delete<
        ApiResponse<unknown>
      >(
        `${API_URL}/shipments/${encodeURIComponent(
          String(shipment.id),
        )}`,
        {
          headers: getAdminAuthHeaders(),
        },
      );

      if (response.data.success === false) {
        throw new Error(
          response.data.error ||
            'حذف بار ناموفق بود.',
        );
      }

      setShipments((current) =>
        current.filter(
          (item) =>
            String(item.id) !==
            String(shipment.id),
        ),
      );

      setSuccess(
        response.data.message ||
          'بار حذف شد.',
      );
    } catch (caughtError) {
      setError(
        getErrorMessage(
          caughtError,
          'حذف بار ناموفق بود.',
        ),
      );
    } finally {
      setDeletingShipmentId(null);
    }
  };

  if (
    loading &&
    shipments.length === 0
  ) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl bg-white p-10 text-center dark:bg-gray-900"
      >
        <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-blue-600" />
        در حال دریافت اطلاعات...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:space-y-5 sm:p-6"
    >
      <header className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:pb-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white sm:text-2xl">
            <Truck className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" />
            مدیریت ارسال بار
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {formatNumber(shipments.length)} حواله ثبت‌شده
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-xs font-bold dark:border-gray-700 dark:text-white sm:px-4 sm:text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            به‌روزرسانی
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white hover:bg-blue-700 sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            ارسال بار جدید
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="جست‌وجوی حواله یا نماینده"
          className="min-h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <select
          value={filterRepresentative}
          onChange={(event) =>
            setFilterRepresentative(
              event.target.value,
            )
          }
          className="min-h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">
            همهٔ نمایندگان
          </option>

          {representatives.map(
            (representative) => (
              <option
                key={String(
                  representative.id,
                )}
                value={normalizeDigits(
                  representative.id,
                ).trim()}
              >
                {representative.name ||
                  'بدون نام'}
              </option>
            ),
          )}
        </select>

        <select
          value={filterStatus}
          onChange={(event) =>
            setFilterStatus(
              event.target.value,
            )
          }
          className="min-h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">
            همهٔ وضعیت‌ها
          </option>

          {STATUS_STEPS.map((step) => (
            <option
              key={step.value}
              value={step.value}
            >
              {step.label}
            </option>
          ))}
        </select>
      </section>

      {/* باکس مجموع کل بارها */}
      {filteredShipments.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-l from-cyan-50 via-blue-50 to-purple-50 p-4 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-purple-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  مجموع کل بارها
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatNumber(filteredShipments.length)} حواله · {formatNumber(filteredShipments.reduce((sum, s) => sum + (s.totalItems ?? s.items?.reduce((a, i) => a + i.quantity, 0) ?? 0), 0))} عدد کالا
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-l from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 sm:text-2xl">
                {formatNumber(filteredShipments.reduce((sum, s) => sum + (s.totalValue ?? s.items?.reduce((a, i) => a + (i.totalPrice ?? (i.quantity || 0) * (i.unitPrice || 0)), 0) ?? 0), 0))}
              </p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">تومان</p>
            </div>
          </div>
        </div>
      )}

      {filteredShipments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-10 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-blue-300" />

          <p className="font-bold text-gray-700">
            {shipments.length === 0
              ? 'هنوز باری ثبت نشده است.'
              : 'باری با این فیلترها پیدا نشد.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredShipments.map(
            (shipment) => {
              const representative =
                representativesById.get(
                  normalizeDigits(
                    shipment.representativeId,
                  ).trim(),
                );

              const representativeName =
                shipment.representativeName ||
                representative?.name ||
                '—';

              const itemCount =
                shipment.items?.length ??
                shipment.itemsCount ??
                0;

              const totalUnits =
                shipment.totalItems ??
                shipment.items?.reduce(
                  (sum, item) =>
                    sum + item.quantity,
                  0,
                ) ??
                0;

              const statusIndex =
                getStatusIndex(
                  shipment.status,
                );

              const nextStatus =
                getNextStatus(
                  shipment.status,
                );

              const isChanging =
                changingStatusId ===
                String(shipment.id);

              const isDeleting =
                deletingShipmentId ===
                String(shipment.id);

              return (
                <article
                  key={String(shipment.id)}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-gray-500">
                        حواله {shipment.shipmentNumber || shipment.id}
                      </p>

                      <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white sm:text-lg">
                        {representativeName}
                      </h3>

                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 sm:mt-2 sm:text-sm">
                        انبار: {shipment.warehouse || '—'}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700 sm:px-3 sm:py-1.5 sm:text-xs">
                      {getStatusLabel(
                        shipment.status,
                      )}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
                    <div className="rounded-xl bg-white p-2 dark:bg-gray-900 sm:p-3">
                      <p className="text-[10px] text-gray-500 sm:text-xs">
                        نوع کالا
                      </p>

                      <p className="mt-1 text-sm font-black dark:text-white sm:text-base">
                        {formatNumber(itemCount)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-2 dark:bg-gray-900 sm:p-3">
                      <p className="text-[10px] text-gray-500 sm:text-xs">
                        مجموع تعداد
                      </p>

                      <p className="mt-1 text-sm font-black dark:text-white sm:text-base">
                        {formatNumber(totalUnits)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-2 dark:bg-gray-900 sm:p-3">
                      <p className="text-[10px] text-gray-500 sm:text-xs">
                        تاریخ ثبت
                      </p>

                      <p className="mt-1 text-xs font-black dark:text-white sm:text-sm">
                        {shipment.shipmentDate || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1 sm:mt-4 sm:gap-1.5">
                    {STATUS_STEPS.map(
                      (step, index) => (
                        <div
                          key={step.value}
                          className={`truncate rounded-lg px-1 py-2 text-center text-[9px] font-bold sm:text-xs ${
                            index <= statusIndex
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                          }`}
                        >
                          {step.label}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-700 sm:mt-4 sm:flex-row sm:pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedShipment(
                          shipment,
                        )
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300 px-4 text-sm font-bold text-blue-700"
                    >
                      <ChevronDown className="h-4 w-4" />
                      جزئیات
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleAdvanceStatus(
                          shipment,
                        )
                      }
                      disabled={
                        isChanging ||
                        isDeleting ||
                        !nextStatus
                      }
                      title={
                        nextStatus
                          ? `تغییر به ${getStatusLabel(
                              nextStatus,
                            )}`
                          : 'مرحلهٔ بعدی ندارد'
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {isChanging ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowLeft className="h-5 w-5" />
                      )}
                    </button>

                    <select
                      value={
                        shipment.status ||
                        'registered'
                      }
                      onChange={(event) =>
                        void updateStatus(
                          shipment,
                          event.target
                            .value as ShipmentStatus,
                        )
                      }
                      disabled={
                        isChanging ||
                        isDeleting
                      }
                      className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      {STATUS_STEPS.map(
                        (step) => (
                          <option
                            key={step.value}
                            value={step.value}
                          >
                            {step.label}
                          </option>
                        ),
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(
                          shipment,
                        )
                      }
                      disabled={
                        isChanging ||
                        isDeleting
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}

                      حذف
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="max-h-[95dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-900 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-black dark:text-white">
                  ارسال بار جدید
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  گیرنده به‌صورت خودکار نام نمایندهٔ
                  انتخاب‌شده است.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="rounded-lg p-2 dark:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {modalError}
              </div>
            )}

            <form
              onSubmit={(event) =>
                void handleSubmit(event)
              }
              className="space-y-4 sm:space-y-5"
            >
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <label className="block text-sm font-bold dark:text-white">
                  نماینده

                  <select
                    value={representativeId}
                    onChange={(event) =>
                      setRepresentativeId(
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">
                      نماینده را انتخاب کنید
                    </option>

                    {representatives.map(
                      (representative) => (
                        <option
                          key={String(
                            representative.id,
                          )}
                          value={normalizeDigits(
                            representative.id,
                          ).trim()}
                        >
                          {representative.name ||
                            'بدون نام'}{' '}
                          —{' '}
                          {representative.city ||
                            'بدون شهر'}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block text-sm font-bold dark:text-white">
                  تاریخ ثبت بار

                  <div className="relative mt-2">
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />

                    <input
                      value={shipmentDate}
                      readOnly
                      dir="ltr"
                      className="min-h-12 w-full cursor-not-allowed rounded-xl border border-blue-200 bg-blue-50 py-2 pl-3 pr-11 text-center font-black text-blue-800"
                    />
                  </div>

                  <p className="mt-2 text-xs font-normal text-gray-500">
                    تاریخ امروز خودکار ثبت می‌شود و قابل
                    ویرایش نیست.
                  </p>
                </label>

                <label className="block text-sm font-bold dark:text-white sm:col-span-2">
                  انبار مبدأ <span className="text-xs font-normal text-gray-500">(اختیاری)</span>

                  <input
                    value={warehouse}
                    onChange={(event) =>
                      setWarehouse(
                        event.target.value,
                      )
                    }
                    placeholder="خالی = انبار مرکزی"
                    className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
              </div>

              {selectedRepresentative && (
                <div className="rounded-xl bg-purple-50 p-3 text-sm font-bold text-purple-800">
                  گیرندهٔ خودکار:{' '}
                  {selectedRepresentative.name ||
                    '—'}{' '}
                  — کد{' '}
                  {selectedRepresentative.code ||
                    '—'}
                </div>
              )}

              <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-5">
                <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                  <UploadCloud className="h-8 w-8 text-blue-600" />

                  <span className="font-black text-blue-800">
                    انتخاب فایل اکسل اقلام <span className="text-xs font-normal text-gray-500">(اختیاری)</span>
                  </span>

                  <span className="text-xs text-gray-500">
                    ستون‌های ضروری: عنوان و تعداد — اگر فایل انتخاب نکنید، بار با یک آیتم پیش‌فرض ثبت می‌شود
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) =>
                      void handleFileChange(
                        event,
                      )
                    }
                    className="sr-only"
                  />
                </label>
              </div>

              {fileName && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
                  <FileSpreadsheet className="h-5 w-5" />
                  {fileName}
                </div>
              )}

              {previewRows.length > 0 && (
                <div className="max-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  {/* نسخه موبایل: کارت‌های باکسی */}
                  <div className="space-y-2 p-2 sm:hidden">
                    {previewRows.map((row) => (
                      <div
                        key={row.rowIndex}
                        className={`rounded-xl p-3 ${
                          row.error
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black">
                              {row.productName || '—'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              ردیف {formatNumber(row.rowIndex)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              row.error
                                ? 'bg-red-200 text-red-800'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.error ? 'نامعتبر' : 'آماده'}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
                            <p className="text-gray-500">تعداد</p>
                            <p className="font-black">{formatNumber(row.quantity)}</p>
                          </div>
                          <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
                            
                            <p className="font-black">{formatNumber(row.unitPrice)}</p>
                          </div>
                        </div>
                        {row.brand && (
                          <p className="mt-2 text-xs text-gray-500">
                            برند: {row.brand}
                          </p>
                        )}
                        {row.category && (
                          <p className="text-xs text-gray-500">
                            دسته: {row.category}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* نسخه دسکتاپ: جدول */}
                  <table className="hidden w-full min-w-[700px] text-right text-sm sm:table">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 dark:text-white">
                      <tr>
                        <th className="p-3">ردیف</th>
                        <th className="p-3">عنوان</th>
                        <th className="p-3">برند</th>
                        <th className="p-3">
                          دسته‌بندی
                        </th>
                        <th className="p-3">تعداد</th>
                        <th className="p-3">
                          قیمت
                        </th>
                        <th className="p-3">وضعیت</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewRows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={`border-t border-gray-100 dark:border-gray-700 ${
                            row.error
                              ? 'bg-red-50'
                              : 'dark:text-white'
                          }`}
                        >
                          <td className="p-3">
                            {formatNumber(
                              row.rowIndex,
                            )}
                          </td>

                          <td className="p-3 font-bold">
                            {row.productName || '—'}
                          </td>

                          <td className="p-3">
                            {row.brand || '—'}
                          </td>

                          <td className="p-3">
                            {row.category || '—'}
                          </td>

                          <td className="p-3">
                            {formatNumber(
                              row.quantity,
                            )}
                          </td>

                          <td className="p-3">
                            {formatNumber(
                              row.unitPrice,
                            )}
                          </td>

                          <td className="p-3">
                            {row.error || 'آماده'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* مجموع قیمت محصولات */}
              {validRows.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-l from-cyan-50 via-blue-50 to-purple-50 p-4 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-purple-950/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          مجموع قیمت محصولات
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatNumber(validRows.length)} قلم · {formatNumber(validRows.reduce((sum, r) => sum + r.quantity, 0))} عدد
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-l from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 sm:text-xl">
                        {formatNumber(validRows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0))}
                      </p>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        تومان
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* مجموع کل ارسال بار */}
              {validRows.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-l from-emerald-50 via-green-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          مجموع کل ارسال بار
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatNumber(validRows.length)} قلم · {formatNumber(validRows.reduce((sum, r) => sum + r.quantity, 0))} عدد کالا
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-l from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 sm:text-xl">
                        {formatNumber(validRows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0))}
                      </p>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">تومان</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="min-h-12 rounded-xl bg-gray-100 px-4 text-sm font-bold text-gray-700 sm:px-5"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={saving || !selectedRepresentative}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

                  ثبت و ارسال بار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="max-h-[95dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-900 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-black dark:text-white">
                  جزئیات بار{' '}
                  {selectedShipment.shipmentNumber ||
                    selectedShipment.id}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  فایل:{' '}
                  {selectedShipment.excelFileName ||
                    '—'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedShipment(null)
                }
                className="rounded-lg p-2 dark:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 rounded-xl bg-blue-50 p-3 text-sm font-black text-blue-700">
              وضعیت فعلی:{' '}
              {getStatusLabel(
                selectedShipment.status,
              )}
            </div>

            {!selectedShipment.items?.length ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                اقلام بار برای نمایش موجود نیستند.
              </p>
            ) : (
              <>
                {/* باکس مجموع این بار */}
                <div className="mb-4 rounded-2xl bg-gradient-to-l from-cyan-50 via-blue-50 to-purple-50 p-4 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-purple-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          مجموع این بار
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatNumber(selectedShipment.items.length)} قلم · {formatNumber(selectedShipment.items.reduce((sum, i) => sum + i.quantity, 0))} عدد
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-l from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 sm:text-xl">
                        {formatNumber(selectedShipment.items.reduce((sum, i) => sum + (i.totalPrice ?? i.quantity * i.unitPrice), 0))}
                      </p>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">تومان</p>
                    </div>
                  </div>
                </div>

                {/* نسخه موبایل: کارت‌های باکسی */}
                <div className="space-y-2 sm:hidden">
                  {selectedShipment.items.map((item, index) => (
                    <div
                      key={String(item.id ?? index)}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <p className="font-black text-gray-800 dark:text-white">
                        {item.productName}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
                          <p className="text-gray-500">تعداد</p>
                          <p className="font-black text-gray-800 dark:text-white">
                            {formatNumber(item.quantity)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
                          <p className="text-gray-500">قیمت</p>
                          <p className="font-black text-gray-800 dark:text-white">
                            {formatNumber(item.unitPrice)} ت
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        {item.brand && (
                          <span className="rounded-full bg-white px-2 py-0.5 dark:bg-gray-900">
                            برند: {item.brand}
                          </span>
                        )}
                        {item.category && (
                          <span className="rounded-full bg-white px-2 py-0.5 dark:bg-gray-900">
                            دسته: {item.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 rounded-lg bg-green-50 p-2 text-xs dark:bg-green-950/20">
                        <span className="text-gray-500">مبلغ کل: </span>
                        <span className="font-black text-green-700 dark:text-green-300">
                          {formatNumber(item.totalPrice ?? item.quantity * item.unitPrice)} تومان
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* نسخه دسکتاپ: جدول */}
                <div className="hidden max-h-80 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 sm:block">
                  <table className="w-full text-right text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 dark:text-white">
                      <tr>
                        <th className="p-3">عنوان</th>
                        <th className="p-3">برند</th>
                        <th className="p-3">
                          دسته‌بندی
                        </th>
                        <th className="p-3">تعداد</th>
                        <th className="p-3">
                          قیمت
                        </th>
                        <th className="p-3">
                          مبلغ
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedShipment.items.map(
                        (item, index) => (
                          <tr
                            key={String(
                              item.id ?? index,
                            )}
                            className="border-t border-gray-100 dark:border-gray-700 dark:text-white"
                          >
                            <td className="p-3 font-bold">
                              {item.productName}
                            </td>

                            <td className="p-3">
                              {item.brand || '—'}
                            </td>

                            <td className="p-3">
                              {item.category || '—'}
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

                            <td className="p-3">
                              {formatNumber(
                                item.totalPrice,
                              )}{' '}
                              تومان
                            </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default Shipments;