import { BaseResolver, ERR, OK, OMSSResolverError, ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '../src/index.js'

export interface TMDBMedia {
    id: number
    title: string
}

// --- Concrete resolver ---
class TMDBResolver extends BaseResolver<TMDBMedia> {
    namespace = 'tmdb'
    name = 'TMDB'

    async resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMedia>> {
        try {
            // Simulate an API call to TMDB
            const media = await new Promise<TMDBMedia>((resolve) => {
                setTimeout(() => {
                    resolve({ id: parseInt(id.value), title: 'Example Movie' })
                }, 1000)
            })
            return OK(media)
        } catch (e) {
            return ERR(new OMSSResolverError('Failed to resolve media'))
        }
    }
}

export const resolver = new TMDBResolver()
