/**
 * clientstorage.ts
 *
 * Tiny wrapper around browser Storage (sessionStorage / localStorage).
 *
 * - createStorage(prefix: string, type: "localStorage" | "sessionStorage" = "sessionStorage")
 *   returns an object with: getItem<T>(key): T | null, setItem<T>(key, value): void,
 *   removeItem(key): void, clear(): void, hasKey(key): boolean
 *
 * Behavior:
 * - Keys are namespaced by prefix: stored key is `${prefix}${key}`.
 * - Values are JSON.stringify'd on set, JSON.parse'd on get.
 * - Errors (parse, quota, unavailable storage) are caught and logged to console.
 *
 * Caveats:
 * - globalThis.localStorage / sessionStorage are not available during SSR.
 *   Only call from browser environment or guard with `typeof globalThis !== 'undefined'`.
 * - clear() currently calls store.clear() which clears the entire storage for the origin.
 *   If you want to only remove keys for the prefix, implement clearPrefix:
 *
 *     for (let i = store.length - 1; i >= 0; i--) {
 *       const k = store.key(i);
 *       if (k?.startsWith(prefix)) store.removeItem(k);
 *     }
 *
 * Minimal usage:
 * import { createStorage } from './clientstorage';
 *
 * const store = createStorage('myApp:', 'sessionStorage');
 * store.setItem('user', { id: 1, name: 'Alice' });
 * const user = store.getItem<{ id: number; name: string }>('user');
 * if (user) console.log(user.name);
 */

type StorageType = "localStorage" | "sessionStorage";

export const createStorage = (
  prefix: string,
  type: StorageType = "sessionStorage",
) => {
  const store = type === "localStorage" ? globalThis.localStorage : globalThis.sessionStorage;

  const getKey = (key: string) => `${prefix}${key}`;

  const getItem = <T>(key: string): T | null => {
    const item = store.getItem(getKey(key));
    if (item) {
      try {
        return JSON.parse(item);
      } catch (e) {
        console.error(`Error parsing item from storage: ${e}`);
        return null;
      }
    }
    return null;
  };

  const setItem = <T>(key: string, value: T): void => {
    try {
      store.setItem(getKey(key), JSON.stringify(value));
    } catch (e) {
      console.error(`Error setting item in storage: ${e}`);
    }
  };

  const removeItem = (key: string): void => {
    try {
      store.removeItem(getKey(key));
    } catch (e) {
      console.error(`Error removing item from storage: ${e}`);
    }
  };

  const clear = (): void => {
    try {
      store.clear();
    } catch (e) {
      console.error(`Error clearing storage: ${e}`);
    }
  };

  const hasKey = (key: string): boolean => {
    try {
      return store.getItem(getKey(key)) !== null;
    } catch (e) {
      console.error(`Error checking key in storage: ${e}`);
      return false;
    }
  };

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    hasKey,
  };
};
