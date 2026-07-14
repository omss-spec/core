import { describe, expect, it, vi } from 'vitest'
import { PluginService } from '@/features/plugins/PluginService.js'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { PluginState } from '@/features/plugins/public-api.js'
import OMSSServer from '@/core/server.js'
import { OMSSPluginError } from '@/utils/error.js'

function setup() {
    const server = new OMSSServer({ name: 'svc-test' })
    const pluginRegistry = new PluginRegistry()
    const hookRegistry = new HookRegistry()
    const service = new PluginService(server, pluginRegistry, hookRegistry)
    return { server, pluginRegistry, hookRegistry, service }
}

describe('PluginService', () => {
    describe('register()', () => {
        it('fires onPluginRegister hook before executing the plugin body', async () => {
            const { hookRegistry, service } = setup()
            const order: string[] = []
            hookRegistry.#hooks.set('onPluginRegister', [
                vi.fn(() => {
                    order.push('hook')
                }),
            ])

            const plugin = vi.fn(async () => {
                order.push('plugin')
            })
            await service.register(plugin)

            expect(order).toEqual(['hook', 'plugin'])
        })

        it('passes plugin and options into the onPluginRegister payload', async () => {
            const { hookRegistry, service } = setup()
            let payload: unknown
            hookRegistry.#hooks.set('onPluginRegister', [
                vi.fn((p) => {
                    payload = p
                }),
            ])

            const plugin = vi.fn(async () => {})
            const opts = { x: 1 }
            await service.register(plugin, opts)

            expect(payload).toMatchObject({ plugin, options: opts })
        })

        it('registers a plugin and transitions state to Registered', async () => {
            const { pluginRegistry, service } = setup()
            const plugin = vi.fn(async () => {})
            await service.register(plugin)
            expect(pluginRegistry.getState(plugin)).toBe(PluginState.Registered)
        })

        it('registers a plugin with factory options', async () => {
            const { service } = setup()
            const plugin = vi.fn(async (_s: OMSSServer, o: { x: number }) => {
                expect(o.x).toBe(42)
            })
            await service.register(plugin, () => ({ x: 42 }))
            expect(plugin).toHaveBeenCalledOnce()
        })

        it('throws when register() is called from inside an onPluginRegister hook', async () => {
            const { hookRegistry, service } = setup()
            const inner = vi.fn(async () => {})
            hookRegistry.#hooks.set('onPluginRegister', [
                vi.fn(async () => {
                    const res = await service.register(inner)
                    expect(res.ok).toBe(false)
                    if (!res.ok) expect(res.error.message).toBe('Plugins cannot be registered during onPluginRegister')
                    if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
                }),
            ])
        })

        it('resets the re-entrancy guard after a hook throws', async () => {
            const { hookRegistry, service } = setup()

            hookRegistry.#hooks.set('onPluginRegister', [
                vi.fn(() => {
                    throw new Error('hook error')
                }),
            ])

            await expect(service.register(vi.fn(async () => {}))).rejects.toThrow('hook error')

            const inner = vi.fn(async () => {})

            hookRegistry.#hooks.set('onPluginRegister', [
                vi.fn(async () => {
                    const res = await service.register(inner)
                    expect(res.ok).toBe(false)
                    if (!res.ok) expect(res.error.message).toBe('Plugins cannot be registered during onPluginRegister')
                    if (!res.ok) expect(res.error).toBeInstanceOf(OMSSPluginError)
                }),
            ])
        })
    })

    describe('getPluginState()', () => {
        it('returns Unavailable for an unregistered plugin', () => {
            const { service } = setup()
            expect(service.getPluginState(vi.fn(async () => {}))).toBe(PluginState.Unavailable)
        })

        it('returns Registered after a successful registration', async () => {
            const { service } = setup()
            const plugin = vi.fn(async () => {})
            await service.register(plugin)
            expect(service.getPluginState(plugin)).toBe(PluginState.Registered)
        })
    })
})
