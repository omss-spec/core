import { type OMSSResolver } from '@/types/resolver.js'

/**
 * Identity helper for defining an OMSS resolver as a plain object.
 *
 * This exists purely for type inference/ergonomics — it returns the same
 * object it was given, but lets TypeScript infer the resolver's metadata
 * shape without an explicit type argument.
 *
 * @param resolver - The resolver implementation.
 */
export function defineResolver<T>(resolver: OMSSResolver<T>): OMSSResolver<T> {
    return resolver
}
