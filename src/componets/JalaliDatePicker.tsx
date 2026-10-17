import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const toEnglishDigits = (value: unknown): string => {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
};

const toPersianDigits = (value: number | string): string => {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
};

const normalizeJalaliDate = (value: unknown): string => {
  const normalized = toEnglishDigits(value)
    .replace(/-/g, '/')
    .replace(/[^\d/]/g, '');

  const digits = normalized.replace(/\//g, '').slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
};

const getDateParts = (value: string): [number, number, number] | null => {
  const match = normalizeJalaliDate(value).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > getDaysInJalaliMonth(year, month)) {
    return null;
  }

  return [year, month, day];
};

const getDaysInJalaliMonth = (year: number, month: number): number => {
  if (month <= 6) {
    return 31;
  }

  if (month <= 11) {
    return 30;
  }

  return year % 4 === 3 ? 30 : 29;
};

const getTodayJalali = (): [number, number, number] => {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type: 'year' | 'month' | 'day'): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return [getPart('year'), getPart('month'), getPart('day')];
};

const getWeekdayOffset = (year: number, month: number): number => {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const weekdayOrder = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const start = new Date(Date.UTC(2020, 0, 1));
  const end = new Date(Date.UTC(2030, 11, 31));

  for (
    let date = new Date(start);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const parts = formatter.formatToParts(date);
    const foundYear = Number(parts.find((part) => part.type === 'year')?.value);
    const foundMonth = Number(parts.find((part) => part.type === 'month')?.value);
    const foundDay = Number(parts.find((part) => part.type === 'day')?.value);

    if (foundYear === year && foundMonth === month && foundDay === 1) {
      const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sat';
      return Math.max(0, weekdayOrder.indexOf(weekday));
    }
  }

  return 0;
};

const JALALI_MONTHS = [
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

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const JalaliDatePicker = ({
  value,
  onChange,
  disabled = false,
  label = 'تاریخ قرارداد شمسی',
}: JalaliDatePickerProps) => {
  const initialDate = getDateParts(value) ?? getTodayJalali();
  const [selectedDate, setSelectedDate] = useState(normalizeJalaliDate(value));
  const [viewYear, setViewYear] = useState(initialDate[0]);
  const [viewMonth, setViewMonth] = useState(initialDate[1]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const normalizedValue = normalizeJalaliDate(value);
    const parts = getDateParts(normalizedValue);

    setSelectedDate(normalizedValue);

    if (parts) {
      setViewYear(parts[0]);
      setViewMonth(parts[1]);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const changeMonth = (direction: -1 | 1): void => {
    setViewMonth((currentMonth) => {
      const nextMonth = currentMonth + direction;

      if (nextMonth < 1) {
        setViewYear((currentYear) => currentYear - 1);
        return 12;
      }

      if (nextMonth > 12) {
        setViewYear((currentYear) => currentYear + 1);
        return 1;
      }

      return nextMonth;
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextValue = normalizeJalaliDate(event.target.value);
    setSelectedDate(nextValue);
    onChange(nextValue);
  };

  const handleSelectDay = (day: number): void => {
    const nextValue = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

    setSelectedDate(nextValue);
    onChange(nextValue);
    setIsOpen(false);
  };

  const selectedParts = getDateParts(selectedDate);
  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
  const firstDayOffset = getWeekdayOffset(viewYear, viewMonth);

  const calendarCells = [
    ...Array.from({ length: firstDayOffset }, (_, index) => `empty-${index}`),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div ref={wrapperRef} className="relative w-full" dir="rtl">
      <label className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-700">
        <Calendar className="h-4 w-4 text-blue-500" />
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={selectedDate}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          dir="ltr"
          inputMode="numeric"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-10 text-right text-sm font-bold text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          placeholder="1405/07/02"
        />

        <button
          type="button"
          onClick={() => !disabled && setIsOpen((current) => !current)}
          disabled={disabled}
          aria-label="باز کردن تقویم"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-blue-500 disabled:text-gray-400"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full min-w-[280px] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="ماه بعد"
              className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="text-sm font-bold text-gray-800">
              {JALALI_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}
            </span>

            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="ماه قبل"
              className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-xs font-bold text-gray-400">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1">
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              if (typeof cell !== 'number') {
                return <span key={cell} />;
              }

              const isSelected =
                selectedParts?.[0] === viewYear &&
                selectedParts?.[1] === viewMonth &&
                selectedParts?.[2] === cell;

              return (
                <button
                  key={cell}
                  type="button"
                  onClick={() => handleSelectDay(cell)}
                  className={`h-9 rounded-lg text-sm font-bold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {toPersianDigits(cell)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-400">
        <Info className="h-3 w-3" />
        تاریخ را به‌صورت دستی وارد کنید یا از تقویم شمسی انتخاب کنید.
      </p>
    </div>
  );
};

export default JalaliDatePicker;