from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.db import models
from django.db.models import Sum
from django.db.models import Q
from django.core.paginator import Paginator
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .api_serializers import CategorySerializer, MembershipTokenObtainPairSerializer, PasswordChangeInputSerializer, ProductImageSerializer, ProductSerializer, RefreshTokenInputSerializer, StockLocationSerializer, StockMovementInputSerializer, UserSummarySerializer
from .inventory_services import record_stock_movement
from .models import Batch, Category, Membership, Product, ProductImage, ProductVariant, StockLocation, StockMovement
from .permissions import BusinessPermission, BusinessSettingsPermission, membership_has_permission, membership_permissions


class AuthLoginThrottle(AnonRateThrottle):
    scope = "auth_login"


class CatalogEndpointPermission(BusinessPermission):
    def has_permission(self, request, view):
        code = "catalog.view" if request.method in ("GET", "HEAD", "OPTIONS") else "catalog.manage"
        membership = getattr(request.user, "active_membership", None)
        return bool(request.user and request.user.is_authenticated and membership_has_permission(membership, code))


class InventoryEndpointPermission(BusinessPermission):
    def has_permission(self, request, view):
        code = "inventory.adjust" if request.method == "POST" else "inventory.view"
        membership = getattr(request.user, "active_membership", None)
        return bool(request.user and request.user.is_authenticated and membership_has_permission(membership, code))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthLoginThrottle])
def mobile_login(request):
    serializer = MembershipTokenObtainPairSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    return Response(serializer.validated_data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def mobile_refresh(request):
    serializer = RefreshTokenInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        refresh = RefreshToken(serializer.validated_data["refresh"])
        membership_id = refresh.get("membership_id")
        if not membership_id:
            raise TokenError("Refresh token has no membership context.")
        user = get_user_model().objects.get(pk=refresh["user_id"], is_active=True)
        membership = user.business_memberships.select_related("business").get(pk=membership_id)
        if refresh.get("business_id") != membership.business_id or refresh.get("role") != membership.role:
            raise TokenError("Membership context changed.")
        access = refresh.access_token
        access["membership_id"] = membership.pk
        access["business_id"] = membership.business_id
        access["role"] = membership.role
        replacement = RefreshToken.for_user(user)
        replacement["membership_id"] = membership.pk
        replacement["business_id"] = membership.business_id
        replacement["role"] = membership.role
        refresh.blacklist()
    except (TokenError, get_user_model().DoesNotExist, Membership.DoesNotExist):
        return Response({"detail": "Refresh token is invalid, revoked, or its membership is no longer active.", "code": "token_invalid"}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"access": str(access), "refresh": str(replacement)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mobile_logout(request):
    serializer = RefreshTokenInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        refresh = RefreshToken(serializer.validated_data["refresh"])
        if refresh.get("user_id") != request.user.pk or refresh.get("membership_id") != request.user.active_membership.pk:
            return Response({"detail": "Refresh token does not belong to this session.", "code": "token_mismatch"}, status=status.HTTP_403_FORBIDDEN)
        refresh.blacklist()
    except TokenError:
        return Response({"detail": "Refresh token is invalid or already revoked.", "code": "token_invalid"}, status=status.HTTP_400_BAD_REQUEST)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mobile_me(request):
    membership = request.user.active_membership
    return Response({
        "user": UserSummarySerializer(request.user).data,
        "business": {"id": membership.business_id, "name": membership.business.name},
        "role": membership.role,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mobile_permissions(request):
    membership = request.user.active_membership
    permissions = sorted(membership_permissions(membership))
    return Response({"role": membership.role, "business_id": membership.business_id, "permissions": permissions})


@api_view(["GET"])
@permission_classes([IsAuthenticated, BusinessSettingsPermission])
def business_profile(request):
    membership = request.user.active_membership
    return Response({"id": membership.business_id, "name": membership.business.name})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
def catalog_products(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = ProductSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        product = Product.objects.filter(business=business, pk=product.pk).select_related("category").prefetch_related("variants", "images").get()
        return Response(ProductSerializer(product, context={"request": request}).data, status=status.HTTP_201_CREATED)

    products = Product.objects.filter(business=business).select_related("category").prefetch_related("variants", "images")
    if request.query_params.get("include_inactive") != "true" or request.user.active_membership.role != Membership.OWNER:
        products = products.filter(is_active=True)
    query = request.query_params.get("search", "").strip()
    if query:
        products = products.filter(Q(name__icontains=query) | Q(variants__sku__icontains=query) | Q(variants__barcode__icontains=query)).distinct()
    if request.query_params.get("category"):
        products = products.filter(category_id=request.query_params["category"])
    ordering = request.query_params.get("ordering", "name")
    products = products.order_by(ordering if ordering in {"name", "-name", "created_at", "-created_at"} else "name", "id")
    try:
        limit = int(request.query_params.get("limit", 25))
        requested_page = int(request.query_params.get("page", 1))
    except ValueError:
        return Response({"detail": "Page and limit must be integers."}, status=status.HTTP_400_BAD_REQUEST)
    paginator = Paginator(products, min(max(limit, 1), 100))
    page = paginator.get_page(requested_page)
    return Response({"count": paginator.count, "page": page.number, "pages": paginator.num_pages, "results": ProductSerializer(page.object_list, many=True, context={"request": request}).data})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
def catalog_product_detail(request, product_id):
    business = request.user.active_membership.business
    product = Product.objects.filter(business=business, pk=product_id).select_related("category").prefetch_related("variants", "images").first()
    if product is None:
        return Response({"detail": "Product was not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        product.is_active = False
        product.variants.update(is_active=False)
        product.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
    if request.method == "GET":
        return Response(ProductSerializer(product, context={"request": request}).data)
    serializer = ProductSerializer(product, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    product = serializer.save()
    return Response(ProductSerializer(product, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
@transaction.atomic
def catalog_product_images(request, product_id):
    membership = request.user.active_membership
    if membership.role != Membership.OWNER:
        return Response({"detail": "Owner access is required."}, status=status.HTTP_403_FORBIDDEN)
    product = Product.objects.filter(business=membership.business, pk=product_id, is_active=True).first()
    if product is None:
        return Response({"detail": "Product was not found."}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductImageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if serializer.validated_data.get("is_primary"):
        ProductImage.objects.filter(product=product).update(is_primary=False)
    image = serializer.save(product=product, business=product.business)
    return Response(ProductImageSerializer(image, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
@transaction.atomic
def catalog_product_image_detail(request, product_id, image_id):
    membership = request.user.active_membership
    image = ProductImage.objects.filter(
        business=membership.business,
        product_id=product_id,
        pk=image_id,
    ).first()
    if image is None:
        return Response({"detail": "Product image was not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        if image.image:
            storage = image.image.storage
            name = image.image.name
            transaction.on_commit(lambda: storage.delete(name))
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ProductImageSerializer(image, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    if serializer.validated_data.get("is_primary"):
        ProductImage.objects.filter(product_id=product_id).exclude(pk=image.pk).update(is_primary=False)
    old_image = image.image
    updated = serializer.save()
    if "image" in serializer.validated_data and old_image and old_image.name != updated.image.name:
        transaction.on_commit(lambda: old_image.storage.delete(old_image.name))
    return Response(ProductImageSerializer(updated, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
def catalog_product_stock_history(request, product_id):
    business = request.user.active_membership.business
    product = Product.objects.filter(business=business, pk=product_id).first()
    if product is None:
        return Response({"detail": "Product was not found."}, status=status.HTTP_404_NOT_FOUND)
    movements = StockMovement.objects.filter(
        business=business,
        variant__product=product,
    ).select_related("variant", "location", "batch", "actor")[:100]
    return Response({"results": [{
        "id": movement.pk,
        "sku": movement.variant.sku,
        "location": movement.location.name,
        "batch_number": movement.batch.batch_number,
        "expiry_date": movement.batch.expiry_date,
        "kind": movement.kind,
        "quantity_delta": movement.quantity_delta,
        "reason": movement.reason,
        "actor": movement.actor.get_username() if movement.actor else None,
        "created_at": movement.created_at,
    } for movement in movements]})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
def catalog_categories(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = CategorySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        category = serializer.save(business=business)
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)
    categories = Category.objects.filter(business=business)
    return Response({"results": CategorySerializer(categories, many=True).data})


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, CatalogEndpointPermission])
def catalog_category_detail(request, category_id):
    business = request.user.active_membership.business
    category = Category.objects.filter(business=business, pk=category_id).first()
    if category is None:
        return Response({"detail": "Category was not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        category.is_active = False
        category.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = CategorySerializer(category, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, InventoryEndpointPermission])
def inventory_locations(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = StockLocationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        location = serializer.save(business=business)
        return Response(StockLocationSerializer(location).data, status=status.HTTP_201_CREATED)
    locations = StockLocation.objects.filter(business=business, is_active=True)
    return Response({"results": StockLocationSerializer(locations, many=True).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated, InventoryEndpointPermission])
def inventory_stock(request):
    business = request.user.active_membership.business
    stock = Batch.objects.filter(business=business).values(
        "variant_id", "variant__sku", "variant__name", "variant__product__name", "variant__reorder_point",
        "location_id", "location__name", "variant__unit_cost",
    ).annotate(quantity=Sum("quantity_on_hand")).order_by("variant__product__name", "location__name")
    query = request.query_params.get("search", "").strip()
    if query:
        stock = stock.filter(Q(variant__product__name__icontains=query) | Q(variant__sku__icontains=query) | Q(location__name__icontains=query))
    if request.query_params.get("location"):
        stock = stock.filter(location_id=request.query_params["location"])
    if request.query_params.get("expiring_before"):
        stock = stock.filter(expiry_date__isnull=False, expiry_date__lte=request.query_params["expiring_before"])
    results = []
    for row in stock:
        quantity = row["quantity"] or 0
        unit_cost = row["variant__unit_cost"] or 0
        results.append({
            "variant_id": row["variant_id"],
            "product_name": row["variant__product__name"],
            "variant_name": row["variant__name"],
            "sku": row["variant__sku"],
            "reorder_point": row["variant__reorder_point"],
            "location_id": row["location_id"],
            "location_name": row["location__name"],
            "quantity": quantity,
            "unit_cost": unit_cost,
            "valuation": unit_cost * quantity,
        })
    if request.query_params.get("low_stock") == "true":
        results = [row for row in results if row["reorder_point"] > 0 and row["quantity"] <= row["reorder_point"]]
    return Response({"results": results})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, InventoryEndpointPermission])
def inventory_movements(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = StockMovementInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        movement, created = record_stock_movement(
            business=business,
            actor=request.user,
            data=serializer.validated_data,
        )
        return Response({
            "id": movement.pk,
            "kind": movement.kind,
            "variant_id": movement.variant_id,
            "location_id": movement.location_id,
            "batch_number": movement.batch.batch_number,
            "quantity_delta": movement.quantity_delta,
            "created_at": movement.created_at,
            "replayed": not created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    movements = StockMovement.objects.filter(business=business).select_related("variant__product", "location", "batch", "actor")[:100]
    return Response({"results": [{
        "id": movement.pk,
        "kind": movement.kind,
        "product_name": movement.variant.product.name,
        "sku": movement.variant.sku,
        "location": movement.location.name,
        "batch_number": movement.batch.batch_number,
        "quantity_delta": movement.quantity_delta,
        "reason": movement.reason,
        "actor": movement.actor.get_username() if movement.actor else None,
        "created_at": movement.created_at,
    } for movement in movements]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    serializer = PasswordChangeInputSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data["new_password"])
    request.user.save(update_fields=["password"])
    for token in OutstandingToken.objects.filter(user=request.user):
        BlacklistedToken.objects.get_or_create(token=token)
    return Response({"detail": "Password updated. Sign in again on your devices."}, status=status.HTTP_200_OK)


def password_reset_complete(request, uidb64, token):
    user_model = get_user_model()
    try:
        user = user_model.objects.get(pk=urlsafe_base64_decode(uidb64).decode())
    except (user_model.DoesNotExist, ValueError, TypeError, OverflowError):
        user = None
    if user is None or not default_token_generator.check_token(user, token):
        return HttpResponse(render_to_string("registration/password_reset_invalid.html", request=request), status=400)
    return HttpResponse(render_to_string("registration/password_reset_complete.html", request=request))
