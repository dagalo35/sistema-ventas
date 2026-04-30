/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimizaciones de compilación para un despliegue más rápido
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Aseguramos que las imágenes y fuentes se optimicen según lo visto en el head-manager
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;