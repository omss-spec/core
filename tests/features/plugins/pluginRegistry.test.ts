import { describe, expect, it } from 'vitest'
import OMSSServer from '@/core/server.js'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginState } from '@/features/plugins/plugin-state.js'
import { OMSSPluginError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'

const createServer = () => new OMSSServer({ name: 'plugin-test' } as OMSSConfig)

describe('PluginRegistry', () => {
    it('registers simple plugins and tracks state', async () => {
        const registry = new PluginRegistry()
        const server = createServer()

        const plugin = async (instance: OMSSServer) => {
            expect(instance).toBe(server)
        }

        const result = await registry.add(server, plugin)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(PluginState.Registered)
        expect(registry.getState(plugin)).toBe(PluginState.Registered)
    })

    it('rejects duplicate plugin registration', async () => {
        const registry = new PluginRegistry()
        const server = createServer()

        const plugin = async (instance: OMSSServer) => {
            expect(instance).toBe(server)
        }

        const first = await registry.add(server, plugin)
        expect(first.ok).toBe(true)

        const second = await registry.add(server, plugin)

        expect(second.ok).toBe(false)
        if (!second.ok) {
            expect(second.error).toBeInstanceOf(OMSSPluginError)
            expect(second.error.message).toContain('already registered')
        }
        expect(registry.getState(plugin)).toBe(PluginState.Registered)
    })

    it('tracks registration state transitions and registration stack for nested calls', async () => {
        const registry = new PluginRegistry()
        const server = createServer()

        const pluginA = async () => {
            // Nested registration should succeed but mark pluginB as registered
            await registry.add(server, pluginB)
        }
        const pluginB = async () => {}

        const first = await registry.add(server, pluginA)
        expect(first.ok).toBe(true)
        expect(registry.getState(pluginA)).toBe(PluginState.Registered)
        expect(registry.getState(pluginB)).toBe(PluginState.Registered)
    })

    it('wraps non-OMSSPluginError thrown by plugin into OMSSPluginError', async () => {
        const registry = new PluginRegistry()
        const server = createServer()

        const plugin = async () => {
            throw new Error('boom')
        }

        const result = await registry.add(server, plugin)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSPluginError)
            expect(result.error.message).toContain('boom')
            expect(result.error.cause).toBeInstanceOf(Error)
        }
    })
})
