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
});
