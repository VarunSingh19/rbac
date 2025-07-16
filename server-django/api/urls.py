from django.urls import path, include
from . import views

urlpatterns = [
    # Authentication routes
    path('auth/me', views.current_user_view, name='current_user'),
    path('auth/login', views.login_view, name='login'),
    path('auth/register', views.register_view, name='register'),
    path('auth/logout', views.logout_view, name='logout'),
    path('auth/profile', views.update_profile_view, name='update_profile'),
    path('auth/change-password', views.change_password_view, name='change_password'),
    
    # User management routes
    path('users/create', views.create_user_view, name='create_user'),
    path('users/created', views.created_users_view, name='created_users'),
    path('users/hierarchy', views.user_hierarchy_view, name='user_hierarchy'),
    path('users/assigned', views.assigned_users_view, name='assigned_users'),
    path('users/assignable/<str:role>', views.assignable_users_view, name='assignable_users'),
    path('users/assignments', views.user_assignments_view, name='user_assignments'),
    path('users/assign', views.assign_user_view, name='assign_user'),
    path('users/assign', views.unassign_user_view, name='unassign_user'),
    path('users/<int:user_id>', views.delete_user_view, name='delete_user'),
    path('users', views.all_users_view, name='all_users'),
    path('users/<int:user_id>', views.update_user_view, name='update_user'),
    
    # Health and system routes
    path('health', views.health_check_view, name='health_check'),
    path('system-health', views.system_health_view, name='system_health'),
    path('status', views.system_status_view, name='system_status'),
    path('status', views.update_system_status_view, name='update_system_status'),
    path('logs', views.api_logs_view, name='api_logs'),
    
    # Asset management routes
    path('assets', views.assets_view, name='assets'),  # Combined GET and POST
    path('assets/<int:asset_id>', views.asset_detail_view, name='asset_detail'),  # Combined GET, PUT, DELETE
    path('client-admins', views.client_admins_view, name='client_admins'),
    path('team-leaders', views.team_leaders_view, name='team_leaders'),
    path('assets/<int:asset_id>/assign', views.assign_asset_to_team_leader_view, name='assign_asset_to_team_leader'),
    path('assets/<int:asset_id>/assign', views.unassign_asset_view, name='unassign_asset'),
    path('assets-detailed', views.assets_detailed_view, name='assets_detailed'),
    path('my-tasks', views.my_tasks_view, name='my_tasks'),
    path('testers', views.testers_view, name='testers'),
    path('tasks/<int:asset_id>/assign', views.assign_task_to_tester_view, name='assign_task_to_tester'),
    path('tasks/<int:asset_id>/assign', views.unassign_task_from_tester_view, name='unassign_task_from_tester'),
    path('my-assigned-tasks', views.my_assigned_tasks_view, name='my_assigned_tasks'),
    
    # Report management routes
    path('reports', views.create_report_view, name='create_report'),
    path('reports', views.reports_list_view, name='reports_list'),
    path('assets/<int:asset_id>/reports', views.asset_reports_view, name='asset_reports'),
    path('reports/<int:report_id>', views.report_detail_view, name='report_detail'),
    path('reports/<int:report_id>', views.update_report_view, name='update_report'),
    path('reports/<int:report_id>', views.delete_report_view, name='delete_report'),
    
    # Vulnerability finding routes
    path('reports/<int:report_id>/findings', views.report_findings_view, name='report_findings'),
    path('reports/<int:report_id>/findings', views.create_finding_view, name='create_finding'),
    path('findings/<int:finding_id>', views.update_finding_view, name='update_finding'),
    path('findings/<int:finding_id>', views.delete_finding_view, name='delete_finding'),
    
    # Dashboard routes
    path('dashboard/superadmin', views.dashboard_superadmin_view, name='dashboard_superadmin'),
    path('dashboard/admin', views.dashboard_admin_view, name='dashboard_admin'),
    path('dashboard/team-leader', views.dashboard_team_leader_view, name='dashboard_team_leader'),
    path('dashboard/tester', views.dashboard_tester_view, name='dashboard_tester'),
    path('dashboard/client-user', views.dashboard_client_user_view, name='dashboard_client_user'),
    
    # Client team assignment routes
    path('client-team-members', views.client_team_members_view, name='client_team_members'),
    path('assets/<int:asset_id>/assign-client-team', views.assign_asset_to_client_team_view, name='assign_asset_to_client_team'),
    path('assets/<int:asset_id>/assign-client-team', views.unassign_asset_from_client_team_view, name='unassign_asset_from_client_team'),
    path('my-client-team-assets', views.my_client_team_assets_view, name='my_client_team_assets'),
    path('assets/<int:asset_id>/client-team-assignments', views.client_team_assignments_view, name='client_team_assignments'),
    
    # Report notes routes
    path('reports/<int:report_id>/notes', views.create_report_note_view, name='create_report_note'),
    path('reports/<int:report_id>/notes', views.report_notes_view, name='report_notes'),
    path('assets/<int:asset_id>/notes', views.asset_notes_view, name='asset_notes'),
    path('notes/<int:note_id>', views.update_note_view, name='update_note'),
    path('notes/<int:note_id>', views.delete_note_view, name='delete_note'),
    
    # Activity logging routes
    path('activity-logs', views.activity_logs_view, name='activity_logs'),
    path('user-sessions', views.user_sessions_view, name='user_sessions'),
    path('asset-activity-logs', views.asset_activity_logs_view, name='asset_activity_logs'),
    path('activity-summary', views.activity_summary_view, name='activity_summary'),
    
    # Access control routes
    path('access-control/users', views.access_control_users_view, name='access_control_users'),
    path('access-control/revoke/<int:user_id>', views.revoke_user_access_view, name='revoke_user_access'),
    path('access-control/restore/<int:user_id>', views.restore_user_access_view, name='restore_user_access'),

    # Audit trail routes
    path('audit-trail', views.audit_trail_view, name='audit_trail'),
    
    # Consultation request routes
    path('consultation-request', views.consultation_request_view, name='consultation_request'),
    path('consultation-requests', views.consultation_requests_view, name='consultation_requests'),
    path('consultation-requests/<int:request_id>', views.consultation_request_detail_view, name='consultation_request_detail'),
    path('consultation-requests/<int:request_id>/status', views.update_consultation_request_status_view, name='update_consultation_request_status'),
    path('consultation-requests/<int:request_id>', views.delete_consultation_request_view, name='delete_consultation_request'),
    
    # PDF report generation
    path('reports/<int:report_id>/pdf', views.generate_report_pdf_view, name='generate_report_pdf'),
    
    # Test endpoint
    path('test', views.test_view, name='test'),
]
