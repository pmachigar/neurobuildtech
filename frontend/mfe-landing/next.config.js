const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfeLanding',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './Landing': './src/Landing',
        },
        remotes: {
          mfeDashboard: 'mfeDashboard@http://localhost:3002/_next/static/chunks/remoteEntry.js',
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