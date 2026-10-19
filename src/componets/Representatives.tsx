import React, {
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hash,
  Inbox,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';

import type {
  Representative,
  RepresentativeFormState,
  UserRole,
} from '../types';

const toEnglishDigits = (value: unknown) => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) =>
      String(
        '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit),
      ),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String(
        '٠١٢٣٤٥٦٧٨٩'.indexOf(digit),
      ),
    );
};

const normalizeJalaliDate = (
  value: unknown,
) => {
  const normalized = toEnglishDigits(value)
    .replace(/-/g, '/')
    .replace(/[^\d/]/g, '');

  const digits = normalized
    .replace(/\//g, '')
    .slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(
      0,
      4,
    )}/${digits.slice(4)}`;
  }

  return `${digits.slice(
    0,
    4,
  )}/${digits.slice(
    4,
    6,
  )}/${digits.slice(6, 8)}`;
};

const isValidJalaliDate = (
  value: string,
) => {
  return /^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(
    value,
  );
};

const toPersianNumber = (
  value: unknown,
) => {
  const normalized = toEnglishDigits(value).replace(
    /[^\d.-]/g,
    '',
  );

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return String(value ?? '—');
  }

  return new Intl.NumberFormat(
    'fa-IR',
  ).format(parsed);
};

const padNumber = (value: number) =>
  String(value).padStart(2, '0');

const formatJalaliDate = ({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) => {
  return `${year}/${padNumber(
    month,
  )}/${padNumber(day)}`;
};

const parseJalaliDate = (
  value: string,
): {
  year: number;
  month: number;
  day: number;
} | null => {
  const normalized =
    normalizeJalaliDate(value);

  if (!isValidJalaliDate(normalized)) {
    return null;
  }

  const [year, month, day] = normalized
    .split('/')
    .map(Number);

  return {
    year,
    month,
    day,
  };
};

const isLeapJalaliYear = (
  year: number,
) => {
  const breaks = [
    -61,
    9,
    38,
    199,
    426,
    686,
    756,
    818,
    1111,
    1181,
    1210,
    1635,
    2060,
    2097,
    2192,
    2262,
    2324,
    2394,
    2456,
    3178,
  ];

  const jalaliYear = year - 621;
  let leapJ = -14;
  let previousBreak = breaks[0];
  let jump = 0;

  for (
    let index = 1;
    index < breaks.length;
    index += 1
  ) {
    const currentBreak = breaks[index];
    jump = currentBreak - previousBreak;

    if (jalaliYear < currentBreak) {
      break;
    }

    leapJ +=
      Math.floor(jump / 33) * 8 +
      Math.floor((jump % 33) / 4);

    previousBreak = currentBreak;
  }

  let remainingYears =
    jalaliYear - previousBreak;

  leapJ +=
    Math.floor(remainingYears / 33) * 8 +
    Math.floor(
      ((remainingYears % 33) + 3) / 4,
    );

  if (
    jump % 33 === 4 &&
    jump - remainingYears === 4
  ) {
    leapJ += 1;
  }

  if (jump - remainingYears < 6) {
    remainingYears =
      remainingYears -
      jump +
      Math.floor((jump + 4) / 33) * 33;
  }

  let leap =
    ((remainingYears + 1) % 33) - 1;

  if (leap === -1) {
    leap = 4;
  }

  return leap === 0 || leap === 4;
};

const getJalaliMonthDays = (
  year: number,
  month: number,
) => {
  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  if (month === 12) {
    return isLeapJalaliYear(year)
      ? 30
      : 29;
  }

  return 30;
};

const gregorianToJalali = (
  gy: number,
  gm: number,
  gd: number,
) => {
  const gregorianMonthDays = [
    0,
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const jalaliMonthDays = [
    0,
    31,
    31,
    31,
    31,
    31,
    31,
    30,
    30,
    30,
    30,
    30,
    29,
  ];

  const normalizedGregorianYear = gy - 1600;
  const normalizedGregorianMonth = gm - 1;
  const normalizedGregorianDay = gd - 1;

  let gregorianDayNumber =
    365 * normalizedGregorianYear +
    Math.floor(
      (normalizedGregorianYear + 3) / 4,
    ) -
    Math.floor(
      (normalizedGregorianYear + 99) / 100,
    ) +
    Math.floor(
      (normalizedGregorianYear + 399) /
        400,
    );

  for (
    let index = 0;
    index < normalizedGregorianMonth;
    index += 1
  ) {
    gregorianDayNumber +=
      gregorianMonthDays[index + 1];
  }

  if (
    normalizedGregorianMonth > 1 &&
    ((gy % 4 === 0 && gy % 100 !== 0) ||
      gy % 400 === 0)
  ) {
    gregorianDayNumber += 1;
  }

  gregorianDayNumber +=
    normalizedGregorianDay;

  let jalaliDayNumber =
    gregorianDayNumber - 79;

  const jalaliCycles = Math.floor(
    jalaliDayNumber / 12053,
  );

  jalaliDayNumber %= 12053;

  let jalaliYear =
    979 +
    33 * jalaliCycles +
    4 *
      Math.floor(
        jalaliDayNumber / 1461,
      );

  jalaliDayNumber %= 1461;

  if (jalaliDayNumber >= 366) {
    jalaliYear += Math.floor(
      (jalaliDayNumber - 1) / 365,
    );

    jalaliDayNumber =
      (jalaliDayNumber - 1) % 365;
  }

  let jalaliMonth = 1;

  while (
    jalaliMonth <= 12 &&
    jalaliDayNumber >=
      jalaliMonthDays[jalaliMonth]
  ) {
    jalaliDayNumber -=
      jalaliMonthDays[jalaliMonth];

    jalaliMonth += 1;
  }

  return {
    year: jalaliYear,
    month: jalaliMonth,
    day: jalaliDayNumber + 1,
  };
};

const jalaliToGregorian = (
  jy: number,
  jm: number,
  jd: number,
) => {
  const gregorianMonthDays = [
    0,
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const normalizedJalaliYear = jy - 979;
  const normalizedJalaliMonth = jm - 1;
  const normalizedJalaliDay = jd - 1;

  let jalaliDayNumber =
    365 * normalizedJalaliYear +
    Math.floor(
      normalizedJalaliYear / 33,
    ) *
      8 +
    Math.floor(
      ((normalizedJalaliYear % 33) + 3) /
        4,
    );

  for (
    let index = 0;
    index < normalizedJalaliMonth;
    index += 1
  ) {
    jalaliDayNumber += index < 6 ? 31 : 30;
  }

  jalaliDayNumber +=
    normalizedJalaliDay;

  let gregorianDayNumber =
    jalaliDayNumber + 79;

  let gregorianYear =
    1600 +
    400 *
      Math.floor(
        gregorianDayNumber / 146097,
      );

  gregorianDayNumber %= 146097;

  let leap = true;

  if (gregorianDayNumber >= 36525) {
    gregorianDayNumber -= 1;

    gregorianYear +=
      100 *
      Math.floor(
        gregorianDayNumber / 36524,
      );

    gregorianDayNumber %= 36524;

    if (gregorianDayNumber >= 365) {
      gregorianDayNumber += 1;
    } else {
      leap = false;
    }
  }

  gregorianYear +=
    4 *
    Math.floor(
      gregorianDayNumber / 1461,
    );

  gregorianDayNumber %= 1461;

  if (gregorianDayNumber >= 366) {
    leap = false;
    gregorianDayNumber -= 1;
    gregorianYear += Math.floor(
      gregorianDayNumber / 365,
    );
    gregorianDayNumber %= 365;
  }

  let gregorianMonth = 0;

  while (
    gregorianMonth < 12 &&
    gregorianDayNumber >=
      gregorianMonthDays[
        gregorianMonth + 1
      ] +
        (gregorianMonth === 1 && leap
          ? 1
          : 0)
  ) {
    gregorianDayNumber -=
      gregorianMonthDays[
        gregorianMonth + 1
      ] +
      (gregorianMonth === 1 && leap
        ? 1
        : 0);

    gregorianMonth += 1;
  }

  return {
    year: gregorianYear,
    month: gregorianMonth + 1,
    day: gregorianDayNumber + 1,
  };
};

const getJalaliWeekDay = (
  year: number,
  month: number,
  day: number,
) => {
  const gregorianDate =
    jalaliToGregorian(
      year,
      month,
      day,
    );

  return (
    (new Date(
      gregorianDate.year,
      gregorianDate.month - 1,
      gregorianDate.day,
    ).getDay() +
      1) %
    7
  );
};

const jalaliMonthNames = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const jalaliWeekDays = [
  'ش',
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ج',
];

interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

const JalaliDatePicker: React.FC<
  JalaliDatePickerProps
> = ({
  value,
  onChange,
  disabled = false,
  label = 'تاریخ',
}) => {
  const [isOpen, setIsOpen] =
    useState(false);

  const [currentDate, setCurrentDate] =
    useState(() => {
      return (
        parseJalaliDate(value) ||
        gregorianToJalali(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          new Date().getDate(),
        )
      );
    });

  const selectedDateParts =
    parseJalaliDate(value);

  const handleDayClick = (day: number) => {
    onChange(
      formatJalaliDate({
        ...currentDate,
        day,
      }),
    );

    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setCurrentDate((previousDate) => {
      let newMonth =
        previousDate.month + offset;

      let newYear = previousDate.year;

      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }

      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }

      return {
        ...previousDate,
        year: newYear,
        month: newMonth,
        day: 1,
      };
    });
  };

  const daysInMonth =
    getJalaliMonthDays(
      currentDate.year,
      currentDate.month,
    );

  const firstDayIndex =
    getJalaliWeekDay(
      currentDate.year,
      currentDate.month,
      1,
    );

  const calendarDays: Array<
    number | null
  > = [];

  for (
    let index = 0;
    index < firstDayIndex;
    index += 1
  ) {
    calendarDays.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    calendarDays.push(day);
  }

  return (
    <div className="relative w-full">
      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
        <Calendar className="h-3.5 w-3.5 text-gray-400" />
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          readOnly
          value={value}
          onClick={() => {
            if (!disabled) {
              setIsOpen(
                (currentValue) =>
                  !currentValue,
              );
            }
          }}
          disabled={disabled}
          placeholder="1403/01/01"
          className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500"
        />

        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen(
                (currentValue) =>
                  !currentValue,
              );
            }
          }}
          disabled={disabled}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-blue-500 disabled:opacity-50"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-[100] mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                changeMonth(1)
              }
              className="rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>

            <span className="font-bold text-gray-800 dark:text-gray-100">
              {
                jalaliMonthNames[
                  currentDate.month - 1
                ]
              }{' '}
              {toPersianNumber(
                currentDate.year,
              )}
            </span>

            <button
              type="button"
              onClick={() =>
                changeMonth(-1)
              }
              className="rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {jalaliWeekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-bold text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(
              (day, index) => {
                const isSelected =
                  selectedDateParts?.day ===
                    day &&
                  selectedDateParts?.month ===
                    currentDate.month &&
                  selectedDateParts?.year ===
                    currentDate.year;

                return (
                  <button
                    key={`${day || 'empty'}-${index}`}
                    type="button"
                    disabled={!day}
                    onClick={() => {
                      if (day) {
                        handleDayClick(day);
                      }
                    }}
                    className={`h-8 w-full rounded-lg text-xs font-bold transition-all ${
                      !day
                        ? 'invisible'
                        : isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {day
                      ? toPersianNumber(day)
                      : ''}
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="text-xs text-gray-500 transition hover:text-red-500"
            >
              بستن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface Props {
  representatives: Representative[];
  userRole: UserRole;
  onOpenDashboard: (
    id: string,
  ) => void;
  onAddRepresentative: (
    data: Partial<Representative>,
  ) => Promise<void>;
  onEditRepresentative: (
    id: string,
    data: Partial<Representative>,
  ) => Promise<void>;
  onDeleteRepresentative: (
    id: string,
  ) => Promise<void>;
}

const normalizeMoney = (value: unknown) =>
  toEnglishDigits(value).replace(
    /[^\d]/g,
    '',
  );

const formatMoneyInput = (
  value: unknown,
) => {
  const numericValue = Number(
    normalizeMoney(value),
  );

  if (
    !Number.isFinite(numericValue) ||
    numericValue === 0
  ) {
    return '';
  }

  return numericValue.toLocaleString(
    'en-US',
  );
};

const getTodayJalali = () => {
  const formatter = new Intl.DateTimeFormat(
    'en-US-u-ca-persian',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  );

  const parts =
    formatter.formatToParts(
      new Date(),
    );

  const year =
    parts.find(
      (part) => part.type === 'year',
    )?.value || '';

  const month =
    parts.find(
      (part) => part.type === 'month',
    )?.value || '';

  const day =
    parts.find(
      (part) => part.type === 'day',
    )?.value || '';

  return `${year}/${month}/${day}`;
};

const initialFormData: RepresentativeFormState =
  {
    name: '',
    email: '',
    phone: '',
    province: '',
    city: '',
    code: '',
    address: '',
    description: '',
    shopDescription: '',
    orders: 0,
    status: 'active',
    startDate: getTodayJalali(),
    depositAmount: '0',
    guaranteeCheck: '0',
    totalFinancialCommitment: '0',
    shipmentsCount: 0,
    storeItemsCount: 0,
    storeItemsTotalValue: 0,
    returnRequestsCount: 0,
    last10DaysSales: 0,
    averageSales: 0,
  };

const Representatives: React.FC<Props> = ({
  representatives,
  userRole,
  onOpenDashboard,
  onAddRepresentative,
  onEditRepresentative,
  onDeleteRepresentative,
}) => {
  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [formData, setFormData] =
    useState<RepresentativeFormState>(
      initialFormData,
    );

  const nameRef =
    useRef<HTMLInputElement>(null);

  const codeRef =
    useRef<HTMLInputElement>(null);

  const cityRef =
    useRef<HTMLInputElement>(null);

  const phoneRef =
    useRef<HTMLInputElement>(null);

  const statusRef =
    useRef<HTMLSelectElement>(null);

  const depositRef =
    useRef<HTMLInputElement>(null);

  const guaranteeRef =
    useRef<HTMLInputElement>(null);

  const depositAmount =
    Number(
      normalizeMoney(
        formData.depositAmount,
      ),
    ) || 0;

  const guaranteeCheck =
    Number(
      normalizeMoney(
        formData.guaranteeCheck,
      ),
    ) || 0;

  const totalFinancialCommitment =
    useMemo(
      () =>
        depositAmount +
        guaranteeCheck,
      [
        depositAmount,
        guaranteeCheck,
      ],
    );

  const handleKeyDown = (
    event: React.KeyboardEvent<
      HTMLInputElement | HTMLSelectElement
    >,
    nextRef: React.RefObject<
      HTMLElement | null
    >,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      nextRef.current?.focus();
    }
  };

  const handlePrintRepresentatives = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('لطفاً popup blocker را غیرفعال کنید');
      return;
    }

    const today = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date());

    const rowsHtml = representatives.map((rep, index) => `
      <tr>
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${rep.code || '—'}</td>
        <td>${rep.name || '—'}</td>
        <td>${rep.province || '—'}</td>
        <td>${rep.city || '—'}</td>
        <td style="text-align:center;" dir="ltr">${rep.phone || '—'}</td>
        <td style="text-align:center;">${rep.storeItemsCount || 0}</td>
        <td style="text-align:center;">${rep.status === 'inactive' ? 'غیرفعال' : 'فعال'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>چاپ لیست نمایندگان</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" />
<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: 'Vazirmatn', Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; background: #fff; color: #111; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 3px solid #0f766e; padding-bottom: 15px; }
.logo { display: flex; align-items: center; gap: 15px; }
.logo img { max-height: 60px; max-width: 200px; }
.company-info h1 { font-size: 18px; margin: 0; }
.company-info p { font-size: 12px; color: #666; margin: 2px 0; }
.report-title { text-align: center; margin: 20px 0; }
.report-title h2 { font-size: 22px; margin: 0; }
.report-title p { font-size: 12px; color: #666; margin-top: 5px; }
table { width: 100%; border-collapse: collapse; margin-top: 15px; }
th, td { border: 1px solid #333; padding: 8px 10px; font-size: 12px; text-align: right; }
th { background: #0f766e !important; color: #fff; font-weight: bold; }
tr:nth-child(even) td { background: #f9fafb; }
.summary { display: flex; gap: 20px; margin-top: 20px; justify-content: space-around; }
.summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px 25px; text-align: center; min-width: 150px; }
.summary-card .label { font-size: 11px; color: #666; }
.summary-card .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
@media print { @page { size: A4 portrait; margin: 10mm; } body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <img src="https://sofiyabahari465-tech.github.io/myshop-panel/company-logo.png" alt="لوگو" onerror="this.style.display='none'" />
    <div class="company-info">
      <h1>بازرگانی مهر امین</h1>
      <p>سامانه مدیریت نمایندگی و انبار</p>
      <p>تلفن: 028-33236072</p>
    </div>
  </div>
  <div style="font-size: 12px; text-align: left;">
    <p><strong>تاریخ چاپ:</strong> ${today}</p>
    <p><strong>تعداد نمایندگان:</strong> ${representatives.length}</p>
  </div>
</div>

<div class="report-title">
  <h2>📋 گزارش لیست نمایندگان</h2>
  <p>لیست کامل نمایندگان ثبت‌شده در سامانه</p>
</div>

<table>
  <thead>
    <tr>
      <th style="width: 5%;">ردیف</th>
      <th style="width: 10%;">کد</th>
      <th style="width: 20%;">نام نماینده</th>
      <th style="width: 12%;">استان</th>
      <th style="width: 12%;">شهر</th>
      <th style="width: 15%;">تلفن</th>
      <th style="width: 10%;">تعداد کالا</th>
      <th style="width: 10%;">وضعیت</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<div class="summary">
  <div class="summary-card">
    <div class="label">تعداد کل نمایندگان</div>
    <div class="value">${representatives.length}</div>
  </div>
  <div class="summary-card">
    <div class="label">نمایندگان فعال</div>
    <div class="value">${representatives.filter(r => r.status !== 'inactive').length}</div>
  </div>
  <div class="summary-card">
    <div class="label">نمایندگان غیرفعال</div>
    <div class="value">${representatives.filter(r => r.status === 'inactive').length}</div>
  </div>
</div>

<div class="footer">
  <p>این گزارش به‌صورت خودکار از سامانه مدیریت نمایندگی و انبار تهیه شده است.</p>
  <p>بازرگانی مهر امین - 1405</p>
</div>

</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  const openModal = (
    representative?: Representative,
  ) => {
    if (representative) {
      setFormData({
        name: representative.name ?? '',
        email: representative.email ?? '',
        code: String(
          representative.code ?? '',
        ),
        province:
          representative.province ?? '',
        city: representative.city ?? '',
        phone: representative.phone ?? '',
        startDate:
          representative.startDate ||
          getTodayJalali(),
        status:
          representative.status ===
          'inactive'
            ? 'inactive'
            : 'active',
        address:
          representative.address ?? '',
        description:
          representative.description ?? '',
        shopDescription:
          representative.shopDescription ??
          '',
        orders:
          Number(
            representative.orders,
          ) || 0,
        depositAmount: String(
          representative.depositAmount ??
            '0',
        ),
        guaranteeCheck: String(
          representative.guaranteeCheck ??
            '0',
        ),
        totalFinancialCommitment: String(
          representative.totalFinancialCommitment ??
            '0',
        ),
        shipmentsCount:
          Number(
            representative.shipmentsCount,
          ) || 0,
        storeItemsCount:
          Number(
            representative.storeItemsCount,
          ) || 0,
        storeItemsTotalValue:
          Number(
            representative.storeItemsTotalValue,
          ) || 0,
        returnRequestsCount:
          Number(
            representative.returnRequestsCount,
          ) || 0,
        last10DaysSales:
          Number(
            representative.last10DaysSales,
          ) || 0,
        averageSales:
          Number(
            representative.averageSales,
          ) || 0,
      });

      setEditingId(
        String(representative.id),
      );
    } else {
      setFormData({
        ...initialFormData,
        startDate: getTodayJalali(),
      });

      setEditingId(null);
    }

    setIsModalOpen(true);

    window.setTimeout(() => {
      nameRef.current?.focus();
    }, 100);
  };

  const closeModal = () => {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      ...initialFormData,
      startDate: getTodayJalali(),
    });
  };

  const setMoneyField = (
    key:
      | 'depositAmount'
      | 'guaranteeCheck',
    value: string,
  ) => {
    setFormData((previousValue) => ({
      ...previousValue,
      [key]: normalizeMoney(value) || '0',
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name =
      formData.name.trim();

    const email =
      formData.email.trim();

    const code =
      String(
        formData.code ?? '',
      ).trim();

    const province =
      formData.province.trim();

    const city =
      formData.city.trim();

    const phone =
      formData.phone.trim();

    const startDate =
      normalizeJalaliDate(
        formData.startDate || '',
      );

    if (!name) {
      alert(
        'لطفاً نام نماینده را وارد کنید.',
      );
      nameRef.current?.focus();
      return;
    }

    if (!code) {
      alert(
        'لطفاً کد نمایندگی را وارد کنید.',
      );
      codeRef.current?.focus();
      return;
    }

    if (!province) {
      alert('لطفاً استان را وارد کنید.');
      return;
    }

    if (!city) {
      alert('لطفاً شهر را وارد کنید.');
      cityRef.current?.focus();
      return;
    }

    if (!phone) {
      alert(
        'لطفاً شماره تلفن را وارد کنید.',
      );
      phoneRef.current?.focus();
      return;
    }

    if (
      !isValidJalaliDate(startDate)
    ) {
      alert(
        'تاریخ قرارداد نامعتبر است. لطفاً از تقویم استفاده کنید.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload: Partial<Representative> =
        {
          name,
          email,
          code,
          province,
          city,
          phone,
          address:
            formData.address.trim(),
          description:
            formData.description.trim(),
          shopDescription:
            formData.shopDescription.trim(),
          orders:
            Number(formData.orders) || 0,
          status:
            formData.status ===
            'inactive'
              ? 'inactive'
              : 'active',
          startDate,
          depositAmount: String(
            depositAmount,
          ),
          guaranteeCheck: String(
            guaranteeCheck,
          ),
          totalFinancialCommitment:
            String(
              totalFinancialCommitment,
            ),
          shipmentsCount:
            Number(
              formData.shipmentsCount,
            ) || 0,
          storeItemsCount:
            Number(
              formData.storeItemsCount,
            ) || 0,
          storeItemsTotalValue:
            Number(
              formData.storeItemsTotalValue,
            ) || 0,
          returnRequestsCount:
            Number(
              formData.returnRequestsCount,
            ) || 0,
          last10DaysSales:
            Number(
              formData.last10DaysSales,
            ) || 0,
          averageSales:
            Number(
              formData.averageSales,
            ) || 0,
        };

      if (editingId) {
        await onEditRepresentative(
          editingId,
          payload,
        );

        alert(
          'اطلاعات نماینده با موفقیت ویرایش شد.',
        );
      } else {
        await onAddRepresentative(
          payload,
        );

        alert(
          'نماینده با موفقیت ثبت شد.',
        );
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        ...initialFormData,
        startDate: getTodayJalali(),
      });
    } catch (error) {
      console.error(
        'خطا در ذخیره نماینده:',
        error,
      );

      alert(
        'خطا در ذخیره اطلاعات. لطفاً دوباره تلاش کنید.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (
    id: string,
    name: string,
  ) => {
    if (
      !window.confirm(
        `آیا از حذف نماینده «${name}» مطمئن هستید؟`,
      )
    ) {
      return;
    }

    try {
      await onDeleteRepresentative(id);
    } catch (error) {
      console.error(
        'خطا در حذف نماینده:',
        error,
      );
    }
  };

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg transition-colors dark:border-gray-800 dark:bg-gray-900 md:p-6"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-gray-800 dark:text-gray-100 md:text-xl">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            لیست نمایندگان
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {toPersianNumber(
              representatives.length,
            )}{' '}
            نماینده ثبت شده
          </p>
        </div>

        {userRole === 'admin' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrintRepresentatives}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Printer className="h-4 w-4" />
              چاپ لیست
            </button>
            <button
              type="button"
              onClick={() => openModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-blue-500/50 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              افزودن نماینده
            </button>
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50 text-center text-lg dark:border-gray-800 dark:bg-gray-800/50">
              <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                کد
              </th>
              <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                نام
              </th>
              <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                شهر
              </th>
              <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                تلفن
              </th>
              <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                سفارش‌ها
              </th>
              <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                وضعیت
              </th>

              {userRole === 'admin' ? (
                <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                  عملیات
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {representatives.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    userRole === 'admin'
                      ? 7
                      : 6
                  }
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="mb-2 flex justify-center">
                    <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                  </div>

                  <p className="font-bold">
                    هیچ نماینده‌ای یافت نشد
                  </p>
                </td>
              </tr>
            ) : (
              representatives.map(
                (representative) => {
                  const isActive =
                    representative.status !==
                    'inactive';

                  return (
                    <tr
                      key={String(
                        representative.id,
                      )}
                      className="border-b text-center transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                        {representative.code ||
                          '---'}
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200">
                        {representative.name}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {representative.city ||
                          '---'}
                      </td>

                      <td
                        dir="ltr"
                        className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300"
                      >
                        {representative.phone ||
                          '---'}
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                        {toPersianNumber(
                          representative.orders ||
                            0,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                            isActive
                              ? 'border-green-300 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}

                          {isActive
                            ? 'فعال'
                            : 'غیرفعال'}
                        </span>
                      </td>

                      {userRole === 'admin' ? (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenDashboard(
                                  String(
                                    representative.id,
                                  ),
                                )
                              }
                              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                            >
                              داشبورد
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openModal(
                                  representative,
                                )
                              }
                              className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              ویرایش
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void handleDelete(
                                  String(
                                    representative.id,
                                  ),
                                  representative.name,
                                );
                              }}
                              className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 transition-all hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                },
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {representatives.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-2 flex justify-center">
              <Inbox className="h-14 w-14 text-gray-300 dark:text-gray-600" />
            </div>

            <p className="font-bold text-gray-500 dark:text-gray-400">
              هیچ نماینده‌ای یافت نشد
            </p>
          </div>
        ) : (
          representatives.map(
            (representative) => {
              const isActive =
                representative.status !==
                'inactive';

              return (
                <div
                  key={String(
                    representative.id,
                  )}
                  className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 transition-all hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:from-gray-800 dark:to-gray-900 dark:hover:border-blue-700"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100">
                        {representative.name}
                      </p>

                      <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                        کد:{' '}
                        {representative.code ||
                          '---'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                        isActive
                          ? 'border-green-300 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}

                      {isActive
                        ? 'فعال'
                        : 'غیرفعال'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        شهر
                      </p>

                      <p className="font-bold text-gray-800 dark:text-gray-200">
                        {representative.city ||
                          '---'}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        تلفن
                      </p>

                      <p
                        dir="ltr"
                        className="font-bold text-gray-800 dark:text-gray-200"
                      >
                        {representative.phone ||
                          '---'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        سفارش‌ها
                      </p>

                      <p className="font-black text-gray-800 dark:text-gray-200">
                        {toPersianNumber(
                          representative.orders ||
                            0,
                        )}
                      </p>
                    </div>
                  </div>

                  {userRole === 'admin' ? (
                    <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDashboard(
                            String(
                              representative.id,
                            ),
                          )
                        }
                        className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all hover:shadow-lg"
                      >
                        داشبورد
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openModal(
                            representative,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 transition-all hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void handleDelete(
                            String(
                              representative.id,
                            ),
                            representative.name,
                          );
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-all hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            },
          )
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-3 md:p-4">
          <div className="max-h-[92dvh] w-full min-w-0 max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-900 sm:p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-gray-800 dark:text-gray-100">
                  {editingId
                    ? 'ویرایش اطلاعات نماینده'
                    : 'افزودن نماینده جدید'}
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {editingId
                    ? 'اطلاعات نماینده را اصلاح کرده و ذخیره کنید.'
                    : 'اطلاعات اولیه و مالی نماینده را وارد کنید.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              className="space-y-5"
            >
              <section>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-400">
                  <User className="h-4 w-4" />
                  اطلاعات پایه نماینده
                </h4>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      نام نماینده
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      ref={nameRef}
                      type="text"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            name: event.target.value,
                          }),
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          codeRef,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="نام نماینده"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <Hash className="h-3.5 w-3.5 text-gray-400" />
                      کد نمایندگی
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      ref={codeRef}
                      type="text"
                      value={formData.code}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            code: event.target.value,
                          }),
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          cityRef,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="مثلاً 1001"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      استان
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      value={formData.province}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            province:
                              event.target.value,
                          }),
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="استان"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      شهر
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      ref={cityRef}
                      type="text"
                      value={formData.city}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            city: event.target.value,
                          }),
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          phoneRef,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="شهر"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      تلفن
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      ref={phoneRef}
                      type="text"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            phone: event.target.value,
                          }),
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          statusRef,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="09xxxxxxxxx"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <JalaliDatePicker
                      label="تاریخ قرارداد شمسی"
                      value={
                        formData.startDate
                      }
                      disabled={isSaving}
                      onChange={(
                        selectedDate,
                      ) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            startDate:
                              selectedDate,
                          }),
                        )
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <Activity className="h-3.5 w-3.5 text-gray-400" />
                      وضعیت
                    </label>

                    <select
                      ref={statusRef}
                      value={formData.status}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            status:
                              event.target
                                .value ===
                              'inactive'
                                ? 'inactive'
                                : 'active',
                          }),
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          depositRef,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="active">
                        فعال
                      </option>
                      <option value="inactive">
                        غیرفعال
                      </option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-100 pt-4 dark:border-gray-800">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-400">
                  <MapPin className="h-4 w-4" />
                  آدرس و توضیحات
                </h4>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="min-w-0 md:col-span-2">
                    <label
                      htmlFor="representative-address"
                      className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300"
                    >
                      آدرس دقیق
                    </label>

                    <textarea
                      id="representative-address"
                      rows={3}
                      maxLength={1000}
                      value={formData.address}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            address:
                              event.target
                                .value,
                          }),
                        )
                      }
                      disabled={isSaving}
                      placeholder="استان، شهر، خیابان، پلاک و کد پستی"
                      className="w-full min-w-0 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm leading-7 text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="representative-description"
                      className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300"
                    >
                      توضیحات
                    </label>

                    <textarea
                      id="representative-description"
                      rows={4}
                      maxLength={3000}
                      value={formData.description}
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            description:
                              event.target
                                .value,
                          }),
                        )
                      }
                      disabled={isSaving}
                      placeholder="توضیحات مربوط به نماینده"
                      className="w-full min-w-0 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm leading-7 text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="representative-shop-description"
                      className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300"
                    >
                      متراژ مغازه
                    </label>

                    <textarea
                      id="representative-shop-description"
                      rows={2}
                      maxLength={3000}
                      value={
                        formData.shopDescription
                      }
                      onChange={(event) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            shopDescription:
                              event.target
                                .value,
                          }),
                        )
                      }
                      disabled={isSaving}
                      placeholder="مشخصات، موقعیت یا شرایط مغازه"
                      className="w-full min-w-0 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm leading-7 text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-100 pt-4 dark:border-gray-800">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-purple-700 dark:text-purple-400">
                  <Banknote className="h-4 w-4" />
                  اطلاعات مالی
                </h4>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      مبلغ ودیعه
                    </label>

                    <input
                      ref={depositRef}
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={formatMoneyInput(
                        formData.depositAmount,
                      )}
                      onChange={(event) =>
                        setMoneyField(
                          'depositAmount',
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          guaranteeRef,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-sm font-bold text-gray-800 outline-none focus:border-purple-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      مبلغ چک ضمانت
                    </label>

                    <input
                      ref={guaranteeRef}
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={formatMoneyInput(
                        formData.guaranteeCheck,
                      )}
                      onChange={(event) =>
                        setMoneyField(
                          'guaranteeCheck',
                          event.target.value,
                        )
                      }
                      disabled={isSaving}
                      className="w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-sm font-bold text-gray-800 outline-none focus:border-purple-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                      مجموع تعهد مالی
                    </label>

                    <div
                      dir="ltr"
                      className="w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-center text-sm font-black text-purple-700 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-300"
                    >
                      {toPersianNumber(
                        totalFinancialCommitment,
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  اطلاعات آماری داشبورد از طریق فایل اکسل در بخش انبار نماینده وارد خواهد شد.
                </p>
              </section>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="min-h-11 rounded-xl bg-gray-200 px-4 py-2 text-sm font-bold text-gray-800 transition-all hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-11 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? 'در حال ذخیره...'
                    : editingId
                      ? 'ذخیره تغییرات'
                      : 'ثبت نماینده'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Representatives;