// @vitest-environment jsdom
/**
 * Unit tests for the offline IndexedDB module (src/lib/offline/index.ts).
 *
 * Uses fake-indexeddb (a full in-memory implementation) so the progress
 * store, mutation queue, course cache and the sync loop are exercised
 * without a real browser. Each test starts from a fresh DB.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  saveProgressOffline,
  getOfflineProgress,
  getUnsyncedProgress,
  markProgressSynced,
  enqueueMutation,
  getPendingMutations,
  dequeueMutation,
  cacheCourse,
  getCachedCourse,
  getCachedCourses,
  syncPendingMutations,
  type OfflineProgress,
} from "@/lib/offline";

const progress: OfflineProgress = {
  lessonId: "l1",
  userId: "u1",
  watchedSeconds: 120,
  completed: false,
  lastAccessedAt: "2026-01-01T00:00:00.000Z",
  synced: false,
};

const fetchMock = vi.fn();

describe("offline module (IndexedDB)", () => {
  beforeEach(() => {
    // A fresh in-memory factory per test. deleteDatabase() is NOT an option:
    // the module never closes its connections, so a delete would block.
    vi.stubGlobal("indexedDB", new IDBFactory());
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves progress and reads it back per user", async () => {
    await saveProgressOffline(progress);
    await saveProgressOffline({ ...progress, lessonId: "l2", userId: "u2" });

    const mine = await getOfflineProgress("u1");
    expect(mine).toHaveLength(1);
    expect(mine[0].lessonId).toBe("l1");
    expect(mine[0].watchedSeconds).toBe(120);
    // saveProgressOffline forces synced: false.
    expect(mine[0].synced).toBe(false);
  });

  it("lists only unsynced progress (booleans are not IndexedDB keys)", async () => {
    // saveProgressOffline always forces synced: false, so create two rows
    // and mark one as synced to split them.
    await saveProgressOffline(progress);
    await saveProgressOffline({ ...progress, lessonId: "l2" });
    await markProgressSynced("l1");

    const unsynced = await getUnsyncedProgress();
    expect(unsynced.map((p) => p.lessonId)).toEqual(["l2"]);
  });

  it("marks a lesson as synced", async () => {
    await saveProgressOffline(progress);
    await markProgressSynced("l1");

    const all = await getOfflineProgress("u1");
    expect(all[0].synced).toBe(true);
    expect(await getUnsyncedProgress()).toHaveLength(0);
  });

  it("markProgressSynced is a no-op for an unknown lesson", async () => {
    await saveProgressOffline(progress);
    await markProgressSynced("does-not-exist");

    const all = await getOfflineProgress("u1");
    expect(all[0].synced).toBe(false);
  });

  it("saveProgressOffline upserts an existing lesson (put by keyPath)", async () => {
    await saveProgressOffline(progress);
    await saveProgressOffline({ ...progress, watchedSeconds: 300 });

    const all = await getOfflineProgress("u1");
    expect(all).toHaveLength(1);
    expect(all[0].watchedSeconds).toBe(300);
  });

  it("queues, lists and dequeues mutations", async () => {
    await enqueueMutation("ENROLL", { courseId: "c1" });
    await enqueueMutation("SUBMIT_QUIZ", { quizId: "q1" });

    const pending = await getPendingMutations();
    expect(pending).toHaveLength(2);
    expect(pending[0].type).toBe("ENROLL");
    expect(pending[0].payload).toEqual({ courseId: "c1" });
    expect(typeof pending[0].createdAt).toBe("string");

    await dequeueMutation(pending[0].id!);
    const remaining = await getPendingMutations();
    expect(remaining.map((m) => m.type)).toEqual(["SUBMIT_QUIZ"]);
  });

  it("caches courses and reads them back", async () => {
    const course = {
      id: "c1",
      title: "React do Zero",
      description: "Curso",
      category: "Front-end",
      modules: [{ id: "m1" }],
      cachedAt: "",
    };
    await cacheCourse(course);

    const found = await getCachedCourse("c1");
    expect(found?.title).toBe("React do Zero");
    expect(found?.cachedAt).toBeTruthy();

    expect(await getCachedCourses()).toHaveLength(1);
    expect(await getCachedCourse("missing")).toBeNull();
  });

  it("syncPendingMutations posts each one and dequeues the successful", async () => {
    await enqueueMutation("ENROLL", { courseId: "c1" });
    await enqueueMutation("REVIEW", { courseId: "c2" });

    fetchMock
      .mockResolvedValueOnce({ ok: true }) // first succeeds
      .mockResolvedValueOnce({ ok: false }); // second fails

    const result = await syncPendingMutations();

    expect(result).toEqual({ synced: 1, failed: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("/api/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });

    // The successful mutation was dequeued; the failed one remains.
    const remaining = await getPendingMutations();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe("REVIEW");
  });

  it("syncPendingMutations counts network failures as failed", async () => {
    await enqueueMutation("ENROLL", { courseId: "c1" });
    fetchMock.mockRejectedValue(new Error("offline"));

    const result = await syncPendingMutations();

    expect(result).toEqual({ synced: 0, failed: 1 });
    const remaining = await getPendingMutations();
    expect(remaining).toHaveLength(1); // kept for a later retry
  });
});
