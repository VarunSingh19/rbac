from django.db import models
from django.utils import timezone
from django.db.models import Q
from .models import ActivityLog, UserSession, AssetActivityLog, User, UserRelationship, UserAssignment
import json

class ActivityLogger:
    @staticmethod
    def log_activity(user, activity_type, action, resource_type=None, resource_id=None, 
                    resource_name=None, details=None, ip_address=None, user_agent=None, session_id=None):
        """Log general user activity"""
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
        """Log user session"""
        try:
            session, created = UserSession.objects.get_or_create(
                session_id=session_id,
                defaults={
                    'user': user,
                    'ip_address': ip_address,
                    'user_agent': user_agent or '',
                    'is_active': True
                }
            )
            if not created:
                session.user = user
                session.ip_address = ip_address
                session.user_agent = user_agent or ''
                session.is_active = True
                session.save()
        except Exception as e:
            print(f"Error logging user session: {e}")
    
    @staticmethod
    def update_session_activity(session_id):
        """Update session activity timestamp"""
        try:
            UserSession.objects.filter(session_id=session_id).update(
                last_activity=timezone.now()
            )
        except Exception as e:
            print(f"Error updating session activity: {e}")
    
    @staticmethod
    def log_user_logout(session_id):
        """Log user logout"""
        try:
            UserSession.objects.filter(session_id=session_id).update(
                logout_time=timezone.now(),
                is_active=False
            )
        except Exception as e:
            print(f"Error logging user logout: {e}")
    
    @staticmethod
    def log_asset_activity(asset, user, activity_type, action, old_values=None, new_values=None, details=None):
        """Log asset activity"""
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
    
    @staticmethod
    def get_activity_logs(viewer_user_id, viewer_role, start_date=None, end_date=None, 
                         user_id=None, activity_type=None, limit=50, offset=0):
        """Get activity logs with hierarchy filtering"""
        try:
            logs = ActivityLog.objects.select_related('user').all()
            
            # Apply role-based filtering
            if viewer_role != 'superadmin':
                subordinate_ids = ActivityLogger.get_subordinate_ids(viewer_user_id)
                if subordinate_ids:
                    logs = logs.filter(user_id__in=subordinate_ids)
                else:
                    logs = logs.filter(user_id=viewer_user_id)
            
            # Apply additional filters
            if start_date:
                logs = logs.filter(created_at__gte=start_date)
            if end_date:
                logs = logs.filter(created_at__lte=end_date)
            if user_id:
                logs = logs.filter(user_id=user_id)
            if activity_type:
                logs = logs.filter(activity_type=activity_type)
            
            logs = logs.order_by('-created_at')[offset:offset+limit]
            return logs
        except Exception as e:
            print(f"Error getting activity logs: {e}")
            return []
    
    @staticmethod
    def get_user_sessions(viewer_user_id, viewer_role, start_date=None, end_date=None,
                         user_id=None, is_active=None, limit=50, offset=0):
        """Get user sessions with hierarchy filtering"""
        try:
            sessions = UserSession.objects.select_related('user').all()
            
            # Apply role-based filtering
            if viewer_role != 'superadmin':
                subordinate_ids = ActivityLogger.get_subordinate_ids(viewer_user_id)
                if subordinate_ids:
                    sessions = sessions.filter(user_id__in=subordinate_ids)
                else:
                    sessions = sessions.filter(user_id=viewer_user_id)
            
            # Apply additional filters
            if start_date:
                sessions = sessions.filter(login_time__gte=start_date)
            if end_date:
                sessions = sessions.filter(login_time__lte=end_date)
            if user_id:
                sessions = sessions.filter(user_id=user_id)
            if is_active is not None:
                sessions = sessions.filter(is_active=is_active)
            
            sessions = sessions.order_by('-login_time')[offset:offset+limit]
            return sessions
        except Exception as e:
            print(f"Error getting user sessions: {e}")
            return []
    
    @staticmethod
    def get_asset_activity_logs(viewer_user_id, viewer_role, asset_id=None, start_date=None,
                               end_date=None, user_id=None, activity_type=None, limit=50, offset=0):
        """Get asset activity logs with hierarchy filtering"""
        try:
            logs = AssetActivityLog.objects.select_related('user', 'asset').all()
            
            # Apply role-based filtering
            if viewer_role != 'superadmin':
                subordinate_ids = ActivityLogger.get_subordinate_ids(viewer_user_id)
                if subordinate_ids:
                    logs = logs.filter(user_id__in=subordinate_ids)
                else:
                    logs = logs.filter(user_id=viewer_user_id)
            
            # Apply additional filters
            if asset_id:
                logs = logs.filter(asset_id=asset_id)
            if start_date:
                logs = logs.filter(created_at__gte=start_date)
            if end_date:
                logs = logs.filter(created_at__lte=end_date)
            if user_id:
                logs = logs.filter(user_id=user_id)
            if activity_type:
                logs = logs.filter(activity_type=activity_type)
            
            logs = logs.order_by('-created_at')[offset:offset+limit]
            return logs
        except Exception as e:
            print(f"Error getting asset activity logs: {e}")
            return []
    
    @staticmethod
    def get_subordinate_ids(user_id):
        """Helper method to get subordinate user IDs based on hierarchy"""
        try:
            # Get direct subordinates from relationships
            direct_subordinates = list(UserRelationship.objects.filter(
                creator_id=user_id
            ).values_list('created_user_id', flat=True))
            
            # Get assigned subordinates
            assigned_subordinates = list(UserAssignment.objects.filter(
                assignee_id=user_id
            ).values_list('assigned_user_id', flat=True))
            
            # Combine and return unique IDs
            subordinate_ids = list(set(direct_subordinates + assigned_subordinates))
            return subordinate_ids
        except Exception as e:
            print(f"Error getting subordinate IDs: {e}")
            return []
    
    @staticmethod
    def get_activity_summary(viewer_user_id, viewer_role, start_date=None, end_date=None):
        """Get activity summary for dashboard"""
        try:
            # Base date range (last 24 hours if not specified)
            end_datetime = end_date or timezone.now()
            start_datetime = start_date or (timezone.now() - timezone.timedelta(hours=24))
            
            # Get subordinate IDs for filtering
            subordinate_ids = []
            if viewer_role != 'superadmin':
                subordinate_ids = ActivityLogger.get_subordinate_ids(viewer_user_id)
            
            # Build filter for user filtering
            activity_logs = ActivityLog.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            )
            
            if viewer_role != 'superadmin':
                if subordinate_ids:
                    activity_logs = activity_logs.filter(user_id__in=subordinate_ids)
                else:
                    activity_logs = activity_logs.filter(user_id=viewer_user_id)
            
            # Get activity counts by type
            activity_counts = {}
            for log in activity_logs:
                activity_type = log.activity_type
                activity_counts[activity_type] = activity_counts.get(activity_type, 0) + 1
            
            # Get active sessions count
            active_sessions = UserSession.objects.filter(is_active=True)
            if viewer_role != 'superadmin':
                if subordinate_ids:
                    active_sessions = active_sessions.filter(user_id__in=subordinate_ids)
                else:
                    active_sessions = active_sessions.filter(user_id=viewer_user_id)
            
            active_sessions_count = active_sessions.count()
            
            # Get recent activities
            recent_activities = ActivityLogger.get_activity_logs(
                viewer_user_id, viewer_role, start_datetime, end_datetime, limit=10, offset=0
            )
            
            # Format activity counts for response
            activity_counts_list = [
                {'activityType': k, 'count': v} for k, v in activity_counts.items()
            ]
            
            return {
                'activityCounts': activity_counts_list,
                'activeSessions': active_sessions_count,
                'recentActivities': recent_activities,
                'dateRange': {
                    'start': start_datetime,
                    'end': end_datetime
                }
            }
        except Exception as e:
            print(f"Error getting activity summary: {e}")
            return {
                'activityCounts': [],
                'activeSessions': 0,
                'recentActivities': [],
                'dateRange': {
                    'start': timezone.now(),
                    'end': timezone.now()
                }
            }

# Activity types enum for consistent logging
class ActivityTypes:
    AUTH = 'auth'
    USER_MANAGEMENT = 'user_management'
    ASSET_MANAGEMENT = 'asset_management'
    REPORT_MANAGEMENT = 'report_management'
    SYSTEM = 'system'
    SESSION = 'session'

# Actions enum for consistent logging
class Actions:
    LOGIN = 'login'
    LOGOUT = 'logout'
    CREATE = 'create'
    UPDATE = 'update'
    DELETE = 'delete'
    VIEW = 'view'
    ASSIGN = 'assign'
    UNASSIGN = 'unassign'
    SUBMIT = 'submit'
    APPROVE = 'approve'
    REJECT = 'reject'
