# 🎨 PlutoAI — Frontend Architecture

The **frontend** directory contains all user interface modules, presentation components, interactive sidebars, options panels, and content script overlays injected into web pages.

> [!NOTE]
> **Source of Truth Notice**: In Chrome Extension Manifest V3, the active extension runtime loads directly from root directories: `/content` (Content Scripts), `/sidebar` (SidePanel UI), and `/options` (Options Page). This directory is maintained as a clean, domain-aligned architectural mirror. All files are kept 100% synchronized with the active root runtime.

---

### 📂 Directory Structure

```
frontend/
├── sidebar/            # Main PlutoAI Side Panel Interface
│   ├── sidebar.html    # Side panel DOM structure & glassmorphism layout
│   ├── sidebar.css     # Dark / Light Theme design system tokens
│   └── sidebar.js      # Real-time state manager, speech synthesis & feed
├── options/            # Options & API Configuration Center
│   ├── options.html    # Provider credentials & settings interface
│   ├── options.css     # Settings page styling
│   └── options.js      # Storage sync & API test runner
├── popup/              # Chrome Extension Toolbar Popup
│   ├── popup.html      # Quick status badge and quick toggle
│   └── popup.ts        # Fast connection controller
├── content/            # In-Page UI Injections & DOM Overlays
│   ├── content.css     # Set-of-Marks badges & laser cursor animations
│   ├── content.js      # Runtime bridge for injected modules
│   ├── visual-overlay.js # Set-of-Marks viewport badge painter
│   ├── actuator.js     # Synthetic mouse & keyboard motion animator
│   └── sidebar-injector.js # Iframe / shadow-DOM sidebar mounting
├── icons/              # Extension brand icons (16px, 32px, 48px, 128px)
└── demo/               # Interactive Playground & ISRO Evaluation Demo
    ├── isro_dashboard.html # Realistic e-governance / space portal testbed
    ├── test-demo-page.html # PII masking validation playground
    └── playground.css  # Demo styling
```
