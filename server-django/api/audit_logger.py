from django.db import models
from django.utils import timezone
from .models import AuditTrail

class AuditLogger:
    @staticmethod
    def log(audit_data):
        """Log audit trail entry"""
        try:
            AuditTrail.objects.create(
                user_id=audit_data.get('userId'),
                action=audit_data['action'],
                resource=audit_data['resource'],
                resource_id=audit_data.get('resourceId'),
                details=audit_data.get('details', {}),
                ip_address=audit_data.get('ipAddress', 'unknown'),
                user_agent=audit_data.get('userAgent', 'unknown')
            )
        except Exception as e:
            print(f"Failed to log audit trail: {e}")
    
    @staticmethod
    def get_audit_trail(filters=None):
        """Get audit trail with filters"""
        try:
            query = AuditTrail.objects.all()
            
            if filters:
                if filters.get('userId'):
                    query = query.filter(user_id=filters['userId'])
                if filters.get('resource'):
                    query = query.filter(resource=filters['resource'])
                if filters.get('action'):
                    query = query.filter(action=filters['action'])
                
                query = query.order_by('-timestamp')
                
                if filters.get('limit'):
                    query = query[:filters['limit']]
                if filters.get('offset'):
                    query = query[filters['offset']:]
            
            return list(query)
        except Exception as e:
            print(f"Failed to retrieve audit trail: {e}")
            return []

def audit_middleware(action, resource):
    """Audit middleware decorator"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            response = view_func(request, *args, **kwargs)
            
            # Log successful operations
            if 200 <= response.status_code < 300:
                AuditLogger.log({
                    'userId': getattr(request.user, 'id', None),
                    'action': action,
                    'resource': resource,
                    'resourceId': kwargs.get('id'),
                    'details': {
                        'method': request.method,
                        'url': request.get_full_path(),
                        'body': getattr(request, 'data', {}),
                        'statusCode': response.status_code
                    },
                    'ipAddress': get_client_ip(request),
                    'userAgent': request.META.get('HTTP_USER_AGENT', 'unknown')
                })
            
            return response
        return wrapper
    return decorator

def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
