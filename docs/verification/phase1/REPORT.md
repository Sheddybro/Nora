# Phase 1 Verification Report

- Phase: 1 - Foundation
- Date: 2026-10-29
- Environment: Windows 11, Python 3.13.2, Django 5.2.18, Node 22.13.0, npm 11.4.0, Expo SDK 54
- Commit: Not recorded; the active Git root resolves to `C:/Users/DELL`, outside this project, and the workspace is not an isolated repository.
- Device verification: Expo Go opened and rendered on the user's Android phone; the supplied screenshots show the starter screen and its scrollable lower sections.
- Decision: ACCEPTED WITH DOCUMENTED LIMITATIONS on 2026-10-29 by user instruction. This accepts the remaining Metro build-tool advisory and defers role-restricted business actions; it does not mark either issue fixed or verified.

## Files changed or generated

- `core/migrations/0001_initial.py`: initial Business and Membership schema.
- `mobile/package.json`, `mobile/package-lock.json`: Expo-compatible `typescript` and `@types/react` dev dependencies added after Expo startup requested them.
- `mobile/package.json`, `mobile/package-lock.json`: added SDK 54-compatible `expo-linking` required by Expo Router and aligned React Native to the SDK's expected `0.81.5` patch.
- `mobile/package.json`, `mobile/package-lock.json`: added the Expo SDK 54-compatible PostCSS `8.5.32` override. An `image-size@2.0.4` override was tested and reverted because Android export failed when Metro processed an image asset.
- `mobile/app/index.tsx`: replaced deprecated React Native `SafeAreaView` with `react-native-safe-area-context`.
- `core/tests.py`: added valid/invalid login workflow tests and checks that ordinary Owner/Staff memberships cannot enter Django Admin.
- `mobile/tsconfig.json`: generated automatically by Expo on startup.
- `docs/10_SETUP_WINDOWS.md`: LAN Expo and Django API reachability instructions.
- `docs/verification/phase1/REPORT.md`: this report.
- `docs/verification/phase1/login.png`, `owner-dashboard.png`, `staff-dashboard.png`: browser screenshots captured from the running local web server.
- Android phone screenshots were supplied in the conversation by the user. They confirm the starter screen rendered on-device, but are not stored in the workspace.

Local-only setup/runtime artifacts: `.env`, `db.sqlite3`, `mobile/node_modules/`, `mobile/.expo/`, and `mobile/dist/`. These are generated local state, not deliverable source changes.

## Checks and actual results

| Check | Result |
|---|---|
| `python -m pip install -r requirements.txt` | Passed; requirements installed/already satisfied. |
| `python manage.py check` | Passed; no issues (0 silenced). |
| `python manage.py makemigrations core` | Passed; generated initial Business and Membership migration. |
| `python manage.py migrate --noinput` | Passed; Django auth/admin/contenttypes/core/sessions migrations applied to SQLite. |
| `python manage.py makemigrations --check --dry-run` | Passed; no changes detected. |
| `python manage.py test` | Passed; final suite 8 tests, 0 failures. Includes valid/invalid login and owner/staff non-staff Admin boundary tests. |
| `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest -p pytest_django.plugin` | Earlier pass; 5 tests before the three auth/Admin tests were added. Plain pytest initially failed before collection because a globally installed `pytest-cov` plugin could not import `coverage`; isolated plugin autoload to use the project's declared pytest-django plugin. |
| Django HTTP smoke: `/health/`, `/api/v1/health/`, `/login/` | Passed; all returned HTTP 200. |
| Browser login/dashboard | Passed for local Owner and Staff fixtures. Custom pages displayed `OWNER DASHBOARD` and `STAFF DASHBOARD`; dashboard metrics remain clearly empty/not populated. |
| `npm ci` | Passed from `mobile/` using standard npm peer resolution; 794 packages installed. Lockfile is reproducible. |
| `npx expo export --platform android --clear` | Passed with final dependencies; Android Hermes bundle emitted (2.52 MB). A test override to `image-size@2.0.4` caused Metro to fail on `expo-router/assets/file.png`; that override was reverted and the successful export rerun. |
| `npx expo export --platform web` | Not supported by current dependency set; Expo requested `react-native-web`. No web-only dependency was added. |
| `npx expo start --lan` | Passed; Metro advertised `exp://192.168.20.253:8081`. User supplied Android screenshots show Expo Go rendered the app. |
| `npx expo install --check` | Passed after the final clean install; dependencies are up to date. |
| `python manage.py check --deploy` | Warnings only, expected for local development configuration: DEBUG on, sample/short secret, HTTPS redirect and secure cookies/HSTS not configured. Not production-ready. |
| `npm audit` | 13 advisories remain: 9 low, 3 moderate, 1 high, 0 critical. The prior high `postcss` finding is fixed with `postcss@8.5.32`. Remaining high is `image-size@1.2.1`, below `metro@0.83.3`, with two DoS advisories: GHSA-5p2g-fcmc-qvqq (JXL/HEIF parser infinite loops; affected `>=1.2.0 <=2.0.2`) and GHSA-w3rx-r6r6-pgpr (ICNS parser infinite loops; affected `>=0.6.3 <=2.0.2`). `image-size@2.0.4` is patched but breaks this Metro build; not retained. |
| Production Android exposure assessment | `image-size` and `postcss` are used under Metro/Expo build tooling; they are not imported by the NorrisBeauty app code or shipped in its Android Hermes bundle. The vulnerable parser can affect developer/CI bundling if untrusted image files are processed. Keep Metro local/trusted, do not bundle untrusted assets, and plan a compatible Metro upgrade. |
| Mobile API connectivity | Not end-to-end verified. The Expo screen only displays API setup guidance; no API client/auth flow exists. LAN URL is configuration guidance, not a claim that mobile calls the API. |

## Screenshot evidence

- [Login](login.png)
- [Owner dashboard](owner-dashboard.png)
- [Staff dashboard](staff-dashboard.png)
- Android Expo Go starter screen and scrolled content: supplied as user chat attachments on 2026-10-29; not copied into the workspace, so no repository screenshot path is claimed.

## Acceptance notes and outstanding issues

- Django foundation and all eight tests pass; SQLite migrations are present and synchronized.
- The custom NorrisBeauty dashboard is used for Owner/Staff; Django Admin remains a separate `/admin/` technical interface. The Phase 1 dashboards share the same foundation layout and differ by role label; the fully differentiated analytics/permission-rich dashboards belong to later approved UI/identity scope and are not claimed as complete.
- The Admin boundary is verified: ordinary Owner/Staff Membership accounts are not Django staff and are redirected to `/admin/login/`. No existing business-management action/API is role-restricted, so Owner-vs-Staff restricted functionality cannot yet be tested. The only business route is the same dashboard shell with role-specific text.
- Expo SDK 54 startup, clean `npm ci`, compatibility check, Android export and basic Android Expo Go rendering are verified. The phone screenshots do not prove mobile API connectivity or authenticated workflows.
- One high-severity build-tool advisory remains unresolved. The direct safe override attempt to patched `image-size@2.0.4` broke Metro export; safe resolution requires an upstream Metro release with compatible API updates or an explicitly tested patch/fork. Remaining lower findings include moderate Expo Router/query-string dependency advisories; see `npm audit` for current details.
- Current computer Wi-Fi IPv4 during verification: `192.168.20.253`; DHCP may change it. Expo's mobile `.env.example` contains a sample IP, not a functioning API connection. Django must bind to `0.0.0.0` and allow the phone's host IP before API reachability can be tested.
- Production deployment checks remain blocked until production environment values and HTTPS configuration are supplied.
- Git root resolves to `C:/Users/DELL`, above the NorrisBeauty folder, and already contains extensive unrelated changes. NorrisBeauty files are untracked in that parent repository; do not stage or commit from the parent root without first isolating the project and reviewing the full status.

## Next recommended action

Accepted limitations: the user explicitly accepted the documented single Metro-only high advisory and the absence of Owner/Staff business-action permissions as Phase 1 limitations in chat on 2026-10-29, permitting Phase 2 UI work. The advisory remains unresolved and role authorization remains unimplemented; Phase 2 UI must not imply either is fixed. Mobile LAN/API instructions are in `docs/10_SETUP_WINDOWS.md`.
