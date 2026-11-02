from django.test import TestCase,Client,override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image
import tempfile
from .models import Batch, Business, Category, Membership, Product, ProductImage, ProductVariant, StockLocation, StockMovement
class FoundationTests(TestCase):
 def test_login_accepts_valid_credentials(self):
    user=get_user_model().objects.create_user(username='login-user',password='secure-pass-123')
    response=self.client.post('/login/',{'username':user.username,'password':'secure-pass-123'})
    self.assertRedirects(response,'/')
 def test_login_rejects_invalid_credentials(self):
    response=self.client.post('/login/',{'username':'unknown','password':'incorrect'})
    self.assertEqual(response.status_code,200)
    self.assertContains(response,'Please check your username and password.')
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
 def test_staff_dashboard(self):
  user=get_user_model().objects.create_user(username='staff',password='secure-pass-123')
  business=Business.objects.create(name='NorrisBeauty')
  Membership.objects.create(user=user,business=business,role=Membership.STAFF)
  self.client.force_login(user)
  self.assertContains(self.client.get('/'),'STAFF DASHBOARD')
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

 def test_phase_two_workspace_screens_render_demo_states(self):
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
         if path in ('/products/','/inventory/'):
          self.assertNotContains(response,'DEMO DATA')
          self.assertContains(response,'Live data')
         else:
          self.assertContains(response,'DEMO DATA')
         if path == '/pos/':
          self.assertContains(response,'Your basket is empty')
          self.assertContains(response,'No sale, payment or stock update will be posted.')

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
    self.client.force_login(self.staff)
    edited=self.client.patch(f'/api/v1/catalog/products/{self.product.pk}/',{'name':'Unauthorized'},content_type='application/json')
    deactivated=self.client.delete(f'/api/v1/catalog/categories/{self.category.pk}/')
    self.assertEqual(edited.status_code,403)
    self.assertEqual(deactivated.status_code,403)

 def test_duplicate_sku_and_category_return_validation_errors(self):
    self.authenticate(self.owner)
    product=self.client.post('/api/v1/catalog/products/',{
     'name':'Duplicate SKU product','variants':[{'name':'Standard','sku':'NB-SK-104','price':'50.00'}],
    },content_type='application/json')
    category=self.client.post('/api/v1/catalog/categories/',{'name':'skincare'},content_type='application/json')
    self.assertEqual(product.status_code,400)
    self.assertEqual(category.status_code,400)

 def test_duplicate_barcode_is_rejected_case_insensitively(self):
    self.authenticate(self.owner)
    self.variant.barcode='NB-CODE-1';self.variant.save(update_fields=['barcode'])
    response=self.client.post('/api/v1/catalog/products/',{
     'name':'Duplicate barcode product','variants':[{'name':'Standard','sku':'NEW-SKU','barcode':'nb-code-1','price':'50.00'}],
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
    self.assertContains(catalog,'Silk Repair Mask')
    self.assertContains(catalog,'NB-HC-087')
    self.assertNotContains(catalog,'DEMO DATA')
    self.assertEqual(inventory.status_code,200)
    self.assertContains(inventory,'Out of stock')
    self.assertContains(inventory,'₦0.00')
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
    payload={'name':'CSRF Product','variants':[{'name':'Standard','sku':'CSRF-001','price':'50.00'}]}
    rejected=client.post('/api/v1/catalog/products/',payload,content_type='application/json')
    self.assertEqual(rejected.status_code,403)
    accepted=client.post('/api/v1/catalog/products/',payload,content_type='application/json',HTTP_X_CSRFTOKEN=token)
    self.assertEqual(accepted.status_code,201,accepted.content)
    self.assertTrue(Product.objects.filter(business=business,name='CSRF Product').exists())
