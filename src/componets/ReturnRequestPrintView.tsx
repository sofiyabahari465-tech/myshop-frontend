import React from 'react';
import type { ReturnRequest } from '../types';

interface ReturnRequestPrintViewProps {
  request: ReturnRequest;
}

const toNumber = (value: unknown) => {
  const normalized = String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d.-]/g, '');

  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
};

const toPersianNumber = (value: unknown) => {
  return new Intl.NumberFormat('fa-IR').format(toNumber(value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const ReturnRequestPrintView: React.FC<ReturnRequestPrintViewProps> = ({
  request,
}) => {
  const unitPrice = request.unitPrice || request.price || 0;
  const totalPrice = unitPrice * (request.quantity || 1);

  const statusLabel =
    request.status === 'approved'
      ? 'تأیید شده'
      : request.status === 'rejected'
      ? 'رد شده'
      : request.status === 'received'
      ? 'دریافت شده'
      : 'در انتظار بررسی';

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-3xl bg-white p-8 text-sm leading-7 text-gray-900"
    >
      {/* سربرگ */}
      <div className="mb-6 flex items-center justify-between border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-xl font-black">برگهٔ درخواست مرجوعی</h1>
          <p className="mt-1 text-xs text-gray-600">
            شمارهٔ درخواست: {request.id}
          </p>
        </div>
        <div className="text-left text-xs text-gray-600">
          <p>تاریخ ثبت: {formatDateTime(request.createdAt)}</p>
          <p>وضعیت: {statusLabel}</p>
        </div>
      </div>

      {/* اطلاعات نماینده */}
      <div className="mb-6 rounded-lg border border-gray-300 p-4">
        <h2 className="mb-3 text-base font-black">اطلاعات نماینده</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-bold">نام نماینده:</span>{' '}
            {request.representativeName || '—'}
          </div>
          <div>
            <span className="font-bold">کد نمایندگی:</span>{' '}
            {request.representativeCode || '—'}
          </div>
          <div className="col-span-2">
            <span className="font-bold">شهر:</span>{' '}
            {request.representativeCity || '—'}
          </div>
        </div>
      </div>

      {/* اطلاعات کالا */}
      <div className="mb-6 rounded-lg border border-gray-300 p-4">
        <h2 className="mb-3 text-base font-black">اطلاعات کالای مرجوعی</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <span className="font-bold">عنوان کالا:</span>{' '}
            {request.productName || request.title || '—'}
          </div>
          <div>
            <span className="font-bold">برند:</span>{' '}
            {request.productBrand || request.brand || '—'}
          </div>
          <div>
            <span className="font-bold">دسته‌بندی:</span>{' '}
            {request.productCategory || request.category || '—'}
          </div>
          <div>
            <span className="font-bold">تعداد مرجوعی:</span>{' '}
            {toPersianNumber(request.quantity)} قلم
          </div>
          <div>
            <span className="font-bold">قیمت واحد:</span>{' '}
            {toPersianNumber(unitPrice)} تومان
          </div>
          <div className="col-span-2">
            <span className="font-bold">جمع کل:</span>{' '}
            {toPersianNumber(totalPrice)} تومان
          </div>
          <div className="col-span-2">
            <span className="font-bold">تاریخ مرجوعی:</span>{' '}
            {request.returnDate || '—'}
          </div>
        </div>
      </div>

      {/* دلیل مرجوعی */}
      {request.reason ? (
        <div className="mb-6 rounded-lg border border-gray-300 p-4">
          <h2 className="mb-2 text-base font-black">دلیل مرجوعی</h2>
          <p className="whitespace-pre-wrap text-sm">{request.reason}</p>
        </div>
      ) : null}

      {/* توضیح ادمین */}
      {(request as ReturnRequest & { adminNote?: string | null }).adminNote ? (
        <div className="mb-6 rounded-lg border border-gray-300 p-4">
          <h2 className="mb-2 text-base font-black">توضیح ادمین</h2>
          <p className="whitespace-pre-wrap text-sm">
            {(request as ReturnRequest & { adminNote?: string | null }).adminNote}
          </p>
        </div>
      ) : null}

      {/* پاورقی */}
      <div className="mt-8 border-t border-gray-300 pt-4 text-center text-xs text-gray-600">
        <p>این برگه به‌صورت خودکار تولید شده و نیاز به مهر و امضا ندارد.</p>
        <p className="mt-1">
          تاریخ چاپ: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}
        </p>
      </div>
    </div>
  );
};

export default ReturnRequestPrintView;