import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FileX,
  FolderOpen,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Store,
  Trash2,
  Truck,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';

import type {
  ApiResponse,
  Representative,
  RepresentativeAdminNote,
  RepresentativeFile,
  RepresentativeWarehouseData,
  RepresentativeWarehouseItem,
  SalesReport,
} from '../types';

interface Props {
  representative: Representative;
  apiUrl?: string;
  onBack: () => void;
  files?: RepresentativeFile[];
  loadingFiles?: boolean;
  onViewFile?: (file: RepresentativeFile) => void;
  onDeleteFile?: (
    fileId: string | number,
  ) => void;
  onRepresentativeUpdated?: (
    representative: Representative,
  ) => void;
  // بعد از آپلود موفق، صدا زده می‌شود تا لیست فایل‌ها رفرش شود
  onRefreshFiles?: () => void;
}

interface DashboardCardProps {
  title: React.ReactNode;
  children: React.ReactNode;
  index: number;
}

interface EditRepresentativeForm {
  name: string;
  email: string;
  code: string;
  province: string;
  city: string;
  phone: string;
  startDate: string;
  status: 'active' | 'inactive';
  address: string;
  description: string;
  shopDescription: string;
}

const emptyEditForm: EditRepresentativeForm = {
  name: '',
  email: '',
  code: '',
  province: '',
  city: '',
  phone: '',
  startDate: '',
  status: 'active',
  address: '',
  description: '',
  shopDescription: '',
};

const normalizeDigits = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );
};

const toNumber = (value: unknown): number => {
  const normalized = normalizeDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
};

const toPersianNumber = (
  value: unknown,
): string => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};

const formatPrice = (value: unknown): string => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};

const getRepresentativeLocation = (
  representative: Representative,
): string => {
  const province = String(
    representative.province ?? '',
  ).trim();

  const city = String(
    representative.city ?? '',
  ).trim();

  return [province, city]
    .filter(Boolean)
    .join(' — ') || 'ثبت نشده';
};

const getAdminToken = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const tokenKeys = [
    'token',
    'accessToken',
    'authToken',
    'adminToken',
    'admin_access_token',
  ];

  for (const key of tokenKeys) {
    const sessionToken =
      window.sessionStorage.getItem(key);

    if (sessionToken?.trim()) {
      return sessionToken.trim();
    }

    const localToken =
      window.localStorage.getItem(key);

    if (localToken?.trim()) {
      return localToken.trim();
    }
  }

  return '';
};

const readApiResponse = async <T,>(
  response: Response,
): Promise<T> => {
  const rawText = await response.text();

  const contentType =
    response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      `پاسخ JSON نیست. کد پاسخ: ${
        response.status
      }. ${rawText.slice(0, 120)}`,
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(
      `پاسخ JSON معتبر نیست. کد پاسخ: ${
        response.status
      }`,
    );
  }
};

const isImageFile = (
  file: RepresentativeFile,
): boolean => {
  const imageExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
  ];

  const extension = file.name
    .split('.')
    .pop()
    ?.toLowerCase();

  return Boolean(
    extension &&
      imageExtensions.includes(extension),
  );
};

const DashboardCard: React.FC<
  DashboardCardProps
> = ({
  title,
  children,
  index,
}) => {
  return (
    <div
      className="group relative min-h-[220px] overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.09)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_16px_32px_rgba(15,23,42,0.16)] dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 dark:shadow-none sm:min-h-[250px] sm:p-5 md:rounded-[30px] md:p-6"
      style={{
        animation: `cardEnter 550ms ease-out ${
          index * 70
        }ms both`,
      }}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="w-full rounded-xl border border-blue-100 bg-slate-800 px-4 py-2.5 text-center text-sm font-black text-white shadow-sm dark:border-slate-600 dark:bg-slate-700 sm:px-5 sm:py-3 sm:text-base md:text-lg">
          {title}
        </div>

        <div className="relative mt-5 flex flex-1 items-center justify-center overflow-hidden rounded-[18px] border border-slate-100 bg-white p-4 text-center shadow-[0_6px_18px_rgba(15,23,42,0.07)] dark:border-gray-700 dark:bg-gray-800 sm:mt-6 sm:p-5">
          <div className="relative z-20 w-full">
            {children}
          </div>

          <div className="pointer-events-none absolute -right-8 -top-8 z-10 h-28 w-28 rounded-full border-[10px] border-blue-100/70 bg-blue-200/50 transition-transform duration-500 group-hover:scale-110 dark:border-blue-900/40 dark:bg-blue-800/30 sm:-right-9 sm:-top-9 sm:h-36 sm:w-36" />

          <div className="pointer-events-none absolute -bottom-10 -left-10 z-0 h-32 w-32 rounded-full bg-blue-100/50 blur-xl dark:bg-blue-900/20" />
        </div>
      </div>
    </div>
  );
};

const RepresentativeDashboard: React.FC<Props> = ({
  representative,
  apiUrl,
  onBack,
  files = [],
  loadingFiles = false,
  onViewFile,
  onDeleteFile,
  onRepresentativeUpdated,
  onRefreshFiles,
}) => {
  const [currentRepresentative, setCurrentRepresentative] =
    useState<Representative>(representative);

  const [warehouseItems, setWarehouseItems] =
    useState<RepresentativeWarehouseItem[]>([]);

  const [warehouseLoading, setWarehouseLoading] =
    useState(true);

  const [warehouseError, setWarehouseError] =
    useState('');

  const [salesReports, setSalesReports] =
    useState<SalesReport[]>([]);

  const [salesLoading, setSalesLoading] =
    useState(false);

  const [salesError, setSalesError] =
    useState('');

  const [adminNotes, setAdminNotes] =
    useState<RepresentativeAdminNote[]>([]);

  const [notesLoading, setNotesLoading] =
    useState(true);

  const [noteDraft, setNoteDraft] =
    useState('');

  const [noteSaving, setNoteSaving] =
    useState(false);

  const [noteError, setNoteError] =
    useState('');

  const [editingNoteId, setEditingNoteId] =
    useState<string | null>(null);

  const [editingNoteText, setEditingNoteText] =
    useState('');

  const [noteActionLoading, setNoteActionLoading] =
    useState<string | null>(null);

  const [editingRepresentative, setEditingRepresentative] =
    useState(false);

  const [editForm, setEditForm] =
    useState<EditRepresentativeForm>(
      emptyEditForm,
    );

  const [savingRepresentative, setSavingRepresentative] =
    useState(false);

  const [editError, setEditError] =
    useState('');

  // ===== State های مربوط به آپلود فایل =====
  const [uploadModalOpen, setUploadModalOpen] =
    useState(false);

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [uploadError, setUploadError] =
    useState('');

  const [uploadSuccess, setUploadSuccess] =
    useState(false);

  const [dragActive, setDragActive] =
    useState(false);

  // فایل‌هایی که در همین نشست آپلود شدن تا وقتی parent لیست رو رفرش کنه، همینجا نگه داشته میشن
  const [localUploadedFiles, setLocalUploadedFiles] =
    useState<RepresentativeFile[]>([]);

  const safeFiles = Array.isArray(files)
    ? files
    : [];

  // ادغام فایل‌های props با فایل‌های تازه آپلودشده (بدون تکرار بر اساس نام فایل)
  const visibleFiles = useMemo(() => {
    const merged: RepresentativeFile[] = [];

    const seenNames = new Set<string>();

    [...safeFiles, ...localUploadedFiles].forEach(
      (file) => {
        const key = String(file.name ?? '')
          .trim()
          .toLowerCase();

        if (!key || seenNames.has(key)) {
          return;
        }

        seenNames.add(key);
        merged.push(file);
      },
    );

    return merged;
  }, [safeFiles, localUploadedFiles]);

  const safeApiUrl = useMemo(() => {
    const normalized = String(apiUrl || '')
      .trim()
      .replace(/\/+$/, '');

    if (!normalized) {
      return 'http://localhost:5000/api';
    }

    return normalized.endsWith('/api')
      ? normalized
      : `${normalized}/api`;
  }, [apiUrl]);

  const representativeId = String(
    currentRepresentative.id,
  ).trim();

  const warehouseUrl = representativeId
    ? `${safeApiUrl}/representatives/${encodeURIComponent(
        representativeId,
      )}/warehouse`
    : '';

  const notesUrl = representativeId
    ? `${safeApiUrl}/representatives/${encodeURIComponent(
        representativeId,
      )}/notes`
    : '';

  const salesUrl =
    `${safeApiUrl}/sales-from-warehouse/admin/all`;

  useEffect(() => {
    setCurrentRepresentative(representative);
  }, [representative]);

  const handleStartEditRepresentative = () => {
    setEditForm({
      name: currentRepresentative.name ?? '',
      email: currentRepresentative.email ?? '',
      code: String(
        currentRepresentative.code ?? '',
      ),
      province:
        currentRepresentative.province ?? '',
      city: currentRepresentative.city ?? '',
      phone: currentRepresentative.phone ?? '',
      startDate:
        currentRepresentative.startDate ?? '',
      status:
        currentRepresentative.status ===
        'inactive'
          ? 'inactive'
          : 'active',
      address:
        currentRepresentative.address ?? '',
      description:
        currentRepresentative.description ?? '',
      shopDescription:
        currentRepresentative.shopDescription ??
        '',
    });

    setEditError('');
    setEditingRepresentative(true);
  };

  const handleEditFormChange = (
    event: React.ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
    >,
  ) => {
    const { name, value } =
      event.currentTarget;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveRepresentative = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editForm.province.trim()) {
      setEditError('استان را وارد کنید.');
      return;
    }

    if (!editForm.city.trim()) {
      setEditError('شهر را وارد کنید.');
      return;
    }

    const token = getAdminToken();

    if (!token) {
      setEditError(
        'توکن ادمین پیدا نشد. دوباره وارد شوید.',
      );
      return;
    }

    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      code: editForm.code.trim(),
      province: editForm.province.trim(),
      city: editForm.city.trim(),
      phone: editForm.phone.trim(),
      startDate: editForm.startDate.trim(),
      status: editForm.status,
      address: editForm.address.trim(),
      description: editForm.description.trim(),
      shopDescription:
        editForm.shopDescription.trim(),
    };

    try {
      setSavingRepresentative(true);
      setEditError('');

      const response = await fetch(
        `${safeApiUrl}/representatives/${encodeURIComponent(
          representativeId,
        )}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await readApiResponse<
        ApiResponse<Representative>
      >(response);

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ||
            'ویرایش نماینده ناموفق بود.',
        );
      }

      setCurrentRepresentative(
        result.data,
      );

      onRepresentativeUpdated?.(
        result.data,
      );

      setEditingRepresentative(false);
    } catch (error) {
      console.error(
        'خطا در ویرایش نماینده:',
        error,
      );

      setEditError(
        error instanceof Error
          ? error.message
          : 'ویرایش نماینده ناموفق بود.',
      );
    } finally {
      setSavingRepresentative(false);
    }
  };

  const loadWarehouseSummary =
    useCallback(async () => {
      if (!warehouseUrl) {
        setWarehouseItems([]);
        setWarehouseError(
          'شناسه نماینده پیدا نشد.',
        );
        setWarehouseLoading(false);
        return;
      }

      const token = getAdminToken();

      if (!token) {
        setWarehouseItems([]);
        setWarehouseError(
          'توکن ادمین پیدا نشد.',
        );
        setWarehouseLoading(false);
        return;
      }

      try {
        setWarehouseLoading(true);
        setWarehouseError('');

        const response = await fetch(
          warehouseUrl,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const result = await readApiResponse<
          ApiResponse<RepresentativeWarehouseData>
        >(response);

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              'دریافت موجودی انبار ناموفق بود.',
          );
        }

        setWarehouseItems(
          Array.isArray(result.data?.items)
            ? result.data.items
            : [],
        );
      } catch (error) {
        setWarehouseItems([]);

        setWarehouseError(
          error instanceof Error
            ? error.message
            : 'دریافت موجودی انبار ناموفق بود.',
        );
      } finally {
        setWarehouseLoading(false);
      }
    }, [warehouseUrl]);

  const loadSalesReports =
    useCallback(async () => {
      const token = getAdminToken();

      if (!token) {
        setSalesReports([]);
        setSalesError(
          'برای مشاهده فروش‌ها وارد حساب ادمین شوید.',
        );
        setSalesLoading(false);
        return;
      }

      try {
        setSalesLoading(true);
        setSalesError('');

        const response = await fetch(
          salesUrl,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const result = await readApiResponse<
          ApiResponse<SalesReport[]>
        >(response);

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              'دریافت گزارش فروش ناموفق بود.',
          );
        }

        const reports = Array.isArray(result.data)
          ? result.data
          : [];

        setSalesReports(
          reports.filter(
            (report) =>
              String(
                report.representativeId,
              ) === representativeId,
          ),
        );
      } catch (error) {
        setSalesReports([]);

        setSalesError(
          error instanceof Error
            ? error.message
            : 'دریافت گزارش فروش ناموفق بود.',
        );
      } finally {
        setSalesLoading(false);
      }
    }, [salesUrl, representativeId]);

  const loadNotes = useCallback(async () => {
    if (!notesUrl) {
      setAdminNotes([]);
      setNoteError('شناسه نماینده پیدا نشد.');
      setNotesLoading(false);
      return;
    }

    const token = getAdminToken();

    if (!token) {
      setAdminNotes([]);
      setNoteError(
        'برای مشاهده یادداشت‌ها وارد حساب ادمین شوید.',
      );
      setNotesLoading(false);
      return;
    }

    try {
      setNotesLoading(true);
      setNoteError('');

      const response = await fetch(
        notesUrl,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await readApiResponse<
        ApiResponse<RepresentativeAdminNote[]>
      >(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            'دریافت یادداشت‌ها ناموفق بود.',
        );
      }

      setAdminNotes(
        Array.isArray(result.data)
          ? result.data
          : [],
      );
    } catch (error) {
      setAdminNotes([]);

      setNoteError(
        error instanceof Error
          ? error.message
          : 'دریافت یادداشت‌ها ناموفق بود.',
      );
    } finally {
      setNotesLoading(false);
    }
  }, [notesUrl]);

  useEffect(() => {
    void loadWarehouseSummary();
    void loadSalesReports();
    void loadNotes();
  }, [
    loadWarehouseSummary,
    loadSalesReports,
    loadNotes,
  ]);

  const handleAddNote = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const text = noteDraft.trim();

    if (!text || !notesUrl) {
      setNoteError(
        'متن یادداشت را وارد کنید.',
      );
      return;
    }

    const token = getAdminToken();

    if (!token) {
      setNoteError(
        'برای ثبت یادداشت وارد حساب ادمین شوید.',
      );
      return;
    }

    try {
      setNoteSaving(true);
      setNoteError('');

      const response = await fetch(
        notesUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        },
      );

      const result = await readApiResponse<
        ApiResponse<RepresentativeAdminNote>
      >(response);

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ||
            'ثبت یادداشت ناموفق بود.',
        );
      }

      setAdminNotes((current) => [
        result.data as RepresentativeAdminNote,
        ...current,
      ]);

      setNoteDraft('');
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : 'ثبت یادداشت ناموفق بود.',
      );
    } finally {
      setNoteSaving(false);
    }
  };

  const handleStartEditNote = (
    note: RepresentativeAdminNote,
  ) => {
    setEditingNoteId(String(note.id));
    setEditingNoteText(note.text);
    setNoteError('');
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
    setNoteActionLoading(null);
  };

  const handleEditNote = async (
    noteId: string,
  ) => {
    const text = editingNoteText.trim();

    if (!text || !notesUrl) {
      setNoteError(
        'متن یادداشت نمی‌تواند خالی باشد.',
      );
      return;
    }

    const token = getAdminToken();

    if (!token) {
      setNoteError(
        'برای ویرایش یادداشت دوباره وارد شوید.',
      );
      return;
    }

    try {
      setNoteActionLoading(noteId);
      setNoteError('');

      const response = await fetch(
        `${notesUrl}/${encodeURIComponent(noteId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        },
      );

      const result = await readApiResponse<
        ApiResponse<RepresentativeAdminNote>
      >(response);

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ||
            'ویرایش یادداشت ناموفق بود.',
        );
      }

      setAdminNotes((current) =>
        current.map((note) =>
          String(note.id) === noteId
            ? (result.data as RepresentativeAdminNote)
            : note,
        ),
      );

      handleCancelEditNote();
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : 'ویرایش یادداشت ناموفق بود.',
      );
    } finally {
      setNoteActionLoading(null);
    }
  };

  const handleDeleteNote = async (
    noteId: string,
  ) => {
    if (
      !window.confirm(
        'آیا از حذف این یادداشت مطمئن هستید؟',
      )
    ) {
      return;
    }

    if (!notesUrl) {
      return;
    }

    const token = getAdminToken();

    if (!token) {
      setNoteError(
        'برای حذف یادداشت دوباره وارد شوید.',
      );
      return;
    }

    try {
      setNoteActionLoading(noteId);

      const response = await fetch(
        `${notesUrl}/${encodeURIComponent(noteId)}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await readApiResponse<
        ApiResponse<RepresentativeAdminNote>
      >(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            'حذف یادداشت ناموفق بود.',
        );
      }

      setAdminNotes((current) =>
        current.filter(
          (note) => String(note.id) !== noteId,
        ),
      );
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : 'حذف یادداشت ناموفق بود.',
      );
    } finally {
      setNoteActionLoading(null);
    }
  };

  // ===== توابع آپلود فایل =====

  const ALLOWED_UPLOAD_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'zip',
    'rar',
  ];

  const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_UPLOAD_FILES = 10;

  const getFileExtension = (
    filename: string,
  ): string => {
    return String(filename || '')
      .split('.')
      .pop()
      ?.toLowerCase()
      ?.trim() || '';
  };

  const isFileAllowed = (
    file: File,
  ): boolean => {
    const ext = getFileExtension(file.name);
    return ALLOWED_UPLOAD_EXTENSIONS.includes(ext);
  };

  const isFileSizeAllowed = (
    file: File,
  ): boolean => {
    return (
      file.size > 0 && file.size <= MAX_UPLOAD_SIZE
    );
  };

  const formatFileSizeLabel = (
    bytes: number,
  ): string => {
    if (!bytes || bytes <= 0) return '—';

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
    setSelectedFiles([]);
    setUploadError('');
    setUploadSuccess(false);
  };

  const handleCloseUploadModal = () => {
    if (uploading) return;

    setUploadModalOpen(false);
    setSelectedFiles([]);
    setUploadError('');
    setUploadSuccess(false);
    setDragActive(false);
  };

  const handleFileSelect = (
    fileList: FileList | null,
  ) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const newFiles = Array.from(fileList);

    // فیلتر کردن فایل‌های نامعتبر
    const validFiles: File[] = [];
    const errors: string[] = [];

    newFiles.forEach((file) => {
      if (!isFileAllowed(file)) {
        errors.push(
          `نوع فایل "${file.name}" مجاز نیست.`,
        );
        return;
      }

      if (!isFileSizeAllowed(file)) {
        errors.push(
          `حجم فایل "${file.name}" بیشتر از ۱۰ مگابایت است.`,
        );
        return;
      }

      validFiles.push(file);
    });

    if (
      selectedFiles.length + validFiles.length >
      MAX_UPLOAD_FILES
    ) {
      errors.push(
        `حداکثر ${MAX_UPLOAD_FILES} فایل می‌توانید آپلود کنید.`,
      );
    }

    setSelectedFiles((current) => [
      ...current,
      ...validFiles.slice(
        0,
        MAX_UPLOAD_FILES - current.length,
      ),
    ]);

    setUploadError(errors.join(' '));
    setUploadSuccess(false);
  };

  const handleRemoveSelectedFile = (
    index: number,
  ) => {
    setSelectedFiles((current) =>
      current.filter((_, i) => i !== index),
    );
  };

  const handleDragEnter = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    handleFileSelect(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('حداقل یک فایل انتخاب کنید.');
      return;
    }

    const token = getAdminToken();

    if (!token) {
      setUploadError(
        'توکن ادمین پیدا نشد. دوباره وارد شوید.',
      );
      return;
    }

    if (!representativeId) {
      setUploadError(
        'شناسه نماینده پیدا نشد.',
      );
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadSuccess(false);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const uploadUrl = `${safeApiUrl}/representatives/${encodeURIComponent(
        representativeId,
      )}/files`;

      const response = await fetch(
        uploadUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: formData,
        },
      );

      const result = await readApiResponse<
        ApiResponse<{ files: RepresentativeFile[] }>
      >(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            'آپلود فایل‌ها ناموفق بود.',
        );
      }

      setUploadSuccess(true);

      // نمایش فوری فایل‌های تازه آپلودشده بدون نیاز به رفرش صفحه
      const uploadedFromResponse = Array.isArray(
        result.data?.files,
      )
        ? result.data.files
        : [];

      if (uploadedFromResponse.length > 0) {
        setLocalUploadedFiles((current) => [
          ...current,
          ...uploadedFromResponse,
        ]);
      } else {
        const optimisticFiles = selectedFiles.map(
          (file, index) =>
            ({
              id: `local-${Date.now()}-${index}`,
              name: file.name,
              size: formatFileSizeLabel(file.size),
              uploadedAt: new Intl.DateTimeFormat(
                'fa-IR',
              ).format(new Date()),
              representativeId: representativeId,
            }) as RepresentativeFile,
        );

        setLocalUploadedFiles((current) => [
          ...current,
          ...optimisticFiles,
        ]);
      }

      setSelectedFiles([]);

      // اطلاع به parent برای رفرش لیست فایل‌ها
      onRefreshFiles?.();

      // بستن مودال بعد از ۱.۵ ثانیه
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadSuccess(false);
      }, 1500);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'آپلود فایل‌ها ناموفق بود.',
      );
    } finally {
      setUploading(false);
    }
  };

  const storeItemsCount = useMemo(
    () =>
      warehouseItems.reduce(
        (sum, item) =>
          sum + toNumber(item.quantity),
        0,
      ),
    [warehouseItems],
  );

  const storeItemsTotalValue = useMemo(
    () =>
      warehouseItems.reduce(
        (sum, item) =>
          sum + toNumber(item.totalPrice),
        0,
      ),
    [warehouseItems],
  );

  const salesLast10Days = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    start.setDate(start.getDate() - 9);

    return salesReports
      .filter((report) => {
        const date = report.createdAt
          ? new Date(report.createdAt)
          : new Date(Number.NaN);

        return (
          !Number.isNaN(date.getTime()) &&
          date >= start &&
          date <= now
        );
      })
      .reduce(
        (sum, report) =>
          sum + toNumber(report.totalAmount),
        0,
      );
  }, [salesReports]);

  const salesInAllowedDays = useMemo(() => {
    const now = new Date();

    return salesReports
      .filter((report) => {
        const date = report.createdAt
          ? new Date(report.createdAt)
          : new Date(Number.NaN);

        return (
          !Number.isNaN(date.getTime()) &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear() &&
          [10, 20, 30].includes(
            date.getDate(),
          )
        );
      })
      .reduce(
        (sum, report) =>
          sum + toNumber(report.totalAmount),
        0,
      );
  }, [salesReports]);

  const depositAmount = toNumber(
    currentRepresentative.depositAmount,
  );

  const guaranteeCheck = toNumber(
    currentRepresentative.guaranteeCheck,
  );

  const totalFinancialCommitment =
    toNumber(
      currentRepresentative.totalFinancialCommitment,
    ) ||
    depositAmount + guaranteeCheck;

  return (
    <div dir="rtl" className="space-y-5">
      <style>
        {`
          @keyframes cardEnter {
            from {
              opacity: 0;
              transform: translateY(24px) scale(0.97);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes fileEnter {
            from {
              opacity: 0;
              transform: translateY(18px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-l from-slate-950 via-slate-900 to-blue-950 p-4 text-white shadow-[0_12px_30px_rgba(15,23,42,0.34)] md:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 min-w-0 flex-1 sm:order-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />

              <p className="text-xs font-bold text-cyan-200 md:text-sm">
                پنل مدیریت نمایندگی
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-right">
              <p className="text-sm font-bold text-slate-200 md:text-base">
                داشبورد نمایندگی{' '}

                <span className="text-white">
                  {getRepresentativeLocation(
                    currentRepresentative,
                  )}
                </span>
              </p>

              <span className="hidden h-6 w-px bg-slate-600 sm:block">
                |
              </span>

              <h2 className="text-xl font-black leading-9 text-white md:text-2xl">
                جناب آقای{' '}

                <span className="text-cyan-200">
                  {currentRepresentative.name ||
                    'نماینده'}
                </span>
              </h2>
            </div>
          </div>

          <div className="order-1 flex gap-2 sm:order-2">
            <button
              type="button"
              onClick={
                handleStartEditRepresentative
              }
              className="flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-400/20 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-400/30"
            >
              ویرایش
            </button>

            <button
              type="button"
              onClick={onBack}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-500 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </button>
          </div>
        </div>
      </section>

      {editingRepresentative ? (
        <section className="rounded-[28px] border border-blue-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 md:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-gray-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-gray-100">
              ویرایش اطلاعات نماینده
            </h3>

            <button
              type="button"
              onClick={() => {
                setEditingRepresentative(false);
                setEditError('');
              }}
              className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-100"
            >
              انصراف
            </button>
          </div>

          <form
            onSubmit={handleSaveRepresentative}
            className="space-y-5"
          >
            <div>
              <h4 className="mb-4 text-base font-black text-slate-800 dark:text-gray-100">
                اطلاعات پایه نماینده
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    نام نماینده*
                  </span>

                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    ایمیل
                  </span>

                  <input
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditFormChange}
                    placeholder="example@email.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    کد نمایندگی*
                  </span>

                  <input
                    name="code"
                    value={editForm.code}
                    onChange={handleEditFormChange}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    استان*
                  </span>

                  <input
                    name="province"
                    value={editForm.province}
                    onChange={handleEditFormChange}
                    required
                    placeholder="مثلاً قزوین"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    شهر*
                  </span>

                  <input
                    name="city"
                    value={editForm.city}
                    onChange={handleEditFormChange}
                    required
                    placeholder="مثلاً مهرگان"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    تلفن*
                  </span>

                  <input
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditFormChange}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    تاریخ قرارداد شمسی
                  </span>

                  <input
                    name="startDate"
                    value={editForm.startDate}
                    onChange={handleEditFormChange}
                    placeholder="۱۴۰۳/۰۱/۰۱"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    وضعیت
                  </span>

                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="active">
                      فعال
                    </option>

                    <option value="inactive">
                      غیرفعال
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-base font-black text-slate-800 dark:text-gray-100">
                آدرس و توضیحات
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    آدرس دقیق
                  </span>

                  <textarea
                    name="address"
                    value={editForm.address}
                    onChange={handleEditFormChange}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    توضیحات
                  </span>

                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditFormChange}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-bold text-slate-700 dark:text-gray-200">
                    متراژ مغازه
                  </span>

                  <textarea
                    name="shopDescription"
                    value={editForm.shopDescription}
                    onChange={handleEditFormChange}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>
              </div>
            </div>

            {editError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {editError}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingRepresentative}
                className="min-h-11 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingRepresentative
                  ? 'در حال ذخیره...'
                  : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-blue-700" />

          <h3 className="text-base font-black text-slate-800 dark:text-gray-100 sm:text-lg">
            اطلاعات پایه و تعهدات مالی
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            index={0}
            title="کد نمایندگی"
          >
            <p className="text-4xl font-black text-slate-800 dark:text-gray-100">
              {currentRepresentative.code
                ? toPersianNumber(
                    currentRepresentative.code,
                  )
                : '—'}
            </p>
          </DashboardCard>

          <DashboardCard
            index={1}
            title="استان — شهر نمایندگی"
          >
            <p
              title={getRepresentativeLocation(
                currentRepresentative,
              )}
              className="truncate text-3xl font-black text-slate-800 dark:text-gray-100"
            >
              {getRepresentativeLocation(
                currentRepresentative,
              )}
            </p>
          </DashboardCard>

          <DashboardCard
            index={2}
            title="تاریخ قرارداد شمسی"
          >
            <div className="space-y-2">
              <p className="text-3xl font-black text-slate-800 dark:text-gray-100">
                {currentRepresentative.startDate ||
                  '—'}
              </p>

              <p className="text-sm font-bold text-slate-500 dark:text-gray-400">
                تاریخ شروع همکاری
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={3}
            title="مبلغ ودیعه"
          >
            <div>
              <p
                dir="ltr"
                className="truncate text-2xl font-black text-slate-800 dark:text-gray-100 sm:text-3xl"
              >
                {formatPrice(depositAmount)}
              </p>

              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                تومان
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={4}
            title="مبلغ چک ضمانت"
          >
            <div>
              <p
                dir="ltr"
                className="truncate text-2xl font-black text-slate-800 dark:text-gray-100 sm:text-3xl"
              >
                {formatPrice(guaranteeCheck)}
              </p>

              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                تومان
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={5}
            title="مجموع تعهد مالی"
          >
            <div>
              <p
                dir="ltr"
                className="truncate text-2xl font-black text-slate-800 dark:text-gray-100 sm:text-3xl"
              >
                {formatPrice(
                  totalFinancialCommitment,
                )}
              </p>

              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                تومان
              </p>
            </div>
          </DashboardCard>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-gray-800 dark:bg-gray-900 sm:p-5 md:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-black text-slate-800 dark:text-gray-100 sm:text-lg">
          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          آدرس و توضیحات نماینده
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-slate-50 p-4 dark:bg-gray-800 md:col-span-2">
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-gray-400">
              آدرس دقیق
            </p>

            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-gray-100">
              {currentRepresentative.address ||
                'ثبت نشده'}
            </p>
          </div>

          <div className="min-w-0 rounded-xl bg-slate-50 p-4 dark:bg-gray-800">
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-gray-400">
              توضیحات
            </p>

            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-gray-100">
              {currentRepresentative.description ||
                'ثبت نشده'}
            </p>
          </div>

          <div className="min-w-0 rounded-xl bg-slate-50 p-4 dark:bg-gray-800">
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-gray-400">
              متراژ مغازه
            </p>

            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-gray-100">
              {currentRepresentative.shopDescription ||
                'ثبت نشده'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-emerald-600" />

            <h3 className="text-base font-black text-slate-800 dark:text-gray-100 sm:text-lg">
              عملکرد نمایندگی
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadWarehouseSummary();
            }}
            disabled={warehouseLoading}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                warehouseLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            بروزرسانی موجودی
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            index={6}
            title="تعداد ارسال بار"
          >
            <div className="flex items-center justify-center gap-2">
              <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" />

              <p className="text-4xl font-black text-slate-800 dark:text-gray-100">
                {toPersianNumber(
                  currentRepresentative.shipmentsCount ??
                    0,
                )}
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={7}
            title="تعداد اقلام موجود در انبار فروشگاه"
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="h-8 w-8 text-purple-600 dark:text-purple-400" />

              <p className="text-4xl font-black text-slate-800 dark:text-gray-100">
                {warehouseLoading
                  ? '...'
                  : toPersianNumber(
                      storeItemsCount,
                    )}
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={8}
            title="مجموع مبلغ اجناس فروشگاه"
          >
            <div>
              <div className="flex items-center justify-center gap-2">
                <Store className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />

                <p
                  dir="ltr"
                  className="truncate text-2xl font-black text-slate-800 dark:text-gray-100 sm:text-3xl"
                >
                  {warehouseLoading
                    ? '...'
                    : formatPrice(
                        storeItemsTotalValue,
                      )}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                تومان
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={9}
            title="درخواست‌های مرجوعی"
          >
            <div className="flex items-center justify-center gap-2">
              <RotateCcw className="h-8 w-8 text-orange-600 dark:text-orange-400" />

              <p className="text-4xl font-black text-slate-800 dark:text-gray-100">
                {toPersianNumber(
                  currentRepresentative.returnRequestsCount ??
                    0,
                )}
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={10}
            title="فروش ۱۰ روز گذشته"
          >
            <div>
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />

                <p
                  dir="ltr"
                  className="truncate text-2xl font-black text-slate-800 dark:text-gray-100 sm:text-3xl"
                >
                  {salesLoading
                    ? '...'
                    : formatPrice(
                        salesLast10Days,
                      )}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                تومان
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            index={11}
            title="فروش ۳ روز مجاز ماه"
          >
            <div>
              <div className="flex items-center justify-center gap-2">
                <CalendarDays className="h-8 w-8 text-amber-600 dark:text-amber-400" />

                <p
                  dir="ltr"
                  className="truncate text-2xl font-black text-slate-800 dark:text-gray-100 sm:text-3xl"
                >
                  {salesLoading
                    ? '...'
                    : formatPrice(
                        salesInAllowedDays,
                      )}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-gray-400">
                تومان
              </p>
            </div>
          </DashboardCard>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white p-4 shadow-[0_12px_30px_rgba(55,104,180,0.14)] dark:border-gray-800 dark:bg-gray-900 md:p-6">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 border-b border-blue-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-gray-100 md:text-2xl">
              <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              پرونده‌ها و اسناد نماینده
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 md:text-sm">
              مشاهده و مدیریت فایل‌های مربوط به{' '}
              {currentRepresentative.name ||
                'نماینده'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 md:text-sm">
              {toPersianNumber(visibleFiles.length)} پرونده
            </span>

            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 md:text-sm"
            >
              <Upload className="h-4 w-4" />
              آپلود فایل
            </button>
          </div>
        </div>

        {loadingFiles ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl bg-blue-50 p-6 text-center dark:bg-gray-800">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />

            <p className="text-sm font-bold text-slate-600 dark:text-gray-300">
              در حال بارگذاری پرونده‌ها...
            </p>
          </div>
        ) : visibleFiles.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <FileX className="mb-3 h-16 w-16 text-blue-300 dark:text-gray-600" />

            <p className="text-base font-black text-slate-700 dark:text-gray-300">
              هنوز پرونده‌ای برای این نماینده ثبت نشده است.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleFiles.map((file, index) => {
              const imageFile = isImageFile(file);

              const fileRepresentativeId =
                String(
                  file.representativeId ??
                    representativeId,
                );

              const viewUrl = `${safeApiUrl}/representatives/${encodeURIComponent(
                fileRepresentativeId,
              )}/files/${encodeURIComponent(
                file.name,
              )}/view`;

              const downloadUrl = `${safeApiUrl}/representatives/${encodeURIComponent(
                fileRepresentativeId,
              )}/files/${encodeURIComponent(
                file.name,
              )}/download`;

              return (
                <article
                  key={file.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  style={{
                    animation: `fileEnter 450ms ease-out ${
                      index * 65
                    }ms both`,
                  }}
                >
                  {imageFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        onViewFile?.(file);
                      }}
                      className="relative block h-44 w-full overflow-hidden bg-slate-100 dark:bg-gray-700"
                    >
                      <img
                        src={viewUrl}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onViewFile?.(file);
                      }}
                      className="flex h-44 w-full flex-col items-center justify-center bg-blue-50 dark:bg-gray-700"
                    >
                      <FileText className="h-16 w-16 text-blue-400" />

                      <span className="mt-3 text-xs font-bold text-slate-500 dark:text-gray-300">
                        برای مشاهده کلیک کنید
                      </span>
                    </button>
                  )}

                  <div className="p-4">
                    <p
                      title={file.name}
                      className="truncate text-sm font-black text-slate-800 dark:text-gray-100"
                    >
                      {file.name}
                    </p>

                    <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-gray-400">
                      <span>
                        {file.size || '—'}
                      </span>

                      <span>
                        {file.uploadedAt || '—'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onViewFile?.(file);
                        }}
                        className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-xs font-bold text-white"
                      >
                        <Eye className="h-4 w-4" />
                        مشاهده
                      </button>

                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-bold text-white"
                      >
                        <Download className="h-4 w-4" />
                        دانلود
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setLocalUploadedFiles(
                            (current) =>
                              current.filter(
                                (localFile) =>
                                  String(localFile.name) !==
                                  String(file.name),
                              ),
                          );

                          onDeleteFile?.(file.id);
                        }}
                        className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-2 text-xs font-bold text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white p-4 shadow-[0_12px_30px_rgba(55,104,180,0.14)] dark:border-gray-800 dark:bg-gray-900 md:p-6">
        <div className="mb-5 border-b border-blue-100 pb-4 dark:border-gray-800">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-gray-100 md:text-2xl">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            یادداشت‌های ادمین
          </h3>
        </div>

        <form
          onSubmit={handleAddNote}
          className="space-y-3"
        >
          <label className="block text-sm font-bold text-slate-700 dark:text-gray-200">
            متن یادداشت
          </label>

          <textarea
            value={noteDraft}
            onChange={(event) => {
              setNoteDraft(event.target.value);
              setNoteError('');
            }}
            rows={4}
            maxLength={3000}
            disabled={noteSaving}
            placeholder="یادداشت خود را درباره این نماینده بنویسید..."
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />

          {noteError ? (
            <p className="text-xs font-bold text-red-600 dark:text-red-400">
              {noteError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                noteSaving ||
                !noteDraft.trim()
              }
              className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {noteSaving
                ? 'در حال ثبت...'
                : 'ثبت یادداشت'}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-gray-800">
          <h4 className="mb-3 text-sm font-black text-slate-800 dark:text-gray-100">
            یادداشت‌های ثبت‌شده
          </h4>

          {notesLoading ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:bg-gray-800 dark:text-gray-400">
              در حال دریافت یادداشت‌ها...
            </p>
          ) : adminNotes.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:bg-gray-800 dark:text-gray-400">
              هنوز یادداشتی ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-3">
              {adminNotes.map((note) => {
                const noteId = String(note.id);

                const isEditing =
                  editingNoteId === noteId;

                const isLoading =
                  noteActionLoading === noteId;

                return (
                  <article
                    key={noteId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {isEditing ? (
                      <textarea
                        value={editingNoteText}
                        onChange={(event) => {
                          setEditingNoteText(
                            event.target.value,
                          );
                        }}
                        rows={4}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm leading-7 outline-none dark:border-blue-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-gray-100">
                        {note.text}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <time className="text-xs text-slate-500 dark:text-gray-400">
                        {new Intl.DateTimeFormat(
                          'fa-IR',
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          },
                        ).format(
                          new Date(note.createdAt),
                        )}
                      </time>

                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                void handleEditNote(
                                  noteId,
                                );
                              }}
                              disabled={
                                isLoading ||
                                !editingNoteText.trim()
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              ذخیره ویرایش
                            </button>

                            <button
                              type="button"
                              onClick={
                                handleCancelEditNote
                              }
                              className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                            >
                              انصراف
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleStartEditNote(
                                note,
                              );
                            }}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            ویرایش
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteNote(
                              noteId,
                            );
                          }}
                          disabled={isLoading}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== مودال آپلود فایل ===== */}
      {uploadModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={handleCloseUploadModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {/* هدر مودال */}
            <div className="flex items-center justify-between border-b border-blue-100 p-5 dark:border-gray-800">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-gray-100">
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                آپلود فایل برای {currentRepresentative.name || 'نماینده'}
              </h3>

              <button
                type="button"
                onClick={handleCloseUploadModal}
                disabled={uploading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* بدنه مودال */}
            <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-5">
              {uploadSuccess ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <CheckCircle2 className="mb-3 h-16 w-16 text-emerald-500" />
                  <p className="text-base font-black text-slate-700 dark:text-gray-200">
                    فایل‌ها با موفقیت آپلود شد.
                  </p>
                </div>
              ) : (
                <>
                  {/* منطقه‌ی drag & drop */}
                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-blue-200 bg-blue-50/50 hover:border-blue-400 dark:border-gray-700 dark:bg-gray-800/50'
                    }`}
                    onClick={() => {
                      document.getElementById('file-input-upload')?.click();
                    }}
                  >
                    <Upload className="mb-3 h-12 w-12 text-blue-500" />

                    <p className="text-sm font-black text-slate-700 dark:text-gray-200">
                      فایل‌ها را اینجا رها کنید یا کلیک کنید
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      حداکثر ۱۰ فایل، هر کدام تا ۱۰ مگابایت
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400 dark:text-gray-500">
                      انواع مجاز: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, ZIP, RAR
                    </p>

                    <input
                      id="file-input-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        handleFileSelect(event.target.files);
                        // ریست کردن input تا همون فایل رو بشه دوباره انتخاب کرد
                        event.target.value = '';
                      }}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                    />
                  </div>

                  {/* لیست فایل‌های انتخاب‌شده */}
                  {selectedFiles.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-black text-slate-700 dark:text-gray-200">
                        فایل‌های انتخاب‌شده ({toPersianNumber(selectedFiles.length)}):
                      </p>

                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />

                            <div className="min-w-0 flex-1">
                              <p
                                title={file.name}
                                className="truncate text-sm font-bold text-slate-700 dark:text-gray-200"
                              >
                                {file.name}
                              </p>

                              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                                {formatFileSizeLabel(file.size)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveSelectedFile(index);
                            }}
                            disabled={uploading}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* پیام خطا */}
                  {uploadError ? (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* فوتر مودال */}
            {!uploadSuccess ? (
              <div className="flex items-center justify-end gap-2 border-t border-blue-100 p-5 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                  className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={
                    uploading ||
                    selectedFiles.length === 0
                  }
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال آپلود...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      آپلود {selectedFiles.length > 0 ? `(${toPersianNumber(selectedFiles.length)} فایل)` : ''}
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RepresentativeDashboard;
