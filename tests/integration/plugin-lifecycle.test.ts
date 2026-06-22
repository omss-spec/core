import { describe, it, expect, vi } from 'vitest'
import { OMSSServer } from '../../src/core/server.js'
import { PluginState } from '../../src/services/plugins/types.js'
import type { OMSSPluginType } from '../../src/types/index.js'

const BASE_CONFIG = { name: 'integration-server' }

describe('Integration: Plugin Lifecycle', () => {
    it('full lifecycle: hook fires → plugin runs → state is Registered', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        const lifecycle: string[] = []
        server.addHook('onRegister', () => { lifecycle.push('hook:onRegister') })
        const plugin: OMSSPluginType<{ label: string }> = async (_s, opts) => {
            lifecycle.push(`plugin:${opts?.label}`)
        }
        await server.register(plugin, { label: 'auth' })
        expect(lifecycle).toEqual(['hook:onRegister', 'plugin:auth'])
        expect(server.getPluginState(plugin)).toBe(PluginState.Registered)
    })

    it('multiple plugins are registered in order', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        const order: string[] = []
        const pA: OMSSPluginType<void> = async () => { order.push('A') }
        const pB: OMSSPluginType<void> = async () => { order.push('B') }
        const pC: OMSSPluginType<void> = async () => { order.push('C') }
        await server.register(pA)
        await server.register(pB)
        await server.register(pC)
        expect(order).toEqual(['A', 'B', 'C'])
    })

    it('a plugin can read the server config', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        let name: string | undefined
        const plugin: OMSSPluginType<void> = async (s) => { name = s.getConfig().name }
        await server.register(plugin)
        expect(name).toBe('integration-server')
    })

    it('a plugin can register a sub-plugin on the same server', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        const sub = vi.fn<OMSSPluginType<void>>()
        const parent: OMSSPluginType<void> = async (s) => { await s.register(sub) }
        await server.register(parent)
        expect(sub).toHaveBeenCalledOnce()
        expect(server.getPluginState(sub)).toBe(PluginState.Registered)
    })

    it('options factory receives the server instance', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        let receivedPort: number | undefined
        const plugin: OMSSPluginType<{ port: number }> = async (_s, opts) => {
            receivedPort = opts?.port
        }
        await server.register(plugin, (s) => ({ port: s.getConfig().name.length }))
        expect(receivedPort).toBe('integration-server'.length)
    })

    it('failed plugin does not block subsequent plugins', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        const bad: OMSSPluginType<void> = async () => { throw new Error('init error') }
        const good = vi.fn<OMSSPluginType<void>>()
        await expect(server.register(bad)).rejects.toThrow('init error')
        await server.register(good)
        expect(server.getPluginState(bad)).toBe(PluginState.Unavailable)
        expect(server.getPluginState(good)).toBe(PluginState.Registered)
    })

    it('onRegister fires once per plugin', async () => {
        const server = new OMSSServer(BASE_CONFIG)
        const names: string[] = []
        server.addHook('onRegister', ({ plugin }) => { names.push(plugin.name) })
        const alpha: OMSSPluginType<void> = async function alpha() {}
        const beta: OMSSPluginType<void> = async function beta() {}
        await server.register(alpha)
        await server.register(beta)
        expect(names).toEqual(['alpha', 'beta'])
    })
})