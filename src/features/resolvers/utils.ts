import type { OMSSId, ParsedOMSSId } from '@/types/resolver.js'
import { OMSSResolverError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'

/**
 * Regex for validating namespace names.
 */
export const NAMESPACE_REGEX = /^[a-z0-9-]+$/

/**
 * Parses an OMSS ID in the form `namespace:value`.
 */
export function parseOMSSId(id: OMSSId): Result<ParsedOMSSId, OMSSResolverError> {
    id = id.trim()

    const idx = id.indexOf(':')

    if (idx === -1) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": missing namespace separator ":"`))
    }

    const namespace = id.slice(0, idx)
    const value = id.slice(idx + 1)

    if (!NAMESPACE_REGEX.test(namespace)) {
        return ERR(new OMSSResolverError(`Invalid OMSS namespace "${namespace}". Expected only letters (lowercase), numbers, and hyphens.`))
    }

    if (value.length === 0) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": value cannot be empty`))
    }

    return OK({
        namespace,
        value,
        raw: id,
    })
}
