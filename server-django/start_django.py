#!/usr/bin/env python
"""
Django development server startup script
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    """Run the Django development server"""
    # Set the Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_server.settings')
    
    # Get the project root directory
    project_root = Path(__file__).resolve().parent
    
    print("🚀 Starting Django Development Server")
    print("=" * 50)
    print("📋 Server will run on http://127.0.0.1:8000")
    print("🔗 API endpoints available at http://127.0.0.1:8000/api/")
    print("🔧 Admin panel available at http://127.0.0.1:8000/admin/")
    print("=" * 50)
    
    try:
        # Check if migrations need to be run
        print("🔍 Checking database migrations...")
        result = subprocess.run([
            sys.executable, 'manage.py', 'showmigrations', '--plan'
        ], capture_output=True, text=True, cwd=project_root)
        
        if '[ ]' in result.stdout:
            print("📦 Running database migrations...")
            subprocess.run([
                sys.executable, 'manage.py', 'migrate'
            ], cwd=project_root)
            print("✅ Database migrations completed")
        
        # Create initial data
        print("🌱 Creating initial data...")
        subprocess.run([
            sys.executable, 'manage.py', 'create_initial_data'
        ], cwd=project_root)
        
        # Start the development server
        print("🚀 Starting Django server on 127.0.0.1:8000...")
        subprocess.run([
            sys.executable, 'manage.py', 'runserver', '127.0.0.1:8000'
        ], cwd=project_root)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
