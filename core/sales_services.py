from decimal import Decimal, ROUND_DOWN
from uuid import uuid4

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from .inventory_services import record_stock_movement
from .models import Batch, Business, Payment, Sale, SaleLine, StockLocation, StockMovement


@transaction.atomic
def checkout_sale(*, business, actor, location_id, items, payment_method, amount_paid, idempotency_key=None):
    Business.objects.select_for_update().get(pk=business.pk)
    location = StockLocation.objects.select_for_update().filter(
        business=business,
        pk=location_id,
        is_active=True,
    ).first()
    if location is None:
        raise ValidationError({"location_id": "Location is not available in the active business."})
    if not items:
        raise ValidationError({"items": "A sale must include at least one item."})

    subtotal = Decimal("0.00")
    prepared_items = []
    for item in items:
        variant = item["variant"]
        quantity = int(item["quantity"])
        unit_price = Decimal(str(item["unit_price"]))
        if quantity <= 0:
            raise ValidationError({"items": "Each cart item must contain a positive quantity."})
        line_total = unit_price * quantity
        subtotal += line_total
        prepared_items.append({
            "variant": variant,
            "quantity": quantity,
            "unit_price": unit_price,
            "line_total": line_total,
        })

    amount_paid_decimal = Decimal(str(amount_paid))
    if amount_paid_decimal < Decimal("0.00"):
        raise ValidationError({"amount_paid": "Amount paid cannot be negative."})

    if idempotency_key:
        existing_sale = Sale.objects.filter(business=business, idempotency_key=idempotency_key).prefetch_related("lines", "payments").first()
        if existing_sale:
            existing_lines = list(existing_sale.lines.order_by("id"))
            existing_payment = existing_sale.payments.filter(idempotency_key=idempotency_key).first()
            matches = (
                existing_sale.location_id == location.pk
                and existing_payment is not None
                and existing_payment.method == payment_method
                and existing_payment.amount == amount_paid_decimal
                and len(existing_lines) == len(prepared_items)
                and all(
                    line.variant_id == item["variant"].pk
                    and line.quantity == item["quantity"]
                    and line.unit_price == item["unit_price"]
                    for line, item in zip(existing_lines, prepared_items)
                )
            )
            if not matches:
                raise ValidationError({"idempotency_key": "This key was already used for a different checkout."})
            return existing_sale, False

    for prepared in prepared_items:
        available = Batch.objects.filter(
            business=business,
            variant=prepared["variant"],
            location=location,
        ).aggregate(total=Sum("quantity_on_hand"))["total"] or 0
        if available < prepared["quantity"]:
            raise ValidationError({"items": f"Not enough stock for {prepared['variant'].sku}."})

    sale = Sale.objects.create(
        business=business,
        location=location,
        created_by=actor,
        invoice_number=f"INV-{business.pk}-{uuid4().hex[:10].upper()}",
        idempotency_key=idempotency_key or "",
        subtotal=subtotal,
        total=subtotal,
        paid_amount=amount_paid_decimal,
        change_amount=max(Decimal("0.00"), amount_paid_decimal - subtotal),
        status=Sale.PAID if amount_paid_decimal >= subtotal else Sale.PARTIAL,
    )

    for prepared in prepared_items:
        line = SaleLine.objects.create(
            sale=sale,
            variant=prepared["variant"],
            quantity=prepared["quantity"],
            unit_price=prepared["unit_price"],
            line_total=prepared["line_total"],
        )
        remaining = prepared["quantity"]
        batches = list(
            Batch.objects.select_for_update().filter(
                business=business,
                variant=prepared["variant"],
                location=location,
            ).order_by("expiry_date", "id")
        )
        for batch in batches:
            if remaining <= 0:
                break
            to_remove = min(batch.quantity_on_hand, remaining)
            if to_remove <= 0:
                continue
            record_stock_movement(
                business=business,
                actor=actor,
                data={
                    "kind": StockMovement.ADJUSTMENT,
                    "variant_id": prepared["variant"].pk,
                    "location_id": location.pk,
                    "batch_number": batch.batch_number,
                    "expiry_date": batch.expiry_date,
                    "quantity_delta": -to_remove,
                    "unit_cost": batch.unit_cost,
                    "reason": f"Sale {sale.invoice_number}",
                    "idempotency_key": f"sale-{sale.pk}-{line.pk}-{uuid4().hex}",
                },
            )
            remaining -= to_remove
        if remaining > 0:
            raise ValidationError({"items": f"Not enough stock for {prepared['variant'].sku}."})

    if amount_paid_decimal > subtotal:
        sale.change_amount = amount_paid_decimal - subtotal
    else:
        sale.change_amount = Decimal("0.00")

    Payment.objects.create(
        sale=sale,
        method=payment_method,
        amount=amount_paid_decimal,
        status="paid",
        idempotency_key=idempotency_key or f"payment-{sale.pk}-{uuid4().hex}",
    )
    sale.save(update_fields=["status", "paid_amount", "change_amount", "updated_at"])
    return sale, True


@transaction.atomic
def refund_sale(*, business, actor, sale_id, amount, reason, idempotency_key=None):
    sale = Sale.objects.select_for_update().filter(
        business=business,
        pk=sale_id,
    ).prefetch_related("lines__variant", "payments").first()
    if sale is None:
        raise Sale.DoesNotExist

    amount_decimal = Decimal(str(amount))
    if amount_decimal <= Decimal("0.00"):
        raise ValidationError({"amount": "Refund amount must be greater than zero."})

    if idempotency_key:
        existing_payment = sale.payments.filter(idempotency_key=idempotency_key).first()
        if existing_payment:
            if existing_payment.amount != amount_decimal:
                raise ValidationError({"idempotency_key": "This key was already used for a different refund."})
            return sale

    if sale.status == Sale.REFUNDED:
        raise ValidationError({"status": "This sale has already been refunded."})
    if amount_decimal > sale.paid_amount:
        raise ValidationError({"amount": "Refund amount cannot exceed the amount paid."})

    sale_total = sum((line.line_total for line in sale.lines.all()), Decimal("0.00"))
    refund_ready = amount_decimal >= sale.paid_amount
    for line in sale.lines.select_related("variant").all():
        remaining = line.quantity - line.refunded_quantity
        if remaining <= 0:
            continue

        if refund_ready:
            quantity_to_restore = remaining
        elif sale_total > Decimal("0.00"):
            quantity_to_restore = min(
                remaining,
                int((amount_decimal * (line.line_total / sale_total) / line.unit_price).quantize(Decimal("1"), rounding=ROUND_DOWN)),
            )
        else:
            quantity_to_restore = 0

        if quantity_to_restore <= 0:
            continue

        restore_remaining = quantity_to_restore
        batches = list(
            Batch.objects.select_for_update().filter(
                business=business,
                variant=line.variant,
                location=sale.location,
            ).order_by("expiry_date", "id")
        )
        for batch in batches:
            if restore_remaining <= 0:
                break
            available = batch.quantity_on_hand
            if available <= 0:
                continue
            to_restore = min(available, restore_remaining)
            record_stock_movement(
                business=business,
                actor=actor,
                data={
                    "kind": StockMovement.ADJUSTMENT,
                    "variant_id": line.variant.pk,
                    "location_id": sale.location_id,
                    "batch_number": batch.batch_number,
                    "expiry_date": batch.expiry_date,
                    "quantity_delta": to_restore,
                    "unit_cost": batch.unit_cost,
                    "reason": f"Refund for {sale.invoice_number}: {reason}",
                    "idempotency_key": f"refund-{sale.pk}-{line.pk}-{batch.pk}-{uuid4().hex}",
                },
            )
            restore_remaining -= to_restore

        if restore_remaining != 0:
            raise ValidationError({"amount": "Unable to restore enough stock for this refund."})

        line.refunded_quantity += quantity_to_restore
        line.save(update_fields=["refunded_quantity"])

    sale.paid_amount = max(Decimal("0.00"), sale.paid_amount - amount_decimal)
    sale.change_amount = Decimal("0.00")
    sale.status = Sale.REFUNDED if sale.paid_amount == Decimal("0.00") else Sale.PARTIAL
    sale.save(update_fields=["status", "paid_amount", "change_amount", "updated_at"])
    Payment.objects.create(
        sale=sale,
        method=Payment.REFUND,
        amount=amount_decimal,
        status="refunded",
        idempotency_key=idempotency_key or f"refund-payment-{sale.pk}-{uuid4().hex}",
    )
    return sale
