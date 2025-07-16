from .models import ActivityLog, UserSession, AssetActivityLog
from django.utils import timezone
import uuid

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT', '')

class ActivityLogger:
    @staticmethod
    def log_activity(user, activity_type, action, resource_type=None, resource_id=None, 
                    resource_name=None, details=None, ip_address=None, user_agent=None, session_id=None):
        try:
            ActivityLog.objects.create(
                user=user,
                activity_type=activity_type,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent or '',
                session_id=session_id
            )
        except Exception as e:
            print(f"Error logging activity: {e}")
    
    @staticmethod
    def log_user_session(user, session_id, ip_address=None, user_agent=None):
        try:
            UserSession.objects.create(
                user=user,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent or ''
            )
        except Exception as e:
            print(f"Error logging user session: {e}")
    
    @staticmethod
    def log_user_logout(session_id):
        try:
            UserSession.objects.filter(session_id=session_id).update(
                logout_time=timezone.now(),
                is_active=False
            )
        except Exception as e:
            print(f"Error logging user logout: {e}")
    
    @staticmethod
    def update_session_activity(session_id):
        try:
            UserSession.objects.filter(session_id=session_id).update(
                last_activity=timezone.now()
            )
        except Exception as e:
            print(f"Error updating session activity: {e}")
    
    @staticmethod
    def log_asset_activity(asset, user, activity_type, action, old_values=None, new_values=None, details=None):
        try:
            AssetActivityLog.objects.create(
                asset=asset,
                user=user,
                activity_type=activity_type,
                action=action,
                old_values=old_values or {},
                new_values=new_values or {},
                details=details or {}
            )
        except Exception as e:
            print(f"Error logging asset activity: {e}")
