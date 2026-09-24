# 🗄️ PlutoAI — Database & Persistent Storage Layer

The **database** directory defines the data models, storage schemas, IndexedDB / Chrome Storage ORM layer, persistent audit logs, and benchmark datasets.

---

### 📂 Directory Structure

```
database/
├── schema.js           # PlutoDBSchema: Sessions, Actions, Audits, Metrics
├── storage.js          # PlutoDB ORM: IndexedDB transactions & queries
├── audit_logs.json     # Cryptographically signed compliance logs
├── benchmarks.json     # Ground truth benchmark datasets & accuracy metrics
└── export_import.js    # Data export / import utilities for compliance auditing
```

---

### 📋 Database Tables / Object Stores

1. **`sessions`**: Tracks agent run sessions, timestamps, execution status, and chosen provider.
2. **`actions`**: Records granular UI actions (click, type, scroll, submit) and bounding boxes.
3. **`auditLogs`**: Zero-Raw-PII audit certificates, hashes, and cryptographic signatures.
4. **`metrics`**: Perception latency, VLM token counts, and end-to-end timing records.
