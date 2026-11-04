import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SessionRole = 'owner' | 'staff';

export interface AuthUser {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  role: SessionRole;
  business: {
    id: number;
    name: string;
  };
}

const SESSION_KEY = 'norrisbeauty.auth.session';
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
let webSession: AuthSession | null = null;

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function readJsonBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function storeSession(session: AuthSession): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = session;
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function saveSession(session: AuthSession): Promise<void> {
  await storeSession(session);
}

export async function loadSession(): Promise<AuthSession | null> {
  if (Platform.OS === 'web') {
    return webSession;
  }
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.accessToken && parsed?.refreshToken && parsed?.user) {
      return parsed;
    }
  } catch {
    // Ignore malformed persisted session and clear it.
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
  return null;
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = null;
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
  const session = await loadSession();
  const headers = new Headers(init.headers ?? {});
  headers.set('Accept', 'application/json');

  if (!(init.body instanceof FormData) && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (requireAuth && session) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && requireAuth && session && !path.includes('/auth/refresh/')) {
    const refreshed = await refreshSession(session.refreshToken);
    headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    if (!retryResponse.ok) {
      const body = await readJsonBody(retryResponse);
      throw new ApiRequestError(body?.error?.message || body?.detail || 'The request was rejected.', retryResponse.status);
    }

    if (retryResponse.status === 204) {
      return null as T;
    }
    return (await readJsonBody(retryResponse)) as T;
  }

  if (!response.ok) {
    const body = await readJsonBody(response);
    throw new ApiRequestError(body?.error?.message || body?.detail || `Request failed with ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await readJsonBody(response)) as T;
}

export async function loginWithCredentials(username: string, password: string): Promise<AuthSession> {
  const payload = await apiRequest<{ access: string; refresh: string; user: any }>(
    '/auth/login/',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
    false,
  );

  const session: AuthSession = {
    accessToken: payload.access,
    refreshToken: payload.refresh,
    user: {
      id: payload.user.id,
      username: payload.user.username,
      email: payload.user.email ?? null,
      first_name: payload.user.first_name ?? null,
      last_name: payload.user.last_name ?? null,
      display_name: payload.user.display_name ?? payload.user.username,
    },
    role: payload.user.role,
    business: payload.user.business,
  };

  await saveSession(session);
  return session;
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const payload = await apiRequest<{ access: string; refresh: string }>(
    '/auth/refresh/',
    {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    },
    false,
  );

  const session = await loadSession();
  if (!session) {
    throw new Error('No saved session available for refresh.');
  }

  const refreshed: AuthSession = {
    ...session,
    accessToken: payload.access,
    refreshToken: payload.refresh,
  };

  await saveSession(refreshed);
  return refreshed;
}

export async function logoutSession(): Promise<void> {
  const session = await loadSession();
  if (!session) {
    await clearSession();
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ refresh: session.refreshToken }),
    });
  } catch {
    // Intentionally ignore backend logout failures and clear the device session.
  }

  await clearSession();
}

export async function fetchMe(): Promise<AuthSession | null> {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const payload = await apiRequest<{ user: any; business: any; role: SessionRole }>('/auth/me/', {
    method: 'GET',
  });

  const nextSession: AuthSession = {
    ...session,
    user: {
      id: payload.user.id,
      username: payload.user.username,
      email: payload.user.email ?? null,
      first_name: payload.user.first_name ?? null,
      last_name: payload.user.last_name ?? null,
      display_name: payload.user.display_name ?? payload.user.username,
    },
    role: payload.role,
    business: payload.business,
  };

  await saveSession(nextSession);
  return nextSession;
}
