import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        tsconfigPaths(),
        VitePWA({
            registerType: 'autoUpdate',
            // Serve the manifest (and SW) from the dev server too, so the PWA
            // wiring can be exercised by the e2e suite
            devOptions: { enabled: true },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg}'],
            },
            manifest: {
                name: 'Mazes',
                short_name: 'Mazes',
                description: 'Interactive maze generator and solver',
                theme_color: '#863bff',
                background_color: '#1a1a2e',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
        }),
    ],
});
