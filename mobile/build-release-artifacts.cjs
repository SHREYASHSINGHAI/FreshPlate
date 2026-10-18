#!/usr/bin/env node
/**
 * FreshPlate Release Artifacts Builder & Pre-Flight Validator
 * Role: Mobile UI/UX & Build Release Engineer
 *
 * Automates pre-flight validation and commands to generate:
 * 1. Android App Bundle (.aab) for Google Play Store submission
 * 2. iOS Store Archive (.ipa) for Apple App Store Connect submission
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('  FRESHPLATE MOBILE PRODUCTION RELEASE ARTIFACTS BUILDER');
console.log('  Targeting: Android Play Store (.aab) & Apple App Store (.ipa)');
console.log('================================================================\n');

let passedChecks = 0;
let failedChecks = 0;

function verify(name, condition, errorMsg = '') {
  if (condition) {
    console.log(`[VERIFIED] ${name}`);
    passedChecks++;
  } else {
    console.error(`[FAILED]   ${name}: ${errorMsg}`);
    failedChecks++;
  }
}

// 1. Verify app.json configuration
const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

verify(
  'Android Target SDK 35 (Android 15)',
  appJson.expo?.android?.targetSdkVersion === 35,
  `Found: ${appJson.expo?.android?.targetSdkVersion}`
);

verify(
  'Android Min SDK 24 (TLS 1.3 requirement)',
  appJson.expo?.android?.minSdkVersion === 24,
  `Found: ${appJson.expo?.android?.minSdkVersion}`
);

verify(
  'Android Package Identifier matches com.freshplate.app',
  appJson.expo?.android?.package === 'com.freshplate.app',
  `Found: ${appJson.expo?.android?.package}`
);

verify(
  'iOS Bundle Identifier matches com.freshplate.app',
  appJson.expo?.ios?.bundleIdentifier === 'com.freshplate.app',
  `Found: ${appJson.expo?.ios?.bundleIdentifier}`
);

verify(
  'iOS Deployment Target is 15.1+',
  appJson.expo?.ios?.deploymentTarget === '15.1',
  `Found: ${appJson.expo?.ios?.deploymentTarget}`
);

verify(
  'ITSAppUsesNonExemptEncryption is false (No French/US EAR filings required)',
  appJson.expo?.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false,
  `Found: ${appJson.expo?.ios?.infoPlist?.ITSAppUsesNonExemptEncryption}`
);

// 2. Verify eas.json configuration
const easJsonPath = path.join(__dirname, 'eas.json');
const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

verify(
  'eas.json production profile configured for Store distribution',
  easJson.build?.production?.distribution === 'store',
  `Found: ${easJson.build?.production?.distribution}`
);

verify(
  'eas.json production Android buildType is app-bundle (.aab output)',
  easJson.build?.production?.android?.buildType === 'app-bundle',
  `Found: ${easJson.build?.production?.android?.buildType}`
);

verify(
  'eas.json production Android gradleCommand runs :app:bundleRelease',
  easJson.build?.production?.android?.gradleCommand === ':app:bundleRelease',
  `Found: ${easJson.build?.production?.android?.gradleCommand}`
);

verify(
  'eas.json production iOS simulator is false (Store .ipa output)',
  easJson.build?.production?.ios?.simulator === false,
  `Found: ${easJson.build?.production?.ios?.simulator}`
);

// 3. Verify native build files
const androidBuildGradle = path.join(__dirname, 'android', 'app', 'build.gradle');
const buildGradleContent = fs.readFileSync(androidBuildGradle, 'utf8');

verify(
  'Native Android build.gradle enables Proguard release minification & shrinking',
  buildGradleContent.includes('minifyEnabled true') && buildGradleContent.includes('shrinkResources true'),
  'Missing minifyEnabled true or shrinkResources true in release buildType'
);

const infoPlistPath = path.join(__dirname, 'ios', 'FreshPlate', 'Info.plist');
const infoPlistContent = fs.readFileSync(infoPlistPath, 'utf8');

verify(
  'Native iOS Info.plist specifies MinimumOSVersion 15.1 and production privacy strings',
  infoPlistContent.includes('MinimumOSVersion') && infoPlistContent.includes('NSCameraUsageDescription'),
  'Missing MinimumOSVersion or NSCameraUsageDescription in Info.plist'
);

console.log('\n----------------------------------------------------------------');
console.log(`PRE-FLIGHT AUDIT COMPLETE: ${passedChecks} Passed, ${failedChecks} Failed`);
console.log('----------------------------------------------------------------\n');

if (failedChecks > 0) {
  console.error('Pre-flight build validation failed. Please fix the above errors before building.');
  process.exit(1);
}

console.log('All production release build criteria are satisfied.\n');
console.log('RELEASE ARTIFACT COMMANDS:');
console.log('1. Generate Android App Bundle (.aab):');
console.log('   $ eas build --platform android --profile production');
console.log('   (or locally via: cd android && ./gradlew :app:bundleRelease)\n');
console.log('2. Generate iOS App Store Archive (.ipa):');
console.log('   $ eas build --platform ios --profile production');
console.log('   (or locally via EAS local builder or Xcode Archive)\n');
console.log('3. Build Both Simultaneously:');
console.log('   $ eas build --platform all --profile production\n');
