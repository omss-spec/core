import { defineConfig } from 'tsdown'
import { fileURLToPath } from 'node:url'

export default defineConfig({
    alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    fixedExtension: true,
})
