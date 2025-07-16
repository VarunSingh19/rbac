from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from datetime import datetime, timedelta
import json
import uuid
import bcrypt

from .models import *
from .serializers import *
from .permissions import RoleBasedPermission, require_role
from .utils import get_client_ip, get_user_agent
from .activity_logger import ActivityLogger, ActivityTypes, Actions
from .system_health import SystemHealthMonitor
from .audit_logger import AuditLogger
from .pdf_generator import PDFReportGenerator

# Authentication Views
@api_view(['GET'])
def current_user_view(request):
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    print(f"[LOGIN DEBUG] Login endpoint called")
    print(f"[LOGIN DEBUG] Request user: {request.user}")
    print(f"[LOGIN DEBUG] Request user is_authenticated: {request.user.is_authenticated}")

    username = request.data.get('username')
    password = request.data.get('password')

    print(f"[LOGIN DEBUG] Login attempt for username: {username}")

    if not username or not password:
        print("[LOGIN DEBUG] Missing username or password")
        return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
    
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check password
    if not user.check_password(password):
        # Log failed login attempt
        ActivityLogger.log_activity(
            user=user,
            activity_type=ActivityTypes.AUTH,
            action='login_failed',
            details={'reason': 'invalid_password', 'username': username},
            ip_address=ip_address,
            user_agent=user_agent
        )
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not user.is_active:
        ActivityLogger.log_activity(
            user=user,
            activity_type=ActivityTypes.AUTH,
            action='login_failed',
            details={'reason': 'access_revoked', 'username': username},
            ip_address=ip_address,
            user_agent=user_agent
        )
        return Response({'error': 'Your access has been revoked. Please contact your administrator.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Create or get token
    token, created = Token.objects.get_or_create(user=user)
    
    # Update last login
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    
    # Log successful login
    ActivityLogger.log_activity(
        user=user,
        activity_type=ActivityTypes.AUTH,
        action=Actions.LOGIN,
        details={'username': username, 'login_time': timezone.now()},
        ip_address=ip_address,
        user_agent=user_agent,
        session_id=token.key
    )
    
    # Log user session
    ActivityLogger.log_user_session(
        user=user,
        session_id=token.key,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Set session
    login(request, user)
    
    user_data = UserSerializer(user).data
    response = Response({
        'user': user_data,
        'sessionId': token.key,
        'message': 'Login successful'
    })
    
    # Set cookie (no httponly for local dev)
    response.set_cookie('sessionId', token.key, max_age=7*24*60*60)
    
    return response

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    print(f"[REGISTER DEBUG] Register endpoint called")
    print(f"[REGISTER DEBUG] Request user: {request.user}")
    print(f"[REGISTER DEBUG] Request user is_authenticated: {request.user.is_authenticated}")

    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        # Check if username exists
        if User.objects.filter(username=serializer.validated_data['username']).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email exists
        if User.objects.filter(email=serializer.validated_data['email']).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        user_data = UserSerializer(user).data
        
        return Response({
            'user': user_data,
            'message': 'User created successfully'
        }, status=status.HTTP_201_CREATED)
    
    print(f"[REGISTER DEBUG] Serializer errors: {serializer.errors}")
    return Response({'error': 'Invalid registration data', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    if request.user.is_authenticated:
        ip_address = get_client_ip(request)
        
        # Get session ID from cookie or header
        session_id = request.COOKIES.get('sessionId') or request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
        
        if session_id:
            # Log logout activity
            ActivityLogger.log_activity(
                user=request.user,
                activity_type=ActivityTypes.AUTH,
                action=Actions.LOGOUT,
                details={'logout_time': timezone.now()},
                ip_address=ip_address,
                user_agent=get_user_agent(request),
                session_id=session_id
            )
            
            # Log user session logout
            ActivityLogger.log_user_logout(session_id)
            
            # Delete token
            try:
                Token.objects.get(key=session_id).delete()
            except Token.DoesNotExist:
                pass
        
        logout(request)
    
    response = Response({'message': 'Logout successful'})
    response.delete_cookie('sessionId')
    return response

# User Management Views
@api_view(['POST'])
def create_user_view(request):
    current_user = request.user
    
    # Role-based creation permissions
    allowed_roles = {
        'superadmin': ['admin'],
        'admin': ['team-leader', 'tester', 'client-admin'],
        'team-leader': ['tester'],
        'client-admin': ['client-user'],
    }
    
    user_data = request.data.copy()
    target_role = user_data.get('role')
    
    if target_role not in allowed_roles.get(current_user.role, []):
        return Response({'error': 'Not authorized to create this role'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if username exists
    if User.objects.filter(username=user_data.get('username')).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if email exists
    if User.objects.filter(email=user_data.get('email')).exists():
        return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserCreateSerializer(data=user_data)
    if serializer.is_valid():
        new_user = serializer.save()
        
        # Create user relationship
        UserRelationship.objects.create(
            creator=current_user,
            created_user=new_user,
            plain_password=user_data['password']
        )
        
        # Log activity
        ActivityLogger.log_activity(
            user=current_user,
            activity_type=ActivityTypes.USER_MANAGEMENT,
            action=Actions.CREATE,
            resource_type='user',
            resource_id=new_user.id,
            resource_name=f"{new_user.first_name} {new_user.last_name} (@{new_user.username})",
            details={
                'created_user_role': new_user.role,
                'created_user_email': new_user.email,
                'created_at': timezone.now(),
            },
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request)
        )
        
        user_data = UserSerializer(new_user).data
        user_data['plainPassword'] = request.data['password']
        
        return Response({
            'user': user_data,
            'message': 'User created successfully'
        }, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Invalid user data or creation failed'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def created_users_view(request):
    relationships = UserRelationship.objects.filter(creator=request.user).select_related('created_user')
    users_data = []
    
    for rel in relationships:
        user_data = UserSerializer(rel.created_user).data
        user_data['plainPassword'] = rel.plain_password
        users_data.append(user_data)
    
    return Response(users_data)

@api_view(['GET'])
def user_hierarchy_view(request):
    # Get complete user hierarchy
    def build_hierarchy(user_id):
        relationships = UserRelationship.objects.filter(creator_id=user_id).select_related('created_user')
        hierarchy = []
        
        for rel in relationships:
            user_data = UserSerializer(rel.created_user).data
            user_data['plainPassword'] = rel.plain_password
            user_data['children'] = build_hierarchy(rel.created_user.id)
            hierarchy.append(user_data)
        
        return hierarchy
    
    hierarchy = build_hierarchy(request.user.id)
    return Response(hierarchy)

@api_view(['GET'])
def assigned_users_view(request):
    assignments = UserAssignment.objects.filter(assignee=request.user).select_related('assigned_user')
    users_data = []
    
    for assignment in assignments:
        user_data = UserSerializer(assignment.assigned_user).data
        user_data['assignedAt'] = assignment.created_at
        user_data['assignerId'] = assignment.assigner.id
        users_data.append(user_data)
    
    return Response(users_data)

@api_view(['GET'])
def assignable_users_view(request, role):
    # Get users current user can assign with specific role
    created_users = UserRelationship.objects.filter(
        creator=request.user
    ).select_related('created_user').filter(
        created_user__role=role,
        created_user__is_active=True
    )
    
    users_data = []
    for rel in created_users:
        user_data = UserSerializer(rel.created_user).data
        user_data['plainPassword'] = rel.plain_password
        users_data.append(user_data)
    
    return Response(users_data)

@api_view(['GET'])
def user_assignments_view(request):
    assignments = UserAssignment.objects.filter(assigner=request.user).select_related('assigned_user', 'assignee')
    assignments_data = []
    
    for assignment in assignments:
        assignment_data = {
            'id': assignment.id,
            'assignedUserId': assignment.assigned_user.id,
            'assigneeId': assignment.assignee.id,
            'assignedUser': UserSerializer(assignment.assigned_user).data,
            'assignedAt': assignment.created_at
        }
        assignments_data.append(assignment_data)
    
    return Response(assignments_data)

@api_view(['POST'])
def assign_user_view(request):
    assigned_user_id = request.data.get('assignedUserId')
    assignee_id = request.data.get('assigneeId')
    
    if not assigned_user_id or not assignee_id:
        return Response({'error': 'Both assignedUserId and assigneeId are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify current user can assign these users
    can_assign_user = UserRelationship.objects.filter(creator=request.user, created_user_id=assigned_user_id).exists()
    can_assign_to = UserRelationship.objects.filter(creator=request.user, created_user_id=assignee_id).exists()
    
    if not can_assign_user or not can_assign_to:
        return Response({'error': 'You can only assign users you have created'}, status=status.HTTP_403_FORBIDDEN)
    
    # Create or update assignment
    assignment, created = UserAssignment.objects.get_or_create(
        assigned_user_id=assigned_user_id,
        assignee_id=assignee_id,
        defaults={'assigner': request.user}
    )
    
    if not created:
        assignment.assigner = request.user
        assignment.updated_at = timezone.now()
        assignment.save()
    
    return Response({'message': 'User assigned successfully'})

@api_view(['DELETE'])
def unassign_user_view(request):
    assigned_user_id = request.data.get('assignedUserId')
    assignee_id = request.data.get('assigneeId')
    
    if not assigned_user_id or not assignee_id:
        return Response({'error': 'Both assignedUserId and assigneeId are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    UserAssignment.objects.filter(
        assigned_user_id=assigned_user_id,
        assignee_id=assignee_id
    ).delete()
    
    return Response({'message': 'User unassigned successfully'})

@api_view(['DELETE'])
def delete_user_view(request, user_id):
    # Check if current user created this user
    try:
        relationship = UserRelationship.objects.get(creator=request.user, created_user_id=user_id)
        user_to_delete = relationship.created_user
        
        # Delete relationships
        UserRelationship.objects.filter(Q(creator=user_to_delete) | Q(created_user=user_to_delete)).delete()
        
        # Delete assignments
        UserAssignment.objects.filter(Q(assigned_user=user_to_delete) | Q(assignee=user_to_delete)).delete()
        
        # Delete user sessions
        UserSession.objects.filter(user=user_to_delete).delete()
        
        # Delete tokens
        Token.objects.filter(user=user_to_delete).delete()
        
        # Delete the user
        user_to_delete.delete()
        
        return Response({'message': 'User deleted successfully'})
        
    except UserRelationship.DoesNotExist:
        return Response({'error': 'Not authorized to delete this user'}, status=status.HTTP_403_FORBIDDEN)

# Health and System Views
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check_view(request):
    # Log API call
    ApiLog.objects.create(
        method="GET",
        endpoint="/api/health",
        status_code=200,
        response_time=50
    )
    
    return Response({
        'status': 'ok',
        'timestamp': timezone.now().isoformat(),
        'services': {
            'database': 'connected',
            'server': 'running'
        }
    })

@api_view(['GET'])
def system_health_view(request):
    if request.user.role not in ['admin', 'superadmin']:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all API statuses
    api_statuses = SystemHealthMonitor.get_all_api_status()
    system_statuses = SystemStatus.objects.all()
    
    # Calculate overall health
    total_apis = len(api_statuses)
    healthy_apis = len([api for api in api_statuses if api['status'] == 'healthy'])
    health_score = round((healthy_apis / total_apis) * 100) if total_apis > 0 else 100
    
    # Group APIs by category
    apis_by_category = {}
    for api in api_statuses:
        category = api.get('category', 'system')
        if category not in apis_by_category:
            apis_by_category[category] = []
        apis_by_category[category].append(api)
    
    return Response({
        'overallHealth': health_score,
        'totalApis': total_apis,
        'healthyApis': healthy_apis,
        'unhealthyApis': total_apis - healthy_apis,
        'apisByCategory': apis_by_category,
        'systemComponents': SystemStatusSerializer(system_statuses, many=True).data,
        'lastUpdated': timezone.now().isoformat()
    })

@api_view(['GET'])
def system_status_view(request):
    statuses = SystemStatus.objects.all()
    
    # Log API call
    ApiLog.objects.create(
        method="GET",
        endpoint="/api/status",
        status_code=200,
        response_time=75
    )
    
    return Response(SystemStatusSerializer(statuses, many=True).data)

@api_view(['POST'])
def update_system_status_view(request):
    if request.user.role not in ['admin', 'superadmin']:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    component = request.data.get('component')
    status_value = request.data.get('status')
    details = request.data.get('details', '')
    
    if not component or not status_value:
        return Response({'error': 'Component and status are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    status_obj, created = SystemStatus.objects.update_or_create(
        component=component,
        defaults={
            'status': status_value,
            'details': details,
            'last_checked': timezone.now()
        }
    )
    
    # Log API call
    ApiLog.objects.create(
        method="POST",
        endpoint="/api/status",
        status_code=200,
        response_time=100
    )
    
    return Response(SystemStatusSerializer(status_obj).data)

@api_view(['GET'])
def api_logs_view(request):
    if request.user.role_hierarchy_level < 4:  # team-leader+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    logs = ApiLog.objects.all().order_by('-timestamp')[:50]
    
    # Log API call
    ApiLog.objects.create(
        method="GET",
        endpoint="/api/logs",
        status_code=200,
        response_time=60
    )
    
    return Response(ApiLogSerializer(logs, many=True).data)

# Asset Management Views
@api_view(['GET', 'POST'])
def assets_view(request):
    user = request.user

    if request.method == 'GET':
        # List assets
        if user.role in ['admin', 'superadmin']:
            assets = Asset.objects.all().select_related('project_owner', 'assigned_to', 'assigned_by', 'created_by')
        elif user.role == 'client-admin':
            # Client admin can see assets they own or created
            owned_assets = Asset.objects.filter(project_owner=user)
            created_assets = Asset.objects.filter(created_by=user)
            asset_ids = set(list(owned_assets.values_list('id', flat=True)) + list(created_assets.values_list('id', flat=True)))
            assets = Asset.objects.filter(id__in=asset_ids).select_related('project_owner', 'assigned_to', 'assigned_by', 'created_by')
        else:
            return Response({'error': 'Not authorized to view assets'}, status=status.HTTP_403_FORBIDDEN)

        return Response(AssetSerializer(assets, many=True).data)

    elif request.method == 'POST':
        # Create asset
        if user.role not in ['admin', 'client-admin', 'superadmin']:
            return Response({'error': 'Not authorized to create assets'}, status=status.HTTP_403_FORBIDDEN)

        print(f"[CREATE ASSET DEBUG] Received data: {request.data}")
        print(f"[CREATE ASSET DEBUG] User role: {user.role}")

        serializer = AssetSerializer(data=request.data)
        print(f"[CREATE ASSET DEBUG] Serializer validation: {serializer.is_valid()}")
        if not serializer.is_valid():
            print(f"[CREATE ASSET DEBUG] Serializer errors: {serializer.errors}")

        if serializer.is_valid():
            # If client-admin is creating, they become the owner
            if user.role == 'client-admin':
                asset = serializer.save(created_by=user, project_owner=user)
            else:
                asset = serializer.save(created_by=user)

            print(f"[CREATE ASSET DEBUG] Asset created successfully: {asset.id}")
            print(f"[CREATE ASSET DEBUG] Asset details: project_name={asset.project_name}, asset_name={asset.asset_name}, asset_type={asset.asset_type}")

            # Verify the asset was saved correctly
            saved_asset = Asset.objects.get(id=asset.id)
            print(f"[CREATE ASSET DEBUG] Verified saved asset: {saved_asset.project_name} - {saved_asset.asset_name}")

            return Response({
                'asset': AssetSerializer(asset).data,
                'message': 'Asset created successfully'
            }, status=status.HTTP_201_CREATED)

        print(f"[CREATE ASSET DEBUG] Serializer errors: {serializer.errors}")
        return Response({'error': 'Failed to create asset', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

# Keep the old views for backward compatibility (can be removed later)
@api_view(['GET'])
def assets_list_view(request):
    user = request.user
    
    if user.role in ['admin', 'superadmin']:
        assets = Asset.objects.all().select_related('project_owner', 'assigned_to', 'assigned_by', 'created_by')
    elif user.role == 'client-admin':
        # Client admin can see assets they own or created
        owned_assets = Asset.objects.filter(project_owner=user)
        created_assets = Asset.objects.filter(created_by=user)
        asset_ids = set(list(owned_assets.values_list('id', flat=True)) + list(created_assets.values_list('id', flat=True)))
        assets = Asset.objects.filter(id__in=asset_ids).select_related('project_owner', 'assigned_to', 'assigned_by', 'created_by')
    else:
        return Response({'error': 'Not authorized to view assets'}, status=status.HTTP_403_FORBIDDEN)
    
    return Response(AssetSerializer(assets, many=True).data)

@api_view(['GET', 'PUT', 'DELETE'])
def asset_detail_view(request, asset_id):
    try:
        asset = Asset.objects.select_related('project_owner', 'assigned_to', 'assigned_by', 'created_by').get(id=asset_id)
    except Asset.DoesNotExist:
        return Response({'error': 'Asset not found'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user

    if request.method == 'GET':
        # Check authorization for viewing
        if (user.role not in ['admin', 'superadmin'] and
            asset.project_owner != user and
            asset.created_by != user):
            return Response({'error': 'Not authorized to view this asset'}, status=status.HTTP_403_FORBIDDEN)

        return Response(AssetSerializer(asset).data)

    elif request.method == 'PUT':
        # Check authorization for updating
        if (user.role not in ['admin', 'superadmin'] and
            asset.project_owner != user and
            asset.created_by != user):
            return Response({'error': 'Not authorized to update this asset'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AssetSerializer(asset, data=request.data, partial=True)
        if serializer.is_valid():
            updated_asset = serializer.save()
            return Response({
                'asset': AssetSerializer(updated_asset).data,
                'message': 'Asset updated successfully'
            })

        return Response({'error': 'Failed to update asset', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Check authorization for deleting
        if (user.role not in ['admin', 'superadmin'] and
            asset.project_owner != user and
            asset.created_by != user):
            return Response({'error': 'Not authorized to delete this asset'}, status=status.HTTP_403_FORBIDDEN)

        asset.delete()
        return Response({'message': 'Asset deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
def create_asset_view(request):
    user = request.user
    
    # Only admin and client-admin can create assets
    if user.role not in ['admin', 'client-admin', 'superadmin']:
        return Response({'error': 'Not authorized to create assets'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = AssetSerializer(data=request.data)
    if serializer.is_valid():
        # If client-admin is creating, they become the owner
        if user.role == 'client-admin':
            asset = serializer.save(created_by=user, project_owner=user)
        else:
            asset = serializer.save(created_by=user)
        
        return Response({
            'asset': AssetSerializer(asset).data,
            'message': 'Asset created successfully'
        }, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Failed to create asset'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
def update_asset_view(request, asset_id):
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return Response({'error': 'Asset not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user = request.user
    
    # Check authorization
    if (user.role not in ['admin', 'superadmin'] and 
        asset.created_by != user):
        return Response({'error': 'Not authorized to update this asset'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = AssetSerializer(asset, data=request.data, partial=True)
    if serializer.is_valid():
        updated_asset = serializer.save()
        return Response({
            'asset': AssetSerializer(updated_asset).data,
            'message': 'Asset updated successfully'
        })
    
    return Response({'error': 'Failed to update asset'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_asset_view(request, asset_id):
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return Response({'error': 'Asset not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user = request.user
    
    # Check authorization
    if (user.role not in ['admin', 'superadmin'] and 
        asset.created_by != user):
        return Response({'error': 'Not authorized to delete this asset'}, status=status.HTTP_403_FORBIDDEN)
    
    asset.delete()
    return Response({'message': 'Asset deleted successfully'})

@api_view(['GET'])
def client_admins_view(request):
    if request.user.role not in ['admin', 'superadmin']:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    client_admins = User.objects.filter(role='client-admin').order_by('username')
    return Response(UserSerializer(client_admins, many=True).data)

@api_view(['GET'])
def team_leaders_view(request):
    user = request.user
    if user.role not in ['admin', 'superadmin']:
        return Response({'error': 'Not authorized to access team leaders'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get team leaders created by this admin
    created_relationships = UserRelationship.objects.filter(
        creator=user,
        created_user__role='team-leader'
    ).select_related('created_user')
    
    assigned_assignments = UserAssignment.objects.filter(
        assignee=user,
        assigned_user__role='team-leader'
    ).select_related('assigned_user')
    
    # Combine and deduplicate
    team_leader_ids = set()
    team_leaders = []
    
    for rel in created_relationships:
        if rel.created_user.id not in team_leader_ids:
            team_leaders.append(rel.created_user)
            team_leader_ids.add(rel.created_user.id)
    
    for assignment in assigned_assignments:
        if assignment.assigned_user.id not in team_leader_ids:
            team_leaders.append(assignment.assigned_user)
            team_leader_ids.add(assignment.assigned_user.id)
    
    return Response(UserSerializer(team_leaders, many=True).data)

@api_view(['POST'])
def assign_asset_to_team_leader_view(request, asset_id):
    user = request.user
    if user.role not in ['admin', 'superadmin']:
        return Response({'error': 'Not authorized to assign assets'}, status=status.HTTP_403_FORBIDDEN)
    
    team_leader_id = request.data.get('teamLeaderId')
    if not team_leader_id:
        return Response({'error': 'Team leader ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        asset = Asset.objects.get(id=asset_id)
        team_leader = User.objects.get(id=team_leader_id)
    except (Asset.DoesNotExist, User.DoesNotExist):
        return Response({'error': 'Asset or team leader not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update asset with assignment info
    asset.assigned_to = team_leader
    asset.assigned_by = user
    asset.assigned_at = timezone.now()
    asset.save()
    
    # Create assignment record
    AssetAssignment.objects.create(
        asset=asset,
        assigned_to=team_leader,
        assigned_by=user,
        status='pending'
    )
    
    return Response({'message': 'Asset assigned successfully'})

@api_view(['DELETE'])
def unassign_asset_view(request, asset_id):
    user = request.user
    if user.role not in ['admin', 'superadmin']:
        return Response({'error': 'Not authorized to unassign assets'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return Response({'error': 'Asset not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Remove assignment from asset
    asset.assigned_to = None
    asset.assigned_by = None
    asset.assigned_at = None
    asset.save()
    
    # Remove assignment records
    AssetAssignment.objects.filter(asset=asset).delete()
    
    return Response({'message': 'Asset unassigned successfully'})

@api_view(['GET'])
def assets_detailed_view(request):
    user = request.user
    
    if user.role == 'client-admin':
        # Client admins see only their own assets
        assets = Asset.objects.filter(project_owner=user).select_related(
            'project_owner', 'assigned_to', 'assigned_by', 'assigned_tester', 'assigned_tester_by', 'created_by'
        )
    elif user.role in ['admin', 'superadmin']:
        # Admins see assets with full details
        assets = Asset.objects.all().select_related(
            'project_owner', 'assigned_to', 'assigned_by', 'assigned_tester', 'assigned_tester_by', 'created_by'
        )
    else:
        return Response({'error': 'Not authorized to view assets'}, status=status.HTTP_403_FORBIDDEN)

    print(f"[ASSETS DETAILED DEBUG] Found {assets.count()} assets for user {user.username} (role: {user.role})")
    for asset in assets:
        print(f"[ASSETS DETAILED DEBUG] Asset: {asset.project_name} - {asset.asset_name} (ID: {asset.id})")

    return Response(AssetSerializer(assets, many=True).data)

@api_view(['GET'])
def my_tasks_view(request):
    user = request.user
    if user.role != 'team-leader':
        return Response({'error': 'Only team leaders can view tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    assigned_assets = Asset.objects.filter(assigned_to=user).select_related(
        'project_owner', 'assigned_by'
    )
    
    return Response(AssetSerializer(assigned_assets, many=True).data)

@api_view(['GET'])
def testers_view(request):
    user = request.user
    if user.role != 'team-leader':
        return Response({'error': 'Only team leaders can access testers'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get testers created by this team leader
    created_relationships = UserRelationship.objects.filter(
        creator=user,
        created_user__role='tester'
    ).select_related('created_user')
    
    assigned_assignments = UserAssignment.objects.filter(
        assignee=user,
        assigned_user__role='tester'
    ).select_related('assigned_user')
    
    # Combine and deduplicate
    tester_ids = set()
    testers = []
    
    for rel in created_relationships:
        if rel.created_user.id not in tester_ids:
            testers.append(rel.created_user)
            tester_ids.add(rel.created_user.id)
    
    for assignment in assigned_assignments:
        if assignment.assigned_user.id not in tester_ids:
            testers.append(assignment.assigned_user)
            tester_ids.add(assignment.assigned_user.id)
    
    return Response(UserSerializer(testers, many=True).data)

@api_view(['POST'])
def assign_task_to_tester_view(request, asset_id):
    user = request.user
    if user.role != 'team-leader':
        return Response({'error': 'Only team leaders can assign tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    tester_id = request.data.get('testerId')
    if not tester_id:
        return Response({'error': 'Tester ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        asset = Asset.objects.get(id=asset_id)
        tester = User.objects.get(id=tester_id)
    except (Asset.DoesNotExist, User.DoesNotExist):
        return Response({'error': 'Asset or tester not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update asset with tester assignment
    asset.assigned_tester = tester
    asset.assigned_tester_at = timezone.now()
    asset.assigned_tester_by = user
    asset.save()
    
    return Response({'message': 'Task assigned to tester successfully'})

@api_view(['DELETE'])
def unassign_task_from_tester_view(request, asset_id):
    user = request.user
    if user.role != 'team-leader':
        return Response({'error': 'Only team leaders can unassign tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return Response({'error': 'Asset not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Remove tester assignment from asset
    asset.assigned_tester = None
    asset.assigned_tester_at = None
    asset.assigned_tester_by = None
    asset.save()
    
    return Response({'message': 'Task unassigned from tester successfully'})

@api_view(['GET'])
def my_assigned_tasks_view(request):
    user = request.user
    if user.role != 'tester':
        return Response({'error': 'Only testers can view assigned tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    assigned_tasks = Asset.objects.filter(assigned_tester=user).select_related(
        'project_owner', 'assigned_by', 'assigned_tester_by'
    )
    
    return Response(AssetSerializer(assigned_tasks, many=True).data)

# Report Management Views
@api_view(['POST'])
def create_report_view(request):
    user = request.user
    if user.role != 'tester':
        return Response({'error': 'Only testers can create reports'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the asset to find the team leader who assigned this task
    asset_id = request.data.get('associatedAssetId')
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return Response({'error': 'Invalid asset ID'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Find the team leader who assigned this task to the tester
    team_leader = asset.assigned_tester_by
    
    # Auto-populate fields based on current user and assignment chain
    report_data = request.data.copy()
    report_data.update({
        'testerName': f"{user.first_name} {user.last_name}",
        'preparedBy': f"{user.first_name} {user.last_name}",
        'reviewedBy': f"{team_leader.first_name} {team_leader.last_name}" if team_leader else '',
        'currentStatus': 'Draft'  # Always start as Draft for testers
    })
    
    serializer = ReportSerializer(data=report_data)
    if serializer.is_valid():
        report = serializer.save(created_by=user)
        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Failed to create report'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def reports_list_view(request):
    user = request.user
    
    if user.role == 'tester':
        # Testers see only their own reports (any status)
        reports = Report.objects.filter(created_by=user)
    elif user.role == 'team-leader':
        # Team leaders see reports they can review (In Review or Final status)
        # plus reports from testers they assigned tasks to
        reports = Report.objects.filter(
            associated_asset__assigned_tester_by=user,
            current_status__in=['In Review', 'Final']
        )
    elif user.role in ['admin', 'superadmin']:
        # Admins see final reports from their team leaders
        reports = Report.objects.filter(current_status='Final')
    elif user.role == 'client-admin':
        # Client admins see final reports for their assets
        reports = Report.objects.filter(
            current_status='Final',
            associated_asset__project_owner=user
        )
    else:
        reports = Report.objects.none()
    
    reports = reports.select_related('associated_asset', 'created_by')
    return Response(ReportSerializer(reports, many=True).data)

@api_view(['GET'])
def asset_reports_view(request, asset_id):
    reports = Report.objects.filter(associated_asset_id=asset_id).select_related('created_by')
    return Response(ReportSerializer(reports, many=True).data)

@api_view(['GET'])
def report_detail_view(request, report_id):
    try:
        report = Report.objects.select_related('associated_asset', 'created_by').get(id=report_id)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response(ReportSerializer(report).data)

@api_view(['PATCH'])
def update_report_view(request, report_id):
    user = request.user
    
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions based on role
    if user.role == 'tester':
        # Testers can only update their own reports
        if report.created_by != user:
            return Response({'error': 'You can only update your own reports'}, status=status.HTTP_403_FORBIDDEN)
        
        # Testers cannot set status to "Final"
        if request.data.get('currentStatus') == 'Final':
            return Response({'error': 'Only team leaders can set report status to Final'}, status=status.HTTP_403_FORBIDDEN)
    
    elif user.role == 'team-leader':
        # Team leaders can update reports from their assigned testers
        asset = report.associated_asset
        if asset.assigned_tester_by != user:
            return Response({'error': 'You can only update reports from your assigned testers'}, status=status.HTTP_403_FORBIDDEN)
        
        # Auto-set finalized date when status changes to Final
        if (request.data.get('currentStatus') == 'Final' and 
            report.current_status != 'Final'):
            request.data['reportFinalizedDate'] = timezone.now().date()
    
    else:
        return Response({'error': 'Not authorized to update reports'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = ReportSerializer(report, data=request.data, partial=True)
    if serializer.is_valid():
        updated_report = serializer.save()
        return Response(ReportSerializer(updated_report).data)
    
    return Response({'error': 'Failed to update report'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_report_view(request, report_id):
    user = request.user
    
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only the tester who created the report can delete it
    if user.role == 'tester' and report.created_by != user:
        return Response({'error': 'You can only delete your own reports'}, status=status.HTTP_403_FORBIDDEN)
    
    report.delete()
    return Response({'message': 'Report deleted successfully'})

# Vulnerability Finding Views
@api_view(['GET'])
def report_findings_view(request, report_id):
    findings = VulnerabilityFinding.objects.filter(report_id=report_id).order_by('-created_at')
    return Response(VulnerabilityFindingSerializer(findings, many=True).data)

@api_view(['POST'])
def create_finding_view(request, report_id):
    user = request.user
    if user.role != 'tester':
        return Response({'error': 'Only testers can create vulnerability findings'}, status=status.HTTP_403_FORBIDDEN)
    
    finding_data = request.data.copy()
    finding_data.update({
        'reportId': report_id,
        'findingId': f"VUL-{int(timezone.now().timestamp())}-{uuid.uuid4().hex[:9]}"
    })
    
    serializer = VulnerabilityFindingSerializer(data=finding_data)
    if serializer.is_valid():
        finding = serializer.save()
        
        # Update report findings summary
        update_report_findings_summary(report_id)
        
        return Response(VulnerabilityFindingSerializer(finding).data, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Failed to create vulnerability finding'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
def update_finding_view(request, finding_id):
    user = request.user
    if user.role != 'tester':
        return Response({'error': 'Only testers can update vulnerability findings'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        finding = VulnerabilityFinding.objects.get(id=finding_id)
    except VulnerabilityFinding.DoesNotExist:
        return Response({'error': 'Finding not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = VulnerabilityFindingSerializer(finding, data=request.data, partial=True)
    if serializer.is_valid():
        updated_finding = serializer.save()
        
        # Update report findings summary
        update_report_findings_summary(finding.report.id)
        
        return Response(VulnerabilityFindingSerializer(updated_finding).data)
    
    return Response({'error': 'Failed to update vulnerability finding'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_finding_view(request, finding_id):
    user = request.user
    if user.role != 'tester':
        return Response({'error': 'Only testers can delete vulnerability findings'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        finding = VulnerabilityFinding.objects.get(id=finding_id)
        report_id = finding.report.id
        finding.delete()
        
        # Update report findings summary
        update_report_findings_summary(report_id)
        
        return Response({'message': 'Vulnerability finding deleted successfully'})
    except VulnerabilityFinding.DoesNotExist:
        return Response({'error': 'Finding not found'}, status=status.HTTP_404_NOT_FOUND)

def update_report_findings_summary(report_id):
    """Update report findings summary after finding changes"""
    try:
        report = Report.objects.get(id=report_id)
        findings = VulnerabilityFinding.objects.filter(report=report)
        
        severity_breakdown = {
            'critical': findings.filter(severity='Critical').count(),
            'high': findings.filter(severity='High').count(),
            'medium': findings.filter(severity='Medium').count(),
            'low': findings.filter(severity='Low').count(),
            'info': findings.filter(severity='Info').count()
        }
        
        total_findings = findings.count()
        
        # Determine overall risk rating based on severity breakdown
        overall_risk_rating = 'Good'
        if severity_breakdown['critical'] > 0:
            overall_risk_rating = 'Critical'
        elif severity_breakdown['high'] > 0:
            overall_risk_rating = 'Not Good'
        elif severity_breakdown['medium'] > 2:
            overall_risk_rating = 'Not Good'
        
        report.total_findings = total_findings
        report.severity_breakdown = severity_breakdown
        report.overall_risk_rating = overall_risk_rating
        report.save()
        
    except Report.DoesNotExist:
        pass

# User Management (Admin+ only)
@api_view(['GET'])
def all_users_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    users = User.objects.all().order_by('created_at')
    users_data = []
    for user in users:
        user_data = UserSerializer(user).data
        # Remove password from response
        users_data.append(user_data)
    
    return Response(users_data)

@api_view(['PATCH'])
def update_user_view(request, user_id):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        updated_user = serializer.save()
        user_data = UserSerializer(updated_user).data
        return Response(user_data)
    
    return Response({'error': 'Failed to update user'}, status=status.HTTP_400_BAD_REQUEST)

# Dashboard Views
@api_view(['GET'])
def dashboard_superadmin_view(request):
    if request.user.role != 'superadmin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all data
    users = User.objects.all()
    logs = ApiLog.objects.all().order_by('-timestamp')[:10]
    statuses = SystemStatus.objects.all()
    assets = Asset.objects.all()
    reports = Report.objects.all()
    
    # Get recent activity from activity logs
    recent_activity_logs = ActivityLog.objects.select_related('user').order_by('-created_at')[:10]
    
    # Get active users based on recent sessions (last 24 hours)
    last_24_hours = timezone.now() - timedelta(hours=24)
    active_user_sessions = UserSession.objects.filter(
        login_time__gte=last_24_hours,
        is_active=True
    ).values_list('user_id', flat=True).distinct()
    
    # Calculate various metrics
    total_users = users.count()
    active_users = len(active_user_sessions)
    total_assets = assets.count()
    pending_tasks = assets.filter(assigned_tester__isnull=True).count()
    total_reports = reports.count()
    pending_reports = reports.filter(current_status='Draft').count()
    security_alerts = reports.filter(overall_risk_rating='Critical').count()
    
    # User distribution by role
    users_by_role = {}
    for user in users:
        role = user.role
        users_by_role[role] = users_by_role.get(role, 0) + 1
    
    # System health summary
    system_health_score = 100
    if statuses.exists():
        healthy_count = statuses.filter(status='healthy').count()
        total_count = statuses.count()
        system_health_score = (healthy_count / total_count) * 100
    
    # Format recent activity
    recent_activity = []
    for activity in recent_activity_logs:
        recent_activity.append({
            'id': activity.id,
            'description': f"{activity.user.username if activity.user else 'Unknown'} {activity.action} {activity.activity_type}",
            'timestamp': activity.created_at,
            'type': activity.activity_type,
            'user': activity.user.username if activity.user else 'Unknown'
        })
    
    return Response({
        'totalUsers': total_users,
        'activeUsers': active_users,
        'totalAssets': total_assets,
        'pendingTasks': pending_tasks,
        'totalReports': total_reports,
        'pendingReports': pending_reports,
        'securityAlerts': security_alerts,
        'systemHealthScore': system_health_score,
        'usersByRole': users_by_role,
        'recentActivity': recent_activity,
        'systemHealth': SystemStatusSerializer(statuses, many=True).data,
        'recentLogs': ApiLogSerializer(logs, many=True).data
    })

@api_view(['GET'])
def dashboard_admin_view(request):
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    statuses = SystemStatus.objects.all()
    assets = Asset.objects.all()
    reports = Report.objects.all()
    
    # Get users created by this admin + assigned users
    assigned_user_ids = UserAssignment.objects.filter(assignee=request.user).values_list('assigned_user_id', flat=True)
    created_user_ids = UserRelationship.objects.filter(creator=request.user).values_list('created_user_id', flat=True)
    
    # Combine and deduplicate users
    all_team_member_ids = set(list(assigned_user_ids) + list(created_user_ids))
    unique_team_members = User.objects.filter(id__in=all_team_member_ids)
    
    # Get active users based on recent sessions (last 24 hours)
    last_24_hours = timezone.now() - timedelta(hours=24)
    active_user_sessions = UserSession.objects.filter(
        login_time__gte=last_24_hours,
        is_active=True,
        user_id__in=all_team_member_ids
    ).values_list('user_id', flat=True).distinct()
    
    # Get recent activity
    recent_activity_logs = ActivityLog.objects.filter(
        user_id__in=all_team_member_ids
    ).select_related('user').order_by('-created_at')[:10]
    
    total_users = unique_team_members.count()
    active_users = len(active_user_sessions)
    total_assets = assets.count()
    pending_tasks = assets.filter(assigned_tester__isnull=True).count()
    total_reports = reports.count()
    team_members = unique_team_members.filter(role__in=['team-leader', 'tester', 'client-admin', 'client-user'])
    
    system_health_score = 100
    if statuses.exists():
        healthy_count = statuses.filter(status='healthy').count()
        total_count = statuses.count()
        system_health_score = (healthy_count / total_count) * 100
    
    # Format recent activity
    recent_activity = []
    for activity in recent_activity_logs:
        recent_activity.append({
            'id': activity.id,
            'description': f"{activity.user.username if activity.user else 'Unknown'} {activity.action} {activity.activity_type}",
            'timestamp': activity.created_at,
            'type': activity.activity_type,
            'user': activity.user.username if activity.user else 'Unknown'
        })
    
    return Response({
        'totalUsers': total_users,
        'activeUsers': active_users,
        'totalAssets': total_assets,
        'pendingTasks': pending_tasks,
        'totalReports': total_reports,
        'teamMembersCount': team_members.count(),
        'systemHealthScore': system_health_score,
        'recentActivity': recent_activity,
        'systemHealth': SystemStatusSerializer(statuses, many=True).data,
        'teamMembers': UserSerializer(team_members, many=True).data
    })

@api_view(['GET'])
def dashboard_team_leader_view(request):
    if request.user.role != 'team-leader':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    users = User.objects.all()
    assets = Asset.objects.all()
    reports = Report.objects.all()
    
    # Get tasks assigned to this team leader
    my_tasks = Asset.objects.filter(assigned_to=request.user)
    
    # Get recent activity
    assigned_user_ids = UserAssignment.objects.filter(assignee=request.user).values_list('assigned_user_id', flat=True)
    created_user_ids = UserRelationship.objects.filter(creator=request.user).values_list('created_user_id', flat=True)
    
    # Combine and deduplicate users
    all_team_member_ids = set(list(assigned_user_ids) + list(created_user_ids))
    unique_team_members = User.objects.filter(id__in=all_team_member_ids)
    
    # Get active users based on recent sessions (last 24 hours)
    last_24_hours = timezone.now() - timedelta(hours=24)
    active_user_sessions = UserSession.objects.filter(
        login_time__gte=last_24_hours,
        is_active=True,
        user_id__in=all_team_member_ids
    ).values_list('user_id', flat=True).distinct()
    
    recent_activity_logs = ActivityLog.objects.filter(
        user_id__in=all_team_member_ids
    ).select_related('user').order_by('-created_at')[:10]
    
    assigned_tasks = my_tasks.count()
    completed_tasks = my_tasks.filter(assignments__status='completed').count()
    pending_tasks = my_tasks.filter(Q(assignments__status='pending') | Q(assignments__status='in-progress')).count()
    total_reports = reports.count()
    
    # Format recent activity
    recent_activity = []
    for activity in recent_activity_logs:
        recent_activity.append({
            'id': activity.id,
            'description': f"{activity.user.username if activity.user else 'Unknown'} {activity.action} {activity.activity_type}",
            'timestamp': activity.created_at,
            'type': activity.activity_type,
            'user': activity.user.username if activity.user else 'Unknown'
        })
    
    return Response({
        'teamSize': unique_team_members.count(),
        'activeTeamMembers': len(active_user_sessions),
        'assignedTasks': assigned_tasks,
        'completedTasks': completed_tasks,
        'pendingTasks': pending_tasks,
        'totalReports': total_reports,
        'recentActivity': recent_activity,
        'teamMembers': UserSerializer(unique_team_members, many=True).data
    })

@api_view(['GET'])
def dashboard_tester_view(request):
    if request.user.role != 'tester':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    assets = Asset.objects.all()
    reports = Report.objects.all()
    
    # Get tasks assigned to this tester
    my_assigned_tasks = Asset.objects.filter(assigned_tester=request.user)
    
    # Get recent activity for this user
    recent_activity_logs = ActivityLog.objects.filter(
        user=request.user
    ).order_by('-created_at')[:10]
    
    assigned_tasks = my_assigned_tasks.count()
    completed_tasks = my_assigned_tasks.filter(assignments__status='completed').count()
    pending_tasks = my_assigned_tasks.filter(Q(assignments__status='pending') | Q(assignments__status='in-progress')).count()
    total_reports = reports.filter(created_by=request.user).count()
    test_cases_run = reports.filter(created_by=request.user, report_title__icontains='Penetration Test').count()
    bugs_found = reports.filter(created_by=request.user, overall_risk_rating='Critical').count()
    
    test_coverage = round((completed_tasks / assigned_tasks) * 100) if assigned_tasks > 0 else 0
    
    # Format recent activity
    recent_activity = []
    for activity in recent_activity_logs:
        recent_activity.append({
            'id': activity.id,
            'description': f"{activity.user.username if activity.user else 'Unknown'} {activity.action} {activity.activity_type}",
            'timestamp': activity.created_at,
            'type': activity.activity_type,
            'user': activity.user.username if activity.user else 'Unknown'
        })
    
    # Format assigned tasks details
    assigned_tasks_details = []
    for task in my_assigned_tasks:
        assigned_tasks_details.append({
            'id': task.id,
            'projectName': task.project_name,
            'status': 'Pending',  # Default status
            'assignedAt': task.assigned_tester_at,
            'client': task.project_owner.username if task.project_owner else 'Unknown'
        })
    
    return Response({
        'assignedTasks': assigned_tasks,
        'completedTasks': completed_tasks,
        'pendingTasks': pending_tasks,
        'totalReports': total_reports,
        'testCasesRun': test_cases_run,
        'bugsFound': bugs_found,
        'testCoverage': test_coverage,
        'recentActivity': recent_activity,
        'assignedTasksDetails': assigned_tasks_details
    })

@api_view(['GET'])
def dashboard_client_user_view(request):
    if request.user.role != 'client-user':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    assets = Asset.objects.all()
    reports = Report.objects.all()
    
    # Get assets assigned to this client user
    my_assets = ClientTeamAssignment.objects.filter(
        client_team_member=request.user,
        status='Active'
    ).select_related('asset')
    
    # Get recent activity for this user
    recent_activity_logs = ActivityLog.objects.filter(
        user=request.user
    ).order_by('-created_at')[:10]
    
    assigned_assets = my_assets.count()
    completed_assets = my_assets.filter(asset__assignments__status='completed').count()
    pending_assets = my_assets.filter(asset__assignments__status__in=['pending', 'in-progress']).count()
    
    asset_ids = [assignment.asset.id for assignment in my_assets]
    my_reports = reports.filter(associated_asset_id__in=asset_ids)
    
    completion_rate = round((completed_assets / assigned_assets) * 100) if assigned_assets > 0 else 0
    
    # Format recent activity
    recent_activity = []
    for activity in recent_activity_logs:
        recent_activity.append({
            'id': activity.id,
            'description': f"{activity.user.username if activity.user else 'Unknown'} {activity.action} {activity.activity_type}",
            'timestamp': activity.created_at,
            'type': activity.activity_type,
            'user': activity.user.username if activity.user else 'Unknown'
        })
    
    # Format my assets
    my_assets_details = []
    for assignment in my_assets:
        my_assets_details.append({
            'id': assignment.asset.id,
            'projectName': assignment.asset.project_name,
            'status': 'Pending',  # Default status
            'assignedAt': assignment.assigned_at,
            'clientName': assignment.asset.project_owner.username if assignment.asset.project_owner else 'Unknown'
        })
    
    return Response({
        'assignedAssets': assigned_assets,
        'completedAssets': completed_assets,
        'pendingAssets': pending_assets,
        'totalReports': my_reports.count(),
        'completionRate': completion_rate,
        'recentActivity': recent_activity,
        'myAssets': my_assets_details
    })

# Client Team Assignment Views
@api_view(['GET'])
def client_team_members_view(request):
    if request.user.role != 'client-admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get client team members (client-user role) created by this admin
    created_relationships = UserRelationship.objects.filter(
        creator=request.user,
        created_user__role='client-user'
    ).select_related('created_user')
    
    assigned_assignments = UserAssignment.objects.filter(
        assignee=request.user,
        assigned_user__role='client-user'
    ).select_related('assigned_user')
    
    # Combine and deduplicate
    client_team_member_ids = set()
    client_team_members = []
    
    for rel in created_relationships:
        if rel.created_user.id not in client_team_member_ids:
            client_team_members.append(rel.created_user)
            client_team_member_ids.add(rel.created_user.id)
    
    for assignment in assigned_assignments:
        if assignment.assigned_user.id not in client_team_member_ids:
            client_team_members.append(assignment.assigned_user)
            client_team_member_ids.add(assignment.assigned_user.id)
    
    return Response(UserSerializer(client_team_members, many=True).data)

@api_view(['POST'])
def assign_asset_to_client_team_view(request, asset_id):
    if request.user.role != 'client-admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    client_team_member_id = request.data.get('clientTeamMemberId')
    if not client_team_member_id:
        return Response({'error': 'Client team member ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        asset = Asset.objects.get(id=asset_id)
        client_team_member = User.objects.get(id=client_team_member_id)
    except (Asset.DoesNotExist, User.DoesNotExist):
        return Response({'error': 'Asset or client team member not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if assignment already exists
    existing_assignment = ClientTeamAssignment.objects.filter(
        asset=asset,
        client_team_member=client_team_member,
        status='Active'
    ).exists()
    
    if not existing_assignment:
        ClientTeamAssignment.objects.create(
            asset=asset,
            client_team_member=client_team_member,
            assigned_by=request.user,
            status='Active'
        )
    
    return Response({'message': 'Asset assigned to client team successfully'})

@api_view(['DELETE'])
def unassign_asset_from_client_team_view(request, asset_id):
    if request.user.role != 'client-admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    client_team_member_id = request.data.get('clientTeamMemberId')
    if not client_team_member_id:
        return Response({'error': 'Client team member ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    ClientTeamAssignment.objects.filter(
        asset_id=asset_id,
        client_team_member_id=client_team_member_id
    ).update(status='Inactive')
    
    return Response({'message': 'Asset unassigned from client team successfully'})

@api_view(['GET'])
def my_client_team_assets_view(request):
    if request.user.role != 'client-user':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    assigned_assets = ClientTeamAssignment.objects.filter(
        client_team_member=request.user,
        status='Active'
    ).select_related('asset', 'asset__project_owner', 'assigned_by')
    
    assets_data = []
    for assignment in assigned_assets:
        asset_data = AssetSerializer(assignment.asset).data
        asset_data['assignment'] = {
            'id': assignment.id,
            'assignedAt': assignment.assigned_at,
            'status': assignment.status,
            'notes': assignment.notes
        }
        asset_data['assignedBy'] = UserSerializer(assignment.assigned_by).data if assignment.assigned_by else None
        assets_data.append(asset_data)
    
    return Response(assets_data)

@api_view(['GET'])
def client_team_assignments_view(request, asset_id):
    if request.user.role != 'client-admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    assignments = ClientTeamAssignment.objects.filter(
        asset_id=asset_id,
        status='Active'
    ).select_related('client_team_member', 'assigned_by')
    
    assignments_data = []
    for assignment in assignments:
        assignment_data = {
            'id': assignment.id,
            'assetId': assignment.asset.id,
            'clientTeamMemberId': assignment.client_team_member.id,
            'assignedById': assignment.assigned_by.id,
            'assignedAt': assignment.assigned_at,
            'status': assignment.status,
            'notes': assignment.notes,
            'clientTeamMember': UserSerializer(assignment.client_team_member).data,
            'assignedBy': UserSerializer(assignment.assigned_by).data
        }
        assignments_data.append(assignment_data)
    
    return Response(assignments_data)

# Report Notes Views
@api_view(['POST'])
def create_report_note_view(request, report_id):
    if request.user.role != 'client-user':
        return Response({'error': 'Only client team members can create notes'}, status=status.HTTP_403_FORBIDDEN)
    
    note_content = request.data.get('noteContent')
    asset_id = request.data.get('assetId')
    
    if not note_content or not asset_id:
        return Response({'error': 'Note content and asset ID are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    note_data = {
        'report': report_id,
        'asset': asset_id,
        'author': request.user.id,
        'note_content': note_content,
        'note_type': request.data.get('noteType', 'Review'),
        'priority': request.data.get('priority', 'Medium'),
        'status': 'Open'
    }
    
    serializer = ReportNoteSerializer(data=note_data)
    if serializer.is_valid():
        note = serializer.save()
        return Response(ReportNoteSerializer(note).data, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Failed to create report note'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def report_notes_view(request, report_id):
    notes = ReportNote.objects.filter(report_id=report_id).select_related('author').order_by('-created_at')
    notes_data = []
    
    for note in notes:
        note_data = ReportNoteSerializer(note).data
        note_data['author'] = UserSerializer(note.author).data
        notes_data.append(note_data)
    
    return Response(notes_data)

@api_view(['GET'])
def asset_notes_view(request, asset_id):
    notes = ReportNote.objects.filter(asset_id=asset_id).select_related('author').order_by('-created_at')
    notes_data = []
    
    for note in notes:
        note_data = ReportNoteSerializer(note).data
        note_data['author'] = UserSerializer(note.author).data
        notes_data.append(note_data)
    
    return Response(notes_data)

@api_view(['PATCH'])
def update_note_view(request, note_id):
    try:
        note = ReportNote.objects.get(id=note_id)
    except ReportNote.DoesNotExist:
        return Response({'error': 'Note not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only the author can update their own notes
    if note.author != request.user:
        return Response({'error': 'You can only update your own notes'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = ReportNoteSerializer(note, data=request.data, partial=True)
    if serializer.is_valid():
        updated_note = serializer.save()
        return Response(ReportNoteSerializer(updated_note).data)
    
    return Response({'error': 'Failed to update note'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_note_view(request, note_id):
    try:
        note = ReportNote.objects.get(id=note_id)
    except ReportNote.DoesNotExist:
        return Response({'error': 'Note not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only the author can delete their own notes
    if note.author != request.user:
        return Response({'error': 'You can only delete your own notes'}, status=status.HTTP_403_FORBIDDEN)
    
    note.delete()
    return Response({'message': 'Note deleted successfully'})

# Activity Logging API Endpoints
@api_view(['GET'])
def activity_logs_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    start_date = request.GET.get('startDate')
    end_date = request.GET.get('endDate')
    user_id = request.GET.get('userId')
    activity_type = request.GET.get('activityType')
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    
    # Get activity logs with hierarchy filtering
    logs = ActivityLog.objects.all()
    
    # Apply role-based filtering
    if request.user.role != 'superadmin':
        # For non-superadmin users, they can only see activities of users they created or are assigned to them
        subordinate_ids = get_subordinate_ids(request.user.id)
        if subordinate_ids:
            logs = logs.filter(user_id__in=subordinate_ids)
        else:
            # If no subordinates, only show their own activities
            logs = logs.filter(user=request.user)
    
    # Apply additional filters
    if start_date:
        logs = logs.filter(created_at__gte=start_date)
    if end_date:
        logs = logs.filter(created_at__lte=end_date)
    if user_id:
        logs = logs.filter(user_id=user_id)
    if activity_type:
        logs = logs.filter(activity_type=activity_type)
    
    logs = logs.select_related('user').order_by('-created_at')[offset:offset+limit]
    
    logs_data = []
    for log in logs:
        log_data = ActivityLogSerializer(log).data
        log_data['user'] = UserSerializer(log.user).data if log.user else None
        logs_data.append(log_data)
    
    return Response(logs_data)

@api_view(['GET'])
def user_sessions_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    start_date = request.GET.get('startDate')
    end_date = request.GET.get('endDate')
    user_id = request.GET.get('userId')
    is_active = request.GET.get('isActive')
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    
    sessions = UserSession.objects.all()
    
    # Apply role-based filtering
    if request.user.role != 'superadmin':
        subordinate_ids = get_subordinate_ids(request.user.id)
        if subordinate_ids:
            sessions = sessions.filter(user_id__in=subordinate_ids)
        else:
            sessions = sessions.filter(user=request.user)
    
    # Apply additional filters
    if start_date:
        sessions = sessions.filter(login_time__gte=start_date)
    if end_date:
        sessions = sessions.filter(login_time__lte=end_date)
    if user_id:
        sessions = sessions.filter(user_id=user_id)
    if is_active is not None:
        sessions = sessions.filter(is_active=is_active.lower() == 'true')
    
    sessions = sessions.select_related('user').order_by('-login_time')[offset:offset+limit]
    
    sessions_data = []
    for session in sessions:
        session_data = UserSessionSerializer(session).data
        session_data['user'] = UserSerializer(session.user).data
        sessions_data.append(session_data)
    
    return Response(sessions_data)

@api_view(['GET'])
def asset_activity_logs_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    asset_id = request.GET.get('assetId')
    start_date = request.GET.get('startDate')
    end_date = request.GET.get('endDate')
    user_id = request.GET.get('userId')
    activity_type = request.GET.get('activityType')
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    
    logs = AssetActivityLog.objects.all()
    
    # Apply role-based filtering
    if request.user.role != 'superadmin':
        subordinate_ids = get_subordinate_ids(request.user.id)
        if subordinate_ids:
            logs = logs.filter(user_id__in=subordinate_ids)
        else:
            logs = logs.filter(user=request.user)
    
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
    
    logs = logs.select_related('user', 'asset').order_by('-created_at')[offset:offset+limit]
    
    logs_data = []
    for log in logs:
        log_data = AssetActivityLogSerializer(log).data
        log_data['user'] = UserSerializer(log.user).data
        log_data['asset'] = AssetSerializer(log.asset).data
        logs_data.append(log_data)
    
    return Response(logs_data)

@api_view(['GET'])
def activity_summary_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    start_date = request.GET.get('startDate')
    end_date = request.GET.get('endDate')
    
    # Base date range (last 24 hours if not specified)
    end_datetime = timezone.now()
    if end_date:
        end_datetime = timezone.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    start_datetime = end_datetime - timedelta(hours=24)
    if start_date:
        start_datetime = timezone.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    # Get subordinate IDs for filtering
    subordinate_ids = []
    if request.user.role != 'superadmin':
        subordinate_ids = get_subordinate_ids(request.user.id)
    
    # Build filter for user filtering
    activity_logs = ActivityLog.objects.filter(
        created_at__gte=start_datetime,
        created_at__lte=end_datetime
    )
    
    if request.user.role != 'superadmin':
        if subordinate_ids:
            activity_logs = activity_logs.filter(user_id__in=subordinate_ids)
        else:
            activity_logs = activity_logs.filter(user=request.user)
    
    # Get activity counts by type
    activity_counts = {}
    for log in activity_logs:
        activity_type = log.activity_type
        activity_counts[activity_type] = activity_counts.get(activity_type, 0) + 1
    
    # Get active sessions count
    active_sessions = UserSession.objects.filter(is_active=True)
    if request.user.role != 'superadmin':
        if subordinate_ids:
            active_sessions = active_sessions.filter(user_id__in=subordinate_ids)
        else:
            active_sessions = active_sessions.filter(user=request.user)
    
    active_sessions_count = active_sessions.count()
    
    # Get recent activities
    recent_activities = activity_logs.select_related('user').order_by('-created_at')[:10]
    recent_activities_data = []
    for activity in recent_activities:
        recent_activities_data.append({
            'id': activity.id,
            'userId': activity.user.id if activity.user else None,
            'activityType': activity.activity_type,
            'action': activity.action,
            'resourceType': activity.resource_type,
            'resourceId': activity.resource_id,
            'resourceName': activity.resource_name,
            'details': activity.details,
            'ipAddress': activity.ip_address,
            'userAgent': activity.user_agent,
            'sessionId': activity.session_id,
            'createdAt': activity.created_at,
            'user': UserSerializer(activity.user).data if activity.user else None
        })
    
    # Format activity counts for response
    activity_counts_list = [
        {'activityType': k, 'count': v} for k, v in activity_counts.items()
    ]
    
    return Response({
        'activityCounts': activity_counts_list,
        'activeSessions': active_sessions_count,
        'recentActivities': recent_activities_data,
        'dateRange': {
            'start': start_datetime,
            'end': end_datetime
        }
    })

def get_subordinate_ids(user_id):
    """Helper method to get subordinate user IDs based on hierarchy"""
    try:
        # Get direct subordinates
        direct_subordinates = UserRelationship.objects.filter(creator_id=user_id).values_list('created_user_id', flat=True)
        assigned_subordinates = UserAssignment.objects.filter(assignee_id=user_id).values_list('assigned_user_id', flat=True)
        
        # Combine and return unique IDs
        subordinate_ids = list(set(list(direct_subordinates) + list(assigned_subordinates)))
        return subordinate_ids
    except:
        return []

# Profile Management
@api_view(['PATCH'])
def update_profile_view(request):
    first_name = request.data.get('firstName')
    last_name = request.data.get('lastName')
    email = request.data.get('email')
    
    # Check if email is already taken by another user
    if email and email != request.user.email:
        if User.objects.filter(email=email).exclude(id=request.user.id).exists():
            return Response({'error': 'Email already in use'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update user
    user = request.user
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if email:
        user.email = email
    user.save()
    
    # Log the activity
    ActivityLogger.log_activity(
        user=user,
        activity_type=ActivityTypes.USER_MANAGEMENT,
        action=Actions.UPDATE,
        details={'target': 'profile', 'updatedFields': {'firstName': first_name, 'lastName': last_name, 'email': email}},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request)
    )
    
    return Response({'user': UserSerializer(user).data})

@api_view(['POST'])
def change_password_view(request):
    current_password = request.data.get('currentPassword')
    new_password = request.data.get('newPassword')
    
    if not current_password or not new_password:
        return Response({'error': 'Current password and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify current password
    if not request.user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update password
    request.user.set_password(new_password)
    request.user.save()
    
    # Log the activity
    ActivityLogger.log_activity(
        user=request.user,
        activity_type=ActivityTypes.AUTH,
        action=Actions.UPDATE,
        details={'target': 'password_change'},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request)
    )
    
    return Response({'message': 'Password updated successfully'})

# Access Control Endpoints
@api_view(['GET'])
def access_control_users_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.user.role == 'superadmin':
        # Super admin can see all users
        users = User.objects.all()
    else:
        # Admin can see only users they created
        created_user_ids = UserRelationship.objects.filter(creator=request.user).values_list('created_user_id', flat=True)
        users = User.objects.filter(id__in=created_user_ids)
    
    # Remove password from response
    users_data = []
    for user in users:
        user_data = UserSerializer(user).data
        users_data.append(user_data)
    
    return Response(users_data)

@api_view(['POST'])
def revoke_user_access_view(request, user_id):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if request.user.role == 'admin':
        # Admin can only revoke access for users they created
        if not UserRelationship.objects.filter(creator=request.user, created_user=target_user).exists():
            return Response({'error': 'You can only revoke access for users you created'}, status=status.HTTP_403_FORBIDDEN)
    
    # Revoke access
    target_user.is_active = False
    target_user.save()
    
    # Log the activity
    ActivityLogger.log_activity(
        user=request.user,
        activity_type=ActivityTypes.USER_MANAGEMENT,
        action=Actions.UPDATE,
        details={
            'target': 'access_revoked',
            'targetUserId': user_id,
            'targetUsername': target_user.username
        },
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request)
    )
    
    return Response({'message': 'User access revoked successfully'})

@api_view(['POST'])
def restore_user_access_view(request, user_id):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if request.user.role == 'admin':
        # Admin can only restore access for users they created
        if not UserRelationship.objects.filter(creator=request.user, created_user=target_user).exists():
            return Response({'error': 'You can only restore access for users you created'}, status=status.HTTP_403_FORBIDDEN)
    
    # Restore access
    target_user.is_active = True
    target_user.save()
    
    # Log the activity
    ActivityLogger.log_activity(
        user=request.user,
        activity_type=ActivityTypes.USER_MANAGEMENT,
        action=Actions.UPDATE,
        details={
            'target': 'access_restored',
            'targetUserId': user_id,
            'targetUsername': target_user.username
        },
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request)
    )
    
    return Response({'message': 'User access restored successfully'})

# Consultation Request Views (Public)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def consultation_request_view(request):
    serializer = ConsultationRequestSerializer(data=request.data)
    if serializer.is_valid():
        consultation = serializer.save()
        return Response({
            'message': 'Consultation request submitted successfully',
            'id': consultation.id
        }, status=status.HTTP_201_CREATED)
    
    return Response({'error': 'Failed to submit consultation request'}, status=status.HTTP_400_BAD_REQUEST)

# Admin only routes for consultation requests
@api_view(['GET'])
def consultation_requests_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    requests = ConsultationRequest.objects.all().order_by('-created_at')
    return Response(ConsultationRequestSerializer(requests, many=True).data)

@api_view(['GET'])
def consultation_request_detail_view(request, request_id):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        consultation_request = ConsultationRequest.objects.get(id=request_id)
    except ConsultationRequest.DoesNotExist:
        return Response({'error': 'Consultation request not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response(ConsultationRequestSerializer(consultation_request).data)

@api_view(['GET'])
def audit_trail_view(request):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    resource = request.GET.get('resource')
    action = request.GET.get('action')
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))

    audit_entries = AuditTrail.objects.all()

    # Apply role-based filtering
    if request.user.role != 'superadmin':
        subordinate_ids = get_subordinate_ids(request.user.id)
        if subordinate_ids:
            audit_entries = audit_entries.filter(user_id__in=subordinate_ids)
        else:
            audit_entries = audit_entries.filter(user=request.user)

    # Apply additional filters
    if resource:
        audit_entries = audit_entries.filter(resource=resource)
    if action:
        audit_entries = audit_entries.filter(action=action)

    audit_entries = audit_entries.select_related('user').order_by('-timestamp')[offset:offset+limit]

    audit_data = []
    for entry in audit_entries:
        entry_data = AuditTrailSerializer(entry).data
        if entry.user:
            entry_data['user'] = UserSerializer(entry.user).data
        audit_data.append(entry_data)

    return Response(audit_data)

@api_view(['PATCH'])
def update_consultation_request_status_view(request, request_id):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    status_value = request.data.get('status')
    notes = request.data.get('notes')
    
    if status_value not in ['pending', 'approved', 'under-review', 'rejected']:
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        consultation_request = ConsultationRequest.objects.get(id=request_id)
    except ConsultationRequest.DoesNotExist:
        return Response({'error': 'Consultation request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    consultation_request.status = status_value
    consultation_request.status_updated_by = request.user
    consultation_request.status_updated_at = timezone.now()
    if notes:
        consultation_request.notes = notes
    consultation_request.save()
    
    return Response(ConsultationRequestSerializer(consultation_request).data)

@api_view(['DELETE'])
def delete_consultation_request_view(request, request_id):
    if request.user.role_hierarchy_level < 5:  # admin+
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        consultation_request = ConsultationRequest.objects.get(id=request_id)
        consultation_request.delete()
        return Response({'message': 'Consultation request deleted successfully'})
    except ConsultationRequest.DoesNotExist:
        return Response({'error': 'Consultation request not found'}, status=status.HTTP_404_NOT_FOUND)

# PDF Report Generation
@api_view(['GET'])
def generate_report_pdf_view(request, report_id):
    try:
        report = Report.objects.select_related('associated_asset', 'created_by').get(id=report_id)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user = request.user
    user_role = user.role
    
    # Role-based access control for PDF downloads
    has_access = False
    
    if user_role in ['superadmin', 'admin']:
        has_access = True
    elif user_role == 'team-leader':
        # Team leaders can access reports for assets they've assigned
        asset = report.associated_asset
        has_access = asset.assigned_by == user
    elif user_role == 'tester':
        # Testers can access reports they created
        has_access = report.created_by == user
    elif user_role in ['client-admin', 'client-user']:
        # Client users can access reports for their assets
        asset = report.associated_asset
        has_access = asset.project_owner == user
    
    if not has_access:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Generate PDF using the PDF generator
        pdf_generator = PDFReportGenerator()
        
        # Get vulnerability findings
        findings = VulnerabilityFinding.objects.filter(report=report)
        
        # Get users (tester, reviewer, project owner)
        users = {
            'tester': report.created_by,
            'reviewer': {'username': report.reviewed_by, 'first_name': '', 'last_name': ''} if report.reviewed_by else None,
            'projectOwner': report.associated_asset.project_owner
        }
        
        pdf_buffer = pdf_generator.generate_report(report, report.associated_asset, findings, users)
        
        # Log PDF download
        ActivityLogger.log_activity(
            user=user,
            activity_type=ActivityTypes.REPORT_MANAGEMENT,
            action=Actions.VIEW,
            resource_type='report-pdf',
            resource_id=report_id,
            details={'reportId': report_id, 'userRole': user_role},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request)
        )
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Security_Report_{report_id}.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': 'Failed to generate PDF report'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Test endpoint
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def test_view(request):
    # Log API call
    ApiLog.objects.create(
        method="POST",
        endpoint="/api/test",
        status_code=200,
        response_time=30
    )
    
    return Response({
        'message': 'Frontend-Backend communication successful',
        'timestamp': timezone.now().isoformat(),
        'data': request.data
    })
