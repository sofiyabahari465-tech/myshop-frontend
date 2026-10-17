import React, { useEffect, useState } from 'react';
import { Pencil, X, Tag, Banknote, Package, Folder, FileText, Save } from 'lucide-react';
import type { Product } from '../types';

interface Props {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}

type EditableProduct = Product & {
  category: string;
  stock: number;
  description: string;
};

const createEditableProduct = (
  product: Product | null,
): EditableProduct | null => {
  if (!product) {
    return null;
  }

  return {
    ...product,
    name: product.name || '',
    price: Number(product.price) || 0,
    category: product.category || 'عمومی',
    stock: Number(product.stock) || 0,
    description: product.description || '',
    image: product.image || '',
  };
};

const EditModal: React.FC<Props> = ({
  product,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<EditableProduct | null>(
    createEditableProduct(product),
  );

  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setFormData(createEditableProduct(product));
    setIsClosing(false);
  }, [product]);

  if (!formData) {
    return null;
  }

  const handleClose = () => {
    setIsClosing(true);

    window.setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleChange = <K extends keyof EditableProduct>(
    field: K,
    value: EditableProduct[K],
  ) => {
    setFormData((previous) => {
      if (!previous) {
        return null;
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const handleSave = () => {
    onSave({
      ...formData,
      name: formData.name.trim() || 'بدون نام',
      price: Number(formData.price) || 0,
      category: formData.category.trim() || 'عمومی',
      stock: Number(formData.stock) || 0,
      description: formData.description.trim(),
      updatedAt: new Date().toISOString(),
    });

    handleClose();
  };

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-50 flex items-end justify-center p-0 transition-all duration-300 sm:items-center sm:p-4 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div className="absolute left-0 top-10 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl sm:left-20 sm:top-20 sm:h-96 sm:w-96" />

      <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl sm:bottom-20 sm:right-20 sm:h-96 sm:w-96" />

      <div
        className={`relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl transition-all duration-300 sm:max-h-[90vh] sm:rounded-3xl ${
          isClosing
            ? 'translate-y-8 scale-95 opacity-0'
            : 'translate-y-0 scale-100 opacity-100'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-700 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg sm:h-14 sm:w-14">
              <Pencil className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-white sm:text-2xl">
                ویرایش محصول
              </h2>

              <p className="mt-0.5 truncate text-xs text-gray-400 sm:text-sm">
                اطلاعات محصول را تغییر دهید
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن پنجره ویرایش"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-gray-400 transition-all hover:border-red-500 hover:bg-red-500/20 hover:text-red-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-cyan-400 sm:text-sm">
                <Tag className="h-4 w-4" />
                نام محصول
              </label>

              <input
                type="text"
                value={formData.name}
                onChange={(event) => {
                  handleChange('name', event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border-2 border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-cyan-500 sm:px-4 sm:py-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold text-cyan-400 sm:text-sm">
                  <Banknote className="h-4 w-4" />
                  قیمت
                </label>

                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={formData.price}
                  onChange={(event) => {
                    handleChange(
                      'price',
                      Number(event.target.value) || 0,
                    );
                  }}
                  className="min-h-11 w-full rounded-xl border-2 border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-cyan-500 sm:px-4 sm:py-3"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold text-cyan-400 sm:text-sm">
                  <Package className="h-4 w-4" />
                  موجودی
                </label>

                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={formData.stock}
                  onChange={(event) => {
                    handleChange(
                      'stock',
                      Number(event.target.value) || 0,
                    );
                  }}
                  className="min-h-11 w-full rounded-xl border-2 border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-cyan-500 sm:px-4 sm:py-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-cyan-400 sm:text-sm">
                <Folder className="h-4 w-4" />
                دسته‌بندی
              </label>

              <input
                type="text"
                value={formData.category}
                onChange={(event) => {
                  handleChange('category', event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border-2 border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-cyan-500 sm:px-4 sm:py-3"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-cyan-400 sm:text-sm">
                <FileText className="h-4 w-4" />
                توضیحات
              </label>

              <textarea
                value={formData.description}
                onChange={(event) => {
                  handleChange('description', event.target.value);
                }}
                rows={4}
                className="w-full resize-none rounded-xl border-2 border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-cyan-500 sm:px-4 sm:py-3"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-gray-700 p-4 sm:flex sm:p-6">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-xs font-bold text-gray-300 transition-all hover:bg-gray-700 sm:flex-1 sm:px-6 sm:text-sm"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-3 text-xs font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50 sm:flex-1 sm:px-6 sm:text-sm"
          >
            <span className="flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
              ذخیره
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;