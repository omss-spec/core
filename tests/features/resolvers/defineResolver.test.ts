import { describe, expect, it } from 'vitest'
import { defineResolver } from '@/features/resolvers/defineResolver.js'
import { createResolver } from '../../utils.js'

describe('defineResolver', () => {
    it('returns the same resolver object it was given', () => {
        const resolver = createResolver()

        expect(defineResolver(resolver)).toBe(resolver)
    })
})
