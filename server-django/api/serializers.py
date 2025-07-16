from rest_framework import serializers
from .models import *

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'last_login', 'created_at', 'updated_at']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class SystemStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemStatus
        fields = '__all__'

class ApiLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiLog
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    projectOwner = UserSerializer(source='project_owner', read_only=True)
    assignedTo = UserSerializer(source='assigned_to', read_only=True)
    assignedBy = UserSerializer(source='assigned_by', read_only=True)
    assignedTester = UserSerializer(source='assigned_tester', read_only=True)
    assignedTesterBy = UserSerializer(source='assigned_tester_by', read_only=True)
    createdBy = UserSerializer(source='created_by', read_only=True)

    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'id']

class ReportSerializer(serializers.ModelSerializer):
    associatedAsset = AssetSerializer(source='associated_asset', read_only=True)
    createdBy = UserSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = Report
        fields = '__all__'

class VulnerabilityFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VulnerabilityFinding
        fields = '__all__'

class ReportNoteSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = ReportNote
        fields = '__all__'

class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = '__all__'

class UserSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserSession
        fields = '__all__'

class AssetActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    asset = AssetSerializer(read_only=True)
    
    class Meta:
        model = AssetActivityLog
        fields = '__all__'

class ConsultationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationRequest
        fields = '__all__'

class AuditTrailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditTrail
        fields = '__all__'
