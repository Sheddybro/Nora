from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
urlpatterns=[
 path('',views.dashboard,name='dashboard'),
 path('health/',views.health,name='health'),
 path('api/v1/health/',views.api_health,name='api-health'),
 path('login/',auth_views.LoginView.as_view(template_name='registration/login.html'),name='login'),
 path('logout/',auth_views.LogoutView.as_view(),name='logout'),
 path('<slug:page_key>/',views.workspace_page,name='workspace-page'),
]
