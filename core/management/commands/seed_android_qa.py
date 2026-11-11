"""Disposable CI-only business fixtures. Refuses to run outside explicit QA mode."""
import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Batch, Business, Category, Membership, Product, ProductVariant, StockLocation


class Command(BaseCommand):
    help = "Seed disposable Android emulator test accounts; never production."

    def handle(self, *args, **kwargs):
        database = settings.DATABASES["default"]
        name = str(database.get("NAME", ""))
        if (
            os.environ.get("NORRIS_QA_ONLY") != "1"
            or os.environ.get("DJANGO_SETTINGS_MODULE") != "config.android_qa_settings"
            or database.get("ENGINE") != "django.db.backends.sqlite3"
            or not name.startswith("/tmp/norris-android-qa-")
            or Path(name).resolve().parent != Path("/tmp")
        ):
            raise CommandError("Refusing to seed data outside the isolated /tmp Android QA database.")
        password = os.environ.get("NORRIS_QA_PASSWORD", "")
        if len(password) < 16:
            raise CommandError("NORRIS_QA_PASSWORD must have at least 16 characters.")

        with transaction.atomic():
            business = Business.objects.create(name="Norris Android QA Workspace")
            owner = get_user_model().objects.create_user(username="android.qa.owner", password=password)
            staff = get_user_model().objects.create_user(username="android.qa.staff", password=password)
            Membership.objects.create(business=business, user=owner, role=Membership.OWNER)
            Membership.objects.create(business=business, user=staff, role=Membership.STAFF)
            category = Category.objects.create(business=business, name="QA Skincare")
            product = Product.objects.create(business=business, category=category, name="QA Rose Serum")
            variant = ProductVariant.objects.create(
                business=business, product=product, name="Standard", sku="QA-ROSE-01",
                price="250.00", unit_cost="80.00", reorder_point=2,
            )
            location = StockLocation.objects.create(business=business, name="QA Front Counter")
            Batch.objects.create(
                business=business, variant=variant, location=location,
                batch_number="QA-BATCH-01", quantity_on_hand=10, unit_cost="80.00",
            )
        self.stdout.write(self.style.SUCCESS("Seeded isolated QA owner/staff and ten test units."))
