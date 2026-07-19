import { describe, it, expect } from 'vitest'
import {
    SAFE_UNIQUE_STRING,
    HLS_REGEX,
    MP4_REGEX,
    DASH_REGEX,
    MKV_REGEX,
    VTT_REGEX,
    SRT_REGEX,
    CATALOG_ENTRY,
} from '@/utils/regexp.js'

describe('SAFE_UNIQUE_STRING', () => {
    it('matches lowercase letters, numbers, and hyphens', () => {
        expect(SAFE_UNIQUE_STRING.test('abc')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('abc-123')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('abc-123-xyz')).toBe(true)
    })

    it('rejects uppercase, spaces, and other special characters', () => {
        expect(SAFE_UNIQUE_STRING.test('ABC')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('with space')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('invalid!')).toBe(false)
    })
})

describe('media format regexes', () => {
    it('HLS_REGEX matches hls keyword and HLS-related extensions', () => {
        expect('hls stream'.match(HLS_REGEX)).toBeTruthy()
        expect('video.m3u8'.match(HLS_REGEX)).toBeTruthy()
        expect('segment.ts?token=abc'.match(HLS_REGEX)).toBeTruthy()
        expect('no match.mp4'.match(HLS_REGEX)).toBeFalsy()
    })

    it('MP4_REGEX matches mp4 keyword and .mp4 extension', () => {
        expect('mp4 format'.match(MP4_REGEX)).toBeTruthy()
        expect('movie.mp4#fragment'.match(MP4_REGEX)).toBeTruthy()
        expect('image.png'.match(MP4_REGEX)).toBeFalsy()
    })

    it('DASH_REGEX matches dash keyword and DASH-related extensions', () => {
        expect('dash manifest'.match(DASH_REGEX)).toBeTruthy()
        expect('stream.mpd?query'.match(DASH_REGEX)).toBeTruthy()
        expect('audio.m4a'.match(DASH_REGEX)).toBeTruthy()
        expect('file.avi'.match(DASH_REGEX)).toBeFalsy()
    })

    it('MKV_REGEX matches mkv keyword and .mkv extension', () => {
        expect('mkv container'.match(MKV_REGEX)).toBeTruthy()
        expect('video.mkv'.match(MKV_REGEX)).toBeTruthy()
        expect('file.mov'.match(MKV_REGEX)).toBeFalsy()
    })

    it('VTT_REGEX matches vtt keyword and .vtt extension', () => {
        expect('vtt subtitles'.match(VTT_REGEX)).toBeTruthy()
        expect('subs.vtt?lang=en'.match(VTT_REGEX)).toBeTruthy()
        expect('subs.srt'.match(VTT_REGEX)).toBeFalsy()
    })

    it('SRT_REGEX matches srt keyword and .srt extension', () => {
        expect('srt subtitles'.match(SRT_REGEX)).toBeTruthy()
        expect('subs.srt#track'.match(SRT_REGEX)).toBeTruthy()
        expect('subs.vtt'.match(SRT_REGEX)).toBeFalsy()
    })
})

describe('CATALOG_ENTRY', () => {
    it('allows wildcard "*"', () => {
        expect(CATALOG_ENTRY.test('*')).toBe(true)
    })

    it('allows non-empty, whitespace-free strings', () => {
        expect(CATALOG_ENTRY.test('abc')).toBe(true)
        expect(CATALOG_ENTRY.test('abc-123')).toBe(true)
        expect(CATALOG_ENTRY.test('id_with_underscore')).toBe(true)
    })

    it('rejects empty strings and strings with whitespace', () => {
        expect(CATALOG_ENTRY.test('')).toBe(false)
        expect(CATALOG_ENTRY.test('  ')).toBe(false)
        expect(CATALOG_ENTRY.test('has space')).toBe(false)
    })
})
