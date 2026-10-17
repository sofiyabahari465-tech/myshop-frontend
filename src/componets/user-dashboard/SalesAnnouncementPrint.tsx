import React from 'react';


type SaleItem = {
  productId?: string;
  productName?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
};


type SaleReport = {
  id?: string;
  representativeName?: string;
  representativeCode?: string;
  representativeCity?: string;
  saleDate?: string;
  saleDateJalali?: string;
  createdAt?: string;
  items?: SaleItem[];
  totalAmount?: number | string;
  totalItems?: number | string;
};


type PrintSettings = {
  companyName?: string;
  companySubtitle?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  fontFamily?: string;
  headerTitle?: string;
  footerText?: string;
  showLogo?: boolean;
  showCompanyName?: boolean;
  showRepresentativeInfo?: boolean;
  showReportNumber?: boolean;
  showDate?: boolean;
};


type Props = {
  report?: SaleReport;
  reports?: SaleReport[];
  settings?: PrintSettings;
  onClose: () => void;
};


const numberValue = (value: unknown): number => {
  const result = Number(
    String(value ?? '')
      .replace(/[۰-۹]/g, (x) =>
        String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x)),
      )
      .replace(/[٠-٩]/g, (x) =>
        String('٠١٢٣٤٥٦٧٨٩'.indexOf(x)),
      )
      .replace(/[,٬،\s]/g, '')
      .replace(/[^\d.-]/g, ''),
  );


  return Number.isFinite(result) ? result : 0;
};


const numberFa = (value: unknown): string =>
  new Intl.NumberFormat('fa-IR').format(
    numberValue(value),
  );


const moneyFa = (value: unknown): string =>
  `${numberFa(value)} تومان`;


const itemTotal = (item: SaleItem): number => {
  const savedTotal = numberValue(item.totalPrice);


  if (savedTotal > 0) {
    return savedTotal;
  }


  return (
    numberValue(item.quantity) *
    numberValue(item.unitPrice)
  );
};


const dateFa = (value?: string): string => {
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
  ).format(date);
};


const getItems = (report?: SaleReport): SaleItem[] => {
  return Array.isArray(report?.items)
    ? report.items
    : [];
};


const getReportTotalItems = (
  report?: SaleReport,
): number => {
  const savedTotal = numberValue(report?.totalItems);


  if (savedTotal > 0) {
    return savedTotal;
  }


  return getItems(report).reduce(
    (sum, item) =>
      sum + numberValue(item.quantity),
    0,
  );
};


const getReportTotalAmount = (
  report?: SaleReport,
): number => {
  const savedTotal = numberValue(report?.totalAmount);


  if (savedTotal > 0) {
    return savedTotal;
  }


  return getItems(report).reduce(
    (sum, item) => sum + itemTotal(item),
    0,
  );
};


const getSettings = (settings?: PrintSettings) => ({
  companyName:
    settings?.companyName || 'بازرگانی مهر امین',
  companySubtitle:
    settings?.companySubtitle ||
    'سامانه مدیریت فروش',
  logoUrl: settings?.logoUrl || '',
  primaryColor:
    settings?.primaryColor || '#0f766e',
  secondaryColor:
    settings?.secondaryColor || '#ecfdf5',
  textColor:
    settings?.textColor || '#111827',
  fontFamily:
    settings?.fontFamily ||
    'Tahoma, Arial, sans-serif',
  headerTitle:
    settings?.headerTitle ||
    'گزارش اعلام فروش',
  footerText:
    settings?.footerText ||
    'این گزارش به صورت سیستمی صادر شده است.',
  showLogo: settings?.showLogo ?? true,
  showCompanyName:
    settings?.showCompanyName ?? true,
  showRepresentativeInfo:
    settings?.showRepresentativeInfo ?? true,
  showReportNumber:
    settings?.showReportNumber ?? true,
  showDate: settings?.showDate ?? true,
});


const SalesAnnouncementPrint = ({
  report,
  reports,
  settings,
  onClose,
}: Props) => {
  const printSettings = getSettings(settings);
  const isBulk = Array.isArray(reports);


  const sourceReport = isBulk
    ? reports?.[0]
    : report;


  const allItems = isBulk
    ? (reports || []).flatMap((item) =>
        getItems(item),
      )
    : getItems(report);


  const totalItems = isBulk
    ? allItems.reduce(
        (sum, item) =>
          sum + numberValue(item.quantity),
        0,
      )
    : getReportTotalItems(report);


  const totalAmount = isBulk
    ? allItems.reduce(
        (sum, item) => sum + itemTotal(item),
        0,
      )
    : getReportTotalAmount(report);


  const printPage = () => {
    window.print();
  };


  return (
    <div
      className="sales-print-root"
      dir="rtl"
      style={{
        fontFamily: printSettings.fontFamily,
      }}
    >
      <div className="sales-print-screen">
        <div className="sales-print-topbar">
          <div>
            <h2>
              {isBulk
                ? 'پیش‌نمایش همه گزارش‌ها'
                : 'پیش‌نمایش گزارش فروش'}
            </h2>


            <p>
              {isBulk
                ? 'همه گزارش‌ها در یک گزارش چاپ می‌شوند.'
                : 'گزارش فروش آماده چاپ است.'}
            </p>
          </div>


          <button
            type="button"
            onClick={onClose}
            className="sales-print-close"
          >
            بستن
          </button>
        </div>


        <div className="sales-print-paper">
          <PrintContent
            report={sourceReport}
            items={allItems}
            totalItems={totalItems}
            totalAmount={totalAmount}
            settings={printSettings}
            isBulk={isBulk}
          />
        </div>


        <div className="sales-print-actions">
          <button
            type="button"
            onClick={onClose}
            className="sales-print-cancel"
          >
            انصراف
          </button>


          <button
            type="button"
            onClick={printPage}
            className="sales-print-submit"
          >
            {isBulk
              ? 'چاپ همه گزارش‌ها'
              : 'چاپ گزارش'}
          </button>
        </div>
      </div>


      <div className="sales-print-only">
        <PrintContent
          report={sourceReport}
          items={allItems}
          totalItems={totalItems}
          totalAmount={totalAmount}
          settings={printSettings}
          isBulk={isBulk}
        />
      </div>


      <style>{`
        .sales-print-root {
          position: fixed;
          inset: 0;
          z-index: 999999;
          overflow-y: auto;
          background: rgba(15, 23, 42, 0.75);
        }


        .sales-print-screen {
          width: min(950px, calc(100% - 24px));
          margin: 24px auto;
        }


        .sales-print-topbar,
        .sales-print-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          background: #fff;
        }


        .sales-print-topbar {
          border-radius: 16px 16px 0 0;
        }


        .sales-print-topbar h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
        }


        .sales-print-topbar p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 12px;
        }


        .sales-print-close,
        .sales-print-cancel,
        .sales-print-submit {
          border-radius: 9px;
          padding: 10px 18px;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
        }


        .sales-print-close {
          border: 0;
          background: #fee2e2;
          color: #b91c1c;
        }


        .sales-print-paper {
          padding: 20px;
          background: #fff;
        }


        .sales-print-actions {
          justify-content: flex-end;
          border-radius: 0 0 16px 16px;
        }


        .sales-print-cancel {
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
        }


        .sales-print-submit {
          border: 0;
          background: #0f766e;
          color: #fff;
        }


        .sales-print-only {
          display: none;
        }


        .print-content {
          width: 100%;
          color: var(--print-text-color);
          background: #fff;
          direction: rtl;
        }


        .print-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 12px;
          border-bottom: 3px solid var(--print-primary-color);
        }


        .print-company {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }


        .print-logo {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }


        .print-header h1,
        .print-header h2 {
          margin: 0;
          font-weight: 900;
        }


        .print-header h1 {
          font-size: 20px;
        }


        .print-header h2 {
          color: var(--print-primary-color);
          font-size: 17px;
        }


        .print-header p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 10px;
        }


        .print-header-left {
          text-align: left;
        }


        .print-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 12px 0;
        }


        .print-info-box {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: var(--print-secondary-color);
        }


        .print-info-title {
          margin: 0 0 6px;
          padding-bottom: 5px;
          border-bottom: 1px solid #d1d5db;
          color: var(--print-primary-color);
          font-size: 12px;
          font-weight: 900;
        }


        .print-info-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-top: 4px;
          font-size: 10px;
        }


        .print-info-row span {
          flex-shrink: 0;
          color: #6b7280;
        }


        .print-info-row strong {
          max-width: 65%;
          color: #111827;
          font-weight: 900;
          text-align: left;
          overflow-wrap: anywhere;
          word-break: break-word;
        }


        .print-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 9px;
        }


        .print-table th,
        .print-table td {
          border: 1px solid #9ca3af;
          padding: 5px 4px;
          text-align: right;
          overflow-wrap: anywhere;
        }


        .print-table th {
          background: var(--print-primary-color);
          color: #fff;
          font-weight: 900;
        }


        .print-table th:nth-child(1),
        .print-table td:nth-child(1) {
          width: 7%;
        }


        .print-table th:nth-child(2),
        .print-table td:nth-child(2) {
          width: 38%;
        }


        .print-table th:nth-child(3),
        .print-table td:nth-child(3) {
          width: 15%;
        }


        .print-table th:nth-child(4),
        .print-table td:nth-child(4) {
          width: 20%;
        }


        .print-table th:nth-child(5),
        .print-table td:nth-child(5) {
          width: 20%;
        }


        .print-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }


        .print-total-table {
          margin-top: 10px;
        }


        .print-total-table td {
          background: var(--print-secondary-color);
          font-weight: 900;
        }


        .print-signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 24px;
        }


        .print-signatures > div {
          text-align: center;
          font-size: 9px;
          font-weight: 900;
        }


        .print-signatures i {
          display: block;
          height: 28px;
          margin-top: 5px;
          border-bottom: 1px solid #374151;
        }


        .print-footer {
          margin-top: 12px;
          padding-top: 6px;
          border-top: 1px solid #d1d5db;
          color: #6b7280;
          font-size: 8px;
          text-align: center;
        }


        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }


          html,
          body {
            width: 297mm !important;
            height: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }


          body > * {
            display: none !important;
          }


          body > #root {
            display: block !important;
            width: 297mm !important;
            height: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }


          #root > .sales-print-root {
            display: block !important;
            position: static !important;
            width: 297mm !important;
            height: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }


          .sales-print-screen {
            display: none !important;
          }


          .sales-print-only {
            display: block !important;
            width: 297mm !important;
            height: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }


          .print-content {
            display: block !important;
            width: 297mm !important;
            max-width: 297mm !important;
            min-width: 0 !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            background: #fff !important;
            transform: none !important;
          }


          .print-header {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 20px !important;
            width: 100% !important;
            padding-bottom: 4mm !important;
            border-bottom: 3px solid var(--print-primary-color) !important;
          }


          .print-header h1 {
            font-size: 22px !important;
          }


          .print-header h2 {
            font-size: 18px !important;
          }


          .print-header p {
            margin-top: 4px !important;
            font-size: 11px !important;
          }


          .print-logo {
            width: 52px !important;
            height: 52px !important;
          }


          .print-info {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
            margin: 6mm 0 !important;
          }


          .print-info-box {
            padding: 10px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 6px !important;
          }


          .print-info-title {
            font-size: 13px !important;
          }


          .print-info-row {
            font-size: 11px !important;
          }


          .print-table {
            display: table !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
          }


          .print-table thead {
            display: table-header-group !important;
          }


          .print-table tbody {
            display: table-row-group !important;
          }


          .print-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }


          .print-table th,
          .print-table td {
            display: table-cell !important;
            min-width: 0 !important;
            max-width: none !important;
            padding: 5px 6px !important;
            font-size: 11px !important;
            text-align: right !important;
            white-space: normal !important;
            overflow: visible !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            line-height: 1.4 !important;
          }


          .print-table th {
            font-weight: 900 !important;
          }


          .print-total-table {
            display: table !important;
            width: 100% !important;
            margin-top: 10px !important;
          }


          .print-total-table td {
            background: var(--print-secondary-color) !important;
            font-weight: 900 !important;
          }


          .print-signatures {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
            margin-top: 8mm !important;
          }


          .print-signatures > div {
            font-size: 11px !important;
          }


          .print-signatures i {
            height: 24px !important;
            margin-top: 5px !important;
          }


          .print-footer {
            margin-top: 5mm !important;
            padding-top: 2mm !important;
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
};


type PrintContentProps = {
  report?: SaleReport;
  items: SaleItem[];
  totalItems: number;
  totalAmount: number;
  settings: ReturnType<typeof getSettings>;
  isBulk: boolean;
};


const PrintContent = ({
  report,
  items,
  totalItems,
  totalAmount,
  settings,
  isBulk,
}: PrintContentProps) => {
  const contentStyle = {
    '--print-primary-color':
      settings.primaryColor,
    '--print-secondary-color':
      settings.secondaryColor,
    '--print-text-color':
      settings.textColor,
  } as React.CSSProperties;


  return (
    <div
      className="print-content"
      style={contentStyle}
    >
      <header className="print-header">
        <div className="print-company">
          {settings.showLogo &&
          settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="لوگو"
              className="print-logo"
            />
          ) : null}


          <div>
            {settings.showCompanyName ? (
              <h1>
                {report?.representativeName ||
                  settings.companyName}
              </h1>
            ) : null}


            <p>{settings.companySubtitle}</p>
          </div>
        </div>


        <div className="print-header-left">
          <h2>
            {isBulk
              ? 'گزارش تجمیعی اعلام فروش'
              : settings.headerTitle}
          </h2>


          {settings.showDate ? (
            <p>
              تاریخ چاپ: {dateFa()}
            </p>
          ) : null}
        </div>
      </header>


      <section className="print-info">
        <div className="print-info-box">
          <p className="print-info-title">
            مشخصات شرکت
          </p>


          <div className="print-info-row">
            <span>تاریخ و ساعت چاپ:</span>
            <strong>{dateFa()}</strong>
          </div>


          <div className="print-info-row">
            <span>نام شخص / شرکت:</span>
            <strong>بازرگانی مهر امین</strong>
          </div>


          <div className="print-info-row">
            <span>آدرس شرکت:</span>
            <strong>سه راه خیام</strong>
          </div>


          <div className="print-info-row">
            <span>تلفن شرکت:</span>
            <strong>09123456789</strong>
          </div>
        </div>


        <div className="print-info-box">
          <p className="print-info-title">
            مشخصات نماینده
          </p>


          <div className="print-info-row">
            <span>نام شخص / شرکت:</span>
            <strong>
              {report?.representativeName || '—'}
            </strong>
          </div>


          <div className="print-info-row">
            <span>کد نماینده:</span>
            <strong>
              {report?.representativeCode || '—'}
            </strong>
          </div>


          <div className="print-info-row">
            <span>شهر / آدرس:</span>
            <strong>
              {report?.representativeCity || '—'}
            </strong>
          </div>
        </div>
      </section>


      <table className="print-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>نام کالا</th>
            <th>تعداد</th>
            <th>قیمت</th>
            <th>مبلغ کل</th>
          </tr>
        </thead>


        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5}>
                کالایی در این گزارش وجود ندارد.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={
                  item.productId ||
                  `print-item-${index}`
                }
              >
                <td>{numberFa(index + 1)}</td>


                <td>
                  {item.productName ||
                    'کالای بدون نام'}
                </td>


                <td>
                  {numberFa(item.quantity)} قلم
                </td>


                <td>
                  {moneyFa(item.unitPrice)}
                </td>


                <td>
                  {moneyFa(itemTotal(item))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>


      <table className="print-table print-total-table">
        <tbody>
          <tr>
            <td style={{ width: '40%' }}>
              جمع کل
            </td>


            <td style={{ width: '20%' }}>
              {numberFa(totalItems)} قلم
            </td>


            <td style={{ width: '20%' }}>
              —
            </td>


            <td style={{ width: '20%' }}>
              {moneyFa(totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>


      <div className="print-signatures">
        <div>
          امضای نماینده
          <i />
        </div>


        <div>
          تأیید مسئول فروش
          <i />
        </div>


        <div>
          مهر شرکت
          <i />
        </div>
      </div>


      <footer className="print-footer">
        {settings.footerText}
      </footer>
    </div>
  );
};


export default SalesAnnouncementPrint;