import { describe, expect, it } from 'vitest'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { parseOMSSId } from '@/features/resolvers/utils.js'
import { OMSSResolverError } from '@/utils/error.js'
import type { ParsedOMSSId, ResolverExecutionContext } from '@/types/resolver.js'

class TestResolver extends BaseResolver<{ id: string }> {
    namespace = 'test'
    name = 'resolver'

    async resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<any> {
        expect(ctx.server).toBeDefined()
        return { ok: true, value: { id: id.value } }
    }
}

describe('BaseResolver', () => {
    it('defines abstract API for resolvers', async () => {
        const resolver = new TestResolver()
        expect(resolver.namespace).toBe('test')
        expect(resolver.name).toBe('resolver')
    })
})

describe('parseOMSSId', () => {
    it('rejects whitespace in id', () => {
        const result = parseOMSSId('bad id')
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSResolverError)
            expect(result.error.message).toContain('cannot contain whitespace')
        }
    })

    it('rejects missing namespace separator', () => {
        const result = parseOMSSId('nonamespace')
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.message).toContain('missing namespace separator')
    })

    it('rejects invalid namespace format', () => {
        const result = parseOMSSId('BAD:123')
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSResolverError)
    })

    it('rejects empty value part', () => {
        const result = parseOMSSId('ns:')
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSResolverError)
            expect(result.error.message).toContain('value cannot be empty')
        }
    })

    it('parses valid id into namespace and value', () => {
        const result = parseOMSSId('ns:123')
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.namespace).toBe('ns')
            expect(result.value.value).toBe('123')
            expect(result.value.raw).toBe('ns:123')
        }
    })
})
