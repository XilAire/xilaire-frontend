/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:
    process.env.VERCEL === "1"
      ? ".next"
      : process.env.NODE_ENV === "development"
        ? ".next-dev"
        : ".next-build",
};

export default nextConfig;
