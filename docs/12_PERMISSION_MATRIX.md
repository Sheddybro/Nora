# NorrisBeauty permission matrix

## Role definitions

- Owner: full access to management and business administration functions.
- Staff: restricted operational access limited to tasks explicitly allowed by the backend permission model.

## Permission matrix

| Permission code | Owner | Staff |
| --- | --- | --- |
| `dashboard.view` | Yes | Yes |
| `catalog.view` | Yes | Yes |
| `catalog.manage` | Yes | No |
| `inventory.view` | Yes | Yes |
| `inventory.adjust` | Yes | No |
| `pos.use` | Yes | Yes |
| `sales.view` | Yes | Yes |
| `customers.view` | Yes | Yes |
| `purchases.manage` | Yes | No |
| `reports.view` | Yes | No |
| `staff.manage` | Yes | No |
| `settings.manage` | Yes | No |

## Web page access

- `/products/` -> `catalog.view`
- `/inventory/` -> `inventory.view`
- `/pos/` -> `pos.use`
- `/sales/` -> `sales.view`
- `/customers/` -> `customers.view`
- `/purchases/` -> `purchases.manage`
- `/reports/` -> `reports.view`
- `/staff/` -> `staff.manage`
- `/settings/` -> `settings.manage`

## Phase 4 API writes

- `GET /api/v1/catalog/categories/` and `GET /api/v1/catalog/products/` require `catalog.view`.
- `POST /api/v1/catalog/categories/` and `POST /api/v1/catalog/products/` require `catalog.manage`.
- `GET /api/v1/inventory/locations/` and `GET /api/v1/inventory/stock/` require `inventory.view`.
- `POST /api/v1/inventory/locations/` and `POST /api/v1/inventory/movements/` require `inventory.adjust`.
- `GET /api/v1/inventory/movements/` requires `inventory.view`.
- Browser session writes additionally require a valid CSRF token. Mobile calls use the membership-bound JWT.

## Security model

The backend permission check is authoritative. Hidden frontend controls are not sufficient for access control, and direct URL access is blocked by the server-side checks.
