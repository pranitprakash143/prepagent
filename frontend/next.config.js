/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "ec2-13-206-237-81.ap-south-1.compute.amazonaws.com",
        "ec2-13-206-237-81.ap-south-1.compute.amazonaws.com.",
      ],
    },
  },

  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};

module.exports = nextConfig;
