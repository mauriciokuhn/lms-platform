/**
 * Offline Mode — IndexedDB Storage
 *
 * Provides offline-first data access:
 * - Stores lesson progress in IndexedDB
 * - Queues mutations when offline
 * - Syncs when back online via Background Sync API
 */

const DB_NAME = "lms-offline";
const DB_VERSION = 1;
const STORES = ["progress", "mutationQueue", "cachedCourses"] as const;

// ──────────────────────────────────────────
// Database initialization
// ──────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Progress store — track watched seconds even offline
      if (!db.objectStoreNames.contains("progress")) {
        const store = db.createObjectStore("progress", {
          keyPath: "lessonId",
        });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }

      // Mutation queue — actions performed while offline
      if (!db.objectStoreNames.contains("mutationQueue")) {
        const store = db.createObjectStore("mutationQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("type", "type", { unique: false });
      }

      // Cached courses — full course data for offline browsing
      if (!db.objectStoreNames.contains("cachedCourses")) {
        const store = db.createObjectStore("cachedCourses", {
          keyPath: "id",
        });
        store.createIndex("title", "title", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ──────────────────────────────────────────
// Generic CRUD helpers
// ──────────────────────────────────────────

async function put(storeName: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(storeName: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getByIndex(
  storeName: string,
  indexName: string,
  value: string
): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).index(indexName).getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ──────────────────────────────────────────
// Public API — Lesson Progress
// ──────────────────────────────────────────

export interface OfflineProgress {
  lessonId: string;
  userId: string;
  watchedSeconds: number;
  completed: boolean;
  lastAccessedAt: string;
  synced: boolean;
}

export async function saveProgressOffline(progress: OfflineProgress) {
  await put("progress", { ...progress, synced: false });
  // Register background sync if available
  registerSync("sync-progress");
}

export async function getOfflineProgress(
  userId: string
): Promise<OfflineProgress[]> {
  return getByIndex("progress", "userId", userId);
}

export async function getUnsyncedProgress(): Promise<OfflineProgress[]> {
  return getByIndex("progress", "synced", "false");
}

export async function markProgressSynced(lessonId: string) {
  const items = await getAll("progress");
  const item = items.find((p) => p.lessonId === lessonId);
  if (item) {
    await put("progress", { ...item, synced: true });
  }
}

// ──────────────────────────────────────────
// Public API — Mutation Queue
// ──────────────────────────────────────────

interface QueuedMutation {
  id?: number;
  type: "ENROLL" | "COMPLETE_LESSON" | "SUBMIT_QUIZ" | "REVIEW";
  payload: any;
  createdAt: string;
}

export async function enqueueMutation(
  type: QueuedMutation["type"],
  payload: any
) {
  await put("mutationQueue", {
    type,
    payload,
    createdAt: new Date().toISOString(),
  });
  registerSync("sync-mutations");
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  return getAll("mutationQueue");
}

export async function dequeueMutation(id: number) {
  await remove("mutationQueue", String(id));
}

// ──────────────────────────────────────────
// Public API — Course Cache
// ──────────────────────────────────────────

export interface CachedCourse {
  id: string;
  title: string;
  description: string;
  category: string | null;
  modules: any[];
  cachedAt: string;
}

export async function cacheCourse(course: CachedCourse) {
  await put("cachedCourses", {
    ...course,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedCourse(
  id: string
): Promise<CachedCourse | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cachedCourses", "readonly");
    const request = tx.objectStore("cachedCourses").get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedCourses(): Promise<CachedCourse[]> {
  return getAll("cachedCourses");
}

// ──────────────────────────────────────────
// Background Sync
// ──────────────────────────────────────────

async function registerSync(tag: string) {
  if ("serviceWorker" in navigator && "sync" in (navigator as any).serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      console.log(`✅ Background Sync registered: ${tag}`);
    } catch (err) {
      console.log("⚠️ Background Sync not available:", err);
    }
  }
}

// ──────────────────────────────────────────
// Sync pending mutations when back online
// ──────────────────────────────────────────

export async function syncPendingMutations(): Promise<{
  synced: number;
  failed: number;
}> {
  const mutations = await getPendingMutations();
  let synced = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      const res = await fetch("/api/offline/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutation),
      });

      if (res.ok) {
        await dequeueMutation(mutation.id!);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
