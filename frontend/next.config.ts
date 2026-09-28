import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack ko batayein ke workspace root yhi frontend folder hai
  experimental: {
    // turbopack root configuration agar required ho
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;