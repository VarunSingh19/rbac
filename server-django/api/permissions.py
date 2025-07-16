from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class RoleBasedPermission(permissions.BasePermission):
    """
    Custom permission class that checks user roles and hierarchy
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.is_active

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the object.
        return obj.created_by == request.user

def require_role(min_role):
    """
    Decorator to require a minimum role level
    """
    role_hierarchy = {
        'client-user': 1,
        'client-admin': 2,
        'tester': 3,
        'team-leader': 4,
        'admin': 5,
        'superadmin': 6
    }
    
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                from rest_framework.response import Response
                from rest_framework import status
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_level = role_hierarchy.get(request.user.role, 0)
            required_level = role_hierarchy.get(min_role, 0)
            
            if user_level < required_level:
                from rest_framework.response import Response
                from rest_framework import status
                return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
