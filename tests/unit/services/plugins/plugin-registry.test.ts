import { describe, it, expect, vi } from 'vitest'
import { PluginRegistry } from '../../../../src/services/plugins/index.js'
import { PluginState } from '../../../../src/services/plugins/types.js'
import type { OMSSServer } from '../../../../src/core/server.js'
import type { OMSSPluginType } from '../../../../src/types/index.js'

function makeServerStub(): OMSSServer {
    return {} as unknown as OMSSServer
}

describe('PluginRegistry', () => {
    describe('getState()', () => {
        it('returns Unavailable for an unknown plugin', () => {
            const registry = new PluginRegistry()
            expect(registry.getState(vi.fn())).toBe(PluginState.Unavailable)
        })
    })

    describe('add()', () => {
        it('executes the plugin function with the server instance', async () => {
            const registry = new PluginRegistry()
            const server = makeServerStub()
            const plugin = vi.fn<OMSSPluginType<void>>()
            await registry.add(server, plugin)
            expect(plugin).toHaveBeenCalledWith(server, undefined)
        })

        it('passes static options to the plugin', async () => {
            const registry = new PluginRegistry()
            const server = makeServerStub()
            const plugin = vi.fn<OMSSPluginType<{ port: number }>>()
            await registry.add(server, plugin, { port: 3000 })
            expect(plugin).toHaveBeenCalledWith(server, { port: 3000 })
        })

        it('resolves options from a factory function', async () => {
            const registry = new PluginRegistry()
            const server = makeServerStub()
            const plugin = vi.fn<OMSSPluginType<{ port: number }>>()
            const factory = vi.fn(() => ({ port: 4000 }))
            await registry.add(server, plugin, factory)
            expect(factory).toHaveBeenCalledWith(server)
            expect(plugin).toHaveBeenCalledWith(server, { port: 4000 })
        })

        it('marks plugin as Registered after success', async () => {
            const registry = new PluginRegistry()
            const plugin = vi.fn<OMSSPluginType<void>>()
            await registry.add(makeServerStub(), plugin)
            expect(registry.getState(plugin)).toBe(PluginState.Registered)
        })

        it('throws when the same plugin is registered twice', async () => {
            const registry = new PluginRegistry()
            const plugin = vi.fn<OMSSPluginType<void>>()
            await registry.add(makeServerStub(), plugin)
            await expect(registry.add(makeServerStub(), plugin)).rejects.toThrow(/already registered/)
        })

        it('throws on circular plugin dependency', async () => {
            const registry = new PluginRegistry()
            const server = makeServerStub()
            const pluginA: OMSSPluginType<void> = async (s) => {
                await registry.add(s, pluginA)
            }
            await expect(registry.add(server, pluginA)).rejects.toThrow(/Circular plugin dependency/)
        })

        it('cleans up state when plugin throws during execution', async () => {
            const registry = new PluginRegistry()
            const plugin: OMSSPluginType<void> = async () => {
                throw new Error('init failed')
            }
            await expect(registry.add(makeServerStub(), plugin)).rejects.toThrow('init failed')
            expect(registry.getState(plugin)).toBe(PluginState.Unavailable)
        })

        it('awaits async plugins before resolving', async () => {
            const registry = new PluginRegistry()
            let resolved = false
            const plugin: OMSSPluginType<void> = async () => {
                await new Promise((r) => setTimeout(r, 10))
                resolved = true
            }
            await registry.add(makeServerStub(), plugin)
            expect(resolved).toBe(true)
        })
    })
})
