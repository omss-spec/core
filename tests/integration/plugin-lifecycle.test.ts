import { beforeEach, describe, expect, it, vi } from 'vitest'
import OMSSServer from '@/core/server.js'
import { PluginState } from '@/features/plugins/public-api.js'
import { OMSSPluginError } from '@/utils/error.js'

function makeServer(name = 'integration') {
    return new OMSSServer({ name })
}

describe('Plugin Lifecycle Integration', () => {
    let server: OMSSServer
    beforeEach(() => {
        server = makeServer()
    })

    it('registers a no-options plugin and marks it Registered', async () => {
        const p = vi.fn(async () => {})
        await server.plugins.register(p)
        expect(server.plugins.getPluginState(p)).toBe(PluginState.Registered)
    })

    it('passes the server instance into the plugin', async () => {
        let received: OMSSServer | undefined
        await server.plugins.register(async (s) => {
            received = s
        })
        expect(received).toBe(server)
    })

    it('registers a plugin with static options', async () => {
        const p = vi.fn(async (_s: OMSSServer, o: { n: number }) => {
            expect(o.n).toBe(7)
        })
        await server.plugins.register(p, { n: 7 })
        expect(p).toHaveBeenCalledOnce()
    })

    it('registers a plugin with factory options using server', async () => {
        const p = vi.fn(async (_s: OMSSServer, o: { name: string }) => {
            expect(o.name).toBe('integration')
        })
        await server.plugins.register(p, (s) => ({ name: s.config.name }))
        expect(p).toHaveBeenCalledOnce()
    })

    it('fires onPluginRegister before the plugin body', async () => {
        const order: string[] = []
        server.hooks.add('onPluginRegister', async () => {
            order.push('hook')
        })
        await server.plugins.register(async () => {
            order.push('plugin')
        })
        expect(order).toEqual(['hook', 'plugin'])
    })

    it('hook receives correct plugin reference and options', async () => {
        let captured: unknown
        server.hooks.add('onPluginRegister', async (p) => {
            captured = p
        })
        const plugin = vi.fn(async () => {})
        await server.plugins.register(plugin, { tag: 'hi' })
        expect((captured as any).plugin).toBe(plugin)
        expect((captured as any).options).toStrictEqual({ tag: 'hi' })
    })

    it('multiple onPluginRegister hooks all execute in registration order', async () => {
        const calls: number[] = []
        server.hooks.add('onPluginRegister', async () => {
            calls.push(1)
        })
        server.hooks.add('onPluginRegister', async () => {
            calls.push(2)
        })
        await server.plugins.register(vi.fn(async () => {}))
        expect(calls).toEqual([1, 2])
    })

    it('registers multiple independent plugins', async () => {
        const [p1, p2, p3] = [vi.fn(async () => {}), vi.fn(async () => {}), vi.fn(async () => {})]
        await server.plugins.register(p1)
        await server.plugins.register(p2)
        await server.plugins.register(p3)
        for (const p of [p1, p2, p3]) {
            expect(server.plugins.getPluginState(p)).toBe(PluginState.Registered)
        }
    })

    it('a plugin can register child plugins (nested)', async () => {
        const child = vi.fn(async () => {})
        await server.plugins.register(async (s) => {
            await s.plugins.register(child)
        })
        expect(server.plugins.getPluginState(child)).toBe(PluginState.Registered)
        expect(child).toHaveBeenCalledOnce()
    })

    it('return ERR when the same plugin is registered twice', async () => {
        const p = vi.fn(async () => {})
        await server.plugins.register(p)
        const res = await server.plugins.register(p)
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
    })

    it('prevents registration inside onPluginRegister', async () => {
        const inner = vi.fn(async () => {})

        server.hooks.add('onPluginRegister', async () => {
            const res = await server.plugins.register(inner)
            expect(res.ok).toBe(false)
            if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
        })

        await server.plugins.register(vi.fn(async () => {}))
    })

    it('returns ERR on circular self-referencing plugin', async () => {
        async function selfRef(s: OMSSServer) {
            const res = await s.plugins.register(selfRef)
            expect(res.ok).toBe(false)
            if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
        }
        await server.plugins.register(selfRef)
    })

    it('returns ERR with the Error when a plugin throws during execution', async () => {
        const res = await server.plugins.register(async () => {
            throw new Error('plugin failed')
        })
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
        if (!res.ok) expect(res.error.cause).toBeInstanceOf(Error)
    })

    it('state reverts to Unavailable after failure and retry succeeds', async () => {
        let attempt = 0
        async function flaky() {
            attempt++
            if (attempt === 1) throw new Error('transient')
        }
        const res = await server.plugins.register(flaky)
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
        if (!res.ok) expect(res.error.cause).toBeInstanceOf(Error)
        if (!res.ok && res.error.cause instanceof Error) expect(res.error.message).toBe('Error: transient')
        expect(server.plugins.getPluginState(flaky)).toBe(PluginState.Unavailable)
        await server.plugins.register(flaky)
        expect(server.plugins.getPluginState(flaky)).toBe(PluginState.Registered)
    })

    it('server config is accessible inside a plugin', async () => {
        const s = makeServer('config-check')
        let name: string | undefined
        await s.plugins.register(async (sv) => {
            name = sv.config.name
        })
        expect(name).toBe('config-check')
    })
})
