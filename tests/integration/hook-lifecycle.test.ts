import { beforeEach, describe, expect, it, vi } from 'vitest'
import OMSSServer from '@/core/server.js'

describe('Hook Lifecycle Integration', () => {
    let server: OMSSServer
    beforeEach(() => {
        server = new OMSSServer({ name: 'hook-test' })
    })

    it('async hooks are fully awaited before the plugin body runs', async () => {
        const timeline: string[] = []
        server.hooks.add('onPluginRegister', async () => {
            await new Promise((r) => setTimeout(r, 20))
            timeline.push('hook-done')
        })
        await server.plugins.register(async () => {
            timeline.push('plugin-body')
        })
        expect(timeline).toEqual(['hook-done', 'plugin-body'])
    })

    it('multiple onPluginRegister hooks fire in registration order', async () => {
        const calls: string[] = []
        server.hooks.add('onPluginRegister', async () => {
            calls.push('A')
        })
        server.hooks.add('onPluginRegister', async () => {
            calls.push('B')
        })
        server.hooks.add('onPluginRegister', async () => {
            calls.push('C')
        })
        await server.plugins.register(async () => {})
        expect(calls).toEqual(['A', 'B', 'C'])
    })

    it('hooks on separate server instances are isolated', async () => {
        const s2 = new OMSSServer({ name: 'isolated' })
        const spy = vi.fn()
        s2.hooks.add('onPluginRegister', spy as any)

        await server.plugins.register(async () => {})

        expect(spy).not.toHaveBeenCalled()
    })

    it('hook receives options passed to register()', async () => {
        let opts: unknown
        server.hooks.add('onPluginRegister', async (p) => {
            opts = p.options
        })
        await server.plugins.register(async () => {}, { foo: 'bar' })
        expect(opts).toStrictEqual({ foo: 'bar' })
    })

    it('adding a hook after registration does not affect previous registrations', async () => {
        const spy = vi.fn()
        await server.plugins.register(vi.fn(async () => {}))
        server.hooks.add('onPluginRegister', spy as any)
        expect(spy).not.toHaveBeenCalled()
    })
})
