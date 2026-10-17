import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  MapPinned,
  PackageCheck,
  UserRound,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';

type DashboardOverviewProps = {
  fullName?: string;
  territory?: string;
  creditAmount?: number | string;
  inventoryItemCount?: number | string;
  inventoryValue?: number | string;
  salesLast10Days?: number | string;       // جدید: فروش ۱۰ روز گذشته
  salesInAllowedDays?: number | string;    // جدید: فروش ۳ روز مجاز ماه
};

type OverviewCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  color:
    | 'indigo'
    | 'cyan'
    | 'emerald'
    | 'amber'
    | 'violet'
    | 'rose'
    | 'blue'
    | 'orange';
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
  const normalizedValue = toEnglishDigits(value)
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const toPersianNumber = (value: number) => {
  return new Intl.NumberFormat('fa-IR').format(
    Number.isFinite(value) ? value : 0,
  );
};

const toToman = (value: number) => {
  return `${toPersianNumber(value)} تومان`;
};

const cardColors = {
  indigo:
    'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300',
  cyan:
    'border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300',
  emerald:
    'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
  amber:
    'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
  violet:
    'border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300',
  rose:
    'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
  blue:
    'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300',
  orange:
    'border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300',
};

const OverviewCard = ({
  title,
  value,
  icon: Icon,
  color,
}: OverviewCardProps) => {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="absolute -left-7 -top-7 h-20 w-20 rounded-full bg-current opacity-[0.04] blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            {title}
          </p>

          <p className="mt-3 truncate text-xl font-black text-gray-800 dark:text-white sm:text-2xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${cardColors[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
};

const DashboardOverview = ({
  fullName = '—',
  territory = '—',
  creditAmount = 0,
  inventoryItemCount = 0,
  inventoryValue = 0,
  salesLast10Days = 0,
  salesInAllowedDays = 0,
}: DashboardOverviewProps) => {
  /*
    مبلغ اعتبار ثبت‌شده توسط ادمین برای نماینده.
    مقدار معمولاً از:
    representative.totalFinancialCommitment
    دریافت می‌شود.
  */
  const normalizedCreditAmount = toNumber(creditAmount);

  /*
    تعداد کل موجودی انبار نماینده.
    مقدار معمولاً از:
    representative.storeItemsCount
    دریافت می‌شود.
  */
  const normalizedInventoryItemCount = toNumber(
    inventoryItemCount,
  );

  /*
    ارزش فعلی تمام اقلام باقیمانده در انبار نماینده.
    مقدار معمولاً از:
    representative.storeItemsTotalValue
    دریافت می‌شود.
  */
  const normalizedInventoryValue = toNumber(inventoryValue);

  /*
    مانده اعتبار = مبلغ اعتبار - ارزش فعلی انبار.
  */
  const remainingCredit =
    normalizedCreditAmount - normalizedInventoryValue;

  const remainingCreditColor =
    remainingCredit < 0 ? 'rose' : 'emerald';

  const remainingCreditTitle =
    remainingCredit < 0
      ? 'مانده اعتباری'
      : 'مانده اعتباری';

  /*
    فروش ۱۰ روز گذشته
  */
  const normalizedSalesLast10Days = toNumber(salesLast10Days);

  /*
    فروش ۳ روز مجاز ماه (روزهای ۱۰، ۲۰، ۳۰)
  */
  const normalizedSalesInAllowedDays = toNumber(salesInAllowedDays);

  const cards: OverviewCardProps[] = [
    {
      title: 'نام و نام خانوادگی',
      value: fullName || '—',
      icon: UserRound,
      color: 'indigo',
    },
    {
      title: 'محدوده نمایندگی',
      value: territory || '—',
      icon: MapPinned,
      color: 'cyan',
    },
    {
      title: 'مبلغ اعتبار',
      value: toToman(normalizedCreditAmount),
      icon: CircleDollarSign,
      color: 'emerald',
    },
    {
      title: 'تعداد اقلام در انبار',
      value: `${toPersianNumber(
        normalizedInventoryItemCount,
      )} قلم`,
      icon: Boxes,
      color: 'amber',
    },
    {
      title: 'مبلغ اقلام انبار',
      value: toToman(normalizedInventoryValue),
      icon: PackageCheck,
      color: 'violet',
    },
    {
      title: remainingCreditTitle,
      value: toToman(Math.abs(remainingCredit)),
      icon: Banknote,
      color: remainingCreditColor,
    },
    {
      title: 'فروش ۱۰ روز گذشته',
      value: toToman(normalizedSalesLast10Days),
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'فروش ۳ روز مجاز ماه',
      value: toToman(normalizedSalesInAllowedDays),
      icon: CalendarDays,
      color: 'orange',
    },
  ];

  return (
    <section
      dir="rtl"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {cards.map((card) => {
        return (
          <OverviewCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
          />
        );
      })}
    </section>
  );
};

export default DashboardOverview;