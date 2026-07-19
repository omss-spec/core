import { describe, expect, it } from 'vitest'
import { InFlightRequestPool } from '@/utils/InFlightRequestPool.js'

describe('InFlightRequestPool', () => {
    const createPool = () => new InFlightRequestPool<string, number>()

    describe('get and has', () => {
        it('returns undefined and false when no entry exists', () => {
            const pool = createPool()

            expect(pool.get('key')).toBeUndefined()
            expect(pool.has('key')).toBe(false)
        })

        it('reflects in-flight promise presence', async () => {
            const pool = createPool()
            const promise = pool.run('key', async () => 1)

            expect(pool.get('key')).toBe(promise)
            expect(pool.has('key')).toBe(true)

            await promise
        })
    })

    describe('run', () => {
        it('reuses existing in-flight promise for same key', async () => {
            const pool = createPool()
            let factoryCalls = 0

            const factory = async () => {
                factoryCalls += 1
                return 42
            }

            const first = pool.run('key', factory)
            const second = pool.run('key', factory)

            expect(first).toBe(second)

            const [a, b] = await Promise.all([first, second])
            expect(a).toBe(42)
            expect(b).toBe(42)
            expect(factoryCalls).toBe(1)
        })

        it('starts a new promise once previous has settled and entry removed', async () => {
            const pool = createPool()
            let factoryCalls = 0

            const factory = async () => {
                factoryCalls += 1
                return factoryCalls
            }

            const first = await pool.run('key', factory)
            expect(first).toBe(1)
            expect(pool.has('key')).toBe(false)

            const second = await pool.run('key', factory)
            expect(second).toBe(2)
            expect(factoryCalls).toBe(2)
        })

        it('removes entry when promise rejects', async () => {
            const pool = createPool()
            const error = new Error('fail')

            const promise = pool.run('key', async () => {
                throw error
            })

            await promise.catch(() => {})
            expect(pool.has('key')).toBe(false)
        })
    })

    describe('delete and clear', () => {
        it('delete removes a single key and returns true when existed', async () => {
            const pool = createPool()
            await pool.run('key', async () => 1)

            // manually keep in-flight entry
            const promise = pool.run('key', async () => 2)
            expect(pool.has('key')).toBe(true)

            const result = pool.delete('key')
            expect(result).toBe(true)
            expect(pool.has('key')).toBe(false)

            await promise
        })

        it('clear removes all keys', async () => {
            const pool = createPool()
            await pool.run('a', async () => 1)
            await pool.run('b', async () => 2)

            pool.clear()

            expect(pool.has('a')).toBe(false)
            expect(pool.has('b')).toBe(false)
        })
    })
})
