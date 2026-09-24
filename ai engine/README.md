# 🧠 PlutoAI — AI & Machine Learning Subsystem

The **ai engine** directory contains all on-device machine learning models, visual perception algorithms, Set-of-Marks grounding engines, privacy detectors, and VLM provider connectors.

> [!NOTE]
> **Source of Truth Notice**: In Chrome Extension Manifest V3, the active extension runtime executes perception from `/content`, planning/prompts from `/shared`, and models from `/providers` & `/src/models`. This directory is maintained as a clean, domain-aligned architectural mirror. All files are kept 100% synchronized with the active root runtime.

---

### 📂 Directory Structure

```
aiml/
├── models/                 # Quantized Neural Network Weights
│   └── blazeface_int8.onnx # INT8 quantized on-device face detector
├── perception/             # Vision & DOM Grounding Engines
│   ├── dom-indexer.js      # Set-of-Marks (SoM) interactive element scanner
│   ├── ocr-engine.js       # Client-side spatial text & coordinate extractor
│   ├── onnx-runner.js      # ONNX Runtime WebGPU / WASM execution engine
│   ├── local-perception.js # Zero-cloud heuristic perception pipeline
│   └── verifier.js         # Post-action DOM state verification engine
├── privacy/                # Sensitive Data Detectors & Redaction
│   ├── pii-detector.js     # Multi-pattern regex & context PII classifiers
│   └── privacy-redactor.js # Pixel-level canvas blur / blackout / mask engine
├── providers/              # Multimodal VLM Integrations
│   └── providers.js        # Universal hub supporting 13 AI providers:
│                           # (Gemini, OpenAI, Claude, Groq, Mistral,
│                           #  DeepSeek, Together, xAI, Cohere, Ollama, etc.)
└── benchmarks/             # Ground-Truth Evaluation & Test Suites
    └── verify-all-features.js # Automated 16-point compliance verification
```
