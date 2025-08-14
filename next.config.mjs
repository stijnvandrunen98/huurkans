/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Als je externe afbeeldingen toont (listing-foto’s), laat dit staan.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  }
};

export default nextConfig;
