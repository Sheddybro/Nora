from django.test import TestCase,Client
from django.contrib.auth import get_user_model
from .models import Business,Membership
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
         self.assertContains(response,'DEMO DATA')
         if path == '/pos/':
          self.assertContains(response,'Your basket is empty')
          self.assertContains(response,'No sale, payment or stock update will be posted.')
