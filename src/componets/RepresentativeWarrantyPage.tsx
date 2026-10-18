import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import MyWarranties from './user-dashboard/MyWarranties';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ImagePlus,
  LoaderCircle,
  MapPin,
  PackageSearch,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';


type WarrantyWarehouseProduct = {
  warehouseItemId: string;
  productId: string;
  productName: string;
  brand: string;
  category?: string;
  quantity: number;
  unitPrice?: number;
};


type RepresentativeWarrantyInfo = {
  id: string;
  name: string;
  code: string;
  city: string;
};


type WarrantyFormDataResponse = {
  success: boolean;
  data?: {
    representative: RepresentativeWarrantyInfo;
    products: WarrantyWarehouseProduct[];
  };
  error?: string;
};


type CreateWarrantyResponse = {
  success: boolean;
  message?: string;
  data?: {
    id?: string;
  };
  error?: string;
};


const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


const API_BASE_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL.slice(0, -4)
  : RAW_API_URL;


const getToken = () => {
  return (
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  );
};


const todayFa = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());


const formatPrice = (value?: number) => {
  const price = Number(value) || 0;

  if (!price) {
    return '—';
  }

  return `${price.toLocaleString('fa-IR')} تومان`;
};


const RepresentativeWarrantyPage: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement | null>(
    null,
  );

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] =
    useState('');
  const [quantity, setQuantity] = useState(1);
  const [issueDescription, setIssueDescription] =
    useState('');

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [imageFileName, setImageFileName] =
    useState('');

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [submitSuccess, setSubmitSuccess] =
    useState<string | null>(null);

  const [representative, setRepresentative] =
    useState<RepresentativeWarrantyInfo | null>(null);

  const [warehouseProducts, setWarehouseProducts] =
    useState<WarrantyWarehouseProduct[]>([]);

  const [loadingFormData, setLoadingFormData] =
    useState(true);

  const [formError, setFormError] = useState<string | null>(
    null,
  );


  const selectedProduct = useMemo(() => {
    return (
      warehouseProducts.find((product) => {
        return product.productId === selectedProductId;
      }) || null
    );
  }, [selectedProductId, warehouseProducts]);


  const loadWarrantyFormData = async () => {
    try {
      setLoadingFormData(true);
      setFormError(null);

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/warranties/form-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const result: WarrantyFormDataResponse =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.error ||
            'خطا در دریافت اطلاعات فرم گارانتی.',
        );
      }

      setRepresentative(result.data.representative);

      setWarehouseProducts(
        Array.isArray(result.data.products)
          ? result.data.products
          : [],
      );
    } catch (error) {
      console.error(
        'خطا در دریافت داده‌های فرم گارانتی:',
        error,
      );

      setFormError(
        error instanceof Error
          ? error.message
          : 'خطا در ارتباط با سرور.',
      );
    } finally {
      setLoadingFormData(false);
    }
  };


  useEffect(() => {
    void loadWarrantyFormData();
  }, []);


  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم فایل باید حداکثر ۵ مگابایت باشد.');
      return;
    }

    const fileReader = new FileReader();

    fileReader.onload = () => {
      setImagePreview(String(fileReader.result || ''));
      setImageFileName(file.name);
      setImageFile(file);
      setSubmitError(null);
    };

    fileReader.readAsDataURL(file);
  };


  const removeImage = () => {
    setImagePreview(null);
    setImageFileName('');
    setImageFile(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };


  const handleProductChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const productId = event.target.value;

    setSelectedProductId(productId);
    setQuantity(1);
  };


  const handleDemoSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const token = getToken();

      if (!token) {
        throw new Error('توکن ورود پیدا نشد.');
      }

      if (!selectedProduct) {
        throw new Error('محصولی انتخاب نشده است.');
      }

      const formData = new FormData();

      formData.append('customerName', customerName.trim());
      formData.append('customerPhone', customerPhone.replace(/[\s-]/g, ''));
      formData.append('productId', selectedProduct.productId);
      formData.append('quantity', String(quantity));
      formData.append('issueDescription', issueDescription.trim());

      if (!imageFile) {
        throw new Error('فایلی انتخاب نشده است.');
      }

      formData.append('image', imageFile, imageFile.name);

      const response = await fetch(`${API_BASE_URL}/api/warranties`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'خطا در ثبت');
      }

      setSubmitSuccess('درخواست با موفقیت ثبت شد.');

      setCustomerName('');
      setCustomerPhone('');
      setSelectedProductId('');
      setQuantity(1);
      setIssueDescription('');
      removeImage();

      await loadWarrantyFormData();
    } catch (e: any) {
      setSubmitError(e?.message || 'خطا');
    } finally {
      setSubmitting(false);
    }
  };


  if (loadingFormData) {
    return (
      <section
        dir="rtl"
        className="flex min-h-[420px] items-center justify-center rounded-2xl border border-sky-100 bg-white"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <LoaderCircle className="h-10 w-10 animate-spin text-sky-600" />

          <p className="text-sm font-bold text-slate-600">
            در حال دریافت اطلاعات انبار و کد نمایندگی...
          </p>
        </div>
      </section>
    );
  }


  if (formError) {
    return (
      <section
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
      >
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

        <p className="mt-3 font-black text-red-700">
          دریافت اطلاعات گارانتی ناموفق بود
        </p>

        <p className="mt-2 text-sm leading-7 text-red-600">
          {formError}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadWarrantyFormData();
          }}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
        >
          تلاش مجدد
        </button>
      </section>
    );
  }


  return (
    <section
      dir="rtl"
      className="space-y-5 pb-8"
    >
      <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-lg shadow-sky-950/5">
        <div className="relative overflow-hidden bg-gradient-to-l from-sky-700 via-cyan-600 to-teal-500 px-5 py-6 text-white md:px-7">
          <div className="absolute -left-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 right-24 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sky-100">
                <ShieldCheck className="h-5 w-5" />

                <span className="text-sm font-bold">
                  سامانه خدمات پس از فروش
                </span>
              </div>

              <h2 className="text-2xl font-black md:text-3xl">
                استفاده از گارانتی
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-sky-50 md:text-base">
                اطلاعات مشتری، کالای موجود در انبار و تصویر خرابی را ثبت کنید تا درخواست شما برای بررسی ارسال شود.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 backdrop-blur-sm">
                <CalendarDays className="h-5 w-5" />

                <div>
                  <p className="text-[11px] font-bold text-sky-100">
                    تاریخ ثبت
                  </p>

                  <p className="text-sm font-black">
                    {todayFa}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />

                <div>
                  <p className="text-[11px] font-bold text-sky-100">
                    کد نمایندگی
                  </p>

                  <p
                    dir="ltr"
                    className="text-sm font-black"
                  >
                    {representative?.code || 'ثبت نشده'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-5 py-3 text-xs font-black">
                  مرحله
                </th>

                <th className="whitespace-nowrap border-b border-slate-200 px-5 py-3 text-xs font-black">
                  کاری که باید انجام دهید
                </th>

                <th className="whitespace-nowrap border-b border-slate-200 px-5 py-3 text-xs font-black">
                  نکته مهم
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              <tr className="transition-colors hover:bg-sky-50/60">
                <td className="px-5 py-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-700">
                    ۱
                  </span>
                </td>

                <td className="px-5 py-4 font-bold">
                  اطلاعات مشتری و محصول را ثبت کنید
                </td>

                <td className="px-5 py-4 text-xs leading-6 text-slate-500">
                  محصول فقط از موجودی انبار اختصاصی نمایندگی شما انتخاب می‌شود.
                </td>
              </tr>

              <tr className="transition-colors hover:bg-sky-50/60">
                <td className="px-5 py-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-700">
                    ۲
                  </span>
                </td>

                <td className="px-5 py-4 font-bold">
                  مشکل کالا را دقیق توضیح دهید
                </td>

                <td className="px-5 py-4 text-xs leading-6 text-slate-500">
                  شرح کامل خرابی باعث بررسی سریع‌تر درخواست می‌شود.
                </td>
              </tr>

              <tr className="transition-colors hover:bg-sky-50/60">
                <td className="px-5 py-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-700">
                    ۳
                  </span>
                </td>

                <td className="px-5 py-4 font-bold">
                  فایل (عکس) از کالا یا خرابی ثبت کنید
                </td>

                <td className="px-5 py-4 text-xs leading-6 text-slate-500">
                  در موبایل، دوربین پشت گوشی برای ثبت فایل باز می‌شود. هر نام و پسوندی قابل قبول است.
                </td>
              </tr>

              <tr className="transition-colors hover:bg-sky-50/60">
                <td className="px-5 py-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-700">
                    ۴
                  </span>
                </td>

                <td className="px-5 py-4 font-bold">
                  درخواست را برای بررسی ارسال کنید
                </td>

                <td className="px-5 py-4 text-xs leading-6 text-slate-500">
                  وضعیت اولیه تمام درخواست‌ها «در انتظار بررسی» است.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      <form
        onSubmit={handleDemoSubmit}
        noValidate
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-black text-slate-800">
                فرم ثبت درخواست گارانتی
              </h3>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                همه فیلدهای دارای علامت * الزامی هستند.
              </p>
            </div>
          </div>

          <span className="w-fit rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            وضعیت پس از ثبت: در انتظار بررسی
          </span>
        </div>


        <div className="p-5 md:p-7">
          {submitError ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="font-black">
                  ثبت درخواست ناموفق بود
                </p>

                <p className="mt-1 text-sm font-medium leading-7">
                  {submitError}
                </p>
              </div>
            </div>
          ) : null}

          {submitSuccess ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="font-black">
                  درخواست گارانتی ثبت شد
                </p>

                <p className="mt-1 text-sm font-medium leading-7">
                  {submitSuccess}
                </p>
              </div>
            </div>
          ) : null}


          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-sky-600" />

              <h4 className="font-black text-slate-800">
                اطلاعات مشتری و نمایندگی
              </h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  نام مشتری{' '}
                  <span className="text-rose-500">*</span>
                </span>

                <div className="relative">
                  <UserRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value);
                    }}
                    placeholder="مثال: علی رضایی"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </label>


              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  شماره موبایل مشتری{' '}
                  <span className="text-rose-500">*</span>
                </span>

                <div className="relative">
                  <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(event) => {
                      setCustomerPhone(event.target.value);
                    }}
                    placeholder="021-93111021"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-3 text-left text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </label>


              <div>
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  کد نمایندگی
                </span>

                <div className="flex h-[46px] items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sky-800">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600" />

                  <span
                    dir="ltr"
                    className="text-sm font-black"
                  >
                    {representative?.code || 'ثبت نشده'}
                  </span>
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  نام نمایندگی
                </span>

                <div className="flex h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-500" />

                  <span className="truncate text-sm font-bold">
                    {representative?.name || 'ثبت نشده'}
                  </span>
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  شهر نمایندگی
                </span>

                <div className="flex h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-500" />

                  <span className="truncate text-sm font-bold">
                    {representative?.city || 'ثبت نشده'}
                  </span>
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  تاریخ درخواست
                </span>

                <div className="flex h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700">
                  <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />

                  <span className="text-sm font-bold">
                    {todayFa}
                  </span>
                </div>
              </div>
            </div>
          </div>


          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-sky-600" />

              <h4 className="font-black text-slate-800">
                اطلاعات کالا
              </h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  انتخاب محصول از انبار{' '}
                  <span className="text-rose-500">*</span>
                </span>

                <div className="relative">
                  <PackageSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <select
                    value={selectedProductId}
                    onChange={handleProductChange}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-10 text-sm font-medium text-slate-800 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="">
                      انتخاب محصول موجود در انبار
                    </option>

                    {warehouseProducts.map((product) => (
                      <option
                        key={product.warehouseItemId}
                        value={product.productId}
                      >
                        {product.productName} — {product.brand || 'بدون برند'} — موجودی: {product.quantity}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {warehouseProducts.length === 0 ? (
                  <p className="mt-2 text-xs font-bold text-amber-600">
                    کالای دارای موجودی در انبار شما پیدا نشد.
                  </p>
                ) : null}
              </label>


              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  تعداد{' '}
                  <span className="text-rose-500">*</span>
                </span>

                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity || 1}
                  value={quantity}
                  disabled={!selectedProduct}
                  onChange={(event) => {
                    setQuantity(
                      Number(event.target.value) || 1,
                    );
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </div>


            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  برند کالا
                </p>

                <p className="mt-1 font-black text-slate-800">
                  {selectedProduct?.brand ||
                    'پس از انتخاب محصول'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  موجودی قابل ثبت
                </p>

                <p className="mt-1 font-black text-slate-800">
                  {selectedProduct
                    ? `${selectedProduct.quantity} عدد`
                    : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mt-1 font-black text-slate-800">
                  {selectedProduct
                    ? formatPrice(
                        selectedProduct.unitPrice,
                      )
                    : '—'}
                </p>
              </div>
            </div>
          </div>


          <div className="mb-8">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <AlertCircle className="h-4 w-4 text-sky-600" />
                شرح مشکل کالا{' '}
                <span className="text-rose-500">*</span>
              </span>

              <textarea
                rows={5}
                value={issueDescription}
                onChange={(event) => {
                  setIssueDescription(event.target.value);
                }}
                placeholder="مشکل یا خرابی کالا را با جزئیات توضیح دهید؛ مثال: نشتی از محل اتصال، شکستگی بدنه، عملکرد نادرست و..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <p className="mt-2 text-xs font-medium text-slate-400">
              حداقل ۱۰ کاراکتر وارد کنید.
            </p>
          </div>


          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Camera className="h-5 w-5 text-sky-600" />

              <h4 className="font-black text-slate-800">
                فایل (عکس) کالا یا خرابی
              </h4>

              <span className="text-sm font-bold text-rose-500">
                *
              </span>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="*/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={imagePreview}
                    alt="پیش‌نمایش فایل گارانتی"
                    className="h-44 w-full rounded-xl object-cover sm:w-56"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />

                      <p className="font-black">
                        فایل آمادهٔ ارسال است
                      </p>
                    </div>

                    <p className="mt-2 truncate text-sm font-medium text-slate-600">
                      {imageFileName}
                    </p>

                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      پیش از ثبت نهایی، از واضح بودن عکس و مشخص بودن خرابی اطمینان بگیرید.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          imageInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-50"
                      >
                        <Camera className="h-4 w-4" />
                        تغییر فایل
                      </button>

                      <button
                        type="button"
                        onClick={removeImage}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <X className="h-4 w-4" />
                        حذف فایل
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click();
                }}
                className="group flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/60 px-5 py-7 text-center transition-all hover:border-sky-500 hover:bg-sky-50"
              >
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm transition-transform group-hover:scale-110">
                  <ImagePlus className="h-7 w-7" />
                </span>

                <span className="font-black text-sky-800">
                  گرفتن عکس با دوربین یا انتخاب فایل
                </span>

                <span className="mt-2 max-w-md text-xs font-medium leading-6 text-slate-500">
                  در تلفن همراه دوربین پشت گوشی باز می‌شود. هر نام و پسوندی قابل قبول است؛ فقط حجم فایل باید حداکثر ۵ مگابایت باشد.
                </span>
              </button>
            )}
          </div>


          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              کد نمایندگی و محصول از اطلاعات واقعی حساب و انبار شما دریافت شده‌اند.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-sky-700 to-cyan-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-600/25 transition-all hover:-translate-y-0.5 hover:from-sky-800 hover:to-cyan-700 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  در حال ثبت درخواست...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  ثبت نهایی درخواست گارانتی
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* لیست گارانتی‌های ثبت‌شده توسط این نماینده */}
      <div className="mt-6">
        <MyWarranties />
      </div>
    </section>
  );
};


export default RepresentativeWarrantyPage;