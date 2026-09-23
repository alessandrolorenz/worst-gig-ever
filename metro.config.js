const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for tslib destructure error
const ALIASES = {
  'tslib': require.resolve('tslib/tslib.es6.js'),
};

/**
 * Packages that must not enter the web bundle (M23).
 *
 * Both are native-only SDKs reached through an adapter that already checks
 * `Platform.OS` and already requires lazily. Neither guard helps here: Metro
 * resolves a statically-analyzable `require()` whether or not it runs, and the
 * ads package then fails the build on a native-only import inside its banner
 * component — a component this game does not use and never renders.
 *
 * M23's verification contract requires the web export to stay playable with
 * the monetization adapters disabled. This is what makes that true at build
 * time rather than only in intent. See metro/native-only-stub.js.
 */
const NATIVE_ONLY_ON_WEB = new Set([
  'react-native-google-mobile-ads',
  'react-native-purchases',
]);

const NATIVE_ONLY_STUB = require.resolve('./metro/native-only-stub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && NATIVE_ONLY_ON_WEB.has(moduleName)) {
    return { type: 'sourceFile', filePath: NATIVE_ONLY_STUB };
  }
  return context.resolveRequest(
    context,
    ALIASES[moduleName] || moduleName,
    platform
  );
};

// Alternative: Disable package exports if needed
// config.resolver.unstable_enablePackageExports = false;

module.exports = config;