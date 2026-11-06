from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.db import IntegrityError, models
from django.db.models import Sum
from django.db.models import Q
from django.core.paginator import Paginator
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .api_serializers import AddStaffMemberSerializer, AdjustmentSerializer, AuditEventSerializer, BusinessProfileSerializer, CategorySerializer, CheckoutSaleSerializer, CustomerSerializer, ExpenseSerializer, InventoryAlertSerializer, MembershipTokenObtainPairSerializer, NotificationSerializer, PasswordChangeInputSerializer, ProductImageSerializer, ProductSerializer, PurchaseOrderCancelSerializer, PurchaseOrderReceiveSerializer, PurchaseOrderSerializer, RefreshTokenInputSerializer, SaleRefundSerializer, SaleSerializer, StaffMemberSerializer, StockLocationSerializer, StockMovementInputSerializer, StockTakeSerializer, SupplierSerializer, TransferSerializer, UserSummarySerializer
from .finance_services import business_finance_summary, business_period_summary, create_expense, record_audit_event, create_notification
from .inventory_services import _active_inventory_alerts, record_stock_movement, record_stocktake, record_transfer
from .models import Adjustment, AuditEvent, Batch, Category, Customer, Expense, InventoryAlert, Membership, Notification, Product, ProductImage, ProductVariant, PurchaseOrder, Sale, StockLocation, StockMovement, StockTake, Supplier, Transfer
from .permissions import BusinessPermission, BusinessSettingsPermission, membership_has_permission, membership_permissions
from .purchasing_services import cancel_purchase_order, place_purchase_order, receive_purchase_order_line
from .sales_services import checkout_sale, refund_sale


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


class InventoryLocationPermission(BusinessPermission):
    def has_permission(self, request, view):
        membership = getattr(request.user, "active_membership", None)
        if not request.user or not request.user.is_authenticated or membership is None:
            return False
        if request.method == "GET":
            return membership_has_permission(membership, "inventory.view")
        return membership.role == Membership.OWNER and membership_has_permission(membership, "inventory.adjust")


class SalesListPermission(BusinessPermission):
    permission_code = "sales.view"


class CustomersListPermission(BusinessPermission):
    permission_code = "customers.view"


class PosCheckoutPermission(BusinessPermission):
    permission_code = "pos.use"


class PurchasingEndpointPermission(BusinessPermission):
    permission_code = "purchases.manage"

    def has_permission(self, request, view):
        membership = getattr(request.user, "active_membership", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and membership_has_permission(membership, self.permission_code)
        )


class ReportsEndpointPermission(BusinessPermission):
    permission_code = "reports.view"


class StaffManagementPermission(BusinessPermission):
    permission_code = "staff.manage"

    def has_permission(self, request, view):
        membership = getattr(request.user, "active_membership", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and membership
            and membership.role == Membership.OWNER
        )


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


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, BusinessSettingsPermission])
def business_profile(request):
    business = request.user.active_membership.business
    if request.method == "PATCH":
        serializer = BusinessProfileSerializer(business, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        before = {"name": business.name}
        with transaction.atomic():
            business = serializer.save()
            if before["name"] != business.name:
                record_audit_event(
                    business=business,
                    actor=request.user,
                    event="business.profile_updated",
                    object_type="Business",
                    object_id=business.pk,
                    before_value=before,
                    after_value={"name": business.name},
                )
    return Response(BusinessProfileSerializer(business).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, StaffManagementPermission])
def staff_members(request):
    business = request.user.active_membership.business
    if request.method == "GET":
        memberships = Membership.objects.filter(
            business=business,
            user__is_active=True,
        ).select_related("user").order_by("role", "user__username", "id")
        return Response({"count": memberships.count(), "results": StaffMemberSerializer(memberships, many=True).data})

    serializer = AddStaffMemberSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = get_user_model().objects.filter(
        username__iexact=serializer.validated_data["username"],
        is_active=True,
    ).first()
    if user is None:
        return Response({"detail": "No active user exists with that username."}, status=status.HTTP_404_NOT_FOUND)
    if Membership.objects.filter(business=business, user=user).exists():
        return Response({"detail": "This user is already a member of the business."}, status=status.HTTP_409_CONFLICT)
    try:
        with transaction.atomic():
            membership = Membership.objects.create(
                business=business,
                user=user,
                role=Membership.STAFF,
            )
            record_audit_event(
                business=business,
                actor=request.user,
                event="staff.member_added",
                object_type="Membership",
                object_id=membership.pk,
                details={"username": user.get_username(), "role": Membership.STAFF},
            )
    except IntegrityError:
        return Response({"detail": "This user is already a member of the business."}, status=status.HTTP_409_CONFLICT)
    return Response(StaffMemberSerializer(membership).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, ReportsEndpointPermission])
def expenses(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = ExpenseSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        expense = create_expense(business=business, actor=request.user, data=serializer.validated_data)
        return Response(ExpenseSerializer(expense, context={"request": request}).data, status=status.HTTP_201_CREATED)
    queryset = Expense.objects.filter(business=business).select_related("created_by").order_by("-expense_date", "-id")
    return Response({"count": queryset.count(), "results": ExpenseSerializer(queryset, many=True, context={"request": request}).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated, ReportsEndpointPermission])
def report_summary(request):
    business = request.user.active_membership.business
    period = request.query_params.get("period")
    if period:
        if period not in {"week", "month", "year"}:
            return Response({"detail": "Period must be week, month, or year."}, status=status.HTTP_400_BAD_REQUEST)
        summary = business_period_summary(business=business, period=period)
        for field in ("sales_total", "average_order", "purchase_total", "expense_total", "net"):
            summary[field] = str(summary[field])
        return Response(summary)
    summary = business_finance_summary(business)
    return Response({
        "sales_total": str(summary["sales_total"]),
        "purchase_total": str(summary["purchase_total"]),
        "expense_total": str(summary["expense_total"]),
        "net": str(summary["net"]),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated, ReportsEndpointPermission])
def audit_events(request):
    business = request.user.active_membership.business
    queryset = AuditEvent.objects.filter(business=business).select_related("actor").order_by("-created_at", "-id")
    return Response({"count": queryset.count(), "results": AuditEventSerializer(queryset, many=True, context={"request": request}).data})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def notifications(request):
    membership = request.user.active_membership
    if request.method == "PATCH":
        updated = Notification.objects.filter(business=membership.business, user=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({"updated": updated})
    queryset = Notification.objects.filter(business=membership.business, user=request.user).order_by("-created_at", "-id")
    return Response({"count": queryset.count(), "results": NotificationSerializer(queryset, many=True, context={"request": request}).data})


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
    barcode = request.query_params.get("barcode", "").strip()
    if barcode:
        products = products.filter(variants__barcode__iexact=barcode).distinct()
    else:
        query = request.query_params.get("search", "").strip()
    if not barcode and query:
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
    product_query = Product.objects.filter(business=business, pk=product_id)
    if request.user.active_membership.role != Membership.OWNER:
        product_query = product_query.filter(is_active=True)
    product = product_query.select_related("category").prefetch_related("variants", "images").first()
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
@permission_classes([IsAuthenticated, InventoryLocationPermission])
def inventory_locations(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = StockLocationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        location = serializer.save(business=business)
        return Response(StockLocationSerializer(location).data, status=status.HTTP_201_CREATED)
    locations = StockLocation.objects.filter(business=business)
    if request.user.active_membership.role != Membership.OWNER:
        locations = locations.filter(is_active=True)
    return Response({"results": StockLocationSerializer(locations, many=True).data})


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, InventoryLocationPermission])
def inventory_location_detail(request, location_id):
    membership = request.user.active_membership
    location = StockLocation.objects.filter(business=membership.business, pk=location_id).first()
    if location is None:
        return Response({"detail": "Stock location was not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        location.is_active = False
        location.save(update_fields=["is_active"])
        return Response(StockLocationSerializer(location).data)
    serializer = StockLocationSerializer(location, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


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
def inventory_transfers(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = TransferSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            transfer = record_transfer(
                business=business,
                actor=request.user,
                variant_id=serializer.validated_data["variant"].pk,
                from_location_id=serializer.validated_data["from_location"].pk,
                to_location_id=serializer.validated_data["to_location"].pk,
                quantity=serializer.validated_data["quantity"],
                reason=serializer.validated_data["reason"],
            )
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(TransferSerializer(transfer, context={"request": request}).data, status=status.HTTP_201_CREATED)
    transfers = Transfer.objects.filter(business=business).select_related("variant", "from_location", "to_location", "created_by")
    return Response({"results": TransferSerializer(transfers, many=True, context={"request": request}).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, InventoryEndpointPermission])
def inventory_adjustments(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = AdjustmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        adjustment = Adjustment.objects.create(
            business=business,
            variant=serializer.validated_data["variant"],
            location=serializer.validated_data["location"],
            batch=serializer.validated_data.get("batch"),
            quantity_delta=serializer.validated_data["quantity_delta"],
            reason=serializer.validated_data["reason"],
            created_by=request.user,
        )
        return Response(AdjustmentSerializer(adjustment, context={"request": request}).data, status=status.HTTP_201_CREATED)
    adjustments = Adjustment.objects.filter(business=business).select_related("variant", "location", "batch", "created_by")
    return Response({"results": AdjustmentSerializer(adjustments, many=True, context={"request": request}).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, InventoryEndpointPermission])
def inventory_stocktakes(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        payload = request.data.copy()
        items = payload.pop('items', None)
        if items is None:
            items = payload.pop('lines', None)
        if not items:
            return Response({"detail": "A stocktake must include items."}, status=status.HTTP_400_BAD_REQUEST)
        normalized = []
        for item in items:
            if isinstance(item, dict):
                normalized.append({
                    'variant_id': item.get('variant_id') or item.get('variant'),
                    'counted_quantity': item.get('counted_quantity', item.get('quantity', 0)),
                })
        try:
            stocktake = record_stocktake(
                business=business,
                actor=request.user,
                location_id=request.data.get('location_id'),
                items=normalized,
                reason=request.data.get('reason', 'Inventory count'),
            )
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'id': stocktake.pk,
            'location_id': stocktake.location_id,
            'reason': stocktake.reason,
            'lines': [{
                'variant_id': line.variant_id,
                'expected_quantity': line.expected_quantity,
                'counted_quantity': line.counted_quantity,
                'quantity_delta': line.quantity_delta,
            } for line in stocktake.lines.all()],
        }, status=status.HTTP_201_CREATED)
    stocktakes = StockTake.objects.filter(business=business).select_related("location", "created_by").prefetch_related("lines__variant")
    return Response({"results": [{
        'id': stocktake.pk,
        'location_id': stocktake.location_id,
        'reason': stocktake.reason,
        'created_at': stocktake.created_at,
        'lines': [{'variant_id': line.variant_id, 'expected_quantity': line.expected_quantity, 'counted_quantity': line.counted_quantity, 'quantity_delta': line.quantity_delta} for line in stocktake.lines.all()],
    } for stocktake in stocktakes]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, InventoryEndpointPermission])
def inventory_alerts(request):
    business = request.user.active_membership.business
    alerts = _active_inventory_alerts(business)
    return Response({"results": [{
        'id': alert.pk,
        'variant_id': alert.variant_id,
        'location_id': alert.location_id,
        'current_quantity': alert.current_quantity,
        'reorder_point': alert.reorder_point,
        'severity': alert.severity,
        'message': alert.message,
        'is_resolved': alert.is_resolved,
    } for alert in alerts]})


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


@api_view(["GET"])
@permission_classes([IsAuthenticated, SalesListPermission])
def sales_list(request):
    business = request.user.active_membership.business
    sales = Sale.objects.filter(business=business).select_related("location", "customer", "created_by").prefetch_related("lines__variant")
    return Response({"results": SaleSerializer(sales, many=True, context={"request": request}).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, CustomersListPermission])
def customers_list(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = CustomerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            customer = Customer.objects.create(business=business, **serializer.validated_data)
        except IntegrityError:
            return Response({"detail": "A customer with this name already exists for this business."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CustomerSerializer(customer).data, status=status.HTTP_201_CREATED)

    customers = Customer.objects.filter(business=business, is_active=True)
    query = request.query_params.get("search", "").strip()
    if query:
        customers = customers.filter(Q(name__icontains=query) | Q(email__icontains=query) | Q(phone__icontains=query))
    try:
        limit = int(request.query_params.get("limit", 25))
        requested_page = int(request.query_params.get("page", 1))
    except ValueError:
        return Response({"detail": "Page and limit must be integers."}, status=status.HTTP_400_BAD_REQUEST)
    paginator = Paginator(customers.order_by("name", "id"), min(max(limit, 1), 100))
    page = paginator.get_page(requested_page)
    return Response({"count": paginator.count, "page": page.number, "pages": paginator.num_pages, "results": CustomerSerializer(page.object_list, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated, PosCheckoutPermission])
def sales_checkout(request):
    serializer = CheckoutSaleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    line_items = []
    for item in serializer.validated_data["items"]:
        variant = ProductVariant.objects.filter(
            business=request.user.active_membership.business,
            pk=item["variant_id"],
            is_active=True,
            product__is_active=True,
        ).first()
        if variant is None:
            return Response({"detail": "Variant was not found in the active business."}, status=status.HTTP_400_BAD_REQUEST)
        line_items.append({"variant": variant, "quantity": item["quantity"], "unit_price": item["unit_price"]})

    try:
        sale, created = checkout_sale(
            business=request.user.active_membership.business,
            actor=request.user,
            location_id=serializer.validated_data["location_id"],
            items=line_items,
            payment_method=serializer.validated_data["payment_method"],
            amount_paid=serializer.validated_data["amount_paid"],
            idempotency_key=serializer.validated_data.get("idempotency_key"),
        )
    except ValidationError as exc:
        return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
    return Response(SaleSerializer(sale, context={"request": request}).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, PosCheckoutPermission])
def sales_refund(request, sale_id):
    serializer = SaleRefundSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        sale = refund_sale(
            business=request.user.active_membership.business,
            actor=request.user,
            sale_id=sale_id,
            amount=serializer.validated_data["amount"],
            reason=serializer.validated_data["reason"],
            idempotency_key=serializer.validated_data.get("idempotency_key"),
        )
    except Sale.DoesNotExist:
        return Response({"detail": "Sale was not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as exc:
        return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
    return Response(SaleSerializer(sale, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, PurchasingEndpointPermission])
def purchasing_suppliers(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = SupplierSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        supplier = serializer.save()
        return Response(SupplierSerializer(supplier).data, status=status.HTTP_201_CREATED)
    suppliers = Supplier.objects.filter(business=business, is_active=True)
    return Response({"results": SupplierSerializer(suppliers, many=True).data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, PurchasingEndpointPermission])
@transaction.atomic
def purchasing_orders(request):
    business = request.user.active_membership.business
    if request.method == "POST":
        serializer = PurchaseOrderSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        order = PurchaseOrder.objects.filter(business=business, pk=order.pk).select_related(
            "supplier", "location"
        ).prefetch_related("lines__variant").get()
        response_status = status.HTTP_200_OK if serializer.replayed else status.HTTP_201_CREATED
        return Response(PurchaseOrderSerializer(order, context={"request": request}).data, status=response_status)
    orders = PurchaseOrder.objects.filter(business=business).select_related(
        "supplier", "location"
    ).prefetch_related("lines__variant")
    requested_status = request.query_params.get("status")
    if requested_status in dict(PurchaseOrder.STATUS_CHOICES):
        orders = orders.filter(status=requested_status)
    return Response({"results": PurchaseOrderSerializer(orders, many=True, context={"request": request}).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated, PurchasingEndpointPermission])
def purchasing_order_detail(request, order_id):
    order = PurchaseOrder.objects.filter(
        business=request.user.active_membership.business,
        pk=order_id,
    ).select_related("supplier", "location").prefetch_related("lines__variant").first()
    if order is None:
        return Response({"detail": "Purchase order was not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(PurchaseOrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, PurchasingEndpointPermission])
def purchasing_order_place(request, order_id):
    try:
        order = place_purchase_order(business=request.user.active_membership.business, order_id=order_id)
    except PurchaseOrder.DoesNotExist:
        return Response({"detail": "Purchase order was not found."}, status=status.HTTP_404_NOT_FOUND)
    order = PurchaseOrder.objects.select_related("supplier", "location").prefetch_related("lines__variant").get(pk=order.pk)
    return Response(PurchaseOrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, PurchasingEndpointPermission])
def purchasing_order_cancel(request, order_id):
    serializer = PurchaseOrderCancelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        order = cancel_purchase_order(
            business=request.user.active_membership.business,
            order_id=order_id,
            reason=serializer.validated_data["reason"],
        )
    except PurchaseOrder.DoesNotExist:
        return Response({"detail": "Purchase order was not found."}, status=status.HTTP_404_NOT_FOUND)
    order = PurchaseOrder.objects.select_related("supplier", "location").prefetch_related("lines__variant").get(pk=order.pk)
    return Response(PurchaseOrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, PurchasingEndpointPermission])
def purchasing_order_receive(request, order_id):
    serializer = PurchaseOrderReceiveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        order, line, movement, created = receive_purchase_order_line(
            business=request.user.active_membership.business,
            actor=request.user,
            order_id=order_id,
            data=serializer.validated_data,
        )
    except PurchaseOrder.DoesNotExist:
        return Response({"detail": "Purchase order was not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({
        "order_id": order.pk,
        "order_number": order.order_number,
        "status": order.status,
        "line_id": line.pk,
        "quantity_received": line.quantity_received,
        "movement_id": movement.pk,
        "replayed": not created,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


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
