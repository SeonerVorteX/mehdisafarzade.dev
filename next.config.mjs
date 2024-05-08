/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [{
            protocol: 'https',
            hostname: 'opengraph.githubassets.com',
            pathname: '**'
        },
        {
            protocol: 'https',
            hostname: 'raw.githubusercontent.com',
            pathname: '**'
        }]
    }
};

export default nextConfig;
