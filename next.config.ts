import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next treats the AWS SDK as an external server package by default. On Windows
  // Turbopack then symlinks it into .next, which fails without Developer Mode,
  // so bundle it instead.
  transpilePackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-presigned-post",
    "@aws-sdk/s3-request-presigner",
  ],
};

export default nextConfig;
