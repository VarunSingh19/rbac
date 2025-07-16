from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import SystemStatus
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Create initial data for the application'

    def handle(self, *args, **options):
        # Create superadmin user if it doesn't exist
        if not User.objects.filter(username='superadmin').exists():
            superadmin = User.objects.create_user(
                username='superadmin',
                email='superadmin@cybridge.com',
                password='superadmin123',
                first_name='Super',
                last_name='Admin',
                role='superadmin'
            )
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created superadmin user: {superadmin.username}')
            )
        
        # Create admin user if it doesn't exist
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_user(
                username='admin',
                email='admin@cybridge.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                role='admin'
            )
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created admin user: {admin.username}')
            )
        
        # Create initial system status entries
        system_components = [
            {
                'component': 'database',
                'status': 'healthy',
                'details': json.dumps({
                    'name': 'Database Connection',
                    'description': 'PostgreSQL database connectivity',
                    'category': 'system'
                })
            },
            {
                'component': 'authentication',
                'status': 'healthy',
                'details': json.dumps({
                    'name': 'Authentication Service',
                    'description': 'User authentication and authorization',
                    'category': 'authentication'
                })
            },
            {
                'component': 'api-server',
                'status': 'healthy',
                'details': json.dumps({
                    'name': 'API Server',
                    'description': 'Django REST API server',
                    'category': 'system'
                })
            }
        ]
        
        for component_data in system_components:
            SystemStatus.objects.get_or_create(
                component=component_data['component'],
                defaults={
                    'status': component_data['status'],
                    'details': component_data['details']
                }
            )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created initial system status entries')
        )
        
        self.stdout.write(
            self.style.SUCCESS('Initial data creation completed!')
        )
