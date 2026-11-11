#!/usr/bin/env bash
set -euo pipefail

adb install -r /tmp/NorrisBeauty.apk
adb shell pm list packages | grep -F 'package:com.norrisbeauty.app'
"$HOME/.maestro/bin/maestro" test mobile/e2e/login-smoke.yaml

# Validate the installed application starts and gives local validation feedback
# even when the emulator has no network connection. Do not submit credentials.
adb shell svc wifi disable
adb shell svc data disable
"$HOME/.maestro/bin/maestro" test mobile/e2e/offline-login-smoke.yaml
