// In-memory cache for ultra-fast data access
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize = 1000;

  set(key: string, data: any, ttlSeconds = 300) {
    // Auto-cleanup if cache gets too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  ITEMS_ALL: 'items:all',
  ITEMS_BY_CATEGORY: (category: string) => `items:category:${category}`,
  SALES_ITEM: (itemId: string, start: string, end: string) => `sales:${itemId}:${start}:${end}`,
  DROPDOWNS: 'dropdowns:all',
  PETPOOJA_HEADERS: 'petpooja:headers'
};