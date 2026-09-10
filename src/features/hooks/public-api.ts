/**
 * Exporting Hook registry and HookService so that plugins can use them without rewriting the code.
 */
export { createHookRegistry, type HookRegistry } from '@/features/hooks/HookRegistry.js'
export { createHookService, type HookService } from '@/features/hooks/HookService.js'
