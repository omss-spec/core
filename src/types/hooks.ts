import type { OMSSPluginOptions, UnknownPluginType } from '@/types/plugin.js'
import type {UnknownResolverType} from '@/types/resolver.js'

/**
 * Hook map for OMSS lifecycle events.
 * Each hook name with its own payload.
 */
export type OMSSHooks = {
    onPluginRegister: <T>(payload: { plugin: UnknownPluginType; options: OMSSPluginOptions<T> }) => void | Promise<void>

    onResolverRegister: <T>(payload: { resolver: UnknownResolverType }) => void | Promise<void>

    onError: (payload: { error: Error }) => void | Promise<void>
}
