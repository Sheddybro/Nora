# NorrisBeauty Feature Coverage Matrix

This matrix maps the implemented repository surfaces to the 100-step execution manual. A step is evidence to collect, not proof that the feature currently passes.

| Feature/surface | Implementation evidence | Coverage steps | Current acceptance note |
|---|---|---:|---|
| Django health/setup/migrations | `manage.py`, `/health/`, `/api/v1/health/` | 01, 05, 96, 97, 99 | Automated checks required |
| Web login/logout/session | `core/urls.py`, registration templates | 06–09, 14–15 | Browser execution required |
| JWT login/refresh/logout/me/permissions/password | `core/api_views.py` | 10–15, 94–95 | Mobile uses shared API |
| Business/membership/tenant scope | `core/models.py`, permissions | 02, 13–15, 71, 94 | Security-critical |
| Owner/staff dashboard shell | `templates/core/dashboard.html` | 16–18, 20, 79 | Some metrics may be intentionally unavailable |
| Responsive/theme/accessibility | `static/css/`, templates, design system | 19–25, 98 | Screenshots required |
| Categories | catalog API/serializers | 27 | Duplicate and owner checks |
| Products/variants/SKU/barcode | catalog API/serializers | 26, 28–30, 42, 91 | Barcode is text/keyboard-wedge, not camera |
| Product images | upload validator/API | 31–32, 25 | Physical/mobile image acceptance pending |
| Locations/batches/expiry | inventory models/API | 33, 37, 39 | Verify immutable batch fields |
| Receipts/adjustments/valuation | inventory services/API | 34–38, 64, 93 | Weighted-average cost |
| Idempotent stock movement | inventory services/API/offline queue | 36, 90, 93 | Foreground queue only |
| Transfers/stocktakes/alerts | inventory services/API | 39–40 | API-focused |
| POS basket/checkout/payment | sales services/API/web/mobile POS | 41–48, 52–55, 87, 92 | POS online-only |
| Sales history/invoices/refunds | sales API/templates | 49–51, 54, 92 | Validate server totals |
| Suppliers/purchase orders | purchasing services/API/mobile workspace | 56–65, 89 | Mobile single-line scope |
| Staff management | staff API/templates/permissions | 66–73 | Granular UI may be incomplete |
| Customers listing/privacy | customers API/mobile/web | 49, 88, 91 | Customer creation UI not complete |
| Expenses/reports | finance services/API/templates | 74–80, 89, 92 | Some finance screens may be demo-only |
| Audit events/notifications | finance/API/models | 73, 78, 94 | No credentials in audit |
| Mobile shell/auth/storage | Expo router/AuthContext/auth lib | 11–12, 81–83 | Physical-device verification pending |
| Mobile catalog/stock | mobile `catalog.tsx`, `inventory.tsx` | 84–86, 90–93 | Device/E2E pending |
| Mobile POS | mobile `pos.tsx` | 86–87, 92–93 | Device/network interruption pending |
| Mobile purchasing/More | mobile More/workspace components | 89 | Rich editing out of scope |
| Offline sync | `mobile/lib/offlineQueue.ts` | 15, 36, 65, 90, 93 | Foreground-only |
| Deployment/security/recovery | `docs/14_DEPLOYMENT.md` | 01, 05, 94–99 | Staging evidence required |
