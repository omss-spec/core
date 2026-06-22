import { describe, it, expect, vi } from 'vitest'
import { OMSSServer } from '../../../src/core/server.js'
import { PluginState } from '../../../src/services/plugins/types.js'
import type { OMSSPluginType } from '../../../src/types/index.js'

const BASE_CONFIG = { name: 'test-server' }

describe('OMSSServer', () => {
    describe('getConfig()', () => {
        it('returns the config passed to the constructor', () => {
            const server = new OMSSServer(BASE_CONFIG)
            expect(server.getConfig()).toStrictEqual(BASE_CONFIG)
        })

        it('returns the same reference on every call', () => {
            const server = new OMSSServer(BASE_CONFIG)
            expect(server.getConfig()).toBe(server.getConfig())
        })
    })

    describe('register()', () => {
        it('calls the plugin with the server instance', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            const plugin = vi.fn<OMSSPluginType<void>>()
            await server.register(plugin)
            expect(plugin).toHaveBeenCalledWith(server, undefined)
        })

        it('passes options to the plugin', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            const plugin = vi.fn<OMSSPluginType<{ debug: boolean }>>()
            await server.register(plugin, { debug: true })
            expect(plugin).toHaveBeenCalledWith(server, { debug: true })
        })

        it('fires onRegister hook before the plugin executes', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            const hookOrder: string[] = []
            server.addHook('onRegister', () => hookOrder.push('hook'))
            const plugin: OMSSPluginType<void> = async () => { hookOrder.push('plugin') }
            await server.register(plugin)
            expect(hookOrder[0]).toBe('hook')
        })

        it('throws when the same plugin is registered twice', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            const plugin = vi.fn<OMSSPluginType<void>>()
            await server.register(plugin)
            await expect(server.register(plugin)).rejects.toThrow(/already registered/)
        })
    })

    describe('getPluginState()', () => {
        it('returns Unavailable for an unregistered plugin', () => {
            const server = new OMSSServer(BASE_CONFIG)
            expect(server.getPluginState(vi.fn())).toBe(PluginState.Unavailable)
        })

        it('returns Registered after successful registration', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            const plugin = vi.fn<OMSSPluginType<void>>()
            await server.register(plugin)
            expect(server.getPluginState(plugin)).toBe(PluginState.Registered)
        })
    })

    describe('addHook()', () => {
        it('hook is called on the correct lifecycle event', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            const onRegister = vi.fn()
            server.addHook('onRegister', onRegister)
            await server.register(vi.fn<OMSSPluginType<void>>())
            expect(onRegister).toHaveBeenCalledOnce()
        })

        it('passes plugin reference in onRegister payload', async () => {
            const server = new OMSSServer(BASE_CONFIG)
            let received: unknown
            server.addHook('onRegister', (payload) => { received = payload })
            const plugin = vi.fn<OMSSPluginType<void>>()
            await server.register(plugin)
            expect((received as { plugin: unknown }).plugin).toBe(plugin)
        })
    })
})