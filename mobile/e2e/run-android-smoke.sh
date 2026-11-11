#!/usr/bin/env bash
set -euo pipefail

adb install -r /tmp/NorrisBeauty.apk
adb shell pm list packages | grep -F 'package:com.norrisbeauty.app'
"$HOME/.maestro/bin/maestro" test mobile/e2e/login-smoke.yaml
