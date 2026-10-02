import type { NextConfig } from "next";
import os from "os";

// Let phones on the same Wi-Fi open the dev server (e.g. when scanning a PawTrace QR tag).
const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((addr) => addr && addr.family === "IPv4" && !addr.internal)
  .map((addr) => addr!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
};

export default nextConfig;
