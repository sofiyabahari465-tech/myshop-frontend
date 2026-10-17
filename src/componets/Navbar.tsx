import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Crown,
  LogOut,
  Menu,
  User,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface Props {
  onToggleSidebar: () => void;
  userRole: 'admin' | 'representative';
  onRoleChange: (
    role: 'admin' | 'representative',
  ) => void;
  userName: string;
}

const Navbar: React.FC<Props> = ({
  onToggleSidebar,
  userRole,
  onRoleChange: _onRoleChange,
  userName,
}) => {
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin';

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('representativeId');
    sessionStorage.removeItem('activeSection');

    localStorage.removeItem('token');
    localStorage.removeItem('authUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('representativeId');
    localStorage.removeItem('activeSection');

    navigate('/login', {
      replace: true,
    });
  };

  const safeUserName = userName?.trim() || 'کاربر';

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-xl transition-colors dark:border-gray-700 dark:bg-gray-900/80">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6 md:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-purple-500 dark:hover:bg-purple-500/10 dark:hover:text-purple-400"
            title="اعلان‌ها"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
              3
            </span>
          </button>

          <div
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-xs font-black text-white shadow-sm shadow-cyan-500/20 sm:px-4 sm:text-sm"
            title={
              isAdmin
                ? 'دسترسی کامل ادمین'
                : 'دسترسی پنل نمایندگی'
            }
          >
            {isAdmin ? (
              <Crown className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}

            <span>{isAdmin ? 'ادمین' : 'نماینده'}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-2 sm:px-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-bold text-white shadow-sm">
              {safeUserName.charAt(0)}
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                {safeUserName}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAdmin ? 'مدیر سیستم' : 'نماینده'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          <ThemeToggle />

          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-cyan-500 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-400 md:h-11 md:w-11"
            title="باز و بسته‌کردن منو"
          >
            <Menu className="h-5 w-5 md:h-6 md:w-6" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 sm:px-4 sm:text-sm"
            title="خروج از حساب"
          >
            <LogOut className="h-4 w-4" />

            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;