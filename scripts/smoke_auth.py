import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model


def call_api(method, path, payload=None, token=None):
    data = None
    headers = {'Accept': 'application/json'}
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'

    request = urllib.request.Request(f'http://127.0.0.1:8000{path}', data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read().decode('utf-8')
        return response.status, json.loads(body) if body else None


def main():
    User = get_user_model()
    User.objects.filter(username='api-owner').delete()
    user = User.objects.create_user(username='api-owner', password='secure-pass-123')
    from core.models import Business, Membership
    business = Business.objects.create(name='API Live Business')
    Membership.objects.create(user=user, business=business, role=Membership.OWNER)

    status, login_body = call_api('POST', '/api/v1/auth/login/', {'username': 'api-owner', 'password': 'secure-pass-123'})
    print('LOGIN', status, login_body)
    access_token = login_body['access']
    status, me_body = call_api('GET', '/api/v1/auth/me/', token=access_token)
    print('ME', status, me_body)
    status, perms_body = call_api('GET', '/api/v1/auth/permissions/', token=access_token)
    print('PERMISSIONS', status, perms_body)


if __name__ == '__main__':
    main()
