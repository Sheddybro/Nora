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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOfflineMutation(value: unknown): value is OfflineMutation {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === 'string'
    && typeof value.createdAt === 'string'
    && Number.isSafeInteger(value.userId)
    && Number.isSafeInteger(value.businessId)
    && typeof value.resource === 'string'
    && ['POST', 'PATCH', 'DELETE'].includes(value.method as string)
    && isRecord(value.payload)
    && (value.idempotencyKey === undefined || typeof value.idempotencyKey === 'string')
    && ['queued', 'syncing', 'conflict'].includes(value.status as string)
    && (value.conflict === undefined || typeof value.conflict === 'string');
}

export function subscribeToQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

async function readStoredQueue(): Promise<OfflineMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Saved offline changes could not be read and have been left untouched.${detail}`);
  }

  if (!Array.isArray(parsed) || !parsed.every(isOfflineMutation)) {
    throw new Error('Saved offline changes have an invalid format and have been left untouched.');
  }

  return parsed.map((item) => item.status === 'syncing' ? { ...item, status: 'queued' } : item);
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

export function getMutationQueueStatus(
  mutationId: string,
  queue: OfflineMutation[],
): OfflineMutationStatus | 'synced' {
  return queue.find((item) => item.id === mutationId)?.status ?? 'synced';
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
    // The UI stores newest changes first, but server writes must replay oldest first.
    // Otherwise an offline receipt followed by an adjustment could be reversed.
    for (const mutation of [...queue].reverse()) {
      if (mutation.status === 'conflict') {
        continue;
      }

      await updateQueue((currentQueue) => currentQueue.map((item) => item.id === mutation.id ? { ...item, status: 'syncing' } : item));
      try {
        await apiRequest(mutation.resource, {
          method: mutation.method,
          body: JSON.stringify(
            mutation.idempotencyKey && !Object.prototype.hasOwnProperty.call(mutation.payload, 'idempotency_key')
              ? { ...mutation.payload, idempotency_key: mutation.idempotencyKey }
              : mutation.payload,
          ),
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
