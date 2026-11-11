import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '../lib/auth';

const { storage, apiRequestMock } = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  apiRequestMock: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
  },
}));

vi.mock('../lib/auth', () => ({ apiRequest: apiRequestMock }));

import {
  clearQueuedMutations,
  getMutationQueueStatus,
  getQueuedMutations,
  queueOfflineMutation,
  subscribeToQueue,
  syncQueuedMutations,
} from '../lib/offlineQueue';

const queueKey = 'norrisbeauty.offline.queue.v1';
const session: AuthSession = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: {
    id: 7,
    username: 'owner',
    display_name: 'Owner',
  },
  role: 'owner',
  business: { id: 11, name: 'Beauty Business' },
};

function stockMovement(userId = session.user.id, businessId = session.business.id) {
  return queueOfflineMutation({
    userId,
    businessId,
    resource: '/inventory/movements/',
    method: 'POST',
    payload: { kind: 'receipt', quantity_delta: 2 },
    idempotencyKey: `stock-${userId}-${businessId}`,
  });
}

beforeEach(async () => {
  storage.clear();
  apiRequestMock.mockReset();
  await clearQueuedMutations();
});

describe('offline stock movement queue', () => {
  it('notifies the Inventory screen when a movement is queued and synced', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToQueue(listener);
    apiRequestMock.mockResolvedValueOnce({});

    await stockMovement();
    expect(listener).toHaveBeenCalledTimes(1);

    await syncQueuedMutations(session);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(await getQueuedMutations(session.user.id, session.business.id)).toEqual([]);

    unsubscribe();
  });

  it('keeps a visible synced status after a movement leaves the pending queue', async () => {
    const mutation = await stockMovement();
    const pending = await getQueuedMutations(session.user.id, session.business.id);
    expect(getMutationQueueStatus(mutation.id, pending)).toBe('queued');

    apiRequestMock.mockResolvedValueOnce({});
    await syncQueuedMutations(session);

    const completed = await getQueuedMutations(session.user.id, session.business.id);
    expect(getMutationQueueStatus(mutation.id, completed)).toBe('synced');
  });

  it('persists mutations and only returns the authenticated user and business scope', async () => {
    await stockMovement();
    await stockMovement(8, session.business.id);
    await stockMovement(session.user.id, 12);

    const scoped = await getQueuedMutations(session.user.id, session.business.id);

    expect(scoped).toHaveLength(1);
    expect(scoped[0].idempotencyKey).toBe('stock-7-11');
    expect(storage.has(queueKey)).toBe(true);
  });

  it('replays the original mutation and idempotency key, then removes it', async () => {
    await stockMovement();

    await syncQueuedMutations(session);

    expect(apiRequestMock).toHaveBeenCalledWith('/inventory/movements/', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'receipt',
        quantity_delta: 2,
        idempotency_key: 'stock-7-11',
      }),
    });
    expect(await getQueuedMutations(session.user.id, session.business.id)).toEqual([]);
  });

  it('retains permanent API conflicts for review and does not retry them', async () => {
    await stockMovement();
    apiRequestMock.mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { status: 403 }));

    await syncQueuedMutations(session);
    await syncQueuedMutations(session);

    const [mutation] = await getQueuedMutations(session.user.id, session.business.id);
    expect(mutation.status).toBe('conflict');
    expect(mutation.conflict).toBe('Permission denied');
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it('leaves transient failures queued and stops replay until connectivity recovers', async () => {
    await stockMovement();
    await stockMovement();
    apiRequestMock.mockRejectedValueOnce(Object.assign(new Error('Service unavailable'), { status: 503 }));

    await syncQueuedMutations(session);

    const queued = await getQueuedMutations(session.user.id, session.business.id);
    expect(queued).toHaveLength(2);
    expect(queued.every((mutation) => mutation.status === 'queued')).toBe(true);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it('replays dependent stock movements in the order they were queued', async () => {
    const receipt = await stockMovement();
    const adjustment = await queueOfflineMutation({
      userId: session.user.id,
      businessId: session.business.id,
      resource: '/inventory/movements/',
      method: 'POST',
      payload: { kind: 'adjustment', quantity_delta: -1 },
      idempotencyKey: 'adjustment-after-receipt',
    });
    const listed = await getQueuedMutations(session.user.id, session.business.id);
    expect(listed.map((item) => item.id)).toEqual([adjustment.id, receipt.id]);

    apiRequestMock.mockResolvedValue({});
    await syncQueuedMutations(session);

    expect(apiRequestMock.mock.calls.map(([resource, options]) => ({
      resource,
      key: JSON.parse(options.body).idempotency_key,
    }))).toEqual([
      { resource: '/inventory/movements/', key: 'stock-7-11' },
      { resource: '/inventory/movements/', key: 'adjustment-after-receipt' },
    ]);
    expect(await getQueuedMutations(session.user.id, session.business.id)).toEqual([]);
  });

  it('does not overtake an earlier transient failure with a later stock change', async () => {
    const receipt = await stockMovement();
    const adjustment = await queueOfflineMutation({
      userId: session.user.id,
      businessId: session.business.id,
      resource: '/inventory/movements/',
      method: 'POST',
      payload: { kind: 'adjustment', quantity_delta: -1 },
      idempotencyKey: 'adjustment-after-failed-receipt',
    });
    apiRequestMock.mockRejectedValueOnce(Object.assign(new Error('Network error'), { status: 503 }));

    await syncQueuedMutations(session);

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(apiRequestMock.mock.calls[0][1].body).idempotency_key).toBe('stock-7-11');
    const pending = await getQueuedMutations(session.user.id, session.business.id);
    expect(pending.map((item) => item.id)).toEqual([adjustment.id, receipt.id]);
    expect(pending.every((item) => item.status === 'queued')).toBe(true);

    apiRequestMock.mockResolvedValue({});
    await syncQueuedMutations(session);
    expect(apiRequestMock).toHaveBeenCalledTimes(3);
    expect(await getQueuedMutations(session.user.id, session.business.id)).toEqual([]);
  });

  it('preserves unreadable persisted data and reports a clear error', async () => {
    storage.set(queueKey, '{invalid json');

    await expect(getQueuedMutations(session.user.id, session.business.id))
      .rejects.toThrow('Saved offline changes could not be read and have been left untouched.');

    expect(storage.get(queueKey)).toBe('{invalid json');
  });

  it('rejects invalid stored records without discarding them', async () => {
    storage.set(queueKey, JSON.stringify([{ id: 'incomplete' }]));

    await expect(getQueuedMutations(session.user.id, session.business.id))
      .rejects.toThrow('Saved offline changes have an invalid format and have been left untouched.');

    expect(storage.has(queueKey)).toBe(true);
  });

  it('never sends one business account\'s offline stock changes using another account session', async () => {
    const ownerMutation = await stockMovement();
    const otherMutation = await stockMovement(8, 12);
    apiRequestMock.mockResolvedValue({});

    await syncQueuedMutations(session);

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(apiRequestMock.mock.calls[0][1].body).idempotency_key).toBe('stock-7-11');
    expect(await getQueuedMutations(7, 11)).toEqual([]);
    expect((await getQueuedMutations(8, 12)).map((item) => item.id)).toEqual([otherMutation.id]);

    const otherSession: AuthSession = {
      ...session,
      user: { ...session.user, id: 8, username: 'different-owner' },
      business: { id: 12, name: 'Second Business' },
    };
    await syncQueuedMutations(otherSession);

    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(apiRequestMock.mock.calls[1][1].body).idempotency_key).toBe('stock-8-12');
    expect(await getQueuedMutations()).toEqual([]);
    expect(ownerMutation.id).not.toBe(otherMutation.id);
  });

  it('does not submit the same queued movement twice when sync is requested concurrently', async () => {
    await stockMovement();
    let releaseRequest: ((value: unknown) => void) | undefined;
    let requestStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { requestStarted = resolve; });
    const response = new Promise((resolve) => { releaseRequest = resolve; });
    apiRequestMock.mockImplementation(() => {
      requestStarted?.();
      return response;
    });

    const firstSync = syncQueuedMutations(session);
    await started;
    const secondSync = syncQueuedMutations(session);
    await secondSync;

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    releaseRequest?.({});
    await firstSync;

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(await getQueuedMutations(session.user.id, session.business.id)).toEqual([]);
  });

  it('preserves newly queued movements while an earlier movement is being synchronized', async () => {
    const first = await stockMovement();
    let releaseRequest: ((value: unknown) => void) | undefined;
    let requestStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { requestStarted = resolve; });
    apiRequestMock.mockImplementationOnce(() => {
      requestStarted?.();
      return new Promise((resolve) => { releaseRequest = resolve; });
    });

    const syncing = syncQueuedMutations(session);
    await started;
    const later = await queueOfflineMutation({
      userId: session.user.id,
      businessId: session.business.id,
      resource: '/inventory/movements/',
      method: 'POST',
      payload: { kind: 'adjustment', quantity_delta: -1 },
      idempotencyKey: 'queued-during-sync',
    });
    releaseRequest?.({});
    await syncing;

    const pending = await getQueuedMutations(session.user.id, session.business.id);
    expect(pending.map((item) => item.id)).toEqual([later.id]);
    expect(pending.some((item) => item.id === first.id)).toBe(false);
    apiRequestMock.mockResolvedValue({});
    await syncQueuedMutations(session);
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(await getQueuedMutations()).toEqual([]);
  });
});
