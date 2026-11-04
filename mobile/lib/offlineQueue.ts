import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, type AuthSession } from './auth';

export type OfflineMutationStatus = 'queued' | 'syncing' | 'conflict';

export type OfflineMutation = {
  id: string;
  createdAt: string;
  userId: number;
  businessId: number;
  resource: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  status: OfflineMutationStatus;
  conflict?: string;
};

const QUEUE_KEY = 'norrisbeauty.offline.queue.v1';
let syncInProgress = false;
let queueOperation: Promise<void> = Promise.resolve();
const queueListeners = new Set<() => void>();

export function subscribeToQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

async function readStoredQueue(): Promise<OfflineMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineMutation[];
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(QUEUE_KEY);
      return [];
    }

    return parsed.map((item) => item.status === 'syncing' ? { ...item, status: 'queued' } : item);
  } catch {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

async function persistQueue(items: OfflineMutation[]): Promise<void> {
  if (items.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
  queueListeners.forEach((listener) => listener());
}

async function readQueue(): Promise<OfflineMutation[]> {
  await queueOperation;
  return readStoredQueue();
}

async function updateQueue(update: (items: OfflineMutation[]) => OfflineMutation[]): Promise<void> {
  const operation = queueOperation.then(async () => {
    await persistQueue(update(await readStoredQueue()));
  });
  queueOperation = operation.then(() => undefined, () => undefined);
  await operation;
}

export function buildIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function queueOfflineMutation(input: {
  userId: number;
  businessId: number;
  resource: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<OfflineMutation> {
  const mutation: OfflineMutation = {
    id: `mutation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    userId: input.userId,
    businessId: input.businessId,
    resource: input.resource,
    method: input.method,
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
    status: 'queued',
  };

  await updateQueue((queue) => [mutation, ...queue]);
  return mutation;
}

export async function getQueuedMutations(userId?: number, businessId?: number): Promise<OfflineMutation[]> {
  const queue = await readQueue();
  if (userId === undefined || businessId === undefined) {
    return queue;
  }

  return queue.filter((item) => item.userId === userId && item.businessId === businessId);
}

export async function markMutationConflict(id: string, reason: string): Promise<void> {
  await updateQueue((queue) => queue.map((item) => (
    item.id === id ? { ...item, status: 'conflict', conflict: reason } as OfflineMutation : item
  )));
}

export async function markMutationSynced(id: string): Promise<void> {
  await updateQueue((queue) => queue.filter((item) => item.id !== id));
}

export async function removeQueuedMutation(id: string): Promise<void> {
  await updateQueue((queue) => queue.filter((item) => item.id !== id));
}

export async function syncQueuedMutations(session: AuthSession): Promise<void> {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;
  try {
    const queue = await getQueuedMutations(session.user.id, session.business.id);
    for (const mutation of queue) {
      if (mutation.status === 'conflict') {
        continue;
      }

      await updateQueue((currentQueue) => currentQueue.map((item) => item.id === mutation.id ? { ...item, status: 'syncing' } : item));
      try {
        await apiRequest(mutation.resource, {
          method: mutation.method,
          body: JSON.stringify(mutation.payload),
        });
        await markMutationSynced(mutation.id);
      } catch (error) {
        const status = (error as Error & { status?: number }).status;
        if (status !== undefined && [400, 403, 404, 409, 422].includes(status)) {
          await markMutationConflict(mutation.id, (error as Error).message);
          continue;
        }

        await updateQueue((latestQueue) => latestQueue.map((item) => item.id === mutation.id ? { ...item, status: 'queued' } : item));
        break;
      }
    }
  } finally {
    syncInProgress = false;
  }
}

export async function clearQueuedMutations(): Promise<void> {
  await updateQueue(() => []);
}
