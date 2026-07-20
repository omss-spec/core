import { describe, expect, it, vi } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { createProviderResultEmitter } from '@/features/providers/ProviderResultEmitter.js'
import { OMSSProviderError } from '@/utils/error.js'
import { createProvider } from '../../utils.js'
import { ProviderHooks } from '@/types/hooks.js'

describe('createProviderResultEmitter', () => {
    it('emits sources, subtitles, and aggregates errors with hooks', () => {
        const provider = createProvider()
        const hookRegistry = new HookRegistry<ProviderHooks>()

        const sourceHook = vi.fn()
        const subtitleHook = vi.fn()
        const errorHook = vi.fn()
        const doneHook = vi.fn()

        hookRegistry.add('source', sourceHook)
        hookRegistry.add('subtitle', subtitleHook)
        hookRegistry.add('error', errorHook)
        hookRegistry.add('done', doneHook)

        const emitter = createProviderResultEmitter(provider, hookRegistry, (_) => _)

        emitter.source({ type: 'hls', url: 'https://example.com', header: {}, streamable: true, quality: 'HD' })
        emitter.subtitle({ format: 'vtt', url: 'https://example.com/subs.vtt', label: 'English SDH', header: {} })

        const error = new OMSSProviderError('non-fatal', { cause: 'detail' })
        emitter.error(error)

        const result = emitter.done()

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.sources).toHaveLength(1)
            expect(result.value.subtitles).toHaveLength(1)
            expect(result.value.errors).toHaveLength(1)
        }

        expect(sourceHook).toHaveBeenCalledTimes(1)
        expect(subtitleHook).toHaveBeenCalledTimes(1)
        // error hook called once for non-fatal error
        expect(errorHook).toHaveBeenCalledTimes(1)
        expect(doneHook).toHaveBeenCalledTimes(1)
    })

    it('fatal aggregates accumulated errors and returns ERR', () => {
        const provider = createProvider()
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const errorHook = vi.fn()

        hookRegistry.add('error', errorHook)

        const emitter = createProviderResultEmitter(provider, hookRegistry, (_) => _)

        const nonFatal = new OMSSProviderError('non-fatal')
        emitter.error(nonFatal)

        const fatalError = new OMSSProviderError('fatal')
        const result = emitter.fatal(fatalError)

        expect(result.ok).toBe(false)
        expect(result.error).toBeInstanceOf(OMSSProviderError)
        expect(result.error.message).toContain('fatal')
        expect(result.error.cause).toBeInstanceOf(AggregateError)
        // error hook called twice: once for non-fatal error, once for fatal
        expect(errorHook).toHaveBeenCalledTimes(2)
    })
})
