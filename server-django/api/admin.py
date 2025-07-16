from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import *

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role',)}),
    )

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'asset_name', 'asset_type', 'environment', 'project_owner', 'created_by', 'created_at')
    list_filter = ('asset_type', 'environment', 'plan_tier', 'created_at')
    search_fields = ('project_name', 'asset_name', 'project_owner__username')
    ordering = ('-created_at',)

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('report_title', 'associated_asset', 'current_status', 'overall_risk_rating', 'created_by', 'created_at')
    list_filter = ('current_status', 'overall_risk_rating', 'created_at')
    search_fields = ('report_title', 'associated_asset__project_name')
    ordering = ('-created_at',)

@admin.register(VulnerabilityFinding)
class VulnerabilityFindingAdmin(admin.ModelAdmin):
    list_display = ('vulnerability_title', 'severity', 'report', 'vulnerability_status', 'created_at')
    list_filter = ('severity', 'vulnerability_status', 'created_at')
    search_fields = ('vulnerability_title', 'finding_id')
    ordering = ('-created_at',)

@admin.register(SystemStatus)
class SystemStatusAdmin(admin.ModelAdmin):
    list_display = ('component', 'status', 'last_checked')
    list_filter = ('status', 'last_checked')
    search_fields = ('component',)

@admin.register(ApiLog)
class ApiLogAdmin(admin.ModelAdmin):
    list_display = ('method', 'endpoint', 'status_code', 'response_time', 'timestamp')
    list_filter = ('method', 'status_code', 'timestamp')
    search_fields = ('endpoint',)
    ordering = ('-timestamp',)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'activity_type', 'action', 'resource_type', 'created_at')
    list_filter = ('activity_type', 'action', 'created_at')
    search_fields = ('user__username', 'resource_name')
    ordering = ('-created_at',)

@admin.register(ConsultationRequest)
class ConsultationRequestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'service', 'status', 'created_at')
    list_filter = ('service', 'status', 'created_at')
    search_fields = ('full_name', 'email', 'company')
    ordering = ('-created_at',)
