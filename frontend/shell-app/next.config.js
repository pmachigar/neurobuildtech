const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shellApp',
        remotes: {
          mfeLanding: 'mfeLanding@http://localhost:3001/_next/static/chunks/remoteEntry.js',
          mfeServices: 'mfeServices@http://localhost:3002/_next/static/chunks/remoteEntry.js',
          mfeDashboard: 'mfeDashboard@http://localhost:3003/_next/static/chunks/remoteEntry.js',
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