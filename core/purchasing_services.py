from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .inventory_services import record_stock_movement
from .models import PurchaseOrder, PurchaseOrderLine, StockMovement


@transaction.atomic
def place_purchase_order(*, business, order_id):
    order = PurchaseOrder.objects.select_for_update().filter(
        business=business,
        pk=order_id,
    ).first()
    if order is None:
        raise PurchaseOrder.DoesNotExist
    if order.status != PurchaseOrder.DRAFT:
        raise ValidationError({"status": "Only draft purchase orders can be placed."})
    if not order.lines.exists():
        raise ValidationError({"lines": "A purchase order must contain at least one line."})
    order.status = PurchaseOrder.ORDERED
    order.save(update_fields=["status", "updated_at"])
    return order


@transaction.atomic
def cancel_purchase_order(*, business, order_id, reason):
    order = PurchaseOrder.objects.select_for_update().filter(
        business=business,
        pk=order_id,
    ).first()
    if order is None:
        raise PurchaseOrder.DoesNotExist
    if order.status not in {
        PurchaseOrder.DRAFT,
        PurchaseOrder.ORDERED,
        PurchaseOrder.PARTIALLY_RECEIVED,
    }:
        raise ValidationError({"status": "This purchase order cannot be cancelled."})
    order.status = PurchaseOrder.CANCELLED
    order.cancellation_reason = reason
    order.save(update_fields=["status", "cancellation_reason", "updated_at"])
    return order


@transaction.atomic
def receive_purchase_order_line(*, business, actor, order_id, data):
    order = PurchaseOrder.objects.select_for_update().filter(
        business=business,
        pk=order_id,
    ).first()
    if order is None:
        raise PurchaseOrder.DoesNotExist
    line = PurchaseOrderLine.objects.select_for_update().filter(
        purchase_order=order,
        pk=data["line_id"],
    ).select_related("variant").first()
    if line is None:
        raise ValidationError({"line_id": "This line does not belong to the purchase order."})

    movement_data = {
        "kind": StockMovement.RECEIPT,
        "variant_id": line.variant_id,
        "location_id": order.location_id,
        "batch_number": data["batch_number"],
        "expiry_date": data.get("expiry_date"),
        "quantity_delta": data["quantity"],
        "unit_cost": line.unit_cost,
        "reason": f"Purchase order {order.order_number} receipt",
        "idempotency_key": data["idempotency_key"],
    }

    previous_movement = StockMovement.objects.filter(
        business=business,
        idempotency_key=data["idempotency_key"],
    ).first()
    if previous_movement:
        movement, created = record_stock_movement(
            business=business,
            actor=actor,
            data=movement_data,
            purchase_order_line=line,
        )
        return order, line, movement, created

    if order.status not in {PurchaseOrder.ORDERED, PurchaseOrder.PARTIALLY_RECEIVED}:
        raise ValidationError({"status": "Only placed, open purchase orders can be received."})
    remaining = line.quantity_ordered - line.quantity_received
    if data["quantity"] > remaining:
        raise ValidationError({"quantity": f"Cannot receive more than the remaining quantity ({remaining})."})

    movement, created = record_stock_movement(
        business=business,
        actor=actor,
        data=movement_data,
        purchase_order_line=line,
    )
    if created:
        line.quantity_received += data["quantity"]
        line.save(update_fields=["quantity_received"])
        if all(order_line.quantity_received == order_line.quantity_ordered for order_line in order.lines.all()):
            order.status = PurchaseOrder.RECEIVED
        else:
            order.status = PurchaseOrder.PARTIALLY_RECEIVED
        if order.status == PurchaseOrder.RECEIVED:
            order.received_at = timezone.now()
            order.save(update_fields=["status", "received_at", "updated_at"])
        else:
            order.save(update_fields=["status", "updated_at"])
    return order, line, movement, created
