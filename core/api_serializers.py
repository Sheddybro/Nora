from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models.functions import Lower
from uuid import uuid4

from .models import Adjustment, AuditEvent, Batch, Business, Category, Customer, Expense, InventoryAlert, Membership, Notification, Product, ProductImage, ProductVariant, PurchaseOrder, PurchaseOrderLine, Sale, SaleLine, StockLocation, StockMovement, StockTake, StockTakeLine, Supplier, Transfer
from .permissions import membership_for_user
from .upload_validators import validate_product_image


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "is_active")
        read_only_fields = ("id",)

    def validate_name(self, value):
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        duplicate = Category.objects.filter(business=membership.business, name__iexact=value) if membership else Category.objects.none()
        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value


class ProductVariantSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(required=False, write_only=True, min_value=1)

    class Meta:
        model = ProductVariant
        fields = ("id", "variant_id", "name", "sku", "barcode", "price", "unit_cost", "reorder_point", "is_active")
        read_only_fields = ("id",)


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_empty_file=False, validators=[validate_product_image])

    class Meta:
        model = ProductImage
        fields = ("id", "image", "image_url", "alt_text", "position", "is_primary")
        read_only_fields = ("id",)

    def validate(self, attrs):
        if not attrs.get("image") and not attrs.get("image_url") and not self.instance:
            raise serializers.ValidationError("Provide an uploaded image.")
        if attrs.get("image") and attrs.get("image_url"):
            raise serializers.ValidationError("Provide either an uploaded image or image URL, not both.")
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, allow_null=True)
    variants = ProductVariantSerializer(many=True, required=False)
    images = ProductImageSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ("id", "name", "description", "category", "category_name", "is_active", "variants", "images")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        self.fields["category"].queryset = Category.objects.filter(business=membership.business) if membership else Category.objects.none()
        if self.instance is None:
            self.fields["category"].required = True
            self.fields["category"].allow_null = False

    @transaction.atomic
    def create(self, validated_data):
        variants = validated_data.pop("variants", [])
        images = validated_data.pop("images", [])
        membership = self.context["request"].user.active_membership
        product = Product.objects.create(business=membership.business, **validated_data)
        ProductVariant.objects.bulk_create([
            ProductVariant(product=product, business=membership.business, **variant)
            for variant in variants
        ])
        ProductImage.objects.bulk_create([
            ProductImage(product=product, business=membership.business, **image)
            for image in images
        ])
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        variants = validated_data.pop("variants", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if variants is not None:
            for variant_data in variants:
                variant_id = variant_data.pop("variant_id", None)
                variant = instance.variants.filter(pk=variant_id).first() if variant_id else None
                if variant:
                    for field, value in variant_data.items():
                        setattr(variant, field, value)
                    variant.save()
                else:
                    ProductVariant.objects.create(product=instance, business=instance.business, **variant_data)
        return instance

    def validate(self, attrs):
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        if not self.instance and any(variant.get("variant_id") for variant in self.initial_data.get("variants", []) if isinstance(variant, dict)):
            raise serializers.ValidationError({"variants": "Variant identifiers are only valid when editing a product."})
        category = attrs.get("category")
        if membership and category and category.business_id != membership.business_id:
            raise serializers.ValidationError({"category": "Category is outside the active business."})
        variants = self.initial_data.get("variants", [])
        skus = [variant.get("sku", "").strip().casefold() for variant in variants if isinstance(variant, dict)]
        barcodes = [variant.get("barcode", "").strip().casefold() for variant in variants if isinstance(variant, dict) and variant.get("barcode", "").strip()]
        if len(skus) != len(set(skus)):
            raise serializers.ValidationError({"variants": "Variant SKUs must be unique within the product."})
        if len(barcodes) != len(set(barcodes)):
            raise serializers.ValidationError({"variants": "Variant barcodes must be unique within the product."})
        if membership and skus:
            incoming = [variant for variant in variants if isinstance(variant, dict)]
            current_ids = [variant.get("variant_id") for variant in incoming if variant.get("variant_id")]
            if self.instance and any(not self.instance.variants.filter(pk=variant_id).exists() for variant_id in current_ids):
                raise serializers.ValidationError({"variants": "A variant does not belong to this product."})
            existing_skus = ProductVariant.objects.filter(business=membership.business).annotate(normalized_sku=Lower("sku")).filter(normalized_sku__in=skus).exclude(pk__in=current_ids).values_list("normalized_sku", flat=True)
            if {sku.casefold() for sku in existing_skus}.intersection(skus):
                raise serializers.ValidationError({"variants": "A variant SKU already exists in this business."})
            if barcodes:
                existing_barcodes = ProductVariant.objects.filter(business=membership.business).annotate(normalized_barcode=Lower("barcode")).filter(normalized_barcode__in=barcodes).exclude(pk__in=current_ids).values_list("normalized_barcode", flat=True)
                if set(existing_barcodes).intersection(barcodes):
                    raise serializers.ValidationError({"variants": "A variant barcode already exists in this business."})
        return attrs


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, allow_null=True)

    class Meta:
        model = Expense
        fields = ("id", "title", "category", "vendor", "note", "amount", "expense_date", "created_by_name", "created_at")
        read_only_fields = ("id", "created_by_name", "created_at")

    def create(self, validated_data):
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        validated_data["business"] = membership.business if membership else None
        validated_data["created_by"] = request.user if request else None
        return Expense.objects.create(**validated_data)


class AuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True, allow_null=True)

    class Meta:
        model = AuditEvent
        fields = ("id", "event", "object_type", "object_id", "details", "before_value", "after_value", "actor_name", "created_at")
        read_only_fields = ("id", "actor_name", "created_at")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "message", "kind", "is_read", "read_at", "link", "created_at")
        read_only_fields = ("id", "created_at", "read_at")


class StockLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockLocation
        fields = ("id", "name", "is_active")
        read_only_fields = ("id",)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Location name is required.")
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        duplicate = StockLocation.objects.filter(business=membership.business, name__iexact=value) if membership else StockLocation.objects.none()
        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("A stock location with this name already exists.")
        return value


class StockMovementInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=StockMovement.KIND_CHOICES)
    variant_id = serializers.IntegerField(min_value=1)
    location_id = serializers.IntegerField(min_value=1)
    batch_number = serializers.CharField(max_length=100)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    quantity_delta = serializers.IntegerField()
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=0)
    reason = serializers.CharField(max_length=240, trim_whitespace=True)
    idempotency_key = serializers.CharField(max_length=100, trim_whitespace=True)

    def validate(self, attrs):
        if attrs["quantity_delta"] == 0:
            raise serializers.ValidationError({"quantity_delta": "Quantity change cannot be zero."})
        if attrs["kind"] == StockMovement.RECEIPT:
            if attrs["quantity_delta"] < 0:
                raise serializers.ValidationError({"quantity_delta": "A receipt must add stock."})
            if "unit_cost" not in attrs:
                raise serializers.ValidationError({"unit_cost": "Unit cost is required for a receipt."})
        if not attrs["reason"]:
            raise serializers.ValidationError({"reason": "A reason is required."})
        return attrs


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "name", "contact_name", "email", "phone", "address", "is_active", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        if membership and Supplier.objects.filter(business=membership.business, name__iexact=value).exists():
            raise serializers.ValidationError("A supplier with this name already exists.")
        return value

    def create(self, validated_data):
        membership = self.context["request"].user.active_membership
        return Supplier.objects.create(business=membership.business, **validated_data)


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(
        source="variant",
        queryset=ProductVariant.objects.none(),
    )
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = PurchaseOrderLine
        fields = ("id", "variant_id", "variant_sku", "quantity_ordered", "quantity_received", "unit_cost")
        read_only_fields = ("id", "variant_sku", "quantity_received")
        extra_kwargs = {
            "quantity_ordered": {"min_value": 1},
            "unit_cost": {"min_value": 0},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        self.fields["variant_id"].queryset = ProductVariant.objects.filter(
            business=membership.business,
            is_active=True,
            product__is_active=True,
        ) if membership else ProductVariant.objects.none()


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_id = serializers.PrimaryKeyRelatedField(source="supplier", queryset=Supplier.objects.none())
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(source="location", queryset=StockLocation.objects.none())
    location_name = serializers.CharField(source="location.name", read_only=True)
    idempotency_key = serializers.CharField(max_length=100, required=False, write_only=True, allow_blank=False)
    lines = PurchaseOrderLineSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = (
            "id", "order_number", "supplier_id", "supplier_name", "location_id",
            "location_name", "status", "expected_date", "cancellation_reason", "idempotency_key",
            "lines", "created_at", "updated_at",
        )
        read_only_fields = ("id", "order_number", "supplier_name", "location_name", "status", "cancellation_reason", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        self.fields["supplier_id"].queryset = Supplier.objects.filter(
            business=membership.business,
            is_active=True,
        ) if membership else Supplier.objects.none()
        self.fields["location_id"].queryset = StockLocation.objects.filter(
            business=membership.business,
            is_active=True,
        ) if membership else StockLocation.objects.none()
        self.fields["lines"].child.fields["variant_id"].queryset = ProductVariant.objects.filter(
            business=membership.business,
            is_active=True,
            product__is_active=True,
        ) if membership else ProductVariant.objects.none()

    def validate_lines(self, lines):
        variant_ids = [line["variant"].pk for line in lines]
        if not lines:
            raise serializers.ValidationError("A purchase order must contain at least one line.")
        if len(variant_ids) != len(set(variant_ids)):
            raise serializers.ValidationError("Each variant may appear only once on a purchase order.")
        return lines

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        idempotency_key = validated_data.pop("idempotency_key", "")
        membership = self.context["request"].user.active_membership
        Business.objects.select_for_update().get(pk=membership.business_id)
        self.replayed = False
        if idempotency_key:
            existing = PurchaseOrder.objects.filter(
                business=membership.business,
                idempotency_key=idempotency_key,
            ).prefetch_related("lines").first()
            if existing:
                existing_lines = list(existing.lines.order_by("id"))
                matches = (
                    existing.supplier_id == validated_data["supplier"].pk
                    and existing.location_id == validated_data["location"].pk
                    and existing.expected_date == validated_data.get("expected_date")
                    and len(existing_lines) == len(lines)
                    and all(
                        line.variant_id == item["variant"].pk
                        and line.quantity_ordered == item["quantity_ordered"]
                        and line.unit_cost == item["unit_cost"]
                        for line, item in zip(existing_lines, lines)
                    )
                )
                if not matches:
                    raise serializers.ValidationError({"idempotency_key": "This key was already used for a different purchase order."})
                self.replayed = True
                return existing

        order = PurchaseOrder.objects.create(
            business=membership.business,
            created_by=self.context["request"].user,
            order_number=f"PO-{membership.business_id}-{uuid4().hex[:12].upper()}",
            idempotency_key=idempotency_key,
            **validated_data,
        )
        PurchaseOrderLine.objects.bulk_create([
            PurchaseOrderLine(purchase_order=order, **line)
            for line in lines
        ])
        return order


class PurchaseOrderReceiveSerializer(serializers.Serializer):
    line_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    batch_number = serializers.CharField(max_length=100, trim_whitespace=True)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    idempotency_key = serializers.CharField(max_length=100, trim_whitespace=True)


class PurchaseOrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=240, trim_whitespace=True)

    def validate_reason(self, value):
        if not value:
            raise serializers.ValidationError("A cancellation reason is required.")
        return value


class SaleLineSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(source="variant", queryset=ProductVariant.objects.none())
    variant_name = serializers.CharField(source="variant.name", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = SaleLine
        fields = ("id", "variant_id", "variant_name", "sku", "quantity", "unit_price", "line_total", "discount_amount")
        read_only_fields = ("id", "variant_name", "sku", "line_total")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        self.fields["variant_id"].queryset = ProductVariant.objects.filter(
            business=membership.business,
            is_active=True,
            product__is_active=True,
        ) if membership else ProductVariant.objects.none()


class SaleSerializer(serializers.ModelSerializer):
    lines = SaleLineSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True, allow_null=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = Sale
        fields = (
            "id",
            "invoice_number",
            "status",
            "location_id",
            "location_name",
            "customer_id",
            "customer_name",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total",
            "paid_amount",
            "change_amount",
            "created_at",
            "lines",
        )
        read_only_fields = ("id", "invoice_number", "status", "subtotal", "discount_amount", "tax_amount", "total", "paid_amount", "change_amount", "created_at", "lines")


class CheckoutLineSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CheckoutSaleSerializer(serializers.Serializer):
    location_id = serializers.IntegerField(min_value=1)
    items = CheckoutLineSerializer(many=True)
    payment_method = serializers.ChoiceField(choices=["cash", "card", "bank_transfer", "wallet"])
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    idempotency_key = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("A sale must contain at least one line item.")
        return items


class SaleRefundSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=240, trim_whitespace=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    idempotency_key = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_reason(self, value):
        if not value:
            raise serializers.ValidationError("A refund reason is required.")
        return value


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "name", "email", "phone", "notes", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Customer name is required.")
        return cleaned

    def validate_email(self, value):
        return (value or "").strip()

    def validate_phone(self, value):
        return (value or "").strip()


class TransferSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(source="variant", queryset=ProductVariant.objects.none())
    from_location_id = serializers.PrimaryKeyRelatedField(source="from_location", queryset=StockLocation.objects.none())
    to_location_id = serializers.PrimaryKeyRelatedField(source="to_location", queryset=StockLocation.objects.none())
    variant_name = serializers.CharField(source="variant.name", read_only=True)

    class Meta:
        model = Transfer
        fields = ("id", "variant_id", "variant_name", "from_location_id", "to_location_id", "quantity", "reason", "status", "created_at")
        read_only_fields = ("id", "variant_name", "status", "created_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        business = membership.business if membership else None
        self.fields["variant_id"].queryset = ProductVariant.objects.filter(business=business, is_active=True, product__is_active=True) if business else ProductVariant.objects.none()
        self.fields["from_location_id"].queryset = StockLocation.objects.filter(business=business, is_active=True) if business else StockLocation.objects.none()
        self.fields["to_location_id"].queryset = StockLocation.objects.filter(business=business, is_active=True) if business else StockLocation.objects.none()

    def validate(self, attrs):
        if attrs["from_location"] == attrs["to_location"]:
            raise serializers.ValidationError("A transfer must move inventory to a different location.")
        return attrs


class AdjustmentSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(source="variant", queryset=ProductVariant.objects.none())
    location_id = serializers.PrimaryKeyRelatedField(source="location", queryset=StockLocation.objects.none())
    batch_id = serializers.PrimaryKeyRelatedField(source="batch", queryset=Batch.objects.none(), required=False, allow_null=True)

    class Meta:
        model = Adjustment
        fields = ("id", "variant_id", "location_id", "batch_id", "quantity_delta", "reason", "created_at")
        read_only_fields = ("id", "created_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        business = membership.business if membership else None
        self.fields["variant_id"].queryset = ProductVariant.objects.filter(business=business, is_active=True, product__is_active=True) if business else ProductVariant.objects.none()
        self.fields["location_id"].queryset = StockLocation.objects.filter(business=business, is_active=True) if business else StockLocation.objects.none()
        self.fields["batch_id"].queryset = Batch.objects.filter(business=business) if business else Batch.objects.none()


class InventoryAlertSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(source="variant", read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(source="location", read_only=True)

    class Meta:
        model = InventoryAlert
        fields = ("id", "variant_id", "location_id", "current_quantity", "reorder_point", "severity", "message", "is_resolved", "created_at")
        read_only_fields = fields


class StockTakeLineSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(source="variant", queryset=ProductVariant.objects.none())

    class Meta:
        model = StockTakeLine
        fields = ("id", "variant_id", "expected_quantity", "counted_quantity", "quantity_delta", "reason")
        read_only_fields = ("id", "expected_quantity", "quantity_delta")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        business = membership.business if membership else None
        self.fields["variant_id"].queryset = ProductVariant.objects.filter(business=business, is_active=True, product__is_active=True) if business else ProductVariant.objects.none()


class StockTakeSerializer(serializers.ModelSerializer):
    location_id = serializers.PrimaryKeyRelatedField(source="location", queryset=StockLocation.objects.none())
    lines = StockTakeLineSerializer(many=True, required=False)

    class Meta:
        model = StockTake
        fields = ("id", "location_id", "reason", "created_at", "lines")
        read_only_fields = ("id", "created_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        business = membership.business if membership else None
        self.fields["location_id"].queryset = StockLocation.objects.filter(business=business, is_active=True) if business else StockLocation.objects.none()

    def validate(self, attrs):
        if not attrs.get("lines"):
            raise serializers.ValidationError("A stocktake must include at least one counted item.")
        return attrs


class MembershipTokenObtainPairSerializer(TokenObtainPairSerializer):
    membership_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        membership_id = attrs.pop("membership_id", None)
        super().validate(attrs)
        membership = membership_for_user(self.user, membership_id)
        if membership is None:
            raise AuthenticationFailed("A valid business membership is required.", code="membership_required")

        refresh = self.get_token(self.user)
        refresh["membership_id"] = membership.pk
        refresh["business_id"] = membership.business_id
        refresh["role"] = membership.role
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": self.user.pk,
                "username": self.user.get_username(),
                "display_name": self.user.get_full_name() or self.user.get_username(),
                "business": {"id": membership.business_id, "name": membership.business.name},
                "role": membership.role,
            },
        }


class RefreshTokenInputSerializer(serializers.Serializer):
    refresh = serializers.CharField(trim_whitespace=True)


class PasswordChangeInputSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value):
        request = self.context["request"]
        if not request.user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        validate_password(value, self.context["request"].user)
        return value


class UserSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ("id", "username", "email", "first_name", "last_name", "display_name")

    def get_display_name(self, user):
        return user.get_full_name() or user.get_username()


class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ("id", "name")
        read_only_fields = ("id",)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Business name is required.")
        return value


class StaffMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ("id", "username", "display_name", "role")
        read_only_fields = fields

    def get_display_name(self, membership):
        return membership.user.get_full_name() or membership.user.get_username()


class AddStaffMemberSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter an existing user's username.")
        return value
