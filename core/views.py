from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Batch, Category, Product, ProductVariant, StockLocation
from .permissions import WEB_PAGE_PERMISSIONS, membership_has_permission, membership_permissions

WORKSPACE_PAGES = {
	'products': {
		'title': 'Products & categories',
		'eyebrow': 'CATALOG',
		'description': 'Keep your assortment, variants and merchandising details in one place.',
		'action': 'Add a product',
		'metrics': [('Active products', '128', '+8 this month'), ('Categories', '12', 'Sample workspace'), ('Needs attention', '6', 'Demo fixture')],
		'columns': ['Product', 'Category', 'SKU', 'Price', 'Status'],
		'rows': [['Radiance Serum', 'Skincare', 'NB-SK-104', '₦18,500', 'Active'], ['Velvet Matte Lip', 'Makeup', 'NB-MK-221', '₦12,000', 'Active'], ['Silk Repair Mask', 'Haircare', 'NB-HC-087', '₦16,800', 'Draft']],
		'empty': 'Products created in this workspace will appear here.',
	},
	'inventory': {
		'title': 'Inventory overview',
		'eyebrow': 'STOCK CONTROL',
		'description': 'Review stock levels and movement before replenishment.',
		'action': 'Record adjustment',
		'metrics': [('Units on hand', '2,486', 'Sample figure'), ('Low stock', '14', 'Demo fixture'), ('Stock value', '₦8.42m', 'Illustrative only')],
		'columns': ['Product', 'Location', 'On hand', 'Reorder point', 'Status'],
		'rows': [['Radiance Serum', 'Lagos Studio', '8 units', '12 units', 'Reorder'], ['Velvet Matte Lip', 'Lagos Studio', '31 units', '10 units', 'Healthy'], ['Silk Repair Mask', 'Online stock', '0 units', '6 units', 'Out of stock']],
		'empty': 'Stock balances will appear after inventory is configured.',
	},
	'pos': {
		'title': 'Point of sale',
		'eyebrow': 'CHECKOUT',
		'description': 'A checkout workspace shell. Transactions are not connected in this phase.',
		'action': 'New sale',
		'metrics': [('Current cart', '0 items', 'No sale started'), ('Payment', 'Not started', 'Demo state'), ('Register', 'Not connected', 'Setup required')],
		'columns': ['Cart item', 'Unit price', 'Quantity', 'Total'],
		'rows': [],
		'empty': 'Scan a product or search the catalog to begin a demo cart.',
	},
	'sales': {
		'title': 'Sales history',
		'eyebrow': 'TRANSACTIONS',
		'description': 'Search and review transaction records when the sales module is connected.',
		'action': 'Export report',
		'metrics': [('Transactions', '214', 'Sample period'), ('Paid', '₦2.84m', 'Demo figure'), ('Awaiting payment', '3', 'Demo fixture')],
		'columns': ['Reference', 'Customer', 'Date', 'Amount', 'Payment'],
		'rows': [['NB-24018', 'Ada N.', 'Today, 10:42', '₦42,500', 'Paid'], ['NB-24017', 'Walk-in', 'Today, 10:18', '₦18,500', 'Paid'], ['NB-24016', 'Tomi O.', 'Yesterday', '₦31,200', 'Partial']],
		'empty': 'Completed sales will be listed here.',
	},
	'purchases': {
		'title': 'Purchases & suppliers',
		'eyebrow': 'PROCUREMENT',
		'description': 'Track supplier relationships and incoming purchase orders.',
		'action': 'Create purchase order',
		'metrics': [('Open orders', '4', 'Demo fixture'), ('Suppliers', '18', 'Sample workspace'), ('Expected this week', '2', 'Illustrative only')],
		'columns': ['Order', 'Supplier', 'Expected', 'Items', 'Status'],
		'rows': [['PO-0081', 'Aurelia Beauty Co.', 'Today', '12 lines', 'In transit'], ['PO-0080', 'Luxe Formulations', 'Fri, 31 Oct', '8 lines', 'Awaiting'], ['PO-0079', 'Natura Supply', 'Received', '5 lines', 'Complete']],
		'empty': 'Purchase orders and suppliers will appear here.',
	},
	'customers': {
		'title': 'Customers',
		'eyebrow': 'RELATIONSHIPS',
		'description': 'Customer records are private to the business and will be connected in a later module.',
		'action': 'Add customer',
		'metrics': [('Customer records', '846', 'Sample figure'), ('Returning', '38%', 'Demo figure'), ('Birthday this week', '7', 'Illustrative only')],
		'columns': ['Customer', 'Last visit', 'Orders', 'Lifetime value', 'Segment'],
		'rows': [['Ada Nwosu', 'Today', '12', '₦286,000', 'Loyal'], ['Tomi Okafor', 'Yesterday', '4', '₦94,500', 'Returning'], ['Zara Bello', '21 Oct', '1', '₦31,200', 'New']],
		'empty': 'Customer profiles will be displayed here.',
	},
	'reports': {
		'title': 'Reports & analytics',
		'eyebrow': 'BUSINESS INSIGHT',
		'description': 'A reporting workspace preview. All visible sample values are marked as demo data.',
		'action': 'Choose report',
		'metrics': [('Gross sales', '₦2.84m', 'Demo period'), ('Units sold', '1,286', 'Sample figure'), ('Average order', '₦13.3k', 'Illustrative only')],
		'columns': ['Report', 'Period', 'Updated', 'Data status'],
		'rows': [['Sales summary', 'This month', '29 Oct, 09:00', 'Demo data'], ['Stock movement', 'This month', '29 Oct, 09:00', 'Demo data'], ['Customer activity', 'This month', '29 Oct, 09:00', 'Demo data']],
		'empty': 'Reports will populate after live business data is connected.',
	},
	'staff': {
		'title': 'Staff management',
		'eyebrow': 'TEAM ACCESS',
		'description': 'Manage team membership and access once permission settings are available.',
		'action': 'Invite team member',
		'metrics': [('Team members', '8', 'Demo fixture'), ('Pending invites', '2', 'Sample state'), ('Roles', '2', 'Owner and Staff')],
		'columns': ['Team member', 'Role', 'Last active', 'Access'],
		'rows': [['Mina James', 'Staff', 'Today, 09:15', 'Demo access'], ['Nneka Obi', 'Staff', 'Yesterday', 'Demo access'], ['Owner account', 'Owner', 'Today, 10:02', 'Full access']],
		'empty': 'Team members will appear here.',
	},
	'settings': {
		'title': 'Settings',
		'eyebrow': 'WORKSPACE PREFERENCES',
		'description': 'Business profile and preferences. Changes are disabled in this foundation preview.',
		'action': 'Save changes',
		'metrics': [('Business profile', 'Incomplete', 'Setup required'), ('Currency', 'NGN', 'Current default'), ('Theme', 'System', 'Can be changed here')],
		'columns': ['Preference', 'Current value', 'Availability'],
		'rows': [['Business name', 'NorrisBeauty', 'Preview'], ['Currency', 'NGN · Nigerian naira', 'Preview'], ['Timezone', 'Africa/Lagos', 'Preview']],
		'empty': 'Workspace settings will be editable when this module is implemented.',
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
		'demo_workspace': True,
		'permission_codes': sorted(permissions),
		'can_use_pos': 'pos.use' in permissions,
		'can_view_catalog': 'catalog.view' in permissions,
		'can_view_inventory': 'inventory.view' in permissions,
		'can_view_sales': 'sales.view' in permissions,
		'can_view_customers': 'customers.view' in permissions,
		'chart_bars': [('Mon', 42, 48, 39), ('Tue', 66, 55, 62), ('Wed', 51, 72, 58), ('Thu', 78, 64, 74), ('Fri', 60, 83, 68), ('Sat', 92, 76, 96), ('Sun', 71, 88, 82)],
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
	if not context['membership'] or (permission_code and not membership_has_permission(context['membership'], permission_code)):
		return HttpResponseForbidden('Owner access is required for this workspace page.')
	page = dict(page)
	if page_key == 'products':
		products = Product.objects.filter(business=context['membership'].business, is_active=True).select_related('category').prefetch_related('variants')
		page['metrics'] = [
			('Active products', str(products.count()), 'Live catalog'),
			('Categories', str(Category.objects.filter(business=context['membership'].business).count()), 'Live catalog'),
			('Variants', str(ProductVariant.objects.filter(business=context['membership'].business, is_active=True).count()), 'Live catalog'),
		]
		page['rows'] = [[product.name, product.category.name if product.category_id else 'Uncategorized', ', '.join(variant.sku for variant in product.variants.all()) or 'No variants', ', '.join(f'₦{variant.price:,.2f}' for variant in product.variants.all()) or '—', 'Active'] for product in products]
		page['empty'] = 'No products have been created yet.'
		context['demo_workspace'] = False
	elif page_key == 'inventory':
		business = context['membership'].business
		stock = Batch.objects.filter(business=business).values('variant_id', 'variant__sku', 'variant__name', 'variant__product__name', 'variant__reorder_point', 'variant__unit_cost', 'location__name').annotate(quantity=Sum('quantity_on_hand')).order_by('variant__product__name', 'location__name')
		rows = list(stock)
		units = sum(row['quantity'] or 0 for row in rows)
		low_stock = sum(1 for row in rows if row['variant__reorder_point'] and (row['quantity'] or 0) <= row['variant__reorder_point'])
		stock_value = sum((row['variant__unit_cost'] or 0) * (row['quantity'] or 0) for row in rows)
		page['metrics'] = [('Units on hand', str(units), 'Live batch balances'), ('Low stock', str(low_stock), 'At or below reorder point'), ('Stock value', f'₦{stock_value:,.2f}', 'Weighted-average cost')]
		page['rows'] = [[f"{row['variant__product__name']} · {row['variant__sku']}", row['location__name'], f"{row['quantity'] or 0} units", f"{row['variant__reorder_point']} units", 'Out of stock' if not (row['quantity'] or 0) else 'Reorder' if row['variant__reorder_point'] and (row['quantity'] or 0) <= row['variant__reorder_point'] else 'Healthy'] for row in rows]
		page['empty'] = 'No stock has been recorded yet.'
		context['demo_workspace'] = False
	context['page'] = page
	return render(request, 'core/workspace.html', context)
