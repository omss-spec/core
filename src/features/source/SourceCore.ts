import OMSSServer from '@/core/server.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { parseOMSSId } from '@/features/resolvers/utils.js'
import type { ProviderResult, UnknownProvider } from '@/types/provider.js'
import type { OMSSId, ResolverExecutionContext } from '@/types/resolver.js'
import type { GatheredSources, GetSourcesOptions } from '@/types/source.js'
import type { Result } from '@/types/utils.js'
import { OMSSSourceGatheringError } from '@/utils/error.js'
import { ERR, OK } from '@/utils/utils.js'
import { createProviderResultEmitter } from '@/features/providers/ProviderResultEmitter.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { ProviderHooks } from '@/types/hooks.js'

/**
 * Internal source gathering core.
 *
 * Handles OMSS ID parsing, provider lookup, resolver-level deduplication,
 * provider execution, and final result aggregation.
 *
 * This class intentionally does not know about OMSS Hooks, middleware, or in-flight
 * request sharing. Those concerns belong to SourceService.
 */
export class SourceCore {
    readonly #providerRegistry: ProviderRegistry
    readonly #omssServer: OMSSServer

    constructor(omssServer: OMSSServer, providerRegistry: ProviderRegistry) {
        this.#omssServer = omssServer
        this.#providerRegistry = providerRegistry
    }

    /**
     * Gather sources for a single OMSS ID.
     *
     * @param omssId - Raw OMSS identifier.
     * @param opts - Optional source gathering parameters.
     * @param providerHookRegistry - Hook registry for provider hooks.
     * @returns Aggregated provider results or a source gathering error.
     */
    async getSources(omssId: OMSSId, opts: GetSourcesOptions, providerHookRegistry: HookRegistry<ProviderHooks>): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        // try to parse the OMSS ID
        const parsed = parseOMSSId(omssId)

        if (!parsed.ok) {
            return ERR(new OMSSSourceGatheringError(`Failed to parse OMSS id "${omssId}": ${parsed.error.message}`, { cause: parsed.error }))
        }

        // we know that the id is valid now. Now we got to find the providers that can handle that namespace. If a specific provider is requested, we only look for that one.
        const providers: UnknownProvider[] = opts.providerId
            ? this.#providerRegistry.getAll((p) => p.id === opts.providerId && p.resolver.namespace === parsed.value.namespace)
            : this.#providerRegistry.getAll((p) => p.resolver.namespace === parsed.value.namespace)

        // if no provider can handle that namespace, return an error
        if (providers.length === 0) {
            return ERR(new OMSSSourceGatheringError(`No providers found for namespace "${parsed.value.namespace}"` + (opts.providerId ? ` and provider "${opts.providerId}"` : '')))
        }

        // if no abortsignal comes, just create a new one (does not abort)
        const signal = opts.abortSignal ?? new AbortController().signal

        // create the resolver context
        const ctx: ResolverExecutionContext = {
            server: this.#omssServer,
            signal,
        }

        /**
         * Resolver-level deduplication: multiple providers that share the same
         * resolver run that resolver only once, then share the result.
         */
        const resolverCache = new Map<string, Promise<Result<unknown, OMSSSourceGatheringError>>>()

        /**
         * Get resolver metadata for a provider, reusing the same resolver
         * promise when multiple providers share the same resolver.
         *
         * @param provider - Provider whose resolver metadata should be loaded.
         * @returns Resolver metadata or a source gathering error.
         */
        const getResolvedMeta = (provider: UnknownProvider): Promise<Result<unknown, OMSSSourceGatheringError>> => {
            const resolverKey = `${provider.resolver.namespace}:${provider.resolver.name}`

            let promise = resolverCache.get(resolverKey)

            if (!promise) {
                promise = (async (): Promise<Result<unknown, OMSSSourceGatheringError>> => {
                    if (signal.aborted) {
                        return ERR(new OMSSSourceGatheringError('Operation aborted'))
                    }

                    const result = await provider.resolver.resolve(parsed.value, ctx)

                    if (!result.ok) {
                        return ERR(new OMSSSourceGatheringError(`Resolver failed for ${resolverKey}: ${result.error.message}`, { cause: result.error }))
                    }

                    return OK(result.value)
                })()

                resolverCache.set(resolverKey, promise)
            }

            return promise
        }

        /**
         * Resolve sources for a single provider.
         *
         * @param provider - Provider to execute.
         * @returns Provider result or a source gathering error.
         */
        const resolveForProvider = async (provider: UnknownProvider): Promise<ProviderResult | Result<never, OMSSSourceGatheringError>> => {
            if (signal.aborted) {
                return ERR(new OMSSSourceGatheringError('Operation aborted'))
            }

            const metaResult = await getResolvedMeta(provider)

            if (!metaResult.ok) {
                return metaResult
            }

            if (signal.aborted) {
                return ERR(new OMSSSourceGatheringError('Operation aborted'))
            }

            const resultEmitter = createProviderResultEmitter(provider, providerHookRegistry)

            return provider.getSources(
                {
                    omssId: parsed.value,
                    meta: metaResult.value,
                },
                resultEmitter
            )
        }

        const settled = await Promise.allSettled(providers.map((provider) => resolveForProvider(provider)))

        if (signal.aborted) {
            return ERR(new OMSSSourceGatheringError('Operation aborted'))
        }

        const results: Extract<ProviderResult, { ok: true }>['value'][] = []
        const unexpectedErrors: unknown[] = []
        const omssErrors: Array<Extract<ProviderResult, { ok: false }>['error'] | OMSSSourceGatheringError> = []
        let hasSuccess = false

        for (const item of settled) {
            if (item.status === 'rejected') {
                unexpectedErrors.push(item.reason)
                continue
            }

            const res = item.value

            if (res.ok) {
                hasSuccess = true
                results.push(res.value)
                continue
            }

            omssErrors.push(res.error)
        }

        if (!hasSuccess) {
            return ERR(
                new OMSSSourceGatheringError(`All providers failed for namespace "${parsed.value.namespace}" and id: "${parsed.value.value}"`, {
                    cause: new AggregateError([...omssErrors, ...unexpectedErrors], 'Multiple failures detected'),
                })
            )
        }

        return OK({
            results,
            errors: omssErrors,
        })
    }
}
