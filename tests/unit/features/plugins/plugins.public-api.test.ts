import { describe, expect, it } from 'vitest'
import { PluginState } from '@/features/plugins/public-api.js'

describe('PluginState (enum)', () => {
    it('has the Registering member', () => {
        expect(PluginState.Registering).toBeDefined()
    })

    it('has the Registered member', () => {
        expect(PluginState.Registered).toBeDefined()
    })

    it('has the Unavailable member', () => {
        expect(PluginState.Unavailable).toBeDefined()
    })

    it('all three values are distinct', () => {
        const values = new Set([PluginState.Registering, PluginState.Registered, PluginState.Unavailable])
        expect(values.size).toBe(3)
    })
})
