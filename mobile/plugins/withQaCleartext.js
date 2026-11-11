// Android emulator E2E connects ONLY to disposable runner-local HTTP.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withQaCleartext(config) {
  if (process.env.NORRIS_QA_BUILD !== '1') {
    throw new Error('QA-only cleartext configuration used outside QA build');
  }
  return withAndroidManifest(config, (next) => {
    const application = next.modResults.manifest.application?.[0];
    if (!application) throw new Error('AndroidManifest application element is missing');
    application.$ = {
      ...(application.$ || {}),
      'android:usesCleartextTraffic': 'true',
    };
    return next;
  });
};
