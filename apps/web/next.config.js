/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  images: { domains: ['localhost', 's3.amazonaws.com', 'icodlife.com.br'] },
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }];
  },
};
module.exports = nextConfig;
