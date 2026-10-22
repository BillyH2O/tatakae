const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships SQLite as WebAssembly.
config.resolver.assetExts.push('wasm');

module.exports = config;
