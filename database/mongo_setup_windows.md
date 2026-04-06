# MongoDB Local Setup (Windows 10/11)

1. Install MongoDB Community Server (MSI).
2. Ensure service is running:
   - `Get-Service | findstr MongoDB`
   - If needed: `net start MongoDB`
3. Default connection string:
   - `mongodb://localhost:27017`
4. App DB used by project:
   - `ai_soc_firewall`