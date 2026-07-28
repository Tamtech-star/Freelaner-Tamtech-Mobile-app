import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "pending_submissions";

export interface QueuedItem {
  id: string;
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function getQueue(): Promise<QueuedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedItem[]) : [];
  } catch {
    return [];
  }
}

export async function addToQueue(item: Omit<QueuedItem, "id" | "createdAt">): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...item,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const next = queue.filter((q) => q.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
