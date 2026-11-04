from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import F, Sum
from rest_framework.exceptions import ValidationError

from .models import Adjustment, Batch, Business, InventoryAlert, ProductVariant, StockLocation, StockMovement, StockTake, StockTakeLine, Transfer


def _matches_existing_movement(existing, data, purchase_order_line):
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
        and existing.purchase_order_line_id == (purchase_order_line.pk if purchase_order_line else None)
    )


def _active_inventory_alerts(business):
    stock = Batch.objects.filter(business=business).values(
        'variant_id',
        'location_id',
        'variant__sku',
        'variant__name',
        'variant__reorder_point',
        'location__name',
    ).annotate(quantity=Sum('quantity_on_hand')).filter(quantity__lte=F('variant__reorder_point'))
    results = []
    for row in stock:
        current_quantity = row['quantity'] or 0
        reorder_point = row['variant__reorder_point'] or 0
        alert, _ = InventoryAlert.objects.get_or_create(
            business=business,
            variant_id=row['variant_id'],
            location_id=row['location_id'],
            defaults={
                'current_quantity': current_quantity,
                'reorder_point': reorder_point,
                'severity': 'critical' if current_quantity == 0 else 'warning',
                'message': f"{row['variant__name']} is at or below the reorder point.",
                'is_resolved': False,
            },
        )
        alert.current_quantity = current_quantity
        alert.reorder_point = reorder_point
        alert.severity = 'critical' if current_quantity == 0 else 'warning'
        alert.message = f"{row['variant__name']} is at or below the reorder point."
        alert.is_resolved = False
        alert.save(update_fields=['current_quantity', 'reorder_point', 'severity', 'message', 'is_resolved'])
        results.append(alert)
    InventoryAlert.objects.filter(business=business).exclude(pk__in=[a.pk for a in results]).update(is_resolved=True)
    return results


@transaction.atomic
def record_transfer(*, business, actor, variant_id, from_location_id, to_location_id, quantity, reason):
    variant = ProductVariant.objects.select_for_update().filter(
        business=business,
        pk=variant_id,
        is_active=True,
        product__is_active=True,
    ).first()
    if variant is None:
        raise ValidationError({"variant_id": "Variant is not available in the active business."})
    if from_location_id == to_location_id:
        raise ValidationError({"to_location_id": "Transfer destination must be different from the source location."})
    from_location = StockLocation.objects.select_for_update().filter(business=business, pk=from_location_id, is_active=True).first()
    to_location = StockLocation.objects.select_for_update().filter(business=business, pk=to_location_id, is_active=True).first()
    if from_location is None:
        raise ValidationError({"from_location_id": "Source location is not available in the active business."})
    if to_location is None:
        raise ValidationError({"to_location_id": "Destination location is not available in the active business."})
    if quantity <= 0:
        raise ValidationError({"quantity": "Transfer quantity must be greater than zero."})

    available = Batch.objects.filter(business=business, variant=variant, location=from_location).aggregate(total=Sum('quantity_on_hand'))['total'] or 0
    if available < quantity:
        raise ValidationError({"quantity": "Not enough stock available to complete the transfer."})

    transfer = Transfer.objects.create(
        business=business,
        variant=variant,
        from_location=from_location,
        to_location=to_location,
        quantity=quantity,
        reason=reason or 'Inventory transfer',
        created_by=actor,
    )
    remaining = quantity
    for batch in Batch.objects.select_for_update().filter(business=business, variant=variant, location=from_location).order_by('expiry_date', 'id'):
        if remaining <= 0:
            break
        to_remove = min(batch.quantity_on_hand, remaining)
        if to_remove <= 0:
            continue
        record_stock_movement(
            business=business,
            actor=actor,
            data={
                'kind': StockMovement.ADJUSTMENT,
                'variant_id': variant.pk,
                'location_id': from_location.pk,
                'batch_number': batch.batch_number,
                'expiry_date': batch.expiry_date,
                'quantity_delta': -to_remove,
                'unit_cost': batch.unit_cost,
                'reason': f"Transfer to {to_location.name}",
                'idempotency_key': f"transfer-{transfer.pk}-out-{batch.pk}-{uuid4().hex}",
            },
        )
        remaining -= to_remove

    destination_batch = Batch.objects.select_for_update().filter(business=business, variant=variant, location=to_location).order_by('expiry_date', 'id').first()
    if destination_batch is None:
        destination_batch = Batch.objects.create(
            business=business,
            variant=variant,
            location=to_location,
            batch_number=f"XFER-{uuid4().hex[:12].upper()}",
            expiry_date=None,
            quantity_on_hand=0,
            unit_cost=variant.unit_cost or Decimal('0.00'),
        )
    record_stock_movement(
        business=business,
        actor=actor,
        data={
            'kind': StockMovement.ADJUSTMENT,
            'variant_id': variant.pk,
            'location_id': to_location.pk,
            'batch_number': destination_batch.batch_number,
            'expiry_date': destination_batch.expiry_date,
            'quantity_delta': quantity,
            'unit_cost': destination_batch.unit_cost,
            'reason': f"Transfer from {from_location.name}",
            'idempotency_key': f"transfer-{transfer.pk}-in-{destination_batch.pk}-{uuid4().hex}",
        },
    )
    _active_inventory_alerts(business)
    return transfer


@transaction.atomic
def record_stocktake(*, business, actor, location_id, items, reason):
    location = StockLocation.objects.select_for_update().filter(business=business, pk=location_id, is_active=True).first()
    if location is None:
        raise ValidationError({"location_id": "Location is not available in the active business."})
    if not items:
        raise ValidationError({"items": "A stocktake must include at least one item."})

    stocktake = StockTake.objects.create(business=business, location=location, reason=reason or 'Inventory count', created_by=actor)
    for entry in items:
        variant = ProductVariant.objects.select_for_update().filter(
            business=business,
            pk=entry['variant_id'],
            is_active=True,
            product__is_active=True,
        ).first()
        if variant is None:
            raise ValidationError({"variant_id": "Variant is not available in the active business."})
        counted_quantity = int(entry['counted_quantity'])
        current_quantity = Batch.objects.filter(business=business, variant=variant, location=location).aggregate(total=Sum('quantity_on_hand'))['total'] or 0
        delta = counted_quantity - current_quantity
        stocktake_line = StockTakeLine.objects.create(
            stocktake=stocktake,
            variant=variant,
            expected_quantity=current_quantity,
            counted_quantity=counted_quantity,
            quantity_delta=delta,
            reason=reason or 'Inventory count',
        )

        if delta == 0:
            continue

        target_batch = Batch.objects.select_for_update().filter(business=business, variant=variant, location=location).order_by('expiry_date', 'id').first()
        if target_batch is None:
            target_batch = Batch.objects.create(
                business=business,
                variant=variant,
                location=location,
                batch_number=f"COUNT-{uuid4().hex[:12].upper()}",
                expiry_date=None,
                quantity_on_hand=0,
                unit_cost=variant.unit_cost or Decimal('0.00'),
            )
        movement_data = {
            'kind': StockMovement.ADJUSTMENT,
            'variant_id': variant.pk,
            'location_id': location.pk,
            'batch_number': target_batch.batch_number,
            'expiry_date': target_batch.expiry_date,
            'quantity_delta': delta,
            'unit_cost': target_batch.unit_cost,
            'reason': reason or 'Stocktake adjustment',
            'idempotency_key': f"stocktake-{stocktake.pk}-{stocktake_line.pk}-{uuid4().hex}",
        }
        movement, _ = record_stock_movement(business=business, actor=actor, data=movement_data)
        Adjustment.objects.create(
            business=business,
            variant=variant,
            location=location,
            batch=movement.batch,
            quantity_delta=delta,
            reason=reason or 'Stocktake adjustment',
            created_by=actor,
        )

    _active_inventory_alerts(business)
    return stocktake


@transaction.atomic
def record_stock_movement(*, business, actor, data, purchase_order_line=None):
    Business.objects.select_for_update().get(pk=business.pk)
    existing = StockMovement.objects.filter(
        business=business,
        idempotency_key=data["idempotency_key"],
    ).first()
    if existing:
        if not _matches_existing_movement(existing, data, purchase_order_line):
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
        if not _matches_existing_movement(existing, data, purchase_order_line):
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
        purchase_order_line=purchase_order_line,
    )
    return movement, True