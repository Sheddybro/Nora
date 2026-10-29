# Data and security contracts

- Every business-owned row must have an explicit Business foreign key. Never trust a client-supplied business ID for authorization.
- Owner and Staff are the only current roles. Introduce per-feature permissions; do not assume Staff can perform refunds, edit prices, or view profit.
- Monetary values use Decimal and explicit currency (NGN initially); no float arithmetic.
- Stock movements must be append-only and atomic; use idempotency keys for POS checkout and synchronization.
- Define inventory cost method (weighted-average or FIFO) before implementing valuation. Do not silently change methods.
- For batch/expiry, use batch-level quantities and immutable movement history.
- Payment processing must use provider-hosted flows; never store card data.
- Offline: define local queue, conflict policy, server authority and device recovery before enabling offline writes.
- Audit log must capture actor, business, event, timestamp, and redacted before/after values; do not store credentials.
- Test SQLite and PostgreSQL for transactional semantics and constraints; PostgreSQL is the production target.
- Login, API auth, CSRF, secure cookies, throttling and tenant isolation require separate security acceptance tests.
