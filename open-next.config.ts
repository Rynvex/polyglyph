// OpenNext Cloudflare configuration. The defaultOpenNextConfig preset
// wires up an SSR Worker with R2-less caching and asset binding so the
// Next.js app deploys as a single Worker + Assets bundle.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
