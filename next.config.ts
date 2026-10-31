import type { NextConfig } from "next";

// Two independent Next.js body-size ceilings must both cover the largest upload the app allows —
// 3 maintenance photos at 4MB each (see MAX_PHOTOS / MAX_PHOTO_BYTES in
// src/app/(student)/maintenance/new/actions.ts) and the single 8MB administrative attachment
// (MAX_UPLOAD_BYTES in src/server/services/storage.service.ts). Keep all four limits in sync.
const UPLOAD_BODY_SIZE_LIMIT = "15mb";

const nextConfig: NextConfig = {
  experimental: {
    // Ceiling #1: Server Actions cap their own request body at 1MB by default, checked in
    // action-handler.js before our action code runs. Below this, a large upload fails with a
    // generic 500 our own try/catch never sees.
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_SIZE_LIMIT,
    },
    // Ceiling #2: proxy.ts runs on every page route (it has to, to enforce EF-05), and Next.js
    // clones the request body so both the proxy and the eventual action can read it. That clone
    // has its OWN separate 10MB default (next-server.js reads
    // `experimental.proxyClientMaxBodySize`) — independent of serverActions.bodySizeLimit above,
    // and lower than our ~12MB combined worst case. Without this, three photos near the per-photo
    // limit get truncated mid-multipart-boundary, which surfaces as an unrelated-looking
    // "Failed to parse body as FormData" crash rather than a size error.
    proxyClientMaxBodySize: UPLOAD_BODY_SIZE_LIMIT,
  },
};

export default nextConfig;
