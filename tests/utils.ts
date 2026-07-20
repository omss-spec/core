/**
 * Utils for testing different parts of the framework.
 *
 * This file is overlapping into other test files and is not part of the public API or the /tests/utils folder.
 */
import OMSSServer from '@/core/server.js'
import { OMSSConfig } from '@/types/config.js'
import { AsyncDeduper } from '@/utils/AsyncDeduper.js'
import { MiddlewareRunner } from '@/utils/middleware.js'
import { MiddlewareOperationMap } from '@/types/middleware.js'
import { Extractor } from '@/types/extractor.js'
import { vi } from 'vitest'
import { ERR, OK } from '@/utils/utils.js'
import { OMSSExtractorError, OMSSResolverError } from '@/utils/error.js'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { OMSSId, ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'
import { Result } from '@/types/utils.js'
import { OMSSProvider } from '@/types/provider.js'
import { ProviderService } from '@/features/providers/ProviderService.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { OMSSHooks, ProviderHooks } from '@/types/hooks.js'

/**
 * Create a new {@link OMSSServer} instance.
 * @param config - Optional configuration for the server.
 */
export const createServer = (config?: Partial<OMSSConfig>) => new OMSSServer({ name: 'plugin-test', ...config })

/**
 * Create a new OMSSConfig instance.
 * @param overrides - Optional overrides for the config.
 */
export const createOMSSServerConfig = (overrides: Partial<OMSSConfig> = {}): OMSSConfig => ({
    name: 'test-server',
    ...overrides,
})

/**
 * Create a new {@link AsyncDeduper} instance.
 * @typeParam T - The type of the deduplication key.
 * @typeParam V - The type of the deduplicated items.
 */
export const createAsyncDeduper = <T = string, V = number>() => new AsyncDeduper<T, V>()

/**
 * Create a new {@link MiddlewareRunner} instance.
 * @typeParam T - The type of the middleware operation map.
 */
export const createRunner = <T extends MiddlewareOperationMap>() => new MiddlewareRunner<T>()

/**
 * Create an {@link Extractor} with {@link vi.fn} functions.
 * @param matches - Whether the matcher should return a match or not. Defaults to true.
 */
export function createExtractor(matches = true): Extractor {
    return {
        matcher: vi.fn().mockResolvedValue(matches ? OK() : ERR(new OMSSExtractorError('no match'))),
        parse: vi.fn(),
    }
}

/**
 * Default response returned by test resolvers.
 */
const DEFAULT_RESOLVER_RESPONSE = { value: '' }

/**
 * Create a test {@link BaseResolver}.
 *
 * @typeParam T - The type of the resolved value.
 * @param response - The default response returned by the resolver.
 * @param resolve - Custom resolve implementation.
 * @param overrides - Properties to override on the resolver instance.
 */
export function createResolver<T extends object = typeof DEFAULT_RESOLVER_RESPONSE>(
    response: T = DEFAULT_RESOLVER_RESPONSE as T,
    resolve: (id: ParsedOMSSId, ctx: ResolverExecutionContext) => Promise<ResolverResult<T>> = async () => OK(response),
    overrides: Partial<BaseResolver<T>> = {}
): BaseResolver<T> {
    const resolveImpl = resolve

    class Resolver extends BaseResolver<T> {
        /** The resolver name. */
        name = 'test-resolver'

        /** The resolver namespace. */
        namespace = 'test'

        /** ID converters supported by the resolver. */
        converter = new Map<string, (id: OMSSId, ctx: ResolverExecutionContext) => Promise<Result<OMSSId, OMSSResolverError>>>()

        /** Resolve an ID. */
        resolve = resolveImpl
    }

    return Object.assign(new Resolver(), overrides)
}

/**
 * Create a test {@link OMSSProvider}.
 *
 * @typeParam R - The resolver type used by the provider.
 * @param resolver - The resolver exposed by the provider.
 * @param getSources - Custom source retrieval implementation.
 * @param overrides - Properties to override on the provider instance.
 */
export function createProvider<R extends BaseResolver<unknown> = ReturnType<typeof createResolver>>(
    resolver: R = createResolver() as R,
    getSources: OMSSProvider<R>['getSources'] = async (_req, result) => result.done(),
    overrides: Partial<OMSSProvider<R>> = {}
): OMSSProvider<R> {
    const getSourcesImpl = getSources

    class Provider implements OMSSProvider<R> {
        /** The provider ID. */
        id = 'test-provider'

        /** The provider name. */
        name = 'Test Provider'

        /** Whether the provider is enabled. */
        enabled = true

        /** The resolver used by this provider. */
        resolver = resolver

        /** Retrieve sources for a request. */
        getSources = getSourcesImpl

        /** Determine whether the provider supports the given ID. */
        supportsId: OMSSProvider<R>['supportsId'] = async () => true
    }

    return Object.assign(new Provider(), overrides)
}

/**
 * Create a new {@link ProviderService} and its backing registries for testing.
 */
export const createProviderService = () => {
    const providerRegistry = new ProviderRegistry()
    const omssHookRegistry = new HookRegistry<OMSSHooks>()
    const providerHookRegistry = new HookRegistry<ProviderHooks>()

    const service = new ProviderService(providerRegistry, omssHookRegistry, providerHookRegistry)

    return { service, providerRegistry, omssHookRegistry, providerHookRegistry }
}
