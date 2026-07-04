import type { OMSSId, ParsedOMSSId } from '@/types/resolver.js'
import { OMSSResolverError } from '@/utils/error.js'

/**
 * Regex for validating namespace names.
 */
export const NAMESPACE_REGEX = /^[a-z0-9-]+$/

/**
 * Parses an OMSS ID in the form `namespace:value`.
 */
export function parseOMSSId(id: OMSSId): ParsedOMSSId {
    id = id.trim()

    const idx = id.indexOf(':')

    if (idx === -1) {
        throw new OMSSResolverError(`Invalid OMSS ID "${id}": missing namespace separator ":"`)
    }

    const namespace = id.slice(0, idx)
    const value = id.slice(idx + 1)

    if (!NAMESPACE_REGEX.test(namespace)) {
        throw new OMSSResolverError(`Invalid OMSS namespace "${namespace}". Expected only letters (lowercase), numbers, and hyphens.`)
    }

    if (value.length === 0) {
        throw new OMSSResolverError(`Invalid OMSS ID "${id}": value cannot be empty`)
    }

    return {
        namespace,
        value,
        raw: id,
    }
}
