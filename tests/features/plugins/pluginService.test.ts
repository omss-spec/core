import { describe, expect, it, vi } from 'vitest'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginService } from '@/features/plugins/PluginService.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { PluginState } from '@/features/plugins/plugin-state.js'
import { OMSSPluginError } from '@/utils/error.js'
import { createServer } from '../../utils.js'
import { OMSSHooks } from '@/types/hooks.js'

describe('PluginService', () => {
    it('runs hooks around successful plugin registration and exposes plugin state', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry(server)
        const hookRegistry = new HookRegistry<OMSSHooks>()
        const before = vi.fn()
        const after = vi.fn()

        hookRegistry.add('beforePluginRegister', before)
        hookRegistry.add('afterPluginRegister', after)

        const service = new PluginService(server, pluginRegistry, hookRegistry)

        const plugin = async () => {}

        const result = await service.register(plugin)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(PluginState.Registered)

        expect(before).toHaveBeenCalledTimes(1)
        expect(after).toHaveBeenCalledTimes(1)

        expect(service.getPluginState(plugin)).toBe(PluginState.Registered)
    })

    it('runs failure hook when registry.add returns error', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry(server)
        const hookRegistry = new HookRegistry<OMSSHooks>()
        const failed = vi.fn()

        hookRegistry.add('pluginRegisterFailed', failed)

        const service = new PluginService(server, pluginRegistry, hookRegistry)

        const plugin = async () => {}

        // Force duplicate registration to trigger error
        const first = await service.register(plugin)
        expect(first.ok).toBe(true)

        const second = await service.register(plugin)

        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error).toBeInstanceOf(OMSSPluginError)
        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('runs failure hook when plugin throws', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry(server)
        const hookRegistry = new HookRegistry<OMSSHooks>()
        const failed = vi.fn()

        hookRegistry.add('pluginRegisterFailed', failed)

        const service = new PluginService(server, pluginRegistry, hookRegistry)

        const plugin = async () => {
            throw new Error('boom')
        }

        const res = await service.register(plugin)

        expect(failed).toHaveBeenCalledTimes(1)
        expect(res.ok).toBe(false)
        if (!res.ok) {
            expect(res.error).toBeInstanceOf(OMSSPluginError)
            expect(res.error.message).toBe('Error: boom')
            expect(res.error.cause).toBeInstanceOf(Error)
            if (res.error.cause instanceof Error) expect(res.error.cause.message).toBe('boom')
        }
    })

    it('prevents plugins from being registered inside beforePluginRegister hook (guard tested)', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry(server)
        const hookRegistry = new HookRegistry<OMSSHooks>()

        const service = new PluginService(server, pluginRegistry, hookRegistry)

        const pluginA = async () => {}
        const pluginB = async () => {}

        hookRegistry.add('beforePluginRegister', async () => {
            const result = await service.register(pluginB)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBeInstanceOf(OMSSPluginError)
                expect(result.error.message).toContain('Plugins cannot be registered during beforePluginRegister')
            }
        })

        const result = await service.register(pluginA)
        expect(result.ok).toBe(true)
    })
})
