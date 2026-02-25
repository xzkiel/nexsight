import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve("."),
    resolveAlias: {
      // jito-ts bundles @solana/web3.js@1.77 which imports rpc-websockets/dist/lib/client/*
      // Turbopack incorrectly resolves to root rpc-websockets@9.x (flat layout).
      // Alias to the nested v7.x copy that has the expected dist/lib/client structure.
      "rpc-websockets/dist/lib/client":
        "./node_modules/jito-ts/node_modules/rpc-websockets/dist/lib/client.cjs",
      "rpc-websockets/dist/lib/client/websocket":
        "./node_modules/jito-ts/node_modules/rpc-websockets/dist/lib/client/websocket.cjs",
      "rpc-websockets/dist/lib/client/websocket.browser":
        "./node_modules/jito-ts/node_modules/rpc-websockets/dist/lib/client/websocket.browser.cjs",
    },
  },
  // Enable server-side packages that need native bindings
  serverExternalPackages: ["pg", "ioredis"],
  async redirects() {
    return [
      {
        source: '/agents',
        destination: '/',
        permanent: false,
      },
      {
        source: '/agent',
        destination: '/',
        permanent: false,
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
