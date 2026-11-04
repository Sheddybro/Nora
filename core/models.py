from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower
from django.utils import timezone
from uuid import uuid4
from .upload_validators import validate_product_image


def product_image_upload_to(instance, filename):
   extension = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}.get(getattr(instance.image.file, "image_format", ""), "img")
   return f'products/{instance.business_id}/{instance.product_id}/{uuid4().hex}.{extension}'


class Business(models.Model):
 name=models.CharField(max_length=160,unique=True)
 created_at=models.DateTimeField(auto_now_add=True)
 def __str__(self): return self.name
class Membership(models.Model):
 OWNER='owner';STAFF='staff'
 ROLE_CHOICES=[(OWNER,'Owner'),(STAFF,'Staff')]
 business=models.ForeignKey(Business,on_delete=models.PROTECT,related_name='memberships')
 user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='business_memberships')
 role=models.CharField(max_length=10,choices=ROLE_CHOICES,default=STAFF)
 permissions=models.JSONField(default=list,blank=True)
 class Meta:
  constraints=[models.UniqueConstraint(fields=['business','user'],name='unique_business_membership')]


class Category(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='categories')
 name=models.CharField(max_length=120)
 is_active=models.BooleanField(default=True)
 created_at=models.DateTimeField(auto_now_add=True)

 class Meta:
    ordering=['name','id']
    constraints=[models.UniqueConstraint(fields=['business','name'],name='unique_business_category_name')]

 def __str__(self): return self.name


class Product(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='products')
 category=models.ForeignKey(Category,on_delete=models.PROTECT,related_name='products',null=True,blank=True)
 name=models.CharField(max_length=180)
 description=models.TextField(blank=True)
 is_active=models.BooleanField(default=True)
 created_at=models.DateTimeField(auto_now_add=True)
 updated_at=models.DateTimeField(auto_now=True)

 class Meta:
    ordering=['name','id']
    indexes=[models.Index(fields=['business','is_active'],name='product_business_active_idx')]

 def __str__(self): return self.name


class ProductVariant(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='product_variants')
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='variants')
 name=models.CharField(max_length=120,blank=True)
 sku=models.CharField(max_length=80)
 barcode=models.CharField(max_length=80,blank=True)
 price=models.DecimalField(max_digits=12,decimal_places=2)
 unit_cost=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
 reorder_point=models.PositiveIntegerField(default=0)
 is_active=models.BooleanField(default=True)

 class Meta:
     ordering=['sku','id']
     constraints=[models.UniqueConstraint(F('business'),Lower('sku'),name='unique_business_variant_sku_ci'),models.UniqueConstraint(F('business'),Lower('barcode'),condition=~Q(barcode=''),name='unique_business_variant_barcode_ci'),models.CheckConstraint(condition=models.Q(price__gte=0),name='variant_price_nonnegative'),models.CheckConstraint(condition=models.Q(unit_cost__gte=0)|models.Q(unit_cost__isnull=True),name='variant_cost_nonnegative')]

 def __str__(self): return self.sku


class ProductImage(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='product_images')
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='images')
 image=models.ImageField(upload_to=product_image_upload_to,blank=True,validators=[validate_product_image])
 image_url=models.URLField(max_length=1000,blank=True)
 alt_text=models.CharField(max_length=240)
 position=models.PositiveSmallIntegerField(default=0)
 is_primary=models.BooleanField(default=False)

 class Meta:
    ordering=['position','id']
    constraints=[models.UniqueConstraint(fields=['product'],condition=Q(is_primary=True),name='unique_primary_product_image')]


class StockLocation(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='stock_locations')
 name=models.CharField(max_length=120)
 is_active=models.BooleanField(default=True)

 class Meta:
    ordering=['name','id']
    constraints=[models.UniqueConstraint(fields=['business','name'],name='unique_business_stock_location')]

 def __str__(self): return self.name


class Batch(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='inventory_batches')
 variant=models.ForeignKey(ProductVariant,on_delete=models.PROTECT,related_name='batches')
 location=models.ForeignKey(StockLocation,on_delete=models.PROTECT,related_name='batches')
 batch_number=models.CharField(max_length=100)
 expiry_date=models.DateField(null=True,blank=True)
 quantity_on_hand=models.PositiveIntegerField(default=0)
 unit_cost=models.DecimalField(max_digits=12,decimal_places=2)
 created_at=models.DateTimeField(auto_now_add=True)

 class Meta:
    ordering=['expiry_date','batch_number','id']
    constraints=[models.UniqueConstraint(fields=['business','variant','location','batch_number'],name='unique_inventory_batch'),models.CheckConstraint(condition=models.Q(unit_cost__gte=0),name='batch_cost_nonnegative')]
    indexes=[models.Index(fields=['business','location','expiry_date'],name='batch_business_expiry_idx')]

 def __str__(self): return f'{self.batch_number} · {self.variant.sku}'


class StockMovement(models.Model):
 RECEIPT='receipt';ADJUSTMENT='adjustment'
 KIND_CHOICES=[(RECEIPT,'Receipt'),(ADJUSTMENT,'Adjustment')]
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='stock_movements')
 variant=models.ForeignKey(ProductVariant,on_delete=models.PROTECT,related_name='stock_movements')
 location=models.ForeignKey(StockLocation,on_delete=models.PROTECT,related_name='stock_movements')
 batch=models.ForeignKey(Batch,on_delete=models.PROTECT,related_name='movements')
 purchase_order_line=models.ForeignKey('PurchaseOrderLine',on_delete=models.PROTECT,null=True,blank=True,related_name='stock_movements')
 actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='stock_movements')
 kind=models.CharField(max_length=16,choices=KIND_CHOICES)
 quantity_delta=models.IntegerField()
 unit_cost=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
 reason=models.CharField(max_length=240)
 idempotency_key=models.CharField(max_length=100)
 created_at=models.DateTimeField(auto_now_add=True)

 class Meta:
    ordering=['-created_at','-id']
    constraints=[models.UniqueConstraint(fields=['business','idempotency_key'],name='unique_business_stock_idempotency'),models.CheckConstraint(condition=~models.Q(quantity_delta=0),name='movement_quantity_nonzero')]
    indexes=[models.Index(fields=['business','created_at'],name='movement_business_date_idx')]


class Supplier(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="suppliers")
    name = models.CharField(max_length=180)
    contact_name = models.CharField(max_length=160, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["business", "name"], name="unique_business_supplier_name"),
        ]

    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    DRAFT = "draft"
    ORDERED = "ordered"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (DRAFT, "Draft"),
        (ORDERED, "Ordered"),
        (PARTIALLY_RECEIVED, "Partially received"),
        (RECEIVED, "Received"),
        (CANCELLED, "Cancelled"),
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="purchase_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="purchase_orders")
    order_number = models.CharField(max_length=48)
    idempotency_key = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=DRAFT)
    expected_date = models.DateField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=240, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_purchase_orders")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["business", "order_number"], name="unique_business_purchase_order_number"),
            models.UniqueConstraint(fields=["business", "idempotency_key"], condition=~Q(idempotency_key=""), name="unique_business_purchase_order_idempotency"),
        ]
        indexes = [models.Index(fields=["business", "status"], name="purchase_business_status_idx")]

    def __str__(self):
        return self.order_number


class PurchaseOrderLine(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="purchase_order_lines")
    quantity_ordered = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["purchase_order", "variant"], name="unique_purchase_order_variant"),
            models.CheckConstraint(condition=Q(quantity_ordered__gt=0), name="purchase_line_quantity_positive"),
            models.CheckConstraint(condition=Q(unit_cost__gte=0), name="purchase_line_cost_nonnegative"),
            models.CheckConstraint(condition=Q(quantity_received__lte=F("quantity_ordered")), name="purchase_line_received_lte_ordered"),
        ]

    def __str__(self):
        return f"{self.purchase_order.order_number} · {self.variant.sku}"


class Transfer(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="transfers")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="transfers")
    from_location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="outgoing_transfers")
    to_location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="incoming_transfers")
    quantity = models.PositiveIntegerField()
    reason = models.CharField(max_length=240, blank=True)
    status = models.CharField(max_length=20, default="completed")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_transfers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="transfer_quantity_positive"),
        ]

    def __str__(self):
        return f"{self.variant.sku} · {self.from_location.name} → {self.to_location.name}"


class Adjustment(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="adjustments")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="adjustments")
    location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="adjustments")
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name="adjustments", null=True, blank=True)
    quantity_delta = models.IntegerField()
    reason = models.CharField(max_length=240)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_adjustments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.variant.sku} · {self.quantity_delta} @ {self.location.name}"


class InventoryAlert(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="inventory_alerts")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="inventory_alerts")
    location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="inventory_alerts")
    current_quantity = models.IntegerField(default=0)
    reorder_point = models.PositiveIntegerField(default=0)
    severity = models.CharField(max_length=20, default="warning")
    message = models.CharField(max_length=240, blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.variant.sku} · {self.location.name}"


class StockTake(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="stocktakes")
    location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="stocktakes")
    reason = models.CharField(max_length=240, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_stocktakes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Stock take · {self.location.name}"


class StockTakeLine(models.Model):
    stocktake = models.ForeignKey(StockTake, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="stocktake_lines")
    expected_quantity = models.IntegerField(default=0)
    counted_quantity = models.IntegerField(default=0)
    quantity_delta = models.IntegerField(default=0)
    reason = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.variant.sku} · {self.counted_quantity}"


class Expense(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="expenses")
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=80, blank=True)
    vendor = models.CharField(max_length=180, blank=True)
    note = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_expenses")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-expense_date", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=0), name="expense_amount_nonnegative"),
        ]

    def __str__(self):
        return f"{self.title} · {self.amount}"


class AuditEvent(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    event = models.CharField(max_length=120)
    object_type = models.CharField(max_length=80, blank=True)
    object_id = models.CharField(max_length=80, blank=True)
    details = models.JSONField(default=dict, blank=True)
    before_value = models.JSONField(default=dict, blank=True)
    after_value = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.event} · {self.created_at}"


class Notification(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="notifications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=180)
    message = models.TextField()
    kind = models.CharField(max_length=32, default="info")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    link = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.title} · {self.user}"


class Customer(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="customers")
    name = models.CharField(max_length=180)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["business", "name"], name="unique_business_customer_name"),
        ]

    def __str__(self):
        return self.name


class Sale(models.Model):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (PARTIAL, "Partial"),
        (PAID, "Paid"),
        (REFUNDED, "Refunded"),
        (CANCELLED, "Cancelled"),
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="sales")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="sales", null=True, blank=True)
    location = models.ForeignKey(StockLocation, on_delete=models.PROTECT, related_name="sales")
    invoice_number = models.CharField(max_length=48, unique=True)
    idempotency_key = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=PENDING)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    change_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_sales")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["business", "status"], name="sale_business_status_idx")]
        constraints = [
            models.UniqueConstraint(fields=["business", "idempotency_key"], condition=~Q(idempotency_key=""), name="unique_business_sale_idempotency"),
        ]

    def __str__(self):
        return self.invoice_number


class SaleLine(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name="sale_lines")
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refunded_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="sale_line_quantity_positive"),
            models.CheckConstraint(condition=Q(unit_price__gte=0), name="sale_line_price_nonnegative"),
            models.CheckConstraint(condition=Q(line_total__gte=0), name="sale_line_total_nonnegative"),
        ]

    def __str__(self):
        return f"{self.sale.invoice_number} · {self.variant.sku}"


class Payment(models.Model):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    WALLET = "wallet"
    REFUND = "refund"
    METHOD_CHOICES = [
        (CASH, "Cash"),
        (CARD, "Card"),
        (BANK_TRANSFER, "Bank transfer"),
        (WALLET, "Wallet"),
        (REFUND, "Refund"),
    ]

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, default="paid")
    idempotency_key = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.sale.invoice_number} · {self.method}"
