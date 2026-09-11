import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pozwala podgladac dev server z telefonu w tej samej sieci Wi-Fi
  allowedDevOrigins: ["192.168.0.45"],
};

export default nextConfig;
