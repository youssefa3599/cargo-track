/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // ← ADD THIS LINE (put it first)
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig