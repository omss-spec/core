import type { OMSSPluginOptions, UnknownPluginType } from '@/types/plugin.js'
import { type OMSSProviderResult, type Source, type Subtitle, type UnknownProvider } from '@/types/provider.js'
import { type OMSSExtractorError, type OMSSProviderError } from '@/utils/error.js'
import { type OMSSId, type ParsedOMSSId } from '@/types/resolver.js'
import { type GatheredSources } from '@/types/source.js'
import { type Extractor } from '@/types/extractor.js'

/**
 * Hook map for OMSS lifecycle events, registered via `server.hooks.add()`.
 *
 * Each hook name maps to its own payload signature. Hooks follow a
 * standardized naming triple:
 * - `before<Action>` - fired before the operation runs.
 * - `after<Action>` - fired after the operation succeeds.
 * - `<action>Failed` - fired if the operation fails; payload is the `before` payload plus `error`.
 *
 * @remarks
 * A few hooks below are marked `@dangerous` - they expose elevated control
 * over the pipeline they observe (e.g. re-entrant registration) and are not
 * intended for routine use.
 */
export type OMSSHooks = {
    /**
     * Called before a plugin is registered.
     */
    beforePluginRegister: <T>(payload: { plugin: UnknownPluginType; options?: OMSSPluginOptions<T> }) => void | Promise<void>

    /**
     * Called after a plugin is successfully registered.
     */
    afterPluginRegister: <T>(payload: { plugin: UnknownPluginType; options?: OMSSPluginOptions<T> }) => void | Promise<void>

    /**
     * Called when a plugin registration fails.
     */
    pluginRegisterFailed: <T>(payload: { plugin: UnknownPluginType; options?: OMSSPluginOptions<T>; error: Error }) => void | Promise<void>

    /**
     * Called before a provider is registered.
     */
    beforeProviderRegister: (payload: { provider: UnknownProvider }) => void | Promise<void>

    /**
     * Called after a provider is successfully registered.
     */
    afterProviderRegister: (payload: { provider: UnknownProvider }) => void | Promise<void>

    /**
     * Called when a provider registration fails.
     */
    providerRegisterFailed: (payload: { provider: UnknownProvider; error: OMSSProviderError }) => void | Promise<void>

    /**
     * Called before sources are fetched for an OMSS ID. Receives the raw ID and the optional provider filter.
     *
     * @dangerous This hook can be used to observe or short-circuit every source-gathering call. Use with caution.
     */
    beforeGetSources: (payload: { omssId: OMSSId; providerId?: string | undefined }) => void | Promise<void>

    /**
     * Called after sources have been successfully fetched. Receives the ID, optional provider filter, and the aggregated result.
     */
    afterGetSources: (payload: { omssId: OMSSId; providerId?: string | undefined; result: GatheredSources }) => void | Promise<void>

    /**
     * Called when a getSources call fails entirely (no provider succeeded).
     */
    getSourcesFailed: (payload: { omssId: OMSSId; providerId?: string | undefined; error: OMSSProviderError }) => void | Promise<void>

    /**
     * Called before an extractor is registered.
     *
     * @dangerous Registering another extractor from within this hook is not allowed and results in an {@link OMSSExtractorError}.
     */
    beforeRegisterExtractor: (payload: { extractor: Extractor }) => void | Promise<void>

    /**
     * Called after an extractor has been successfully registered.
     */
    afterRegisterExtractor: (payload: { extractor: Extractor }) => void | Promise<void>

    /**
     * Called when extractor registration fails.
     */
    extractorRegisterFailed: (payload: { extractor: Extractor; error: OMSSExtractorError }) => void | Promise<void>

    /**
     * Called before attempting to find an extractor for a URL.
     */
    beforeFindExtractor: (payload: { url: string }) => void | Promise<void>

    /**
     * Called after extractor lookup completes.
     *
     * @remarks
     * If no extractor matched, `payload.extractor` is `undefined`.
     */
    afterFindExtractor: (payload: { url: string; extractor: Extractor | undefined }) => void | Promise<void>

    /**
     * Called when no extractor could be found for the provided URL.
     */
    findExtractorFailed: (payload: { url: string; error: OMSSExtractorError }) => void | Promise<void>
}

/**
 * Base payload shared by every provider hook.
 */
interface BaseProviderHookPayload {
    /**
     * The provider instance that emitted the event.
     */
    provider: Readonly<UnknownProvider>
    /**
     * The OMSS ID that was being processed.
     */
    id: ParsedOMSSId
    /**
     * The ISO 8601 timestamp at which this event was emitted.
     */
    timestamp: string
}

/**
 * Payload fired when `result.debug(...)` is called.
 *
 * Intended for verbose, development-only diagnostics.
 */
export type ProviderDebugPayload = BaseProviderHookPayload & {
    /**
     * Raw arguments forwarded from `debug(...args)`.
     */
    args: unknown[]
}

/**
 * Payload fired when `result.info(...)` is called.
 *
 * General informational messages about provider execution.
 */
export type ProviderInfoPayload = BaseProviderHookPayload & {
    /**
     * Raw arguments forwarded from `info(...args)`.
     */
    args: unknown[]
}

/**
 * Payload fired when `result.warn(...)` is called.
 *
 * Non-fatal, degraded-but-recoverable situations.
 */
export type ProviderWarnPayload = BaseProviderHookPayload & {
    /**
     * Raw arguments forwarded from `warn(...args)`.
     */
    args: unknown[]
}

/**
 * Payload fired when `result.error(...)` is called (non-fatal), or when
 * `result.fatal(...)` is called (fatal - the aggregated error is passed here too).
 */
export type ProviderErrorPayload = BaseProviderHookPayload & {
    /**
     * The error that was recorded, or that terminated the provider.
     */
    error: OMSSProviderError
}

/**
 * Payload fired every time `result.source(...)` emits a new source.
 */
export type ProviderSourcePayload = BaseProviderHookPayload & {
    /**
     * The source object that was just emitted.
     */
    source: Source
}

/**
 * Payload fired every time `result.subtitle(...)` emits a new subtitle track.
 */
export type ProviderSubtitlePayload = BaseProviderHookPayload & {
    /**
     * The subtitle object that was just emitted.
     */
    subtitle: Subtitle
}

/**
 * Payload fired once when `result.done()` finalizes the provider's result.
 */
export type ProviderDonePayload = BaseProviderHookPayload & {
    /**
     * The fully aggregated result (sources, subtitles, and non-fatal errors).
     */
    result: OMSSProviderResult
}

/**
 * Payload fired for provider-defined custom events via `result.emit(action, data)`.
 *
 * @remarks
 * This is an escape hatch for provider-specific diagnostics/telemetry that
 * don't map to any of the fixed lifecycle hooks below (e.g. `"cache.hit"`,
 * `"upstream.retry"`). The `action` string becomes the hook name itself, so
 * consumers register listeners for these dynamically via
 * `providerHooks.add('cache.hit', handler)`.
 */
export type ProviderCustomEventPayload = BaseProviderHookPayload & {
    /**
     * Arbitrary payload associated with the custom event.
     */
    data: unknown
}

/**
 * The fixed set of lifecycle hooks every {@link ProviderResultEmitter} fires.
 */
interface FixedProviderHooks {
    /**
     * See {@link ProviderDebugPayload}.
     */
    debug: (payload: ProviderDebugPayload) => void | Promise<void>

    /**
     * See {@link ProviderInfoPayload}.
     */
    info: (payload: ProviderInfoPayload) => void | Promise<void>

    /**
     * See {@link ProviderWarnPayload}.
     */
    warn: (payload: ProviderWarnPayload) => void | Promise<void>

    /**
     * See {@link ProviderErrorPayload}. Fires on both `error()` and `fatal()`.
     */
    error: (payload: ProviderErrorPayload) => void | Promise<void>

    /**
     * See {@link ProviderSourcePayload}. Fires once per `source()` call.
     */
    source: (payload: ProviderSourcePayload) => void | Promise<void>

    /**
     * See {@link ProviderSubtitlePayload}. Fires once per `subtitle()` call.
     */
    subtitle: (payload: ProviderSubtitlePayload) => void | Promise<void>

    /**
     * See {@link ProviderDonePayload}. Fires exactly once, at the end of execution.
     */
    done: (payload: ProviderDonePayload) => void | Promise<void>
}

/**
 * Arbitrary, provider-defined custom event names - see {@link ProviderCustomEventPayload}.
 */
interface ProviderCustomHooks {
    [action: string]: (payload: ProviderCustomEventPayload) => void | Promise<void>
}

/**
 * All lifecycle hooks fired by a {@link ProviderResultEmitter} during a single
 * `getSources()` execution.
 *
 * @remarks
 * Every union member listed in the index signature corresponds 1:1 to one
 * of the named hooks in {@link FixedProviderHooks}, so each named hook's
 * function type is a valid subtype of the index signature - this keeps the
 * interface consistent while still allowing strict payload typing for the
 * well-known events.
 */
export type ProviderHooks = FixedProviderHooks & ProviderCustomHooks
