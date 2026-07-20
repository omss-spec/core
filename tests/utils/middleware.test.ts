import { describe, expect, it } from 'vitest'
import type { MiddlewareOperationMap } from '@/types/middleware.js'
import { createRunner } from '../utils.js'

interface TestOperations extends MiddlewareOperationMap {
    log: {
        context: { messages: string[] }
        result: string[]
    }
}

describe('MiddlewareRunner', () => {
    it('executes final handler when there is no middleware', async () => {
        const runner = createRunner<TestOperations>()
        const context = { messages: ['a'] }

        const result = await runner.run('log', context, async () => context.messages)

        expect(result).toEqual(['a'])
    })

    it('runs middleware chain in registration order', async () => {
        const runner = createRunner<TestOperations>()
        const context: { messages: string[] } = { messages: [] }

        runner.use('log', async (ctx, next) => {
            ctx.messages.push('first')
            return next()
        })

        runner.use('log', async (ctx, next) => {
            ctx.messages.push('second')
            return next()
        })

        const result = await runner.run('log', context, async () => {
            context.messages.push('final')
            return context.messages
        })

        expect(result).toEqual(['first', 'second', 'final'])
    })

    it('prevents next being called multiple times', async () => {
        const runner = createRunner<TestOperations>()
        const context: { messages: string[] } = { messages: [] }

        runner.use('log', async (ctx, next) => {
            ctx.messages.push('one')
            await next()
            expect(next()).rejects.toThrow('next() called multiple times')
            return ctx.messages
        })

        const result = await runner.run('log', context, async () => {
            context.messages.push('final')
            return context.messages
        })

        expect(result).toEqual(['one', 'final'])
    })

    it('propagates errors thrown in middleware', async () => {
        const runner = createRunner<TestOperations>()
        const context = { messages: [] }
        const error = new Error('middleware failed')

        runner.use('log', async () => {
            throw error
        })

        expect(runner.run('log', context, async () => context.messages)).rejects.toThrow(error)
    })
})
