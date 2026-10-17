import { useEffect, useState } from 'react';

/**
 * هوک مدیریت چاپ - بهبود شده برای موبایل
 * - در دسکتاپ: window.print() معمولی
 * - در موبایل: باز کردن صفحه چاپ در تب جدید
 */
export function usePrint() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const printContent = (contentId: string, title = 'چاپ') => {
    const element = document.getElementById(contentId);
    if (!element) {
      console.error('محتوای چاپ پیدا نشد:', contentId);
      return;
    }

    // در موبایل: باز کردن در تب جدید
    if (isMobile) {
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) {
        alert('لطفاً popup blocker را غیرفعال کنید');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
            <style>
              @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
                direction: rtl;
                padding: 20px;
                background: white;
                color: #111827;
              }
              
              table {
                width: 100%;
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
              }
              
              th {
                background: #f3f4f6;
                font-weight: bold;
              }
              
              img {
                max-width: 100%;
                height: auto;
              }
              
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // صبر کن محتوا لود بشه و بعد چاپ کن
      setTimeout(() => {
        printWindow.print();
        // تب رو بعد از چاپ نبندیم تا کاربر بتونه ذخیره کنه
      }, 500);
      
      return;
    }

    // در دسکتاپ: window.print معمولی
    window.print();
  };

  return { printContent, isMobile };
}
