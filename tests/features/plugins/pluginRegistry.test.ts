import { describe, expect, it } from 'vitest'
import OMSSServer from '@/core/server.js'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginState } from '@/features/plugins/plugin-state.js'
import { OMSSPluginError } from '@/utils/error.js'
import { createServer } from '../../utils.js'
import { Result } from '@/types/utils.js'

describe('PluginRegistry', () => {
    it('registers simple plugins and tracks state', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const plugin = async (instance: OMSSServer) => {
            expect(instance).toBe(server)
        }

        const result = await registry.add(plugin)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(PluginState.Registered)
        expect(registry.getState(plugin)).toBe(PluginState.Registered)
    })

    it('rejects duplicate plugin registration', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const plugin = async (instance: OMSSServer) => {
            expect(instance).toBe(server)
        }

        const first = await registry.add(plugin)
        expect(first.ok).toBe(true)

        const second = await registry.add(plugin)

        expect(second.ok).toBe(false)
        if (!second.ok) {
            expect(second.error).toBeInstanceOf(OMSSPluginError)
            expect(second.error.message).toContain('already registered')
        }
        expect(registry.getState(plugin)).toBe(PluginState.Registered)
    })

    it('tracks registration state transitions and registration stack for nested calls', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const pluginA = async () => {
            // Nested registration should succeed but mark pluginB as registered
            await registry.add(pluginB)
        }
        const pluginB = async () => {}

        const first = await registry.add(pluginA)
        expect(first.ok).toBe(true)
        expect(registry.getState(pluginA)).toBe(PluginState.Registered)
        expect(registry.getState(pluginB)).toBe(PluginState.Registered)
    })

    it('wraps non-OMSSPluginError thrown by plugin into OMSSPluginError', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const plugin = async () => {
            throw new Error('boom')
        }

        const result = await registry.add(plugin)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSPluginError)
            expect(result.error.message).toContain('boom')
            expect(result.error.cause).toBeInstanceOf(Error)
        }
    })

    it('rejects circular plugin dependencies', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        let resA: Result<PluginState.Registered, OMSSPluginError> | undefined
        let resB: Result<PluginState.Registered, OMSSPluginError> | undefined

        const pluginA = async () => {
            resB = await registry.add(pluginB)
        }

        const pluginB = async () => {
            resA = await registry.add(pluginA)
        }

        const result = await registry.add(pluginA)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(PluginState.Registered)

        expect(resA).toBeDefined()
        expect(resA?.ok).toBe(false)

        if (resA && !resA.ok) {
            expect(resA.error).toBeInstanceOf(OMSSPluginError)
            expect(resA.error.message).toBe('Circular plugin dependency detected: pluginA -> pluginB -> pluginA')
        }

        expect(resB).toBeDefined()
        expect(resB?.ok).toBe(true)

        if (resB?.ok) {
            expect(resB.value).toBe(PluginState.Registered)
        }
    })

    it('resolves plugin options from a factory function', async () => {
        const server = createServer({ name: 'factory-test' })
        const registry = new PluginRegistry(server)

        const plugin = async (_server: OMSSServer, options: { value: string }) => {
            expect(options.value).toBe('factory-test')
        }

        const result = await registry.add(plugin, (server) => ({ value: server.config.name }))

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(PluginState.Registered)
    })

    it('preserves OMSSPluginError thrown by plugin', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const plugin = async () => {
            throw new OMSSPluginError('plugin failed')
        }

        const result = await registry.add(plugin)

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSPluginError)
            expect(result.error.message).toBe('plugin failed')
        }
    })

    it('removes plugin state after failed registration', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const plugin = async () => {
            throw new Error('failed')
        }

        const result = await registry.add(plugin)

        expect(result.ok).toBe(false)
        expect(registry.getState(plugin)).toBe(PluginState.Unavailable)
    })

    it('cleans registration stack after plugin failure', async () => {
        const server = createServer()
        const registry = new PluginRegistry(server)

        const failing = async () => {
            throw new Error('boom')
        }

        const working = async () => {}

        await registry.add(failing)

        const result = await registry.add(working)

        expect(result.ok).toBe(true)
        expect(registry.getState(working)).toBe(PluginState.Registered)
    })
})
