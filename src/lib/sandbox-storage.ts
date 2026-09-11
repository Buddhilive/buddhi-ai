/**
 * IndexedDB Sandbox Project Persistence Layer
 * Saves and restores user code in /workspace keyed by chatId, ignoring .gitignore artifacts.
 */

const DB_NAME = "buddhi_sandbox_db";
const DB_VERSION = 1;
const STORE_NAME = "sandbox_projects";

export interface SavedSandboxProject {
  chatId: string;
  files: Record<string, string>; // relative path -> content
  updatedAt: number;
  version: number;
}

const DEFAULT_IGNORED_PATTERNS = [
  /^node_modules(\/|$)/,
  /^\.next(\/|$)/,
  /^dist(\/|$)/,
  /^\.git(\/|$)/,
  /^\.turbo(\/|$)/,
  /^\.env.*\.local$/,
  /\.log$/,
  /^\.DS_Store$/,
];

/**
 * Checks whether a given relative path should be ignored from persistence.
 */
export function isIgnoredPath(relativePath: string, gitignoreRules: string[] = []): boolean {
  const normalized = relativePath.replace(/^\/+/, "").replace(/\\/g, "/");

  // Check default patterns
  for (const pattern of DEFAULT_IGNORED_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  // Check custom gitignore rules
  for (const rule of gitignoreRules) {
    const trimmed = rule.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const cleanRule = trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!cleanRule) continue;

    if (normalized === cleanRule || normalized.startsWith(`${cleanRule}/`)) {
      return true;
    }

    if (cleanRule.startsWith("*.") && normalized.endsWith(cleanRule.slice(1))) {
      return true;
    }
  }

  return false;
}

/**
 * Opens or initializes the IndexedDB for sandbox persistence.
 */
function openSandboxDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "chatId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open sandbox IndexedDB"));
  });
}

/**
 * Saves non-ignored sandbox files for a specific chatId.
 */
export async function saveSandboxFiles(
  chatId: string,
  files: Record<string, string>,
  gitignoreContent?: string
): Promise<void> {
  if (!chatId) return;

  const gitignoreRules = gitignoreContent ? gitignoreContent.split(/\r?\n/) : [];
  const filteredFiles: Record<string, string> = {};

  for (const [path, content] of Object.entries(files)) {
    if (!isIgnoredPath(path, gitignoreRules)) {
      filteredFiles[path] = content;
    }
  }

  try {
    const db = await openSandboxDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const record: SavedSandboxProject = {
        chatId,
        files: filteredFiles,
        updatedAt: Date.now(),
        version: 1,
      };

      const putRequest = store.put(record);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error || new Error("Failed to save sandbox files"));
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error(`[SandboxStorage] Error saving files for chat ${chatId}:`, err);
    throw err;
  }
}

/**
 * Loads saved sandbox files for a specific chatId.
 * Returns null if no saved files exist.
 */
export async function loadSandboxFiles(chatId: string): Promise<Record<string, string> | null> {
  if (!chatId) return null;

  try {
    const db = await openSandboxDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(chatId);

      getRequest.onsuccess = () => {
        const result = getRequest.result as SavedSandboxProject | undefined;
        resolve(result?.files ?? null);
      };

      getRequest.onerror = () => reject(getRequest.error || new Error("Failed to load sandbox files"));
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error(`[SandboxStorage] Error loading files for chat ${chatId}:`, err);
    return null;
  }
}

/**
 * Deletes saved sandbox files for a specific chatId.
 */
export async function deleteSandboxFiles(chatId: string): Promise<void> {
  if (!chatId) return;

  try {
    const db = await openSandboxDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const delRequest = store.delete(chatId);

      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => reject(delRequest.error || new Error("Failed to delete sandbox files"));
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error(`[SandboxStorage] Error deleting files for chat ${chatId}:`, err);
  }
}
