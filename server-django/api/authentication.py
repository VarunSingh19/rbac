from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class CustomTokenAuthentication(BaseAuthentication):
    """
    Custom token authentication that handles both session cookies and authorization headers
    """
    
    def authenticate(self, request):
        # Try to get token from Authorization header first
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            source = 'header'
        else:
            # Try to get token from cookie
            token_key = request.COOKIES.get('sessionId')
            source = 'cookie'
        print(f"[AUTH DEBUG] Token from {source}: {token_key}")

        if not token_key:
            print("[AUTH DEBUG] No token found in header or cookie.")
            return None

        try:
            token = Token.objects.select_related('user').get(key=token_key)
            print(f"[AUTH DEBUG] Token found: {token.key}, user: {token.user}")
        except Token.DoesNotExist:
            print(f"[AUTH DEBUG] Token {token_key} not found in Token table.")
            raise AuthenticationFailed('Invalid token')

        if not token.user.is_active:
            print(f"[AUTH DEBUG] User {token.user} is inactive.")
            raise AuthenticationFailed('User inactive or deleted')

        # Update last activity if we have session tracking
        from .utils import ActivityLogger
        ActivityLogger.update_session_activity(token_key)

        return (token.user, token)

    
    def authenticate_header(self, request):
        return 'Token'
