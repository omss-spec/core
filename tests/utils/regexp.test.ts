import { describe, expect, it } from 'vitest'
import { CATALOG_ENTRY, DASH_REGEX, HLS_REGEX, MKV_REGEX, MP4_REGEX, SAFE_UNIQUE_STRING, SRT_REGEX, VTT_REGEX } from '@/utils/regexp.js'

describe('SAFE_UNIQUE_STRING', () => {
    it('accepts valid namespace names', () => {
        expect(SAFE_UNIQUE_STRING.test('a')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('abc')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('abc-123')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('abc-123-xyz')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('0')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('123')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('a-b-c-d')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('9-test-0')).toBe(true)
    })

    it('rejects invalid namespace names', () => {
        expect(SAFE_UNIQUE_STRING.test('')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('ABC')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('Abc')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('with space')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test(' leading')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('trailing ')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('under_score')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('dot.name')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('slash/name')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('invalid!')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('äbc')).toBe(false)
    })
})

describe('HLS_REGEX', () => {
    it('matches HLS URLs', () => {
        expect(HLS_REGEX.test('https://cdn.example.com/live/master.m3u8')).toBe(true)
        expect(HLS_REGEX.test('https://cdn.example.com/live/master.m3u8?token=abc')).toBe(true)
        expect(HLS_REGEX.test('https://cdn.example.com/live/master.m3u8#player')).toBe(true)
        expect(HLS_REGEX.test('https://cdn.example.com/live/master.m3u8/playlist')).toBe(true)
        expect(HLS_REGEX.test('https://cdn.example.com/live/segment.ts')).toBe(true)
    })

    it('matches the hls format keyword', () => {
        expect(HLS_REGEX.test('format=hls')).toBe(true)
        expect(HLS_REGEX.test('type=HLS')).toBe(true)
    })

    it('does not match non-HLS URLs', () => {
        expect(HLS_REGEX.test('https://cdn.example.com/video.mp4')).toBe(false)
        expect(HLS_REGEX.test('https://cdn.example.com/master.m3u8.bak')).toBe(false)
        expect(HLS_REGEX.test('https://cdn.example.com/segment.tsx')).toBe(false)
        expect(HLS_REGEX.test('https://example.com/myhlsstream')).toBe(false)
    })
})

describe('MP4_REGEX', () => {
    it('matches MP4 URLs', () => {
        expect(MP4_REGEX.test('https://cdn.example.com/video.mp4')).toBe(true)
        expect(MP4_REGEX.test('https://cdn.example.com/video.mp4?quality=1080')).toBe(true)
        expect(MP4_REGEX.test('https://cdn.example.com/video.mp4#t=60')).toBe(true)
        expect(MP4_REGEX.test('https://cdn.example.com/video.mp4/download')).toBe(true)
    })

    it('matches the mp4 format keyword', () => {
        expect(MP4_REGEX.test('format=mp4')).toBe(true)
        expect(MP4_REGEX.test('FORMAT=MP4')).toBe(true)
    })

    it('does not match non-MP4 URLs', () => {
        expect(MP4_REGEX.test('https://cdn.example.com/video.mp4a')).toBe(false)
        expect(MP4_REGEX.test('https://cdn.example.com/video.mkv')).toBe(false)
        expect(MP4_REGEX.test('https://example.com/mymp4video')).toBe(false)
    })
})

describe('DASH_REGEX', () => {
    it('matches DASH URLs', () => {
        expect(DASH_REGEX.test('https://cdn.example.com/manifest.mpd')).toBe(true)
        expect(DASH_REGEX.test('https://cdn.example.com/manifest.mpd?token=abc')).toBe(true)
        expect(DASH_REGEX.test('https://cdn.example.com/audio.m4a')).toBe(true)
        expect(DASH_REGEX.test('https://cdn.example.com/audio.m4a#track')).toBe(true)
    })

    it('matches the dash format keyword', () => {
        expect(DASH_REGEX.test('format=dash')).toBe(true)
        expect(DASH_REGEX.test('FORMAT=DASH')).toBe(true)
    })

    it('does not match non-DASH URLs', () => {
        expect(DASH_REGEX.test('https://cdn.example.com/dashboard')).toBe(false)
        expect(DASH_REGEX.test('https://cdn.example.com/manifest.mpd1')).toBe(false)
        expect(DASH_REGEX.test('https://cdn.example.com/video.mp4')).toBe(false)
    })
})

describe('MKV_REGEX', () => {
    it('matches MKV URLs', () => {
        expect(MKV_REGEX.test('https://cdn.example.com/movie.mkv')).toBe(true)
        expect(MKV_REGEX.test('https://cdn.example.com/movie.mkv?download=1')).toBe(true)
        expect(MKV_REGEX.test('https://cdn.example.com/movie.mkv#chapter')).toBe(true)
        expect(MKV_REGEX.test('https://cdn.example.com/movie.mkv/play')).toBe(true)
    })

    it('matches the mkv format keyword', () => {
        expect(MKV_REGEX.test('format=mkv')).toBe(true)
        expect(MKV_REGEX.test('FORMAT=MKV')).toBe(true)
    })

    it('does not match non-MKV URLs', () => {
        expect(MKV_REGEX.test('https://cdn.example.com/movie.mkv1')).toBe(false)
        expect(MKV_REGEX.test('https://cdn.example.com/movie.mp4')).toBe(false)
        expect(MKV_REGEX.test('https://example.com/mkvfile')).toBe(false)
    })
})

describe('VTT_REGEX', () => {
    it('matches VTT URLs', () => {
        expect(VTT_REGEX.test('https://cdn.example.com/subtitles/en.vtt')).toBe(true)
        expect(VTT_REGEX.test('https://cdn.example.com/subtitles/en.vtt?lang=en')).toBe(true)
        expect(VTT_REGEX.test('https://cdn.example.com/subtitles/en.vtt#captions')).toBe(true)
    })

    it('matches the vtt format keyword', () => {
        expect(VTT_REGEX.test('format=vtt')).toBe(true)
        expect(VTT_REGEX.test('FORMAT=VTT')).toBe(true)
    })

    it('does not match non-VTT URLs', () => {
        expect(VTT_REGEX.test('https://cdn.example.com/subtitles/en.vtt1')).toBe(false)
        expect(VTT_REGEX.test('https://cdn.example.com/subtitles/en.srt')).toBe(false)
        expect(VTT_REGEX.test('https://example.com/vttfile')).toBe(false)
    })
})

describe('SRT_REGEX', () => {
    it('matches SRT URLs', () => {
        expect(SRT_REGEX.test('https://cdn.example.com/subtitles/en.srt')).toBe(true)
        expect(SRT_REGEX.test('https://cdn.example.com/subtitles/en.srt?lang=en')).toBe(true)
        expect(SRT_REGEX.test('https://cdn.example.com/subtitles/en.srt#captions')).toBe(true)
    })

    it('matches the srt format keyword', () => {
        expect(SRT_REGEX.test('format=srt')).toBe(true)
        expect(SRT_REGEX.test('FORMAT=SRT')).toBe(true)
    })

    it('does not match non-SRT URLs', () => {
        expect(SRT_REGEX.test('https://cdn.example.com/subtitles/en.srt1')).toBe(false)
        expect(SRT_REGEX.test('https://cdn.example.com/subtitles/en.vtt')).toBe(false)
        expect(SRT_REGEX.test('https://example.com/srtfile')).toBe(false)
    })
})

describe('CATALOG_ENTRY', () => {
    it('accepts "*" or a valid safe unique string', () => {
        expect(CATALOG_ENTRY.test('*')).toBe(true)

        expect(CATALOG_ENTRY.test('a')).toBe(true)
        expect(CATALOG_ENTRY.test('abc')).toBe(true)
        expect(CATALOG_ENTRY.test('123')).toBe(true)
        expect(CATALOG_ENTRY.test('abc-123')).toBe(true)
        expect(CATALOG_ENTRY.test('a-b-c')).toBe(true)
        expect(CATALOG_ENTRY.test('0-test-9')).toBe(true)
    })

    it('rejects invalid entries', () => {
        expect(CATALOG_ENTRY.test('')).toBe(false)

        expect(CATALOG_ENTRY.test(' ')).toBe(false)
        expect(CATALOG_ENTRY.test('has space')).toBe(false)
        expect(CATALOG_ENTRY.test(' leading')).toBe(false)
        expect(CATALOG_ENTRY.test('trailing ')).toBe(false)
        expect(CATALOG_ENTRY.test('line\nbreak')).toBe(false)
        expect(CATALOG_ENTRY.test('tab\tcharacter')).toBe(false)

        expect(CATALOG_ENTRY.test('ABC')).toBe(false)
        expect(CATALOG_ENTRY.test('Abc')).toBe(false)
        expect(CATALOG_ENTRY.test('id_with_underscore')).toBe(false)
        expect(CATALOG_ENTRY.test('provider:id')).toBe(false)
        expect(CATALOG_ENTRY.test('movie/123')).toBe(false)
        expect(CATALOG_ENTRY.test('https://example.com')).toBe(false)
        expect(CATALOG_ENTRY.test('😀')).toBe(false)
        expect(CATALOG_ENTRY.test('invalid!')).toBe(false)
    })

    it('only accepts "*" as the wildcard', () => {
        expect(CATALOG_ENTRY.test('*')).toBe(true)

        expect(CATALOG_ENTRY.test('**')).toBe(false)
        expect(CATALOG_ENTRY.test('*abc')).toBe(false)
        expect(CATALOG_ENTRY.test('abc*')).toBe(false)
        expect(CATALOG_ENTRY.test('*-*')).toBe(false)
    })
})
