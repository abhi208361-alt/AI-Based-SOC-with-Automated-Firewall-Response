import os
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from celery_app import celery
from db import SessionLocal
from models.entities import AttackEvent, ReportJob

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")
REPORTS_DIR = os.path.abspath(REPORTS_DIR)
os.makedirs(REPORTS_DIR, exist_ok=True)


@celery.task(name="generate_report_pdf")
def generate_report_pdf(job_id: str):
    db: Session = SessionLocal()
    try:
        job = db.get(ReportJob, job_id)
        if not job:
            return {"ok": False, "error": "job not found"}

        job.status = "processing"
        db.commit()

        incident = db.get(AttackEvent, job.incident_id)
        if not incident:
            job.status = "failed"
            job.error = "incident not found"
            db.commit()
            return {"ok": False, "error": "incident not found"}

        filename = f"incident_{incident.id}.pdf"
        abs_path = os.path.join(REPORTS_DIR, filename)
        rel_path = f"reports/{filename}"

        c = canvas.Canvas(abs_path, pagesize=A4)
        y = 800
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, "AI SOC Firewall Incident Report")
        y -= 28
        c.setFont("Helvetica", 11)
        lines = [
            f"Incident ID: {incident.id}",
            f"Source: {incident.source_ip}",
            f"Destination: {incident.destination_ip}",
            f"Type: {incident.attack_type}",
            f"Severity: {incident.severity}",
            f"Risk Score: {incident.risk_score}",
            f"Action: {incident.action_taken}",
            f"Timestamp: {incident.timestamp.isoformat()}",
            f"Generated At: {datetime.now(timezone.utc).isoformat()}",
        ]
        for line in lines:
            c.drawString(50, y, line)
            y -= 18
        c.save()

        job.status = "done"
        job.report_name = filename
        job.report_path = rel_path
        db.commit()
        return {"ok": True, "report_path": rel_path}
    except Exception as e:
        job = db.get(ReportJob, job_id)
        if job:
            job.status = "failed"
            job.error = str(e)
            db.commit()
        raise
    finally:
        db.close()