const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfeServices',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './Services': './src/Services',
          './ServiceCatalog': './src/ServiceCatalog',
        },
        remotes: {
          mfeLanding: 'mfeLanding@http://localhost:3001/_next/static/chunks/remoteEntry.js',
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