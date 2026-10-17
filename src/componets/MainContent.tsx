import React, {
  Component,
  useEffect,
  useMemo,
} from 'react';

import {
  AlertCircle,
  Construction,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import AccessDenied from './AccessDenied';
import DashboardOverview from './DashboardOverview';
import ExcelUpload from './ExcelUpload';
import ProductsTable from './ProductsTable';
import Representatives from './Representatives';
import RepresentativeDashboard from './RepresentativeDashboard';
import ReturnRequests from './ReturnRequests';
import SalesReportsAdminTable from './SalesReportsAdminTable';
import Shipments from './Shipments';

import type {
  Product,
  Representative,
  RepresentativeFile,
  Section,
  UserRole,
} from '../types';

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

interface Props {
  activeSection: Section;
  userRole: UserRole;
  products: Product[];
  totalProducts: number;
  totalPrice: number;

  viewingRepDashboard: string | null;
  representatives: Representative[];

  representativeFiles: RepresentativeFile[];
  loadingFiles: boolean;
  shipments?: Shipment[];

  onEditProduct: (
    product: Product,
  ) => void;

  onDeleteProduct: (
    id: string,
  ) => void;

  onUploadSuccess:
    () => void | Promise<void>;

  onOpenRepDashboard: (
    id: string,
  ) => void;

  onBackToRepList: () => void;

  onViewFile: (
    file: RepresentativeFile,
  ) => void;

  onDeleteFile: (
    fileId: string | number,
  ) => void;

  onAddRepresentative: (
    data: Partial<Representative>,
  ) => Promise<void>;

  onEditRepresentative: (
    id: string,
    data: Partial<Representative>,
  ) => Promise<void>;

  onDeleteRepresentative: (
    id: string,
  ) => Promise<void>;

  onRepresentativeUpdated?: (
    representative: Representative,
  ) => void | Promise<void>;
}

interface DashboardBoundaryProps {
  children: React.ReactNode;
  onBack: () => void;
}

interface DashboardBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  componentStack: string;
}

class RepresentativeDashboardBoundary extends Component<
  DashboardBoundaryProps,
  DashboardBoundaryState
> {
  public state: DashboardBoundaryState = {
    hasError: false,
    errorMessage: '',
    errorStack: '',
    componentStack: '',
  };

  public static getDerivedStateFromError(
    error: Error,
  ): Partial<DashboardBoundaryState> {
    return {
      hasError: true,
      errorMessage:
        error?.message ||
        'خطای نامشخص در داشبورد نماینده.',
      errorStack: error?.stack || '',
    };
  }

  public componentDidCatch(
    error: Error,
    errorInfo: React.ErrorInfo,
  ) {
    console.error(
      '❌ خطای داشبورد نماینده:',
      error,
    );

    console.error(
      '❌ مسیر کامپوننت:',
      errorInfo.componentStack,
    );

    this.setState({
      componentStack:
        errorInfo.componentStack || '',
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      errorStack: '',
      componentStack: '',
    });
  };

  public render() {
    const {
      children,
      onBack,
    } = this.props;

    const {
      hasError,
      errorMessage,
      errorStack,
      componentStack,
    } = this.state;

    if (!hasError) {
      return children;
    }

    return (
      <section
        dir="rtl"
        className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-lg dark:border-red-900/60 dark:bg-red-950/30 md:p-7"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-900/40 dark:text-red-300">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div>
            <h2 className="text-lg font-black text-red-800 dark:text-red-300">
              خطا در نمایش داشبورد نماینده
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-red-700 dark:text-red-400">
              متن خطای زیر را کامل بررسی کنید.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/40 dark:bg-gray-900">
          <p className="text-sm font-black text-red-700 dark:text-red-400">
            متن خطا
          </p>

          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 text-xs leading-6 text-red-800 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </pre>
        </div>

        {errorStack ? (
          <details className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/40 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-black text-red-700 dark:text-red-400">
              جزئیات فنی خطا
            </summary>

            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs leading-6 text-gray-100">
              {errorStack}
            </pre>
          </details>
        ) : null}

        {componentStack ? (
          <details className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/40 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-black text-red-700 dark:text-red-400">
              مسیر کامپوننت خطادار
            </summary>

            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs leading-6 text-gray-100">
              {componentStack}
            </pre>
          </details>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش دوباره
          </button>

          <button
            type="button"
            onClick={onBack}
            className="min-h-11 rounded-xl bg-gray-800 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-700"
          >
            بازگشت به لیست نمایندگان
          </button>
        </div>
      </section>
    );
  }
}

const MainContent: React.FC<Props> = ({
  activeSection,
  userRole,
  products,
  totalProducts,
  totalPrice,
  viewingRepDashboard,
  representatives,
  representativeFiles,
  loadingFiles,
  shipments = [],
  onEditProduct,
  onDeleteProduct,
  onUploadSuccess,
  onOpenRepDashboard,
  onBackToRepList,
  onViewFile,
  onDeleteFile,
  onAddRepresentative,
  onEditRepresentative,
  onDeleteRepresentative,
  onRepresentativeUpdated,
}) => {
  const safeProducts = useMemo(() => {
    return Array.isArray(products)
      ? products
      : [];
  }, [products]);

  const safeRepresentatives = useMemo(() => {
    return Array.isArray(representatives)
      ? representatives
      : [];
  }, [representatives]);

  const safeShipments = useMemo(() => {
    return Array.isArray(shipments)
      ? shipments
      : [];
  }, [shipments]);

  const safeRepresentativeFiles =
    useMemo(() => {
      return Array.isArray(
        representativeFiles,
      )
        ? representativeFiles
        : [];
    }, [representativeFiles]);

  const selectedRepresentative = useMemo(() => {
    if (
      viewingRepDashboard === null ||
      viewingRepDashboard === ''
    ) {
      return null;
    }

    return (
      safeRepresentatives.find(
        (item) =>
          String(item.id) ===
          String(viewingRepDashboard),
      ) || null
    );
  }, [
    safeRepresentatives,
    viewingRepDashboard,
  ]);

  useEffect(() => {
    console.log(
      '🔎 MAIN CONTENT STATE',
      {
        activeSection,
        productsCount: safeProducts.length,
        totalProducts,
        viewingRepDashboard,
        representativesCount:
          safeRepresentatives.length,
        selectedRepresentative:
          selectedRepresentative?.name ||
          null,
      },
    );
  }, [
    activeSection,
    safeProducts.length,
    totalProducts,
    viewingRepDashboard,
    safeRepresentatives.length,
    selectedRepresentative,
  ]);

  if (
    viewingRepDashboard !== null &&
    viewingRepDashboard !== ''
  ) {
    if (!selectedRepresentative) {
      return (
        <div
          dir="rtl"
          className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-center shadow-lg dark:border-yellow-800 dark:bg-yellow-900/20 md:p-8"
        >
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-yellow-600 dark:text-yellow-400" />

          <p className="text-base font-black text-yellow-700 dark:text-yellow-300 md:text-lg">
            اطلاعات نماینده پیدا نشد.
          </p>

          <div className="mx-auto mt-4 max-w-xl rounded-xl border border-yellow-200 bg-white p-4 text-right text-xs leading-7 text-yellow-800 dark:border-yellow-800 dark:bg-gray-900 dark:text-yellow-300">
            <p>
              شناسه انتخاب‌شده:{' '}
              <strong>
                {viewingRepDashboard}
              </strong>
            </p>

            <p>
              تعداد نمایندگان:{' '}
              <strong>
                {safeRepresentatives.length}
              </strong>
            </p>

            <p className="break-words">
              شناسه‌های موجود:{' '}
              <strong>
                {safeRepresentatives
                  .map((item) =>
                    String(item.id),
                  )
                  .join(', ') || 'هیچ‌کدام'}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToRepList}
            className="mt-5 min-h-11 rounded-xl bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            بازگشت به لیست نمایندگان
          </button>
        </div>
      );
    }

    return (
      <RepresentativeDashboardBoundary
        onBack={onBackToRepList}
      >
        <RepresentativeDashboard
          representative={
            selectedRepresentative
          }
          apiUrl={API_URL}
          onBack={onBackToRepList}
          files={safeRepresentativeFiles}
          loadingFiles={loadingFiles}
          onViewFile={onViewFile}
          onDeleteFile={onDeleteFile}
          onRepresentativeUpdated={
            onRepresentativeUpdated
          }
        />
      </RepresentativeDashboardBoundary>
    );
  }

  switch (activeSection) {
    case 'dashboard':
      return (
        <DashboardOverview
          totalProducts={
            Number(totalProducts) || 0
          }
          totalPrice={
            Number(totalPrice) || 0
          }
          representatives={
            safeRepresentatives
          }
          shipments={safeShipments}
        />
      );

    case 'products':
      return (
        <ProductsTable
          products={safeProducts}
          userRole={userRole}
          onEdit={onEditProduct}
          onDelete={onDeleteProduct}
        />
      );

    case 'representatives':
      if (userRole !== 'admin') {
        return (
          <AccessDenied message="فقط ادمین به بخش نمایندگان دسترسی دارد." />
        );
      }

      return (
        <Representatives
          representatives={
            safeRepresentatives
          }
          userRole={userRole}
          onOpenDashboard={
            onOpenRepDashboard
          }
          onAddRepresentative={
            onAddRepresentative
          }
          onEditRepresentative={
            onEditRepresentative
          }
          onDeleteRepresentative={
            onDeleteRepresentative
          }
        />
      );

    case 'upload':
      if (userRole !== 'admin') {
        return (
          <AccessDenied message="فقط ادمین به بخش آپلود اکسل دسترسی دارد." />
        );
      }

      return (
        <ExcelUpload
          onUploadSuccess={
            onUploadSuccess
          }
        />
      );

    case 'shipments':
      if (userRole !== 'admin') {
        return (
          <AccessDenied message="فقط ادمین به بخش ارسال بار دسترسی دارد." />
        );
      }

      return <Shipments />;

    case 'sales-reports':
      if (userRole !== 'admin') {
        return (
          <AccessDenied message="فقط ادمین به بخش اعلام فروش نمایندگان دسترسی دارد." />
        );
      }

      return <SalesReportsAdminTable />;

    case 'return-requests':
      if (userRole !== 'admin') {
        return (
          <AccessDenied message="فقط ادمین به درخواست‌های مرجوعی دسترسی دارد." />
        );
      }

      return <ReturnRequests />;

    default:
      return (
        <div
          dir="rtl"
          className="rounded-2xl bg-white p-8 text-center shadow-lg dark:bg-gray-900 md:p-16"
        >
          <div className="mb-4 flex justify-center text-orange-500 dark:text-orange-400">
            <Construction className="h-16 w-16 md:h-20 md:w-20" />
          </div>

          <p className="text-base text-gray-500 dark:text-gray-400 md:text-xl">
            این بخش در حال توسعه است.
          </p>
        </div>
      );
  }
};

export default MainContent;