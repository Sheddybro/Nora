# Mobile API configuration guide

## Local development

The Expo client expects a Django API base URL such as:

- `http://192.168.1.10:8000/api/v1`

Use the actual LAN IP of the machine running Django, not `127.0.0.1` from the handset.

## Required environment variables

In `mobile/.env` or a local env file, set:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000/api/v1
EXPO_PUBLIC_PREVIEW_ROLE=owner
```

## Django server configuration

For local LAN testing:

- Start Django with the development server.
- Add the LAN IP to `DJANGO_ALLOWED_HOSTS` in the project environment.
- Ensure the Windows Firewall allows inbound connections for Python/Django on port 8000.
- Use the same Wi-Fi network for the Android device and the development machine.

Example:

```env
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,192.168.1.10
```

## Production

- Require HTTPS.
- Use a trusted certificate and a production-safe secret key.
- Disable local debug mode.
- Keep the access token refresh lifecycle short and rotate refresh tokens on use.

## Security note

Native app sessions are stored in Expo SecureStore and credentials are not written to AsyncStorage or plain text files. Expo Web uses volatile in-memory session state only; a page reload requires a new sign-in.

## Mobile offline behavior

The app stores pending stock movements in AsyncStorage, scoped to the authenticated user and business, and retries them when the authenticated app starts, connectivity returns, or the app is foregrounded. Exact request payloads and idempotency keys are retained for server replay. Permanent validation or permission errors are shown as conflicts for review. POS checkout requires a live connection. This is foreground-only behavior and still requires physical-device E2E verification; it is not a background sync guarantee.

## Private Android QA APK

`mobile/eas.json` defines an internal APK profile named `privateDemo` with the HTTPS URL for the temporary PythonAnywhere demo. The Expo project is linked in `mobile/app.json`. This profile is for private QA only; the backend uses disposable SQLite, and real business records must not be entered.

No APK has been built yet. EAS cloud builds upload the app source to Expo; that upload was not started. `eas build --local` was attempted and is unsupported on Windows. The available Android SDK directory has no `platforms`, `build-tools`, or `cmdline-tools`; the installed Java runtime is 11, and there is no attached Android device.

The Windows machine needs a local Android build toolchain (Android Studio SDK platform/build tools and a supported JDK) before a local APK can be produced without uploading source. The APK will still require a privately provisioned Django account to sign in. This internal demo build is not a Play Store release or production acceptance.

Public mobile release requires a PostgreSQL-backed production API, approved backup/restore and rollback, release security checks, and native-device acceptance. Do not reuse the demo API profile for real users or data.
