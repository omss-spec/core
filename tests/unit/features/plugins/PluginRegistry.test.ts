import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginState } from '@/features/plugins/public-api.js'
import OMSSServer from '@/core/server.js'

function makeServer(): OMSSServer {
    return new OMSSServer({ name: 'test-server' })
}

describe('PluginRegistry', () => {
    let registry: PluginRegistry
    let server: OMSSServer

    beforeEach(() => {
        registry = new PluginRegistry()
        server = makeServer()
    })

    describe('getState()', () => {
        it('returns Unavailable for an unknown plugin', () => {
            const plugin = vi.fn(async () => {})
            expect(registry.getState(plugin)).toBe(PluginState.Unavailable)
        })
    })

    describe('add() — happy path', () => {
        it('executes a no-options plugin and marks it as Registered', async () => {
            const plugin = vi.fn(async (_s: OMSSServer) => {})
            await registry.add(server, plugin)

            expect(plugin).toHaveBeenCalledOnce()
            expect(plugin).toHaveBeenCalledWith(server)
            expect(registry.getState(plugin)).toBe(PluginState.Registered)
        })

        it('executes a plugin with plain options and passes them correctly', async () => {
            const plugin = vi.fn(async (_s: OMSSServer, _o: { key: string }) => {})
            const options = { key: 'value' }
            await registry.add(server, plugin, options)

            expect(plugin).toHaveBeenCalledWith(server, options)
        })

        it('resolves factory options before calling the plugin', async () => {
            const plugin = vi.fn(async (_s: OMSSServer, opts: { ok: boolean }) => {
                expect(opts.ok).toBe(true)
            })
            await registry.add(server, plugin, (_s: OMSSServer) => ({ ok: true }))
            expect(plugin).toHaveBeenCalledOnce()
        })

        it('passes the server instance to a factory options function', async () => {
            let captured: OMSSServer | undefined
            const factory = (s: OMSSServer) => {
                captured = s
                return {}
            }
            await registry.add(
                server,
                vi.fn(async () => {}),
                factory
            )
            expect(captured).toBe(server)
        })
    })

    describe('add() — duplicate detection', () => {
        it('throws when the same plugin is registered twice', async () => {
            const plugin = vi.fn(async () => {})
            await registry.add(server, plugin)

            await expect(registry.add(server, plugin)).rejects.toThrow(`Plugin "${plugin.name}" is already registered`)
        })
    })

    describe('add() — circular dependency detection', () => {
        it('throws on a direct self-referencing plugin', async () => {
            async function selfCircular(s: OMSSServer) {
                await registry.add(s, selfCircular)
            }

            await expect(registry.add(server, selfCircular)).rejects.toThrow('Circular plugin dependency detected')
        })

        it('throws on an indirect A → B → A cycle', async () => {
            async function pluginA(s: OMSSServer) {
                await registry.add(s, pluginB)
            }
            async function pluginB(s: OMSSServer) {
                await registry.add(s, pluginA)
            }

            await expect(registry.add(server, pluginA)).rejects.toThrow('Circular plugin dependency detected')
        })
    })

    describe('add() — error handling', () => {
        it('reverts state to Unavailable after a plugin throws, allowing retry', async () => {
            let calls = 0
            async function flakyPlugin() {
                calls++
                if (calls === 1) throw new Error('first fails')
            }

            await expect(registry.add(server, flakyPlugin)).rejects.toThrow('first fails')
            expect(registry.getState(flakyPlugin)).toBe(PluginState.Unavailable)

            await registry.add(server, flakyPlugin)
            expect(registry.getState(flakyPlugin)).toBe(PluginState.Registered)
        })

        it('re-throws the original error from a failing plugin', async () => {
            const plugin = vi.fn(async () => {
                throw new Error('plugin exploded')
            })
            await expect(registry.add(server, plugin)).rejects.toThrow('plugin exploded')
        })
    })
})
