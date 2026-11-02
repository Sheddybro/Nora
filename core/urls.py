from django.urls import path
from django.urls import reverse_lazy
from django.contrib.auth import views as auth_views
from . import views
from . import api_views
urlpatterns=[
 path('',views.dashboard,name='dashboard'),
 path('health/',views.health,name='health'),
 path('api/v1/health/',views.api_health,name='api-health'),
 path('login/',auth_views.LoginView.as_view(template_name='registration/login.html'),name='login'),
 path('logout/',auth_views.LogoutView.as_view(),name='logout'),
 path('password-reset/',auth_views.PasswordResetView.as_view(template_name='registration/password_reset.html',email_template_name='registration/password_reset_email.txt',subject_template_name='registration/password_reset_subject.txt',success_url=reverse_lazy('password_reset_done')),name='password_reset'),
 path('password-reset/done/',auth_views.PasswordResetDoneView.as_view(template_name='registration/password_reset_done.html'),name='password_reset_done'),
 path('password-reset/confirm/<uidb64>/<token>/',auth_views.PasswordResetConfirmView.as_view(template_name='registration/password_reset_confirm.html',success_url=reverse_lazy('password_reset_complete')),name='password_reset_confirm'),
 path('password-reset/complete/',auth_views.PasswordResetCompleteView.as_view(template_name='registration/password_reset_complete.html'),name='password_reset_complete'),
 path('api/v1/auth/login/',api_views.mobile_login,name='api-auth-login'),
 path('api/v1/auth/refresh/',api_views.mobile_refresh,name='api-auth-refresh'),
 path('api/v1/auth/logout/',api_views.mobile_logout,name='api-auth-logout'),
 path('api/v1/auth/me/',api_views.mobile_me,name='api-auth-me'),
 path('api/v1/auth/permissions/',api_views.mobile_permissions,name='api-auth-permissions'),
 path('api/v1/auth/password/',api_views.change_password,name='api-auth-password'),
 path('api/v1/business/profile/',api_views.business_profile,name='api-business-profile'),
 path('api/v1/catalog/categories/',api_views.catalog_categories,name='api-catalog-categories'),
 path('api/v1/catalog/products/',api_views.catalog_products,name='api-catalog-products'),
 path('api/v1/catalog/products/<int:product_id>/',api_views.catalog_product_detail,name='api-catalog-product-detail'),
 path('api/v1/catalog/products/<int:product_id>/images/',api_views.catalog_product_images,name='api-catalog-product-images'),
 path('api/v1/catalog/products/<int:product_id>/images/<int:image_id>/',api_views.catalog_product_image_detail,name='api-catalog-product-image-detail'),
 path('api/v1/catalog/products/<int:product_id>/stock-history/',api_views.catalog_product_stock_history,name='api-catalog-product-stock-history'),
 path('api/v1/catalog/categories/<int:category_id>/',api_views.catalog_category_detail,name='api-catalog-category-detail'),
 path('api/v1/inventory/locations/',api_views.inventory_locations,name='api-inventory-locations'),
 path('api/v1/inventory/stock/',api_views.inventory_stock,name='api-inventory-stock'),
 path('api/v1/inventory/movements/',api_views.inventory_movements,name='api-inventory-movements'),
 path('<slug:page_key>/',views.workspace_page,name='workspace-page'),
]
