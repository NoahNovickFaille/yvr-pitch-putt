const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withMMKV(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Add MMKV pod after use_expo_modules! if not already present
      if (!podfileContent.includes("pod 'MMKV'")) {
        podfileContent = podfileContent.replace(
          'use_expo_modules!',
          "use_expo_modules!\n\n  # MMKV for background-downloader compatibility\n  pod 'MMKV'"
        );
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
}

module.exports = withMMKV;
