import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // TypeScript es estricto en el build: un error de tipos bloquea `next build` (TASK-067).
  eslint: {
    // El proyecto aún no tiene configuración de ESLint; se activará en el build
    // cuando exista una (pendiente fuera de la Fase 0).
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
