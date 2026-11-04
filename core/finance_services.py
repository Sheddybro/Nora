from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone

from .models import AuditEvent, Expense, Notification, PurchaseOrderLine, Sale


def _money(value):
    return (value or Decimal("0.00")).quantize(Decimal("0.01"))


def business_finance_summary(business):
    sales_total = _money(Sale.objects.filter(business=business).aggregate(total=Sum("total"))["total"])
    purchase_total = _money(
        PurchaseOrderLine.objects.filter(purchase_order__business=business)
        .annotate(line_total=ExpressionWrapper(F("quantity_received") * F("unit_cost"), output_field=DecimalField()))
        .aggregate(total=Sum("line_total"))["total"]
    )
    expense_total = _money(Expense.objects.filter(business=business).aggregate(total=Sum("amount"))["total"])
    net = _money(sales_total - purchase_total - expense_total)
    return {
        "sales_total": sales_total,
        "purchase_total": purchase_total,
        "expense_total": expense_total,
        "net": net,
    }


@transaction.atomic
def record_audit_event(*, business, actor, event, object_type="", object_id="", details=None, before_value=None, after_value=None):
    return AuditEvent.objects.create(
        business=business,
        actor=actor,
        event=event,
        object_type=object_type,
        object_id=str(object_id),
        details=details or {},
        before_value=before_value or {},
        after_value=after_value or {},
    )


@transaction.atomic
def create_notification(*, business, user, title, message, kind="info", link=""):
    if user is None:
        return None
    return Notification.objects.create(
        business=business,
        user=user,
        title=title,
        message=message,
        kind=kind,
        link=link,
    )


@transaction.atomic
def create_expense(*, business, actor, data):
    expense = Expense.objects.create(
        business=business,
        title=data["title"],
        category=data.get("category", ""),
        vendor=data.get("vendor", ""),
        note=data.get("note", ""),
        amount=data["amount"],
        expense_date=data.get("expense_date") or timezone.now().date(),
        created_by=actor,
    )
    record_audit_event(
        business=business,
        actor=actor,
        event="expense.created",
        object_type="Expense",
        object_id=expense.pk,
        details={"title": expense.title, "amount": str(expense.amount)},
    )
    create_notification(
        business=business,
        user=actor,
        title="Expense recorded",
        message=f"{expense.title} for {expense.amount} was recorded.",
        kind="expense",
        link="/reports/",
    )
    return expense
