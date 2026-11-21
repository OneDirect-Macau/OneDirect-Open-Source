export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  storedAt: number;
};

export class TtlCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();

  constructor(
    readonly ttlMs: number,
    readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw new RangeError("ttlMs must be a non-negative finite number");
    }
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError("maxEntries must be a positive integer");
    }
  }

  get(key: K, options: { allowStale?: boolean } = {}): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (options.allowStale || entry.expiresAt > this.now()) {
      return entry.value;
    }
    this.entries.delete(key);
    return undefined;
  }

  getEntry(key: K): CacheEntry<V> | undefined {
    return this.entries.get(key);
  }

  set(key: K, value: V): void {
    const storedAt = this.now();
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      storedAt,
      expiresAt: storedAt + this.ttlMs,
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as K | undefined;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
