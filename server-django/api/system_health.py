from django.db import models
from django.utils import timezone
from .models import SystemStatus
import json

class ApiEndpoint:
    def __init__(self, name, endpoint, method, description, category):
        self.name = name
        self.endpoint = endpoint
        self.method = method
        self.description = description
        self.category = category

class SystemHealthMonitor:
    # List of all API endpoints to monitor
    endpoints = [
        # Authentication endpoints
        ApiEndpoint('User Login', '/api/auth/login', 'POST', 'User authentication', 'authentication'),
        ApiEndpoint('User Info', '/api/auth/me', 'GET', 'Get current user info', 'authentication'),
        ApiEndpoint('User Logout', '/api/auth/logout', 'POST', 'User logout', 'authentication'),
        ApiEndpoint('Profile Update', '/api/auth/profile', 'PATCH', 'Update user profile', 'authentication'),
        ApiEndpoint('Password Change', '/api/auth/change-password', 'POST', 'Change user password', 'authentication'),
        
        # Dashboard endpoints
        ApiEndpoint('Super Admin Dashboard', '/api/dashboard/superadmin', 'GET', 'Super admin dashboard data', 'dashboard'),
        ApiEndpoint('Admin Dashboard', '/api/dashboard/admin', 'GET', 'Admin dashboard data', 'dashboard'),
        ApiEndpoint('Team Leader Dashboard', '/api/dashboard/team-leader', 'GET', 'Team leader dashboard data', 'dashboard'),
        ApiEndpoint('Tester Dashboard', '/api/dashboard/tester', 'GET', 'Tester dashboard data', 'dashboard'),
        ApiEndpoint('Client User Dashboard', '/api/dashboard/client-user', 'GET', 'Client user dashboard data', 'dashboard'),
        
        # User management endpoints
        ApiEndpoint('User List', '/api/users', 'GET', 'Get all users', 'user-management'),
        ApiEndpoint('User Creation', '/api/users/create', 'POST', 'Create new user', 'user-management'),
        ApiEndpoint('User Update', '/api/users/:id', 'PATCH', 'Update user information', 'user-management'),
        ApiEndpoint('User Delete', '/api/users/:id', 'DELETE', 'Delete user account', 'user-management'),
        ApiEndpoint('User Hierarchy', '/api/users/hierarchy', 'GET', 'Get user hierarchy', 'user-management'),
        ApiEndpoint('User Assignments', '/api/users/assigned', 'GET', 'Get user assignments', 'user-management'),
        ApiEndpoint('Team Leaders', '/api/team-leaders', 'GET', 'Get team leaders', 'user-management'),
        ApiEndpoint('Testers', '/api/testers', 'GET', 'Get testers', 'user-management'),
        ApiEndpoint('Client Team Members', '/api/client-team-members', 'GET', 'Get client team members', 'user-management'),
        
        # Asset management endpoints
        ApiEndpoint('Asset List', '/api/assets', 'GET', 'Get all assets', 'assets'),
        ApiEndpoint('Asset Creation', '/api/assets', 'POST', 'Create new asset', 'assets'),
        ApiEndpoint('Asset Update', '/api/assets/:id', 'PATCH', 'Update asset information', 'assets'),
        ApiEndpoint('Asset Delete', '/api/assets/:id', 'DELETE', 'Delete asset', 'assets'),
        ApiEndpoint('Asset Assignment', '/api/assets/:id/assign', 'POST', 'Assign asset to team leader', 'assets'),
        ApiEndpoint('Task Assignment', '/api/tasks/:id/assign', 'POST', 'Assign task to tester', 'assets'),
        ApiEndpoint('My Tasks', '/api/my-tasks', 'GET', 'Get assigned tasks', 'assets'),
        ApiEndpoint('My Assigned Tasks', '/api/my-assigned-tasks', 'GET', 'Get tasks assigned to tester', 'assets'),
        ApiEndpoint('Assets Detailed', '/api/assets-detailed', 'GET', 'Get detailed asset information', 'assets'),
        
        # Reports endpoints
        ApiEndpoint('Report List', '/api/reports', 'GET', 'Get all reports', 'reports'),
        ApiEndpoint('Report Creation', '/api/reports', 'POST', 'Create new report', 'reports'),
        ApiEndpoint('Report Update', '/api/reports/:id', 'PATCH', 'Update report', 'reports'),
        ApiEndpoint('Report Delete', '/api/reports/:id', 'DELETE', 'Delete report', 'reports'),
        ApiEndpoint('Report Details', '/api/reports/:id', 'GET', 'Get report details', 'reports'),
        ApiEndpoint('Report Findings', '/api/reports/:id/findings', 'GET', 'Get report findings', 'reports'),
        ApiEndpoint('Finding Creation', '/api/reports/:id/findings', 'POST', 'Create new finding', 'reports'),
        ApiEndpoint('Finding Update', '/api/findings/:id', 'PATCH', 'Update finding', 'reports'),
        ApiEndpoint('Finding Delete', '/api/findings/:id', 'DELETE', 'Delete finding', 'reports'),
        ApiEndpoint('Report Notes', '/api/reports/:id/notes', 'GET', 'Get report notes', 'reports'),
        
        # System endpoints
        ApiEndpoint('System Health', '/api/health', 'GET', 'System health check', 'system'),
        ApiEndpoint('System Status', '/api/status', 'GET', 'Get system status', 'system'),
        ApiEndpoint('API Logs', '/api/logs', 'GET', 'Get API logs', 'system'),
        ApiEndpoint('Activity Logs', '/api/activity-logs', 'GET', 'Get activity logs', 'system'),
        ApiEndpoint('User Sessions', '/api/user-sessions', 'GET', 'Get user sessions', 'system'),
        ApiEndpoint('Asset Activity', '/api/asset-activity-logs', 'GET', 'Get asset activity logs', 'system'),
        ApiEndpoint('Activity Summary', '/api/activity-summary', 'GET', 'Get activity summary', 'system'),
    ]
    
    @classmethod
    def update_all_api_status(cls):
        """Update system status for all API endpoints"""
        try:
            for endpoint in cls.endpoints:
                cls.update_api_status(endpoint)
        except Exception as e:
            print(f'Error updating API status: {e}')
    
    @classmethod
    def update_api_status(cls, endpoint):
        """Update status for a specific API endpoint"""
        try:
            component_name = f"{endpoint.category}-{endpoint.name.lower().replace(' ', '-')}"
            
            # Check if component exists, if not create it
            status_obj, created = SystemStatus.objects.get_or_create(
                component=component_name,
                defaults={
                    'status': 'healthy',
                    'last_checked': timezone.now(),
                    'details': json.dumps({
                        'name': endpoint.name,
                        'endpoint': endpoint.endpoint,
                        'method': endpoint.method,
                        'description': endpoint.description,
                        'category': endpoint.category
                    })
                }
            )
            
            if not created:
                # Update existing status
                status_obj.status = 'healthy'
                status_obj.last_checked = timezone.now()
                status_obj.details = json.dumps({
                    'name': endpoint.name,
                    'endpoint': endpoint.endpoint,
                    'method': endpoint.method,
                    'description': endpoint.description,
                    'category': endpoint.category
                })
                status_obj.save()
                
        except Exception as e:
            print(f"Error updating status for {endpoint.name}: {e}")
    
    @classmethod
    def get_all_api_status(cls):
        """Get all API endpoints with their current status"""
        try:
            statuses = SystemStatus.objects.all().order_by('component')
            result = []
            
            for status in statuses:
                try:
                    details = json.loads(status.details) if status.details else {}
                    result.append({
                        'id': status.id,
                        'component': status.component,
                        'name': details.get('name', status.component),
                        'endpoint': details.get('endpoint', ''),
                        'method': details.get('method', ''),
                        'description': details.get('description', ''),
                        'category': details.get('category', 'system'),
                        'status': status.status,
                        'lastChecked': status.last_checked
                    })
                except json.JSONDecodeError:
                    result.append({
                        'id': status.id,
                        'component': status.component,
                        'name': status.component,
                        'endpoint': '',
                        'method': '',
                        'description': '',
                        'category': 'system',
                        'status': status.status,
                        'lastChecked': status.last_checked
                    })
            
            return result
        except Exception as e:
            print(f'Error getting API status: {e}')
            return []
    
    @classmethod
    def mark_api_unhealthy(cls, endpoint, error):
        """Mark an API as unhealthy"""
        try:
            matching_endpoint = next((e for e in cls.endpoints if e.endpoint == endpoint), None)
            if matching_endpoint:
                component_name = f"{matching_endpoint.category}-{matching_endpoint.name.lower().replace(' ', '-')}"
                
                SystemStatus.objects.filter(component=component_name).update(
                    status='unhealthy',
                    last_checked=timezone.now(),
                    details=json.dumps({
                        'name': matching_endpoint.name,
                        'endpoint': matching_endpoint.endpoint,
                        'method': matching_endpoint.method,
                        'description': matching_endpoint.description,
                        'category': matching_endpoint.category,
                        'error': error
                    })
                )
        except Exception as e:
            print(f'Error marking API as unhealthy: {e}')
    
    @classmethod
    def initialize_api_status(cls):
        """Initialize all API endpoints in the system status table"""
        try:
            # Use a delay to initialize after server starts
            from django.core.management import call_command
            import threading
            import time
            
            def delayed_init():
                time.sleep(2)  # 2 second delay
                try:
                    cls.update_all_api_status()
                    print('API status initialized successfully')
                except Exception as e:
                    print(f'Error initializing API status: {e}')
            
            thread = threading.Thread(target=delayed_init)
            thread.daemon = True
            thread.start()
        except Exception as e:
            print(f'Error initializing API status: {e}')
