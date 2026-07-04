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
 * Thrown when an error gets thrown in the OMSSServer class.
 *
 * @example
 * throw new OMSSServerError('config.name must be a non-empty string', {cause: config})
 */
export class OMSSServerError extends OMSSError {}

/**
 * Thrown during plugin registration or execution.
 *
 * @example
 * throw new OMSSPluginError(`Plugin "${name}" is already registered`, { cause: plugin })
 */
export class OMSSPluginError extends OMSSError {}

/**
 * Thrown during resolver registration or ID resolution.
 *
 * @example
 * throw new OMSSResolverError(`No resolver found for namespace "xyz"`, { cause: rawId })
 */
export class OMSSResolverError extends OMSSError {}

/**
 * Thrown during provider registration or source fetching.
 *
 * @example
 * throw new OMSSProviderError('Provider must have at least one resolver', { cause: provider })
 */
export class OMSSProviderError extends OMSSError {}
