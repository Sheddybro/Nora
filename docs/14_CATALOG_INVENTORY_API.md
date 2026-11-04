# Catalog and inventory API v1

All paths below are under `/api/v1/`. Requests are scoped to the membership validated by JWT or active browser session. Clients must not send a business ID as authorization context. Browser writes require Django CSRF; mobile writes use the membership-bound bearer token.

## Catalog

- `GET catalog/categories/` returns `{ "results": [{ "id", "name" }] }`.
- `POST catalog/categories/` accepts `{ "name" }`; owner permission `catalog.manage` is required.
- `GET catalog/products/` returns `{ "results": [...] }`, including category name, variants, and image metadata.
- `GET catalog/products/?barcode={value}` returns products containing a case-insensitive exact variant barcode match. This is intended for mobile barcode lookup; it remains business-scoped.
- `POST catalog/products/` accepts a product plus optional nested variants and images. Example:

```json
{
  "name": "Radiance Serum",
  "category": 1,
  "variants": [
    {"name": "30 ml", "sku": "NB-SK-104", "barcode": "", "price": "18500.00", "unit_cost": "6000.00", "reorder_point": 8}
  ],
  "images": [
    {"image_url": "https://assets.example.test/radiance.jpg", "alt_text": "Radiance Serum bottle", "position": 0}
  ]
}
```

Product, variant, image, and category records are business-scoped. Variant SKUs and non-empty barcodes are case-insensitively unique per business. Product images may be supplied as external URL metadata when creating a product, or uploaded to configurable Django media storage:

- `POST catalog/products/{product_id}/images/` accepts multipart `image`, `alt_text`, optional `position`, and optional `is_primary`. Uploaded files must be JPEG, PNG, or WebP, no larger than 5 MiB, and within the configured dimension limits. Storage paths are scoped by business and product.
- `PATCH catalog/products/{product_id}/images/{image_id}/` updates image metadata or replaces the upload.
- `DELETE catalog/products/{product_id}/images/{image_id}/` removes the image record and stored file.
- `GET catalog/products/{product_id}/` returns a business-scoped product and its image metadata.

Image writes require `catalog.manage`; the upload endpoint additionally enforces the owner role. External image URLs are retained as metadata and are not fetched or validated as owned assets.

## Inventory

- `GET inventory/locations/` lists active locations; `POST` creates a location and requires `inventory.adjust`.
- `GET inventory/stock/` returns variant/location balances, reorder point, weighted-average unit cost, and valuation.
- `GET inventory/movements/` returns the latest 100 append-only ledger events.
- `POST inventory/movements/` records a receipt or adjustment. `inventory.adjust` is required. Example:

```json
{
  "kind": "receipt",
  "variant_id": 1,
  "location_id": 1,
  "batch_number": "LOT-001",
  "expiry_date": "2027-12-31",
  "quantity_delta": 10,
  "unit_cost": "6000.00",
  "reason": "Supplier delivery",
  "idempotency_key": "device-generated-unique-key"
}
```

Receipts require a positive quantity and unit cost. Adjustments can be positive or negative, must identify an existing batch, and cannot reduce that batch below zero. Batch expiry and original batch unit cost cannot be changed after creation. All movements record actor, reason, timestamp, source kind, and idempotency key. A repeated identical key/payload returns the original movement; using the key for a different payload is rejected. Product/category edits and deactivation are available through their business-scoped detail endpoints. Inventory writes require `inventory.adjust`.

Variant valuation uses weighted-average cost, rounded to two decimal places. Receipts update weighted average atomically with batch balance and ledger creation. Sales/consumption, transfers, and stocktakes use their documented shared API workflows. Mobile stock movement requests can be queued locally and replayed with their original idempotency keys while the authenticated app is active; POS checkout remains online-only.

## Mobile parity endpoints

- `GET customers/?search={query}&page={page}&limit={limit}` requires `customers.view` and returns active customers scoped to the authenticated business. Results include name, email, phone, and creation time; the endpoint does not expose customer notes.
- `POST pos/checkout/` accepts a location, line items, payment method, paid amount, and an optional `idempotency_key`. The mobile POS always supplies a key. Exact retries return the original sale with HTTP 200; reusing the key with a different location, line, payment method, or paid amount is rejected. New checkouts return HTTP 201.
- `POST purchasing/orders/` accepts supplier, location, order lines, and an optional `idempotency_key`. The mobile client always sends a key. Exact retries return the original order with HTTP 200; reusing a key with changed supplier/location/date/lines is rejected. New orders return HTTP 201.

## Permissions

- Catalog reads: `catalog.view`; catalog creates/updates/deactivation and image writes: `catalog.manage` (the image-upload endpoint also requires the owner role).
- Inventory reads: `inventory.view`; location and movement writes: `inventory.adjust`.
- Default Staff may read catalog and inventory only. Owners can write through the web and Expo clients; owners may explicitly grant additional membership permissions, which the API validates server-side.

## Known limitations

Expo image picking, product creation/image upload, stock receipt/adjustment, barcode lookup, POS checkout, customer listing, and core supplier/purchase-order workflows have code-level API integration but have not yet been verified on a physical Android device. External image URLs are not fetched or validated as owned assets. The offline stock queue is foreground-only; customer creation and advanced purchasing order editing remain incomplete.

## Verification evidence

- Browser workflow and automated checks: `docs/verification/phase4/REPORT.md`.
- 390px web captures: `docs/verification/phase4/products-390.png` and `docs/verification/phase4/inventory-390.png`.
