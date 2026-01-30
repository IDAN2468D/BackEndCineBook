import NodeCache from 'node-cache';

class CacheService {
    private cache: NodeCache;

    constructor(ttlSeconds: number = 3600) { // Default TTL: 1 hour
        this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: false });
    }

    get<T>(key: string): T | undefined {
        return this.cache.get<T>(key);
    }

    set<T>(key: string, value: T, ttl?: number): boolean {
        return this.cache.set(key, value, ttl || 0); // 0 means use default stdTTL
    }

    del(key: string): number {
        return this.cache.del(key);
    }

    flush(): void {
        this.cache.flushAll();
    }

    /**
     * Helper to get from cache or fetch and set if missing.
     * @param key Cache key
     * @param fetchFunction Async function to fetch data if cache miss
     * @param ttl Optional TTL in seconds for this specific key
     */
    async getOrFetch<T>(key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T> {
        const value = this.get<T>(key);
        if (value) {
            console.log(`[CACHE] Hit: ${key}`);
            return value;
        }

        console.log(`[CACHE] Miss: ${key}`);
        const newValue = await fetchFunction();
        this.set(key, newValue, ttl);
        return newValue;
    }
}

export const cacheService = new CacheService();
