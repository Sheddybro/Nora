import { beforeEach, describe, expect, it, vi } from 'vitest';

const { storage } = vi.hoisted(() => ({ storage: new Map<string, string>() }));

vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  getItemAsync: vi.fn(async (key: string) => storage.get(key) ?? null),
  deleteItemAsync: vi.fn(async (key: string) => { storage.delete(key); }),
}));

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { apiRequest, clearSession, getPasswordResetUrl, loadSession, saveSession, type AuthSession } from '../lib/auth';

const session: AuthSession = {
  accessToken: 'expired-access',
  refreshToken: 'refresh-1',
  user: { id: 7, username: 'owner', display_name: 'Owner' },
  role: 'owner',
  business: { id: 11, name: 'Beauty Business' },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  storage.clear();
  await clearSession();
});

describe('authenticated API token refresh', () => {
  it('builds the web password reset URL from the API base URL', () => {
    expect(getPasswordResetUrl('https://norris.example/api/v1/')).toBe('https://norris.example/password-reset/');
  });

  it('rotates a refresh token only once for simultaneous unauthorized requests', async () => {
    await saveSession(session);
    let unauthorizedRequests = 0;
    let refreshRequests = 0;
    let releaseUnauthorized: (() => void) | undefined;
    const unauthorizedBarrier = new Promise<void>((resolve) => { releaseUnauthorized = resolve; });

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh/')) {
        refreshRequests += 1;
        return jsonResponse({ access: 'access-2', refresh: 'refresh-2' });
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer expired-access') {
        unauthorizedRequests += 1;
        if (unauthorizedRequests === 2) releaseUnauthorized?.();
        await unauthorizedBarrier;
        return jsonResponse({ detail: 'Token is invalid or expired' }, 401);
      }
      if (authorization === 'Bearer access-2') {
        return jsonResponse({ ok: true, request: url.endsWith('/first/') ? 'first' : 'second' });
      }
      return jsonResponse({ detail: 'Unexpected authorization token' }, 401);
    }));

    const results = await Promise.all([
      apiRequest<{ ok: boolean; request: string }>('/first/'),
      apiRequest<{ ok: boolean; request: string }>('/second/'),
    ]);

    expect(results).toEqual([{ ok: true, request: 'first' }, { ok: true, request: 'second' }]);
    expect(refreshRequests).toBe(1);
    expect(await loadSession()).toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2' });
  });

  it('reuses a token already refreshed by another request before handling a late 401', async () => {
    await saveSession(session);
    let refreshRequests = 0;
    let releaseLateUnauthorized: (() => void) | undefined;
    const lateUnauthorizedBarrier = new Promise<void>((resolve) => { releaseLateUnauthorized = resolve; });
    let oldTokenRequests = 0;

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh/')) {
        refreshRequests += 1;
        return jsonResponse({ access: 'access-2', refresh: 'refresh-2' });
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer expired-access') {
        oldTokenRequests += 1;
        if (url.endsWith('/late/')) await lateUnauthorizedBarrier;
        return jsonResponse({ detail: 'Token is invalid or expired' }, 401);
      }
      if (authorization === 'Bearer access-2') {
        if (url.endsWith('/first/')) releaseLateUnauthorized?.();
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ detail: 'Unexpected authorization token' }, 401);
    }));

    const results = await Promise.all([
      apiRequest<{ ok: boolean }>('/first/'),
      apiRequest<{ ok: boolean }>('/late/'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(oldTokenRequests).toBe(2);
    expect(refreshRequests).toBe(1);
  });
});
