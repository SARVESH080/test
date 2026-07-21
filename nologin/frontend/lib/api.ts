const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  category: string | null;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  sourceType: string;
  wordCount: number | null;
  estimatedMinutes: number | null;
  isFavorite: boolean;
  createdAt: string;
  progress?: { percent: number }[];
}

export interface Chapter {
  id: string;
  order: number;
  title: string | null;
  contentHtml: string;
}

export interface BookDetail extends Book {
  chapters: Chapter[];
}

function getTokens() {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  };
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  async register(email: string, password: string, displayName: string) {
    const data = await request<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, displayName }) },
    );
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  async login(email: string, password: string) {
    const data = await request<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  me() {
    return request<User>('/auth/me');
  },

  listBooks() {
    return request<Book[]>('/books');
  },

  getBook(id: string) {
    return request<BookDetail>(`/books/${id}`);
  },

  createFromUrl(url: string) {
    return request<Book>('/books/from-url', { method: 'POST', body: JSON.stringify({ url }) });
  },

  uploadFile(file: File) {
    const form = new FormData();
    form.append('file', file);
    return request<Book>('/books/upload', { method: 'POST', body: form });
  },

  deleteBook(id: string) {
    return request<void>(`/books/${id}`, { method: 'DELETE' });
  },

  toggleFavorite(id: string) {
    return request<Book>(`/books/${id}/favorite`, { method: 'PATCH' });
  },

  updateProgress(id: string, percent: number, secondsSpent?: number, chapterId?: string) {
    return request(`/books/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ percent, secondsSpent, chapterId }),
    });
  },
};
