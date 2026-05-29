/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for Vercel
  output: 'export',
  
  // Handle pdfjs-dist and docx as external for client-side bundling
  webpack: (config, { isServer }) => {
    // Fix for pdfjs-dist worker
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
