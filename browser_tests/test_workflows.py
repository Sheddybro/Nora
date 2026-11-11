"""Real Chromium journeys against Django's disposable live-test database.

Run with: python manage.py test browser_tests --noinput
Requires playwright Python package and the Chromium browser installation.
Never point these tests at the production PythonAnywhere site.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from playwright.sync_api import sync_playwright, expect

from core.models import Batch, Business, Category, Membership, Product, ProductVariant, Sale, StockLocation


class WorkspaceBrowserJourneys(StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.browser.close()
            cls.playwright.stop()
        finally:
            super().tearDownClass()

    def setUp(self):
        self.business = Business.objects.create(name="Browser QA Business")
        self.owner = get_user_model().objects.create_user(
            username="browser-owner", password="browser-password-123"
        )
        self.staff = get_user_model().objects.create_user(
            username="browser-staff", password="browser-password-123"
        )
        Membership.objects.create(user=self.owner, business=self.business, role=Membership.OWNER)
        Membership.objects.create(user=self.staff, business=self.business, role=Membership.STAFF)
        self.category = Category.objects.create(business=self.business, name="Browser Skincare")
        self.product = Product.objects.create(
            business=self.business, category=self.category, name="Browser Serum"
        )
        self.variant = ProductVariant.objects.create(
            business=self.business, product=self.product,
            name="Standard", sku="BROWSER-001",
            price=Decimal("250.00"), unit_cost=Decimal("80.00"),
        )
        self.location = StockLocation.objects.create(
            business=self.business, name="Browser Checkout Counter"
        )
        self.batch = Batch.objects.create(
            business=self.business, variant=self.variant, location=self.location,
            batch_number="BROWSER-LOT", quantity_on_hand=5,
            unit_cost=Decimal("80.00"),
        )
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.page.set_default_timeout(12000)

    def tearDown(self):
        self.context.close()

    def login(self, username):
        self.page.goto(self.live_server_url + "/login/", wait_until="domcontentloaded")
        self.page.locator("#id_username").fill(username)
        self.page.locator("#id_password").fill("browser-password-123")
        self.page.get_by_role("button", name="Sign in").click()
        expect(self.page.locator(".workspace")).to_be_visible()

    def test_owner_login_and_logout_through_browser(self):
        self.page.goto(self.live_server_url + "/", wait_until="domcontentloaded")
        expect(self.page).to_have_url(self.live_server_url + "/login/?next=/")
        self.login("browser-owner")
        expect(self.page.locator('.workspace[data-role="owner"]')).to_be_visible()
        expect(self.page.locator('a[href="/staff/"].workspace-nav-link')).to_be_visible()
        self.page.get_by_role("button", name="Sign out").click()
        expect(self.page.locator("#id_username")).to_be_visible()
        self.page.goto(self.live_server_url + "/settings/")
        expect(self.page.locator("#id_username")).to_be_visible()

    def test_staff_navigation_and_direct_url_permissions(self):
        self.login("browser-staff")
        expect(self.page.locator('.workspace[data-role="staff"]')).to_be_visible()
        for path in ("pos", "inventory", "sales", "products", "customers"):
            self.page.goto(self.live_server_url + "/" + path + "/", wait_until="domcontentloaded")
            expect(self.page.locator(f'.workspace[data-page="{path}"]')).to_be_visible()
        for path in ("staff", "settings", "purchases", "reports"):
            self.page.goto(self.live_server_url + "/" + path + "/", wait_until="domcontentloaded")
            expect(self.page.locator("body")).to_contain_text("Owner access is required")
            self.assertNotEqual(self.page.locator(".workspace").count(), 1)
        self.page.goto(self.live_server_url + "/inventory/")
        expect(self.page.locator('[data-open-dialog="stock"]')).to_have_count(0)

    def test_owner_creates_category_using_real_dialog(self):
        self.login("browser-owner")
        self.page.goto(self.live_server_url + "/products/", wait_until="domcontentloaded")
        self.page.locator('.module-heading [data-open-dialog="category"]').click()
        dialog = self.page.locator('dialog[data-dialog="category"]')
        expect(dialog).to_be_visible()
        dialog.locator('input[name="name"]').fill("Browser New Category")
        with self.page.expect_response(
            lambda response: response.url.endswith("/api/v1/catalog/categories/") and response.request.method == "POST"
        ) as posted:
            dialog.get_by_role("button", name="Save category").click()
        self.assertEqual(posted.value.status, 201, posted.value.text())
        expect(dialog).not_to_be_visible()
        self.assertTrue(Category.objects.filter(
            business=self.business, name="Browser New Category"
        ).exists())

    def test_owner_checkout_updates_shared_backend_stock_and_sales(self):
        self.login("browser-owner")
        self.page.goto(self.live_server_url + "/pos/", wait_until="domcontentloaded")
        location = self.page.locator("[data-pos-location]")
        expect(location.locator(f'option[value="{self.location.pk}"]')).to_have_count(1)
        location.select_option(str(self.location.pk))
        product = self.page.locator(".pos-product").filter(has_text="BROWSER-001")
        expect(product).to_be_visible()
        product.get_by_role("button", name="Add").click()
        expect(self.page.locator("[data-cart-count]")).to_have_text("1")
        with self.page.expect_response(
            lambda response: response.url.endswith("/api/v1/pos/checkout/") and response.request.method == "POST"
        ) as posted:
            self.page.locator("[data-checkout]").click()
        self.assertEqual(posted.value.status, 201, posted.value.text())
        expect(self.page.locator("[data-cart-count]")).to_have_text("0")
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.quantity_on_hand, 4)
        self.assertEqual(Sale.objects.filter(business=self.business).count(), 1)
        self.page.goto(self.live_server_url + "/sales/", wait_until="domcontentloaded")
        expect(self.page.locator("[data-table-body]")).to_contain_text("INV-")
