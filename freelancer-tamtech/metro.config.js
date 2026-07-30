const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Telling Expo to recognize and bundle .mjs files
config.resolver.sourceExts.push('mjs');

module.exports = config;