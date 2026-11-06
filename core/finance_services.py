from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from collections import defaultdict

from django.db import transaction
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from .models import AuditEvent, Batch, Expense, Notification, Payment, PurchaseOrderLine, Sale, SaleLine, StockMovement


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


def _report_period_bounds(period, today):
    if period == "week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=7)
    elif period == "month":
        start = today.replace(day=1)
        end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    elif period == "year":
        start = today.replace(month=1, day=1)
        end = start.replace(year=start.year + 1)
    else:
        raise ValueError("Unsupported reporting period.")
    return start, end


def business_period_summary(*, business, period, today=None):
    today = today or timezone.localdate()
    start_date, end_date = _report_period_bounds(period, today)
    current_timezone = timezone.get_current_timezone()
    start_at = timezone.make_aware(datetime.combine(start_date, time.min), current_timezone)
    end_at = timezone.make_aware(datetime.combine(end_date, time.min), current_timezone)

    sales = Sale.objects.filter(
        business=business,
        created_at__gte=start_at,
        created_at__lt=end_at,
    ).exclude(status=Sale.CANCELLED)
    gross_sales = sales.aggregate(total=Sum("total"))["total"] or Decimal("0.00")
    refunds = Payment.objects.filter(
        sale__business=business,
        sale__created_at__gte=start_at,
        sale__created_at__lt=end_at,
        method=Payment.REFUND,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    sales_total = _money(gross_sales - refunds)
    order_count = sales.count()
    average_order = _money(sales_total / order_count) if order_count else Decimal("0.00")

    units_sold = SaleLine.objects.filter(
        sale__business=business,
        sale__created_at__gte=start_at,
        sale__created_at__lt=end_at,
    ).exclude(sale__status=Sale.CANCELLED).aggregate(total=Sum("quantity"))["total"] or 0

    purchase_lines = PurchaseOrderLine.objects.filter(
        purchase_order__business=business,
        stock_movements__created_at__gte=start_at,
        stock_movements__created_at__lt=end_at,
        stock_movements__kind=StockMovement.RECEIPT,
    ).annotate(
        received_value=ExpressionWrapper(
            F("stock_movements__quantity_delta") * F("stock_movements__unit_cost"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )
    purchase_total = _money(purchase_lines.aggregate(total=Sum("received_value"))["total"])
    expense_total = _money(Expense.objects.filter(
        business=business,
        expense_date__gte=start_date,
        expense_date__lt=end_date,
    ).aggregate(total=Sum("amount"))["total"])
    net = _money(sales_total - purchase_total - expense_total)

    sales_by_bucket = defaultdict(lambda: Decimal("0.00"))
    if period == "year":
        sale_buckets = sales.annotate(bucket=TruncMonth("created_at", tzinfo=current_timezone)).values("bucket").annotate(total=Sum("total"))
        for row in sale_buckets:
            sales_by_bucket[row["bucket"].date().replace(day=1)] += row["total"] or Decimal("0.00")
    else:
        sale_buckets = sales.annotate(bucket=TruncDate("created_at", tzinfo=current_timezone)).values("bucket").annotate(total=Sum("total"))
        for row in sale_buckets:
            sales_by_bucket[row["bucket"]] += row["total"] or Decimal("0.00")

    refund_buckets = Payment.objects.filter(
        sale__business=business,
        sale__created_at__gte=start_at,
        sale__created_at__lt=end_at,
        method=Payment.REFUND,
    )
    if period == "year":
        refund_buckets = refund_buckets.annotate(bucket=TruncMonth("sale__created_at", tzinfo=current_timezone)).values("bucket").annotate(total=Sum("amount"))
        for row in refund_buckets:
            sales_by_bucket[row["bucket"].date().replace(day=1)] -= row["total"] or Decimal("0.00")
        buckets = [date(start_date.year, month, 1) for month in range(1, 13)]
        labels = [bucket.strftime("%b") for bucket in buckets]
    else:
        refund_buckets = refund_buckets.annotate(bucket=TruncDate("sale__created_at", tzinfo=current_timezone)).values("bucket").annotate(total=Sum("amount"))
        for row in refund_buckets:
            sales_by_bucket[row["bucket"]] -= row["total"] or Decimal("0.00")
        buckets = [start_date + timedelta(days=offset) for offset in range((end_date - start_date).days)]
        labels = [bucket.strftime("%a") if period == "week" else str(bucket.day) for bucket in buckets]

    low_stock = Batch.objects.filter(
        business=business,
        variant__is_active=True,
        variant__product__is_active=True,
        location__is_active=True,
    ).values(
        "variant_id",
        "location_id",
        "variant__reorder_point",
    ).annotate(
        quantity=Sum("quantity_on_hand"),
    ).filter(
        variant__reorder_point__gt=0,
        quantity__lte=F("variant__reorder_point"),
    ).count()

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": (end_date - timedelta(days=1)).isoformat(),
        "sales_total": sales_total,
        "order_count": order_count,
        "average_order": average_order,
        "units_sold": units_sold,
        "purchase_total": purchase_total,
        "expense_total": expense_total,
        "net": net,
        "low_stock": low_stock,
        "chart": {
            "labels": labels,
            "values": [str(_money(sales_by_bucket.get(bucket, Decimal("0.00")))) for bucket in buckets],
        },
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
