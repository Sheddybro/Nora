# Catalog and inventory API v1

All paths below are under `/api/v1/`. Requests are scoped to the membership validated by JWT or active browser session. Clients must not send a business ID as authorization context. Browser writes require Django CSRF; mobile writes use the membership-bound bearer token.

## Catalog

- `GET catalog/categories/` returns `{ "results": [{ "id", "name" }] }`.
- `POST catalog/categories/` accepts `{ "name" }`; owner permission `catalog.manage` is required.
- `GET catalog/products/` returns `{ "results": [...] }`, including category name, variants, and image metadata.
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

Product, variant, image, and category records are business-scoped. Variant SKUs are unique per business. Image support currently stores external URL and alt text metadata; upload/storage integration is not implemented.

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

Receipts require a positive quantity and unit cost. Adjustments can be positive or negative, must identify an existing batch, and cannot reduce that batch below zero. Batch expiry and original batch unit cost cannot be changed after creation. All movements record actor, reason, timestamp, source kind, and idempotency key. A repeated identical key/payload returns the original movement; using the key for a different payload is rejected.

Variant valuation uses weighted-average cost, rounded to two decimal places. Receipts update weighted average atomically with batch balance and ledger creation. Sales/consumption, transfers, stocktakes, valuation reconciliation, image upload storage, and offline sync are later scope.

## Permissions

- Catalog reads: `catalog.view`; catalog creates: `catalog.manage`.
- Inventory reads: `inventory.view`; location and movement writes: `inventory.adjust`.
- Default Staff may read catalog and inventory only. Owner writes are allowed. Custom membership permissions remain server-validated.

## Known limitations

No update/delete API is exposed yet. Deactivate or correct records through an approved future workflow. External image URLs are not fetched or validated as owned assets. Mobile Phase 4 screens read catalog and stock but do not yet create records or movements.

## Verification evidence

- Browser workflow and automated checks: `docs/verification/phase4/REPORT.md`.
- 390px web captures: `docs/verification/phase4/products-390.png` and `docs/verification/phase4/inventory-390.png`.
