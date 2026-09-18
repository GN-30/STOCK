import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),

        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.svg",
                "icon-192.jpg",
                "icon-512.jpg"
            ],

            manifest: {
                name: "StockFlow — Market Tracker",
                short_name: "StockFlow",
                description:
                    "Track Indian and global stocks in real-time. Watchlist, portfolio, and live charts.",
                theme_color: "#0a0e0d",
                background_color: "#0a0e0d",
                display: "standalone",
                scope: "/",
                start_url: "/",
                orientation: "portrait-primary",

                icons: [
                    {
                        src: "/icon-192.jpg",
                        sizes: "192x192",
                        type: "image/jpeg"
                    },
                    {
                        src: "/icon-512.jpg",
                        sizes: "512x512",
                        type: "image/jpeg"
                    },
                    {
                        src: "/icon-512.jpg",
                        sizes: "512x512",
                        type: "image/jpeg",
                        purpose: "any maskable"
                    }
                ]
            },

            workbox: {
                // Cache strategies
                runtimeCaching: [
                    {
                        // Cache Google Fonts
                        urlPattern:
                            /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Cache font files
                        urlPattern:
                            /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "gstatic-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ],

                globPatterns: [
                    "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"
                ]
            },

            devOptions: {
                enabled: true
            }
        })
    ]
});
