/**
 * Base class for every @omss/core error.
 *
 * @remarks
 * Use `instanceof OMSSError` to catch any framework error. Always throw/return
 * a specific subclass, never this class directly. The `cause` field is not
 * standardized and may change frequently - treat it as debugging context, not a stable API.
 */
export class OMSSError extends Error {
    /**
     * Creates a new {@link OMSSError}.
     *
     * @param message - The error message.
     * @param options - Additional error options (e.g. `cause`).
     */
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = this.constructor.name
    }
}

/**
 * Returned/thrown for {@link OMSSServer} construction and decorator errors.
 *
 * @example
 * ```ts
 * return ERR(new OMSSServerError('config.name must be a non-empty string', { cause: config }))
 * ```
 */
export class OMSSServerError extends OMSSError {}

/**
 * Returned/thrown during plugin registration or execution.
 *
 * @example
 * ```ts
 * return ERR(new OMSSPluginError(`Plugin "${name}" is already registered`, { cause: plugin }))
 * ```
 */
export class OMSSPluginError extends OMSSError {}

/**
 * Returned/thrown during resolver registration or ID resolution.
 *
 * @example
 * ```ts
 * return ERR(new OMSSResolverError('No resolver found for namespace "xyz"', { cause: rawId }))
 * ```
 */
export class OMSSResolverError extends OMSSError {}

/**
 * Returned/thrown during provider registration or source fetching.
 *
 * @example
 * ```ts
 * return ERR(new OMSSProviderError('Provider must have at least one resolver', { cause: provider }))
 * ```
 */
export class OMSSProviderError extends OMSSError {}

/**
 * Returned/thrown when an extractor fails to extract media from a host.
 *
 * @example
 * ```ts
 * return ERR(new OMSSExtractorError('Failed to extract media from host due to host changes', { cause: html }))
 * ```
 */
export class OMSSExtractorError extends OMSSError {}

/**
 * Returned/thrown when one or more providers fail during source gathering.
 *
 * @example
 * ```ts
 * return ERR(new OMSSSourceGatheringError('Failed to gather sources', { cause: providerResults }))
 * ```
 */
export class OMSSSourceGatheringError extends OMSSError {}
