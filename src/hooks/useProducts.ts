import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import axios from 'axios';

import type { Product } from '../types';

interface UseProductsProps {
  apiUrl: string;
}

interface ProductsResponse {
  success?: boolean;
  data?:
    | Product[]
    | {
        products?: Product[];
      };
  products?: Product[];
  count?: number;
  error?: string;
  message?: string;
}

interface DeleteResponse {
  success?: boolean;
  data?: Product;
  product?: Product;
  error?: string;
  message?: string;
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

const extractProducts = (
  responseData: ProductsResponse,
): Product[] => {
  if (Array.isArray(responseData)) {
    return responseData as unknown as Product[];
  }

  if (Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (
    responseData.data &&
    Array.isArray(responseData.data.products)
  ) {
    return responseData.data.products;
  }

  if (Array.isArray(responseData.products)) {
    return responseData.products;
  }

  return [];
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
      const value = storage.getItem(key);

      if (
        value &&
        value !== 'null' &&
        value !== 'undefined'
      ) {
        return value
          .replace(/^Bearer\s+/i, '')
          .trim();
      }
    }

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

const getAuthHeaders = (): Record<
  string,
  string
> => {
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

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | {
          error?: string;
          message?: string;
        }
      | undefined;

    return (
      responseData?.error ||
      responseData?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const useProducts = ({
  apiUrl,
}: UseProductsProps) => {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [deletingProductId, setDeletingProductId] =
    useState<string | null>(null);

  const baseApiUrl = useMemo(
    () => normalizeApiUrl(apiUrl),
    [apiUrl],
  );

  const requestIdRef = useRef(0);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const loadProducts = useCallback(
    async (): Promise<Product[] | null> => {
      const requestId =
        requestIdRef.current + 1;

      requestIdRef.current = requestId;

      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      const endpoint =
        `${baseApiUrl}/products`;

      try {
        setLoading(true);

        console.log(
          '📡 دریافت محصولات از:',
          endpoint,
        );

        const response =
          await axios.get<ProductsResponse>(
            endpoint,
            {
              signal: controller.signal,
              params: {
                _t: Date.now(),
              },
              headers: getAuthHeaders(),
              withCredentials: Boolean(
                getToken(),
              ),
            },
          );

        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return null;
        }

        const responseData =
          response.data;

        if (
          responseData?.success === false
        ) {
          throw new Error(
            responseData.error ||
              responseData.message ||
              'دریافت محصولات ناموفق بود.',
          );
        }

        const productList =
          extractProducts(responseData);

        setProducts(productList);

        console.log(
          '✅ تعداد محصولات دریافت‌شده:',
          productList.length,
        );

        return productList;
      } catch (error: unknown) {
        if (
          axios.isCancel(error) ||
          controller.signal.aborted
        ) {
          return null;
        }

        if (
          requestId !== requestIdRef.current
        ) {
          return null;
        }

        console.error(
          '❌ خطا در بارگذاری محصولات:',
          error,
        );

        return null;
      } finally {
        if (
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [baseApiUrl],
  );

  useEffect(() => {
    void loadProducts();

    return () => {
      requestIdRef.current += 1;

      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadProducts]);

  const handleEdit = useCallback(
    async (product: Product) => {
      try {
        const token = getToken();

        await axios.put(
          `${baseApiUrl}/products/${encodeURIComponent(
            String(product.id),
          )}`,
          product,
          {
            headers: getAuthHeaders(),
            withCredentials: Boolean(token),
          },
        );

        await loadProducts();

        setEditingProduct(null);
      } catch (error) {
        console.error(
          '❌ خطا در ویرایش محصول:',
          error,
        );

        alert(
          getErrorMessage(
            error,
            'خطا در ویرایش محصول',
          ),
        );
      }
    },
    [baseApiUrl, loadProducts],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const productId = String(id).trim();

      if (!productId) {
        alert('شناسه محصول معتبر نیست.');
        return;
      }

      if (deletingProductId) {
        return;
      }

      const existsBeforeDelete =
        products.some(
          (product) =>
            String(product.id) === productId,
        );

      if (!existsBeforeDelete) {
        alert('این محصول در لیست فعلی وجود ندارد.');
        return;
      }

      const confirmed = window.confirm(
        'آیا از حذف این محصول مطمئن هستید؟',
      );

      if (!confirmed) {
        return;
      }

      const previousProducts =
        products;

      try {
        const token = getToken();

        setDeletingProductId(productId);
        setLoading(true);

        const response =
          await axios.delete<DeleteResponse>(
            `${baseApiUrl}/products/${encodeURIComponent(
              productId,
            )}`,
            {
              headers: getAuthHeaders(),
              withCredentials: Boolean(token),
            },
          );

        const responseData =
          response.data;

        if (
          responseData?.success === false
        ) {
          throw new Error(
            responseData.error ||
              responseData.message ||
              'حذف محصول توسط سرور انجام نشد.',
          );
        }

        setProducts((current) =>
          current.filter(
            (product) =>
              String(product.id) !== productId,
          ),
        );

        const refreshedProducts =
          await loadProducts();

        if (
          refreshedProducts &&
          refreshedProducts.some(
            (product) =>
              String(product.id) === productId,
          )
        ) {
          setProducts(previousProducts);

          throw new Error(
            'سرور محصول را حذف نکرد؛ محصول همچنان در لیست وجود دارد.',
          );
        }

        console.log(
          '✅ محصول واقعاً حذف شد:',
          productId,
        );
      } catch (error) {
        console.error(
          '❌ خطا در حذف محصول:',
          error,
        );

        setProducts(previousProducts);

        alert(
          getErrorMessage(
            error,
            'حذف محصول انجام نشد.',
          ),
        );
      } finally {
        setDeletingProductId(null);
        setLoading(false);
      }
    },
    [
      baseApiUrl,
      deletingProductId,
      loadProducts,
      products,
    ],
  );

  const totalProducts =
    products.length;

  const totalPrice = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total +
        (Number(product.price) || 0),
      0,
    );
  }, [products]);

  return {
    products,
    editingProduct,
    setEditingProduct,
    loadProducts,
    handleEdit,
    handleDelete,
    totalProducts,
    totalPrice,
    loading,
    deletingProductId,
  };
};