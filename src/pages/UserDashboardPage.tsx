import axios from 'axios';
import {
  CircleUserRound,
  Loader2,
  PackageOpen,
  RefreshCw,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import DashboardOverview from '../componets/user-dashboard/DashboardOverview';
import InventorySection, {
  type DashboardInventoryItem,
} from '../componets/user-dashboard/InventorySection';
import MyShipments from '../componets/user-dashboard/MyShipments';
import OrdersSection, {
  type DashboardOrder,
} from '../componets/user-dashboard/OrdersSection';
import ReturnRequestsSection from '../componets/user-dashboard/ReturnRequestsSection';
import SalesAnnouncement from '../componets/user-dashboard/SalesAnnouncement';
import type {
  ReturnRequest,
  Section,
} from '../types';



const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';



type UserDashboardPageProps = {
  activeSection: Section;
};



type RepresentativeDashboardData = {
  representative?: {
    id?: string | number;
    name?: string;
    city?: string;
    phone?: string;
    code?: string;
    totalFinancialCommitment?: string | number;
    storeItemsCount?: number;
    storeItemsTotalValue?: number;
  };
  shipments?: unknown[];
  warehouse?: {
    items?: unknown[];
    movements?: unknown[];
  };
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
  const normalized = toEnglishDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');



  const result = Number(normalized);



  return Number.isFinite(result) ? result : 0;
};



const formatFaNumber = (value: unknown) => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};



const formatToman = (value: unknown) => {
  return `${formatFaNumber(value)} تومان`;
};



const getAuthHeaders = () => {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token') ||
    localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken') ||
    '';



  return {
    Authorization: `Bearer ${token}`,
  };
};



const toInventoryItem = (
  item: any,
  index: number,
): DashboardInventoryItem => {
  const quantity = toNumber(item?.quantity);
  const unitPrice = toNumber(item?.unitPrice);



  return {
    id: String(
      item?.id ||
      item?.productId ||
      `inventory-item-${index}`,
    ),
    title:
      item?.productName ||
      item?.title ||
      item?.name ||
      'بدون عنوان',
    brand: item?.brand || '',
    category: item?.category || '',
    quantity,
    unitPrice,
    totalPrice:
      item?.totalPrice !== undefined
        ? toNumber(item.totalPrice)
        : quantity * unitPrice,
  };
};



const toDashboardOrder = (
  shipment: any,
  index: number,
): DashboardOrder => {
  return {
    id: String(
      shipment?.id || `shipment-${index}`,
    ),
    title:
      shipment?.receiver ||
      shipment?.warehouse ||
      'ارسال بار',
    quantity: toNumber(
      shipment?.totalItems ??
      shipment?.itemsCount,
    ),
    amount: toNumber(
      shipment?.totalItems,
    ),
    createdAt:
      shipment?.createdAt ||
      shipment?.updatedAt ||
      undefined,
  };
};



const UserDashboardPage = ({
  activeSection,
}: UserDashboardPageProps) => {
  const [dashboardData, setDashboardData] =
    useState<RepresentativeDashboardData>({});



  const [returnRequests, setReturnRequests] =
    useState<ReturnRequest[]>([]);



  const [loadingDashboard, setLoadingDashboard] =
    useState(true);



  const [loadingReturns, setLoadingReturns] =
    useState(false);



  const [errorMessage, setErrorMessage] =
    useState('');



  // فروش‌های نماینده
  const [salesReports, setSalesReports] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);



  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setErrorMessage('');



    try {
      const response = await axios.get<{
        success: boolean;
        data: RepresentativeDashboardData;
      }>(
        `${API_URL}/representative/dashboard`,
        {
          headers: getAuthHeaders(),
        },
      );



      setDashboardData(
        response.data.data || {},
      );
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'خطا در دریافت اطلاعات داشبورد نمایندگی.',
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, []);



  const loadReturnRequests =
    useCallback(async () => {
      setLoadingReturns(true);



      try {
        const response = await axios.get<{
          success: boolean;
          count: number;
          data: ReturnRequest[];
        }>(
          `${API_URL}/return-requests/my`,
          {
            headers: getAuthHeaders(),
          },
        );



        setReturnRequests(
          Array.isArray(response.data.data)
            ? response.data.data
            : [],
        );
      } catch (error: any) {
        setErrorMessage(
          error.response?.data?.error ||
          error.response?.data?.message ||
          'خطا در دریافت درخواست‌های مرجوعی.',
        );
      } finally {
        setLoadingReturns(false);
      }
    }, []);



  // بارگذاری فروش‌های نماینده
  const loadSalesReports = useCallback(async () => {
    setSalesLoading(true);



    try {
      const response = await axios.get<{
        success: boolean;
        count: number;
        data: any[];
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
    } catch (error: any) {
      console.error('خطا در دریافت فروش‌ها:', error);
      setSalesReports([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);



  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);



  useEffect(() => {
    void loadSalesReports();
  }, [loadSalesReports]);



  useEffect(() => {
    if (
      activeSection ===
      'return-request'
    ) {
      void loadReturnRequests();
    }
  }, [
    activeSection,
    loadReturnRequests,
  ]);



  const inventoryItems = useMemo(() => {
    const warehouseItems =
      Array.isArray(
        dashboardData.warehouse
          ?.items,
      )
        ? dashboardData.warehouse?.items
        : [];



    return warehouseItems.map(
      toInventoryItem,
    );
  }, [
    dashboardData.warehouse?.items,
  ]);



  const orders = useMemo(() => {
    const shipments =
      Array.isArray(
        dashboardData.shipments,
      )
        ? dashboardData.shipments
        : [];



    return shipments.map(
      toDashboardOrder,
    );
  }, [
    dashboardData.shipments,
  ]);



  const inventoryItemCount =
    useMemo(() => {
      return inventoryItems.reduce(
        (sum, item) => {
          return (
            sum +
            toNumber(
              item.quantity,
            )
          );
        },
        0,
      );
    }, [
      inventoryItems,
    ]);



  const inventoryValue = useMemo(
    () => {
      return inventoryItems.reduce(
        (sum, item) => {
          return (
            sum +
            toNumber(
              item.totalPrice,
            )
          );
        },
        0,
      );
    },
    [inventoryItems],
  );



  // محاسبه فروش ۱۰ روز گذشته
  const salesLast10Days = useMemo(() => {
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);



    return salesReports
      .filter((report) => {
        const reportDate = report.createdAt ? new Date(report.createdAt) : null;
        if (!reportDate) return false;
        return reportDate >= tenDaysAgo && reportDate <= now;
      })
      .reduce((total, report) => {
        return total + toNumber(report.totalAmount);
      }, 0);
  }, [salesReports]);



  // محاسبه فروش ۳ روز مجاز ماه (روزهای ۱۰، ۲۰، ۳۰)
  const salesInAllowedDays = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();



    return salesReports
      .filter((report) => {
        const reportDate = report.createdAt ? new Date(report.createdAt) : null;
        if (!reportDate) return false;



        const reportDay = reportDate.getDate();
        const reportMonth = reportDate.getMonth();
        const reportYear = reportDate.getFullYear();



        if (reportMonth !== currentMonth || reportYear !== currentYear) {
          return false;
        }



        return [10, 20, 30].includes(reportDay);
      })
      .reduce((total, report) => {
        return total + toNumber(report.totalAmount);
      }, 0);
  }, [salesReports]);



  const representative =
    dashboardData.representative ||
    {};



  const creditAmount = toNumber(
    representative.totalFinancialCommitment,
  );



  // «بارهای من» به درخواست داشبورد وابسته نیست.
  if (
    activeSection ===
    'my-shipments'
  ) {
    const token =
      sessionStorage.getItem(
        'token',
      ) ||
      sessionStorage.getItem(
        'accessToken',
      ) ||
      sessionStorage.getItem(
        'authToken',
      ) ||
      '';



    return (
      <MyShipments
        apiUrl={API_URL}
        token={token}
      />
    );
  }



  if (
    loadingDashboard
  ) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-500" />



          <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
            در حال دریافت اطلاعات نمایندگی...
          </p>
        </div>
      </div>
    );
  }



  if (
    errorMessage &&
    activeSection !==
      'return-request' &&
    activeSection !==
      'sales-reports'
  ) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
        <p className="font-black text-red-700 dark:text-red-300">
          {errorMessage}
        </p>



        <button
          type="button"
          onClick={() => {
            void loadDashboard();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          تلاش دوباره
        </button>
      </div>
    );
  }



  if (
    activeSection ===
    'dashboard'
  ) {
    return (
      <DashboardOverview
        fullName={
          representative.name ||
          '—'
        }
        territory={
          representative.city ||
          '—'
        }
        creditAmount={
          creditAmount
        }
        inventoryItemCount={
          inventoryItemCount
        }
        inventoryValue={
          inventoryValue
        }
        salesLast10Days={salesLast10Days}
        salesInAllowedDays={salesInAllowedDays}
      />
    );
  }



  if (
    activeSection ===
    'orders'
  ) {
    return (
      <OrdersSection
        orders={orders}
      />
    );
  }



  if (
    activeSection ===
    'warehouse'
  ) {
    return (
      <InventorySection
        items={
          inventoryItems
        }
        representativeName={
          representative.name || ''
        }
        representativeCity={
          representative.city || ''
        }
        representativePhone={
          representative.phone || ''
        }
        representativeAddress={
          representative.city || ''
        }
      />
    );
  }



  if (
    activeSection ===
    'return-request'
  ) {
    return (
      <ReturnRequestsSection
        requests={
          returnRequests
        }
        loading={
          loadingReturns
        }
        errorMessage={
          errorMessage
        }
        onRefresh={() => {
          void loadReturnRequests();
        }}
        onRequestCreated={(
          newRequest: ReturnRequest,
        ) => {
          setReturnRequests(
            (
              currentRequests,
            ) => [
              newRequest,
              ...currentRequests,
            ],
          );
        }}
      />
    );
  }



  if (
    activeSection ===
    'sales-reports'
  ) {
    return (
      <SalesAnnouncement
        onSaleRegistered={() => {
          void loadDashboard();
        }}
      />
    );
  }



  if (
    activeSection ===
    'profile'
  ) {
    return (
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 p-5 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
              <CircleUserRound className="h-6 w-6" />
            </div>



            <div>
              <h2 className="font-black text-gray-800 dark:text-white">
                پروفایل نمایندگی
              </h2>



              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                اطلاعات ثبت‌شده توسط مدیریت سیستم
              </p>
            </div>
          </div>
        </div>



        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              نام و نام خانوادگی
            </p>



            <p className="mt-2 font-black text-gray-800 dark:text-white">
              {representative.name ||
              '—'}
            </p>
          </div>



          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              کد نمایندگی
            </p>



            <p className="mt-2 font-black text-gray-800 dark:text-white">
              {representative.code ||
              '—'}
            </p>
          </div>



          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              محدوده نمایندگی
            </p>



            <p className="mt-2 font-black text-gray-800 dark:text-white">
              {representative.city ||
              '—'}
            </p>
          </div>



          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              شماره تماس
            </p>



            <p className="mt-2 font-black text-gray-800 dark:text-white">
              {representative.phone ||
              '—'}
            </p>
          </div>



          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              تعهد مالی
            </p>



            <p className="mt-2 font-black text-emerald-600 dark:text-emerald-400">
              {formatToman(
                creditAmount,
              )}
            </p>
          </div>
        </div>
      </section>
    );
  }



  return (
    <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <PackageOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />



      <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
        بخش موردنظر پیدا نشد.
      </p>
    </section>
  );
};



export default UserDashboardPage;