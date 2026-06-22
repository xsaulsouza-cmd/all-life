/** @type {import('next').NextConfig} */
const nextConfig = {
    // Compila mais rápido em dev — desabilita source maps completos
    productionBrowserSourceMaps: false,

    // Turbopack já ativo via "next dev --turbopack" — garante que o build use SWC
    compiler: {
        // Remove console.log em produção
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // Headers de segurança + cache de assets estáticos
    async headers() {
        return [
            {
                source: '/_next/static/:path*',
                headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                ],
            },
        ]
    },

    // Ignora erros de TypeScript no build (projeto é JS puro)
    typescript: { ignoreBuildErrors: true },
}

export default nextConfig
