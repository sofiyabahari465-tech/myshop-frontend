import React from 'react';
import { X, FileText, Eye, Download, Image as ImageIcon } from 'lucide-react';
import type { RepresentativeFile } from '../types';

interface Props {
  file: RepresentativeFile | null;
  apiUrl: string;
  onClose: () => void;
}

const FileViewerModal: React.FC<Props> = ({
  file,
  apiUrl,
  onClose,
}) => {
  if (!file) return null;

  const fileViewUrl = `${apiUrl}/representatives/${
    file.representativeId
  }/files/${encodeURIComponent(file.name)}/view`;

  const fileDownloadUrl = `${apiUrl}/representatives/${
    file.representativeId
  }/files/${encodeURIComponent(file.name)}/download`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md md:p-4">
      <div className="relative w-full max-w-4xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:bg-red-600"
          aria-label="بستن"
        >
          <X className="h-5 w-5" />
        </button>

        {file.icon === '🖼️' ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="relative flex items-center justify-center bg-gray-100">
              <img
                src={fileViewUrl}
                alt={file.name}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>

            <div className="flex items-center gap-3 bg-gray-900 px-4 py-3 text-white">
              <ImageIcon className="h-5 w-5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{file.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {file.size} • {file.uploadedAt}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl md:p-8">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 mx-auto">
              <FileText className="h-12 w-12" />
            </div>

            <h3 className="mb-2 truncate text-lg font-black text-gray-800">
              {file.name}
            </h3>

            <p className="mb-6 text-sm text-gray-500">
              {file.size} • {file.uploadedAt}
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={fileViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-600"
              >
                <Eye className="h-4 w-4" />
                باز کردن
              </a>

              <a
                href={fileDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-600"
              >
                <Download className="h-4 w-4" />
                دانلود
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewerModal;