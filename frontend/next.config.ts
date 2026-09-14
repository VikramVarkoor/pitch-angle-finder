import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: this frontend is a pure client-side app (no API routes,
  // no server components needing SSR) that calls the FastAPI backend
  // directly via NEXT_PUBLIC_API_URL. Static export lets it run on Azure
  // Static Web Apps' Free tier instead of the paid Standard/hybrid tier.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
