/**
 * Generic helper for deduplicating concurrent asynchronous work by key.
 *
 * When the same key is requested multiple times while a request is still in
 * flight, all callers receive the same Promise. Once the Promise settles, the
 * key is removed automatically so the next request starts fresh.
 *
 * @typeParam TKey - Cache key type.
 * @typeParam TValue - Promise resolution type.
 */
export class AsyncDeduper<TKey, TValue> {
    readonly #entries = new Map<TKey, Promise<TValue>>()

    /**
     * Returns the current in-flight Promise for a key, if one exists.
     *
     * @param key - In-flight request key.
     * @returns Existing Promise or undefined.
     */
    get(key: TKey): Promise<TValue> | undefined {
        return this.#entries.get(key)
    }

    /**
     * Check whether a key currently has an in-flight Promise.
     *
     * @param key - In-flight request key.
     * @returns True if the key is currently in flight.
     */
    has(key: TKey): boolean {
        return this.#entries.has(key)
    }

    /**
     * Delete a key manually.
     *
     * @param key - In-flight request key.
     * @returns True if an entry existed and was removed.
     */
    delete(key: TKey): boolean {
        return this.#entries.delete(key)
    }

    /**
     * Clear all tracked in-flight requests.
     */
    clear(): void {
        this.#entries.clear()
    }

    /**
     * Run a Promise factory for a key, reusing an existing in-flight Promise
     * when available.
     *
     * @param key - In-flight request key.
     * @param factory - Factory that creates the Promise when no request exists yet.
     * @returns Shared or newly created Promise.
     */
    run(key: TKey, factory: () => Promise<TValue>): Promise<TValue> {
        const existing = this.#entries.get(key)

        if (existing) {
            return existing
        }

        const promise = factory().finally(() => {
            this.#entries.delete(key)
        })

        this.#entries.set(key, promise)

        return promise
    }
}
