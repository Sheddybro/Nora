from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from .models import Batch, Business, ProductVariant, StockLocation, StockMovement


def _matches_existing_movement(existing, data):
    expected_cost = data.get("unit_cost", existing.batch.unit_cost)
    return (
        existing.kind == data["kind"]
        and existing.variant_id == data["variant_id"]
        and existing.location_id == data["location_id"]
        and existing.batch.batch_number == data["batch_number"]
        and existing.batch.expiry_date == data.get("expiry_date", existing.batch.expiry_date)
        and existing.quantity_delta == data["quantity_delta"]
        and existing.reason == data["reason"]
        and existing.unit_cost == expected_cost
    )


@transaction.atomic
def record_stock_movement(*, business, actor, data):
    Business.objects.select_for_update().get(pk=business.pk)
    existing = StockMovement.objects.filter(
        business=business,
        idempotency_key=data["idempotency_key"],
    ).first()
    if existing:
        if not _matches_existing_movement(existing, data):
            raise ValidationError({"idempotency_key": "This key was already used for a different movement."})
        return existing, False

    variant = ProductVariant.objects.select_for_update().filter(
        business=business,
        pk=data["variant_id"],
        is_active=True,
        product__is_active=True,
    ).first()
    location = StockLocation.objects.select_for_update().filter(
        business=business,
        pk=data["location_id"],
        is_active=True,
    ).first()
    if variant is None:
        raise ValidationError({"variant_id": "Variant is not available in the active business."})
    if location is None:
        raise ValidationError({"location_id": "Location is not available in the active business."})

    existing = StockMovement.objects.filter(
        business=business,
        idempotency_key=data["idempotency_key"],
    ).first()
    if existing:
        if not _matches_existing_movement(existing, data):
            raise ValidationError({"idempotency_key": "This key was already used for a different movement."})
        return existing, False

    batch = Batch.objects.select_for_update().filter(
        business=business,
        variant=variant,
        location=location,
        batch_number=data["batch_number"],
    ).first()
    delta = data["quantity_delta"]
    if data["kind"] == StockMovement.RECEIPT:
        if batch is None:
            batch = Batch.objects.create(
                business=business,
                variant=variant,
                location=location,
                batch_number=data["batch_number"],
                expiry_date=data.get("expiry_date"),
                unit_cost=data["unit_cost"],
            )
        elif batch.expiry_date != data.get("expiry_date") or batch.unit_cost != data["unit_cost"]:
            raise ValidationError({"batch_number": "Existing batch expiry and unit cost cannot be changed."})

        old_quantity = Batch.objects.filter(business=business, variant=variant).aggregate(
            total=Sum("quantity_on_hand")
        )["total"] or 0
        current_cost = variant.unit_cost or Decimal("0.00")
        if old_quantity:
            variant.unit_cost = (
                (Decimal(old_quantity) * current_cost + Decimal(delta) * data["unit_cost"])
                / Decimal(old_quantity + delta)
            ).quantize(Decimal("0.01"))
        else:
            variant.unit_cost = data["unit_cost"]
        variant.save(update_fields=["unit_cost"])
    elif batch is None:
        raise ValidationError({"batch_number": "Adjustment must reference an existing batch."})

    if batch.quantity_on_hand + delta < 0:
        raise ValidationError({"quantity_delta": "Movement would make the batch quantity negative."})
    batch.quantity_on_hand += delta
    batch.save(update_fields=["quantity_on_hand"])

    movement = StockMovement.objects.create(
        business=business,
        actor=actor,
        variant=variant,
        location=location,
        batch=batch,
        kind=data["kind"],
        quantity_delta=delta,
        unit_cost=data.get("unit_cost", batch.unit_cost),
        reason=data["reason"],
        idempotency_key=data["idempotency_key"],
    )
    return movement, True