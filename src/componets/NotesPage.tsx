import React, { useEffect, useState } from 'react';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';


interface Note {
  id: string;
  userId?: string;
  userRole?: 'admin' | 'representative';
  title?: string;
  content?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}


interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
  message?: string;
}


/*
 * VITE_API_URL ممکن است یکی از این دو مقدار باشد:
 * https://myshop-backend-8nu7.onrender.com
 * https://myshop-backend-8nu7.onrender.com/api
 *
 * در هر دو حالت، API_BASE_URL بدون /api خواهد بود
 * و endpoint نهایی درست ساخته می‌شود:
 * https://myshop-backend-8nu7.onrender.com/api/notes
 */
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


const API_BASE_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL.slice(0, -4)
  : RAW_API_URL;


const getToken = () => {
  return (
    localStorage.getItem('token') || sessionStorage.getItem('token') ||
    localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  );
};


const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNote, setEditingNote] =
    useState<Note | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });


  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/notes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const result: ApiResponse<Note[]> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'خطا در دریافت یادداشت‌ها',
        );
      }

      if (!Array.isArray(result.data)) {
        throw new Error(
          'فرمت داده‌های یادداشت‌ها نامعتبر است.',
        );
      }

      setNotes(result.data);
    } catch (requestError) {
      console.error(
        'خطا در دریافت یادداشت‌ها:',
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : 'خطا در ارتباط با سرور',
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    void fetchNotes();
  }, []);


  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setShowModal(false);
    setEditingNote(null);

    setFormData({
      title: '',
      content: '',
    });
  };


  const handleAddNote = () => {
    setEditingNote(null);

    setFormData({
      title: '',
      content: '',
    });

    setShowModal(true);
  };


  const handleEditNote = (note: Note) => {
    setEditingNote(note);

    setFormData({
      title: note.title || '',
      content: note.content || '',
    });

    setShowModal(true);
  };


  const handleDeleteNote = async (
    noteId: string,
  ) => {
    const shouldDelete = window.confirm(
      'آیا از حذف این یادداشت مطمئن هستید؟',
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/notes/${noteId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const result: ApiResponse<null> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'خطا در حذف یادداشت',
        );
      }

      setNotes((previousNotes) => {
        return previousNotes.filter((note) => {
          return note.id !== noteId;
        });
      });
    } catch (requestError) {
      console.error(
        'خطا در حذف یادداشت:',
        requestError,
      );

      alert(
        requestError instanceof Error
          ? requestError.message
          : 'خطا در ارتباط با سرور',
      );
    }
  };


  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const title = formData.title.trim();
    const content = formData.content.trim();

    if (!title || !content) {
      alert('عنوان و متن یادداشت الزامی است.');
      return;
    }

    try {
      setIsSaving(true);

      const token = getToken();
      const isEditing = Boolean(editingNote?.id);

      const url = isEditing
        ? `${API_BASE_URL}/api/notes/${editingNote?.id}`
        : `${API_BASE_URL}/api/notes`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          color: 'blue',
        }),
      });

      const result: ApiResponse<Note> =
        await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error || 'خطا در ذخیره یادداشت',
        );
      }

      const savedNote: Note = result.data;

      if (isEditing) {
        setNotes((previousNotes) => {
          return previousNotes.map((note) => {
            return note.id === savedNote.id
              ? savedNote
              : note;
          });
        });
      } else {
        setNotes((previousNotes) => {
          return [savedNote, ...previousNotes];
        });
      }

      closeModal();
    } catch (requestError) {
      console.error(
        'خطا در ذخیره یادداشت:',
        requestError,
      );

      alert(
        requestError instanceof Error
          ? requestError.message
          : 'خطا در ارتباط با سرور',
      );
    } finally {
      setIsSaving(false);
    }
  };


  const filteredNotes = notes.filter((note) => {
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    return (
      title.includes(query) ||
      content.includes(query)
    );
  });


  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'تاریخ نامشخص';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'تاریخ نامشخص';
    }

    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <div
      dir="rtl"
      className="min-h-[calc(100vh-120px)] rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/50 to-cyan-50/60 p-3 md:p-6"
    >
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-500 px-5 py-6 text-white md:px-7">
            <div className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-blue-100">
                  <StickyNote className="h-5 w-5" />
                  <span className="text-sm font-bold">
                    فضای شخصی شما
                  </span>
                </div>

                <h2 className="text-2xl font-black md:text-3xl">
                  یادداشت‌های من
                </h2>

                <p className="mt-2 text-sm font-medium leading-7 text-blue-50">
                  یادداشت‌های شخصی خود را ثبت، جست‌وجو، ویرایش و مدیریت کنید.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNote}
                className="relative flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3 font-black text-white shadow-lg backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-xl active:translate-y-0"
              >
                <Plus className="h-5 w-5" />
                یادداشت جدید
              </button>
            </div>
          </div>


          <div className="p-4 md:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400" />

              <input
                type="text"
                placeholder="جست‌وجو در عنوان یا متن یادداشت‌ها..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>


        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-bold text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                void fetchNotes();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              تلاش مجدد
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white py-20 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
              <StickyNote className="h-8 w-8" />
            </div>

            <p className="text-lg font-black text-slate-700">
              {searchQuery
                ? 'یادداشتی پیدا نشد'
                : 'هنوز یادداشتی ندارید'}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {searchQuery
                ? 'عبارت جست‌وجو را تغییر دهید.'
                : 'با دکمهٔ «یادداشت جدید» اولین یادداشت خود را بسازید.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map((note) => (
              <article
                key={note.id}
                className="group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div className="h-1.5 bg-gradient-to-l from-blue-700 via-blue-500 to-cyan-400" />

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                        <StickyNote className="h-5 w-5" />
                      </div>

                      <h3 className="line-clamp-2 min-w-0 pt-1 text-lg font-black text-slate-800">
                        {note.title || 'بدون عنوان'}
                      </h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleEditNote(note);
                        }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="ویرایش یادداشت"
                        aria-label="ویرایش یادداشت"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteNote(note.id);
                        }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="حذف یادداشت"
                        aria-label="حذف یادداشت"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>


                  <p className="mb-5 flex-1 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                    {note.content || 'بدون متن'}
                  </p>


                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="min-w-0 truncate text-xs font-medium text-slate-400">
                      آخرین ویرایش: {formatDate(
                        note.updatedAt || note.createdAt,
                      )}
                    </span>

                    <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                      یادداشت شخصی
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>


      {showModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
            role="dialog"
            aria-modal="true"
            aria-label={
              editingNote
                ? 'ویرایش یادداشت'
                : 'یادداشت جدید'
            }
          >
            <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-500 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <StickyNote className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black">
                      {editingNote
                        ? 'ویرایش یادداشت'
                        : 'یادداشت جدید'}
                    </h2>

                    <p className="mt-1 text-xs font-medium text-blue-100">
                      عنوان و متن یادداشت شخصی خود را وارد کنید.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="بستن پنجره"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>


            <form
              onSubmit={handleSubmit}
              className="p-5"
            >
              <div className="mb-4">
                <label
                  htmlFor="note-title"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  عنوان یادداشت
                </label>

                <input
                  id="note-title"
                  type="text"
                  value={formData.title}
                  onChange={(event) => {
                    setFormData((previousData) => ({
                      ...previousData,
                      title: event.target.value,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="مثال: پیگیری سفارش هفتهٔ آینده"
                  maxLength={120}
                  required
                  disabled={isSaving}
                />
              </div>


              <div className="mb-6">
                <label
                  htmlFor="note-content"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  متن یادداشت
                </label>

                <textarea
                  id="note-content"
                  value={formData.content}
                  onChange={(event) => {
                    setFormData((previousData) => ({
                      ...previousData,
                      content: event.target.value,
                    }));
                  }}
                  rows={7}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="متن یادداشت خود را اینجا بنویسید..."
                  maxLength={3000}
                  required
                  disabled={isSaving}
                />
              </div>


              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-700 to-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-800 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />

                  {isSaving
                    ? 'در حال ذخیره...'
                    : editingNote
                      ? 'ذخیرهٔ تغییرات'
                      : 'ثبت یادداشت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};


export default NotesPage;