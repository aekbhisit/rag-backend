/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@rag/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;


