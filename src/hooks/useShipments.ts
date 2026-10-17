import { useCallback, useState } from 'react';
import axios from 'axios';

interface Shipment {
  id: string | number;
  status?: string;
  // بقیه فیلدها...
}

interface UseShipmentsResult {
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  loadShipments: () => Promise<void>;
}

export const useShipments = ({
  apiUrl,
}: {
  apiUrl: string;
}): UseShipmentsResult => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token =
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('accessToken') ||
        sessionStorage.getItem('authToken') ||
        '';

      const response = await axios.get<{
        success?: boolean;
        data?: Shipment[];
        error?: string;
      }>(`${apiUrl}/api/shipments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (response.data.success === false) {
        throw new Error(
          response.data.error || 'دریافت بارها ناموفق بود.',
        );
      }

      setShipments(
        Array.isArray(response.data.data)
          ? response.data.data
          : [],
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'خطا در دریافت بارها.',
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  return {
    shipments,
    loading,
    error,
    loadShipments,
  };
};