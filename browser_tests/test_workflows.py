"""Real Chromium journeys against Django's disposable live-test database.

Run with: python manage.py test browser_tests --noinput
Requires playwright Python package and the Chromium browser installation.
Never point these tests at the production PythonAnywhere site.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from playwright.sync_api import sync_playwright, expect

from core.models import (Batch, Business, Category, Membership, Payment, Product, ProductVariant, PurchaseOrder, Sale, StockLocation, Supplier, Transfer)
from core.sales_services import checkout_sale


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
        self.supplier = Supplier.objects.create(business=self.business, name="Browser Vendor")
        self.new_staff = get_user_model().objects.create_user(
            username="browser-new-staff", password="browser-password-123"
        )
        self.destination = StockLocation.objects.create(
            business=self.business, name="Browser Back Room"
        )
        self.context = self.browser.new_context(service_workers="block")
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
            response = self.page.goto(
                self.live_server_url + "/" + path + "/", wait_until="domcontentloaded"
            )
            self.assertIsNotNone(response)
            self.assertEqual(
                response.status, 200,
                f"Staff {path} unexpected status {response.status}; URL: {self.page.url}; "
                f"page: {self.page.locator('body').inner_text()[:500]}",
            )
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
        try:
            expect(location.locator(f'option[value="{self.location.pk}"]')).to_have_count(1, timeout=15000)
        except AssertionError as exc:
            error_text = self.page.locator("[data-page-error]").inner_text()
            response = self.page.request.get(self.live_server_url + "/api/v1/inventory/locations/")
            self.fail(
                f"POS location never loaded; page URL={self.page.url}; "
                f"page error={error_text!r}; locations API status={response.status}; "
                f"API body={response.text()[:800]!r}; original={exc}"
            )
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

    def test_owner_refund_dialog_restores_stock_and_reconciles_sale(self):
        sale, created = checkout_sale(
            business=self.business, actor=self.owner, location_id=self.location.pk,
            items=[{"variant": self.variant, "quantity": 2, "unit_price": "250.00"}],
            payment_method="cash", amount_paid="500.00",
            idempotency_key="browser-refund-original",
        )
        self.assertTrue(created)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.quantity_on_hand, 3)
        self.login("browser-owner")
        self.page.goto(self.live_server_url + "/sales/", wait_until="domcontentloaded")
        row = self.page.locator("[data-table-body] tr").filter(has_text=sale.invoice_number)
        expect(row).to_be_visible()
        row.get_by_role("button", name="Refund").click()
        dialog = self.page.locator('dialog[data-dialog="refund"]')
        expect(dialog).to_be_visible()
        dialog.locator('input[name="reason"]').fill("Browser test customer return")
        with self.page.expect_response(
            lambda response: response.url.endswith(f"/api/v1/sales/{sale.pk}/refund/")
            and response.request.method == "POST"
        ) as result:
            dialog.get_by_role("button", name="Record refund").click()
        self.assertEqual(result.value.status, 201)
        expect(dialog).not_to_be_visible()
        sale.refresh_from_db()
        self.batch.refresh_from_db()
        self.assertEqual(sale.status, Sale.REFUNDED)
        self.assertEqual(self.batch.quantity_on_hand, 5)
        self.assertEqual(sale.payments.filter(status="refunded").count(), 1)
        expect(row).to_contain_text("Refunded")

    def test_owner_creates_purchase_draft_with_real_form(self):
        self.login("browser-owner")
        self.page.goto(self.live_server_url + "/purchases/", wait_until="domcontentloaded")
        self.page.locator('.module-heading [data-open-dialog="purchase"]').click()
        dialog = self.page.locator('dialog[data-dialog="purchase"]')
        expect(dialog).to_be_visible()
        for key, pk in (
            ("supplier_id", self.supplier.pk),
            ("location_id", self.location.pk),
            ("variant_id", self.variant.pk),
        ):
            expect(dialog.locator(f'select[name="{key}"] option[value="{pk}"]')).to_have_count(1)
            dialog.locator(f'select[name="{key}"]').select_option(str(pk))
        dialog.locator('input[name="quantity_ordered"]').fill("3")
        dialog.locator('input[name="unit_cost"]').fill("80.00")
        with self.page.expect_response(
            lambda response: response.url.endswith("/api/v1/purchasing/orders/")
            and response.request.method == "POST"
        ) as result:
            dialog.get_by_role("button", name="Save draft order").click()
        self.assertEqual(result.value.status, 201)
        expect(dialog).not_to_be_visible()
        order = PurchaseOrder.objects.get(business=self.business)
        self.assertEqual(order.status, PurchaseOrder.DRAFT)
        self.assertEqual(order.lines.get().quantity_ordered, 3)
        expect(self.page.locator("[data-table-body]")).to_contain_text(order.order_number)

    def test_owner_adds_existing_staff_through_dialog(self):
        self.login("browser-owner")
        self.page.goto(self.live_server_url + "/staff/", wait_until="domcontentloaded")
        self.page.locator('.module-heading [data-open-dialog="staff"]').click()
        dialog = self.page.locator('dialog[data-dialog="staff"]')
        expect(dialog).to_be_visible()
        dialog.locator('input[name="username"]').fill(self.new_staff.username)
        with self.page.expect_response(
            lambda response: response.url.endswith("/api/v1/staff/members/")
            and response.request.method == "POST"
        ) as result:
            dialog.get_by_role("button", name="Add staff member").click()
        self.assertEqual(result.value.status, 201)
        expect(dialog).not_to_be_visible()
        membership = Membership.objects.get(user=self.new_staff, business=self.business)
        self.assertEqual(membership.role, Membership.STAFF)
        expect(self.page.locator("[data-table-body]")).to_contain_text(self.new_staff.username)

    def test_stock_transfer_via_authenticated_browser_api_preserves_total_stock(self):
        # There is no stock-transfer form in the current Django web UI.
        # Exercise the same authenticated, CSRF-protected API from the browser context.
        self.login("browser-owner")
        self.page.goto(self.live_server_url + "/inventory/", wait_until="domcontentloaded")
        result = self.page.evaluate(
            """async ({variantId, sourceId, destinationId}) => {
                const token = document.querySelector('[name=csrfmiddlewaretoken]').value;
                const response = await fetch('/api/v1/inventory/transfers/', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', 'X-CSRFToken': token},
                    body: JSON.stringify({
                        variant_id: variantId,
                        from_location_id: sourceId,
                        to_location_id: destinationId,
                        quantity: 2,
                        reason: 'Browser QA transfer',
                    }),
                });
                return {status: response.status, body: await response.json()};
            }""",
            {
                "variantId": self.variant.pk,
                "sourceId": self.location.pk,
                "destinationId": self.destination.pk,
            },
        )
        self.assertEqual(result["status"], 201, result)
        self.assertEqual(Transfer.objects.filter(business=self.business).count(), 1)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.quantity_on_hand, 3)
        self.assertEqual(
            sum(Batch.objects.filter(
                business=self.business, variant=self.variant
            ).values_list("quantity_on_hand", flat=True)),
            5,
        )
