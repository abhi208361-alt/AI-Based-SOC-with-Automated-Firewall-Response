# 🛡️ AI-Based SOC with Automated Firewall Response

<p align="center">
  <strong>AI-Powered Threat Detection • Security Monitoring • Automated Firewall Response</strong>
</p>

<p align="center">
  A Machine Learning-Based Security Operations Center designed to detect, analyze, monitor, and respond to suspicious network activities.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-blue?logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Machine_Learning-Scikit--Learn-orange" alt="Machine Learning"/>
  <img src="https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows" alt="Windows"/>
</p>

---

## 📌 1. Project Overview

The **AI-Based SOC with Automated Firewall Response** is a cybersecurity project that combines Artificial Intelligence, Machine Learning, security monitoring, and firewall automation to improve threat detection and incident response.

Traditional security monitoring systems often require security analysts to manually inspect logs, identify suspicious activities, investigate threats, and configure firewall rules.

This project aims to automate important parts of this workflow.

The system analyzes network traffic and security events, identifies potentially malicious activities, classifies detected threats, assigns risk information, and supports automated firewall response.

It provides a centralized dashboard where security analysts can monitor threats, investigate suspicious IP addresses, view security events, and review response activities.

### Main Workflow

**Data Collection → Preprocessing → ML-Based Detection → Threat Classification → Risk Assessment → Firewall Response → Monitoring and Reporting**

---

## 🎯 2. Project Objectives

- Develop an AI-assisted Security Operations Center.
- Detect suspicious network traffic using Machine Learning.
- Identify and classify different categories of cyber threats.
- Monitor security events through a centralized dashboard.
- Analyze attacker IP addresses and associated geolocation information.
- Automate firewall response for configured threat conditions.
- Maintain security logs and incident records.
- Generate reports for security analysis.
- Reduce manual effort in threat monitoring and incident response.

---

## 🚀 3. Key Features

### 🔍 AI-Based Threat Detection

- Machine Learning-based network traffic analysis.
- Random Forest and Isolation Forest model support.
- Detection of suspicious network behavior.
- Threat classification and risk assessment.
- Prediction support through backend APIs.

### 📊 SOC Dashboard

- Centralized security monitoring.
- Threat and event visualization.
- Active threat information.
- Threat severity and confidence information where available.
- Security activity monitoring.
- System health information.

### 🌐 IP Geolocation and Threat Investigation

- Displays attacker IP information.
- Supports geolocation enrichment.
- Helps analysts investigate suspicious sources.
- Provides contextual information for security incidents.

*Geolocation is an approximate indicator and does not establish an attacker's physical identity or exact location.*

### 🔥 Automated Firewall Response

- Firewall response based on configured security policies.
- Supports threat-related response actions.
- Maintains firewall response information and activity logs.
- Provides a foundation for automated defensive operations.

**Important:** Actual firewall changes require a correctly configured, authorized Windows Firewall integration and appropriate administrator privileges. Running the application inside Docker does not automatically grant access to the host Windows Firewall.

### 📄 Security Reports

- Security event reporting.
- Threat and incident information.
- Attacker IP information.
- Response and mitigation details.
- Export and reporting capabilities where implemented.

### 🔐 Authentication and Access Control

- User authentication.
- Role-based access control support.
- Protected backend API endpoints.
- Secure password-handling dependencies.

### 🐳 Docker Support

- Container-based deployment configuration.
- Separate local and production deployment configurations.
- Easier environment setup and application management.

---

## 🏗️ 4. System Architecture

The project follows a modular architecture consisting of frontend, backend, machine learning, database, and security-response components.

```text
                 NETWORK TRAFFIC / SECURITY LOGS
                              |
                              v
                    DATA COLLECTION
                              |
                              v
                    DATA PREPROCESSING
                              |
                              v
                  MACHINE LEARNING ENGINE
                    /             \
                   v               v
             RANDOM FOREST    ISOLATION FOREST
                    \             /
                     v           v
                    THREAT ANALYSIS
                              |
                              v
                     RISK ASSESSMENT
                              |
                 +------------+------------+
                 |            |            |
                 v            v            v
             DASHBOARD     GEOLOCATION   ALERTS
                 |            |            |
                 +------------+------------+
                              |
                              v
                    FIREWALL RESPONSE
                              |
                              v
                     SECURITY LOGGING
                              |
                              v
                      REPORT GENERATION
```

### Main Components

| Component | Responsibility |
|---|---|
| Frontend | SOC dashboard and user interface |
| Backend | API services and application logic |
| ML Engine | Network traffic analysis and prediction |
| Database | Application and security information storage |
| Firewall Integration | Defensive network response |
| Geolocation | IP information enrichment |
| Reporting | Security reports and incident summaries |

---

## 🧰 5. Technology Stack

| Technology | Purpose |
|---|---|
| Python | Backend and ML development |
| FastAPI | REST API framework |
| Uvicorn | ASGI application server |
| React | Frontend development |
| React Router | Frontend navigation |
| JavaScript / TypeScript | Frontend application logic |
| Scikit-learn | Machine Learning |
| Random Forest | Supervised classification |
| Isolation Forest | Anomaly detection |
| SQLAlchemy | Database ORM |
| PostgreSQL / MongoDB | Database technologies, according to configured modules |
| Pydantic | Data validation |
| Docker | Containerization |
| Git and GitHub | Version control |
| ReportLab | PDF report generation |

*The actual database backend and enabled integrations depend on the project's environment configuration.*

---

## 📂 6. Project Structure

The repository is organized into modular directories.

```text
AI-Based-SOC-with-Automated-Firewall-Response/
│
├── backend/
│   └── Backend application and API modules
│
├── frontend/
│   └── React user interface
│
├── database/
│   └── Database-related components
│
├── ml_modules/
│   └── Machine Learning components
│
├── sample_logs/
│   └── Sample security log data
│
├── scripts/
│   └── Utility and execution scripts
│
├── docs/
│   └── Project documentation
│
├── deploy/
│   └── Deployment configurations
│
├── requirements.txt
│   └── Python dependencies
│
├── package.json
│   └── Project-level Node.js configuration
│
├── docker-compose.yml
│   └── Docker Compose configuration, if present
│
└── README.md
    └── Project documentation
```

*This is a high-level directory overview. Refer to the actual repository tree for the complete list of files.*

---

## ⚙️ 7. System Requirements

### Hardware Requirements

| Component | Recommended |
|---|---|
| Processor | Intel Core i5 / AMD Ryzen 5 or better |
| RAM | 16 GB |
| Storage | 20 GB free space or more |
| Network | Internet connection for external integrations |

### Software Requirements

- Windows 11 (development environment).
- Python 3.12.
- Node.js and npm.
- Visual Studio Code.
- Git.
- Docker Desktop (for containerized deployment).
- Configured database service.

---

## 💻 8. Installation and Setup

### Step 1: Clone the Repository

```powershell
git clone https://github.com/abhi208361-alt/AI-Based-SOC-with-Automated-Firewall-Response.git
```

Navigate to the project directory:

```powershell
cd AI-Based-SOC-with-Automated-Firewall-Response
```

### Step 2: Create a Python Virtual Environment

```powershell
python -m venv .venv
```

Activate the environment:

```powershell
.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate the environment again.

### Step 3: Install Backend Dependencies

```powershell
python -m pip install --upgrade pip
```

```powershell
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create a local `.env` file using the repository's environment template, if provided.

Configure the required values, such as:

- Database connection settings.
- Authentication and JWT secrets.
- Application environment.
- Machine Learning configuration.
- Geolocation or threat intelligence API keys, if required.
- Firewall integration settings.

Never commit real passwords, secret keys, tokens, or API credentials to GitHub.

### Step 5: Start the Backend

From the project root, run:

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend address:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

If the application uses a different entry point or port in your current branch, follow its actual configuration.

### Step 6: Start the Frontend

Open another terminal:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the frontend URL displayed in the terminal, commonly:

```text
http://localhost:5173
```

---

## 🐳 9. Docker Deployment

The repository includes Docker Compose deployment configurations.

Before deployment:

1. Install Docker Desktop.
2. Start the Docker engine.
3. Configure the required environment variables.
4. Review the available Compose files.
5. Select the appropriate local or production configuration.

For the default Compose configuration, if `docker-compose.yml` exists:

```powershell
docker compose up --build
```

To stop the services:

```powershell
docker compose down
```

To view running containers:

```powershell
docker compose ps
```

To inspect logs:

```powershell
docker compose logs -f
```

For production deployment, use the production configuration and secure all secrets, database credentials, exposed ports, and network permissions.

---

## 🧠 10. Machine Learning Methodology

The Machine Learning component is intended to analyze network traffic features and identify suspicious patterns.

### Data Preprocessing

The input data is prepared for model processing through operations such as:

- Data cleaning.
- Missing-value handling.
- Feature selection.
- Label preparation.
- Feature transformation.
- Training and testing data separation.

### Random Forest

Random Forest is an ensemble learning algorithm that combines multiple decision trees to make a classification prediction.

It can be used to classify network traffic into categories learned from labeled training data.

### Isolation Forest

Isolation Forest is an anomaly detection algorithm that identifies observations that differ from normal data patterns.

It can help identify unusual network behavior.

### Detection Workflow

```text
Input Network Data
        |
        v
Data Preprocessing
        |
        v
Feature Extraction
        |
        v
ML Model Prediction
        |
        v
Threat Classification
        |
        v
Risk Evaluation
        |
        v
Security Event
```

Model accuracy, precision, recall, F1-score, and false-positive rate should be calculated using the actual evaluation dataset before being reported as project results.

---

## 🔥 11. Firewall Response Methodology

The firewall response component is designed to support defensive actions against identified threats.

General workflow:

1. Receive a threat detection event.
2. Extract the relevant source IP and threat information.
3. Evaluate threat severity and configured confidence requirements.
4. Check applicable response policies.
5. Determine whether a firewall action is permitted.
6. Execute the authorized firewall operation through the configured integration.
7. Record the action and its result.
8. Make the response information available for investigation.

Possible response categories may include:

| Action | Purpose |
|---|---|
| BLOCK | Block a specified source |
| UNBLOCK | Remove a configured block |
| ALLOW | Permit approved traffic |
| DENY | Reject traffic |
| RATE_LIMIT | Restrict traffic rate |
| QUARANTINE | Isolate a specified resource where supported |

Actual action availability depends on the configured firewall adapter and its implementation.

**Safety:** Firewall modifications should use authorized systems, validated IP addresses, audit logging, and rollback procedures. Critical response actions should have appropriate approval controls.

---

## 📡 12. API Documentation

The backend exposes API endpoints for application functionality.

FastAPI interactive documentation:

```text
http://127.0.0.1:8000/docs
```

OpenAPI schema:

```text
http://127.0.0.1:8000/openapi.json
```

The API modules are intended to support functionality such as:

- Authentication.
- Threat and attack information.
- Security event ingestion.
- Machine Learning prediction.
- IP geolocation.
- SIEM-related integration.
- Real-time attack information.

Refer to the running OpenAPI documentation for the exact endpoint paths, request formats, response schemas, and authentication requirements.

---

## 📊 13. Expected Application Modules

| Module | Description |
|---|---|
| Login | User authentication |
| Dashboard | Centralized SOC monitoring |
| Threat Monitoring | Detected threat information |
| Active Threats | Current threat visibility |
| Attack Analysis | Investigation of detected events |
| Geolocation | Attacker IP enrichment |
| Firewall Management | Firewall response information |
| Security Logs | Historical activity |
| Reports | Security report generation |
| AI Assistant | Security-related assistance, where configured |
| Settings | Application configuration |
| User Management | Account and role management, where enabled |

---

## 🧪 14. Testing and Validation

The following areas should be validated during development and deployment:

- Backend startup and API availability.
- Frontend loading and navigation.
- Authentication and authorization.
- Database connectivity.
- Machine Learning model loading.
- Prediction API functionality.
- Security event ingestion.
- IP geolocation enrichment.
- Firewall adapter permissions and response.
- Audit logging.
- Report generation.
- Docker service health.

Testing should be conducted using controlled sample data and authorized lab environments.

---

## 🔐 15. Security Considerations

Security is an important part of an automated SOC platform.

Recommended practices:

- Store credentials in environment variables.
- Use strong authentication secrets.
- Apply role-based access controls.
- Validate all incoming API data.
- Protect sensitive API endpoints.
- Restrict firewall operations to authorized users and services.
- Log security-sensitive actions.
- Avoid exposing development services publicly.
- Keep dependencies updated.
- Use HTTPS in production.
- Back up databases and security logs.
- Review automated response decisions before enabling production enforcement.

---

## 📸 16. Screenshots

Add screenshots of your actual running application in this section.

Suggested screenshots:

| Screenshot | Description |
|---|---|
| Dashboard | Main SOC monitoring interface |
| Threat Monitoring | Detected threat information |
| Attack Analysis | Threat investigation |
| Geolocation | IP location visualization |
| Firewall Management | Firewall response interface |
| Security Logs | Recorded security events |
| Reports | Generated security reports |
| Login | Authentication interface |

Example:

```markdown
![SOC Dashboard](docs/screenshots/dashboard.png)
```

Place your screenshots inside:

```text
docs/screenshots/
```

---

## 🎓 17. Applications

This project can be used for:

- Cybersecurity education.
- Security Operations Center demonstrations.
- Machine Learning-based intrusion detection research.
- Blue Team training.
- Network security monitoring.
- Incident response workflow demonstrations.
- Cybersecurity academic projects.
- Controlled firewall automation experiments.

---

## 🔮 18. Future Enhancements

Potential improvements include:

- Advanced threat intelligence integration.
- Improved ML model evaluation and retraining.
- More detailed MITRE ATT&CK mapping.
- Enhanced incident correlation.
- Additional SIEM integrations.
- Advanced alert prioritization.
- Real-time notification integrations.
- Improved firewall response verification.
- Response approval workflows.
- More comprehensive audit and compliance reporting.

---

## 📚 19. References

1. [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
2. [NIST SP 800-61 – Computer Security Incident Handling Guide](https://csrc.nist.gov/pubs/sp/800/61/r2/final)
3. [MITRE ATT&CK Framework](https://attack.mitre.org/)
4. [Scikit-learn Documentation](https://scikit-learn.org/stable/)
5. [FastAPI Documentation](https://fastapi.tiangolo.com/)
6. [React Documentation](https://react.dev/)
7. [Docker Documentation](https://docs.docker.com/)
8. [Microsoft Windows Defender Firewall Documentation](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/)

---

## 👨‍💻 20. Project Repository

**GitHub:**  
https://github.com/abhi208361-alt/AI-Based-SOC-with-Automated-Firewall-Response

---

## ⚠️ Disclaimer

This project is developed for educational, academic, and authorized cybersecurity research purposes.

Use the system only on networks, devices, and environments that you own or have explicit permission to test.

Automated firewall actions can affect network connectivity. Test response functionality in a controlled environment before enabling enforcement on production systems.

---

<p align="center">
  <strong>AI-Based SOC with Automated Firewall Response</strong>
  <br/>
  <em>Detect • Analyze • Respond • Secure</em>
</p>
