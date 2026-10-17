import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackageSearch,
  RefreshCw,
  Send,
  ShoppingCart,
  Clock,
} from 'lucide-react';

type WarehouseProduct = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  minimumStock?: number;
  status?: 'normal' | 'low' | 'out' | string;
  lastUpdated?: string;
};

type SaleItemPayload = {
  productId: string;
  quantity: number;
};

type SalesAnnouncementProps = {
  token?: string;
  apiBaseUrl?: string;
  onSaleRegistered?: () => void;
};

const toEnglishDigits = (value: string | number) => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => {
      return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
    })
    .replace(/[٠-٩]/g, (digit) => {
      return String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
    });
};

const toNumber = (value: string | number | null | undefined) => {
  const normalizedValue = toEnglishDigits(value ?? '')
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

const getStoredToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    ''
  );
};

const SalesAnnouncement = ({
  token,
  apiBaseUrl = '',
  onSaleRegistered,
}: SalesAnnouncementProps) => {
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [saleQuantities, setSaleQuantities] = useState<
    Record<string, string>
  >({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const authToken = token || getStoredToken();

  const getHeaders = useCallback(() => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    return headers;
  }, [authToken]);

  const loadWarehouseProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await fetch(
        `${apiBaseUrl}/api/sales-from-warehouse/products`,
        {
          method: 'GET',
          headers: getHeaders(),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'دریافت کالاهای انبار با خطا مواجه شد.',
        );
      }

      const receivedProducts = Array.isArray(result.data)
        ? result.data
        : [];

      setProducts(receivedProducts);

      setSaleQuantities((currentQuantities) => {
        const nextQuantities: Record<string, string> = {};

        receivedProducts.forEach((product: WarehouseProduct) => {
          const productKey =
            product.productId || product.id || '';

          if (!productKey) {
            return;
          }

          nextQuantities[productKey] =
            currentQuantities[productKey] || '';
        });

        return nextQuantities;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'خطا در دریافت کالاهای انبار.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  useEffect(() => {
    loadWarehouseProducts();
  }, [loadWarehouseProducts]);

  const selectedItems = useMemo(() => {
    return products
      .map((product) => {
        const productId = product.productId || product.id;

        const saleQuantity = toNumber(
          saleQuantities[productId] || 0,
        );

        return {
          product,
          productId,
          saleQuantity,
          totalAmount: saleQuantity * toNumber(product.unitPrice),
        };
      })
      .filter((item) => item.saleQuantity > 0);
  }, [products, saleQuantities]);

  const selectedProductsCount = selectedItems.length;

  const totalSoldItems = useMemo(() => {
    return selectedItems.reduce((total, item) => {
      return total + item.saleQuantity;
    }, 0);
  }, [selectedItems]);

  const totalSaleAmount = useMemo(() => {
    return selectedItems.reduce((total, item) => {
      return total + item.totalAmount;
    }, 0);
  }, [selectedItems]);

  const handleQuantityChange = (
    product: WarehouseProduct,
    value: string,
  ) => {
    const productId = product.productId || product.id;

    const cleanedValue = toEnglishDigits(value).replace(
      /[^\d]/g,
      '',
    );

    const enteredQuantity = toNumber(cleanedValue);
    const availableQuantity = toNumber(product.quantity);

    setSuccessMessage('');

    if (enteredQuantity > availableQuantity) {
      setSaleQuantities((currentQuantities) => {
        return {
          ...currentQuantities,
          [productId]: String(availableQuantity),
        };
      });

      setErrorMessage(
        `تعداد فروش «${product.productName}» نمی‌تواند بیشتر از موجودی (${toPersianNumber(
          availableQuantity,
        )}) باشد.`,
      );

      return;
    }

    setErrorMessage('');

    setSaleQuantities((currentQuantities) => {
      return {
        ...currentQuantities,
        [productId]: cleanedValue,
      };
    });
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (!authToken) {
      setErrorMessage(
        'توکن ورود پیدا نشد. لطفاً یک‌بار از حساب خود خارج و دوباره وارد شوید.',
      );
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMessage(
        'حداقل برای یک کالا، تعداد فروش بیشتر از صفر وارد کنید.',
      );
      return;
    }

    if (!isConfirmed) {
      setErrorMessage(
        'برای ثبت نهایی، تیک تأیید صحت اطلاعات فروش را فعال کنید.',
      );
      return;
    }

    const invalidItem = selectedItems.find((item) => {
      return item.saleQuantity > toNumber(item.product.quantity);
    });

    if (invalidItem) {
      setErrorMessage(
        `تعداد فروش «${invalidItem.product.productName}» بیشتر از موجودی انبار است.`,
      );
      return;
    }

    const payload: {
      items: SaleItemPayload[];
      confirmedSale: boolean;
    } = {
      items: selectedItems.map((item) => {
        return {
          productId: item.productId,
          quantity: item.saleQuantity,
        };
      }),
      confirmedSale: true,
    };

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${apiBaseUrl}/api/sales-from-warehouse`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      // 🟢 بررسی خطای محدودیت ۱۰ روزه
      if (response.status === 403) {
        setErrorMessage(
          `⏰ ${result.error || 'شما در ۱۰ روز گذشته ثبت فروش داشته‌اید. لطفاً بعد از ۱۰ روز اقدام کنید.'}`
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'ثبت اعلام فروش با خطا مواجه شد.',
        );
      }

      setSuccessMessage(
        result.message ||
          'اعلام فروش با موفقیت ثبت و موجودی انبار به‌روزرسانی شد.',
      );

      setSaleQuantities({});
      setIsConfirmed(false);

      await loadWarehouseProducts();

      if (onSaleRegistered) {
        onSaleRegistered();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'خطا در ثبت اعلام فروش.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      dir="rtl"
      className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-700 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShoppingCart className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-white">
                اعلام فروش
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                تعداد کالای فروخته‌شده را ثبت کنید تا از موجودی انبار شما کم شود.
              </p>

              <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                ⏰ محدودیت: هر ۱۰ روز یک‌بار امکان ثبت فروش وجود دارد.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadWarehouseProducts}
          disabled={isLoading || isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isLoading ? 'animate-spin' : ''
            }`}
          />
          بروزرسانی موجودی
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <p className="text-sm font-bold whitespace-pre-line">{errorMessage}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <p className="text-sm font-bold">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            در حال دریافت موجودی انبار...
          </div>
        </div>
      ) : null}

      {!isLoading && products.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <PackageSearch className="h-12 w-12 text-gray-400" />

          <h3 className="mt-4 text-base font-black text-gray-700 dark:text-gray-200">
            کالای قابل فروش در انبار وجود ندارد
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
            در حال حاضر هیچ کالایی با موجودی بیشتر از صفر برای ثبت فروش ندارید.
          </p>
        </div>
      ) : null}

      {!isLoading && products.length > 0 ? (
        <form onSubmit={handleSubmit} className="mt-5">
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
            <table className="min-w-[760px] w-full text-right">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-4 font-black">
                    نام کالا
                  </th>

                  <th className="px-4 py-4 font-black">
                    موجودی فعلی
                  </th>

                  <th className="px-4 py-4 font-black">
                    قیمت واحد
                  </th>

                  <th className="px-4 py-4 font-black">
                    تعداد فروش
                  </th>

                  <th className="px-4 py-4 font-black">
                    مبلغ فروش
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map((product) => {
                  const productId = product.productId || product.id;

                  const enteredQuantity = toNumber(
                    saleQuantities[productId] || 0,
                  );

                  const saleAmount =
                    enteredQuantity * toNumber(product.unitPrice);

                  return (
                    <tr
                      key={productId}
                      className="bg-white transition hover:bg-gray-50/70 dark:bg-gray-900 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-800 dark:text-white">
                          {product.productName}
                        </p>

                        {product.status === 'low' ? (
                          <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                            موجودی رو به اتمام است
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-gray-700 dark:text-gray-200">
                        {toPersianNumber(toNumber(product.quantity))} قلم
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-gray-700 dark:text-gray-200">
                        {toToman(toNumber(product.unitPrice))}
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={saleQuantities[productId] || ''}
                          onChange={(event) => {
                            handleQuantityChange(
                              product,
                              event.target.value,
                            );
                          }}
                          placeholder="۰"
                          disabled={isSubmitting}
                          className="h-11 w-28 rounded-xl border border-gray-200 bg-white px-3 text-center text-sm font-black text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-950/50 dark:disabled:bg-gray-800"
                        />
                      </td>

                      <td className="px-4 py-4 text-sm font-black text-emerald-700 dark:text-emerald-300">
                        {toToman(saleAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  کالاهای انتخاب‌شده
                </p>

                <p className="mt-2 text-xl font-black text-indigo-800 dark:text-indigo-100">
                  {toPersianNumber(selectedProductsCount)} کالا
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-300">
                  مجموع تعداد فروش
                </p>

                <p className="mt-2 text-xl font-black text-amber-800 dark:text-amber-100">
                  {toPersianNumber(totalSoldItems)} قلم
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                  مبلغ کل فروش
                </p>

                <p className="mt-2 text-xl font-black text-emerald-800 dark:text-emerald-100">
                  {toToman(totalSaleAmount)}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(event) => {
                    setIsConfirmed(event.target.checked);
                    setErrorMessage('');
                  }}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />

                <span className="leading-6">
                  صحت تعداد کالاهای فروخته‌شده را تأیید می‌کنم. پس از ثبت، موجودی کالاها از انبار من کم خواهد شد.
                </span>
              </label>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  selectedItems.length === 0 ||
                  !isConfirmed
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    در حال ثبت فروش...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    ثبت نهایی اعلام فروش
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
};

export default SalesAnnouncement;