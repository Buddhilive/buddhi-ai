/**
 * MediaPipe Web Worker
 * 
 * This web worker handles file downloading, caching, and progress tracking.
 * Features:
 * - Downloads files from URLs with progress tracking
 * - Caches files using the Cache API for subsequent requests
 * - Handles errors and edge cases gracefully
 * - Returns download progress status updates
 */

// Types for message communication
interface DownloadRequest {
  type: 'download';
  url: string;
  cacheKey?: string; // Optional custom cache key, defaults to URL
}

interface ProgressResponse {
  type: 'progress';
  url: string;
  percentage: number;
  status: 'downloading' | 'caching' | 'complete' | 'error';
  fromCache?: boolean;
}

interface CompleteResponse {
  type: 'complete';
  url: string;
  data: string;
  fromCache: boolean;
}

interface ErrorResponse {
  type: 'error';
  url: string;
  message: string;
  code?: string;
}

type WorkerResponse = ProgressResponse | CompleteResponse | ErrorResponse;

// Cache configuration
const CACHE_NAME = 'buddhi-ai-models-cache-v1';
const MAX_CACHE_SIZE = 5000 * 1024 * 1024; // 5000MB cache limit
const CACHE_EXPIRY_DAYS = 30; // Files expire after 30 days

/**
 * Checks if a URL is valid and accessible
 * @param url The URL to validate
 * @returns Promise<boolean> True if URL is valid and accessible
 */
async function validateUrl(url: string): Promise<boolean> {
  try {
    new URL(url); // Basic URL validation
    
    // Check if URL is accessible with HEAD request
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Gets the cache instance, creating it if it doesn't exist
 * @returns Promise<Cache> The cache instance
 */
async function getCache(): Promise<Cache> {
  try {
    return await caches.open(CACHE_NAME);
  } catch (error) {
    throw new Error(`Failed to open cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a cache URL for a URL with metadata
 * @param url The original URL
 * @param cacheKey Optional custom cache key
 * @returns string A valid cache URL
 */
function generateCacheUrl(url: string, cacheKey?: string): string {
  const key = cacheKey || `file-${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
  return `https://cache.buddhi-ai.local/${key}`;
}

/**
 * Checks if a cached item has expired
 * @param response The cached response
 * @returns boolean True if expired
 */
function isCacheExpired(response: Response): boolean {
  try {
    const cachedDate = response.headers.get('x-cache-date');
    if (!cachedDate) return true;
    
    const cacheTime = new Date(cachedDate).getTime();
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    return (now - cacheTime) > expiryTime;
  } catch {
    return true; // If we can't determine, assume expired
  }
}

/**
 * Checks if adding a new file would exceed cache size limit
 * @param cache The cache instance
 * @param newFileSize Size of the new file in bytes
 * @returns Promise<boolean> True if cache limit would be exceeded
 */
async function wouldExceedCacheLimit(cache: Cache, newFileSize: number): Promise<boolean> {
  try {
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const sizeHeader = response.headers.get('content-length');
        if (sizeHeader) {
          totalSize += parseInt(sizeHeader, 10);
        }
      }
    }
    
    return (totalSize + newFileSize) > MAX_CACHE_SIZE;
  } catch {
    return false; // If we can't determine, allow caching
  }
}

/**
 * Clears expired entries from cache
 * @param cache The cache instance
 */
async function clearExpiredCache(cache: Cache): Promise<void> {
  try {
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response && isCacheExpired(response)) {
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.warn('Failed to clear expired cache entries:', error);
  }
}

/**
 * Attempts to load a file from cache
 * @param url The file URL
 * @param cacheKey Optional custom cache key
 * @returns Promise<string | null> The cached file data or null if not found/expired
 */
async function loadFromCache(url: string, cacheKey?: string): Promise<string | null> {
  try {
    const cache = await getCache();
    const cacheUrl = generateCacheUrl(url, cacheKey);
    const request = new Request(cacheUrl);
    const response = await cache.match(request);
    
    if (response && !isCacheExpired(response)) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    
    // Remove expired cache entry
    if (response) {
      await cache.delete(request);
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to load from cache:', error);
    return null;
  }
}

/**
 * Downloads a file from URL with progress tracking
 * @param url The file URL
 * @param onProgress Callback for progress updates
 * @returns Promise<string> The downloaded file data
 */
async function downloadFile(
  url: string, 
  onProgress: (loaded: number, total: number) => void
): Promise<Blob> {
  const response = await fetch(url, {
    mode: 'cors',
    cache: 'no-cache'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!response.body) {
    throw new Error('Response body is empty');
  }
  
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      // Report progress
      onProgress(loaded, total || loaded);
    }
  } finally {
    reader.releaseLock();
  }

  const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
  
  return blob;
}

/**
 * Saves file data to cache
 * @param url The original file URL
 * @param data The file data to cache
 * @param cacheKey Optional custom cache key
 */
async function saveToCache(url: string, data: Blob, cacheKey?: string): Promise<void> {
  try {
    const cache = await getCache();
    
    // Check cache size limits
    if (await wouldExceedCacheLimit(cache, data.size)) {
      await clearExpiredCache(cache);
      
      // Check again after cleanup
      if (await wouldExceedCacheLimit(cache, data.size)) {
        console.warn('Cache size limit exceeded, skipping cache for:', url);
        return;
      }
    }
    
    const cacheUrl = generateCacheUrl(url, cacheKey);
    const headers = new Headers({
      'content-type': 'application/octet-stream',
      'content-length': data.size.toString(),
      'x-cache-date': new Date().toISOString(),
      'x-original-url': url
    });
    
    const response = new Response(data, { headers });
    await cache.put(new Request(cacheUrl), response);
  } catch (error) {
    console.warn('Failed to save to cache:', error);
    // Don't throw here - caching is optional
  }
}

/**
 * Sends a message back to the main thread
 * @param response The response to send
 */
function sendResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Main file processing function
 * @param url The file URL to process
 * @param cacheKey Optional custom cache key
 */
async function processFile(url: string, cacheKey?: string): Promise<void> {
  try {
    // Validate URL first
    if (!await validateUrl(url)) {
      sendResponse({
        type: 'error',
        url,
        message: `URL is not valid or accessible: ${url}`,
        code: 'INVALID_URL'
      });
      return;
    }
    
    // Try to load from cache first
    const cachedData = await loadFromCache(url, cacheKey);
    
    if (cachedData) {
      sendResponse({
        type: 'progress',
        url,
        percentage: 100,
        status: 'complete',
        fromCache: true
      });
      
      sendResponse({
        type: 'complete',
        url,
        data: cachedData,
        fromCache: true
      });
      return;
    }
    
    // Download the file with progress tracking
    sendResponse({
      type: 'progress',
      url,
      percentage: 0,
      status: 'downloading',
      fromCache: false
    });
    
    const data = await downloadFile(url, (loaded, total) => {
      const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
      
      sendResponse({
        type: 'progress',
        url,
        percentage,
        status: 'downloading',
        fromCache: false
      });
    });
    
    // Cache the downloaded file
    sendResponse({
      type: 'progress',
      url,
      percentage: 100,
      status: 'caching',
      fromCache: false
    });
    
    await saveToCache(url, data, cacheKey);
    
    // Send completion message
    sendResponse({
      type: 'progress',
      url,
      percentage: 100,
      status: 'complete',
      fromCache: false
    });
    
    sendResponse({
      type: 'complete',
      url,
      data: URL.createObjectURL(data),
      fromCache: false
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCode = error instanceof Error && 'code' in error ? error.code as string : 'UNKNOWN_ERROR';
    
    sendResponse({
      type: 'error',
      url,
      message: errorMessage,
      code: errorCode
    });
  }
}

/**
 * Message handler for the web worker
 */
self.addEventListener('message', async (event: MessageEvent<DownloadRequest>) => {
  const { type, url, cacheKey } = event.data;
  
  if (type === 'download') {
    await processFile(url, cacheKey);
  }
});

/**
 * Error handler for unhandled errors
 */
self.addEventListener('error', (event: ErrorEvent) => {
  console.error('Worker error:', event.error);
  sendResponse({
    type: 'error',
    url: 'unknown',
    message: event.error?.message || 'Unhandled worker error',
    code: 'WORKER_ERROR'
  });
});

/**
 * Handler for unhandled promise rejections
 */
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('Unhandled promise rejection:', event.reason);
  sendResponse({
    type: 'error',
    url: 'unknown',
    message: event.reason?.message || 'Unhandled promise rejection',
    code: 'PROMISE_REJECTION'
  });
});

// Export types for use in main thread
export type { DownloadRequest, ProgressResponse, CompleteResponse, ErrorResponse, WorkerResponse };
