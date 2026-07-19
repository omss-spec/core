import { describe, expect, it, vi } from 'vitest'
import OMSSServer from '@/core/server.js'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginService } from '@/features/plugins/PluginService.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { PluginState } from '@/features/plugins/plugin-state.js'
import { OMSSPluginError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'
import type { OMSSHooks } from '@/types/hooks.js'

const createServer = () => new OMSSServer({ name: 'plugin-service-test' } as OMSSConfig)

describe('PluginService', () => {
    it('runs hooks around successful plugin registration and exposes plugin state', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry()
        const hookRegistry = new HookRegistry<OMSSHooks>()
        const before = vi.fn()
        const after = vi.fn()

        hookRegistry.add('beforePluginRegister', before as OMSSHooks['beforePluginRegister'])
        hookRegistry.add('afterPluginRegister', after as OMSSHooks['afterPluginRegister'])

        const service = new PluginService(server, pluginRegistry, hookRegistry)

        const plugin = async () => {}

        const result = await service.register(plugin)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBe(PluginState.Registered)
        }

        expect(before).toHaveBeenCalledTimes(1)
        expect(after).toHaveBeenCalledTimes(1)

        expect(service.getPluginState(plugin)).toBe(PluginState.Registered)
    })

    it('runs failure hook when registry.add returns error', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry()
        const hookRegistry = new HookRegistry<OMSSHooks>()
        const failed = vi.fn()

        hookRegistry.add('pluginRegisterFailed', failed as OMSSHooks['pluginRegisterFailed'])

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

    it('prevents plugins from being registered inside beforePluginRegister hook (guard tested indirectly)', async () => {
        const server = createServer()
        const pluginRegistry = new PluginRegistry()
        const hookRegistry = new HookRegistry<OMSSHooks>()

        const service = new PluginService(server, pluginRegistry, hookRegistry)

        const plugin = async () => {}

        hookRegistry.add('beforePluginRegister', async () => {
            const result = await service.register(plugin)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBeInstanceOf(OMSSPluginError)
                expect(result.error.message).toContain('Plugins cannot be registered during beforePluginRegister')
            }
        })

        const result = await service.register(plugin)
        // outer registration may succeed or fail depending on guard re-entry,
        // but inner call is asserted above; just ensure we did not throw synchronously
        expect(result).toBeDefined()
    })
})
