/** @type {import('next').NextConfig} */
// apps/landing — site institucional servido na raiz do domínio (icodlife.com.br).
// Diferente de web/doutor/clinica (que redirecionam "/" para seus dashboards),
// aqui a raiz É a própria landing page — não há redirect.
const nextConfig = {
  output: 'standalone',
  images: { domains: ['localhost', 'icodlife.com.br'] },
};

module.exports = nextConfig;
