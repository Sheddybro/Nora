from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower
from uuid import uuid4
from .upload_validators import validate_product_image


def product_image_upload_to(instance, filename):
   extension = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}.get(getattr(instance.image.file, "image_format", ""), "img")
   return f'products/{instance.business_id}/{instance.product_id}/{uuid4().hex}.{extension}'


class Business(models.Model):
 name=models.CharField(max_length=160,unique=True)
 created_at=models.DateTimeField(auto_now_add=True)
 def __str__(self): return self.name
class Membership(models.Model):
 OWNER='owner';STAFF='staff'
 ROLE_CHOICES=[(OWNER,'Owner'),(STAFF,'Staff')]
 business=models.ForeignKey(Business,on_delete=models.PROTECT,related_name='memberships')
 user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='business_memberships')
 role=models.CharField(max_length=10,choices=ROLE_CHOICES,default=STAFF)
 permissions=models.JSONField(default=list,blank=True)
 class Meta:
  constraints=[models.UniqueConstraint(fields=['business','user'],name='unique_business_membership')]


class Category(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='categories')
 name=models.CharField(max_length=120)
 is_active=models.BooleanField(default=True)
 created_at=models.DateTimeField(auto_now_add=True)

 class Meta:
    ordering=['name','id']
    constraints=[models.UniqueConstraint(fields=['business','name'],name='unique_business_category_name')]

 def __str__(self): return self.name


class Product(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='products')
 category=models.ForeignKey(Category,on_delete=models.PROTECT,related_name='products',null=True,blank=True)
 name=models.CharField(max_length=180)
 description=models.TextField(blank=True)
 is_active=models.BooleanField(default=True)
 created_at=models.DateTimeField(auto_now_add=True)
 updated_at=models.DateTimeField(auto_now=True)

 class Meta:
    ordering=['name','id']
    indexes=[models.Index(fields=['business','is_active'],name='product_business_active_idx')]

 def __str__(self): return self.name


class ProductVariant(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='product_variants')
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='variants')
 name=models.CharField(max_length=120,blank=True)
 sku=models.CharField(max_length=80)
 barcode=models.CharField(max_length=80,blank=True)
 price=models.DecimalField(max_digits=12,decimal_places=2)
 unit_cost=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
 reorder_point=models.PositiveIntegerField(default=0)
 is_active=models.BooleanField(default=True)

 class Meta:
     ordering=['sku','id']
     constraints=[models.UniqueConstraint(F('business'),Lower('sku'),name='unique_business_variant_sku_ci'),models.UniqueConstraint(F('business'),Lower('barcode'),condition=~Q(barcode=''),name='unique_business_variant_barcode_ci'),models.CheckConstraint(condition=models.Q(price__gte=0),name='variant_price_nonnegative'),models.CheckConstraint(condition=models.Q(unit_cost__gte=0)|models.Q(unit_cost__isnull=True),name='variant_cost_nonnegative')]

 def __str__(self): return self.sku


class ProductImage(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='product_images')
 product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name='images')
 image=models.ImageField(upload_to=product_image_upload_to,blank=True,validators=[validate_product_image])
 image_url=models.URLField(max_length=1000,blank=True)
 alt_text=models.CharField(max_length=240)
 position=models.PositiveSmallIntegerField(default=0)
 is_primary=models.BooleanField(default=False)

 class Meta:
    ordering=['position','id']
    constraints=[models.UniqueConstraint(fields=['product'],condition=Q(is_primary=True),name='unique_primary_product_image')]


class StockLocation(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='stock_locations')
 name=models.CharField(max_length=120)
 is_active=models.BooleanField(default=True)

 class Meta:
    ordering=['name','id']
    constraints=[models.UniqueConstraint(fields=['business','name'],name='unique_business_stock_location')]

 def __str__(self): return self.name


class Batch(models.Model):
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='inventory_batches')
 variant=models.ForeignKey(ProductVariant,on_delete=models.PROTECT,related_name='batches')
 location=models.ForeignKey(StockLocation,on_delete=models.PROTECT,related_name='batches')
 batch_number=models.CharField(max_length=100)
 expiry_date=models.DateField(null=True,blank=True)
 quantity_on_hand=models.PositiveIntegerField(default=0)
 unit_cost=models.DecimalField(max_digits=12,decimal_places=2)
 created_at=models.DateTimeField(auto_now_add=True)

 class Meta:
    ordering=['expiry_date','batch_number','id']
    constraints=[models.UniqueConstraint(fields=['business','variant','location','batch_number'],name='unique_inventory_batch'),models.CheckConstraint(condition=models.Q(unit_cost__gte=0),name='batch_cost_nonnegative')]
    indexes=[models.Index(fields=['business','location','expiry_date'],name='batch_business_expiry_idx')]

 def __str__(self): return f'{self.batch_number} · {self.variant.sku}'


class StockMovement(models.Model):
 RECEIPT='receipt';ADJUSTMENT='adjustment'
 KIND_CHOICES=[(RECEIPT,'Receipt'),(ADJUSTMENT,'Adjustment')]
 business=models.ForeignKey(Business,on_delete=models.CASCADE,related_name='stock_movements')
 variant=models.ForeignKey(ProductVariant,on_delete=models.PROTECT,related_name='stock_movements')
 location=models.ForeignKey(StockLocation,on_delete=models.PROTECT,related_name='stock_movements')
 batch=models.ForeignKey(Batch,on_delete=models.PROTECT,related_name='movements')
 actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,related_name='stock_movements')
 kind=models.CharField(max_length=16,choices=KIND_CHOICES)
 quantity_delta=models.IntegerField()
 unit_cost=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
 reason=models.CharField(max_length=240)
 idempotency_key=models.CharField(max_length=100)
 created_at=models.DateTimeField(auto_now_add=True)

 class Meta:
    ordering=['-created_at','-id']
    constraints=[models.UniqueConstraint(fields=['business','idempotency_key'],name='unique_business_stock_idempotency'),models.CheckConstraint(condition=~models.Q(quantity_delta=0),name='movement_quantity_nonzero')]
    indexes=[models.Index(fields=['business','created_at'],name='movement_business_date_idx')]
