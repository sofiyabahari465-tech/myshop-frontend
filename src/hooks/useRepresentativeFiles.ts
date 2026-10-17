import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { RepresentativeFile } from '../types';

interface UseRepresentativeFilesProps {
  apiUrl: string;
  representativeId: string | null;
}

interface FilesResponse {
  success?: boolean;
  error?: string;
  files?: RepresentativeFile[];
}

export const useRepresentativeFiles = ({
  apiUrl,
  representativeId,
}: UseRepresentativeFilesProps) => {
  const [files, setFiles] = useState<RepresentativeFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] =
    useState<RepresentativeFile | null>(null);

  const requestNumberRef = useRef(0);

  const normalizedApiUrl = String(apiUrl || '')
    .trim()
    .replace(/\/+$/, '');

  const loadRepresentativeFiles = useCallback(
    async (repId: string): Promise<void> => {
      const id = String(repId || '').trim();

      if (!id) {
        requestNumberRef.current += 1;
        setFiles([]);
        setFilesError(null);
        setLoadingFiles(false);
        return;
      }

      const requestNumber = ++requestNumberRef.current;

      setLoadingFiles(true);
      setFilesError(null);

      try {
        const response = await axios.get<FilesResponse>(
          `${normalizedApiUrl}/representatives/${encodeURIComponent(id)}/files`,
          {
            headers: { Accept: 'application/json' },
            params: { _t: Date.now() },
          },
        );

        if (requestNumber !== requestNumberRef.current) {
          return;
        }

        if (
          response.data?.success === false ||
          !Array.isArray(response.data?.files)
        ) {
          throw new Error(
            response.data?.error ||
              'پاسخ فهرست فایل‌های نماینده معتبر نیست.',
          );
        }

        setFiles(response.data.files);
      } catch (error) {
        if (requestNumber !== requestNumberRef.current) {
          return;
        }

        const message = axios.isAxiosError(error)
          ? (
              error.response?.data as
                | { error?: string }
                | undefined
            )?.error ||
            `دریافت فایل‌ها ناموفق بود (HTTP ${
              error.response?.status ?? 'بدون پاسخ'
            }).`
          : error instanceof Error
            ? error.message
            : 'خطا در دریافت فایل‌های نماینده.';

        console.error(
          'خطا در بارگذاری پرونده‌های نماینده:',
          error,
        );

        setFiles([]);
        setFilesError(message);
      } finally {
        if (requestNumber === requestNumberRef.current) {
          setLoadingFiles(false);
        }
      }
    },
    [normalizedApiUrl],
  );

  useEffect(() => {
    if (representativeId) {
      setFiles([]);
      void loadRepresentativeFiles(representativeId);
    } else {
      requestNumberRef.current += 1;
      setFiles([]);
      setFilesError(null);
      setLoadingFiles(false);
      setViewingFile(null);
    }

    return () => {
      requestNumberRef.current += 1;
    };
  }, [representativeId, loadRepresentativeFiles]);

  const uploadFile = useCallback(
    async (file: File): Promise<void> => {
      if (!representativeId) {
        throw new Error(
          'ابتدا یک نماینده را انتخاب کنید.',
        );
      }

      const formData = new FormData();

      formData.append('file', file);

      try {
        await axios.post(
          `${normalizedApiUrl}/representatives/${encodeURIComponent(
            representativeId,
          )}/files`,
          formData,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );

        await loadRepresentativeFiles(
          representativeId,
        );
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? (
              error.response?.data as
                | { error?: string }
                | undefined
            )?.error ||
            `آپلود فایل ناموفق بود (HTTP ${
              error.response?.status ?? 'بدون پاسخ'
            }).`
          : error instanceof Error
            ? error.message
            : 'خطا در آپلود فایل.';

        throw new Error(message);
      }
    },
    [
      normalizedApiUrl,
      representativeId,
      loadRepresentativeFiles,
    ],
  );

  const deleteFile = async (fileId: string): Promise<void> => {
    if (!representativeId) return;

    const file = files.find((item) => item.id === fileId);
    if (!file) return;

    const isConfirmed = window.confirm(
      `آیا از حذف فایل «${file.name}» مطمئن هستید؟`,
    );

    if (!isConfirmed) return;

    try {
      await axios.delete(
        `${normalizedApiUrl}/representatives/${encodeURIComponent(
          representativeId,
        )}/files/${encodeURIComponent(file.name)}`,
      );

      await loadRepresentativeFiles(representativeId);

      if (viewingFile?.id === fileId) {
        setViewingFile(null);
      }
    } catch (error) {
      console.error('خطا در حذف فایل:', error);
      window.alert('خطا در حذف فایل');
    }
  };

  return {
    files,
    loadingFiles,
    filesError,
    viewingFile,
    setViewingFile,
    loadRepresentativeFiles,
    uploadFile,
    deleteFile,
  };
};