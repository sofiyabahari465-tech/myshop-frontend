import {
  ClipboardList,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react';

export type DashboardOrder = {
  id: string;
  title: string;
  quantity: number;
  amount: number;
  createdAt?: string;
};

type OrdersSectionProps = {
  orders?: DashboardOrder[];
};

const toPersianNumber = (value: number) => {
  return new Intl.NumberFormat('fa-IR').format(value || 0);
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
  }).format(date);
};

const OrdersSection = ({
  orders = [],
}: OrdersSectionProps) => {
  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 p-5 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            <ShoppingBag className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-black text-gray-800 dark:text-white">
              سفارش‌های اخیر
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              آخرین سفارش‌های ثبت‌شدهٔ شما
            </p>
          </div>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          {toPersianNumber(safeOrders.length)} سفارش
        </span>
      </div>

      {safeOrders.length === 0 ? (
        <div className="p-10 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

          <p className="mt-4 font-black text-gray-600 dark:text-gray-300">
            سفارشی برای نمایش وجود ندارد.
          </p>

          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            پس از ثبت سفارش، اطلاعات آن در این بخش نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {safeOrders.slice(0, 5).map((order) => {
            return (
              <article
                key={order.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-800/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                    <PackageCheck className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black text-gray-800 dark:text-white">
                      {order.title || 'بدون عنوان'}
                    </p>

                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                      تعداد:{' '}
                      {toPersianNumber(
                        Number(order.quantity) || 0,
                      )}{' '}
                      قلم
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:block sm:text-left">
                  <p className="font-black text-emerald-600 dark:text-emerald-400">
                    {toPersianNumber(
                      Number(order.amount) || 0,
                    )}{' '}
                    تومان
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OrdersSection;