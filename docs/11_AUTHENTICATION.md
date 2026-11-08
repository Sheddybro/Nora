# NorrisBeauty authentication architecture

## Overview

NorrisBeauty now uses a shared identity model for both the Django web app and the Expo mobile app. The Django backend is the source of truth for users, business memberships, ownership, and the permission matrix. The mobile app authenticates against the same Django user database and stores only a secure token/session payload in Expo SecureStore.

## Shared backend identity model

- User model: Django default auth model with business membership records.
- Membership: each user can belong to one or more businesses through the `Membership` model.
- Roles: `owner` and `staff`.
- Permission matrix: the backend resolves a user’s effective permissions from their active business membership.
- JWT lifecycle: access tokens are short-lived; refresh tokens maintain the membership context and are rotated on refresh.

## Web authentication

- Django `LoginView` is used for the web login page.
- Session-based auth is used for browser navigation and protected dashboard views.
- Protected page routes are guarded by `@login_required` and `membership_has_permission` checks.
- Password reset uses Django’s built-in password reset flow with themed templates.

## API auth contract

- `POST /api/v1/auth/login/`: authenticates a user and returns access + refresh tokens with membership context.
- `POST /api/v1/auth/refresh/`: rotates the refresh token and reissues access/refresh tokens.
- `POST /api/v1/auth/logout/`: blacklists the refresh token and clears the session.
- `GET /api/v1/auth/me/`: returns the authenticated user, role and business context.
- `GET /api/v1/auth/permissions/`: returns the backend-derived permission list for the active membership.
- `POST /api/v1/auth/password/`: validates and changes the current password.
- Catalog and inventory API requests use the same membership-bound JWT as mobile authentication. Same-origin browser requests may use the active Django session; browser writes still require CSRF validation.

## Mobile authentication

The Expo client uses a secure session store rather than AsyncStorage for auth secrets:

- `mobile/lib/auth.ts` persists the access token, refresh token, role, and business metadata in Expo SecureStore on native platforms. Expo Web keeps the session in memory only and requires reauthentication after a page reload; it does not persist browser tokens.
- `mobile/app/components/AuthContext.tsx` hydrates the stored session on startup.
- The authenticated provider retries user/business-scoped queued stock movements on app startup, connectivity restoration, and foregrounding. Queue contents are operational data in AsyncStorage, separate from auth secrets; they are not replayed under a different user/business.
- `mobile/app/login.tsx` signs the user in through the shared Django API and routes them to the authenticated app shell.
- Role-based mobile navigation follows the backend role and is not trusted from a client-only preview switch.

## Security notes

- Access tokens are required on protected API requests.
- The backend verifies the active membership on every JWT-authenticated request.
- Staff default permissions are restricted to operational business functions unless explicitly granted.
- Owner access remains broad.
- Refresh token invalidation is enforced on logout and rotation.
- The mobile client serializes concurrent refresh attempts so only one rotated refresh token is issued for simultaneous expired-access requests. Logout validates the JWT user identifier regardless of whether the token library decodes it as a string or integer.

## Current limitations

- The mobile auth and foreground queue lifecycle are implemented but have not yet received full physical-device verification on a real Android handset.
- The permission system is centralized and ready for future custom roles, but it does not yet expose a user-configurable permission UI.
- Mobile customer listing and creation, Owner supplier/single-line purchase-order lifecycle, report summaries/expense capture, and online POS checkout are implemented against the shared API. Richer multi-line purchasing and background sync remain incomplete. Stock movement writes can queue locally for foreground retry. Expo physical-device verification remains pending.
