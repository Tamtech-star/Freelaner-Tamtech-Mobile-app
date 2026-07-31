const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withProguardRules(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourcePath = path.join(projectRoot, 'proguard-rules.pro');
      const destPath = path.join(projectRoot, 'android', 'app', 'proguard-rules.pro');

      if (fs.existsSync(sourcePath)) {
        let currentRules = '';
        if (fs.existsSync(destPath)) {
          currentRules = fs.readFileSync(destPath, 'utf8');
        }
        const newRules = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(destPath, currentRules + '\n' + newRules);
      }
      return config;
    },
  ]);
};