from django.test import TestCase,Client,override_settings
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.core.files.uploadedfile import SimpleUploadedFile
from decimal import Decimal
from io import BytesIO
from PIL import Image
import tempfile
from pathlib import Path
from config import settings as settings_module
from .models import Adjustment, AuditEvent, Batch, Business, Category, Customer, Expense, InventoryAlert, Membership, Notification, Payment, Product, ProductImage, ProductVariant, PurchaseOrder, PurchaseOrderLine, Sale, SaleLine, StockLocation, StockMovement, StockTake, Supplier, Transfer
class FoundationTests(TestCase):
 def test_test_run_detection_handles_pytest_commands(self):
    self.assertTrue(settings_module.is_test_run(['pytest','-q']))
    self.assertTrue(settings_module.is_test_run(['python','-m','pytest']))
    self.assertTrue(settings_module.is_test_run(['manage.py','test']))
    self.assertFalse(settings_module.is_test_run(['runserver','0.0.0.0:8000']))
 def test_login_accepts_valid_credentials(self):
    user=get_user_model().objects.create_user(username='login-user',password='secure-pass-123')
    response=self.client.post('/login/',{'username':user.username,'password':'secure-pass-123'})
    self.assertRedirects(response,'/')
 def test_login_rejects_invalid_credentials(self):
    response=self.client.post('/login/',{'username':'unknown','password':'incorrect'})
    self.assertEqual(response.status_code,200)
    self.assertContains(response,'Please check your username and password.')
 def test_login_exposes_password_recovery(self):
    response=self.client.get('/login/')
    self.assertContains(response,'Forgot your password?')
    self.assertContains(response,'/password-reset/')
    self.assertContains(response,'data-pwa-status')
    self.assertContains(response,'Install desktop app')
    self.assertContains(response,'https://drive.google.com/file/d/1lelNKdI5jPqGKzVvoLZc2HkiPUCiFlch/view?usp=sharing')
    self.assertContains(response,'Download Android APK')
    self.assertContains(response,'target="_blank" rel="noopener noreferrer"')
    self.assertContains(response,'static/img/logo.jpeg')
    self.assertContains(response,'Norris Beautyquest')
    self.assertContains(response,'login-art')
    self.assertNotContains(response,'THE ART OF BEAUTIFUL BUSINESS')
    self.assertNotContains(response,'Beauty business,')
    self.assertNotContains(response,'beautifully managed.')
    self.assertNotContains(response,'Inventory, sales and insight in one elegant workspace.')
 def test_pwa_manifest_is_installable_and_uses_branded_icons(self):
    response=self.client.get('/manifest.webmanifest')
    self.assertEqual(response.status_code,200)
    self.assertEqual(response['Content-Type'],'application/manifest+json')
    manifest=response.json()
    self.assertEqual(manifest['display'],'standalone')
    self.assertEqual(manifest['start_url'],'/')
    self.assertEqual([icon['sizes'] for icon in manifest['icons']],['192x192','512x512'])
 def test_service_worker_is_root_scoped_and_has_an_offline_fallback(self):
    response=self.client.get('/service-worker.js')
    self.assertEqual(response.status_code,200)
    self.assertEqual(response['Service-Worker-Allowed'],'/')
    self.assertIn("request.mode === 'navigate'",response.content.decode())
    self.assertIn("'/offline-shell/'",response.content.decode())
 def test_offline_shell_is_public_and_contains_no_business_snapshot(self):
    response=self.client.get('/offline-shell/')
    self.assertEqual(response.status_code,200)
    self.assertContains(response,'Offline workspace')
    self.assertContains(response,'Swipe sideways to view all stock columns.')
    self.assertContains(response,'offline-vault.js')
    self.assertNotContains(response,'api/v1/customers')
    self.assertNotContains(response,'api/v1/sales')
 def test_offline_access_requires_authenticated_membership(self):
    user=get_user_model().objects.create_user(username='offline-owner',password='secure-pass-123')
    self.client.force_login(user)
    self.assertEqual(self.client.get('/offline/').status_code,403)
    business=Business.objects.create(name='Offline QA Business')
    Membership.objects.create(user=user,business=business,role=Membership.OWNER)
    response=self.client.get('/offline/')
    self.assertEqual(response.status_code,200)
    self.assertContains(response,'Offline catalog and stock')
    self.assertContains(response,'data-user-id="')
 def test_health(self):
  r=self.client.get('/health/');self.assertEqual(r.status_code,200);self.assertEqual(r.json()['status'],'ok')
 def test_api_health(self):
  r=self.client.get('/api/v1/health/');self.assertEqual(r.status_code,200)
 def test_dashboard_requires_login(self):
  self.assertEqual(self.client.get('/').status_code,302)
 def test_owner_dashboard(self):
  user=get_user_model().objects.create_user(username='owner',password='secure-pass-123')
  business=Business.objects.create(name='NorrisBeauty')
  Membership.objects.create(user=user,business=business,role=Membership.OWNER)
  self.client.force_login(user)
  response=self.client.get('/')
  self.assertEqual(response.status_code,200)
  self.assertContains(response,'OWNER DASHBOARD')
  self.assertContains(response,'Add a product')
  self.assertContains(response,'Skip to main content')
  self.assertContains(response,'id="main-content"')
  self.assertContains(response,'static/img/logo.jpeg')
 def test_staff_dashboard(self):
  user=get_user_model().objects.create_user(username='staff',password='secure-pass-123')
  business=Business.objects.create(name='NorrisBeauty')
  Membership.objects.create(user=user,business=business,role=Membership.STAFF)
  self.client.force_login(user)
  response=self.client.get('/')
  self.assertContains(response,'STAFF DASHBOARD')
  self.assertContains(response,'Browse products')
  self.assertContains(response,'View the product catalog')
  self.assertNotContains(response,'<strong>Add a product</strong>',html=False)
 def test_owner_and_staff_members_cannot_access_django_admin(self):
    business=Business.objects.create(name='NorrisBeauty')
    for role in (Membership.OWNER,Membership.STAFF):
     user=get_user_model().objects.create_user(username=role,password='secure-pass-123')
     Membership.objects.create(user=user,business=business,role=role)
     self.client.force_login(user)
     response=self.client.get('/admin/')
     self.assertEqual(response.status_code,302)
     self.assertIn('/admin/login/',response.url)

 def test_owner_can_open_all_management_screens(self):
    user=get_user_model().objects.create_user(username='phase2-owner',password='secure-pass-123')
    business=Business.objects.create(name='NorrisBeauty Owner Screens')
    Membership.objects.create(user=user,business=business,role=Membership.OWNER)
    self.client.force_login(user)
    for path in ('/products/','/inventory/','/pos/','/sales/','/purchases/','/customers/','/reports/','/staff/','/settings/'):
     with self.subTest(path=path):
      self.assertEqual(self.client.get(path).status_code,200)

 def test_staff_is_limited_to_operational_screens(self):
    user=get_user_model().objects.create_user(username='phase2-staff',password='secure-pass-123')
    business=Business.objects.create(name='NorrisBeauty Staff Screens')
    Membership.objects.create(user=user,business=business,role=Membership.STAFF)
    self.client.force_login(user)
    for path in ('/products/','/inventory/','/pos/','/sales/','/customers/'):
     with self.subTest(allowed=path):
      self.assertEqual(self.client.get(path).status_code,200)
    for path in ('/purchases/','/reports/','/staff/','/settings/'):
     with self.subTest(denied=path):
      self.assertEqual(self.client.get(path).status_code,403)
    dashboard=self.client.get('/')
    self.assertNotContains(dashboard,'href="/purchases/"')
    self.assertNotContains(dashboard,'href="/reports/"')
    self.assertNotContains(dashboard,'href="/staff/"')
    self.assertNotContains(dashboard,'href="/settings/"')

 def test_phase_two_workspace_screens_render_live_states_without_demo_content(self):
      user=get_user_model().objects.create_user(username='phase2-screen-owner',password='secure-pass-123')
      business=Business.objects.create(name='NorrisBeauty Screen Previews')
      Membership.objects.create(user=user,business=business,role=Membership.OWNER)
      self.client.force_login(user)
      page_expectations={
      '/products/':'Products',
       '/inventory/':'Inventory overview',
       '/pos/':'Point of sale',
       '/sales/':'Sales history',
      '/purchases/':'Purchases',
       '/customers/':'Customers',
      '/reports/':'Reports',
       '/staff/':'Staff management',
       '/settings/':'Settings',
      }
      for path,title in page_expectations.items():
       with self.subTest(path=path):
         response=self.client.get(path)
         self.assertEqual(response.status_code,200)
         self.assertContains(response,title)
         self.assertNotContains(response,'DEMO DATA')
         self.assertNotContains(response,'Demo fixture')
         self.assertNotContains(response,'Radiance Serum')
         self.assertNotContains(response,'Ada Nwosu')
         if path == '/pos/':
          self.assertContains(response,'Your basket is empty')
          self.assertContains(response,'Complete sale')

 def test_products_category_form_initializer_is_available_to_page_setup(self):
    source = (Path(settings_module.BASE_DIR) / 'static' / 'js' / 'app.js').read_text(encoding='utf-8')
    api_end = source.index('\n  const initCategoryForm')
    self.assertGreater(api_end, source.index('    return payload;\n  };'))
    self.assertEqual(source.count('const initCategoryForm'), 1)
    self.assertIn("method: categoryId ? 'PATCH' : 'POST'", source)

 def test_pos_normalizes_inventory_response_before_stock_lookup(self):
    source = (Path(settings_module.BASE_DIR) / 'static' / 'js' / 'app.js').read_text(encoding='utf-8')
    self.assertIn("const [catalog, locations, stockResponse]", source)
    self.assertIn("const stock = stockResponse.results;", source)

 def test_api_login_returns_active_membership_tokens(self):
    user=get_user_model().objects.create_user(username='api-owner',password='secure-pass-123')
    business=Business.objects.create(name='API Auth Business')
    Membership.objects.create(user=user,business=business,role=Membership.OWNER)
    response=self.client.post('/api/v1/auth/login/',{'username':user.username,'password':'secure-pass-123'},content_type='application/json')
    self.assertEqual(response.status_code,200)
    payload=response.json()
    self.assertIn('access',payload)
    self.assertIn('refresh',payload)
    self.assertEqual(payload['user']['role'],'owner')
    me=self.client.get('/api/v1/auth/me/',HTTP_AUTHORIZATION=f"Bearer {payload['access']}")
    self.assertEqual(me.status_code,200)
    self.assertEqual(me.json()['role'],'owner')

 def test_rotated_mobile_refresh_token_can_be_logged_out(self):
    user=get_user_model().objects.create_user(username='mobile-logout-owner',password='secure-pass-123')
    business=Business.objects.create(name='Mobile Logout Business')
    Membership.objects.create(user=user,business=business,role=Membership.OWNER)
    login=self.client.post('/api/v1/auth/login/',{'username':user.username,'password':'secure-pass-123'},content_type='application/json')
    self.assertEqual(login.status_code,200)

    refreshed=self.client.post('/api/v1/auth/refresh/',{'refresh':login.json()['refresh']},content_type='application/json')
    self.assertEqual(refreshed.status_code,200)

    payload=refreshed.json()
    logout=self.client.post(
        '/api/v1/auth/logout/',
        {'refresh':payload['refresh']},
        content_type='application/json',
        HTTP_AUTHORIZATION=f"Bearer {payload['access']}",
    )
    self.assertEqual(logout.status_code,204)

    revoked=self.client.post('/api/v1/auth/refresh/',{'refresh':payload['refresh']},content_type='application/json')
    self.assertEqual(revoked.status_code,401)

 def test_staff_api_permissions_use_default_role_access(self):
    user=get_user_model().objects.create_user(username='api-staff',password='secure-pass-123')
    business=Business.objects.create(name='API Staff Business')
    Membership.objects.create(user=user,business=business,role=Membership.STAFF)
    response=self.client.post('/api/v1/auth/login/',{'username':user.username,'password':'secure-pass-123'},content_type='application/json')
    self.assertEqual(response.status_code,200)
    payload=response.json()
    perms=self.client.get('/api/v1/auth/permissions/',HTTP_AUTHORIZATION=f"Bearer {payload['access']}")
    self.assertEqual(perms.status_code,200)
    self.assertIn('catalog.view',perms.json()['permissions'])
    self.assertNotIn('staff.manage',perms.json()['permissions'])

 def test_phase_four_catalog_api_requires_authentication_and_scopes_business(self):
    self.assertEqual(self.client.get('/api/v1/catalog/products/').status_code,401)
    first_business=Business.objects.create(name='Catalog API First Business')
    Business.objects.create(name='Catalog API Second Business')
    user=get_user_model().objects.create_user(username='catalog-api-owner',password='secure-pass-123')
    Membership.objects.create(user=user,business=first_business,role=Membership.OWNER)
    login=self.client.post('/api/v1/auth/login/',{'username':user.username,'password':'secure-pass-123'},content_type='application/json')
    token=login.json()['access']
    response=self.client.get('/api/v1/catalog/products/',HTTP_AUTHORIZATION=f"Bearer {token}")
    self.assertEqual(response.status_code,200)
    self.assertEqual(response.json()['results'],[])
    self.assertEqual(response.json()['count'],0)

class PhaseFourApiTests(TestCase):
 def setUp(self):
    self.media_dir=tempfile.TemporaryDirectory()
    self.addCleanup(self.media_dir.cleanup)
    self.media_settings=override_settings(MEDIA_ROOT=self.media_dir.name)
    self.media_settings.enable()
    self.addCleanup(self.media_settings.disable)
    self.business=Business.objects.create(name='Phase Four Business')
    self.owner=get_user_model().objects.create_user(username='phase-four-owner',password='secure-pass-123')
    self.staff=get_user_model().objects.create_user(username='phase-four-staff',password='secure-pass-123')
    Membership.objects.create(user=self.owner,business=self.business,role=Membership.OWNER)
    Membership.objects.create(user=self.staff,business=self.business,role=Membership.STAFF)
    self.category=Category.objects.create(business=self.business,name='Skincare')
    self.product=Product.objects.create(business=self.business,category=self.category,name='Radiance Serum')
    self.variant=ProductVariant.objects.create(business=self.business,product=self.product,name='30 ml',sku='NB-SK-104',price='18500.00')
    self.location=StockLocation.objects.create(business=self.business,name='Lagos Studio')
    self.client=Client()

 def authenticate(self,user):
    response=self.client.post('/api/v1/auth/login/',{'username':user.username,'password':'secure-pass-123'},content_type='application/json')
    self.assertEqual(response.status_code,200)
    self.client.defaults['HTTP_AUTHORIZATION']=f"Bearer {response.json()['access']}"

 def movement(self,**overrides):
    data={
     'kind':'receipt','variant_id':self.variant.pk,'location_id':self.location.pk,
     'batch_number':'LOT-001','expiry_date':'2027-12-31','quantity_delta':10,
     'unit_cost':'100.00','reason':'Initial delivery','idempotency_key':'phase-four-receipt-1',
    }
    data.update(overrides)
    return data

 def test_staff_reads_catalog_and_stock_but_cannot_create_or_adjust(self):
    self.authenticate(self.staff)
    products=self.client.get('/api/v1/catalog/products/')
    stock=self.client.get('/api/v1/inventory/stock/')
    self.assertEqual(products.status_code,200)
    self.assertEqual(stock.status_code,200)
    create=self.client.post('/api/v1/catalog/products/',{'name':'Unauthorized Product'},content_type='application/json')
    movement=self.client.post('/api/v1/inventory/movements/',self.movement(),content_type='application/json')
    self.assertEqual(create.status_code,403)
    self.assertEqual(movement.status_code,403)

 def test_owner_creates_product_with_variant_and_image(self):
    self.authenticate(self.owner)
    response=self.client.post('/api/v1/catalog/products/',{
     'name':'Velvet Lip Color','category':self.category.pk,
     'variants':[{'name':'Rose','sku':'NB-MK-221','barcode':'0123456789','price':'12000.00','unit_cost':'4000.00'}],
     'images':[{'image_url':'https://example.test/velvet.jpg','alt_text':'Velvet lip color','position':0}],
    },content_type='application/json')
    self.assertEqual(response.status_code,201,response.content)
    self.assertEqual(response.json()['variants'][0]['sku'],'NB-MK-221')
    self.assertEqual(response.json()['images'][0]['alt_text'],'Velvet lip color')

 def product_image(self, image_format='PNG'):
    output=BytesIO()
    Image.new('RGB',(2,2),color='white').save(output,format=image_format)
    return SimpleUploadedFile('user-supplied-name.png',output.getvalue(),content_type='image/png')

 def test_owner_uploads_valid_product_image_to_scoped_storage(self):
    self.client.force_login(self.owner)
    response=self.client.post(f'/api/v1/catalog/products/{self.product.pk}/images/',{
     'image':self.product_image(),'alt_text':'Serum bottle','is_primary':'true',
    })
    self.assertEqual(response.status_code,201,response.content)
    image=ProductImage.objects.get(product=self.product)
    self.assertTrue(image.image.name.startswith(f'products/{self.business.pk}/{self.product.pk}/'))
    self.assertTrue(image.image.name.endswith('.png'))
    self.assertTrue(image.is_primary)

 def test_primary_image_replacement_and_removal_are_scoped(self):
    self.client.force_login(self.owner)
    first=self.client.post(f'/api/v1/catalog/products/{self.product.pk}/images/',{'image':self.product_image(),'alt_text':'First','is_primary':'true'})
    second=self.client.post(f'/api/v1/catalog/products/{self.product.pk}/images/',{'image':self.product_image(),'alt_text':'Second','is_primary':'true'})
    self.assertEqual(first.status_code,201,first.content)
    self.assertEqual(second.status_code,201,second.content)
    images=list(ProductImage.objects.filter(product=self.product).order_by('id'))
    self.assertEqual(sum(image.is_primary for image in images),1)
    self.assertEqual(self.client.delete(f'/api/v1/catalog/products/{self.product.pk}/images/{images[0].pk}/').status_code,204)
    self.assertFalse(ProductImage.objects.filter(pk=images[0].pk).exists())

 def test_product_image_upload_rejects_disallowed_format_and_oversize(self):
    self.client.force_login(self.owner)
    gif_response=self.client.post(f'/api/v1/catalog/products/{self.product.pk}/images/',{
     'image':self.product_image('GIF'),'alt_text':'Unsupported image',
    })
    large_image=SimpleUploadedFile('large.png',b'x'*(5*1024*1024+1),content_type='image/png')
    size_response=self.client.post(f'/api/v1/catalog/products/{self.product.pk}/images/',{
     'image':large_image,'alt_text':'Oversized image',
    })
    self.assertEqual(gif_response.status_code,400)
    self.assertEqual(size_response.status_code,400)
    self.assertEqual(ProductImage.objects.count(),0)

 def test_staff_cannot_upload_product_images(self):
    self.client.force_login(self.staff)
    response=self.client.post(f'/api/v1/catalog/products/{self.product.pk}/images/',{
     'image':self.product_image(),'alt_text':'Unauthorized image',
    })
    self.assertEqual(response.status_code,403)
    self.assertEqual(ProductImage.objects.count(),0)

 def test_owner_can_edit_and_deactivate_product_and_category(self):
    self.client.force_login(self.owner)
    edited=self.client.patch(f'/api/v1/catalog/products/{self.product.pk}/',{
     'name':'Radiance Serum Updated',
     'variants':[{'variant_id':self.variant.pk,'name':'50 ml','sku':'NB-SK-104','price':'20000.00','reorder_point':4}],
    },content_type='application/json')
    self.assertEqual(edited.status_code,200,edited.content)
    self.product.refresh_from_db();self.variant.refresh_from_db()
    self.assertEqual(self.product.name,'Radiance Serum Updated')
    self.assertEqual(self.variant.name,'50 ml')
    self.assertEqual(self.variant.reorder_point,4)
    self.assertEqual(self.client.delete(f'/api/v1/catalog/products/{self.product.pk}/').status_code,204)
    self.assertFalse(Product.objects.get(pk=self.product.pk).is_active)
    self.assertEqual(self.client.delete(f'/api/v1/catalog/categories/{self.category.pk}/').status_code,204)
    self.assertFalse(Category.objects.get(pk=self.category.pk).is_active)

 def test_staff_cannot_edit_or_deactivate_catalog_records(self):
    self.client.force_login(self.owner)
    self.client.delete(f'/api/v1/catalog/products/{self.product.pk}/')
    self.client.force_login(self.staff)
    edited=self.client.patch(f'/api/v1/catalog/products/{self.product.pk}/',{'name':'Unauthorized'},content_type='application/json')
    deactivated=self.client.delete(f'/api/v1/catalog/categories/{self.category.pk}/')
    self.assertEqual(edited.status_code,403)
    self.assertEqual(deactivated.status_code,403)
    self.assertEqual(self.client.get(f'/api/v1/catalog/products/{self.product.pk}/').status_code,404)

 def test_duplicate_sku_and_category_return_validation_errors(self):
    self.authenticate(self.owner)
    product=self.client.post('/api/v1/catalog/products/',{
     'name':'Duplicate SKU product','category':self.category.pk,'variants':[{'name':'Standard','sku':'NB-SK-104','price':'50.00'}],
    },content_type='application/json')
    category=self.client.post('/api/v1/catalog/categories/',{'name':'skincare'},content_type='application/json')
    self.assertEqual(product.status_code,400)
    self.assertEqual(category.status_code,400)

 def test_owner_manages_locations_and_staff_only_reads_active_locations(self):
    self.authenticate(self.owner)
    created=self.client.post('/api/v1/inventory/locations/',{'name':'Back room'},content_type='application/json')
    self.assertEqual(created.status_code,201,created.content)
    location_id=created.json()['id']
    edited=self.client.patch(f'/api/v1/inventory/locations/{location_id}/',{'name':'Front room'},content_type='application/json')
    self.assertEqual(edited.status_code,200,edited.content)
    deactivated=self.client.delete(f'/api/v1/inventory/locations/{location_id}/')
    self.assertEqual(deactivated.status_code,200,deactivated.content)
    self.assertFalse(StockLocation.objects.get(pk=location_id).is_active)
    self.authenticate(self.staff)
    visible=self.client.get('/api/v1/inventory/locations/')
    self.assertEqual(visible.status_code,200)
    self.assertNotIn(location_id,[item['id'] for item in visible.json()['results']])
    self.assertEqual(self.client.patch(f'/api/v1/inventory/locations/{self.location.pk}/',{'name':'Nope'},content_type='application/json').status_code,403)

 def test_location_names_are_required_unique_and_business_scoped(self):
    self.authenticate(self.owner)
    blank=self.client.post('/api/v1/inventory/locations/',{'name':'   '},content_type='application/json')
    duplicate=self.client.post('/api/v1/inventory/locations/',{'name':self.location.name.lower()},content_type='application/json')
    self.assertEqual(blank.status_code,400)
    self.assertEqual(duplicate.status_code,400)
    other_business=Business.objects.create(name='Other Location Business')
    other_location=StockLocation.objects.create(business=other_business,name='Other location')
    self.assertEqual(self.client.patch(f'/api/v1/inventory/locations/{other_location.pk}/',{'name':'Changed'},content_type='application/json').status_code,404)

 def test_category_listing_creation_and_product_category_scope(self):
    self.authenticate(self.owner)
    listed=self.client.get('/api/v1/catalog/categories/')
    self.assertEqual(listed.status_code,200)
    self.assertIn(self.category.name,[item['name'] for item in listed.json()['results']])
    missing_category=self.client.post('/api/v1/catalog/products/',{
      'name':'Missing category product',
      'variants':[{'name':'Standard','sku':'CAT-SKU-MISSING','price':'50.00'}],
    },content_type='application/json')
    self.assertEqual(missing_category.status_code,400)
    created=self.client.post('/api/v1/catalog/categories/',{'name':'Serums'},content_type='application/json')
    self.assertEqual(created.status_code,201,created.content)
    product=self.client.post('/api/v1/catalog/products/',{
     'name':'Categorized product','category':created.json()['id'],
     'variants':[{'name':'Standard','sku':'CAT-SKU-1','price':'50.00'}],
    },content_type='application/json')
    self.assertEqual(product.status_code,201,product.content)
    self.assertEqual(product.json()['category'],created.json()['id'])
    other_business=Business.objects.create(name='Other Category Business')
    other_category=Category.objects.create(business=other_business,name='Other')
    unauthorized=self.client.post('/api/v1/catalog/products/',{
     'name':'Cross business product','category':other_category.pk,
     'variants':[{'name':'Standard','sku':'CAT-SKU-2','price':'50.00'}],
    },content_type='application/json')
    self.assertEqual(unauthorized.status_code,400)

 def test_duplicate_barcode_is_rejected_case_insensitively(self):
    self.authenticate(self.owner)
    self.variant.barcode='NB-CODE-1';self.variant.save(update_fields=['barcode'])
    response=self.client.post('/api/v1/catalog/products/',{
     'name':'Duplicate barcode product','category':self.category.pk,'variants':[{'name':'Standard','sku':'NEW-SKU','barcode':'nb-code-1','price':'50.00'}],
    },content_type='application/json')
    self.assertEqual(response.status_code,400)

 def test_product_search_filter_and_pagination_are_business_scoped(self):
    self.authenticate(self.owner)
    ProductVariant.objects.filter(pk=self.variant.pk).update(barcode='NB-CODE-1')
    search=self.client.get('/api/v1/catalog/products/?search=nb-code-1&limit=1')
    self.assertEqual(search.status_code,200)
    self.assertEqual(search.json()['count'],1)
    self.assertEqual(search.json()['results'][0]['id'],self.product.pk)
    invalid=self.client.get('/api/v1/catalog/products/?page=nope')
    self.assertEqual(invalid.status_code,400)

 def test_receipt_is_atomic_idempotent_and_updates_weighted_average_cost(self):
    self.authenticate(self.owner)
    first=self.client.post('/api/v1/inventory/movements/',self.movement(),content_type='application/json')
    replay=self.client.post('/api/v1/inventory/movements/',self.movement(),content_type='application/json')
    self.assertEqual(first.status_code,201,first.content)
    self.assertEqual(replay.status_code,200,replay.content)
    self.assertTrue(replay.json()['replayed'])
    self.assertEqual(Batch.objects.get().quantity_on_hand,10)
    self.assertEqual(StockMovement.objects.count(),1)
    second=self.client.post('/api/v1/inventory/movements/',self.movement(
     batch_number='LOT-002',quantity_delta=10,unit_cost='200.00',idempotency_key='phase-four-receipt-2'),content_type='application/json')
    self.assertEqual(second.status_code,201,second.content)
    self.variant.refresh_from_db()
    self.assertEqual(str(self.variant.unit_cost),'150.00')

 def test_product_stock_history_and_expiry_filter_are_business_scoped(self):
    self.authenticate(self.owner)
    self.client.post('/api/v1/inventory/movements/',self.movement())
    history=self.client.get(f'/api/v1/catalog/products/{self.product.pk}/stock-history/')
    self.assertEqual(history.status_code,200)
    self.assertEqual(history.json()['results'][0]['batch_number'],'LOT-001')
    expiring=self.client.get('/api/v1/inventory/stock/?expiring_before=2028-01-01')
    self.assertEqual(expiring.status_code,200)
    self.assertEqual(expiring.json()['results'][0]['quantity'],10)

 def test_negative_batch_balance_rejects_movement_without_partial_write(self):
    self.authenticate(self.owner)
    self.client.post('/api/v1/inventory/movements/',self.movement(),content_type='application/json')
    adjustment=self.movement(kind='adjustment',quantity_delta=-11,reason='Count correction',idempotency_key='phase-four-negative')
    response=self.client.post('/api/v1/inventory/movements/',adjustment,content_type='application/json')
    self.assertEqual(response.status_code,400)
    self.assertIn('negative',str(response.json()).lower())
    batch=Batch.objects.get(batch_number='LOT-001')
    self.assertEqual(batch.quantity_on_hand,10)
    self.assertEqual(StockMovement.objects.count(),1)

 def test_identical_adjustment_replay_is_idempotent(self):
    self.authenticate(self.owner)
    receipt=self.client.post('/api/v1/inventory/movements/',self.movement(),content_type='application/json')
    self.assertEqual(receipt.status_code,201)
    adjustment=self.movement(kind='adjustment',quantity_delta=-2,reason='Cycle count correction',idempotency_key='phase-four-adjustment-1')
    first=self.client.post('/api/v1/inventory/movements/',adjustment,content_type='application/json')
    replay=self.client.post('/api/v1/inventory/movements/',adjustment,content_type='application/json')
    self.assertEqual(first.status_code,201,first.content)
    self.assertEqual(replay.status_code,200,replay.content)
    self.assertTrue(replay.json()['replayed'])
    self.assertEqual(Batch.objects.get(batch_number='LOT-001').quantity_on_hand,8)
    self.assertEqual(StockMovement.objects.count(),2)

 def test_movement_rejects_variant_from_another_business(self):
    self.authenticate(self.owner)
    other_business=Business.objects.create(name='Other Phase Four Business')
    other_category=Category.objects.create(business=other_business,name='Other')
    other_product=Product.objects.create(business=other_business,category=other_category,name='Other Product')
    other_variant=ProductVariant.objects.create(business=other_business,product=other_product,sku='OTHER-1',price='1.00')
    response=self.client.post('/api/v1/inventory/movements/',self.movement(variant_id=other_variant.pk),content_type='application/json')
    self.assertEqual(response.status_code,400)
    self.assertEqual(StockMovement.objects.count(),0)


class PhaseFourWebTests(TestCase):
 def test_catalog_and_inventory_pages_render_business_records(self):
    business=Business.objects.create(name='Phase Four Web Business')
    user=get_user_model().objects.create_user(username='phase-four-web-owner',password='secure-pass-123')
    Membership.objects.create(user=user,business=business,role=Membership.OWNER)
    category=Category.objects.create(business=business,name='Haircare')
    product=Product.objects.create(business=business,category=category,name='Silk Repair Mask')
    variant=ProductVariant.objects.create(business=business,product=product,sku='NB-HC-087',price='16800.00',unit_cost='6000.00',reorder_point=6)
    location=StockLocation.objects.create(business=business,name='Online stock')
    Batch.objects.create(business=business,variant=variant,location=location,batch_number='MASK-01',quantity_on_hand=0,unit_cost='6000.00')
    self.client.force_login(user)
    catalog=self.client.get('/products/')
    inventory=self.client.get('/inventory/')
    api_catalog=self.client.get('/api/v1/catalog/products/')
    self.assertEqual(catalog.status_code,200)
    self.assertContains(catalog,'Live records will appear here when available.')
    self.assertContains(catalog,'data-table-body')
    self.assertNotContains(catalog,'DEMO DATA')
    self.assertEqual(inventory.status_code,200)
    self.assertContains(inventory,'Loading stock ledger…')
    self.assertContains(inventory,'data-inventory-ledger')
    self.assertNotContains(inventory,'DEMO DATA')
    self.assertEqual(api_catalog.status_code,200)
    self.assertEqual(api_catalog.json()['results'][0]['name'],'Silk Repair Mask')

 def test_web_writes_use_the_versioned_api_and_require_csrf(self):
    business=Business.objects.create(name='Phase Four CSRF Business')
    user=get_user_model().objects.create_user(username='phase-four-csrf-owner',password='secure-pass-123')
    Membership.objects.create(user=user,business=business,role=Membership.OWNER)
    client=Client(enforce_csrf_checks=True)
    client.force_login(user)
    page=client.get('/products/')
    token=page.cookies['csrftoken'].value
    category=Category.objects.create(business=business,name='CSRF category')
    payload={'name':'CSRF Product','category':category.pk,'variants':[{'name':'Standard','sku':'CSRF-001','price':'50.00'}]}
    rejected=client.post('/api/v1/catalog/products/',payload,content_type='application/json')
    self.assertEqual(rejected.status_code,403)
    accepted=client.post('/api/v1/catalog/products/',payload,content_type='application/json',HTTP_X_CSRFTOKEN=token)
    self.assertEqual(accepted.status_code,201,accepted.content)
    self.assertTrue(Product.objects.filter(business=business,name='CSRF Product').exists())


class PhaseFivePurchasingApiTests(TestCase):
 def setUp(self):
    self.business=Business.objects.create(name='Phase Five Purchasing Business')
    self.other_business=Business.objects.create(name='Other Purchasing Business')
    self.owner=get_user_model().objects.create_user(username='phase-five-owner',password='secure-pass-123')
    self.staff=get_user_model().objects.create_user(username='phase-five-staff',password='secure-pass-123')
    Membership.objects.create(user=self.owner,business=self.business,role=Membership.OWNER)
    Membership.objects.create(user=self.staff,business=self.business,role=Membership.STAFF)
    self.supplier=Supplier.objects.create(business=self.business,name='Local Beauty Supply')
    self.location=StockLocation.objects.create(business=self.business,name='Receiving')
    self.product=Product.objects.create(business=self.business,name='Purchase Test Product')
    self.variant=ProductVariant.objects.create(
        business=self.business,product=self.product,sku='PHASE5-001',price='100.00'
    )
    self.client=Client()

 def authenticate(self,user):
    response=self.client.post(
        '/api/v1/auth/login/',
        {'username':user.username,'password':'secure-pass-123'},
        content_type='application/json',
    )
    self.assertEqual(response.status_code,200)
    self.client.defaults['HTTP_AUTHORIZATION']=f"Bearer {response.json()['access']}"

 def create_order(self,**overrides):
    payload={
        'supplier_id':self.supplier.pk,
        'location_id':self.location.pk,
        'expected_date':'2026-12-01',
        'lines':[{
            'variant_id':self.variant.pk,
            'quantity_ordered':5,
            'unit_cost':'30.00',
        }],
    }
    payload.update(overrides)
    return self.client.post('/api/v1/purchasing/orders/',payload,content_type='application/json')

 def test_purchasing_requires_auth_and_staff_permission(self):
    self.assertEqual(self.client.get('/api/v1/purchasing/suppliers/').status_code,401)
    self.authenticate(self.staff)
    self.assertEqual(self.client.get('/api/v1/purchasing/orders/').status_code,403)
    self.assertEqual(
        self.client.post('/api/v1/purchasing/suppliers/',{'name':'No Staff Supplier'},content_type='application/json').status_code,
        403,
    )

 def test_supplier_and_order_creation_are_business_scoped(self):
    self.authenticate(self.owner)
    supplier=self.client.post(
        '/api/v1/purchasing/suppliers/',
        {'name':'Second Supplier','email':'orders@example.test'},
        content_type='application/json',
    )
    self.assertEqual(supplier.status_code,201,supplier.content)
    created=self.create_order()
    self.assertEqual(created.status_code,201,created.content)
    order=created.json()
    self.assertTrue(order['order_number'].startswith(f'PO-{self.business.pk}-'))
    self.assertEqual(order['status'],PurchaseOrder.DRAFT)
    self.assertEqual(order['lines'][0]['quantity_received'],0)

    foreign_supplier=Supplier.objects.create(business=self.other_business,name='Foreign Supplier')
    rejected=self.create_order(supplier_id=foreign_supplier.pk)
    self.assertEqual(rejected.status_code,400)
    self.assertEqual(PurchaseOrder.objects.filter(business=self.business).count(),1)

 def test_purchase_order_creation_replays_exact_request_and_rejects_key_reuse(self):
    self.authenticate(self.owner)
    payload={
        'supplier_id':self.supplier.pk,
        'location_id':self.location.pk,
        'expected_date':'2026-12-01',
        'idempotency_key':'phase-five-order-create-1',
        'lines':[{'variant_id':self.variant.pk,'quantity_ordered':5,'unit_cost':'30.00'}],
    }
    first=self.client.post('/api/v1/purchasing/orders/',payload,content_type='application/json')
    replay=self.client.post('/api/v1/purchasing/orders/',payload,content_type='application/json')
    self.assertEqual(first.status_code,201,first.content)
    self.assertEqual(replay.status_code,200,replay.content)
    self.assertEqual(first.json()['id'],replay.json()['id'])
    self.assertEqual(PurchaseOrder.objects.filter(business=self.business).count(),1)

    changed_payload={**payload,'lines':[{'variant_id':self.variant.pk,'quantity_ordered':4,'unit_cost':'30.00'}]}
    conflict=self.client.post('/api/v1/purchasing/orders/',changed_payload,content_type='application/json')
    self.assertEqual(conflict.status_code,400)
    self.assertEqual(PurchaseOrder.objects.filter(business=self.business).count(),1)

 def test_partial_receipts_replay_and_full_receipt_reconcile_stock(self):
    self.authenticate(self.owner)
    order_response=self.create_order()
    self.assertEqual(order_response.status_code,201,order_response.content)
    order=order_response.json()
    placed=self.client.post(f"/api/v1/purchasing/orders/{order['id']}/place/")
    self.assertEqual(placed.status_code,200,placed.content)
    self.assertEqual(placed.json()['status'],PurchaseOrder.ORDERED)

    receipt_data={
        'line_id':order['lines'][0]['id'],
        'quantity':2,
        'batch_number':'PHASE5-LOT-1',
        'expiry_date':'2027-12-31',
        'idempotency_key':'phase-five-receipt-1',
    }
    received=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/receive/",
        receipt_data,
        content_type='application/json',
    )
    replay=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/receive/",
        receipt_data,
        content_type='application/json',
    )
    self.assertEqual(received.status_code,201,received.content)
    self.assertEqual(received.json()['status'],PurchaseOrder.PARTIALLY_RECEIVED)
    self.assertEqual(replay.status_code,200,replay.content)
    self.assertTrue(replay.json()['replayed'])
    self.assertEqual(Batch.objects.get().quantity_on_hand,2)
    self.assertEqual(StockMovement.objects.count(),1)

    final_receipt=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/receive/",
        {
            'line_id':order['lines'][0]['id'],
            'quantity':3,
            'batch_number':'PHASE5-LOT-2',
            'idempotency_key':'phase-five-receipt-2',
        },
        content_type='application/json',
    )
    self.assertEqual(final_receipt.status_code,201,final_receipt.content)
    self.assertEqual(final_receipt.json()['status'],PurchaseOrder.RECEIVED)
    line=PurchaseOrderLine.objects.get(purchase_order_id=order['id'])
    self.assertEqual(line.quantity_received,5)
    self.assertEqual(Batch.objects.filter(variant=self.variant).aggregate(total=Sum('quantity_on_hand'))['total'],5)
    movements=StockMovement.objects.filter(purchase_order_line=line)
    self.assertEqual(movements.count(),2)
    self.assertEqual(list(movements.values_list('unit_cost',flat=True)),[Decimal('30.00'),Decimal('30.00')])

 def test_over_receipt_and_cancelled_order_do_not_post_stock(self):
    self.authenticate(self.owner)
    order=self.create_order().json()
    self.client.post(f"/api/v1/purchasing/orders/{order['id']}/place/")
    over_receipt=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/receive/",
        {
            'line_id':order['lines'][0]['id'],
            'quantity':6,
            'batch_number':'OVER-RECEIPT',
            'idempotency_key':'phase-five-over-receipt',
        },
        content_type='application/json',
    )
    self.assertEqual(over_receipt.status_code,400)
    self.assertEqual(StockMovement.objects.count(),0)

    cancelled=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/cancel/",
        {'reason':'Supplier could not fulfill the order'},
        content_type='application/json',
    )
    self.assertEqual(cancelled.status_code,200,cancelled.content)
    self.assertEqual(cancelled.json()['status'],PurchaseOrder.CANCELLED)
    blocked=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/receive/",
        {
            'line_id':order['lines'][0]['id'],
            'quantity':1,
            'batch_number':'CANCELLED-ORDER',
            'idempotency_key':'phase-five-cancelled-receipt',
        },
        content_type='application/json',
    )
    self.assertEqual(blocked.status_code,400)
    self.assertEqual(StockMovement.objects.count(),0)
    self.assertEqual(Batch.objects.count(),0)

 def test_cancel_after_partial_receipt_preserves_received_stock(self):
    self.authenticate(self.owner)
    order=self.create_order().json()
    self.client.post(f"/api/v1/purchasing/orders/{order['id']}/place/")
    received=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/receive/",
        {
            'line_id':order['lines'][0]['id'],
            'quantity':2,
            'batch_number':'PARTIAL-LOT',
            'idempotency_key':'phase-five-partial-cancel-receipt',
        },
        content_type='application/json',
    )
    self.assertEqual(received.status_code,201)
    cancelled=self.client.post(
        f"/api/v1/purchasing/orders/{order['id']}/cancel/",
        {'reason':'Supplier cancelled remaining units'},
        content_type='application/json',
    )
    self.assertEqual(cancelled.status_code,200)
    self.assertEqual(Batch.objects.get().quantity_on_hand,2)
    self.assertEqual(PurchaseOrderLine.objects.get().quantity_received,2)


class PhaseSixSalesApiTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Phase Six Sales Business')
        self.owner = get_user_model().objects.create_user(username='phase-six-owner', password='secure-pass-123')
        self.staff = get_user_model().objects.create_user(username='phase-six-staff', password='secure-pass-123')
        Membership.objects.create(user=self.owner, business=self.business, role=Membership.OWNER)
        Membership.objects.create(user=self.staff, business=self.business, role=Membership.STAFF)
        self.category = Category.objects.create(business=self.business, name='Sales Category')
        self.product = Product.objects.create(business=self.business, category=self.category, name='Sales Product')
        self.variant = ProductVariant.objects.create(
            business=self.business,
            product=self.product,
            sku='POS-001',
            price='25.00',
            unit_cost='10.00',
        )
        self.location = StockLocation.objects.create(business=self.business, name='Checkout Counter')
        Batch.objects.create(
            business=self.business,
            variant=self.variant,
            location=self.location,
            batch_number='SALE-LOT-1',
            quantity_on_hand=10,
            unit_cost='10.00',
        )
        self.client = Client()

    def authenticate(self, user):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': user.username, 'password': 'secure-pass-123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.defaults['HTTP_AUTHORIZATION'] = f"Bearer {response.json()['access']}"

    def test_staff_can_view_sales_and_check_out(self):
        self.authenticate(self.staff)
        sales = self.client.get('/api/v1/sales/')
        self.assertEqual(sales.status_code, 200)
        checkout = self.client.post(
            '/api/v1/sales/checkout/',
            {
                'location_id': self.location.pk,
                'items': [{'variant_id': self.variant.pk, 'quantity': 1, 'unit_price': '25.00'}],
                'payment_method': 'cash',
                'amount_paid': '25.00',
            },
            content_type='application/json',
        )
        self.assertEqual(checkout.status_code, 201)
        self.assertEqual(checkout.json()['status'], Sale.PAID)

    def test_owner_checkout_reduces_stock_and_tracks_totals(self):
        self.authenticate(self.owner)
        checkout = self.client.post(
            '/api/v1/sales/checkout/',
            {
                'location_id': self.location.pk,
                'items': [{'variant_id': self.variant.pk, 'quantity': 2, 'unit_price': '25.00'}],
                'payment_method': 'cash',
                'amount_paid': '50.00',
            },
            content_type='application/json',
        )
        self.assertEqual(checkout.status_code, 201, checkout.content)
        payload = checkout.json()
        self.assertEqual(payload['status'], Sale.PAID)
        self.assertEqual(payload['total'], '50.00')
        self.assertEqual(payload['paid_amount'], '50.00')
        self.assertEqual(Batch.objects.get(pk=1).quantity_on_hand, 8)
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(SaleLine.objects.count(), 1)
        self.assertEqual(StockMovement.objects.filter(variant=self.variant).count(), 1)

    def test_checkout_idempotency_replays_same_sale_and_rejects_key_reuse(self):
        self.authenticate(self.owner)
        payload = {
            'location_id': self.location.pk,
            'items': [{'variant_id': self.variant.pk, 'quantity': 2, 'unit_price': '25.00'}],
            'payment_method': 'cash',
            'amount_paid': '50.00',
            'idempotency_key': 'phase-six-checkout-replay-1',
        }

        first = self.client.post('/api/v1/pos/checkout/', payload, content_type='application/json')
        replay = self.client.post('/api/v1/pos/checkout/', payload, content_type='application/json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(first.json()['id'], replay.json()['id'])
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(Sale.objects.get().payments.count(), 1)
        self.assertEqual(Batch.objects.get().quantity_on_hand, 8)

        changed_payload = {**payload, 'amount_paid': '40.00'}
        conflict = self.client.post('/api/v1/pos/checkout/', changed_payload, content_type='application/json')
        self.assertEqual(conflict.status_code, 400)
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(Batch.objects.get().quantity_on_hand, 8)

    def test_refund_reverses_stock_and_marks_sale_refunded(self):
        self.authenticate(self.owner)
        checkout = self.client.post(
            '/api/v1/sales/checkout/',
            {
                'location_id': self.location.pk,
                'items': [{'variant_id': self.variant.pk, 'quantity': 2, 'unit_price': '25.00'}],
                'payment_method': 'cash',
                'amount_paid': '50.00',
            },
            content_type='application/json',
        )
        self.assertEqual(checkout.status_code, 201)
        sale_id = checkout.json()['id']
        refund = self.client.post(
            f'/api/v1/sales/{sale_id}/refund/',
            {'reason': 'Customer requested return', 'amount': '50.00', 'idempotency_key': 'phase-six-refund-1'},
            content_type='application/json',
        )
        self.assertEqual(refund.status_code, 201, refund.content)
        self.assertEqual(refund.json()['status'], Sale.REFUNDED)
        self.assertEqual(Batch.objects.get().quantity_on_hand, 10)

    def test_refund_idempotency_replays_without_double_posting(self):
        self.authenticate(self.owner)
        checkout = self.client.post(
            '/api/v1/sales/checkout/',
            {
                'location_id': self.location.pk,
                'items': [{'variant_id': self.variant.pk, 'quantity': 2, 'unit_price': '25.00'}],
                'payment_method': 'cash',
                'amount_paid': '50.00',
            },
            content_type='application/json',
        )
        self.assertEqual(checkout.status_code, 201)
        sale_id = checkout.json()['id']
        payload = {'reason': 'Customer requested return', 'amount': '50.00', 'idempotency_key': 'phase-six-refund-replay-1'}

        first = self.client.post(f'/api/v1/sales/{sale_id}/refund/', payload, content_type='application/json')
        replay = self.client.post(f'/api/v1/sales/{sale_id}/refund/', payload, content_type='application/json')

        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(replay.status_code, 201, replay.content)
        self.assertEqual(Payment.objects.filter(sale_id=sale_id, method=Payment.REFUND).count(), 1)
        self.assertEqual(Batch.objects.get().quantity_on_hand, 10)

    def test_refund_tracks_multiple_batches_without_overrestoring_stock(self):
        self.authenticate(self.owner)
        Batch.objects.create(
            business=self.business,
            variant=self.variant,
            location=self.location,
            batch_number='SALE-LOT-2',
            quantity_on_hand=5,
            unit_cost='10.00',
        )
        checkout = self.client.post(
            '/api/v1/sales/checkout/',
            {
                'location_id': self.location.pk,
                'items': [{'variant_id': self.variant.pk, 'quantity': 4, 'unit_price': '25.00'}],
                'payment_method': 'cash',
                'amount_paid': '100.00',
            },
            content_type='application/json',
        )
        self.assertEqual(checkout.status_code, 201)
        sale_id = checkout.json()['id']

        refund = self.client.post(
            f'/api/v1/sales/{sale_id}/refund/',
            {'reason': 'Customer return', 'amount': '100.00', 'idempotency_key': 'phase-six-multi-batch-refund'},
            content_type='application/json',
        )

        self.assertEqual(refund.status_code, 201, refund.content)
        self.assertEqual(Batch.objects.filter(variant=self.variant, location=self.location).aggregate(total=Sum('quantity_on_hand'))['total'], 15)

class PhaseSevenStockOperationsApiTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Phase Seven Inventory Business')
        self.owner = get_user_model().objects.create_user(username='phase-seven-owner', password='secure-pass-123')
        self.staff = get_user_model().objects.create_user(username='phase-seven-staff', password='secure-pass-123')
        Membership.objects.create(user=self.owner, business=self.business, role=Membership.OWNER)
        Membership.objects.create(user=self.staff, business=self.business, role=Membership.STAFF)
        self.category = Category.objects.create(business=self.business, name='Stock Operations')
        self.product = Product.objects.create(business=self.business, category=self.category, name='Transfer Product')
        self.variant = ProductVariant.objects.create(
            business=self.business,
            product=self.product,
            sku='PH7-001',
            price='100.00',
            unit_cost='40.00',
            reorder_point=3,
        )
        self.from_location = StockLocation.objects.create(business=self.business, name='Front Counter')
        self.to_location = StockLocation.objects.create(business=self.business, name='Back Room')
        Batch.objects.create(
            business=self.business,
            variant=self.variant,
            location=self.from_location,
            batch_number='PH7-LOT-1',
            quantity_on_hand=10,
            unit_cost='40.00',
        )
        self.client = Client()

    def authenticate(self, user):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': user.username, 'password': 'secure-pass-123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.defaults['HTTP_AUTHORIZATION'] = f"Bearer {response.json()['access']}"

    def test_owner_can_transfer_stock_between_locations_and_staff_cannot(self):
        self.authenticate(self.owner)
        transfer = self.client.post(
            '/api/v1/inventory/transfers/',
            {
                'variant_id': self.variant.pk,
                'from_location_id': self.from_location.pk,
                'to_location_id': self.to_location.pk,
                'quantity': 4,
                'reason': 'Store replenishment',
            },
            content_type='application/json',
        )
        self.assertEqual(transfer.status_code, 201, transfer.content)
        self.assertEqual(Transfer.objects.count(), 1)
        self.assertEqual(Batch.objects.get(variant=self.variant, location=self.from_location).quantity_on_hand, 6)
        self.assertEqual(Batch.objects.get(variant=self.variant, location=self.to_location).quantity_on_hand, 4)

        self.authenticate(self.staff)
        blocked = self.client.post(
            '/api/v1/inventory/transfers/',
            {
                'variant_id': self.variant.pk,
                'from_location_id': self.from_location.pk,
                'to_location_id': self.to_location.pk,
                'quantity': 1,
                'reason': 'Blocked attempt',
            },
            content_type='application/json',
        )
        self.assertEqual(blocked.status_code, 403)

    def test_stocktake_creates_adjustments_and_alerts_when_below_reorder_point(self):
        self.authenticate(self.owner)
        stocktake = self.client.post(
            '/api/v1/inventory/stocktakes/',
            {
                'location_id': self.from_location.pk,
                'items': [{'variant_id': self.variant.pk, 'counted_quantity': 2}],
                'reason': 'Cycle count',
            },
            content_type='application/json',
        )
        self.assertEqual(stocktake.status_code, 201, stocktake.content)
        self.assertEqual(Adjustment.objects.count(), 1)
        self.assertEqual(Adjustment.objects.get().quantity_delta, -8)
        self.assertEqual(Batch.objects.get(variant=self.variant, location=self.from_location).quantity_on_hand, 2)
        alerts = self.client.get('/api/v1/inventory/alerts/')
        self.assertEqual(alerts.status_code, 200)
        self.assertTrue(any(item['variant_id'] == self.variant.pk for item in alerts.json()['results']))

    def test_transaction_reconciles_ledger_after_recount(self):
        self.authenticate(self.owner)
        first = self.client.post(
            '/api/v1/inventory/stocktakes/',
            {
                'location_id': self.from_location.pk,
                'items': [{'variant_id': self.variant.pk, 'counted_quantity': 2}],
                'reason': 'First count',
            },
            content_type='application/json',
        )
        self.assertEqual(first.status_code, 201)
        second = self.client.post(
            '/api/v1/inventory/stocktakes/',
            {
                'location_id': self.from_location.pk,
                'items': [{'variant_id': self.variant.pk, 'counted_quantity': 10}],
                'reason': 'Recount verification',
            },
            content_type='application/json',
        )
        self.assertEqual(second.status_code, 201)
        movements = StockMovement.objects.filter(variant=self.variant, location=self.from_location)
        self.assertEqual(movements.count(), 2)
        self.assertEqual(sum(int(m.quantity_delta) for m in movements), 0)
        self.assertEqual(StockTake.objects.count(), 2)


class PhaseEightFinanceReportingApiTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Phase Eight Finance Business')
        self.owner = get_user_model().objects.create_user(username='phase-eight-owner', password='secure-pass-123')
        self.staff = get_user_model().objects.create_user(username='phase-eight-staff', password='secure-pass-123')
        Membership.objects.create(user=self.owner, business=self.business, role=Membership.OWNER)
        Membership.objects.create(user=self.staff, business=self.business, role=Membership.STAFF)
        self.client = Client()

    def authenticate(self, user):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': user.username, 'password': 'secure-pass-123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.defaults['HTTP_AUTHORIZATION'] = f"Bearer {response.json()['access']}"

    def test_owner_can_record_expense_and_staff_cannot_access_reports(self):
        self.authenticate(self.owner)
        expense = self.client.post(
            '/api/v1/expenses/',
            {
                'title': 'Rent',
                'category': 'Operations',
                'amount': '150.00',
                'vendor': 'North Gate Realty',
                'note': 'Monthly rent',
            },
            content_type='application/json',
        )
        self.assertEqual(expense.status_code, 201, expense.content)
        self.assertEqual(Expense.objects.count(), 1)
        summary = self.client.get('/api/v1/reports/summary/')
        self.assertEqual(summary.status_code, 200)
        payload = summary.json()
        self.assertEqual(payload['expense_total'], '150.00')
        self.assertEqual(payload['net'], '-150.00')

        self.authenticate(self.staff)
        blocked = self.client.get('/api/v1/reports/summary/')
        self.assertEqual(blocked.status_code, 403)

    def test_audit_events_and_notifications_are_business_scoped(self):
        self.authenticate(self.owner)
        self.client.post(
            '/api/v1/expenses/',
            {
                'title': 'Utilities',
                'category': 'Operations',
                'amount': '75.00',
                'vendor': 'GridCo',
                'note': 'Power bill',
            },
            content_type='application/json',
        )
        audit = self.client.get('/api/v1/audit-events/')
        self.assertEqual(audit.status_code, 200)
        self.assertTrue(any(item['event'] == 'expense.created' for item in audit.json()['results']))
        notifications = self.client.get('/api/v1/notifications/')
        self.assertEqual(notifications.status_code, 200)
        self.assertTrue(any(item['title'] == 'Expense recorded' for item in notifications.json()['results']))


class PhaseNineMobileCompletionApiTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Phase Nine Mobile Business')
        self.owner = get_user_model().objects.create_user(username='phase-nine-owner', password='secure-pass-123')
        Membership.objects.create(user=self.owner, business=self.business, role=Membership.OWNER)
        self.client = Client()

    def authenticate(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.owner.username, 'password': 'secure-pass-123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.defaults['HTTP_AUTHORIZATION'] = f"Bearer {response.json()['access']}"

    def test_catalog_barcode_lookup_finds_only_matching_variant(self):
        product_a = Product.objects.create(business=self.business, name='Luminous Serum')
        product_b = Product.objects.create(business=self.business, name='Glow Mist')
        ProductVariant.objects.create(
            business=self.business,
            product=product_a,
            name='30 ml',
            sku='NB-SERUM-030',
            barcode='NB-SCAN-001',
            price='18500.00',
            unit_cost='6000.00',
        )
        ProductVariant.objects.create(
            business=self.business,
            product=product_b,
            name='120 ml',
            sku='NB-MIST-120',
            barcode='NB-SCAN-002',
            price='28000.00',
            unit_cost='9000.00',
        )

        self.authenticate()
        response = self.client.get('/api/v1/catalog/products/?barcode=nb-scan-001')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['count'], 1)
        self.assertEqual(payload['results'][0]['name'], 'Luminous Serum')
        self.assertEqual(payload['results'][0]['variants'][0]['barcode'], 'NB-SCAN-001')

    def test_customer_creation_is_business_scoped_and_rejects_duplicates(self):
        self.authenticate()
        create_response = self.client.post(
            '/api/v1/customers/',
            {'name': 'New Business Customer', 'email': 'new@example.com', 'phone': '08030000000', 'notes': 'VIP guest'},
            content_type='application/json',
        )
        self.assertEqual(create_response.status_code, 201)
        payload = create_response.json()
        self.assertEqual(payload['name'], 'New Business Customer')
        self.assertEqual(payload['phone'], '08030000000')

        duplicate_response = self.client.post(
            '/api/v1/customers/',
            {'name': 'New Business Customer', 'phone': '08039999999'},
            content_type='application/json',
        )
        self.assertEqual(duplicate_response.status_code, 400)
        self.assertIn('already exists', duplicate_response.json()['detail'])

    def test_mobile_customer_list_is_authenticated_and_business_scoped(self):
        Customer.objects.create(business=self.business, name='Current Business Customer', phone='08030000000')
        other_business = Business.objects.create(name='Other Phase Nine Business')
        Customer.objects.create(business=other_business, name='Other Business Customer', phone='08040000000')

        unauthenticated = self.client.get('/api/v1/customers/')
        self.assertEqual(unauthenticated.status_code, 401)
        self.authenticate()
        response = self.client.get('/api/v1/customers/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['name'], 'Current Business Customer')
        self.assertEqual(self.client.get('/api/v1/customers/').json()['results'][0]['phone'], '08030000000')


class PhaseTenWorkspaceApiTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Phase Ten Workspace')
        self.owner = get_user_model().objects.create_user(username='workspace-owner', password='secure-pass-123')
        self.staff = get_user_model().objects.create_user(username='workspace-staff', password='secure-pass-123')
        Membership.objects.create(user=self.owner, business=self.business, role=Membership.OWNER)
        Membership.objects.create(user=self.staff, business=self.business, role=Membership.STAFF)
        self.client = Client()

    def authenticate(self, user):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': user.username, 'password': 'secure-pass-123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.defaults['HTTP_AUTHORIZATION'] = f"Bearer {response.json()['access']}"

    def test_owner_can_add_existing_user_as_staff_only(self):
        new_user = get_user_model().objects.create_user(username='new-team-member', password='secure-pass-123')
        self.authenticate(self.owner)

        self.assertEqual(self.client.get('/api/v1/staff/members/').json()['count'], 2)
        created = self.client.post(
            '/api/v1/staff/members/',
            {'username': new_user.username},
            content_type='application/json',
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(created.json()['role'], Membership.STAFF)

        duplicate = self.client.post(
            '/api/v1/staff/members/',
            {'username': new_user.username},
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 409)

    def test_staff_cannot_manage_members_and_unknown_user_is_not_linked(self):
        self.authenticate(self.staff)
        self.assertEqual(self.client.get('/api/v1/staff/members/').status_code, 403)
        self.assertEqual(
            self.client.post(
                '/api/v1/staff/members/',
                {'username': 'not-registered'},
                content_type='application/json',
            ).status_code,
            403,
        )

        self.authenticate(self.owner)
        missing = self.client.post(
            '/api/v1/staff/members/',
            {'username': 'not-registered'},
            content_type='application/json',
        )
        self.assertEqual(missing.status_code, 404)

    def test_business_name_update_is_validated_and_audited(self):
        self.authenticate(self.owner)
        updated = self.client.patch(
            '/api/v1/business/profile/',
            {'name': '  Updated Workspace  '},
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()['name'], 'Updated Workspace')
        self.assertTrue(AuditEvent.objects.filter(
            business=self.business,
            event='business.profile_updated',
            actor=self.owner,
        ).exists())

        invalid = self.client.patch(
            '/api/v1/business/profile/',
            {'name': '   '},
            content_type='application/json',
        )
        self.assertEqual(invalid.status_code, 400)

    def test_staff_cannot_update_business_name(self):
        self.authenticate(self.staff)
        response = self.client.patch(
            '/api/v1/business/profile/',
            {'name': 'Not Allowed'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.business.refresh_from_db()
        self.assertEqual(self.business.name, 'Phase Ten Workspace')

    def test_calendar_report_uses_business_data_and_preserves_legacy_summary(self):
        from calendar import monthrange
        from django.utils import timezone

        today = timezone.localdate()
        product = Product.objects.create(business=self.business, name='Live report product')
        variant = ProductVariant.objects.create(
            business=self.business,
            product=product,
            sku='REPORT-SKU',
            price='50.00',
            unit_cost='15.00',
            reorder_point=5,
        )
        location = StockLocation.objects.create(business=self.business, name='Report location')
        supplier = Supplier.objects.create(business=self.business, name='Report supplier')
        order = PurchaseOrder.objects.create(
            business=self.business,
            supplier=supplier,
            location=location,
            order_number='REPORT-PO',
            created_by=self.owner,
        )
        order_line = PurchaseOrderLine.objects.create(
            purchase_order=order,
            variant=variant,
            quantity_ordered=2,
            quantity_received=2,
            unit_cost='15.00',
        )
        batch = Batch.objects.create(
            business=self.business,
            variant=variant,
            location=location,
            batch_number='REPORT-BATCH',
            quantity_on_hand=2,
            unit_cost='15.00',
        )
        StockMovement.objects.create(
            business=self.business,
            variant=variant,
            location=location,
            batch=batch,
            purchase_order_line=order_line,
            actor=self.owner,
            kind=StockMovement.RECEIPT,
            quantity_delta=2,
            unit_cost='15.00',
            reason='Report fixture receipt',
            idempotency_key='report-fixture-receipt',
        )
        sale = Sale.objects.create(
            business=self.business,
            location=location,
            invoice_number='REPORT-SALE',
            status=Sale.PAID,
            total='100.00',
            paid_amount='100.00',
            created_by=self.owner,
        )
        SaleLine.objects.create(
            sale=sale,
            variant=variant,
            quantity=2,
            unit_price='50.00',
            line_total='100.00',
        )
        Payment.objects.create(
            sale=sale,
            method=Payment.REFUND,
            amount='10.00',
            status='refunded',
            idempotency_key='report-fixture-refund',
        )
        Expense.objects.create(
            business=self.business,
            title='Report fixture expense',
            amount='5.00',
            expense_date=today,
            created_by=self.owner,
        )

        self.authenticate(self.owner)
        response = self.client.get('/api/v1/reports/summary/?period=month')
        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertEqual(payload['sales_total'], '90.00')
        self.assertEqual(payload['order_count'], 1)
        self.assertEqual(payload['average_order'], '90.00')
        self.assertEqual(payload['units_sold'], 2)
        self.assertEqual(payload['purchase_total'], '30.00')
        self.assertEqual(payload['expense_total'], '5.00')
        self.assertEqual(payload['net'], '55.00')
        self.assertEqual(payload['low_stock'], 1)
        self.assertEqual(payload['start_date'], today.replace(day=1).isoformat())
        self.assertEqual(len(payload['chart']['values']), monthrange(today.year, today.month)[1])

        legacy = self.client.get('/api/v1/reports/summary/')
        self.assertEqual(legacy.status_code, 200)
        self.assertEqual(legacy.json()['sales_total'], '100.00')
        self.assertEqual(legacy.json()['purchase_total'], '30.00')

    def test_report_period_is_validated(self):
        self.authenticate(self.owner)
        response = self.client.get('/api/v1/reports/summary/?period=quarter')
        self.assertEqual(response.status_code, 400)
