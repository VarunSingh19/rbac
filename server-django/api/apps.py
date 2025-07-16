from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        # Initialize system health monitoring when the app starts
        # Temporarily disabled during migrations
        try:
            from .system_health import SystemHealthMonitor
            SystemHealthMonitor.initialize_api_status()
        except Exception as e:
            # Ignore errors during migrations
            pass
