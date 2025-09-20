import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };

    config.module = config.module ?? { rules: [] };
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push({
      test: /pdf\.worker(\.min)?\.m?js$/,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
