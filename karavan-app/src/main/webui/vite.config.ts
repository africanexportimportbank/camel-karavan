import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
    // Resolve the tsconfig `paths` aliases (@features, @stores, …) natively —
    // Vite 8 does this itself, replacing the vite-tsconfig-paths plugin.
    resolve: {
        tsconfigPaths: true,
    },
    // Absolute base: index.html must reference assets as /assets/... (not relative
    // ./assets/...). The SPA is served at the domain root and uses client-side
    // routes like /projects/<id>; with a relative base a hard refresh on such a
    // deep link resolves assets to /projects/assets/... which the SPA-fallback
    // serves as index.html (text/html) → the browser blocks the CSS/JS on MIME.
    base: '/',
    plugins: [
        svgr(),
        react(),
    ],
    server: {
        open: false,
        port: 3003,
    },
    build: {
        // The bundle is split into vendor chunks below. The only chunk that still
        // exceeds the default 500 kB is `monaco` (~4.2 MB): we self-host the full
        // Monaco/VS Code editor (loader.config({monaco}) in shared/monaco-setup.ts)
        // rather than pulling it from a CDN, so the app works offline/air-gapped.
        // That size is inherent to Monaco, so raise the warning threshold above it.
        chunkSizeWarningLimit: 4500,
        rollupOptions: {
            output: {
                // Split the single multi-MB bundle into cacheable vendor chunks so the
                // browser loads them in parallel and only re-downloads what changed.
                // Grouped by library family; the heaviest deps (Monaco, the topology
                // graph stack, charts) get their own chunks.
                manualChunks(id: string) {
                    if (id.includes('node_modules')) {
                        if (id.includes('monaco-editor') || id.includes('@monaco-editor') || id.includes('monaco-yaml')) {
                            return 'monaco';
                        }
                        if (id.includes('@patternfly/react-topology') || id.includes('@dagrejs') || id.includes('elkjs')) {
                            return 'topology';
                        }
                        if (id.includes('victory') || id.includes('@patternfly/react-charts')) {
                            return 'charts';
                        }
                        if (id.includes('@patternfly') || id.includes('@carbon')) {
                            return 'patternfly';
                        }
                        if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router') || id.includes('/scheduler/')) {
                            return 'react-vendor';
                        }
                        return 'vendor';
                    }
                    // The generated Camel YAML DSL model/metadata is large app code; keep
                    // it out of the entry chunk so editing UI code doesn't bust its cache.
                    if (id.includes('/src/core/')) {
                        return 'camel-core';
                    }
                },
            },
        },
    },
    // CRITICAL FIX: Placed at the root level!
    // This forces Vite to convert the old CommonJS path-browserify into an ES Module.
    // (Do NOT include the worker.js files here, as Vite handles them natively now)
    optimizeDeps: {
        include: ['path-browserify']
    }
})