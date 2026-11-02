from pathlib import Path
from datetime import timedelta
import os
import sys
import environ
BASE_DIR=Path(__file__).resolve().parent.parent
env=environ.Env(DJANGO_DEBUG=(bool,False))
TESTING='test' in sys.argv
environ.Env.read_env(BASE_DIR/'.env')
SECRET_KEY=env('DJANGO_SECRET_KEY',default='insecure-local-development-only-change-me')
DEBUG=env('DJANGO_DEBUG')
if not DEBUG and SECRET_KEY=='insecure-local-development-only-change-me':
 raise RuntimeError('Set DJANGO_SECRET_KEY before production deployment')
ALLOWED_HOSTS=env.list('DJANGO_ALLOWED_HOSTS',default=['localhost','127.0.0.1','0.0.0.0'])
CSRF_TRUSTED_ORIGINS=env.list('DJANGO_CSRF_TRUSTED_ORIGINS',default=['http://localhost:8000','http://127.0.0.1:8000','http://0.0.0.0:8000'])
INSTALLED_APPS=['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','rest_framework','rest_framework_simplejwt.token_blacklist','core']
MIDDLEWARE=['django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF='config.urls'
TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[BASE_DIR/'templates'],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.debug','django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION='config.wsgi.application'
DATABASES={'default':env.db('DATABASE_URL',default='sqlite:///db.sqlite3')}
AUTH_PASSWORD_VALIDATORS=[{'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},{'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator'},{'NAME':'django.contrib.auth.password_validation.CommonPasswordValidator'},{'NAME':'django.contrib.auth.password_validation.NumericPasswordValidator'}]
LANGUAGE_CODE='en-us';TIME_ZONE='Africa/Lagos';USE_I18N=True;USE_TZ=True
STATIC_URL='static/';STATICFILES_DIRS=[BASE_DIR/'static'];STATIC_ROOT=BASE_DIR/'staticfiles'
MEDIA_URL=env('DJANGO_MEDIA_URL',default='/media/')
MEDIA_ROOT=env('DJANGO_MEDIA_ROOT',default=str(BASE_DIR/'media'))
DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
LOGIN_URL='login';LOGIN_REDIRECT_URL='dashboard';LOGOUT_REDIRECT_URL='login'
SESSION_COOKIE_HTTPONLY=True;CSRF_COOKIE_HTTPONLY=True
if not DEBUG:
 SECURE_SSL_REDIRECT=True
 SESSION_COOKIE_SECURE=True;CSRF_COOKIE_SECURE=True
 SECURE_HSTS_SECONDS=31536000;SECURE_HSTS_INCLUDE_SUBDOMAINS=True
 SECURE_CONTENT_TYPE_NOSNIFF=True

REST_FRAMEWORK={
 'DEFAULT_AUTHENTICATION_CLASSES':['core.permissions.MembershipJWTAuthentication','core.permissions.MembershipSessionAuthentication'],
 'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticated'],
 'DEFAULT_THROTTLE_RATES':{'anon':'60/hour','user':'1200/hour','auth_login':'100/minute' if TESTING else '10/minute'},
 'EXCEPTION_HANDLER':'core.api_errors.api_exception_handler',
}
SIMPLE_JWT={
 'ALGORITHM':'HS256',
 'SIGNING_KEY':SECRET_KEY,
 'ACCESS_TOKEN_LIFETIME':timedelta(minutes=5),
 'REFRESH_TOKEN_LIFETIME':timedelta(days=14),
 'ROTATE_REFRESH_TOKENS':True,
 'BLACKLIST_AFTER_ROTATION':True,
 'UPDATE_LAST_LOGIN':False,
 'AUTH_HEADER_TYPES':('Bearer',),
 'TOKEN_OBTAIN_SERIALIZER':'core.api_serializers.MembershipTokenObtainPairSerializer',
}
EMAIL_BACKEND=env('DJANGO_EMAIL_BACKEND',default='django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL=env('DJANGO_DEFAULT_FROM_EMAIL',default='NorrisBeauty <no-reply@norrisbeauty.local>')
PASSWORD_RESET_TIMEOUT=env.int('DJANGO_PASSWORD_RESET_TIMEOUT',default=3600)
