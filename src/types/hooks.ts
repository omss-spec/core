import type { OMSSPluginOptions, UnknownPluginType } from '@/types/plugin.js'
import { OMSSProviderResult, Source, Subtitle, UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { OMSSId } from '@/types/resolver.js'
import { GatheredSources } from '@/types/source.js'

/**
 * Hook map for OMSS lifecycle events.
 * Each hook name maps to its own payload signature.
 *
 * Hooks follow a standardized signature:
 * - `before[action]` hooks receive the payload before the event is triggered
 * - `after[action]` hooks receive the payload after the event is triggered
 * - `[action]failed` hooks receive the payload if the event fails
 *
 * @note - There are special hooks with elevated access. See the docs for more info.
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
     * Called before sources are fetched for an OMSS ID.
     * Receives the raw ID and the optional provider filter.
     *
     * @dangerous - This hook is not intended for general use. You can achieve very funny side effects by using it. Use with caution.
     */
    beforeGetSources: (payload: { omssId: OMSSId; providerId?: string | undefined }) => void | Promise<void>

    /**
     * Called after sources have been successfully fetched.
     * Receives the ID, optional provider filter, and the aggregated result.
     */
    afterGetSources: (payload: { omssId: OMSSId; providerId?: string | undefined; result: GatheredSources }) => void | Promise<void>

    /**
     * Called when a getSources call fails entirely (no provider succeeded).
     */
    getSourcesFailed: (payload: { omssId: OMSSId; providerId?: string | undefined; error: OMSSProviderError }) => void | Promise<void>
}

/**
 * Base payload shared by every provider hook.
 */
interface BaseProviderHookPayload {
    /** The provider instance that emitted the event. */
    provider: Readonly<UnknownProvider>
}

/**
 * Fired when `emitter.debug(...)` is called.
 * Intended for verbose, development-only diagnostics.
 */
export type ProviderDebugPayload = BaseProviderHookPayload & {
    /** Raw arguments forwarded from `debug(...args)`. */
    args: unknown[]
}

/**
 * Fired when `emitter.info(...)` is called.
 * General informational messages about provider execution.
 */
export type ProviderInfoPayload = BaseProviderHookPayload & {
    /** Raw arguments forwarded from `info(...args)`. */
    args: unknown[]
}

/**
 * Fired when `emitter.warn(...)` is called.
 * Non-fatal, degraded-but-recoverable situations.
 */
export type ProviderWarnPayload = BaseProviderHookPayload & {
    /** Raw arguments forwarded from `warn(...args)`. */
    args: unknown[]
}

/**
 * Fired when `emitter.error(...)` is called (non-fatal) OR when
 * `emitter.fatal(...)` is called (fatal — the aggregated error is passed here too).
 */
export type ProviderErrorPayload = BaseProviderHookPayload & {
    /** The error that was recorded or that terminated the provider. */
    error: OMSSProviderError
}

/**
 * Fired every time `emitter.source(...)` emits a new source.
 */
export type ProviderSourcePayload = BaseProviderHookPayload & {
    /** The source object that was just emitted. */
    source: Source
}

/**
 * Fired every time `emitter.subtitle(...)` emits a new subtitle track.
 */
export type ProviderSubtitlePayload = BaseProviderHookPayload & {
    /** The subtitle object that was just emitted. */
    subtitle: Subtitle
}

/**
 * Fired once when `emitter.done()` finalizes the provider's result.
 */
export type ProviderDonePayload = BaseProviderHookPayload & {
    /** The fully aggregated result (sources, subtitles, non-fatal errors). */
    result: OMSSProviderResult
}

/**
 * Fired for provider-defined custom events via `emitter.emit(action, data)`.
 *
 * @remarks
 * This is an escape hatch for provider-specific diagnostics/telemetry that
 * don't map to any of the fixed lifecycle hooks below (e.g. `"cache.hit"`,
 * `"upstream.retry"`). The `action` string becomes the hook name itself
 * when calling `hookReg.run(action, ...)`, so consumers register listeners
 * for these dynamically via `hookReg.add('cache.hit', handler)`.
 */
export type ProviderCustomEventPayload = BaseProviderHookPayload & {
    /** Arbitrary payload associated with the custom event. */
    data: unknown
}

interface FixedProviderHooks {
    /** See {@link ProviderDebugPayload}. */
    debug: (payload: ProviderDebugPayload) => void | Promise<void>

    /** See {@link ProviderInfoPayload}. */
    info: (payload: ProviderInfoPayload) => void | Promise<void>

    /** See {@link ProviderWarnPayload}. */
    warn: (payload: ProviderWarnPayload) => void | Promise<void>

    /** See {@link ProviderErrorPayload}. Fires on both `error()` and `fatal()`. */
    error: (payload: ProviderErrorPayload) => void | Promise<void>

    /** See {@link ProviderSourcePayload}. Fires once per `source()` call. */
    source: (payload: ProviderSourcePayload) => void | Promise<void>

    /** See {@link ProviderSubtitlePayload}. Fires once per `subtitle()` call. */
    subtitle: (payload: ProviderSubtitlePayload) => void | Promise<void>

    /** See {@link ProviderDonePayload}. Fires exactly once, at the end of execution. */
    done: (payload: ProviderDonePayload) => void | Promise<void>
}

interface ProviderCustomHooks {
    [action: string]: (payload: ProviderCustomEventPayload) => void | Promise<void>
}

/**
 * All lifecycle hooks fired by a `ProviderResultEmitter` during a single
 * `getSources()` execution.
 *
 * Every union member listed in the index signature corresponds 1:1 to one
 * of the named hooks below, so each named hook's function type is a valid
 * subtype of the index signature — this keeps the interface consistent
 * while still allowing strict payload typing for the well-known events.
 */
export type ProviderHooks = FixedProviderHooks & ProviderCustomHooks
