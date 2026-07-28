/**
 * 키–문자열 저장소 어댑터. 도메인을 모른다 — 직렬화·정규화는
 * [storage.ts](../lib/storage.ts)가 한다.
 */

import { Storage } from "@apps-in-toss/web-framework";

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** 토스 앱의 네이티브 저장소 */
const nativeStore: KeyValueStore = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
};

/** 토스 앱 밖(브라우저)에서 쓰는 대체 저장소 */
const browserStore: KeyValueStore = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
};

const PROBE_KEY = "__toss-storage-probe";

let resolved: Promise<KeyValueStore> | null = null;

/** 쓸 수 있는 저장소를 고른다. 한 번 고른 뒤에는 그대로 쓴다. */
export function resolveKeyValueStore(): Promise<KeyValueStore> {
  resolved ??= probe();
  return resolved;
}

async function probe(): Promise<KeyValueStore> {
  // window가 없으면 브리지가 스텁으로 바뀌어 호출이 영영 끝나지 않는다
  if (typeof window === "undefined") return browserStore;

  try {
    await nativeStore.getItem(PROBE_KEY);
    return nativeStore;
  } catch {
    // 토스 앱 밖에서는 네이티브 브리지가 없어 호출이 거부된다
    return browserStore;
  }
}
