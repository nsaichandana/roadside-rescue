/**
 * sosQueue.ts
 *
 * Helpers for the offline SOS retry queue.
 * Import enqueueSos() in sos.tsx and call it whenever a send fails.
 * offline.tsx reads the same queue key and retries automatically when online.
 */

import type { SosQueueEntry } from "@/routes/offline";

const SOS_QUEUE_KEY = "roadsos-sos-queue";

function loadQueue(): SosQueueEntry[] {
  try {
    const raw = localStorage.getItem(SOS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SosQueueEntry[]) {
  try {
    localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

/**
 * Add a failed SOS alert to the persistent retry queue.
 * Call this from sos.tsx when the API send fails (network error / offline).
 */
export function enqueueSos(params: {
  message: string;
  location: string;
  contacts: string[];
}): SosQueueEntry {
  const entry: SosQueueEntry = {
    id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    message: params.message,
    location: params.location,
    contacts: params.contacts,
    retries: 0,
    status: "pending",
  };
  const queue = loadQueue();
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

/**
 * Remove a successfully-sent entry from the queue.
 */
export function dequeueSuccess(id: string) {
  const queue = loadQueue().filter((e) => e.id !== id);
  saveQueue(queue);
}

/**
 * How many alerts are waiting to be retried.
 */
export function pendingQueueCount(): number {
  return loadQueue().filter((e) => e.status === "pending").length;
}