import { useEffect, useState } from 'react';

/**
 * هوک مدیریت چاپ - نسخه ریشه‌ای برای موبایل
 *
 * مشکل: در موبایل، وقتی print() صدا زده میشه، محتوا هنوز رندر نشده
 *        و PDF خالی ذخیره میشه.
 *
 * راه‌حل: استفاده از iframe مخفی + onload event
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
  }
  table {
    width: 100% !important;
    max-width: 100% !important;
    border-collapse: collapse;
    margin: 10px 0;
    table-layout: fixed;
  }
  th, td {
    border: 1px solid #6b7280;
    padding: 6px 8px;
    text-align: right;
    font-size: 11px;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
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
  h1, h2, h3, h4 {
    margin: 8px 0;
    color: #111827;
  }
  p {
    margin: 4px 0;
  }
  div {
    max-width: 100%;
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
    // ساخت iframe مخفی
    const iframe = document.createElement('iframe');
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
      document.body.removeChild(iframe);
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
    const element = document.getElementById(contentId);
    if (!element) {
      console.error('محتوای چاپ پیدا نشد:', contentId);
      return;
    }

    const innerHTML = element.innerHTML;

    // در موبایل: استفاده از iframe (مطمئن‌ترین روش)
    if (isMobile) {
      printViaIframe(innerHTML, title);
      return;
    }

    // در دسکتاپ: window.print معمولی
    window.print();
  };

  // متد عمومی برای چاپ مستقیم HTML
  const printHTML = (innerHTML: string, title = 'چاپ') => {
    if (isMobile) {
      printViaIframe(innerHTML, title);
      return;
    }
    // در دسکتاپ: باز کردن تب جدید با محتوا
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('لطفاً popup blocker را غیرفعال کنید');
      return;
    }
    printWindow.document.write(buildPrintHTML(innerHTML, title));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return { printContent, printHTML, isMobile };
}
