const fs = require('fs');
const path = require('path');

function runComplianceAudit() {
  console.log('=== STARTING APP STORE & GOOGLE PLAY COMPLIANCE AUDIT ===');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  const expectedCameraMsg = "FreshPlate requires camera access to scan grocery receipts and fridge shelves.";
  const expectedPhotosMsg = "FreshPlate accesses your photos so you can upload saved receipts and food images.";

  // 1. Audit mobile/app.json
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  assert(
    'app.json infoPlist NSCameraUsageDescription matches exact required message',
    appJson.expo?.ios?.infoPlist?.NSCameraUsageDescription === expectedCameraMsg,
    `Found: ${appJson.expo?.ios?.infoPlist?.NSCameraUsageDescription}`
  );

  assert(
    'app.json infoPlist NSPhotoLibraryUsageDescription matches exact required message',
    appJson.expo?.ios?.infoPlist?.NSPhotoLibraryUsageDescription === expectedPhotosMsg,
    `Found: ${appJson.expo?.ios?.infoPlist?.NSPhotoLibraryUsageDescription}`
  );

  const cameraPlugin = appJson.expo?.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-camera');
  assert(
    'app.json expo-camera plugin contains exact cameraPermission',
    cameraPlugin && cameraPlugin[1]?.cameraPermission === expectedCameraMsg,
    `Found: ${cameraPlugin?.[1]?.cameraPermission}`
  );

  const imagePickerPlugin = appJson.expo?.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-image-picker');
  assert(
    'app.json expo-image-picker plugin contains exact photosPermission',
    imagePickerPlugin && imagePickerPlugin[1]?.photosPermission === expectedPhotosMsg,
    `Found: ${imagePickerPlugin?.[1]?.photosPermission}`
  );

  // 2. Audit iOS Info.plist
  const infoPlistPath = path.join(__dirname, 'ios', 'FreshPlate', 'Info.plist');
  const infoPlist = fs.readFileSync(infoPlistPath, 'utf8');

  assert(
    'Info.plist contains NSCameraUsageDescription with exact message',
    infoPlist.includes(`<key>NSCameraUsageDescription</key>\n\t<string>${expectedCameraMsg}</string>`) ||
    infoPlist.includes(expectedCameraMsg),
    'Missing exact camera message in Info.plist'
  );

  assert(
    'Info.plist contains NSPhotoLibraryUsageDescription with exact message',
    infoPlist.includes(`<key>NSPhotoLibraryUsageDescription</key>\n\t<string>${expectedPhotosMsg}</string>`) ||
    infoPlist.includes(expectedPhotosMsg),
    'Missing exact photo library message in Info.plist'
  );

  // 3. Audit AndroidManifest.xml
  const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifest = fs.readFileSync(manifestPath, 'utf8');

  assert(
    'AndroidManifest.xml declares CAMERA permission with Play Store rationale',
    manifest.includes('android.permission.CAMERA') && manifest.includes(expectedCameraMsg),
    'Missing camera permission or rationale in AndroidManifest.xml'
  );

  assert(
    'AndroidManifest.xml declares READ_MEDIA_IMAGES permission with Play Store rationale',
    manifest.includes('android.permission.READ_MEDIA_IMAGES') && manifest.includes(expectedPhotosMsg),
    'Missing media images permission or rationale in AndroidManifest.xml'
  );

  // 4. Audit SettingsScreen.tsx
  const settingsScreenPath = path.join(__dirname, 'src', 'components', 'SettingsScreen.tsx');
  const settingsScreenContent = fs.readFileSync(settingsScreenPath, 'utf8');

  assert(
    'SettingsScreen contains direct link to hosted Privacy Policy (freshplate.app/privacy)',
    settingsScreenContent.includes('https://freshplate.app/privacy'),
    'Missing hosted privacy policy URL'
  );

  assert(
    'SettingsScreen explicitly discloses Google Gemini AI Vision processing',
    settingsScreenContent.includes('Gemini') && settingsScreenContent.includes('Google'),
    'Missing Google Gemini AI disclosure in SettingsScreen'
  );

  assert(
    'SettingsScreen contains explicit "Delete Account & Clear Data" option',
    settingsScreenContent.includes('Delete Account & Clear Data'),
    'Missing Delete Account & Clear Data title'
  );

  assert(
    'SettingsScreen references Apple App Store Guideline 5.1.1(v) compliance',
    settingsScreenContent.includes('5.1.1(v)') || settingsScreenContent.includes('5.1.1'),
    'Missing Apple Guideline 5.1.1 compliance reference'
  );

  // 5. Audit App.tsx navigation to SettingsScreen
  const appTsxPath = path.join(__dirname, 'App.tsx');
  const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

  assert(
    'App.tsx includes settings in AppScreen union and renders SettingsScreen',
    appTsxContent.includes("'settings'") && appTsxContent.includes('<SettingsScreen'),
    'SettingsScreen not wired into App.tsx'
  );

  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runComplianceAudit();
