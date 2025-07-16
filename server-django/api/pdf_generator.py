from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from io import BytesIO
from datetime import datetime

class PDFReportGenerator:
    def __init__(self):
        self.buffer = BytesIO()
        self.doc = SimpleDocTemplate(self.buffer, pagesize=A4)
        self.styles = getSampleStyleSheet()
        self.story = []
        
        # Custom styles
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.HexColor('#1e40af')
        )
        
        self.body_style = ParagraphStyle(
            'CustomBody',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=12,
            alignment=TA_JUSTIFY
        )

    def generate_report(self, report, asset, findings, users):
        """Generate PDF report"""
        self.generate_cover_page(report, asset, users)
        self.story.append(PageBreak())
        
        self.generate_table_of_contents()
        self.story.append(PageBreak())
        
        self.generate_executive_summary(report, findings)
        self.story.append(PageBreak())
        
        self.generate_project_overview(asset, report)
        self.story.append(PageBreak())
        
        self.generate_methodology_section()
        self.story.append(PageBreak())
        
        self.generate_findings_section(findings)
        self.story.append(PageBreak())
        
        self.generate_recommendations(findings)
        self.story.append(PageBreak())
        
        self.generate_appendices(report, asset)
        
        # Build PDF
        self.doc.build(self.story)
        self.buffer.seek(0)
        return self.buffer.getvalue()

    def generate_cover_page(self, report, asset, users):
        """Generate cover page"""
        # Company header
        header_style = ParagraphStyle(
            'Header',
            parent=self.styles['Normal'],
            fontSize=28,
            textColor=colors.HexColor('#1e40af'),
            alignment=TA_CENTER,
            spaceAfter=10
        )
        
        self.story.append(Paragraph("CyBridge Security", header_style))
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=30
        )
        
        self.story.append(Paragraph("Cybersecurity Excellence & Innovation", subtitle_style))
        
        # Main title
        self.story.append(Paragraph("VULNERABILITY ASSESSMENT REPORT", self.title_style))
        
        # Project information table
        project_data = [
            ['Project Name:', asset.project_name],
            ['Asset Name:', asset.asset_name],
            ['Asset Type:', asset.asset_type],
            ['Environment:', asset.environment],
            ['Report ID:', f"CYB-{str(report.id).zfill(6)}"],
            ['Assessment Date:', report.test_start_date.strftime('%B %d, %Y')],
            ['Report Date:', (report.report_finalized_date or report.created_at.date()).strftime('%B %d, %Y')]
        ]
        
        project_table = Table(project_data, colWidths=[2*inch, 4*inch])
        project_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        self.story.append(Spacer(1, 0.5*inch))
        self.story.append(project_table)
        
        # Classification
        self.story.append(Spacer(1, 0.5*inch))
        classification_style = ParagraphStyle(
            'Classification',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#92400e'),
            alignment=TA_CENTER,
            backColor=colors.HexColor('#fef3c7'),
            borderColor=colors.HexColor('#f59e0b'),
            borderWidth=1,
            borderPadding=10
        )
        
        self.story.append(Paragraph("CONFIDENTIAL", classification_style))
        
        # Footer
        footer_data = [
            [f"Prepared by: {users.get('tester', {}).get('username', 'N/A')}"],
            ["Report Version: 1.0"],
            [f"Generated: {datetime.now().strftime('%B %d, %Y %H:%M:%S')}"]
        ]
        
        self.story.append(Spacer(1, 2*inch))
        for item in footer_data:
            self.story.append(Paragraph(item[0], self.styles['Normal']))

    def generate_table_of_contents(self):
        """Generate table of contents"""
        self.story.append(Paragraph("Table of Contents", self.heading_style))
        
        contents = [
            "1. Executive Summary",
            "2. Project Overview", 
            "3. Methodology",
            "4. Findings and Vulnerabilities",
            "5. Risk Assessment",
            "6. Recommendations",
            "7. Appendices"
        ]
        
        for item in contents:
            self.story.append(Paragraph(item, self.body_style))

    def generate_executive_summary(self, report, findings):
        """Generate executive summary"""
        self.story.append(Paragraph("Executive Summary", self.heading_style))
        
        # Summary text
        summary_text = report.executive_summary or "This report presents the findings of a comprehensive security assessment conducted on the target application."
        self.story.append(Paragraph(summary_text, self.body_style))
        
        # Risk overview table
        severity_breakdown = report.severity_breakdown or {}
        risk_data = [
            ['Risk Level', 'Count', 'Description'],
            ['Critical', str(severity_breakdown.get('critical', 0)), 'Immediate action required'],
            ['High', str(severity_breakdown.get('high', 0)), 'Action required within 30 days'],
            ['Medium', str(severity_breakdown.get('medium', 0)), 'Action required within 90 days'],
            ['Low', str(severity_breakdown.get('low', 0)), 'Action recommended'],
            ['Info', str(severity_breakdown.get('info', 0)), 'Informational findings']
        ]
        
        risk_table = Table(risk_data, colWidths=[1.5*inch, 1*inch, 3*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        self.story.append(Spacer(1, 0.2*inch))
        self.story.append(risk_table)

    def generate_project_overview(self, asset, report):
        """Generate project overview"""
        self.story.append(Paragraph("Project Overview", self.heading_style))
        
        overview_data = [
            ['Project Name', asset.project_name],
            ['Asset URL', asset.asset_url or 'N/A'],
            ['Asset Type', asset.asset_type],
            ['Environment', asset.environment],
            ['Technology Stack', ', '.join(asset.technology_stack) if asset.technology_stack else 'N/A'],
            ['Test Duration', report.total_test_duration or 'N/A'],
            ['Test Start Date', report.test_start_date.strftime('%B %d, %Y')],
            ['Test End Date', report.test_end_date.strftime('%B %d, %Y')]
        ]
        
        overview_table = Table(overview_data, colWidths=[2*inch, 4*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 10)
        ]))
        
        self.story.append(overview_table)

    def generate_methodology_section(self):
        """Generate methodology section"""
        self.story.append(Paragraph("Methodology", self.heading_style))
        
        methodology_text = """
        The security assessment was conducted using industry-standard methodologies including:
        
        • OWASP Testing Guide
        • NIST Cybersecurity Framework
        • Manual penetration testing techniques
        • Automated vulnerability scanning
        • Code review (where applicable)
        
        The assessment covered the following areas:
        • Authentication and authorization
        • Input validation
        • Session management
        • Error handling
        • Data protection
        • Business logic flaws
        """
        
        self.story.append(Paragraph(methodology_text, self.body_style))

    def generate_findings_section(self, findings):
        """Generate findings section"""
        self.story.append(Paragraph("Findings and Vulnerabilities", self.heading_style))
        
        if not findings:
            self.story.append(Paragraph("No vulnerabilities were identified during the assessment.", self.body_style))
            return
        
        # Group findings by severity
        findings_by_severity = {}
        for finding in findings:
            severity = finding.severity
            if severity not in findings_by_severity:
                findings_by_severity[severity] = []
            findings_by_severity[severity].append(finding)
        
        # Order by severity
        severity_order = ['Critical', 'High', 'Medium', 'Low', 'Info']
        
        for severity in severity_order:
            if severity in findings_by_severity:
                self.story.append(Paragraph(f"{severity} Risk Findings", self.heading_style))
                
                for finding in findings_by_severity[severity]:
                    self.generate_finding_detail(finding)
                    self.story.append(Spacer(1, 0.2*inch))

    def generate_finding_detail(self, finding):
        """Generate individual finding detail"""
        # Finding header
        finding_title = f"{finding.finding_id}: {finding.vulnerability_title}"
        self.story.append(Paragraph(finding_title, self.styles['Heading3']))
        
        # Finding details table
        finding_data = [
            ['Severity', finding.severity],
            ['Impact', finding.impact],
            ['Likelihood', finding.likelihood],
            ['Status', finding.vulnerability_status],
            ['Category', finding.category or 'N/A'],
            ['Occurrences', str(finding.number_of_occurrences)]
        ]
        
        finding_table = Table(finding_data, colWidths=[1.5*inch, 4*inch])
        finding_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('FONTSIZE', (0, 0), (-1, -1), 10)
        ]))
        
        self.story.append(finding_table)
        
        # Description
        if finding.description:
            self.story.append(Paragraph("Description:", self.styles['Heading4']))
            self.story.append(Paragraph(finding.description, self.body_style))
        
        # Proof of Concept
        if finding.proof_of_concept:
            self.story.append(Paragraph("Proof of Concept:", self.styles['Heading4']))
            self.story.append(Paragraph(finding.proof_of_concept, self.body_style))
        
        # Recommendation
        if finding.recommendation:
            self.story.append(Paragraph("Recommendation:", self.styles['Heading4']))
            self.story.append(Paragraph(finding.recommendation, self.body_style))

    def generate_recommendations(self, findings):
        """Generate recommendations section"""
        self.story.append(Paragraph("Recommendations", self.heading_style))
        
        recommendations_text = """
        Based on the findings identified during this assessment, the following recommendations are provided:
        
        1. Implement a comprehensive security patch management program
        2. Conduct regular security assessments and penetration testing
        3. Implement security awareness training for development teams
        4. Establish secure coding practices and guidelines
        5. Deploy web application firewalls and intrusion detection systems
        6. Implement proper input validation and output encoding
        7. Establish incident response procedures
        """
        
        self.story.append(Paragraph(recommendations_text, self.body_style))

    def generate_appendices(self, report, asset):
        """Generate appendices"""
        self.story.append(Paragraph("Appendices", self.heading_style))
        
        # Appendix A: Scope
        self.story.append(Paragraph("Appendix A: Assessment Scope", self.styles['Heading3']))
        
        scope_data = [
            ['Inclusions', asset.scope_inclusions or 'All application functionality'],
            ['Exclusions', asset.scope_exclusions or 'None specified'],
            ['Testing Window', asset.preferred_test_window or 'Business hours'],
            ['Scan Frequency', asset.scan_frequency]
        ]
        
        scope_table = Table(scope_data, colWidths=[2*inch, 4*inch])
        scope_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        
        self.story.append(scope_table)
