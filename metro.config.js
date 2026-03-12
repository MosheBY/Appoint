const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase ships both ESM and CJS bundles. Metro may load different bundles
// for `firebase/app` (ESM) vs `@firebase/auth` RN bundle (CJS), giving them
// separate `_components` maps. This causes "Component auth has not been
// registered yet" because registerAuth() and initializeApp() see different
// @firebase/app instances.
//
// Fix: force every firebase subpackage to the same concrete file so all
// modules share one @firebase/app instance and one _components registry.
const n = (p) => path.resolve(__dirname, 'node_modules', p);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const map = {
    'firebase/app':       n('@firebase/app/dist/index.cjs.js'),
    '@firebase/app':      n('@firebase/app/dist/index.cjs.js'),
    'firebase/auth':      n('@firebase/auth/dist/rn/index.js'),
    '@firebase/auth':     n('@firebase/auth/dist/rn/index.js'),
    'firebase/firestore': n('@firebase/firestore/dist/index.rn.js'),
    '@firebase/firestore':n('@firebase/firestore/dist/index.rn.js'),
  };
  if (map[moduleName]) {
    return { filePath: map[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
