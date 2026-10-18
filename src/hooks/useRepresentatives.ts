import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import axios from 'axios';

import { useAutoRefresh } from './useAutoRefresh';

import type { Representative } from '../types';

interface UseRepresentativesProps {
  apiUrl: string;
  isAdmin: boolean;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  message?: string;
  count?: number;
  data?: T;
}

const normalizeId = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    );
};

const cleanText = (value: unknown): string => {
  return String(value ?? '').trim();
};

const normalizeApiUrl = (
  apiUrl: string,
): string => {
  return String(apiUrl || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
};

const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error &&
      error.message
      ? error.message
      : fallback;
  }

  const responseData = error.response
    ?.data as
    | ApiResponse<unknown>
    | undefined;

  if (responseData?.error) {
    return responseData.error;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error.response?.status === 400) {
    return 'اطلاعات ارسال‌شده معتبر نیست.';
  }

  if (error.response?.status === 401) {
    return 'نشست کاربری منقضی یا نامعتبر است؛ دوباره وارد شوید.';
  }

  if (error.response?.status === 403) {
    return 'اجازهٔ دسترسی به این بخش را ندارید.';
  }

  if (error.response?.status === 404) {
    return 'مسیر نمایندگان در بک‌اند پیدا نشد.';
  }

  if (!error.response) {
    return 'ارتباط با بک‌اند برقرار نشد؛ اجرای سرور را بررسی کنید.';
  }

  return fallback;
};

const createRepresentativePayload = (
  data: Partial<Representative>,
): Partial<Representative> => {
  return {
    ...data,

    name: cleanText(data.name),
    email: cleanText(data.email),
    code: cleanText(data.code),
    province: cleanText(data.province),
    city: cleanText(data.city),
    phone: cleanText(data.phone),
    startDate: cleanText(data.startDate),
    address: cleanText(data.address),
    description: cleanText(data.description),
    shopDescription: cleanText(
      data.shopDescription,
    ),

    status:
      data.status === 'inactive'
        ? 'inactive'
        : 'active',

    orders: Number(data.orders) || 0,

    depositAmount:
      data.depositAmount ?? '0',

    guaranteeCheck:
      data.guaranteeCheck ?? '0',

    totalFinancialCommitment:
      data.totalFinancialCommitment ?? '0',

    shipmentsCount:
      Number(data.shipmentsCount) || 0,

    storeItemsCount:
      Number(data.storeItemsCount) || 0,

    storeItemsTotalValue:
      Number(data.storeItemsTotalValue) || 0,

    returnRequestsCount:
      Number(data.returnRequestsCount) || 0,

    last10DaysSales:
      Number(data.last10DaysSales) || 0,

    averageSales:
      Number(data.averageSales) || 0,
  };
};

export const useRepresentatives = ({
  apiUrl,
  isAdmin,
}: UseRepresentativesProps) => {
  const [
    representatives,
    setRepresentatives,
  ] = useState<Representative[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const requestNumberRef = useRef(0);
  const backgroundRequestRef =
    useRef(false);

  const mountedRef = useRef(false);

  const normalizedApiUrl = useMemo(
    () => normalizeApiUrl(apiUrl),
    [apiUrl],
  );

  const getAuthHeaders = useCallback(
    (includeContentType = false) => {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token') ||
        localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') ||
        localStorage.getItem('authToken') || sessionStorage.getItem('authToken') ||
        '';

      if (!token) {
        throw new Error(
          'توکن ورود پیدا نشد؛ دوباره وارد شوید.',
        );
      }

      return {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(includeContentType
          ? {
              'Content-Type':
                'application/json',
            }
          : {}),
      };
    },
    [],
  );

  const ensureAdmin = useCallback(() => {
    if (!isAdmin) {
      throw new Error(
        'این عملیات فقط برای ادمین مجاز است.',
      );
    }
  }, [isAdmin]);

  const loadRepresentatives =
    useCallback(
      async (
        silent = false,
      ): Promise<void> => {
        if (!isAdmin) {
          return;
        }

        if (
          silent &&
          backgroundRequestRef.current
        ) {
          return;
        }

        if (silent) {
          backgroundRequestRef.current = true;
        }

        const requestNumber =
          ++requestNumberRef.current;

        if (!silent) {
          setLoading(true);
          setError(null);
        }

        try {
          const response = await axios.get<
            ApiResponse<Representative[]>
          >(
            `${normalizedApiUrl}/api/representatives`,
            {
              headers: getAuthHeaders(),
              params: {
                _t: Date.now(),
              },
            },
          );

          const result = response.data;

          if (result.success === false) {
            throw new Error(
              result.error ||
                'خطا در بارگذاری نمایندگان.',
            );
          }

          if (
            !mountedRef.current ||
            requestNumber !==
              requestNumberRef.current
          ) {
            return;
          }

          setRepresentatives(
            Array.isArray(result.data)
              ? result.data
              : [],
          );

          if (!silent) {
            setError(null);
          }
        } catch (caughtError) {
          if (
            !mountedRef.current ||
            requestNumber !==
              requestNumberRef.current
          ) {
            return;
          }

          const message =
            getApiErrorMessage(
              caughtError,
              'خطا در بارگذاری نمایندگان.',
            );

          console.error(
            'خطا در بارگذاری نمایندگان:',
            message,
          );

          if (!silent) {
            setError(message);
          }
        } finally {
          if (silent) {
            backgroundRequestRef.current =
              false;
          }

          if (
            mountedRef.current &&
            requestNumber ===
              requestNumberRef.current &&
            !silent
          ) {
            setLoading(false);
          }
        }
      },
      [
        getAuthHeaders,
        isAdmin,
        normalizedApiUrl,
      ],
    );

  useEffect(() => {
    mountedRef.current = true;

    if (isAdmin) {
      void loadRepresentatives();
    } else {
      setRepresentatives([]);
      setLoading(false);
      setError(null);
    }

    const refreshWhenVisible = () => {
      if (
        isAdmin &&
        document.visibilityState ===
          'visible'
      ) {
        void loadRepresentatives(true);
      }
    };

    if (isAdmin) {
      window.addEventListener(
        'focus',
        refreshWhenVisible,
      );

      document.addEventListener(
        'visibilitychange',
        refreshWhenVisible,
      );
    }

    return () => {
      mountedRef.current = false;
      requestNumberRef.current += 1;

      window.removeEventListener(
        'focus',
        refreshWhenVisible,
      );

      document.removeEventListener(
        'visibilitychange',
        refreshWhenVisible,
      );
    };
  }, [isAdmin, loadRepresentatives]);

  useAutoRefresh(
    loadRepresentatives,
    5000,
  );

  const addRepresentative = useCallback(
    async (
      data: Partial<Representative>,
    ): Promise<Representative> => {
      ensureAdmin();

      try {
        const response = await axios.post<
          ApiResponse<Representative>
        >(
          `${normalizedApiUrl}/api/representatives`,
          createRepresentativePayload(data),
          {
            headers: getAuthHeaders(true),
          },
        );

        const result = response.data;

        if (
          result.success === false ||
          !result.data
        ) {
          throw new Error(
            result.error ||
              'بک‌اند اطلاعات نمایندهٔ جدید را برنگرداند.',
          );
        }

        const newRepresentative =
          result.data;

        requestNumberRef.current += 1;

        setRepresentatives((current) => {
          const exists = current.some(
            (item) =>
              normalizeId(item.id) ===
              normalizeId(
                newRepresentative.id,
              ),
          );

          return exists
            ? current.map((item) =>
                normalizeId(item.id) ===
                normalizeId(
                  newRepresentative.id,
                )
                  ? newRepresentative
                  : item,
              )
            : [
                ...current,
                newRepresentative,
              ];
        });

        setError(null);

        return newRepresentative;
      } catch (caughtError) {
        const message =
          getApiErrorMessage(
            caughtError,
            'خطا در ثبت نماینده.',
          );

        setError(message);
        window.alert(message);

        throw caughtError;
      }
    },
    [
      ensureAdmin,
      getAuthHeaders,
      normalizedApiUrl,
    ],
  );

  const updateRepresentative = useCallback(
    async (
      id: string,
      data: Partial<Representative>,
    ): Promise<Representative> => {
      ensureAdmin();

      const normalizedId = normalizeId(id);

      if (!normalizedId) {
        throw new Error(
          'شناسه نماینده برای ویرایش معتبر نیست.',
        );
      }

      try {
        const response = await axios.put<
          ApiResponse<Representative>
        >(
          `${normalizedApiUrl}/api/representatives/${encodeURIComponent(
            normalizedId,
          )}`,
          createRepresentativePayload(data),
          {
            headers: getAuthHeaders(true),
          },
        );

        const result = response.data;

        if (
          result.success === false ||
          !result.data
        ) {
          throw new Error(
            result.error ||
              'بک‌اند اطلاعات نمایندهٔ ویرایش‌شده را برنگرداند.',
          );
        }

        const updatedRepresentative =
          result.data;

        requestNumberRef.current += 1;

        setRepresentatives((current) =>
          current.map((item) =>
            normalizeId(item.id) ===
            normalizedId
              ? updatedRepresentative
              : item,
          ),
        );

        setError(null);

        return updatedRepresentative;
      } catch (caughtError) {
        const message =
          getApiErrorMessage(
            caughtError,
            'خطا در ویرایش نماینده.',
          );

        setError(message);
        window.alert(message);

        throw caughtError;
      }
    },
    [
      ensureAdmin,
      getAuthHeaders,
      normalizedApiUrl,
    ],
  );

  const deleteRepresentative = useCallback(
    async (id: string): Promise<void> => {
      ensureAdmin();

      const normalizedId = normalizeId(id);

      if (!normalizedId) {
        throw new Error(
          'شناسه نماینده برای حذف معتبر نیست.',
        );
      }

      try {
        const response = await axios.delete<
          ApiResponse<unknown>
        >(
          `${normalizedApiUrl}/api/representatives/${encodeURIComponent(
            normalizedId,
          )}`,
          {
            headers: getAuthHeaders(),
          },
        );

        const result = response.data;

        if (result.success === false) {
          throw new Error(
            result.error ||
              'خطا در حذف نماینده.',
          );
        }

        requestNumberRef.current += 1;

        setRepresentatives((current) =>
          current.filter(
            (item) =>
              normalizeId(item.id) !==
              normalizedId,
          ),
        );

        setError(null);
      } catch (caughtError) {
        const message =
          getApiErrorMessage(
            caughtError,
            'خطا در حذف نماینده.',
          );

        setError(message);
        window.alert(message);

        throw caughtError;
      }
    },
    [
      ensureAdmin,
      getAuthHeaders,
      normalizedApiUrl,
    ],
  );

  return {
    representatives,
    loading,
    error,
    loadRepresentatives,
    addRepresentative,
    updateRepresentative,
    deleteRepresentative,
  };
};
