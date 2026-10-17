import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePrint } from '../../hooks/usePrint';


export type ReturnPrintRequest = {
  id?: string;
  representativeName?: string;
  representativeCity?: string;
  representativePhone?: string;
  items?: Array<{
    productName?: string;
    title?: string;
    quantity?: number | string;
    unitPrice?: number | string;
    price?: number | string;
    totalPrice?: number | string;
  }>;
  totalQuantity?: number | string;
  totalPrice?: number | string;
  returnDate?: string;
  createdAt?: string;
  status?: string;
  adminNote?: string;
};


type ReturnRequestPrintProps = {
  requests: ReturnPrintRequest[];
  representativeName?: string;
  representativeCity?: string;
  representativePhone?: string;
  onClose: () => void;
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


  return Number.isFinite(result) ? result : 0;
};


const formatNumber = (value: unknown): string => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};


const formatDate = (value?: string): string => {
  const date = value ? new Date(value) : new Date();


  if (Number.isNaN(date.getTime())) {
    return value || '—';
  }


  return new Intl.DateTimeFormat(
    'fa-IR-u-ca-persian',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
    .format(date)
    .replace(/[\u200e\u200f]/g, '');
};


const getTitle = (request: ReturnPrintRequest) => {
  const { printContent, isMobile } = usePrint();

  return (
    String(
      request.items?.[0]?.productName ||
        request.items?.[0]?.title ||
        '',
    ).trim() ||
    String(request.representativeName || '').trim() ||
    'کالای بدون نام'
  );
};


const getQuantity = (request: ReturnPrintRequest) => {
  const stored = toNumber(request.totalQuantity);


  if (stored > 0) {
    return stored;
  }


  return (request.items || []).reduce(
    (sum, item) => sum + toNumber(item.quantity),
    0,
  );
};


const getTotal = (request: ReturnPrintRequest) => {
  const stored = toNumber(request.totalPrice);


  if (stored > 0) {
    return stored;
  }


  return (request.items || []).reduce(
    (sum, item) => {
      const itemTotal = toNumber(item.totalPrice);


      if (itemTotal > 0) {
        return sum + itemTotal;
      }


      return (
        sum +
        toNumber(item.quantity) *
          toNumber(item.unitPrice ?? item.price)
      );
    },
    0,
  );
};


const getStatusLabel = (status?: string) => {
  if (status === 'approved') return 'تأیید شده';
  if (status === 'received') return 'دریافت شده';
  if (status === 'rejected') return 'رد شده';
  if (status === 'reviewing') return 'در حال بررسی';


  return 'در انتظار بررسی';
};


const ReturnRequestPrint = ({
  requests,
  representativeName,
  representativeCity,
  representativePhone,
  onClose,
}: ReturnRequestPrintProps) => {
  const safeRequests = Array.isArray(requests)
    ? requests
    : [];


  const totalQuantity = safeRequests.reduce(
    (sum, request) => sum + getQuantity(request),
    0,
  );


  const totalValue = safeRequests.reduce(
    (sum, request) => sum + getTotal(request),
    0,
  );


  useEffect(() => {
    const handleAfterPrint = () => {
      onClose();
    };


    window.addEventListener(
      'afterprint',
      handleAfterPrint,
    );


    const previousOverflow =
      document.body.style.overflow;


    document.body.style.overflow = 'hidden';


    return () => {
      window.removeEventListener(
        'afterprint',
        handleAfterPrint,
      );


      document.body.style.overflow =
        previousOverflow;
    };
  }, [onClose]);


  if (typeof document === 'undefined') {
    return null;
  }


  return createPortal(
    <div
      id="return-print-root"
      dir="rtl"
    >
      <style>{`
        #return-print-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow: auto;
          background: rgba(0, 0, 0, 0.55);
          color: #111827;
          font-family: Tahoma, Arial, sans-serif;
        }


        #return-print-root * {
          box-sizing: border-box;
        }


        #return-print-root .return-print-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: min(1000px, calc(100% - 24px));
          margin: 18px auto 0;
          padding: 14px 18px;
          border: 1px solid #e5e7eb;
          border-radius: 14px 14px 0 0;
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 10;
        }


        #return-print-root .return-print-toolbar h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }


        #return-print-root .return-print-toolbar p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 11px;
        }


        #return-print-root button {
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          padding: 9px 16px;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }


        #return-print-root .return-print-close {
          background: #e5e7eb;
          color: #374151;
        }


        #return-print-root .return-print-button {
          background: #0f766e;
          color: #ffffff;
        }


        #return-print-root .return-print-paper {
          width: min(1000px, calc(100% - 24px));
          margin: 0 auto 18px;
          padding: 24px;
          background: #ffffff;
          border-radius: 0 0 14px 14px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
        }


        #return-print-root .return-print-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 12px;
          border-bottom: 3px solid #0f766e;
        }


        #return-print-root .return-print-header h1 {
          margin: 0;
          font-size: 16pt;
          font-weight: 900;
        }


        #return-print-root .return-print-header p {
          margin: 4px 0 0;
          color: #4b5563;
          font-size: 8pt;
        }


        #return-print-root .return-print-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 14px 0;
        }


        #return-print-root .return-print-card {
          padding: 10px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
        }


        #return-print-root .return-print-card-title {
          margin: 0 0 6px;
          padding-bottom: 5px;
          border-bottom: 1px solid #d1d5db;
          color: #0f766e;
          font-size: 9pt;
          font-weight: 900;
        }


        #return-print-root .return-print-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-top: 4px;
          font-size: 8pt;
        }


        #return-print-root .return-print-row span {
          flex-shrink: 0;
          color: #6b7280;
        }


        #return-print-root .return-print-row strong {
          max-width: 65%;
          color: #111827;
          font-weight: 900;
          text-align: left;
          overflow-wrap: anywhere;
          word-break: break-word;
        }


        #return-print-root .return-print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 9pt;
        }


        #return-print-root .return-print-table th,
        #return-print-root .return-print-table td {
          border: 1px solid #6b7280;
          padding: 6px 4px;
          text-align: right;
          vertical-align: middle;
          overflow-wrap: anywhere;
          word-break: break-word;
        }


        #return-print-root .return-print-table th {
          background: #e5e7eb;
          text-align: center;
          font-weight: 900;
        }


        #return-print-root .return-print-total-table {
          margin-top: 10px;
        }


        #return-print-root .return-print-total-table td {
          background: #e5e7eb;
          font-weight: 900;
        }


        #return-print-root .return-print-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px solid #9ca3af;
          color: #4b5563;
          font-size: 8pt;
        }


        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }


          html,
          body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }


          body > * {
            display: none !important;
          }


          body > #return-print-root {
            display: block !important;
          }


          #return-print-root {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }


          #return-print-root .return-print-toolbar {
            display: none !important;
          }


          #return-print-root .return-print-paper {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }


          #return-print-root .return-print-cards {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }


          #return-print-root .return-print-table {
            display: table !important;
            width: 100% !important;
          }


          #return-print-root .return-print-table thead {
            display: table-header-group !important;
          }


          #return-print-root .return-print-table tr {
            display: table-row !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }


          #return-print-root .return-print-table th,
          #return-print-root .return-print-table td {
            display: table-cell !important;
            border: 1px solid #6b7280 !important;
            padding: 6px 4px !important;
          }


          #return-print-root .return-print-total-table {
            display: table !important;
            width: 100% !important;
            margin-top: 10px !important;
          }


          #return-print-root .return-print-total-table td {
            background: #e5e7eb !important;
            font-weight: 900 !important;
          }


          #return-print-root .return-print-footer {
            display: flex !important;
          }
        }
      `}</style>


      <div className="return-print-toolbar">
        <div>
          <h3>پیش‌نمایش گزارش مرجوعی</h3>
          <p>فقط همین گزارش چاپ می‌شود.</p>
        </div>


        <div>
          <button
            type="button"
            className="return-print-close"
            onClick={onClose}
          >
            بستن
          </button>


          <button
            type="button"
            className="return-print-button"
            onClick={() => printContent('return-print-root', 'چاپ درخواست مرجوعی')}
          >
            چاپ
          </button>
        </div>
      </div>


      <main className="return-print-paper">
        <header className="return-print-header">
          <div>
            <h1>
              {representativeName ||
                'گزارش درخواست‌های مرجوعی'}
            </h1>


            <p>
              {representativeCity
                ? `شهر: ${representativeCity}`
                : 'گزارش درخواست‌های مرجوعی'}
            </p>
          </div>


          <div>
            <h1>گزارش مرجوعی</h1>
            <p>تاریخ چاپ: {formatDate()}</p>
          </div>
        </header>


        <section className="return-print-cards">
          <div className="return-print-card">
            <p className="return-print-card-title">
              مشخصات شرکت
            </p>


            <div className="return-print-row">
              <span>تاریخ و ساعت چاپ:</span>
              <strong>{formatDate()}</strong>
            </div>


            <div className="return-print-row">
              <span>نام شخص / شرکت:</span>
              <strong>بازرگانی مهر امین</strong>
            </div>


            <div className="return-print-row">
              <span>آدرس شرکت:</span>
              <strong>سه راه خیام</strong>
            </div>


            <div className="return-print-row">
              <span>تلفن شرکت:</span>
              <strong>09123456789</strong>
            </div>
          </div>


          <div className="return-print-card">
            <p className="return-print-card-title">
              مشخصات نماینده
            </p>


            <div className="return-print-row">
              <span>نام شخص / شرکت:</span>
              <strong>
                {representativeName || '—'}
              </strong>
            </div>


            <div className="return-print-row">
              <span>شهر / آدرس:</span>
              <strong>
                {representativeCity || '—'}
              </strong>
            </div>


            <div className="return-print-row">
              <span>تلفن نماینده:</span>
              <strong>
                {representativePhone || '—'}
              </strong>
            </div>


            <div className="return-print-row">
              <span>تعداد درخواست:</span>
              <strong>
                {formatNumber(safeRequests.length)}
              </strong>
            </div>
          </div>
        </section>


        <table className="return-print-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>ردیف</th>
              <th style={{ width: '26%' }}>عنوان مرجوعی</th>
              <th style={{ width: '10%' }}>تعداد</th>
              <th style={{ width: '16%' }}>مبلغ کل</th>
              <th style={{ width: '16%' }}>تاریخ ثبت</th>
              <th style={{ width: '12%' }}>وضعیت</th>
              <th style={{ width: '14%' }}>توضیحات</th>
            </tr>
          </thead>


          <tbody>
            {safeRequests.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  درخواست مرجوعی برای چاپ وجود ندارد.
                </td>
              </tr>
            ) : (
              safeRequests.map((request, index) => (
                <tr key={request.id || index}>
                  <td>
                    {formatNumber(index + 1)}
                  </td>


                  <td>{getTitle(request)}</td>


                  <td>
                    {formatNumber(getQuantity(request))}
                  </td>


                  <td>
                    {formatNumber(getTotal(request))} تومان
                  </td>


                  <td>
                    {request.returnDate ||
                      formatDate(request.createdAt)}
                  </td>


                  <td>
                    {getStatusLabel(request.status)}
                  </td>


                  <td>
                    {request.adminNote || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>


        <table className="return-print-table return-print-total-table">
          <tbody>
            <tr>
              <td style={{ width: '40%' }}>
                جمع کل مرجوعی‌ها
              </td>


              <td style={{ width: '20%' }}>
                {formatNumber(totalQuantity)} قلم
              </td>


              <td style={{ width: '20%' }}>
                —
              </td>


              <td style={{ width: '20%' }}>
                {formatNumber(totalValue)} تومان
              </td>
            </tr>
          </tbody>
        </table>


        <footer className="return-print-footer">
          <span>
            تعداد کل درخواست‌ها:{' '}
            {formatNumber(safeRequests.length)}
          </span>


          <span>
            ارزش کل مرجوعی‌ها:{' '}
            {formatNumber(totalValue)} تومان
          </span>
        </footer>
      </main>
    </div>,
    document.body,
  );
};


export default ReturnRequestPrint;