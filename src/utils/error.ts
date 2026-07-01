export class OMSSError extends Error {
    constructor(message: string, options?: { cause?: unknown; code?: string }) {
        super(message, options)
    }
}

export class OMSSConfigError extends OMSSError {}
export class OMSSPluginError extends OMSSError {}
export class OMSSResolverError extends OMSSError {}
export class OMSSProviderError extends OMSSError {}
