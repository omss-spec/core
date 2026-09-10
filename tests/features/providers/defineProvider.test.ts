import { describe, expect, it } from 'vitest'
import { defineProvider } from '@/features/providers/defineProvider.js'
import { createProvider } from '../../utils.js'

describe('defineProvider', () => {
    it('returns the same provider object it was given', () => {
        const provider = createProvider()

        expect(defineProvider(provider)).toBe(provider)
    })
})
