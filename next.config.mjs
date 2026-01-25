import packageJson from './package.json' with { type: "json" };

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        APP_VERSION: packageJson.version,
    },
    async redirects() {
        return [
            {
                source: '/auth/:path*',
                destination: '/handler/auth/:path*',
                permanent: false,
            },
        ]
    },
};

export default nextConfig;
