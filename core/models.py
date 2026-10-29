from django.conf import settings
from django.db import models
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
 class Meta:
  constraints=[models.UniqueConstraint(fields=['business','user'],name='unique_business_membership')]
