/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:
    process.env.NODE_ENV === "development"
      ? ".next-dev"
      : ".next-build",
};

export default nextConfig;
