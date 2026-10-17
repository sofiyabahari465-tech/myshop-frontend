import React from 'react';
import {
  Banknote,
  Boxes,
  ClipboardCheck,
  Headset,
  LayoutDashboard,
  RotateCcw,
  Store,
  Truck,
  UploadCloud,
  User,
  Users,
  X,
  StickyNote,
  ShieldCheck,
} from 'lucide-react';
import type { Section } from '../types';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  userRole: 'admin' | 'representative' | 'user';
}


type MenuAccent =
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'sky';


type MenuItem = {
  id: Section;
  label: string;
  icon: typeof LayoutDashboard;
  accent?: MenuAccent;
};


const Sidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  activeSection,
  onSectionChange,
  userRole,
}) => {
  const isRepresentative =
    userRole === 'representative' || userRole === 'user';


  const adminMenu: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'داشبورد',
      icon: LayoutDashboard,
    },
    {
      id: 'products',
      label: 'لیست قیمت‌ها',
      icon: Banknote,
    },
    {
      id: 'representatives',
      label: 'لیست نمایندگان',
      icon: Users,
    },
    {
      id: 'warehouse',
      label: 'انبارداری',
      icon: Store,
    },
    {
      id: 'upload',
      label: 'آپلود اکسل',
      icon: UploadCloud,
    },
    {
      id: 'shipments',
      label: 'ارسال بار',
      icon: Truck,
    },
    {
      id: 'sales-reports',
      label: 'اعلام فروش نمایندگان',
      icon: Banknote,
      accent: 'emerald',
    },
    {
      id: 'return-requests',
      label: 'بررسی درخواست‌های مرجوعی',
      icon: ClipboardCheck,
      accent: 'rose',
    },
    {
      id: 'support-requests',
      label: 'رسیدگی به درخواست‌ها',
      icon: Headset,
    },
    {
      id: 'warranties',
      label: 'گارانتی',
      icon: ShieldCheck,
      accent: 'sky',
    },
    {
      id: 'notes',
      label: 'یادداشت‌ها',
      icon: StickyNote,
      accent: 'amber',
    },
    // {
    //   id: 'settings',
    //   label: 'تنظیمات',
    //   icon: Settings,
    // },
  ];


  const representativeMenu: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'داشبورد',
      icon: LayoutDashboard,
    },
    {
      id: 'products',
      label: 'لیست قیمت‌ها',
      icon: Banknote,
    },
    // {
      // id: 'orders',
      // label: 'سفارش‌های من',
      // icon: ShoppingCart,
    // },
    {
      id: 'my-shipments',
      label: 'بارهای من',
      icon: Truck,
    },
    {
      id: 'warehouse',
      label: 'انبار من',
      icon: Boxes,
    },
    {
      id: 'sales-reports',
      label: 'اعلام فروش',
      icon: Banknote,
      accent: 'emerald',
    },
    {
      id: 'return-request',
      label: 'ثبت درخواست مرجوعی',
      icon: RotateCcw,
      accent: 'rose',
    },
    {
      id: 'support',
      label: 'پشتیبانی',
      icon: Headset,
    },
    {
      id: 'warranties',
      label: 'گارانتی',
      icon: ShieldCheck,
      accent: 'sky',
    },
    {
      id: 'notes',
      label: 'یادداشت‌ها',
      icon: StickyNote,
      accent: 'amber',
    },
    {
      id: 'profile',
      label: 'پروفایل',
      icon: User,
    },
  ];


  const menuItems = isRepresentative
    ? representativeMenu
    : adminMenu;


  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}


      <aside
        dir="rtl"
        className={`fixed top-0 right-0 z-50 flex h-screen w-72 flex-col border-l border-gray-700 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl transition-all duration-500 ease-in-out lg:top-[73px] lg:h-[calc(100vh-73px)] ${
          isOpen
            ? 'translate-x-0'
            : 'translate-x-full overflow-hidden lg:w-0 lg:translate-x-0'
        }`}
      >
        <div className="shrink-0 border-b border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                منوی اصلی
              </p>


              <p className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-cyan-400">
                {isRepresentative ? (
                  <>
                    <User className="h-3.5 w-3.5" />
                    پنل نمایندگی
                  </>
                ) : (
                  <>
                    <Users className="h-3.5 w-3.5" />
                    دسترسی کامل
                  </>
                )}
              </p>
            </div>


            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition-all hover:border-red-500 hover:bg-red-500/20 hover:text-red-400 lg:hidden"
              aria-label="بستن منو"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>


        <nav className="flex-1 space-y-1  p-1">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;

            const isReturnMenu = item.accent === 'rose';
            const isSalesMenu = item.accent === 'emerald';
            const isNotesMenu = item.accent === 'amber';
            const isWarrantyMenu = item.accent === 'sky';


            const activeClass = isReturnMenu
              ? 'border-rose-500/50 bg-gradient-to-r from-rose-500/25 to-red-500/20 text-white shadow-md shadow-rose-500/20'
              : isSalesMenu
                ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-white shadow-md shadow-emerald-500/20'
                : isNotesMenu
                  ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-white shadow-md shadow-amber-500/20'
                  : isWarrantyMenu
                    ? 'border-sky-500/50 bg-gradient-to-r from-sky-500/25 to-blue-500/20 text-white shadow-md shadow-sky-500/20'
                    : 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-md shadow-cyan-500/20';


            const normalClass = isReturnMenu
              ? 'border-rose-500/10 bg-rose-500/5 text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-100'
              : isSalesMenu
                ? 'border-emerald-500/10 bg-emerald-500/5 text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/15 hover:text-emerald-100'
                : isNotesMenu
                  ? 'border-amber-500/10 bg-amber-500/5 text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/15 hover:text-amber-100'
                  : isWarrantyMenu
                    ? 'border-sky-500/10 bg-sky-500/5 text-sky-300 hover:border-sky-500/30 hover:bg-sky-500/15 hover:text-sky-100'
                    : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-white';


            const activeIconClass = isReturnMenu
              ? 'text-rose-300'
              : isSalesMenu
                ? 'text-emerald-300'
                : isNotesMenu
                  ? 'text-amber-400'
                  : isWarrantyMenu
                    ? 'text-sky-300'
                    : 'text-cyan-400';


            const normalIconClass = isReturnMenu
              ? 'text-rose-400'
              : isSalesMenu
                ? 'text-emerald-400'
                : isNotesMenu
                  ? 'text-amber-400'
                  : isWarrantyMenu
                    ? 'text-sky-400'
                    : '';


            const activeDotClass = isReturnMenu
              ? 'bg-rose-400'
              : isSalesMenu
                ? 'bg-emerald-400'
                : isNotesMenu
                  ? 'bg-amber-400'
                  : isWarrantyMenu
                    ? 'bg-sky-400'
                    : 'bg-cyan-400';


            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSectionChange(item.id);

                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                style={{
                  animationDelay: `${index * 40}ms`,
                }}
                className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-right  transition-all duration-600 animate-slide-in-right ${
                  isActive ? activeClass : normalClass
                }`}
              >
                <span className="shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <IconComponent
                    className={`h-5 w-5 ${
                      isActive
                        ? activeIconClass
                        : normalIconClass
                    }`}
                  />
                </span>


                <span className="min-w-0 flex-1 text-[12px] font-bold leading-5">
                  {item.label}
                </span>


                {isActive ? (
                  <span
                    className={`mr-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${activeDotClass}`}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};


export default Sidebar;