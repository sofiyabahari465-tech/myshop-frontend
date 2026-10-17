import React, {
  useMemo,
  useState,
} from 'react';


import {
  Boxes,
  Check,
  PackageOpen,
  Palette,
  Printer,
  Search,
  Settings2,
  SlidersHorizontal,
  Warehouse,
  X,
} from 'lucide-react';


import InventoryPrint from './InventoryPrint';


export type DashboardInventoryItem = {
  id: string;
  title: string;
  brand?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
};


type InventorySectionProps = {
  items?: DashboardInventoryItem[];
  representativeName?: string;
  representativeCity?: string;
  representativePhone?: string;
  representativeAddress?: string;
};


type PrintTemplateSettings = {
  companyName: string;
  companyTagline: string;
  companyLogoSrc: string;
  reportTitle: string;
  footerText: string;
  signatureLabel: string;
  primaryColor: string;
};


const PRINT_TEMPLATE_STORAGE_KEY =
  'inventory-print-template-settings-v2';


const DEFAULT_PRINT_TEMPLATE: PrintTemplateSettings = {
  companyName: 'نام شرکت شما',
  companyTagline:
    'سامانه مدیریت نمایندگی و انبار',
  companyLogoSrc: '/company-logo.png',
  reportTitle:
    'گزارش موجودی انبار نمایندگی',
  footerText:
    'این گزارش به‌صورت خودکار از سامانه مدیریت انبار تهیه شده است.',
  signatureLabel: 'امضا و مهر نمایندگی:',
  primaryColor: '#111827',
};


const FIXED_CATEGORIES = [
  'لنت ترمز خودرو',
  'جلوبندی خودرو',
  'برق خودرو',
  'بدنه خودرو',
  'قطعات موتوری',
  'انواع تسمه',
  'لوازم اسپرت',
  'روغن خودرو',
] as const;


const toPersianNumber = (
  value: number,
): string => {
  return new Intl.NumberFormat('fa-IR').format(
    Number.isFinite(value) ? value : 0,
  );
};


const toNumber = (value: unknown): number => {
  const normalized = String(value ?? '')
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    )
    .replace(/[,٬،\s]/g, '')
    .replace(/[^\d.-]/g, '');


  const result = Number(normalized);


  return Number.isFinite(result)
    ? result
    : 0;
};


const cleanText = (value: unknown): string => {
  return String(value ?? '').trim();
};


const normalizeSearchText = (
  value: unknown,
): string => {
  return cleanText(value)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200e\u200f\u00a0]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};


const getBrandLabel = (
  item: DashboardInventoryItem,
): string => {
  return cleanText(item.brand) || 'بدون برند';
};


const getCategoryLabel = (
  item: DashboardInventoryItem,
): string => {
  return cleanText(item.category) || 'بدون دسته‌بندی';
};


const isValidHexColor = (
  value: string,
): boolean => {
  return /^#[0-9a-fA-F]{6}$/.test(
    cleanText(value),
  );
};


const readPrintTemplate =
  (): PrintTemplateSettings => {
    try {
      const stored = localStorage.getItem(
        PRINT_TEMPLATE_STORAGE_KEY,
      );


      if (!stored) {
        return DEFAULT_PRINT_TEMPLATE;
      }


      const parsed = JSON.parse(stored) as Partial<
        PrintTemplateSettings
      >;


      return {
        companyName:
          cleanText(parsed.companyName) ||
          DEFAULT_PRINT_TEMPLATE.companyName,


        companyTagline:
          cleanText(parsed.companyTagline) ||
          DEFAULT_PRINT_TEMPLATE.companyTagline,


        companyLogoSrc:
          cleanText(parsed.companyLogoSrc) ||
          DEFAULT_PRINT_TEMPLATE.companyLogoSrc,


        reportTitle:
          cleanText(parsed.reportTitle) ||
          DEFAULT_PRINT_TEMPLATE.reportTitle,


        footerText:
          cleanText(parsed.footerText) ||
          DEFAULT_PRINT_TEMPLATE.footerText,


        signatureLabel:
          cleanText(parsed.signatureLabel) ||
          DEFAULT_PRINT_TEMPLATE.signatureLabel,


        primaryColor: isValidHexColor(
          String(parsed.primaryColor ?? ''),
        )
          ? String(parsed.primaryColor)
          : DEFAULT_PRINT_TEMPLATE.primaryColor,
      };
    } catch {
      return DEFAULT_PRINT_TEMPLATE;
    }
  };


const savePrintTemplate = (
  settings: PrintTemplateSettings,
): void => {
  localStorage.setItem(
    PRINT_TEMPLATE_STORAGE_KEY,
    JSON.stringify(settings),
  );
};


const getItemTotal = (
  item: DashboardInventoryItem,
): number => {
  if (item.totalPrice !== undefined) {
    return toNumber(item.totalPrice);
  }


  return (
    toNumber(item.quantity) *
    toNumber(item.unitPrice)
  );
};


const InventorySection = ({
  items = [],
  representativeName = '',
  representativeCity = '',
  representativePhone = '',
  representativeAddress = '',
}: InventorySectionProps) => {
  const safeItems = Array.isArray(items)
    ? items
    : [];


  const [search, setSearch] = useState('');


  const [selectedBrand, setSelectedBrand] =
    useState('');


  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('');


  const [
    isTemplateModalOpen,
    setIsTemplateModalOpen,
  ] = useState(false);


  const [templateSaved, setTemplateSaved] =
    useState(false);


  const [isPrintPreviewOpen, setIsPrintPreviewOpen] =
    useState(false);


  const [printTemplate, setPrintTemplate] =
    useState<PrintTemplateSettings>(() =>
      readPrintTemplate(),
    );


  const [templateDraft, setTemplateDraft] =
    useState<PrintTemplateSettings>(
      () => readPrintTemplate(),
    );


  const brands = useMemo(() => {
    const values = new Set<string>();


    safeItems.forEach((item) => {
      values.add(getBrandLabel(item));
    });


    return Array.from(values).sort(
      (first, second) =>
        first.localeCompare(second, 'fa'),
    );
  }, [safeItems]);


  const filteredItems = useMemo(() => {
    const normalizedSearch =
      normalizeSearchText(search);


    return safeItems.filter((item) => {
      const title = cleanText(item.title);
      const brand = getBrandLabel(item);
      const category = getCategoryLabel(item);


      const searchableText =
        normalizeSearchText(
          `${title} ${brand} ${category}`,
        );


      return (
        (!normalizedSearch ||
          searchableText.includes(
            normalizedSearch,
          )) &&
        (!selectedBrand ||
          brand === selectedBrand) &&
        (!selectedCategory ||
          category === selectedCategory)
      );
    });
  }, [
    safeItems,
    search,
    selectedBrand,
    selectedCategory,
  ]);


  const totalProductTypes =
    safeItems.length;


  const totalQuantity = safeItems.reduce(
    (sum, item) =>
      sum + toNumber(item.quantity),
    0,
  );


  const totalValue = safeItems.reduce(
    (sum, item) =>
      sum + getItemTotal(item),
    0,
  );


  const filteredQuantity = filteredItems.reduce(
    (sum, item) =>
      sum + toNumber(item.quantity),
    0,
  );


  const filteredValue = filteredItems.reduce(
    (sum, item) =>
      sum + getItemTotal(item),
    0,
  );


  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(selectedBrand) ||
    Boolean(selectedCategory);


  const printFilterDescription = useMemo(() => {
    const parts: string[] = [];


    if (search.trim()) {
      parts.push(
        `جست‌وجو: «${search.trim()}»`,
      );
    }


    if (selectedBrand) {
      parts.push(`برند: ${selectedBrand}`);
    }


    if (selectedCategory) {
      parts.push(
        `دسته‌بندی: ${selectedCategory}`,
      );
    }


    return parts.length > 0
      ? parts.join(' | ')
      : 'بدون فیلتر';
  }, [
    search,
    selectedBrand,
    selectedCategory,
  ]);


  const clearFilters = () => {
    setSearch('');
    setSelectedBrand('');
    setSelectedCategory('');
  };


  const openTemplateSettings = () => {
    setTemplateDraft(printTemplate);
    setTemplateSaved(false);
    setIsTemplateModalOpen(true);
  };


  const closeTemplateSettings = () => {
    setTemplateDraft(printTemplate);
    setTemplateSaved(false);
    setIsTemplateModalOpen(false);
  };


  const updateTemplateDraft = (
    field: keyof PrintTemplateSettings,
    value: string,
  ) => {
    setTemplateSaved(false);


    setTemplateDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };


  const handleSaveTemplate = () => {
    const primaryColor = isValidHexColor(
      templateDraft.primaryColor,
    )
      ? templateDraft.primaryColor
      : DEFAULT_PRINT_TEMPLATE.primaryColor;


    const nextTemplate: PrintTemplateSettings = {
      companyName:
        cleanText(templateDraft.companyName) ||
        DEFAULT_PRINT_TEMPLATE.companyName,


      companyTagline:
        cleanText(templateDraft.companyTagline) ||
        DEFAULT_PRINT_TEMPLATE.companyTagline,


      companyLogoSrc: cleanText(
        templateDraft.companyLogoSrc,
      ),


      reportTitle:
        cleanText(templateDraft.reportTitle) ||
        DEFAULT_PRINT_TEMPLATE.reportTitle,


      footerText:
        cleanText(templateDraft.footerText) ||
        DEFAULT_PRINT_TEMPLATE.footerText,


      signatureLabel:
        cleanText(templateDraft.signatureLabel) ||
        DEFAULT_PRINT_TEMPLATE.signatureLabel,


      primaryColor,
    };


    setPrintTemplate(nextTemplate);
    setTemplateDraft(nextTemplate);
    savePrintTemplate(nextTemplate);
    setTemplateSaved(true);
  };


  const handleResetTemplate = () => {
    const accepted = window.confirm(
      'آیا تنظیمات قالب چاپ به حالت پیش‌فرض برگردد؟',
    );


    if (!accepted) {
      return;
    }


    setPrintTemplate(DEFAULT_PRINT_TEMPLATE);
    setTemplateDraft(DEFAULT_PRINT_TEMPLATE);


    localStorage.removeItem(
      PRINT_TEMPLATE_STORAGE_KEY,
    );


    setTemplateSaved(true);
  };


  const openPrintPreview = () => {
    setIsPrintPreviewOpen(true);
  };


  const closePrintPreview = () => {
    setIsPrintPreviewOpen(false);
  };


  return (
    <section
      dir="rtl"
      className="inventory-section overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 p-5 dark:border-slate-700 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-slate-700">
              <Warehouse className="h-6 w-6" />
            </div>


            <div>
              <h2 className="font-black text-slate-900 dark:text-white md:text-lg">
                موجودی انبار نمایندگی
              </h2>


              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                جست‌وجو، فیلتر، تنظیم قالب و چاپ گزارش موجودی.
              </p>
            </div>
          </div>


          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                تنوع کالا
              </p>


              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
                {toPersianNumber(totalProductTypes)} کالا
              </p>
            </div>


            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                تعداد کل اقلام
              </p>


              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
                {toPersianNumber(totalQuantity)} قلم
              </p>
            </div>


            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                مجموع
              </p>


              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
                {toPersianNumber(totalValue)} تومان
              </p>
            </div>
          </div>
        </div>
      </div>


      {safeItems.length === 0 ? (
        <div className="p-10 text-center">
          <PackageOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />


          <p className="mt-4 font-black text-slate-600 dark:text-slate-300">
            کالایی در انبار ثبت نشده است.
          </p>


          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
            پس از ثبت کالا، جزئیات موجودی در این بخش نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />


                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="جست‌وجو بر اساس عنوان، برند یا دسته‌بندی..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-800"
                />
              </div>


              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <select
                    value={selectedBrand}
                    onChange={(event) =>
                      setSelectedBrand(event.target.value)
                    }
                    className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:min-w-44"
                  >
                    <option value="">همهٔ برندها</option>


                    {brands.map((brand) => (
                      <option
                        key={brand}
                        value={brand}
                      >
                        {brand}
                      </option>
                    ))}
                  </select>


                  <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>


                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:min-w-48"
                  >
                    <option value="">
                      همهٔ دسته‌بندی‌ها
                    </option>


                    {FIXED_CATEGORIES.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>


                  <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>


                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                    پاک‌کردن
                  </button>
                )}


                <button
                  type="button"
                  onClick={openPrintPreview}
                  disabled={filteredItems.length === 0}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Printer className="h-4 w-4" />
                  پیش‌نمایش و چاپ
                </button>
              </div>
            </div>


            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-bold text-slate-600 dark:text-slate-300">
                {hasActiveFilters
                  ? `${toPersianNumber(filteredItems.length)} کالا از ${toPersianNumber(safeItems.length)} کالا پیدا شد.`
                  : `${toPersianNumber(safeItems.length)} کالا در انبار موجود است.`}
              </p>


              {hasActiveFilters && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تعداد نتایج: {toPersianNumber(filteredQuantity)} قلم · مجموع: {toPersianNumber(filteredValue)} تومان
                </p>
              )}
            </div>
          </div>


          <div className="p-5">
            {filteredItems.length === 0 ? (
              <div className="p-10 text-center">
                <Search className="mx-auto h-12 w-12 text-slate-300" />


                <p className="mt-4 font-black text-slate-600">
                  کالایی با این شرایط پیدا نشد.
                </p>


                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  پاک‌کردن فیلترها
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {filteredItems.map((item) => {
                    const quantity = toNumber(
                      item.quantity,
                    );


                    const unitPrice = toNumber(
                      item.unitPrice,
                    );


                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            <Boxes className="h-5 w-5" />
                          </div>


                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-800 dark:text-white">
                              {item.title || 'بدون عنوان'}
                            </p>


                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {getBrandLabel(item)}
                            </p>
                          </div>
                        </div>


                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-indigo-50 p-3 text-center dark:bg-indigo-950/30">
                            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              برند
                            </p>


                            <p className="mt-1 truncate text-sm font-black text-indigo-900 dark:text-indigo-100">
                              {getBrandLabel(item)}
                            </p>
                          </div>


                          <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/30">
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                              دسته‌بندی
                            </p>


                            <p className="mt-1 truncate text-sm font-black text-amber-900 dark:text-amber-100">
                              {getCategoryLabel(item)}
                            </p>
                          </div>
                        </div>


                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              تعداد
                            </p>


                            <p className="mt-1 text-sm font-black text-emerald-900 dark:text-emerald-100">
                              {toPersianNumber(quantity)}
                            </p>
                          </div>


                          <div className="rounded-xl bg-sky-50 p-3 text-center dark:bg-sky-950/30">
                            <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                              قیمت 
                            </p>


                            <p className="mt-1 truncate text-sm font-black text-sky-900 dark:text-sky-100">
                              {toPersianNumber(unitPrice)}
                            </p>
                          </div>


                          <div className="rounded-xl bg-purple-50 p-3 text-center dark:bg-purple-950/30">
                            <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                               مجموع
                            </p>


                            <p className="mt-1 truncate text-sm font-black text-purple-900 dark:text-purple-100">
                              {toPersianNumber(getItemTotal(item))}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>


                <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block dark:border-slate-700 dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-center text-sm text-slate-700 dark:text-slate-200">
                      <thead className="border-b border-slate-200 bg-gradient-to-l from-slate-50 to-slate-100 text-xs text-slate-600 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300">
                        <tr className="h-14">
                          <th className="whitespace-nowrap border-l border-slate-200 px-5 py-4 font-black last:border-l-0 dark:border-slate-700">
                            عنوان 
                          </th>


                          <th className="whitespace-nowrap border-l border-slate-200 px-5 py-4 font-black last:border-l-0 dark:border-slate-700">
                            برند
                          </th>


                          <th className="whitespace-nowrap border-l border-slate-200 px-5 py-4 font-black last:border-l-0 dark:border-slate-700">
                            دسته‌بندی
                          </th>


                          <th className="whitespace-nowrap border-l border-slate-200 px-5 py-4 font-black last:border-l-0 dark:border-slate-700">
                            تعداد 
                          </th>


                          <th className="whitespace-nowrap border-l border-slate-200 px-5 py-4 font-black last:border-l-0 dark:border-slate-700">
                            قیمت 
                          </th>


                          <th className="whitespace-nowrap px-5 py-4 font-black">
                             مجموع 
                          </th>
                        </tr>
                      </thead>


                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="h-16 bg-white transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                          >
                            <td className="border-l border-slate-100 px-5 py-4 font-black text-slate-800 last:border-l-0 dark:border-slate-800 dark:text-slate-100">
                              {item.title || 'بدون عنوان'}
                            </td>


                            <td className="border-l border-slate-100 px-5 py-4 text-slate-500 last:border-l-0 dark:border-slate-800 dark:text-slate-300">
                              {getBrandLabel(item)}
                            </td>


                            <td className="border-l border-slate-100 px-5 py-4 text-slate-500 last:border-l-0 dark:border-slate-800 dark:text-slate-300">
                              {getCategoryLabel(item)}
                            </td>


                            <td className="border-l border-slate-100 px-5 py-4 font-black text-emerald-700 last:border-l-0 dark:border-slate-800 dark:text-emerald-300">
                              {toPersianNumber(
                                item.quantity,
                              )}{' '}
                              قلم
                            </td>


                            <td className="border-l border-slate-100 px-5 py-4 font-semibold text-sky-700 last:border-l-0 dark:border-slate-800 dark:text-sky-300">
                              {toPersianNumber(
                                item.unitPrice,
                              )}{' '}
                              تومان
                            </td>


                            <td className="px-5 py-4 font-black text-violet-700 dark:text-violet-300">
                              {toPersianNumber(
                                getItemTotal(item),
                              )}{' '}
                              تومان
                            </td>
                          </tr>
                        ))}
                      </tbody>


                      <tfoot className="border-t-2 border-slate-300 bg-gradient-to-l from-slate-50 to-slate-100 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                        <tr className="h-16">
                          <td
                            colSpan={3}
                            className="border-l border-slate-200 px-5 py-4 font-black text-slate-800 last:border-l-0 dark:border-slate-700 dark:text-slate-100"
                          >
                            {hasActiveFilters
                              ? 'جمع نتایج فیلترشده'
                              : 'جمع کل انبار'}
                          </td>


                          <td className="border-l border-slate-200 px-5 py-4 font-black text-emerald-700 last:border-l-0 dark:border-slate-700 dark:text-emerald-300">
                            {toPersianNumber(
                              filteredQuantity,
                            )}{' '}
                            قلم
                          </td>


                          <td className="border-l border-slate-200 px-5 py-4 text-slate-400 last:border-l-0 dark:border-slate-700 dark:text-slate-500">
                            —
                          </td>


                          <td className="px-5 py-4 font-black text-violet-700 dark:text-violet-300">
                            {toPersianNumber(
                              filteredValue,
                            )}{' '}
                            تومان
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}


      {isPrintPreviewOpen && (
        <InventoryPrint
          items={filteredItems}
          settings={printTemplate}
          representativeName={representativeName}
          representativeCity={representativeCity}
          representativePhone={representativePhone}
          representativeAddress={representativeAddress}
          filterDescription={printFilterDescription}
          onClose={closePrintPreview}
        />
      )}


      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-700">
                  <Palette className="h-5 w-5" />
                </div>


                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">
                    شخصی‌سازی قالب چاپ
                  </h3>


                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    تنظیمات روی همین مرورگر ذخیره می‌شوند.
                  </p>
                </div>
              </div>


              <button
                type="button"
                onClick={closeTemplateSettings}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>


            <div className="space-y-5 p-4 sm:p-5">
              {templateSaved && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300">
                  <Check className="h-5 w-5" />
                  تنظیمات قالب چاپ ذخیره شد.
                </div>
              )}


              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  نام شرکت


                  <input
                    type="text"
                    value={templateDraft.companyName}
                    onChange={(event) =>
                      updateTemplateDraft(
                        'companyName',
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </label>


                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  زیرعنوان شرکت


                  <input
                    type="text"
                    value={templateDraft.companyTagline}
                    onChange={(event) =>
                      updateTemplateDraft(
                        'companyTagline',
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </label>


                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 md:col-span-2">
                  مسیر لوگو


                  <input
                    type="text"
                    dir="ltr"
                    value={templateDraft.companyLogoSrc}
                    onChange={(event) =>
                      updateTemplateDraft(
                        'companyLogoSrc',
                        event.target.value,
                      )
                    }
                    placeholder="/company-logo.png"
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </label>


                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  عنوان گزارش


                  <input
                    type="text"
                    value={templateDraft.reportTitle}
                    onChange={(event) =>
                      updateTemplateDraft(
                        'reportTitle',
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </label>


                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  رنگ اصلی


                  <input
                    type="color"
                    value={
                      isValidHexColor(
                        templateDraft.primaryColor,
                      )
                        ? templateDraft.primaryColor
                        : DEFAULT_PRINT_TEMPLATE.primaryColor
                    }
                    onChange={(event) =>
                      updateTemplateDraft(
                        'primaryColor',
                        event.target.value,
                      )
                    }
                    className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-slate-300 p-1 dark:border-slate-600"
                  />
                </label>


                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 md:col-span-2">
                  متن پایین گزارش


                  <textarea
                    value={templateDraft.footerText}
                    onChange={(event) =>
                      updateTemplateDraft(
                        'footerText',
                        event.target.value,
                      )
                    }
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </label>


                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 md:col-span-2">
                  متن امضا


                  <input
                    type="text"
                    value={templateDraft.signatureLabel}
                    onChange={(event) =>
                      updateTemplateDraft(
                        'signatureLabel',
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>
            </div>


            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleResetTemplate}
                className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
              >
                بازنشانی پیش‌فرض
              </button>


              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closeTemplateSettings}
                  className="min-h-11 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  بستن
                </button>


                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white dark:bg-slate-700"
                >
                  <Check className="h-4 w-4" />
                  ذخیرهٔ تنظیمات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};


export default InventorySection;