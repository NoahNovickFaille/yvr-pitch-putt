// @ts-check
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Zustand's ESM build (`esm/middleware.mjs`) uses `import.meta` for devtools,
// which breaks in RN / some web bundles. Always resolve to the CommonJS file.
const zustandMiddlewareCjs = require.resolve('zustand/middleware', {
  paths: [projectRoot],
});

// @supabase/supabase-js 2.106+ ESM uses dynamic import() with bundler hints that
// Hermes cannot compile in Release. CJS build is safe (require-based OTEL loader).
const supabaseCjs = require.resolve('@supabase/supabase-js/dist/index.cjs', {
  paths: [projectRoot],
});

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand/middleware') {
    return { type: 'sourceFile', filePath: zustandMiddlewareCjs };
  }
  if (moduleName === '@supabase/supabase-js') {
    return { type: 'sourceFile', filePath: supabaseCjs };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
