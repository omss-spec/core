import { type OMSSProvider } from '@/types/provider.js'
import { type OMSSResolver } from '@/types/resolver.js'

/**
 * Identity helper for defining an OMSS provider as a plain object.
 *
 * This exists purely for type inference/ergonomics — it returns the same
 * object it was given, but lets TypeScript infer the provider's resolver
 * metadata shape without an explicit type argument.
 *
 * @param provider - The provider implementation.
 */
export function defineProvider<P extends OMSSResolver<unknown>>(provider: OMSSProvider<P>): OMSSProvider<P> {
    return provider
}
