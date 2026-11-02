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

The app stores only the session payload in Expo SecureStore and does not write credentials into AsyncStorage or plain text files.
