import { defineConfig } from 'tsdown'
import { fileURLToPath } from 'node:url'
import { codecovRollupPlugin } from '@codecov/rollup-plugin'

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
    plugins: [
        codecovRollupPlugin({
            enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
            bundleName: '@omss/core',
            uploadToken: process.env.CODECOV_TOKEN ?? '<upload token>',
        }),
    ],
})
