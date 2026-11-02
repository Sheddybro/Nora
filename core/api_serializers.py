from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models.functions import Lower

from .models import Batch, Category, Product, ProductImage, ProductVariant, StockLocation, StockMovement
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


class StockLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockLocation
        fields = ("id", "name", "is_active")
        read_only_fields = ("id",)

    def validate_name(self, value):
        request = self.context.get("request")
        membership = getattr(request.user, "active_membership", None) if request else None
        if membership and StockLocation.objects.filter(business=membership.business, name__iexact=value).exists():
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
