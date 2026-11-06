from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .permissions import WEB_PAGE_PERMISSIONS, membership_has_permission, membership_permissions

WORKSPACE_PAGES = {
	'products': {
		'title': 'Products & categories',
		'eyebrow': 'CATALOG',
		'description': 'Keep your assortment, variants and merchandising details in one place.',
		'action': 'Add a product',
		'columns': ['Product', 'Category', 'SKU', 'Price', 'Status'],
	},
	'inventory': {
		'title': 'Inventory overview',
		'eyebrow': 'STOCK CONTROL',
		'description': 'Review stock levels and movement before replenishment.',
		'action': 'Record stock movement',
		'columns': ['Product', 'Location', 'On hand', 'Reorder point', 'Status'],
	},
	'pos': {
		'title': 'Point of sale',
		'eyebrow': 'CHECKOUT',
		'description': 'Build a basket from available stock and record the sale.',
		'action': 'New sale',
		'columns': ['Product', 'SKU', 'Available', 'Price', 'Add'],
	},
	'sales': {
		'title': 'Sales history',
		'eyebrow': 'TRANSACTIONS',
		'description': 'Search and review completed sales for this business.',
		'action': 'Print report',
		'columns': ['Reference', 'Customer', 'Date', 'Amount', 'Payment', 'Status'],
	},
	'purchases': {
		'title': 'Purchases & suppliers',
		'eyebrow': 'PROCUREMENT',
		'description': 'Track supplier relationships and incoming purchase orders.',
		'action': 'Create purchase order',
		'columns': ['Order', 'Supplier', 'Expected', 'Items', 'Status'],
	},
	'customers': {
		'title': 'Customers',
		'eyebrow': 'RELATIONSHIPS',
		'description': 'Search and manage customer contacts for this business.',
		'action': 'Add customer',
		'columns': ['Customer', 'Email', 'Phone', 'Added'],
	},
	'reports': {
		'title': 'Reports & analytics',
		'eyebrow': 'BUSINESS INSIGHT',
		'description': 'Review period totals calculated from recorded sales, receipts and expenses.',
		'action': 'Print / save PDF',
		'columns': ['Date', 'Expense', 'Category', 'Vendor', 'Amount'],
	},
	'staff': {
		'title': 'Staff management',
		'eyebrow': 'TEAM ACCESS',
		'description': 'View business members and add an existing user with the Staff role.',
		'action': 'Add staff member',
		'columns': ['Team member', 'Username', 'Role'],
	},
	'settings': {
		'title': 'Settings',
		'eyebrow': 'WORKSPACE PREFERENCES',
		'description': 'Update the business name used across the workspace.',
		'action': 'Save changes',
		'columns': ['Setting', 'Current value'],
	},
}

@require_GET
def health(request):
	return JsonResponse({'status': 'ok', 'service': 'norrisbeauty'})


@api_view(['GET'])
@permission_classes([AllowAny])
def api_health(request):
	return Response({'status': 'ok', 'api_version': 'v1'})


def _workspace_context(request, page_key='dashboard'):
	memberships = request.user.business_memberships.select_related('business').order_by('id')
	active_membership_id = request.session.get('active_membership_id')
	membership = memberships.filter(pk=active_membership_id).first() if active_membership_id else None
	if membership is None:
		membership = memberships.first()
	role = membership.role if membership else None
	owner = bool(membership and membership.role == 'owner')
	permissions = membership_permissions(membership)
	navigation = [
		('dashboard', 'Overview', '◫'), ('products', 'Products', '▧'),
		('inventory', 'Inventory', '▤'), ('pos', 'Point of sale', '＋'),
		('sales', 'Sales history', '↗'), ('purchases', 'Purchases', '⇄'),
		('customers', 'Customers', '◎'), ('reports', 'Reports', '▥'),
		('staff', 'Staff', '♙'), ('settings', 'Settings', '⚙'),
	]
	visible_navigation = [
		item for item in navigation
		if item[0] == 'dashboard' or owner or membership_has_permission(membership, WEB_PAGE_PERMISSIONS[item[0]])
	]
	return {
		'membership': membership,
		'role': role,
		'is_owner': owner,
		'navigation': visible_navigation,
		'active_page': page_key,
		'display_name': request.user.first_name or request.user.username,
		'permission_codes': sorted(permissions),
	}


@login_required
def dashboard(request):
	context = _workspace_context(request)
	return render(request, 'core/workspace.html', context)


@login_required
def workspace_page(request, page_key):
	page = WORKSPACE_PAGES.get(page_key)
	if page is None:
		return HttpResponseForbidden('This workspace page is not available.')
	context = _workspace_context(request, page_key)
	permission_code = WEB_PAGE_PERMISSIONS.get(page_key)
	if (
		not context['membership']
		or (permission_code and not membership_has_permission(context['membership'], permission_code))
		or (page_key == 'staff' and not context['is_owner'])
	):
		return HttpResponseForbidden('Owner access is required for this workspace page.')
	context['page'] = page
	return render(request, 'core/workspace.html', context)
