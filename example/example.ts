/**
 * OMSS Core — Comprehensive Consumer Example
 *
 * Demonstrates ALL public features of @omss/core:
 *   1. OMSSServer construction
 *   2. Lifecycle hooks (beforePluginRegister, afterPluginRegister, pluginRegisterFailed)
 *   3. Plugin system (no-config & configured plugins)
 *   4. server.decorate / hasDecorator / getDecorator
 *   5. Custom BaseResolver
 *   6. Custom BaseProvider (with catalog, supportsId, getSources)
 *   7. Provider hooks (debug, info, warn, error, source, subtitle, done, custom emit)
 *   8. Provider registration middleware (use())
 *   9. Provider lifecycle hooks (beforeProviderRegister, afterProviderRegister, providerRegisterFailed)
 *  10. sources.get() — full getSources round-trip
 *  11. OMSS lifecycle hooks (beforeGetSources, afterGetSources, getSourcesFailed)
 *  12. Error types (OMSSServerError, OMSSPluginError, OMSSResolverError, OMSSProviderError)
 *  13. Result helpers (OK / ERR)
 */

import {
  // Core
  OMSSServer,
  // Base classes
  BaseResolver,
  BaseProvider,
  // Error types
  OMSSProviderError,
  OMSSResolverError,
  // Result helpers
  OK,
  ERR,
} from '../src/index.js'

import type {
  // Type imports
  OMSSConfig,
  ParsedOMSSId,
  ResolverExecutionContext,
  ResolverResult,
  ProviderSourcesMeta,
  ProviderResultEmitter,
  ProviderResult,
  OMSSPluginType,
  OMSSConfiguredPluginType,
  RegisterMiddleware,
} from '../src/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// 0. Server config
// ─────────────────────────────────────────────────────────────────────────────

const config: OMSSConfig = { name: 'omss-example' }
const server = new OMSSServer(config)

console.log('[server] created:', server.config.name)

// ─────────────────────────────────────────────────────────────────────────────
// 1. OMSS lifecycle hooks
// ─────────────────────────────────────────────────────────────────────────────

server.hooks.add('beforePluginRegister', async ({ plugin }) => {
  console.log('[hook] beforePluginRegister →', plugin.name || '(anonymous)')
})

server.hooks.add('afterPluginRegister', async ({ plugin }) => {
  console.log('[hook] afterPluginRegister →', plugin.name || '(anonymous)')
})

server.hooks.add('pluginRegisterFailed', async ({ plugin, error }) => {
  console.warn('[hook] pluginRegisterFailed →', plugin.name, '|', error.message)
})

server.hooks.add('beforeProviderRegister', async ({ provider }) => {
  console.log('[hook] beforeProviderRegister →', provider.id)
})

server.hooks.add('afterProviderRegister', async ({ provider }) => {
  console.log('[hook] afterProviderRegister →', provider.id)
})

server.hooks.add('providerRegisterFailed', async ({ provider, error }) => {
  console.warn('[hook] providerRegisterFailed →', provider.id, '|', error.message)
})

server.hooks.add('beforeGetSources', async ({ omssId, providerId }) => {
  console.log('[hook] beforeGetSources →', omssId, 'providerId:', providerId ?? 'all')
})

server.hooks.add('afterGetSources', async ({ omssId, result }) => {
  console.log(
    '[hook] afterGetSources →',
    omssId,
    `| sources: ${result.sources.length}, subtitles: ${result.subtitles.length}, errors: ${result.errors.length}`
  )
})

server.hooks.add('getSourcesFailed', async ({ omssId, error }) => {
  console.error('[hook] getSourcesFailed →', omssId, '|', error.message)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. server.decorate / hasDecorator / getDecorator
// ─────────────────────────────────────────────────────────────────────────────

const decorateResult = server.decorate('db', { connected: true, host: 'localhost' })
if (!decorateResult.ok) {
  console.error('decorate failed:', decorateResult.error.message)
} else {
  console.log('[decorate] added "db":', decorateResult.value)
}

// Decorator with dependency
const cacheResult = server.decorate('cache', new Map<string, unknown>(), ['db'])
console.log('[decorate] added "cache" (depends on db):', cacheResult.ok)

// hasDecorator
console.log('[decorate] hasDecorator("db"):', server.hasDecorator('db'))
console.log('[decorate] hasDecorator("missing"):', server.hasDecorator('missing'))

// getDecorator
const dbResult = server.getDecorator<{ connected: boolean; host: string }>('db')
if (dbResult.ok) {
  console.log('[decorate] getDecorator("db") host:', dbResult.value.host)
}

// Duplicate decorator — should fail
const dupResult = server.decorate('db', 'duplicate')
if (!dupResult.ok) {
  console.log('[decorate] duplicate correctly rejected:', dupResult.error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Plugins
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A simple plugin with no configuration.
 * Adds a `logger` decorator to the server.
 */
const loggerPlugin: OMSSPluginType = async (srv) => {
  srv.decorate('logger', {
    log: (msg: string) => console.log('[logger]', msg),
  })
  console.log('[plugin:loggerPlugin] initialized')
}
Object.defineProperty(loggerPlugin, 'name', { value: 'loggerPlugin' })

/**
 * A configured plugin that stores an API key.
 */
const apiKeyPlugin: OMSSConfiguredPluginType<{ apiKey: string }> = async (srv, config) => {
  srv.decorate('apiKey', config.apiKey)
  console.log('[plugin:apiKeyPlugin] API key set (length):', config.apiKey.length)
}
Object.defineProperty(apiKeyPlugin, 'name', { value: 'apiKeyPlugin' })

// ─────────────────────────────────────────────────────────────────────────────
// 4. Resolver
// ─────────────────────────────────────────────────────────────────────────────

/** Metadata returned by our example resolver. */
interface MovieMeta {
  title: string
  year: number
  tmdbId: string
}

/**
 * Example TMDB resolver.
 * Converts `tmdb:<id>` OMSS IDs into movie metadata.
 */
class TmdbResolver extends BaseResolver<MovieMeta> {
  namespace = 'tmdb'
  name = 'TMDB Resolver'

  async resolve(
    id: ParsedOMSSId,
    ctx: ResolverExecutionContext
  ): Promise<ResolverResult<MovieMeta>> {
    // In real code you'd call the TMDB API here.
    // ctx.server gives access to plugins, ctx.signal for cancellation.
    console.log(
      '[resolver:tmdb] resolving',
      id.raw,
      '| server name:',
      ctx.server.config.name
    )

    if (id.value === '0') {
      return ERR(new OMSSResolverError(`TMDB ID "${id.value}" is invalid`))
    }

    return OK<MovieMeta>({
      title: `Movie #${id.value}`,
      year: 2024,
      tmdbId: id.value,
    })
  }
}

const tmdbResolver = new TmdbResolver()

// ─────────────────────────────────────────────────────────────────────────────
// 5. Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example streaming provider backed by the TMDB resolver.
 */
class ExampleStreamProvider extends BaseProvider<TmdbResolver> {
  readonly id = 'example-stream'
  readonly name = 'Example Stream Provider'
  readonly enabled = true
  readonly resolver = tmdbResolver

  /** Optional: list supported OMSS IDs */
  readonly catalog = async (): Promise<string[]> => [
    'tmdb:550',
    'tmdb:238',
    'tmdb:680',
  ]

  readonly supportsId = (id: ParsedOMSSId): boolean => {
    return id.namespace === 'tmdb'
  }

  async getSources(
    media: ProviderSourcesMeta<MovieMeta>,
    result: ProviderResultEmitter
  ): Promise<ProviderResult> {
    const { meta, omssId } = media

    result.debug('[getSources] starting for', omssId.raw)
    result.info('Fetching sources for:', meta.title, meta.year)

    // Emit a custom diagnostic event
    result.emit('cache.check', { key: omssId.raw, hit: false })

    if (meta.tmdbId === '999') {
      // Non-fatal error: provider still calls done()
      result.warn('TMDB ID 999 is flagged — providing fallback only')
      result.error(
        new OMSSProviderError('Primary source unavailable', {
          cause: new Error('upstream 503'),
        })
      )
    }

    // Emit an HLS source (languages variant)
    result.source({
      url: `https://stream.example.com/hls/${meta.tmdbId}/index.m3u8`,
      header: { Referer: 'https://example.com' },
      streamable: true,
      type: result.utils.source.parseType('hls'),
      quality: result.utils.source.parseQuality('1080p'),
      languages: ['English'],
      provider: { id: this.id, name: this.name },
    })

    // Emit an MP4 source (audio-tracks variant)
    result.source({
      url: `https://cdn.example.com/mp4/${meta.tmdbId}/movie.mp4`,
      header: {},
      streamable: true,
      type: result.utils.source.parseType('mp4'),
      quality: result.utils.source.parseQuality('720p'),
      audioTracks: [
        {
          url: `https://cdn.example.com/audio/${meta.tmdbId}/en.m4a`,
          header: {},
          label: 'English',
        },
        {
          url: `https://cdn.example.com/audio/${meta.tmdbId}/de.m4a`,
          header: {},
          label: 'Deutsch',
        },
      ],
      provider: { id: this.id, name: this.name },
    })

    // Emit a subtitle
    result.subtitle({
      url: `https://subs.example.com/${meta.tmdbId}/en.vtt`,
      header: {},
      label: 'English',
      format: result.utils.subtitle.parseFormat('vtt'),
      provider: { id: this.id, name: this.name },
    })

    return result.done()
  }
}

/**
 * A second provider that always fails fatally — demonstrates error handling.
 */
class AlwaysFailProvider extends BaseProvider<TmdbResolver> {
  readonly id = 'always-fail'
  readonly name = 'Always Fail Provider'
  readonly enabled = true
  readonly resolver = tmdbResolver

  readonly supportsId = (_id: ParsedOMSSId): boolean => false

  async getSources(
    _media: ProviderSourcesMeta<MovieMeta>,
    result: ProviderResultEmitter
  ): Promise<ProviderResult> {
    return result.fatal(
      new OMSSProviderError('This provider intentionally fails')
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Provider hooks (per-provider level)
// ─────────────────────────────────────────────────────────────────────────────

server.providers.hooks.add('debug', ({ provider, args }) => {
  console.log(`[provider-hook:debug] [${provider.id}]`, ...args)
})

server.providers.hooks.add('info', ({ provider, args }) => {
  console.log(`[provider-hook:info] [${provider.id}]`, ...args)
})

server.providers.hooks.add('warn', ({ provider, args }) => {
  console.warn(`[provider-hook:warn] [${provider.id}]`, ...args)
})

server.providers.hooks.add('error', ({ provider, error }) => {
  console.error(`[provider-hook:error] [${provider.id}]`, error.message)
})

server.providers.hooks.add('source', ({ provider, source }) => {
  console.log(
    `[provider-hook:source] [${provider.id}] emitted ${source.type} @ ${source.quality}`
  )
})

server.providers.hooks.add('subtitle', ({ provider, subtitle }) => {
  console.log(
    `[provider-hook:subtitle] [${provider.id}] emitted subtitle "${subtitle.label}" (${subtitle.format})`
  )
})

server.providers.hooks.add('done', ({ provider, result }) => {
  console.log(
    `[provider-hook:done] [${provider.id}] finished — sources: ${result.sources.length}, subtitles: ${result.subtitles.length}, errors: ${result.errors.length}`
  )
})

// Custom event hook (fired by result.emit('cache.check', …))
server.providers.hooks.add('cache.check', ({ provider, data }) => {
  console.log(`[provider-hook:cache.check] [${provider.id}]`, data)
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Provider registration middleware
// ─────────────────────────────────────────────────────────────────────────────

const loggingMiddleware: RegisterMiddleware = async (provider, next) => {
  console.log('[middleware] before register →', provider.id)
  const result = await next()
  if (result.ok) {
    console.log('[middleware] after register →', provider.id)
  } else {
    console.warn('[middleware] registration failed →', provider.id, result.error.message)
  }
  return result
}

const disabledGuardMiddleware: RegisterMiddleware = async (provider, next) => {
  if (!provider.enabled) {
    console.warn('[middleware] provider disabled, blocking:', provider.id)
    return ERR(new OMSSProviderError(`Provider "${provider.id}" is disabled`))
  }
  return next()
}

server.providers.use(loggingMiddleware).use(disabledGuardMiddleware)

// ─────────────────────────────────────────────────────────────────────────────
// 8. Bootstrap (async main)
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════ PLUGINS ══════════')

  // Register no-config plugin
  await server.plugins.register(loggerPlugin)

  // Register configured plugin — options as plain value
  await server.plugins.register(apiKeyPlugin, { apiKey: 'super-secret-key-42' })

  // Register configured plugin — options as factory
  await server.plugins.register(
    apiKeyPlugin,
    // This will fail (duplicate key) — triggers pluginRegisterFailed
    (srv) => ({ apiKey: `${srv.config.name}-factory-key` })
  )

  console.log('\n══════════ PROVIDERS ══════════')

  const streamProvider = new ExampleStreamProvider()
  const failProvider = new AlwaysFailProvider()

  await server.providers.register(streamProvider)
  await server.providers.register(failProvider) // AlwaysFailProvider.supportsId always false, still registers

  console.log('[providers] has example-stream:', server.providers.has('example-stream'))
  console.log('[providers] getAll ids:', server.providers.getAll().map((p) => p.id))
  console.log('[providers] catalog:', await streamProvider.catalog?.())

  console.log('\n══════════ GET SOURCES ══════════')

  // Normal round-trip: tmdb:550
  const result = await server.sources.get('tmdb:550')
  if (result.ok) {
    console.log(
      '[sources.get] tmdb:550 →',
      result.value.sources.length,
      'sources,',
      result.value.subtitles.length,
      'subtitles'
    )
    for (const src of result.value.sources) {
      const langs =
        'languages' in src ? src.languages.join(', ') : src.audioTracks.map((t) => t.label).join(', ')
      console.log(`  source: ${src.type} @ ${src.quality} | langs: ${langs}`)
    }
    for (const sub of result.value.subtitles) {
      console.log(`  subtitle: ${sub.label} (${sub.format})`)
    }
  } else {
    console.error('[sources.get] failed:', result.error.message)
  }

  // Filter by specific provider
  console.log('\n[sources.get] filtered to example-stream only:')
  const filtered = await server.sources.get('tmdb:550', { providerId: 'example-stream' })
  if (filtered.ok) {
    console.log('  sources:', filtered.value.sources.length)
  }

  // Non-fatal error scenario (tmdb:999)
  console.log('\n[sources.get] tmdb:999 (triggers non-fatal error):')
  const nonfatal = await server.sources.get('tmdb:999')
  if (nonfatal.ok) {
    console.log('  sources:', nonfatal.value.sources.length, '| errors:', nonfatal.value.errors.length)
    for (const err of nonfatal.value.errors) {
      console.warn('  non-fatal error:', err.message)
    }
  }

  // Resolver failure (tmdb:0 returns ERR from resolver)
  console.log('\n[sources.get] tmdb:0 (resolver failure):')
  const resolverFail = await server.sources.get('tmdb:0')
  if (!resolverFail.ok) {
    console.warn('  expected failure:', resolverFail.error.message)
  }

  // Unknown namespace — no resolver registered for it
  console.log('\n[sources.get] imdb:tt0110912 (no resolver):')
  const noResolver = await server.sources.get('imdb:tt0110912')
  if (!noResolver.ok) {
    console.warn('  expected failure:', noResolver.error.message)
  }

  console.log('\n══════════ DONE ══════════')
}

main().catch(console.error)
