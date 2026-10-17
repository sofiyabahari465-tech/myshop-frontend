import React from 'react';
import {
  Boxes,
  ChartNoAxesColumnIncreasing,
  FileBarChart,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import type { Representative } from '../types';


interface Shipment {
  id: string | number;
  status?: string;
}


interface DashboardOverviewProps {
  totalProducts: number;
  totalPrice: number;
  representatives?: Representative[];
  shipments?: Shipment[];
}


const toPersianNumber = (value: number) => {
  return new Intl.NumberFormat('fa-IR').format(
    Number.isFinite(value) ? value : 0,
  );
};


type DashboardCardProps = {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
  valueClassName?: string;
};


const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  description,
  icon,
  iconClassName,
  valueClassName = 'text-gray-900 dark:text-gray-100',
}) => {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            {title}
          </p>


          <p
            className={`mt-3 truncate text-2xl font-black sm:text-2xl ${valueClassName}`}
          >
            {value}
          </p>


          <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>


        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
};


const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  totalProducts,
  totalPrice,
  representatives = [],
  shipments = [],
}) => {
  const safeRepresentatives = Array.isArray(representatives)
    ? representatives
    : [];


  const safeShipments = Array.isArray(shipments)
    ? shipments
    : [];


  // 1. تعداد نمایندگان فعال
  const activeRepresentativesCount = safeRepresentatives.filter(
    (rep) => rep.status === 'active',
  ).length;


  // 2. تعداد اقلام محصولات انبار (جمع storeItemsCount همه نمایندگان)
  const warehouseItemsCount = safeRepresentatives.reduce(
    (sum, rep) => sum + (Number(rep.storeItemsCount) || 0),
    0,
  );


  // 3. مجموع مبلغ کل انبارها (جمع storeItemsTotalValue همه نمایندگان)
  const warehouseTotalValue = safeRepresentatives.reduce(
    (sum, rep) => sum + (Number(rep.storeItemsTotalValue) || 0),
    0,
  );


  // 4. فروش ۱۰ روز قبل
  const last10DaysSalesTotal = safeRepresentatives.reduce(
    (sum, rep) => sum + (Number(rep.last10DaysSales) || 0),
    0,
  );


  // 5. میانگین فروش ماهانه (مجموع فروش ماهانه همه نمایندگان)
  const averageMonthlySales = safeRepresentatives.reduce(
    (sum, rep) => sum + (Number(rep.averageSales) || 0),
    0,
  );


  // 6. تعداد بارهای ارسال شده (تحویل شده)
  const totalShipmentsSent = safeShipments.filter(
    (shipment) => shipment.status === 'delivered',
  ).length;


  // 7. تعداد بارهای در حال ارسال
  const shipmentsInProgress = safeShipments.filter(
    (shipment) => shipment.status === 'shipping',
  ).length;


  // 🆕 8. تعداد اعلام فروش نمایندگان
  const salesAnnouncementsCount = safeRepresentatives.reduce(
    (sum, rep) => sum + (Number(rep.salesAnnouncementCount) || 0),
    0,
  );


  return (
    <section
      dir="rtl"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {/* باکس 1: تعداد نمایندگان فعال */}
      <DashboardCard
        title="تعداد نمایندگان فعال"
        value={toPersianNumber(activeRepresentativesCount)}
        description="نمایندگان با وضعیت فعال"
        icon={<Users className="h-6 w-6" />}
        iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
        valueClassName="text-blue-700 dark:text-blue-400"
      />


      {/* باکس 2: تعداد اقلام محصولات انبار */}
      <DashboardCard
        title="تعداد اقلام محصولات انبار"
        value={toPersianNumber(warehouseItemsCount)}
        description="مجموع کالاهای ثبت‌شده در انبار نمایندگان"
        icon={<Boxes className="h-6 w-6" />}
        iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        valueClassName="text-emerald-700 dark:text-emerald-400"
      />


      {/* باکس 3: مجموع مبلغ کل انبارها */}
      <DashboardCard
        title="مجموع مبلغ کل انبارها"
        value={`${toPersianNumber(warehouseTotalValue)} تومان`}
        description="مجموع"
        icon={<Wallet className="h-6 w-6" />}
        iconClassName="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400"
        valueClassName="text-indigo-700 dark:text-indigo-400"
      />


      {/* باکس 4: فروش ۱۰ روز قبل */}
      <DashboardCard
        title="فروش ۱۰ روز قبل"
        value={`${toPersianNumber(last10DaysSalesTotal)} تومان`}
        description="جمع فروش نمایندگان در ۱۰ روز گذشته"
        icon={<ChartNoAxesColumnIncreasing className="h-6 w-6" />}
        iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
        valueClassName="text-amber-700 dark:text-amber-400"
      />


      {/* باکس 5: میانگین فروش ماهانه */}
      <DashboardCard
        title="میانگین فروش ماهانه"
        value={`${toPersianNumber(Math.round(averageMonthlySales))} تومان`}
        description="مجموع میانگین فروش ماهانه نمایندگان"
        icon={<FileBarChart className="h-6 w-6" />}
        iconClassName="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
        valueClassName="text-cyan-700 dark:text-cyan-400"
      />


      {/* باکس 6: تعداد بارهای ارسال شده */}
      <DashboardCard
        title="تعداد بارهای ارسال شده"
        value={toPersianNumber(totalShipmentsSent)}
        description="مجموع بارهای تحویل‌شده"
        icon={<Truck className="h-6 w-6" />}
        iconClassName="bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
        valueClassName="text-purple-700 dark:text-purple-400"
      />


      {/* باکس 7: تعداد بارهای در حال ارسال */}
      <DashboardCard
        title="تعداد بارهای در حال ارسال"
        value={toPersianNumber(shipmentsInProgress)}
        description="بارهای در مسیر تحویل"
        icon={<Store className="h-6 w-6" />}
        iconClassName="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
        valueClassName="text-rose-700 dark:text-rose-400"
      />


      {/* 🆕 باکس 8: اعلام فروش نمایندگان */}
      <DashboardCard
        title="اعلام فروش نمایندگان"
        value={toPersianNumber(salesAnnouncementsCount)}
        description="مجموع اعلام فروش ثبت‌شده توسط نمایندگان"
        icon={<ShoppingCart className="h-6 w-6" />}
        iconClassName="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
        valueClassName="text-orange-700 dark:text-orange-400"
      />
    </section>
  );
};


export default DashboardOverview;
