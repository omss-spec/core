import type { OMSSId, ParsedOMSSId } from '@/types/resolver.js'
import { OMSSResolverError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { ERR, OK, validateSafeUniqueString } from '@/utils/utils.js'

/**
 * Parses an OMSS ID in the form `namespace:value_1[:value_2[:...]]`.
 */
export function parseOMSSId(id: OMSSId): Result<ParsedOMSSId, OMSSResolverError> {
    if (/\s/.test(id)) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": cannot contain whitespace`))
    }

    const parts = id.split(':')

    if (parts.length < 2) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": missing namespace separator ":"`))
    }

    const [namespace, ...values] = parts

    if (!namespace) {
        return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": namespace cannot be empty`))
    }

    const req = validateSafeUniqueString(namespace, 'OMSS namespace', OMSSResolverError)

    if (!req.ok) {
        return ERR(req.error)
    }

    for (const [i, value] of values.entries()) {
        if (value.length === 0) {
            return ERR(new OMSSResolverError(`Invalid OMSS ID "${id}": value ${i + 1} cannot be empty`))
        }
    }

    const decodedValues = values.map((value) => decodeURIComponent(value))

    return OK({
        namespace,
        values: decodedValues,
        raw: id,
    })
}
