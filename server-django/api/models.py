from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import json

class User(AbstractUser):
    ROLE_CHOICES = [
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('team-leader', 'Team Leader'),
        ('tester', 'Tester'),
        ('client-admin', 'Client Admin'),
        ('client-user', 'Client User'),
    ]
    
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client-user')
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    @property
    def role_hierarchy_level(self):
        hierarchy = {
            'superadmin': 6,
            'admin': 5,
            'team-leader': 4,
            'tester': 3,
            'client-admin': 2,
            'client-user': 1
        }
        return hierarchy.get(self.role, 0)

class SystemStatus(models.Model):
    component = models.CharField(max_length=100)
    status = models.CharField(max_length=50)
    last_checked = models.DateTimeField(auto_now=True)
    details = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "System Statuses"

class ApiLog(models.Model):
    method = models.CharField(max_length=10)
    endpoint = models.CharField(max_length=255)
    status_code = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    response_time = models.IntegerField(null=True, blank=True)

class UserRelationship(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_users')
    created_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creator_relationships')
    plain_password = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['creator', 'created_user']

class UserAssignment(models.Model):
    assigner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments_made')
    assigned_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments_received')
    assignee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='users_assigned_to_me')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['assigned_user', 'assignee']

class Asset(models.Model):
    ASSET_TYPE_CHOICES = [
        ('web-app', 'Web Application'),
        ('api', 'API'),
        ('mobile', 'Mobile Application'),
        ('iot', 'IoT Device'),
        ('network', 'Network Infrastructure'),
        ('other', 'Other'),
    ]
    
    ENVIRONMENT_CHOICES = [
        ('dev', 'Development'),
        ('staging', 'Staging'),
        ('prod', 'Production'),
        ('other', 'Other'),
    ]
    
    PLAN_TIER_CHOICES = [
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('advanced', 'Advanced'),
        ('custom', 'Custom'),
    ]
    
    SCAN_FREQUENCY_CHOICES = [
        ('one-time', 'One-time'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    # Basic Project Info
    project_name = models.CharField(max_length=255)
    project_owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_assets')
    project_description = models.TextField(blank=True)
    
    # Application Details
    asset_name = models.CharField(max_length=255)
    asset_url = models.URLField(blank=True)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    technology_stack = models.JSONField(default=list, blank=True)
    
    # Environment
    environment = models.CharField(max_length=20, choices=ENVIRONMENT_CHOICES)
    auth_method = models.CharField(max_length=100, blank=True)
    private_network = models.BooleanField(default=False)
    
    # Testing Configuration
    scan_frequency = models.CharField(max_length=20, choices=SCAN_FREQUENCY_CHOICES)
    preferred_test_window = models.CharField(max_length=100, blank=True)
    scope_inclusions = models.TextField(blank=True)
    scope_exclusions = models.TextField(blank=True)
    
    # Notifications
    notify_on = models.JSONField(default=list, blank=True)
    notification_emails = models.JSONField(default=list, blank=True)
    
    # Billing & SLA
    plan_tier = models.CharField(max_length=20, choices=PLAN_TIER_CHOICES)
    tests_per_month = models.IntegerField(null=True, blank=True)
    contract_expiry_date = models.DateField(null=True, blank=True)
    
    # Optional Metadata
    tags = models.JSONField(default=list, blank=True)
    supporting_docs = models.JSONField(default=list, blank=True)
    
    # Assignment
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_assets')
    assigned_at = models.DateTimeField(null=True, blank=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assets_assigned')
    
    # Tester Assignment
    assigned_tester = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tester_assignments')
    assigned_tester_at = models.DateTimeField(null=True, blank=True)
    assigned_tester_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tester_assignments_made')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_assets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AssetAssignment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in-progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asset_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asset_assignments_made')
    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)

class Report(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('In Review', 'In Review'),
        ('Final', 'Final'),
    ]
    
    RISK_RATING_CHOICES = [
        ('Good', 'Good'),
        ('Not Good', 'Not Good'),
        ('Critical', 'Critical'),
    ]

    # Basic Report Info
    report_title = models.CharField(max_length=255)
    associated_asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='reports')
    tester_name = models.CharField(max_length=255)
    test_start_date = models.DateField()
    test_end_date = models.DateField()
    total_test_duration = models.CharField(max_length=50, blank=True)
    executive_summary = models.TextField(blank=True)
    
    # Findings Summary
    total_findings = models.IntegerField(default=0)
    severity_breakdown = models.JSONField(default=dict, blank=True)
    overall_risk_rating = models.CharField(max_length=20, choices=RISK_RATING_CHOICES, blank=True)
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    
    # Sign-off & Distribution
    prepared_by = models.CharField(max_length=255, blank=True)
    reviewed_by = models.CharField(max_length=255, blank=True)
    report_finalized_date = models.DateField(null=True, blank=True)
    next_scheduled_test = models.DateField(null=True, blank=True)
    distribution_emails = models.JSONField(default=list, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class VulnerabilityFinding(models.Model):
    SEVERITY_CHOICES = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
        ('Info', 'Info'),
    ]
    
    IMPACT_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    
    LIKELIHOOD_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('New', 'New'),
        ('Reopened', 'Reopened'),
        ('Not Fixed', 'Not Fixed'),
        ('Fixed', 'Fixed'),
    ]

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='findings')
    finding_id = models.CharField(max_length=100, unique=True)
    vulnerability_title = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    impact = models.CharField(max_length=20, choices=IMPACT_CHOICES)
    likelihood = models.CharField(max_length=20, choices=LIKELIHOOD_CHOICES)
    category = models.CharField(max_length=100, blank=True)
    vulnerability_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New')
    number_of_occurrences = models.IntegerField(default=1)
    affected_urls = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    proof_of_concept = models.TextField(blank=True)
    recommendation = models.TextField(blank=True)
    references = models.JSONField(default=list, blank=True)
    additional_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ClientTeamAssignment(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Completed', 'Completed'),
        ('Inactive', 'Inactive'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='client_assignments')
    client_team_member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_assignments_made')
    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ReportNote(models.Model):
    NOTE_TYPE_CHOICES = [
        ('Review', 'Review'),
        ('Feedback', 'Feedback'),
        ('Question', 'Question'),
        ('Concern', 'Concern'),
    ]
    
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('Addressed', 'Addressed'),
        ('Closed', 'Closed'),
    ]

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='notes')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='authored_notes')
    note_content = models.TextField()
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='Review')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    activity_type = models.CharField(max_length=50)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.IntegerField(null=True, blank=True)
    resource_name = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_sessions')
    session_id = models.CharField(max_length=255, unique=True)
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(auto_now=True)

class AssetActivityLog(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='activity_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asset_activities')
    activity_type = models.CharField(max_length=50)
    action = models.CharField(max_length=100)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ConsultationRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('under-review', 'Under Review'),
        ('rejected', 'Rejected'),
    ]
    
    SERVICE_CHOICES = [
        ('web-app-security', 'Web App Security'),
        ('api-security', 'API Security'),
        ('mobile-app-security', 'Mobile App Security'),
        ('network-security', 'Network Security'),
        ('cloud-security', 'Cloud Security'),
        ('other', 'Other'),
    ]

    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    service = models.CharField(max_length=50, choices=SERVICE_CHOICES)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='consultation_updates')
    status_updated_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AuditTrail(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_entries')
    action = models.CharField(max_length=100)
    resource = models.CharField(max_length=100)
    resource_id = models.IntegerField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
