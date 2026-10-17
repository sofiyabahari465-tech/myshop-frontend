import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Filter,
  PackageX,
  Search,
  SearchX,
  Tag,
  Pencil,
  Trash2,
} from 'lucide-react';

import type {
  Product,
  UserRole,
} from '../types';

interface Props {
  products: Product[];
  userRole: UserRole;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const FIXED_CATEGORIES = [
  'لنت ترمز خودرو',
  'جلوبندی خودرو',
  'برق خودرو',
  'بدنه خودرو',
  'قطعات موتوری',
  'انواع تسمه',
  'لوازم اسپرت',
  'روغن خودرو',
];

const formatPrice = (
  price: unknown,
): string => {
  const numericPrice = Number(price);

  return `${new Intl.NumberFormat(
    'fa-IR',
  ).format(
    Number.isFinite(numericPrice)
      ? numericPrice
      : 0,
  )} تومان`;
};

const normalizeText = (
  value: unknown,
): string => {
  return String(value ?? '')
    .replace(/\u200c/g, ' ')
    .replace(/\u200f/g, '')
    .replace(/\u200e/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const getProductName = (
  product: Product,
): string => {
  return String(
    product.name ||
      product.productName ||
      product.title ||
      'بدون نام',
  ).trim();
};

const getProductBrand = (
  product: Product,
): string => {
  return String(
    product.brand ||
      product.brandName ||
      '',
  ).trim();
};

const getProductCategory = (
  product: Product,
): string => {
  return String(
    product.category ||
      '',
  ).trim();
};

const getProductKey = (
  product: Product,
  index: number,
): string => {
  const id = String(
    product.id ?? '',
  ).trim();

  if (id) {
    return id;
  }

  const name = normalizeText(
    getProductName(product),
  );

  const category = normalizeText(
    getProductCategory(product),
  );

  return `product-${name}-${category}-${index}`;
};

const ProductsTable: React.FC<Props> = ({
  products,
  userRole,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] =
    useState('');

  const [selectedCategory, setSelectedCategory] =
    useState('');

  const [selectedBrand, setSelectedBrand] =
    useState('');

  const safeProducts = useMemo(() => {
    return Array.isArray(products)
      ? products.filter(Boolean)
      : [];
  }, [products]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();

    FIXED_CATEGORIES.forEach((category) => {
      categorySet.add(category);
    });

    safeProducts.forEach((product) => {
      const category =
        getProductCategory(product);

      if (category) {
        categorySet.add(category);
      }
    });

    return Array.from(categorySet);
  }, [safeProducts]);

  const brands = useMemo(() => {
    const brandSet = new Set<string>();

    safeProducts.forEach((product) => {
      const brand =
        getProductBrand(product);

      if (brand) {
        brandSet.add(brand);
      }
    });

    return Array.from(brandSet).sort(
      (first, second) =>
        first.localeCompare(
          second,
          'fa',
        ),
    );
  }, [safeProducts]);

  useEffect(() => {
    if (
      selectedCategory &&
      !categories.includes(selectedCategory)
    ) {
      setSelectedCategory('');
    }
  }, [
    categories,
    selectedCategory,
  ]);

  useEffect(() => {
    if (
      selectedBrand &&
      !brands.includes(selectedBrand)
    ) {
      setSelectedBrand('');
    }
  }, [
    brands,
    selectedBrand,
  ]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchTerm);

    const normalizedCategory =
      normalizeText(selectedCategory);

    const normalizedBrand =
      normalizeText(selectedBrand);

    return safeProducts.filter((product) => {
      const name = normalizeText(
        getProductName(product),
      );

      const brand = normalizeText(
        getProductBrand(product),
      );

      const category = normalizeText(
        getProductCategory(product),
      );

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        brand.includes(normalizedSearch) ||
        category.includes(normalizedSearch);

      const matchesCategory =
        !normalizedCategory ||
        category === normalizedCategory;

      const matchesBrand =
        !normalizedBrand ||
        brand === normalizedBrand;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand
      );
    });
  }, [
    safeProducts,
    searchTerm,
    selectedCategory,
    selectedBrand,
  ]);

  const hasFilters =
    Boolean(
      searchTerm ||
        selectedCategory ||
        selectedBrand,
    );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
  };

  const isAdmin =
    userRole === 'admin';

  if (safeProducts.length === 0) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg dark:border-gray-800 dark:bg-gray-900 md:p-16"
      >
        <div className="mb-4 flex justify-center text-gray-300 dark:text-gray-600">
          <PackageX className="h-16 w-16 md:h-24 md:w-24" />
        </div>

        <p className="text-lg font-bold text-gray-500 dark:text-gray-400 md:text-xl">
          هنوز محصولی اضافه نشده است
        </p>

        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          از بخش آپلود Excel شروع کنید.
        </p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
              <Tag className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-black text-gray-800 dark:text-gray-100">
                لیست قیمت محصولات
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                قیمت‌های ثبت‌شده و به‌روزرسانی‌شده محصولات
              </p>
            </div>
          </div>

          <span className="w-fit rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {new Intl.NumberFormat(
              'fa-IR',
            ).format(
              filteredProducts.length,
            )}{' '}
            محصول
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />

            <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
              فیلتر و جستجو
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(
                    event.target.value,
                  );
                }}
                placeholder="جستجوی عنوان، برند یا دسته‌بندی..."
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(
                  event.target.value,
                );
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">
                همه دسته‌بندی‌ها
              </option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={(event) => {
                setSelectedBrand(
                  event.target.value,
                );
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">
                همه برندها
              </option>

              {brands.map((brand) => (
                <option
                  key={brand}
                  value={brand}
                >
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {hasFilters ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Intl.NumberFormat(
                  'fa-IR',
                ).format(
                  filteredProducts.length,
                )}{' '}
                محصول یافت شد
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
              >
                پاک کردن فیلترها
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] border-collapse text-right">
            <thead className="border-b border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="border-l border-gray-200 px-4 py-3 text-right text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  عنوان
                </th>

                <th className="border-l border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  برند
                </th>

                <th className="border-l border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  دسته‌بندی
                </th>

                <th className="border-l border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  قیمت فعلی
                </th>

                {isAdmin ? (
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                    عملیات
                  </th>
                ) : null}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map(
                (product, index) => {
                  const productId = String(
                    product.id ?? '',
                  ).trim();

                  const productKey =
                    getProductKey(
                      product,
                      index,
                    );

                  return (
                    <tr
                      key={productKey}
                      className="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                    >
                      <td className="max-w-[340px] border-l border-gray-100 px-4 py-4 text-right text-sm font-bold text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        <p className="line-clamp-2">
                          {getProductName(
                            product,
                          )}
                        </p>
                      </td>

                      <td className="border-l border-gray-100 px-4 py-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                        {getProductBrand(
                          product,
                        ) || '-'}
                      </td>

                      <td className="border-l border-gray-100 px-4 py-4 text-center dark:border-gray-700">
                        <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {getProductCategory(
                            product,
                          ) || 'عمومی'}
                        </span>
                      </td>

                      <td className="border-l border-gray-100 px-4 py-4 text-center text-sm font-black text-blue-700 dark:border-gray-700 dark:text-blue-400">
                        {formatPrice(
                          product.price,
                        )}
                      </td>

                      {isAdmin ? (
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onEdit(product);
                              }}
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              aria-label="ویرایش محصول"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              disabled={!productId}
                              onClick={() => {
                                if (productId) {
                                  onDelete(productId);
                                }
                              }}
                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/20"
                              aria-label="حذف محصول"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredProducts.map(
            (product, index) => {
              const productId = String(
                product.id ?? '',
              ).trim();

              return (
                <article
                  key={getProductKey(
                    product,
                    index,
                  )}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-black leading-6 text-gray-800 dark:text-gray-100">
                        {getProductName(
                          product,
                        )}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                        <span className="rounded-md bg-gray-200 px-2 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          برند:{' '}
                          {getProductBrand(
                            product,
                          ) ||
                            'بدون برند'}
                        </span>

                        <span className="rounded-md bg-gray-200 px-2 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {getProductCategory(
                            product,
                          ) || 'عمومی'}
                        </span>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(product);
                          }}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          aria-label="ویرایش محصول"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled={!productId}
                          onClick={() => {
                            if (productId) {
                              onDelete(productId);
                            }
                          }}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-100 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/20"
                          aria-label="حذف محصول"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                      قیمت فعلی
                    </p>

                    <p className="mt-1 text-sm font-black text-blue-700 dark:text-blue-400">
                      {formatPrice(
                        product.price,
                      )}
                    </p>
                  </div>
                </article>
              );
            },
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mb-2 flex justify-center text-gray-300 dark:text-gray-600">
              <SearchX className="h-10 w-10" />
            </div>

            <p className="mt-3 text-sm font-bold text-gray-600 dark:text-gray-400">
              محصولی با این مشخصات پیدا نشد.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs font-bold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
            >
              پاک‌کردن فیلترها
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default ProductsTable;