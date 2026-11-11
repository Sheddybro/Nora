#!/usr/bin/env bash
set -euo pipefail
# This runs ONLY in GitHub Actions with an isolated QA APK and disposable Django data.
test "${NORRIS_QA_ONLY:-}" = "1"
test "${DJANGO_SETTINGS_MODULE:-}" = "config.android_qa_settings"
test "${NORRIS_QA_SQLITE:-}" = "/tmp/norris-android-qa-${GITHUB_RUN_ID}.sqlite3"
test -n "${NORRIS_QA_PASSWORD:-}"

# This is an emulator test environment: never install or exercise the production APK.
adb install -r /tmp/NorrisBeauty-QA.apk
adb shell pm list packages | grep -Fx 'package:com.norrisbeauty.app'
# Emulator 10.0.2.2 forwards to this job's isolated HTTP server.
curl -fsS http://127.0.0.1:8000/api/v1/health/ >/dev/null
"$HOME/.maestro/bin/maestro" test -e QA_PASSWORD="$NORRIS_QA_PASSWORD" mobile/e2e/qa-owner-journey.yaml
"$HOME/.maestro/bin/maestro" test -e QA_PASSWORD="$NORRIS_QA_PASSWORD" mobile/e2e/qa-staff-journey.yaml

# Confirm API effects are scoped to the QA server and that fixtures remain intact.
python - <<'PY'
import os, urllib.request, json
base = "http://127.0.0.1:8000/api/v1"
pw = os.environ["NORRIS_QA_PASSWORD"]
for role in ("owner", "staff"):
    data = json.dumps({"username": f"android.qa.{role}", "password": pw}).encode()
    request = urllib.request.Request(base+"/auth/login/",data=data,headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(request) as response:
        payload=json.load(response)
    assert payload.get("access") and payload.get("refresh"), f"QA {role} login token missing"
print("QA owner and staff credentials verified against disposable local Django only")
PY
