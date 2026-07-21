import { describe, expect, it, vi } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { createProviderResultEmitter } from '@/features/providers/ProviderResultEmitter.js'
import { OMSSProviderError } from '@/utils/error.js'
import { createProvider, createProviderEmitter } from '../../utils.js'
import { ProviderHooks } from '@/types/hooks.js'
import { SourceQuality } from '@/types/provider.js'
import { ParsedOMSSId } from '@/types/resolver.js'

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

        const emitter = createProviderResultEmitter(provider, hookRegistry, (_) => _, {} as ParsedOMSSId)

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

        const emitter = createProviderResultEmitter(provider, hookRegistry, (_) => _, {} as ParsedOMSSId)

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

describe('ProviderResultEmitter – utils.source.parseType', () => {
    it('returns hls for an HLS url', () => {
        const { utils } = createProviderEmitter()
        expect(utils.source.parseType('https://example.com/stream.m3u8')).toBe('hls')
    })

    it('returns mp4 for an mp4 url', () => {
        const { utils } = createProviderEmitter()
        expect(utils.source.parseType('https://example.com/video.mp4')).toBe('mp4')
    })

    it('returns dash for a DASH manifest', () => {
        const { utils } = createProviderEmitter()
        expect(utils.source.parseType('https://example.com/manifest.mpd')).toBe('dash')
    })

    it('returns mkv for an mkv url', () => {
        const { utils } = createProviderEmitter()
        expect(utils.source.parseType('https://example.com/video.mkv')).toBe('mkv')
    })

    it('defaults to hls for unknown types', () => {
        const { utils } = createProviderEmitter()
        expect(utils.source.parseType('https://example.com/unknown')).toBe('hls')
    })
})

describe('ProviderResultEmitter – utils.source.parseQuality', () => {
    const cases: [string, SourceQuality][] = [
        ['', 'Auto'],
        ['8k', '8K'],
        ['4k', '4K'],
        ['uhd', '4K'],
        ['2160p', '4K'],
        ['1440p', 'QHD'],
        ['qhd', 'QHD'],
        ['1080p', 'FHD'],
        ['fhd', 'FHD'],
        ['720p', 'HD'],
        ['hd', 'HD'],
        ['480p', 'SD'],
        ['sd', 'SD'],
        ['360p', 'SD'],
        ['25mbps', '4K'],
        ['8mbps', 'FHD'],
        ['3mbps', 'HD'],
        ['1mbps', 'SD'],
        ['240p', 'SD'],
        ['video_4320p.mp4', '8K'],
        ['video_4321p.mp4', '8K'],
        ['video_2160p.mp4', '4K'],
        ['video_2160x2160.mp4', '4K'],
        ['video_1440p.mp4', 'QHD'],
        ['video_1440x2560.mp4', 'QHD'],
        ['video_1080p.mp4', 'FHD'],
        ['video_1080x1920.mp4', 'FHD'],
        ['video_720p.mp4', 'HD'],
        ['video_720x1280.mp4', 'HD'],
        ['video_480p.mp4', 'SD'],
        ['video_360p.mp4', 'SD'],
        ['video_240p.mp4', 'SD'],
        ['video_4319p.mp4', '4K'],
        ['video_2159p.mp4', 'QHD'],
        ['video_1439p.mp4', 'FHD'],
        ['video_1079p.mp4', 'HD'],
        ['video_719p.mp4', 'SD'],
        ['movie-1080x1920.mp4', 'FHD'],
        ['movie-2160x3840.mp4', '4K'],
        ['movie-4320x7680.mp4', '8K'],
        ['movie-600x900.mp4', 'SD'],
        ['movie-000p.mp4', 'Auto'],
        ['2kbps', 'SD'],
        ['unknown-quality', 'Auto'],
    ]

    for (const [input, expected] of cases) {
        it(`parseQuality("${input}") → ${expected}`, () => {
            const { utils } = createProviderEmitter()
            expect(utils.source.parseQuality(input)).toBe(expected)
        })
    }

    it('parseQuality returns correct quality for kbps bitrates', () => {
        const { utils } = createProviderEmitter()

        expect(utils.source.parseQuality('25000kbps')).toBe('4K')
        expect(utils.source.parseQuality('8000kbps')).toBe('8K')
        expect(utils.source.parseQuality('3000kbps')).toBe('4K')
        expect(utils.source.parseQuality('1000kbps')).toBe('HD')
    })
})

describe('ProviderResultEmitter – utils.subtitle.parseFormat', () => {
    it('returns vtt for a .vtt url', () => {
        const { utils } = createProviderEmitter()
        expect(utils.subtitle.parseFormat('https://example.com/subs.vtt')).toBe('vtt')
    })

    it('returns srt for a .srt url', () => {
        const { utils } = createProviderEmitter()
        expect(utils.subtitle.parseFormat('https://example.com/subs.srt')).toBe('srt')
    })

    it('defaults to vtt for unknown format', () => {
        const { utils } = createProviderEmitter()
        expect(utils.subtitle.parseFormat('unknown')).toBe('vtt')
    })
})

describe('ProviderResultEmitter – emit / debug / info / warn', () => {
    it('emit calls hook with provided data', () => {
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const hook = vi.fn()
        hookRegistry.add('custom.event', hook)

        const emitter = createProviderEmitter(hookRegistry)
        emitter.emit('custom.event', { foo: 'bar' })

        expect(hook).toHaveBeenCalledTimes(1)
    })

    it('emit ignores reserved action names', () => {
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const hook = vi.fn()
        hookRegistry.add('source', hook)

        const emitter = createProviderEmitter(hookRegistry)
        emitter.emit('source', {})

        // "source" is a key on the emitter itself — should be blocked
        expect(hook).not.toHaveBeenCalled()
    })

    it('emit ignores actions with whitespace', () => {
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const hook = vi.fn()
        hookRegistry.add('bad event', hook)

        const emitter = createProviderEmitter(hookRegistry)
        emitter.emit('bad event', {})

        expect(hook).not.toHaveBeenCalled()
    })

    it('debug / info / warn run their respective hooks', () => {
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const debugHook = vi.fn()
        const infoHook = vi.fn()
        const warnHook = vi.fn()

        hookRegistry.add('debug', debugHook)
        hookRegistry.add('info', infoHook)
        hookRegistry.add('warn', warnHook)

        const emitter = createProviderEmitter(hookRegistry)
        emitter.debug('d')
        emitter.info('i')
        emitter.warn('w')

        expect(debugHook).toHaveBeenCalledTimes(1)
        expect(infoHook).toHaveBeenCalledTimes(1)
        expect(warnHook).toHaveBeenCalledTimes(1)
    })
})

describe('ProviderResultEmitter – source with audioTracks', () => {
    it('applies cleaning function to audio tracks', () => {
        const clean = vi.fn((obj) => ({ ...obj, url: obj.url + '?cleaned', header: {} }))
        const emitter = createProviderResultEmitter(createProvider(), new HookRegistry<ProviderHooks>(), clean, {} as ParsedOMSSId)

        emitter.source({
            type: 'hls',
            url: 'https://example.com/stream.m3u8',
            header: {},
            streamable: true,
            quality: 'HD',
            audioTracks: [
                { url: 'https://example.com/audio1.m3u8', header: {}, label: 'English' },
                { url: 'https://example.com/audio2.m3u8', header: {}, label: 'French' },
            ],
        })

        const result = emitter.done()
        expect(result.ok).toBe(true)
        if (result.ok) {
            const src = result.value.sources[0]
            expect(src).toBeDefined()
            if (src) {
                expect(src.audioTracks).toBeDefined()
            }
        }
        expect(clean).toHaveBeenCalledTimes(3)
    })
})
