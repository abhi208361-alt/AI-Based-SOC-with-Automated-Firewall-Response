import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

REPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports_output")
os.makedirs(REPORT_DIR, exist_ok=True)


class ReportService:
    @staticmethod
    def generate_incident_report(incident_id: str) -> dict:
        file_name = f"incident_{incident_id}.pdf"
        file_path = os.path.join(REPORT_DIR, file_name)

        c = canvas.Canvas(file_path, pagesize=A4)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 800, "AI SOC Incident Report")
        c.setFont("Helvetica", 11)
        c.drawString(50, 770, f"Incident ID: {incident_id}")
        c.drawString(50, 750, "Generated in Step 1 backend test mode.")
        c.drawString(50, 730, "Detailed fields will be populated in later integration steps.")
        c.save()

        return {"success": True, "report_name": file_name, "report_path": file_path}