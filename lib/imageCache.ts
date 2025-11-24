/**
 * IndexedDB 图片缓存工具
 * 用于持久化存储历史记录的图片，提升加载速度
 */

const DB_NAME = 'SparkitImageCache';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 天

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

/**
 * 初始化 IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建对象存储，如果不存在
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('Created IndexedDB object store');
      }
    };
  });
}

/**
 * 从 IndexedDB 获取图片
 */
export async function getImageFromCache(url: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as CachedImage | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // 检查是否过期
        const now = Date.now();
        if (now - result.timestamp > CACHE_DURATION) {
          console.log('Cache expired for:', url.substring(0, 50));
          // 异步删除过期缓存
          deleteImageFromCache(url);
          resolve(null);
          return;
        }

        console.log('Cache hit:', url.substring(0, 50), `(${(result.size / 1024).toFixed(1)}KB)`);
        resolve(result.blob);
      };

      request.onerror = () => {
        console.error('Failed to get from cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return null;
  }
}

/**
 * 存储图片到 IndexedDB
 */
export async function saveImageToCache(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const cachedImage: CachedImage = {
        url,
        blob,
        timestamp: Date.now(),
        size: blob.size,
      };
      
      const request = store.put(cachedImage);

      request.onsuccess = () => {
        console.log('Cached image:', url.substring(0, 50), `(${(blob.size / 1024).toFixed(1)}KB)`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to cache image:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error saving to cache:', error);
    // 不抛出错误，缓存失败不应该影响正常功能
  }
}

/**
 * 删除单个图片缓存
 */
export async function deleteImageFromCache(url: string): Promise<void> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(url);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error deleting from cache:', error);
  }
}

/**
 * 清理所有过期缓存
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();
      
      let deletedCount = 0;
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const cachedImage = cursor.value as CachedImage;
          
          // 删除过期的
          if (now - cachedImage.timestamp > CACHE_DURATION) {
            cursor.delete();
            deletedCount++;
          }
          
          cursor.continue();
        } else {
          // 遍历完成
          if (deletedCount > 0) {
            console.log(`Cleaned ${deletedCount} expired cache entries`);
          }
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    return 0;
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  count: number;
  totalSize: number;
  oldestTimestamp: number;
}> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as CachedImage[];
        
        const stats = {
          count: results.length,
          totalSize: results.reduce((sum, img) => sum + img.size, 0),
          oldestTimestamp: results.length > 0 
            ? Math.min(...results.map(img => img.timestamp))
            : Date.now(),
        };
        
        resolve(stats);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, totalSize: 0, oldestTimestamp: Date.now() };
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All cache cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * 下载图片并缓存（统一入口）
 */
export async function downloadAndCacheImage(url: string): Promise<Blob> {
  // 1. 先从 IndexedDB 读取
  const cachedBlob = await getImageFromCache(url);
  if (cachedBlob) {
    return cachedBlob;
  }

  // 2. 从网络下载
  console.log('Downloading from network:', url.substring(0, 50));
  const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  
  const blob = await response.blob();
  
  // 3. 异步保存到 IndexedDB（不阻塞返回）
  saveImageToCache(url, blob).catch(err => {
    console.error('Failed to cache image:', err);
  });
  
  return blob;
}

