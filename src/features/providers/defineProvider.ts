import { type OMSSProvider } from '@/types/provider.js'
import { type OMSSResolver } from '@/types/resolver.js'

/**
 * Identity helper for defining an OMSS provider as a plain object.
 *
 * @remarks
 * This exists purely for type inference/ergonomics - it returns the same
 * object it was given, but lets TypeScript infer the provider's resolver
 * metadata shape without an explicit type argument.
 *
 * @typeParam P - The resolver this provider is bound to. Inferred from the `resolver` property.
 * @param provider - The provider implementation.
 * @returns The same `provider` object, unchanged.
 * @example
 * ```ts
 * const myProvider = defineProvider({
 *     id: 'my-provider',
 *     name: 'My Provider',
 *     enabled: true,
 *     supportsId: (id) => id.namespace === 'demo',
 *     resolver: myResolver,
 *     async getSources(request, result) {
 *         result.source({ url: 'https://example.com/stream.m3u8', header: {}, streamable: true, type: 'hls', quality: 'HD', languages: ['English'] })
 *         return result.done()
 *     },
 * })
 * ```
 */
export function defineProvider<P extends OMSSResolver<unknown>>(provider: OMSSProvider<P>): OMSSProvider<P> {
    return provider
}
