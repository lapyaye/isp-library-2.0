/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["https://unnational-impermeably-ilse.ngrok-free.dev"],
}

export default nextConfig
