import { type OMSSResolver } from '@/types/resolver.js'

/**
 * Identity helper for defining an OMSS resolver as a plain object.
 *
 * @remarks
 * This exists purely for type inference/ergonomics - it returns the same
 * object it was given, but lets TypeScript infer the resolver's metadata
 * shape without an explicit type argument.
 *
 * @typeParam T - The shape of the metadata this resolver produces. Inferred from `resolve()`'s return type.
 * @param resolver - The resolver implementation.
 * @returns The same `resolver` object, unchanged.
 * @example
 * ```ts
 * const myResolver = defineResolver({
 *     namespace: 'demo',
 *     name: 'Demo Resolver',
 *     converter: new Map(),
 *     async resolve(id) {
 *         return OK({ title: `Demo Movie #${id.values[0]}` })
 *     },
 * })
 * ```
 */
export function defineResolver<T>(resolver: OMSSResolver<T>): OMSSResolver<T> {
    return resolver
}
