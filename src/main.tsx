import './utils/axiosInterceptor';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import Loading from './componets/Loading';
import InstallPrompt from './componets/InstallPrompt';
import './index.css';

// Lazy loading برای کاهش حجم اولیه و افزایش سرعت بارگذاری
const App = lazy(() => import('./App'));
const Login = lazy(() => import('./componets/Login'));

// کامپوننت برای حذف لودر اولیه و register کردن service worker
const InitialLoaderManager: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    // حذف لودر اولیه بعد از بارگذاری React
    const initialLoader = document.getElementById(
      'initial-loader',
    );

    if (initialLoader) {
      initialLoader.classList.add('fade-out');

      const timer = setTimeout(() => {
        if (initialLoader.parentNode) {
          initialLoader.parentNode.removeChild(initialLoader);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // ثبت Service Worker برای PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration.scope);
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      });
    }
  }, []);

  return <>{children}</>;
};

// Suspense fallback - هنگام بارگذاری صفحات
const SuspenseFallback = () => (
  <Loading
    message="در حال بارگذاری پنل"
    subMessage="لطفاً چند ثانیه صبر کنید"
    size="lg"
    variant="default"
  />
);

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
).render(
  <React.StrictMode>
    <InitialLoaderManager>
      <BrowserRouter>
        {/* بنر نصب PWA */}
        <InstallPrompt />

        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<App />} />
            <Route path="/user-dashboard" element={<App />} />
            <Route
              path="*"
              element={<Navigate to="/login" replace />}
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </InitialLoaderManager>
  </React.StrictMode>,
);
