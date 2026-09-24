# ⚡ PlutoAI — Backend Architecture

The **backend** directory contains the core orchestration engine, security and cryptographic services, action validation and safety governance, performance monitoring, and server-side handlers.

> [!NOTE]
> **Source of Truth Notice**: In Chrome Extension Manifest V3, the active extension runtime loads directly from root directories: `/background` (Service Worker) and `/server` (Python API). This directory is maintained as a clean, domain-aligned architectural mirror. All files are kept 100% synchronized with the active root runtime.

---

### 📂 Directory Structure

```
backend/
├── background/             # Chrome Service Worker & Background Subsystems
│   ├── background.js       # Main Service Worker lifecycle & message router
│   ├── agent-engine.js     # Autonomous multi-step loop & task coordinator
│   ├── crypto-service.js   # AES-GCM-256 & ECDH P-256 authenticated encryption
│   ├── action-validator.js # Allowlist governor & Human-in-the-Loop guard
│   ├── privacy-firewall.js # Zero-Raw-PII outbound security gatekeeper
│   └── performance-monitor.js # Telemetry, token tracking & latency recorder
├── server/                 # Standalone Fast / Python Backend API
│   ├── main.py             # FastAPI entrypoint for external orchestrations
│   ├── vlm_handler.py      # Python-side multimodal VLM dispatcher
│   └── redaction_parser.py # Server-side image sanitization validator
└── services/               # Reusable Microservices
    └── (Key Exchange, Scheduler, Webhook Dispatchers)
```
