import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Make the Cloudflare runtime bindings available during `next dev` so
// local dev mirrors the production Worker environment. No-op in CI / prod.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
