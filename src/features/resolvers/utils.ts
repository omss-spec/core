import type { OMSSId, ParsedOMSSId } from '@/types/resolver.js'
import { OMSSResolverError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { ERR, OK, validateSafeUniqueString } from '@/utils/utils.js'

/**
 * Parses an OMSS ID in the form `namespace:value`.
 */
export function parseOMSSId(id: OMSSId): Result<ParsedOMSSId, OMSSResolverError> {
    if (/\s/.test(id)) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": cannot contain whitespace`))
    }

    const idx = id.indexOf(':')

    if (idx === -1) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": missing namespace separator ":"`))
    }

    const namespace = id.slice(0, idx)
    const value = id.slice(idx + 1)

    const req = validateSafeUniqueString(namespace, 'OMSS namespace', OMSSResolverError)

    if (!req.ok) {
        return ERR(req.error)
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
