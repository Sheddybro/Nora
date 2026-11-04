# Windows PowerShell setup

```powershell
cd NorrisBeauty_Complete_Copilot_Starter
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py makemigrations core
python manage.py migrate
python manage.py createsuperuser
python manage.py test
python manage.py check
python manage.py runserver
```

Open http://127.0.0.1:8000/login/ and sign in with your superuser. Dashboard metrics intentionally show dashes until the real business modules are built. To attach a business/role, use Django admin to create a Business and Membership.

In a second terminal:
```powershell
cd NorrisBeauty\mobile
npm ci
Copy-Item .env.example .env  # only when mobile/.env does not already exist
npx expo start --lan
```

For Expo Go on a physical Android phone, connect the phone and computer to the same Wi-Fi and scan the QR code printed by Expo. Do not use `127.0.0.1` or `localhost` as the phone's API host; those addresses refer to the phone itself.

The mobile app supports portrait and landscape orientation. If part of the phone touchscreen is unresponsive, rotate the phone and enable Android Auto-rotate; the sign-in form can scroll and adjusts when the keyboard opens. Restart Expo after changing orientation configuration.

To check the computer's Wi-Fi IPv4 address, run `ipconfig` and read the IPv4 address under the active Wi-Fi adapter. During the 2026-10-29 verification this was `192.168.20.253`; it can change when DHCP renews.

For a future phone-to-Django API connectivity test, set the current LAN IP in the project-root `.env` allowlist, for example:
```dotenv
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,192.168.20.253
```
Replace the example address with the current Wi-Fi IPv4. Start Django from the project root so it listens on the LAN interface:
```powershell
python manage.py runserver 0.0.0.0:8000
```
If Windows Firewall prompts, allow Python on the private network. Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to `http://192.168.20.253:8000/api/v1` (again, replace the sample IP) before restarting Expo. From the phone browser, `http://<computer-wifi-ip>:8000/api/v1/health/` should return the health JSON.

The mobile app currently remains a UI starter: it is not authenticated, has no API client, and does not make a request to `EXPO_PUBLIC_API_URL`. The phone URL instructions establish network reachability only; do not treat them as mobile API integration verification.
