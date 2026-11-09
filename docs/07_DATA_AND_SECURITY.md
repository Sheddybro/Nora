# Data and security contracts

- Every business-owned row must have an explicit Business foreign key. Never trust a client-supplied business ID for authorization.
- Owner and Staff are the only current roles. Introduce per-feature permissions; do not assume Staff can perform refunds, edit prices, or view profit.
- Monetary values use Decimal and explicit currency (NGN initially); no float arithmetic.
- Stock movements must be append-only and atomic; use idempotency keys for POS checkout and synchronization.
- Define inventory cost method (weighted-average or FIFO) before implementing valuation. Do not silently change methods.
- For batch/expiry, use batch-level quantities and immutable movement history.
- Payment processing must use provider-hosted flows; never store card data.
- Offline stock movements: persist pending requests locally with user/business scope and client-generated idempotency keys; the server remains authoritative. Retry on authenticated startup, connectivity restoration, and foregrounding; show permanent validation/authorization conflicts. POS sales are not queued. Background execution, device recovery, and physical-device E2E remain unverified; do not claim full offline support.
- Audit log must capture actor, business, event, timestamp, and redacted before/after values; do not store credentials.
- Test SQLite and PostgreSQL for transactional semantics and constraints; PostgreSQL is the production target.
- Login, API auth, CSRF, secure cookies, throttling and tenant isolation require separate security acceptance tests.
- Desktop PWA service worker: cache only same-origin static assets and the public offline shell. Never cache authenticated HTML pages, API responses, or business writes. Confirm this boundary after changes to service-worker routing.
- Desktop PWA snapshot: only active product names/categories, active variant names/SKUs/barcodes, and stock quantities by location/reorder point may be saved. Do not save prices, costs, customers, sales, reports, staff, suppliers, images, passwords, or raw API responses.
- The snapshot is encrypted with AES-GCM using a key derived from a separate passphrase via PBKDF2-SHA-256 (600,000 iterations); only ciphertext and the encryption metadata are persisted in IndexedDB. The passphrase and key are not persisted. Decrypted data exists in page memory only while unlocked.
- Snapshot expiry is 24 hours; the app locks after five minutes idle and when hidden, and the web logout flow deletes the snapshot. Expiration and auto-lock are app-enforced client-side controls, not protection against a device owner who deliberately modifies browser storage or captures data while unlocked.
- If membership access is revoked while a device is offline, the cached encrypted snapshot may still be unlocked until it expires. Do not use offline quantities for sales, payments, or inventory decisions without reconnecting. POS and all writes remain online-only.
