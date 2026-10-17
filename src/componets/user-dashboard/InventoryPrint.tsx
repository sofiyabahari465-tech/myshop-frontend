import React, {
  useEffect,
  useMemo,
} from 'react';



import { createPortal } from 'react-dom';



export type InventoryPrintItem = {
  id: string;
  title: string;
  brand?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
};



export type InventoryPrintSettings = {
  companyName: string;
  companyTagline: string;
  companyLogoSrc: string;
  reportTitle: string;
  footerText: string;
  signatureLabel: string;
  primaryColor: string;
};



type InventoryPrintProps = {
  items: InventoryPrintItem[];
  settings: InventoryPrintSettings;
  representativeName?: string;
  representativeCity?: string;
  representativePhone?: string;
  representativeAddress?: string;
  filterDescription?: string;
  onClose?: () => void;
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



const formatNumber = (value: unknown): string => {
  return new Intl.NumberFormat('fa-IR').format(
    toNumber(value),
  );
};



const formatDate = (): string => {
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
    .format(new Date())
    .replace(/[\u200e\u200f]/g, '');
};



const getItemTotal = (
  item: InventoryPrintItem,
): number => {
  if (item.totalPrice !== undefined) {
    return toNumber(item.totalPrice);
  }



  return (
    toNumber(item.quantity) *
    toNumber(item.unitPrice)
  );
};



const textOr = (
  value: unknown,
  fallback: string,
): string => {
  const text = String(value ?? '').trim();



  return text || fallback;
};



const InventoryPrint = ({
  items,
  settings,
  representativeName,
  representativeCity,
  representativePhone,
  representativeAddress,
  filterDescription,
  onClose,
}: InventoryPrintProps) => {
  const safeItems = useMemo(
    () =>
      Array.isArray(items)
        ? items
        : [],
    [items],
  );



  const totalQuantity = useMemo(
    () =>
      safeItems.reduce(
        (sum, item) =>
          sum + toNumber(item.quantity),
        0,
      ),
    [safeItems],
  );



  const totalValue = useMemo(
    () =>
      safeItems.reduce(
        (sum, item) =>
          sum + getItemTotal(item),
        0,
      ),
    [safeItems],
  );



  useEffect(() => {
    if (typeof onClose !== 'function') {
      return;
    }



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



  const primaryColor =
    /^#[0-9a-fA-F]{6}$/.test(
      settings.primaryColor,
    )
      ? settings.primaryColor
      : '#111827';



  const handleCloseSafe = () => {
    onClose?.();
  };



  const printDocument = (
    <div
      id="inventory-print-root"
      dir="rtl"
      style={
        {
          '--inventory-primary': primaryColor,
        } as React.CSSProperties
      }
    >
      <style>{`
        #inventory-print-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          overflow-x: hidden;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.5);
          color: #111827;
          font-family: Tahoma, Arial, sans-serif;
        }



        #inventory-print-root,
        #inventory-print-root * {
          box-sizing: border-box;
        }



        #inventory-print-root .inventory-print-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: min(1100px, calc(100% - 24px));
          max-width: calc(100% - 24px);
          margin: 18px auto 0;
          padding: 14px 18px;
          border: 1px solid #e5e7eb;
          border-radius: 14px 14px 0 0;
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 10;
        }



        #inventory-print-root .inventory-print-toolbar h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-toolbar p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 11px;
        }



        #inventory-print-root .inventory-print-actions {
          display: flex;
          flex-shrink: 0;
          gap: 8px;
        }



        #inventory-print-root button {
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          padding: 9px 16px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          transition: opacity 0.2s;
        }



        #inventory-print-root button:hover {
          opacity: 0.9;
        }



        #inventory-print-root .inventory-print-close {
          background: #e5e7eb;
          color: #374151;
        }



        #inventory-print-root .inventory-print-button {
          background: var(--inventory-primary);
          color: #ffffff;
        }



        #inventory-print-root .inventory-print-paper {
          width: min(1100px, calc(100% - 24px));
          max-width: calc(100% - 24px);
          min-height: 900px;
          margin: 0 auto 18px;
          padding: 28px;
          overflow: hidden;
          border-radius: 0 0 14px 14px;
          background: #ffffff;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
        }



        #inventory-print-root .inventory-print-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
          padding-bottom: 14px;
          border-bottom: 3px solid var(--inventory-primary);
        }



        #inventory-print-root .inventory-print-company {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 10px;
        }



        #inventory-print-root .inventory-print-logo-box {
          display: flex;
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid #9ca3af;
          border-radius: 8px;
          background: #ffffff;
        }



        #inventory-print-root .inventory-print-logo {
          display: block;
          width: auto;
          height: auto;
          max-width: 48px;
          max-height: 48px;
          object-fit: contain;
        }



        #inventory-print-root .inventory-print-logo-fallback {
          display: flex;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--inventory-primary);
          color: #ffffff;
          font-size: 18pt;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-company h1 {
          margin: 0 0 3px;
          font-size: 15pt;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-company p {
          margin: 0;
          color: #4b5563;
          font-size: 8pt;
        }



        #inventory-print-root .inventory-print-title {
          flex: 1;
          min-width: 0;
          text-align: center;
        }



        #inventory-print-root .inventory-print-title span {
          display: block;
          margin-bottom: 3px;
          color: var(--inventory-primary);
          font-size: 8pt;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-title h2 {
          margin: 0;
          font-size: 18pt;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-title p {
          margin: 5px 0 0;
          color: #4b5563;
          font-size: 8pt;
        }



        #inventory-print-root .inventory-print-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          margin: 14px 0;
        }



        #inventory-print-root .inventory-print-meta-box {
          min-width: 0;
          padding: 8px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          font-size: 8pt;
        }



        #inventory-print-root .inventory-print-info-box {
          display: block;
          padding: 10px;
        }



        #inventory-print-root .inventory-print-info-title {
          margin: 0 0 6px;
          padding-bottom: 5px;
          border-bottom: 1px solid #d1d5db;
          color: var(--inventory-primary);
          font-size: 9pt;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-info-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-top: 4px;
          font-size: 8pt;
        }



        #inventory-print-root .inventory-print-info-row span {
          flex-shrink: 0;
          color: #6b7280;
        }



        #inventory-print-root .inventory-print-info-row strong {
          max-width: 65%;
          color: #111827;
          font-weight: 900;
          text-align: left;
          overflow-wrap: anywhere;
          word-break: break-word;
        }



        #inventory-print-root .inventory-print-table-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          overflow-y: visible;
        }



        #inventory-print-root .inventory-print-table {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          border-collapse: collapse;
          table-layout: fixed;
          direction: rtl;
          font-size: 9pt;
        }



        #inventory-print-root .inventory-print-table th,
        #inventory-print-root .inventory-print-table td {
          max-width: 0;
          border: 1px solid #6b7280;
          padding: 6px 4px;
          text-align: right;
          vertical-align: middle;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: break-word;
        }



        #inventory-print-root .inventory-print-table th {
          background: #e5e7eb;
          text-align: center;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-table td.center {
          text-align: center;
          white-space: normal;
        }



        #inventory-print-root .inventory-print-table td.money {
          text-align: center;
          white-space: normal;
        }



        #inventory-print-root .inventory-print-table td.title {
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-total-table {
          margin-top: 10px;
        }



        #inventory-print-root .inventory-print-total-table td {
          background: #e5e7eb;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
          max-width: 100%;
          margin-top: 14px;
        }



        #inventory-print-root .inventory-print-summary-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
          padding: 9px;
          border: 1px solid #9ca3af;
          font-size: 8pt;
        }



        #inventory-print-root .inventory-print-summary-box span {
          color: #6b7280;
        }



        #inventory-print-root .inventory-print-summary-box strong {
          max-width: 65%;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
          text-align: left;
          font-weight: 900;
        }



        #inventory-print-root .inventory-print-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          width: 100%;
          max-width: 100%;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #9ca3af;
          color: #4b5563;
          font-size: 8pt;
        }



        #inventory-print-root .inventory-print-footer p {
          max-width: 100%;
          margin: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }



        @media (max-width: 700px) {
          #inventory-print-root {
            width: 100vw;
            max-width: 100vw;
            overflow-x: hidden;
          }



          #inventory-print-root .inventory-print-toolbar {
            align-items: stretch;
            flex-direction: column;
            width: calc(100% - 16px);
            max-width: calc(100% - 16px);
            margin-top: 8px;
            padding: 12px;
          }



          #inventory-print-root .inventory-print-actions {
            width: 100%;
            max-width: 100%;
          }



          #inventory-print-root .inventory-print-actions button {
            flex: 1 1 0;
            min-width: 0;
          }



          #inventory-print-root .inventory-print-paper {
            width: calc(100% - 16px);
            max-width: calc(100% - 16px);
            min-width: 0;
            min-height: auto;
            margin-bottom: 8px;
            padding: 14px;
            overflow: hidden;
            border-radius: 0 0 12px 12px;
          }



          #inventory-print-root .inventory-print-header {
            align-items: stretch;
            flex-direction: column;
            gap: 14px;
          }



          #inventory-print-root .inventory-print-company {
            width: 100%;
            max-width: 100%;
          }



          #inventory-print-root .inventory-print-title {
            width: 100%;
            max-width: 100%;
            text-align: right;
          }



          #inventory-print-root .inventory-print-title h2 {
            font-size: 16pt;
            overflow-wrap: anywhere;
            word-break: break-word;
          }



          #inventory-print-root .inventory-print-meta {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 100%;
            gap: 7px;
          }



          #inventory-print-root .inventory-print-meta-box {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
          }



          #inventory-print-root .inventory-print-table-wrapper {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }



          #inventory-print-root .inventory-print-table {
            width: 100%;
            max-width: 100%;
            min-width: 0 !important;
            table-layout: fixed;
            font-size: 10px;
          }



          #inventory-print-root .inventory-print-table th,
          #inventory-print-root .inventory-print-table td {
            max-width: 0;
            padding: 6px 3px;
            line-height: 1.45;
            overflow-wrap: anywhere;
            word-break: break-word;
          }



          #inventory-print-root .inventory-print-table th {
            font-size: 9px;
            white-space: normal;
          }



          #inventory-print-root .inventory-print-table td.center,
          #inventory-print-root .inventory-print-table td.money {
            white-space: normal;
            text-align: center;
          }



          #inventory-print-root .inventory-print-table td.title {
            font-size: 10px;
            font-weight: 900;
          }



          #inventory-print-root .inventory-print-summary {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 100%;
            gap: 7px;
          }



          #inventory-print-root .inventory-print-summary-box {
            width: 100%;
            max-width: 100%;
            min-height: 40px;
            font-size: 11px;
          }



          #inventory-print-root .inventory-print-summary-box strong {
            max-width: 58%;
          }



          #inventory-print-root .inventory-print-footer {
            align-items: stretch;
            flex-direction: column;
            width: 100%;
            max-width: 100%;
            gap: 8px;
            font-size: 10px;
          }
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
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }



          body > * {
            display: none !important;
          }



          body > #inventory-print-root {
            display: block !important;
          }



          #inventory-print-root {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            display: block !important;
          }



          #inventory-print-root .inventory-print-toolbar {
            display: none !important;
          }



          #inventory-print-root .inventory-print-paper {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }



          #inventory-print-root .inventory-print-table-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }



          #inventory-print-root .inventory-print-table {
            display: table !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            font-size: 8.5pt !important;
          }



          #inventory-print-root .inventory-print-table thead {
            display: table-header-group !important;
          }



          #inventory-print-root .inventory-print-table tbody {
            display: table-row-group !important;
          }



          #inventory-print-root .inventory-print-table tr {
            display: table-row !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }



          #inventory-print-root .inventory-print-table th,
          #inventory-print-root .inventory-print-table td {
            display: table-cell !important;
            width: auto !important;
            min-height: 0 !important;
            max-width: none !important;
            border: 1px solid #6b7280 !important;
            padding: 6px 4px !important;
            background: #ffffff !important;
            text-align: right !important;
            overflow-wrap: anywhere !important;
          }



          #inventory-print-root .inventory-print-table thead th {
            background: #e5e7eb !important;
            text-align: center !important;
          }



          #inventory-print-root .inventory-print-total-table {
            display: table !important;
            width: 100% !important;
            margin-top: 10px !important;
          }



          #inventory-print-root .inventory-print-total-table td {
            background: #e5e7eb !important;
            font-weight: 900 !important;
          }



          #inventory-print-root .inventory-print-summary {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            width: 100% !important;
          }



          #inventory-print-root .inventory-print-footer {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
          }
        }
      `}</style>



      <div className="inventory-print-toolbar">
        <div>
          <h3>پیش‌نمایش گزارش موجودی</h3>
          <p>فقط همین گزارش چاپ می‌شود.</p>
        </div>



        <div className="inventory-print-actions">
          <button
            type="button"
            className="inventory-print-close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleCloseSafe();
            }}
          >
            بستن
          </button>



          <button
            type="button"
            className="inventory-print-button"
            onClick={() => {
              window.print();
            }}
          >
            چاپ
          </button>
        </div>
      </div>



      <main className="inventory-print-paper">
        <header className="inventory-print-header">
          <div className="inventory-print-company">
            <div className="inventory-print-logo-box">
              {settings.companyLogoSrc ? (
                <img
                  src={settings.companyLogoSrc}
                  alt="لوگوی شرکت"
                  className="inventory-print-logo"
                />
              ) : (
                <span className="inventory-print-logo-fallback">
                  {textOr(
                    representativeName,
                    'ش',
                  ).charAt(0)}
                </span>
              )}
            </div>



            <div>
              <h1>
                {textOr(
                  representativeName,
                  settings.companyName,
                )}
              </h1>



              <p>
                {textOr(
                  settings.companyTagline,
                  'سامانه مدیریت نمایندگی و انبار',
                )}
              </p>
            </div>
          </div>



          <div className="inventory-print-title">
            <span>گزارش رسمی موجودی</span>



            <h2>
              {textOr(
                settings.reportTitle,
                'گزارش موجودی انبار نمایندگی',
              )}
            </h2>



            <p>
              {representativeName ||
                'گزارش کلی موجودی انبار'}
              {representativeCity
                ? ` — ${representativeCity}`
                : ''}
            </p>
          </div>
        </header>



        <section className="inventory-print-meta">
          <div className="inventory-print-meta-box inventory-print-info-box">
            <p className="inventory-print-info-title">
              مشخصات شرکت
            </p>



            <div className="inventory-print-info-row">
              <span>تاریخ و ساعت چاپ:</span>
              <strong>{formatDate()}</strong>
            </div>



            <div className="inventory-print-info-row">
              <span>نام شخص / شرکت:</span>
              <strong>بازرگانی مهر امین</strong>
            </div>



            <div className="inventory-print-info-row">
              <span>آدرس شرکت:</span>
              <strong>سه راه خیام</strong>
            </div>



            <div className="inventory-print-info-row">
              <span>تلفن شرکت:</span>
              <strong>09123456789</strong>
            </div>
          </div>



          <div className="inventory-print-meta-box inventory-print-info-box">
            <p className="inventory-print-info-title">
              مشخصات نماینده
            </p>



            <div className="inventory-print-info-row">
              <span>نام شخص / شرکت:</span>
              <strong>
                {textOr(
                  representativeName,
                  '—',
                )}
              </strong>
            </div>



            <div className="inventory-print-info-row">
              <span>تلفن:</span>
              <strong>
                {textOr(
                  representativePhone,
                  '—',
                )}
              </strong>
            </div>



            <div className="inventory-print-info-row">
              <span>آدرس نمایندگی:</span>
              <strong>
                {textOr(
                  representativeAddress,
                  '—',
                )}
              </strong>
            </div>
          </div>
        </section>



        <div className="inventory-print-table-wrapper">
          <table className="inventory-print-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>ردیف</th>
                <th style={{ width: '25%' }}>عنوان</th>
                <th style={{ width: '15%' }}>برند</th>
                <th style={{ width: '15%' }}>دسته‌بندی</th>
                <th style={{ width: '10%' }}>موجودی</th>
                <th style={{ width: '15%' }}>قیمت</th>
                <th style={{ width: '15%' }}>ارزش کل</th>
              </tr>
            </thead>



            <tbody>
              {safeItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    کالایی برای چاپ وجود ندارد.
                  </td>
                </tr>
              ) : (
                safeItems.map((item, index) => (
                  <tr
                    key={
                      item.id ||
                      `inventory-print-${index}`
                    }
                  >
                    <td className="center">
                      {formatNumber(index + 1)}
                    </td>



                    <td className="title">
                      {textOr(
                        item.title,
                        'بدون عنوان',
                      )}
                    </td>



                    <td>
                      {textOr(
                        item.brand,
                        'بدون برند',
                      )}
                    </td>



                    <td>
                      {textOr(
                        item.category,
                        'بدون دسته‌بندی',
                      )}
                    </td>



                    <td className="center">
                      {formatNumber(item.quantity)} قلم
                    </td>



                    <td className="money">
                      {formatNumber(item.unitPrice)} تومان
                    </td>



                    <td className="money">
                      {formatNumber(getItemTotal(item))} تومان
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>



          <table className="inventory-print-table inventory-print-total-table">
            <tbody>
              <tr>
                <td style={{ width: '55%' }}>
                  جمع کل انبار
                </td>



                <td className="center" style={{ width: '15%' }}>
                  {formatNumber(totalQuantity)} قلم
                </td>



                <td className="center" style={{ width: '15%' }}>
                  —
                </td>



                <td className="money" style={{ width: '15%' }}>
                  {formatNumber(totalValue)} تومان
                </td>
              </tr>
            </tbody>
          </table>
        </div>



        <section className="inventory-print-summary">
          <div className="inventory-print-summary-box">
            <span>تعداد نوع کالا</span>



            <strong>
              {formatNumber(safeItems.length)} کالا
            </strong>
          </div>



          <div className="inventory-print-summary-box">
            <span>تعداد کل اقلام</span>



            <strong>
              {formatNumber(totalQuantity)} قلم
            </strong>
          </div>



          <div className="inventory-print-summary-box">
            <span>ارزش کل انبار</span>



            <strong>
              {formatNumber(totalValue)} تومان
            </strong>
          </div>
        </section>



        <footer className="inventory-print-footer">
          <p>
            {textOr(
              settings.footerText,
              'این گزارش به‌صورت خودکار از سامانه مدیریت انبار تهیه شده است.',
            )}
          </p>



          <p>
            {textOr(
              settings.signatureLabel,
              'امضا و مهر نمایندگی:',
            )}
          </p>
        </footer>
      </main>
    </div>
  );



  return createPortal(
    printDocument,
    document.body,
  );
};



export default InventoryPrint;