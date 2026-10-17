import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Navigate } from 'react-router-dom';
import axios from 'axios';

import Navbar from './componets/Navbar';
import Sidebar from './componets/Sidebar';
import EditModal from './componets/EditModal';
import MainContent from './componets/MainContent';
import FileViewerModal from './componets/FileViewerModal';
import Warehouse from './componets/Warehouse';
import RepresentativeWarehouseDashboard from './componets/RepresentativeWarehouseDashboard';
import ProductsTable from './componets/ProductsTable';
import Support from './componets/user-dashboard/Support';
import AdminSupportRequests from './componets/AdminSupportRequests';
import UserDashboardPage from './pages/UserDashboardPage';
import RepresentativeWarrantyPage from './componets/RepresentativeWarrantyPage';
import AdminWarrantiesPage from './pages/AdminWarrantiesPage';
import NotesPage from './componets/NotesPage';

import { useProducts } from './hooks/useProducts';
import { useRepresentativeFiles } from './hooks/useRepresentativeFiles';
import { useRepresentatives } from './hooks/useRepresentatives';

import type {
  Representative,
  Section,
} from './types';

type AuthRole =
  | 'admin'
  | 'representative';

interface AuthUser {
  id?: string | number;
  username?: string;
  name?: string;
  email?: string;
  role?: AuthRole;
  representativeId?: string | number;
  code?: string | number;
  city?: string;
  province?: string;
  phone?: string;
}

interface Shipment {
  id: string | number;
  status?: string;
  shipmentNumber?: string;
  representativeId?: string | number;
  representativeName?: string;
  representativeCode?: string | number;
  representativeProvince?: string;
  representativeCity?: string;
  warehouse?: string;
  items?: Array<{
    productName: string;
    brand?: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  itemsCount?: number;
  totalItems?: number;
  totalValue?: number;
  shipmentDate?: string;
  createdAt?: string;
  updatedAt?: string;
  excelFileName?: string;
}

interface SaleReportItem {
  productId?: string;
  productName?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
}

interface SaleReportLike {
  id?: string | number;
  representativeId?: string | number;
  representativeName?: string;
  representativeCode?: string | number;
  saleDate?: string;
  saleDateJalali?: string;
  createdAt?: string;
  totalAmount?: number | string;
  items?: SaleReportItem[];
}

const normalizeApiUrl = (
  value: string,
): string => {
  const cleanValue = String(value || '')
    .trim()
    .replace(/\/+$/, '');

  if (!cleanValue) {
    return 'http://localhost:5000/api';
  }

  return cleanValue.endsWith('/api')
    ? cleanValue
    : `${cleanValue}/api`;
};

const API_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api',
);

const ADMIN_SECTIONS: Section[] = [
  'dashboard',
  'products',
  'representatives',
  'upload',
  'shipments',
  'warehouse',
  'sales-reports',
  'return-requests',
  'support-requests',
  'reports',
  'users',
  'settings',
  'notes',
  'warranties',
];

const REPRESENTATIVE_SECTIONS: Section[] = [
  'dashboard',
  'products',
  'orders',
  'my-shipments',
  'warehouse',
  'sales-reports',
  'return-request',
  'support',
  'profile',
  'notes',
  'warranties',
];

const getSavedSection = (): Section => {
  const savedSection =
    sessionStorage.getItem(
      'activeSection',
    );

  const allSections = [
    ...ADMIN_SECTIONS,
    ...REPRESENTATIVE_SECTIONS,
  ];

  if (
    savedSection &&
    allSections.includes(
      savedSection as Section,
    )
  ) {
    return savedSection as Section;
  }

  return 'dashboard';
};

const getAuthUser = (): AuthUser | null => {
  try {
    const raw =
      sessionStorage.getItem(
        'authUser',
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const getAuthRole = (): AuthRole | null => {
  const user = getAuthUser();

  if (
    user?.role === 'admin' ||
    user?.role === 'representative'
  ) {
    return user.role;
  }

  const savedRole =
    sessionStorage.getItem('userRole');

  if (savedRole === 'admin') {
    return 'admin';
  }

  if (
    savedRole === 'representative' ||
    savedRole === 'user'
  ) {
    return 'representative';
  }

  return null;
};

const getToken = (): string => {
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

  for (const storage of [
    sessionStorage,
    localStorage,
  ]) {
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
  }

  for (const storage of [
    sessionStorage,
    localStorage,
  ]) {
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

const getAuthHeaders = () => {
  const token = getToken();

  return {
    Accept: 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

const extractSalesReports = (
  payload: unknown,
): SaleReportLike[] => {
  if (Array.isArray(payload)) {
    return payload as SaleReportLike[];
  }

  const obj = payload as {
    data?: unknown;
    reports?: unknown;
    salesReports?: unknown;
  };

  if (Array.isArray(obj?.data)) {
    return obj.data as SaleReportLike[];
  }

  if (Array.isArray(obj?.reports)) {
    return obj.reports as SaleReportLike[];
  }

  if (
    Array.isArray(obj?.salesReports)
  ) {
    return obj.salesReports as SaleReportLike[];
  }

  if (
    obj?.data &&
    typeof obj.data === 'object'
  ) {
    const nested = (
      obj.data as { data?: unknown }
    )?.data;

    if (Array.isArray(nested)) {
      return nested as SaleReportLike[];
    }
  }

  return [];
};

function App() {
  const authUser = useMemo(
    () => getAuthUser(),
    [],
  );

  const authRole = useMemo(
    () => getAuthRole(),
    [],
  );

  const isRepresentative =
    authRole === 'representative';

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [activeSection, setActiveSection] =
    useState<Section>(getSavedSection);

  const [viewingRepDashboard, setViewingRepDashboard] =
    useState<string | null>(null);

  const [
    viewingRepresentativeWarehouse,
    setViewingRepresentativeWarehouse,
  ] = useState<string | null>(null);

  const [shipments, setShipments] =
    useState<Shipment[]>([]);

  const [salesReports, setSalesReports] =
    useState<SaleReportLike[]>([]);

  const loadShipments = useCallback(
    async () => {
      if (isRepresentative) {
        return;
      }

      if (!getToken()) {
        return;
      }

      try {
        const response =
          await axios.get<{
            success?: boolean;
            data?: Shipment[];
            error?: string;
          }>(
            `${API_URL}/shipments`,
            {
              withCredentials: true,
              headers: getAuthHeaders(),
              params: {
                _: Date.now(),
              },
            },
          );

        if (
          response.data.success === false
        ) {
          throw new Error(
            response.data.error ||
              'دریافت بارها ناموفق بود.',
          );
        }

        setShipments(
          Array.isArray(
            response.data.data,
          )
            ? response.data.data
            : [],
        );
      } catch (error) {
        console.error(
          '❌ خطا در دریافت بارها:',
          error,
        );
      }
    },
    [isRepresentative],
  );

  const loadSalesReports = useCallback(
    async () => {
      if (isRepresentative) {
        return;
      }

      if (!getToken()) {
        return;
      }

      const endpoints = [
        '/sales-reports',
        '/sale-reports',
        '/sales',
        '/sales/announcements',
      ];

      for (const endpoint of endpoints) {
        try {
          const response =
            await axios.get(
              `${API_URL}${endpoint}`,
              {
                withCredentials: true,
                headers:
                  getAuthHeaders(),
                params: {
                  _: Date.now(),
                },
              },
            );

          const list =
            extractSalesReports(
              response.data,
            );

          setSalesReports(list);

          console.log(
            `✅ گزارش‌های فروش از «${endpoint}» دریافت شد (${list.length} مورد)`,
          );

          return;
        } catch {
          continue;
        }
      }

      console.warn(
        '⚠️ هیچ endpoint گزارش فروشی پیدا نشد. لطفاً endpoint اعلام فروش را بررسی کنید.',
      );
    },
    [isRepresentative],
  );

  useEffect(() => {
    if (!isRepresentative) {
      void loadShipments();
    }
  }, [
    isRepresentative,
    loadShipments,
  ]);

  useEffect(() => {
    if (isRepresentative) {
      return;
    }

    if (
      activeSection === 'dashboard' ||
      activeSection === 'sales-reports' ||
      activeSection === 'reports'
    ) {
      void loadSalesReports();
    }
  }, [
    activeSection,
    isRepresentative,
    loadSalesReports,
  ]);

  const {
    products,
    editingProduct,
    setEditingProduct,
    loadProducts,
    handleEdit,
    handleDelete,
    totalProducts,
    totalPrice,
  } = useProducts({
    apiUrl: API_URL,
  });

  const {
    representatives,
    addRepresentative,
    updateRepresentative,
    deleteRepresentative,
    loadRepresentatives,
  } = useRepresentatives({
    apiUrl: API_URL,
    isAdmin: authRole === 'admin',
  });

  const {
    files: representativeFiles,
    loadingFiles,
    viewingFile,
    setViewingFile,
    deleteFile,
  } = useRepresentativeFiles({
    apiUrl: API_URL,
    representativeId: viewingRepDashboard,
  });

  const handleDeleteFile = useCallback(
    async (
      fileId: string | number,
    ): Promise<void> => {
      await deleteFile(String(fileId));
    },
    [deleteFile],
  );

  const handleProductsUploaded =
    useCallback(async () => {
      console.log(
        '🔄 شروع بروزرسانی محصولات بعد از آپلود',
      );

      await loadProducts();

      console.log(
        '✅ محصولات بعد از آپلود بروزرسانی شدند',
      );
    }, [loadProducts]);

  const handleWarehouseChanged =
    useCallback(async () => {
      await loadRepresentatives();
    }, [loadRepresentatives]);

  useEffect(() => {
    if (
      isRepresentative &&
      !REPRESENTATIVE_SECTIONS.includes(
        activeSection,
      )
    ) {
      setActiveSection('dashboard');

      sessionStorage.setItem(
        'activeSection',
        'dashboard',
      );
    }
  }, [
    activeSection,
    isRepresentative,
  ]);

  useEffect(() => {
    sessionStorage.setItem(
      'activeSection',
      activeSection,
    );
  }, [activeSection]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [
    activeSection,
    viewingRepDashboard,
    viewingRepresentativeWarehouse,
  ]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(
        window.innerWidth >= 1024,
      );
    };

    handleResize();

    window.addEventListener(
      'resize',
      handleResize,
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize,
      );
    };
  }, []);

  useEffect(() => {
    if (
      isRepresentative &&
      activeSection === 'products'
    ) {
      void loadProducts();
    }
  }, [
    activeSection,
    isRepresentative,
    loadProducts,
  ]);

  const closeRepresentativeDashboard =
    () => {
      setViewingRepDashboard(null);
      setViewingRepresentativeWarehouse(
        null,
      );
      setViewingFile(null);
    };

  const handleSectionChange = (
    section: Section,
  ) => {
    if (
      isRepresentative &&
      !REPRESENTATIVE_SECTIONS.includes(
        section,
      )
    ) {
      alert(
        '🔒 اجازه ورود به این بخش را ندارید.',
      );

      return;
    }

    if (
      !isRepresentative &&
      !ADMIN_SECTIONS.includes(section)
    ) {
      return;
    }

    closeRepresentativeDashboard();
    setActiveSection(section);

    sessionStorage.setItem(
      'activeSection',
      section,
    );

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleOpenRepDashboard = (
    representativeId: string | number,
  ) => {
    if (isRepresentative) {
      alert(
        '🔒 اجازه ورود به این بخش را ندارید.',
      );

      return;
    }

    const exists = representatives.some(
      (representative) =>
        String(representative.id) ===
        String(representativeId),
    );

    if (!exists) {
      alert(
        'نماینده موردنظر پیدا نشد. صفحه را رفرش کنید.',
      );

      return;
    }

    setActiveSection('representatives');
    setViewingRepresentativeWarehouse(
      null,
    );
    setViewingFile(null);
    setViewingRepDashboard(
      String(representativeId),
    );

    sessionStorage.setItem(
      'activeSection',
      'representatives',
    );
  };

  const handleBackToRepList = () => {
    closeRepresentativeDashboard();
    setActiveSection('representatives');

    sessionStorage.setItem(
      'activeSection',
      'representatives',
    );
  };

  const handleRepresentativeUpdated =
    async (
      updatedRepresentative: Representative,
    ) => {
      await updateRepresentative(
        String(updatedRepresentative.id),
        {
          ...updatedRepresentative,
          name:
            updatedRepresentative.name?.trim() ||
            '',
          email:
            updatedRepresentative.email?.trim() ||
            '',
          province:
            updatedRepresentative.province?.trim() ||
            '',
          city:
            updatedRepresentative.city?.trim() ||
            '',
          phone:
            updatedRepresentative.phone?.trim() ||
            '',
          code: String(
            updatedRepresentative.code ?? '',
          ).trim(),
          address:
            updatedRepresentative.address?.trim() ||
            '',
          description:
            updatedRepresentative.description?.trim() ||
            '',
          shopDescription:
            updatedRepresentative.shopDescription?.trim() ||
            '',
        },
      );

      await loadRepresentatives();
    };

  const handleAddRepresentative =
    async (
      data: Partial<Representative>,
    ): Promise<void> => {
      await addRepresentative({
        name: data.name?.trim() || '',
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        province:
          data.province?.trim() || '',
        city:
          data.city?.trim() || '',
        code: String(
          data.code ?? '',
        ).trim(),
        address:
          data.address?.trim() || '',
        description:
          data.description?.trim() || '',
        shopDescription:
          data.shopDescription?.trim() || '',
        orders: Number(data.orders) || 0,
        status:
          data.status === 'inactive'
            ? 'inactive'
            : 'active',
        startDate: data.startDate || '',
        depositAmount:
          data.depositAmount || '0',
        guaranteeCheck:
          data.guaranteeCheck || '0',
        totalFinancialCommitment:
          data.totalFinancialCommitment || '0',
        shipmentsCount:
          Number(data.shipmentsCount) || 0,
        storeItemsCount:
          Number(data.storeItemsCount) || 0,
        storeItemsTotalValue:
          Number(data.storeItemsTotalValue) || 0,
        returnRequestsCount:
          Number(data.returnRequestsCount) || 0,
        last10DaysSales:
          Number(data.last10DaysSales) || 0,
        averageSales:
          Number(data.averageSales) || 0,
      });

      await loadRepresentatives();

      setActiveSection('representatives');

      sessionStorage.setItem(
        'activeSection',
        'representatives',
      );
    };

  const handleEditRepresentative =
    async (
      id: string,
      data: Partial<Representative>,
    ): Promise<void> => {
      await updateRepresentative(id, {
        ...data,
        name: data.name?.trim() || '',
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        province:
          data.province?.trim() || '',
        city:
          data.city?.trim() || '',
        code: String(
          data.code ?? '',
        ).trim(),
        address:
          data.address?.trim() || '',
        description:
          data.description?.trim() || '',
        shopDescription:
          data.shopDescription?.trim() || '',
        orders: Number(data.orders) || 0,
        status:
          data.status === 'inactive'
            ? 'inactive'
            : 'active',
        startDate: data.startDate || '',
        depositAmount:
          data.depositAmount || '0',
        guaranteeCheck:
          data.guaranteeCheck || '0',
        totalFinancialCommitment:
          data.totalFinancialCommitment || '0',
        shipmentsCount:
          Number(data.shipmentsCount) || 0,
        storeItemsCount:
          Number(data.storeItemsCount) || 0,
        storeItemsTotalValue:
          Number(data.storeItemsTotalValue) || 0,
        returnRequestsCount:
          Number(data.returnRequestsCount) || 0,
        last10DaysSales:
          Number(data.last10DaysSales) || 0,
        averageSales:
          Number(data.averageSales) || 0,
      });

      await loadRepresentatives();
    };

  const handleDeleteRepresentative =
    async (
      id: string,
    ): Promise<void> => {
      await deleteRepresentative(id);

      if (
        viewingRepDashboard &&
        String(viewingRepDashboard) ===
          String(id)
      ) {
        closeRepresentativeDashboard();
      }

      if (
        viewingRepresentativeWarehouse &&
        String(
          viewingRepresentativeWarehouse,
        ) === String(id)
      ) {
        closeRepresentativeDashboard();
      }

      await loadRepresentatives();

      setActiveSection('representatives');

      sessionStorage.setItem(
        'activeSection',
        'representatives',
      );
    };

  const selectedRepresentative = useMemo(() => {
    if (!viewingRepDashboard) {
      return null;
    }

    return (
      representatives.find(
        (representative) =>
          String(representative.id) ===
          String(viewingRepDashboard),
      ) || null
    );
  }, [
    representatives,
    viewingRepDashboard,
  ]);

  const selectedWarehouseRepresentative =
    useMemo(() => {
      if (!viewingRepresentativeWarehouse) {
        return null;
      }

      return (
        representatives.find(
          (representative) =>
            String(representative.id) ===
            String(
              viewingRepresentativeWarehouse,
            ),
        ) || null
      );
    }, [
      representatives,
      viewingRepresentativeWarehouse,
    ]);

  const adminPageTitle =
    viewingRepresentativeWarehouse
      ? `انبار ${
          selectedWarehouseRepresentative?.name ||
          ''
        }`
      : viewingRepDashboard
        ? `داشبورد ${
            selectedRepresentative?.name ||
            ''
          }`
        : activeSection === 'dashboard'
          ? 'داشبورد'
          : activeSection === 'products'
            ? 'لیست قیمت‌ها'
            : activeSection ===
                'representatives'
              ? 'لیست نمایندگان'
              : activeSection === 'upload'
                ? 'آپلود اکسل'
                : activeSection === 'shipments'
                  ? 'ارسال بار'
                  : activeSection ===
                      'warehouse'
                    ? 'انبار نمایندگان'
                    : activeSection ===
                        'sales-reports'
                      ? 'اعلام فروش نمایندگان'
                      : activeSection ===
                          'return-requests'
                        ? 'درخواست‌های مرجوعی'
                        : activeSection ===
                            'support-requests'
                          ? 'رسیدگی به درخواست‌ها'
                          : activeSection ===
                              'reports'
                            ? 'گزارشات'
                            : activeSection ===
                                'users'
                              ? 'مدیریت کاربران'
                              : activeSection ===
                                  'settings'
                                ? 'تنظیمات'
                                : activeSection ===
                                    'notes'
                                  ? 'یادداشت‌ها'
                                  : activeSection ===
                                      'warranties'
                                    ? 'مدیریت گارانتی'
                                    : 'پنل مدیریت';

  const adminPageDescription =
    viewingRepresentativeWarehouse
      ? 'موجودی، ورود و خروج کالا در انبار اختصاصی نماینده'
      : viewingRepDashboard
        ? 'اطلاعات، آمار و پرونده‌های نماینده'
        : activeSection === 'dashboard'
          ? 'نمای کلی از وضعیت محصولات'
          : activeSection === 'products'
            ? 'مشاهده لیست قیمت محصولات'
            : activeSection ===
                'representatives'
              ? 'مدیریت نمایندگان و پرونده‌های آن‌ها'
              : activeSection === 'upload'
                ? 'افزودن محصولات از فایل اکسل'
                : activeSection === 'shipments'
                  ? 'ثبت و مدیریت ارسال بار'
                  : activeSection ===
                      'warehouse'
                    ? 'مشاهده و مدیریت انبار اختصاصی هر نماینده'
                    : activeSection ===
                        'sales-reports'
                      ? 'مشاهده فقط‌خواندنی اعلام فروش ثبت‌شده توسط نمایندگان'
                      : activeSection ===
                          'return-requests'
                        ? 'بررسی، تأیید یا رد درخواست‌های مرجوعی نماینده‌ها'
                        : activeSection ===
                            'support-requests'
                          ? 'بررسی و پاسخ به درخواست‌های پشتیبانی نمایندگان'
                          : activeSection ===
                              'reports'
                            ? 'مشاهده گزارش‌های سیستم'
                            : activeSection ===
                                'users'
                              ? 'مدیریت کاربران سیستم'
                              : activeSection ===
                                  'settings'
                                ? 'تنظیمات پنل مدیریت'
                                : activeSection ===
                                    'notes'
                                  ? 'مدیریت یادداشت‌های شخصی'
                                  : activeSection ===
                                      'warranties'
                                    ? 'مشاهده و رسیدگی به درخواست‌های گارانتی نمایندگان'
                                    : '';

  const representativePageTitle =
    activeSection === 'dashboard'
      ? 'داشبورد نمایندگی'
      : activeSection === 'products'
        ? 'لیست قیمت‌ها'
        : activeSection === 'orders'
          ? 'سفارش‌های من'
          : activeSection ===
              'my-shipments'
            ? 'بارهای من'
            : activeSection ===
                'warehouse'
              ? 'انبار نمایندگی'
              : activeSection ===
                  'sales-reports'
                ? 'اعلام فروش'
                : activeSection ===
                    'return-request'
                  ? 'درخواست مرجوعی'
                  : activeSection ===
                      'support'
                    ? 'پشتیبانی'
                    : activeSection ===
                        'profile'
                      ? 'پروفایل نمایندگی'
                      : activeSection ===
                          'notes'
                        ? 'یادداشت‌ها'
                        : activeSection ===
                            'warranties'
                          ? 'استفاده از گارانتی'
                          : 'داشبورد نمایندگی';

  const representativePageDescription =
    activeSection === 'dashboard'
      ? 'نمای کلی اطلاعات، اعتبار و موجودی نمایندگی'
      : activeSection === 'products'
        ? 'مشاهده لیست قیمت ثبت‌شده توسط مدیریت'
        : activeSection === 'orders'
          ? 'مشاهده سفارش‌های ثبت‌شده'
          : activeSection ===
              'my-shipments'
            ? 'پیگیری وضعیت و جزئیات بارهای ارسالی به نمایندگی شما'
            : activeSection ===
                'warehouse'
              ? 'مشاهده موجودی و ارزش کالاهای انبار'
              : activeSection ===
                  'sales-reports'
                ? 'ثبت و مشاهده اعلام فروش نمایندگی'
                : activeSection ===
                    'return-request'
                  ? 'ثبت و پیگیری درخواست مرجوعی'
                  : activeSection ===
                      'support'
                    ? 'ثبت و پیگیری درخواست‌های پشتیبانی'
                    : activeSection ===
                        'profile'
                      ? 'مشاهده اطلاعات کاربری و نمایندگی'
                      : activeSection ===
                          'notes'
                        ? 'مدیریت یادداشت‌های شخصی'
                        : activeSection ===
                            'warranties'
                          ? 'ثبت درخواست استفاده از گارانتی برای کالاهای موجود در انبار'
                          : '';

  if (
    !getToken() ||
    !authUser ||
    !authRole
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <div
      dir="ltr"
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950"
    >
      <Navbar
        onToggleSidebar={() => {
          setSidebarOpen(
            (current) => !current,
          );
        }}
        userRole={
          isRepresentative
            ? 'representative'
            : 'admin'
        }
        onRoleChange={() => {}}
        userName={
          isRepresentative
            ? authUser.name ||
              authUser.username ||
              'نماینده'
            : authUser.name ||
              'مدیر سیستم'
        }
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
        }}
        activeSection={activeSection}
        onSectionChange={
          handleSectionChange
        }
        userRole={
          isRepresentative
            ? 'representative'
            : 'admin'
        }
      />

      <main
        dir="rtl"
        className={`min-h-[calc(100vh-76px)] transition-all duration-500 ${
          sidebarOpen
            ? 'lg:mr-72'
            : 'lg:mr-0'
        }`}
      >
        <div className="mx-auto max-w-7xl p-3 md:p-6">
          <header className="mb-4 md:mb-6">
            <h1 className="text-xl font-black text-gray-800 dark:text-white md:text-3xl">
              {isRepresentative
                ? representativePageTitle
                : adminPageTitle}
            </h1>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm">
              {isRepresentative
                ? representativePageDescription
                : adminPageDescription}
            </p>
          </header>

          {isRepresentative ? (
            activeSection === 'warranties' ? (
              <RepresentativeWarrantyPage />
            ) : activeSection === 'notes' ? (
              <NotesPage />
            ) : activeSection === 'products' ? (
              <ProductsTable
                products={
                  Array.isArray(products)
                    ? products
                    : []
                }
                userRole="user"
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ) : activeSection === 'support' ? (
              <Support />
            ) : (
              <UserDashboardPage
                activeSection={activeSection}
              />
            )
          ) : activeSection === 'notes' ? (
            <NotesPage />
          ) : activeSection === 'warranties' ? (
            <AdminWarrantiesPage />
          ) : viewingRepDashboard ? (
            <MainContent
              activeSection="representatives"
              userRole="admin"
              products={products}
              totalProducts={totalProducts}
              totalPrice={totalPrice}
              viewingRepDashboard={
                viewingRepDashboard
              }
              representatives={
                representatives
              }
              representativeFiles={
                representativeFiles
              }
              loadingFiles={loadingFiles}
              shipments={shipments}
              onEditProduct={
                setEditingProduct
              }
              onDeleteProduct={
                handleDelete
              }
              onUploadSuccess={
                handleProductsUploaded
              }
              onOpenRepDashboard={
                handleOpenRepDashboard
              }
              onBackToRepList={
                handleBackToRepList
              }
              onViewFile={setViewingFile}
              onDeleteFile={handleDeleteFile}
              onAddRepresentative={
                handleAddRepresentative
              }
              onEditRepresentative={
                handleEditRepresentative
              }
              onDeleteRepresentative={
                handleDeleteRepresentative
              }
              onRepresentativeUpdated={
                handleRepresentativeUpdated
              }
            />
          ) : activeSection ===
            'warehouse' &&
            selectedWarehouseRepresentative ? (
            <RepresentativeWarehouseDashboard
              representative={
                selectedWarehouseRepresentative
              }
              apiUrl={API_URL}
              products={products}
              onBack={() => {
                setViewingRepresentativeWarehouse(
                  null,
                );
              }}
              onWarehouseChanged={
                handleWarehouseChanged
              }
              onProductsChanged={() => {
                void loadProducts();
              }}
            />
          ) : activeSection ===
            'warehouse' ? (
            <Warehouse
              representatives={
                representatives
              }
              apiUrl={API_URL}
              onOpenRepresentativeWarehouse={(
                representativeId,
              ) => {
                setViewingRepDashboard(null);
                setViewingFile(null);
                setViewingRepresentativeWarehouse(
                  String(representativeId),
                );
              }}
            />
          ) : activeSection ===
            'support-requests' ? (
            <AdminSupportRequests />
          ) : (
            <MainContent
              activeSection={activeSection}
              userRole="admin"
              products={products}
              totalProducts={totalProducts}
              totalPrice={totalPrice}
              viewingRepDashboard={null}
              representatives={
                representatives
              }
              representativeFiles={
                representativeFiles
              }
              loadingFiles={loadingFiles}
              shipments={shipments}
              onEditProduct={
                setEditingProduct
              }
              onDeleteProduct={
                handleDelete
              }
              onUploadSuccess={
                handleProductsUploaded
              }
              onOpenRepDashboard={
                handleOpenRepDashboard
              }
              onBackToRepList={
                handleBackToRepList
              }
              onViewFile={setViewingFile}
              onDeleteFile={handleDeleteFile}
              onAddRepresentative={
                handleAddRepresentative
              }
              onEditRepresentative={
                handleEditRepresentative
              }
              onDeleteRepresentative={
                handleDeleteRepresentative
              }
              onRepresentativeUpdated={
                handleRepresentativeUpdated
              }
            />
          )}
        </div>
      </main>

      {!isRepresentative ? (
        <>
          <FileViewerModal
            file={viewingFile}
            apiUrl={API_URL}
            onClose={() => {
              setViewingFile(null);
            }}
          />

          {editingProduct ? (
            <EditModal
              product={editingProduct}
              onClose={() => {
                setEditingProduct(null);
              }}
              onSave={handleEdit}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default App;
