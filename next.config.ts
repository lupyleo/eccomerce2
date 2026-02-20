import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://ec2-3-36-81-22.ap-northeast-2.compute.amazonaws.com:3000",
    "http://3.36.81.22:3000",
    "http://172.30.0.90:3000",
  ],
};

export default nextConfig;
