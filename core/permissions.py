from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


PERMISSION_MATRIX = {
    "dashboard.view": {"owner": True, "staff": True},
    "catalog.view": {"owner": True, "staff": True},
    "catalog.manage": {"owner": True, "staff": False},
    "inventory.view": {"owner": True, "staff": True},
    "inventory.adjust": {"owner": True, "staff": False},
    "pos.use": {"owner": True, "staff": True},
    "sales.view": {"owner": True, "staff": True},
    "customers.view": {"owner": True, "staff": True},
    "purchases.manage": {"owner": True, "staff": False},
    "reports.view": {"owner": True, "staff": False},
    "staff.manage": {"owner": True, "staff": False},
    "settings.manage": {"owner": True, "staff": False},
}

DEFAULT_ROLE_PERMISSIONS = {
    "owner": set(PERMISSION_MATRIX),
    "staff": {
        "dashboard.view",
        "catalog.view",
        "inventory.view",
        "pos.use",
        "sales.view",
        "customers.view",
    },
}

WEB_PAGE_PERMISSIONS = {
    'products': 'catalog.view',
    'inventory': 'inventory.view',
    'pos': 'pos.use',
    'sales': 'sales.view',
    'purchases': 'purchases.manage',
    'customers': 'customers.view',
    'reports': 'reports.view',
    'staff': 'staff.manage',
    'settings': 'settings.manage',
}

class MembershipJWTAuthentication(JWTAuthentication):
    """Authenticate access tokens only while their membership remains active."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        membership_id = validated_token.get("membership_id")
        if not membership_id:
            raise AuthenticationFailed("Token is missing its membership context.", code="membership_required")
        try:
            membership = user.business_memberships.select_related("business").get(pk=membership_id)
        except user.business_memberships.model.DoesNotExist as exc:
            raise AuthenticationFailed("Membership is no longer available.", code="membership_inactive") from exc
        if not membership.user.is_active:
            raise AuthenticationFailed("User is inactive.", code="user_inactive")
        user.active_membership = membership
        return user


class MembershipSessionAuthentication(SessionAuthentication):
    """Use the active browser membership for same-origin versioned API calls."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, auth = result
        memberships = user.business_memberships.select_related("business")
        membership_id = request.session.get("active_membership_id")
        membership = memberships.filter(pk=membership_id).first() if membership_id else memberships.order_by("id").first()
        if membership is None:
            return None
        user.active_membership = membership
        return user, auth


class BusinessPermission(BasePermission):
    """Authorize a DRF view against the active server-validated membership."""

    permission_code = None

    def has_permission(self, request, view):
        permission_code = getattr(view, "permission_code", self.permission_code)
        if not request.user or not request.user.is_authenticated:
            return False
        membership = getattr(request.user, "active_membership", None)
        if membership is None:
            return False
        if membership.role == membership.OWNER:
            return True
        if permission_code is None:
            return False
        return permission_code in membership_permissions(membership)


def membership_permissions(membership):
    if membership is None:
        return set()
    if membership.role == membership.OWNER:
        return set(PERMISSION_MATRIX)
    configured = set(membership.permissions or [])
    if not configured:
        configured = set(DEFAULT_ROLE_PERMISSIONS.get(membership.role, set()))
    return configured.intersection(PERMISSION_MATRIX)


def membership_has_permission(membership, permission_code):
    if membership is None:
        return False
    return permission_code in membership_permissions(membership)


class BusinessSettingsPermission(BusinessPermission):
    permission_code = "settings.manage"


def membership_for_user(user, membership_id=None):
    memberships = user.business_memberships.select_related("business").order_by("id")
    if membership_id is not None:
        return memberships.filter(pk=membership_id).first()
    return memberships.first()
