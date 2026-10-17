import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  componentStack: string;
}

class DashboardErrorBoundary extends React.Component<
  Props,
  State
> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    errorStack: '',
    componentStack: '',
  };

  public static getDerivedStateFromError(
    error: Error,
  ): Partial<State> {
    return {
      hasError: true,
      errorMessage:
        error?.message || 'خطای نامشخص در React',
      errorStack: error?.stack || '',
    };
  }

  public componentDidCatch(
    error: Error,
    errorInfo: React.ErrorInfo,
  ) {
    console.error(
      '❌ DashboardErrorBoundary caught an error:',
      error,
    );

    console.error(
      '❌ React component stack:',
      errorInfo.componentStack,
    );

    this.setState({
      componentStack:
        errorInfo.componentStack || '',
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      errorStack: '',
      componentStack: '',
    });
  };

  public render() {
    const {
      children,
      title = 'داشبورد نماینده',
      onBack,
    } = this.props;

    const {
      hasError,
      errorMessage,
      errorStack,
      componentStack,
    } = this.state;

    if (!hasError) {
      return children;
    }

    return (
      <section
        dir="rtl"
        className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-right shadow-lg dark:border-red-900/70 dark:bg-red-950/30 md:p-7"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-900/50 dark:text-red-300">
            <XCircle className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-red-800 dark:text-red-300 md:text-xl">
              خطا در نمایش {title}
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-red-700 dark:text-red-400">
              برنامه به‌جای خروج بی‌صدا از این بخش،
              خطای واقعی را نمایش می‌دهد.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm font-black text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            متن خطا
          </div>

          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 text-xs leading-6 text-red-800 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </pre>
        </div>

        {errorStack ? (
          <details className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-black text-red-700 dark:text-red-400">
              جزئیات فنی خطا
            </summary>

            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs leading-6 text-gray-100">
              {errorStack}
            </pre>
          </details>
        ) : null}

        {componentStack ? (
          <details className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-black text-red-700 dark:text-red-400">
              مسیر کامپوننت خطادار
            </summary>

            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs leading-6 text-gray-100">
              {componentStack}
            </pre>
          </details>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش دوباره
          </button>

          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 rounded-xl bg-gray-800 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-700"
            >
              بازگشت به لیست نمایندگان
            </button>
          ) : null}
        </div>
      </section>
    );
  }
}

export default DashboardErrorBoundary;