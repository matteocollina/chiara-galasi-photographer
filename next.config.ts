import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...["chi-sono", "contatti", "faq", "food", "maternita-e-nascite", "ritratti", "services"].map((route) => ({
        source: `/${route}.html`,
        destination: `/${route}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
