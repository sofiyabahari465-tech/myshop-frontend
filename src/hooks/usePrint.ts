import { useEffect, useState } from 'react';

/**
 * هوک مدیریت چاپ - نسخه ریشه‌ای
 *
 * مشکل: هم در موبایل و هم در دسکتاپ، وقتی print() صدا زده میشه،
 *        CSS چاپ با visibility:hidden محتوا رو مخفی می‌کنه و PDF خالی ذخیره میشه.
 *
 * راه‌حل: استفاده از iframe مخفی برای هم دستگاه‌ها
 * - محتوا توی iframe نوشته میشه
 * - صبر می‌کنیم تا iframe کامل لود بشه (onload)
 * - بعد از onload، چاپ صدا زده میشه
 * - iframe بعد از چاپ حذف میشه
 */
export function usePrint() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        typeof window !== 'undefined' &&
          (window.innerWidth < 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent,
            )),
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const buildPrintHTML = (innerHTML: string, title: string) => {
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<title>${title}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" />
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    font-family: 'Vazirmatn', Tahoma, Arial, sans-serif !important;
    direction: rtl;
    padding: 15px;
    background: #ffffff !important;
    color: #111827;
    width: 100%;
    max-width: 100%;
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
  }
  /* همه عناصر قابل مشاهده باشند */
  body * {
    visibility: visible !important;
    opacity: 1 !important;
  }
  table {
    width: 100% !important;
    max-width: 100% !important;
    border-collapse: collapse;
    margin: 10px 0;
    table-layout: fixed;
    display: table !important;
  }
  thead, tbody, tfoot {
    display: table-row-group !important;
  }
  tr {
    display: table-row !important;
    page-break-inside: avoid;
    page-break-after: auto;
  }
  th, td {
    border: 1px solid #6b7280;
    padding: 6px 8px;
    text-align: right;
    font-size: 11px;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    display: table-cell !important;
    visibility: visible !important;
  }
  th {
    background: #f3f4f6 !important;
    font-weight: bold;
    color: #111827;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 8px 0;
    color: #111827;
    display: block !important;
  }
  p, span, div {
    display: block !important;
    color: #111827;
  }
  p {
    margin: 4px 0;
  }
  /* اطمینان از نمایش همه چیز */
  .no-print, .no-print * {
    display: none !important;
  }
  @media print {
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    html, body {
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    body * {
      visibility: visible !important;
      opacity: 1 !important;
    }
    table {
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
  }
</style>
</head>
<body>
${innerHTML}
</body>
</html>`;
  };

  const printViaIframe = (innerHTML: string, title: string) => {
    // حذف iframe قبلی اگه هست
    const oldIframe = document.getElementById('print-iframe');
    if (oldIframe && oldIframe.parentNode) {
      document.body.removeChild(oldIframe);
    }

    // ساخت iframe مخفی
    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = title;

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      console.error('نتوانستم به iframe دسترسی پیدا کنم');
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      return;
    }

    // نوشتن محتوا در iframe
    doc.open();
    doc.write(buildPrintHTML(innerHTML, title));
    doc.close();

    // صبر کن تا iframe کامل لود بشه
    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        // چاپ با تأخیر کوتاه برای اطمینان از رندر کامل
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('خطا در چاپ:', e);
          }
          // حذف iframe بعد از چاپ
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 300);
      } catch (e) {
        console.error('خطا در چاپ:', e);
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }
    };

    // اگه iframe قبلاً لود شده
    if (iframe.contentWindow?.document?.readyState === 'complete') {
      triggerPrint();
    } else {
      // صبر کن تا لود بشه
      iframe.onload = triggerPrint;
      // Fallback اگه onload اجرا نشد
      setTimeout(() => {
        if (
          iframe.parentNode &&
          iframe.contentWindow?.document?.readyState === 'complete'
        ) {
          triggerPrint();
        }
      }, 2000);
    }
  };

  const printContent = (contentId: string, title = 'چاپ') => {
    // صبر کن محتوای چاپ رندر بشه
    setTimeout(() => {
      // اول با id می‌گردیم
      let element = document.getElementById(contentId) as HTMLElement | null;

      // اگه پیدا نشد، با className می‌گردیم
      if (!element) {
        element = document.querySelector(
          `.${contentId}`,
        ) as HTMLElement | null;
      }

      // اگه پیدا نشد، با data-print attribute می‌گردیم
      if (!element) {
        element = document.querySelector(
          `[data-print="${contentId}"]`,
        ) as HTMLElement | null;
      }

      if (!element) {
        console.warn(
          'محتوای چاپ پیدا نشد با:',
          contentId,
        );
        window.print();
        return;
      }

      const innerHTML = element.outerHTML;

      // برای همه دستگاه‌ها از iframe استفاده می‌کنیم (مطمئن‌ترین روش)
      printViaIframe(innerHTML, title);
    }, 200); // 200ms صبر برای رندر محتوا
  };

  // متد عمومی برای چاپ مستقیم HTML
  const printHTML = (innerHTML: string, title = 'چاپ') => {
    printViaIframe(innerHTML, title);
  };

  return { printContent, printHTML, isMobile };
}
