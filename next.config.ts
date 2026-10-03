import type { NextConfig } from "next";
import os from "os";

// Let phones on the same Wi-Fi open the dev server (e.g. when scanning a PawTrace QR tag).
const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((addr) => addr && addr.family === "IPv4" && !addr.internal)
  .map((addr) => addr!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  // Hide the "N" dev-tools button in the corner (compile/runtime errors are still shown)
  devIndicators: false,
  // Make sure Prisma's query engine (generated next to the client) ships with every
  // API route when deployed, e.g. on Vercel
  outputFileTracingIncludes: {
    "/api/**": ["./app/generated/prisma/**/*.node"],
  },
};

export default nextConfig;
