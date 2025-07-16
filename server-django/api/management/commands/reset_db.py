from django.core.management.base import BaseCommand
from django.db import connection
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Reset the database by dropping all tables and recreating them'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Get all table names
            cursor.execute("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public';
            """)
            tables = cursor.fetchall()
            
            # Drop all tables
            for table in tables:
                table_name = table[0]
                self.stdout.write(f'Dropping table: {table_name}')
                cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE;')
            
            # Drop django_migrations table specifically
            cursor.execute('DROP TABLE IF EXISTS "django_migrations" CASCADE;')
            
        self.stdout.write(self.style.SUCCESS('All tables dropped successfully'))
        
        # Run migrations
        self.stdout.write('Running migrations...')
        call_command('migrate')
        
        self.stdout.write(self.style.SUCCESS('Database reset completed successfully'))
