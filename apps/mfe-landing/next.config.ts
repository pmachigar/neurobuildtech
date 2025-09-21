import { NextFederationPlugin } from '@module-federation/nextjs-mf';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfeLanding',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './RemoteExample': './app/components/RemoteExample',
        },
        remotes: {
          // Ejemplo: otro micro frontend
          // mfeAdmin: 'mfeAdmin@http://localhost:3001/_next/static/chunks/remoteEntry.js',
        },
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
        },
      })
    );
    return config;
  },
};

export default nextConfig;
