from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from .models import ActivityLog
from .utils import get_client_ip, get_user_agent
import json

class ActivityLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API activities
    """
    
    def process_request(self, request):
        # Store request start time
        request._activity_start_time = timezone.now()
        return None
    
    def process_response(self, request, response):
        # Log successful API calls
        if hasattr(request, 'user') and request.user.is_authenticated:
            if 200 <= response.status_code < 300:
                try:
                    # Only log certain endpoints to avoid spam
                    path = request.path
                    if any(endpoint in path for endpoint in ['/api/auth/', '/api/users/', '/api/assets/', '/api/reports/']):
                        ActivityLog.objects.create(
                            user=request.user,
                            activity_type='api',
                            action=f"{request.method} {path}",
                            resource_type='api_call',
                            details={
                                'method': request.method,
                                'path': path,
                                'status_code': response.status_code,
                                'user_agent': get_user_agent(request)
                            },
                            ip_address=get_client_ip(request),
                            user_agent=get_user_agent(request)
                        )
                except Exception as e:
                    # Don't let logging errors break the response
                    print(f"Error in activity logging middleware: {e}")
        
        return response
