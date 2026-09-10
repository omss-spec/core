/**
 * Utils for testing different parts of the framework.
 *
 * This file is overlapping into other test files and is not part of the public API or the /tests/utils folder.
 */
import OMSSServer from '@/core/OMSSServer.js'
import { type OMSSConfig } from '@/types/config.js'
import { createAsyncDeduper as createAsyncDeduperUtil } from '@/utils/AsyncDeduper.js'
import { createMiddlewareRunner } from '@/utils/MiddlewareRunner.js'
import { type MiddlewareOperationMap } from '@/types/middleware.js'
import { type Extractor } from '@/types/extractor.js'
import { vi } from 'vitest'
import { ERR, OK } from '@/utils/utils.js'
import { OMSSExtractorError, type OMSSResolverError } from '@/utils/error.js'
import { type OMSSId, type OMSSResolver, type ParsedOMSSId, type ResolverExecutionContext, type ResolverResult } from '@/types/resolver.js'
import { type Result } from '@/types/utils.js'
import { type OMSSProvider } from '@/types/provider.js'
import { createProviderService as createProviderServiceInternal } from '@/features/providers/ProviderService.js'
import { createProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { createHookRegistry } from '@/features/hooks/HookRegistry.js'
import { type OMSSHooks, type ProviderHooks } from '@/types/hooks.js'
import { createProviderResultEmitter } from '@/features/providers/ProviderResultEmitter.js'
import { createExtractorService } from '@/features/extractors/ExtractorService.js'
import { createExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { createSourceCore as createSourceCoreInternal } from '@/features/source/SourceCore.js'
import { createSourceService as createSourceServiceInternal } from '@/features/source/SourceService.js'
import { createHookService } from '@/features/hooks/HookService.js'

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
export const createAsyncDeduper = <T = string, V = number>() => createAsyncDeduperUtil<T, V>()

/**
 * Create a new {@link MiddlewareRunner} instance.
 * @typeParam T - The type of the middleware operation map.
 */
export const createRunner = <T extends MiddlewareOperationMap>() => createMiddlewareRunner<T>()

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
 * Create a test {@link OMSSResolver}.
 *
 * @typeParam T - The type of the resolved value.
 * @param response - The default response returned by the resolver.
 * @param resolve - Custom resolve implementation.
 * @param overrides - Properties to override on the resolver instance.
 */
export function createResolver<T extends object = typeof DEFAULT_RESOLVER_RESPONSE>(
    response: T = DEFAULT_RESOLVER_RESPONSE as T,
    resolve: (id: ParsedOMSSId, ctx: ResolverExecutionContext) => Promise<ResolverResult<T>> = async () => OK(response),
    overrides: Partial<OMSSResolver<T>> = {}
): OMSSResolver<T> {
    const resolver: OMSSResolver<T> = {
        /** The resolver name. */
        name: 'test-resolver',

        /** The resolver namespace. */
        namespace: 'test',

        /** ID converters supported by the resolver. */
        converter: new Map<string, (id: OMSSId, ctx: ResolverExecutionContext) => Promise<Result<OMSSId, OMSSResolverError>>>(),

        /** Resolve an ID. */
        resolve,
    }

    return Object.assign(resolver, overrides)
}

/**
 * Create a test {@link OMSSProvider}.
 *
 * @typeParam R - The resolver type used by the provider.
 * @param resolver - The resolver exposed by the provider.
 * @param getSources - Custom source retrieval implementation.
 * @param overrides - Properties to override on the provider instance.
 */
export function createProvider<R extends OMSSResolver<unknown> = ReturnType<typeof createResolver>>(
    resolver: R = createResolver() as R,
    getSources: OMSSProvider<R>['getSources'] = async (_req, result) => result.done(),
    overrides: Partial<OMSSProvider<R>> = {}
): OMSSProvider<R> {
    const provider: OMSSProvider<R> = {
        /** The provider ID. */
        id: 'test-provider',

        /** The provider name. */
        name: 'Test Provider',

        /** Whether the provider is enabled. */
        enabled: true,

        /** The resolver used by this provider. */
        resolver,

        /** Retrieve sources for a request. */
        getSources,

        /** Determine whether the provider supports the given ID. */
        supportsId: async () => true,
    }

    return Object.assign(provider, overrides)
}

/**
 * Create a new {@link ProviderService} and its backing registries for testing.
 */
export const createProviderService = () => {
    const providerRegistry = createProviderRegistry()
    const omssHookRegistry = createHookRegistry<OMSSHooks>()

    const service = createProviderServiceInternal(providerRegistry, omssHookRegistry)

    return { service, providerRegistry, omssHookRegistry }
}

/**
 * Create a new {@link ProviderResultEmitter} for testing.
 * @param hookRegistry - Optional hook registry to use for the emitter.
 */
export const createProviderEmitter = (hookRegistry = createHookRegistry<ProviderHooks>()) => createProviderResultEmitter(createProvider(), hookRegistry, (obj) => obj, {} as ParsedOMSSId)

/**
 * Create a new {@link SourceCore} instance for testing.
 */
export const createSourceCore = () => {
    const server = createServer()
    const registry = createProviderRegistry()
    const extractorService = createExtractorService(createExtractorRegistry(), createHookRegistry<OMSSHooks>())
    const core = createSourceCoreInternal(server, registry, extractorService)
    const providerHookService = createHookService<ProviderHooks>()
    const noopCleaner = (obj: { url: string; header: Record<string, string> }) => obj

    return { core, registry, providerHookService, noopCleaner }
}

/**
 * Create a new {@link SourceService} instance for testing.
 */
export const createSourceService = () => {
    const server = createServer()
    const providerRegistry = createProviderRegistry()
    const hookRegistry = createHookRegistry<OMSSHooks>()
    const extractorService = createExtractorService(createExtractorRegistry(), hookRegistry)

    const service = createSourceServiceInternal(server, providerRegistry, hookRegistry, extractorService)

    return { service, providerRegistry, hookRegistry }
}
