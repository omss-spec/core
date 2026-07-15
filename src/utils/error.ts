/**
 * Base class for all OMSS framework errors.
 * Use `instanceof OMSSError` to catch any framework error.
 * Always throw a specific subclass, never this directly.
 * Cause is not standardized and may change frequently.
 */
export class OMSSError extends Error {
    /**
     * Create a new OMSSError.
     * @param message - Error message
     * @param options - Additional options for the error
     */
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = this.constructor.name
    }
}

/**
 * Returned when an error gets Returned in the OMSSServer class.
 *
 * @example
 * return ERR(OMSSServerError('config.name must be a non-empty string', {cause: config}))
 */
export class OMSSServerError extends OMSSError {}

/**
 * Returned during plugin registration or execution.
 *
 * @example
 * return ERR(OMSSPluginError(`Plugin "${name}" is already registered`, { cause: plugin }))
 */
export class OMSSPluginError extends OMSSError {}

/**
 * Returned during resolver registration or ID resolution.
 *
 * @example
 * return ERR(OMSSResolverError(`No resolver found for namespace "xyz"`, { cause: rawId }))
 */
export class OMSSResolverError extends OMSSError {}

/**
 * Returned during provider registration or source fetching.
 *
 * @example
 * return ERR(OMSSProviderError('Provider must have at least one resolver', { cause: provider }))
 */
export class OMSSProviderError extends OMSSError {}

/**
 * Returned when something/several things fail during source gathering.
 *
 * @example
 * return ERR(OMSSSourceGatheringError('Failed to gather sources', { cause: providerResults }))
 */
export class OMSSSourceGatheringError extends OMSSError {}
