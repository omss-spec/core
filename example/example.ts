/**
 * A guided tour of every feature @omss/core exposes:
 *
 *  1. Creating a server
 *  2. Decorators
 *  3. Lifecycle hooks
 *  4. Plugins (configless + configured)
 *  5. Resolvers (`defineResolver`, `parseOMSSId`)
 *  6. Extractors
 *  7. Providers (`defineProvider`) + the ProviderResultEmitter utilities
 *  8. Middleware (provider registration + source gathering pipelines)
 *  9. Provider catalogs
 * 10. Source gathering, including per-request hooks and cancellation
 *
 * Run with `npm run example`.
 */
import {
    createHookService,
    defineProvider,
    defineResolver,
    ERR,
    OK,
    OMSSExtractorError,
    OMSSProviderError,
    OMSSServer,
    parseOMSSId,
    type OMSSConfig,
    type OMSSConfiguredPluginType,
    type OMSSPluginType,
    type ProviderHooks,
} from '@omss/core'

// ---------------------------------------------------------------------------
// 1. Create the server
// ---------------------------------------------------------------------------
const config: OMSSConfig = { name: 'omss-example' }
const server = new OMSSServer(config)

console.log('--- 1. Server ---')
console.log(`server started for "${server.config.name}"`)

// ---------------------------------------------------------------------------
// 2. Decorators — attach ad-hoc, readonly properties to the server instance
// ---------------------------------------------------------------------------
console.log('\n--- 2. Decorators ---')

const decorateResult = server.decorate('startedAt', new Date().toISOString())
console.log('decorate result:', decorateResult)
console.log('has decorator "startedAt"?', server.hasDecorator('startedAt'))
console.log('decorator value:', server.getDecorator<string>('startedAt'))

// ---------------------------------------------------------------------------
// 3. Lifecycle hooks — observe events fired by every feature
// ---------------------------------------------------------------------------
console.log('\n--- 3. Hooks ---')

server.hooks.add('afterPluginRegister', ({ plugin }) => console.log(`[hook] plugin "${plugin.name || '(anonymous)'}" registered`))
server.hooks.add('afterRegisterExtractor', () => console.log('[hook] extractor registered'))
server.hooks.add('afterProviderRegister', ({ provider }) => console.log(`[hook] provider "${provider.id}" registered`))
server.hooks.add('afterGetSources', ({ omssId, result }) => console.log(`[hook] gathered ${result.sources.length} source(s) for "${omssId}"`))

// ---------------------------------------------------------------------------
// 4. Plugins — configless and configured
// ---------------------------------------------------------------------------
console.log('\n--- 4. Plugins ---')

const loggerPlugin: OMSSPluginType = async (instance) => {
    console.log(`logger plugin loaded for "${instance.config.name}"`)
}
await server.plugins.register(loggerPlugin)
console.log('logger plugin state:', server.plugins.getPluginState(loggerPlugin))

const greeterPlugin: OMSSConfiguredPluginType<{ greeting: string }> = async (_instance, options) => {
    console.log(options.greeting)
}
await server.plugins.register(greeterPlugin, { greeting: 'Hello from a configured plugin!' })

// A plugin is identified by function reference, so registering the "same"
// behavior twice needs two distinct functions — this second one demonstrates
// that options may also be a factory receiving the server instance.
const greeterPluginViaFactory: OMSSConfiguredPluginType<{ greeting: string }> = async (_instance, options) => {
    console.log(options.greeting)
}
await server.plugins.register(greeterPluginViaFactory, (instance) => ({ greeting: `Hello, ${instance.config.name}!` }))

// Duplicate registration is rejected via the Result pattern, not a throw.
const duplicate = await server.plugins.register(loggerPlugin)
console.log('duplicate plugin registration:', duplicate.ok ? 'unexpectedly ok' : duplicate.error.message)

// ---------------------------------------------------------------------------
// 5. Resolvers — convert an OMSS ID into provider-facing metadata
// ---------------------------------------------------------------------------
console.log('\n--- 5. Resolvers ---')

interface DemoMetadata {
    title: string
}

const demoResolver = defineResolver<DemoMetadata>({
    namespace: 'demo',
    name: 'Demo Resolver',
    converter: new Map(),
    async resolve(id) {
        return OK({ title: `Demo Movie #${id.values[0]}` })
    },
})

const parsed = parseOMSSId('demo:42')
console.log('parsed OMSS id:', parsed.ok ? parsed.value : parsed.error.message)

// ---------------------------------------------------------------------------
// 6. Extractors — turn an arbitrary hosting URL into a playable stream
// ---------------------------------------------------------------------------
console.log('\n--- 6. Extractors ---')

await server.extractors.register({
    async matcher(url) {
        return url.includes('demo-host') ? OK() : ERR(new OMSSExtractorError(`"${url}" is not a demo-host URL`))
    },
    async parse(url) {
        return OK({ url: url.replace('demo-host', 'cdn.example.com'), header: { 'x-demo': 'true' } })
    },
})

const foundExtractor = await server.extractors.find('https://demo-host/stream/42')
console.log('found extractor for demo-host?', foundExtractor.ok)

// ---------------------------------------------------------------------------
// 7. Providers — fetch sources for a resolved media item
// ---------------------------------------------------------------------------
console.log('\n--- 7. Providers ---')

const demoProvider = defineProvider({
    id: 'demo-provider',
    name: 'Demo Provider',
    enabled: true,
    catalog: () => ['*'],
    supportsId: (id) => id.namespace === 'demo',
    resolver: demoResolver,
    async getSources(request, result) {
        result.debug('resolved metadata:', request.meta)
        result.info(`fetching sources for "${request.meta.title}"`)

        const extracted = await request.utils.findExtractor('https://demo-host/stream/42')
        if (!extracted.ok) {
            return result.fatal(new OMSSProviderError('no extractor available for demo-host', { cause: extracted.error }))
        }

        const stream = await extracted.value.parse('https://demo-host/stream/42', {
            referrer: '',
            header: {},
            signal: request.utils.abortSignal,
        })
        if (!stream.ok) {
            return result.fatal(new OMSSProviderError('extractor failed to parse the stream', { cause: stream.error }))
        }

        result.source({
            url: stream.value.url,
            header: stream.value.header,
            streamable: true,
            type: result.utils.source.parseType('hls'),
            quality: result.utils.source.parseQuality('1080p'),
            languages: ['English'],
        })

        result.subtitle({
            url: 'https://cdn.example.com/demo.vtt',
            header: {},
            label: 'English',
            format: result.utils.subtitle.parseFormat('vtt'),
        })

        result.warn('this is a demo warning, not a real problem')
        result.error(new OMSSProviderError('a non-fatal error, gathering still succeeds'))
        result.emit('demo.custom-event', { note: 'custom provider telemetry' })

        return result.done()
    },
})

// ---------------------------------------------------------------------------
// 8. Middleware — cross-cutting behavior around registration/gathering
// ---------------------------------------------------------------------------
console.log('\n--- 8. Middleware ---')

server.providers.use('register', async (ctx, next) => {
    console.log(`[middleware] registering provider "${ctx.provider.id}"`)
    return next()
})

server.sources.use('getSources', async (ctx, next) => {
    console.log(`[middleware] gathering sources for "${ctx.omssId}"`)
    return next()
})

await server.providers.register(demoProvider)

// Duplicate provider ids are rejected the same way duplicate plugins are.
const duplicateProvider = await server.providers.register(demoProvider)
console.log('duplicate provider registration:', duplicateProvider.ok ? 'unexpectedly ok' : duplicateProvider.error.message)

// ---------------------------------------------------------------------------
// 9. Provider catalogs
// ---------------------------------------------------------------------------
console.log('\n--- 9. Catalog ---')

const catalog = await server.providers.catalog()
console.log('full catalog:', catalog.ok ? Object.fromEntries(catalog.value) : catalog.error.message)

const demoCatalog = await server.providers.catalogForNamespace('demo')
console.log('catalog for "demo":', demoCatalog.ok ? demoCatalog.value : demoCatalog.error.message)

// ---------------------------------------------------------------------------
// 10. Source gathering — the main "give me a playable URL" entrypoint
// ---------------------------------------------------------------------------
console.log('\n--- 10. Source gathering ---')

server.sources.cleaningFunction = (obj) => ({ ...obj, url: `${obj.url}?token=demo` })

// A dedicated hook service scoped to a single request, so callers can observe
// (or clean up after) exactly one getSources() call instead of every one.
const requestHooks = createHookService<ProviderHooks>()
requestHooks.add('source', ({ source }) => console.log('[request hook] emitted source:', source.url))

const gathered = await server.sources.getSources('demo:42', {
    providerId: 'demo-provider',
    providerHookService: requestHooks,
})

if (gathered.ok) {
    console.log('gathered sources:', gathered.value.sources)
    console.log('gathered subtitles:', gathered.value.subtitles)
} else {
    console.error('failed to gather sources:', gathered.error.message)
}

// Cancellation via AbortSignal — aborted requests fail fast with a clear error.
const controller = new AbortController()
controller.abort()

const aborted = await server.sources.getSources('demo:42', {
    providerId: 'demo-provider',
    abortSignal: controller.signal,
})
console.log('aborted request result:', aborted.ok ? 'unexpectedly succeeded' : aborted.error.message)
