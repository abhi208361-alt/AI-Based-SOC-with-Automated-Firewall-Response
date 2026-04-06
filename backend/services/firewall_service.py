import subprocess
from models.schemas import FirewallActionRequest
from services.db_service import DBService


class FirewallService:
    @staticmethod
    def block_ip(req: FirewallActionRequest) -> dict:
        ip = str(req.ip_address)
        rule_name = f"AI_SOC_Block_{ip}"
        cmd = f'netsh advfirewall firewall add rule name="{rule_name}" dir=in action=block remoteip={ip}'
        try:
            completed = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=False)
            success = completed.returncode == 0
            message = completed.stdout.strip() if success else completed.stderr.strip()

            DBService.insert_firewall_rule({
                "ip_address": ip,
                "rule_name": rule_name,
                "reason": req.reason,
                "status": "blocked" if success else "failed",
                "command": cmd,
                "message": message or "Command executed",
            })

            return {"success": success, "message": message or "Command executed", "command": cmd}
        except Exception as ex:
            return {"success": False, "message": str(ex), "command": cmd}

    @staticmethod
    def unblock_ip(req: FirewallActionRequest) -> dict:
        ip = str(req.ip_address)
        rule_name = f"AI_SOC_Block_{ip}"
        cmd = f'netsh advfirewall firewall delete rule name="{rule_name}"'
        try:
            completed = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=False)
            success = completed.returncode == 0
            message = completed.stdout.strip() if success else completed.stderr.strip()

            DBService.insert_firewall_rule({
                "ip_address": ip,
                "rule_name": rule_name,
                "reason": req.reason,
                "status": "unblocked" if success else "failed",
                "command": cmd,
                "message": message or "Command executed",
            })

            return {"success": success, "message": message or "Command executed", "command": cmd}
        except Exception as ex:
            return {"success": False, "message": str(ex), "command": cmd}