/**
 * Pluto AI - Complete Expanded Skills Catalog & Verification Engine
 * Defines all ~45 browser skills, schemas, escalation ladders, sensitivity flags, and verifiers.
 */

export const SKILL_CATEGORIES = {
  NAVIGATION: 'navigation',
  MOUSE: 'mouse',
  KEYBOARD: 'keyboard',
  FORMS: 'forms',
  EXTRACTION: 'extraction',
  PAGE_STATE: 'page_state',
  DEVTOOLS: 'devtools',
  META: 'meta'
};

export const SKILL_DEFINITIONS = {
  // --- 1. NAVIGATION & TABS ---
  navigate: {
    name: 'navigate',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Navigate active tab to target URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Destination web URL (http/https)' },
        new_tab: { type: 'boolean', description: 'Open in new tab instead of current' }
      },
      required: ['url']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic']
  },
  go_back: {
    name: 'go_back',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Navigate back in browser history',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  reload: {
    name: 'reload',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Reload current page',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  open_tab: {
    name: 'open_tab',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Open a new browser tab with optional URL',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  close_tab: {
    name: 'close_tab',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Close specified tab or active tab',
    parameters: {
      type: 'object',
      properties: { tab_id: { type: 'number' } }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  switch_tab: {
    name: 'switch_tab',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Switch active view to tab by ID or index',
    parameters: {
      type: 'object',
      properties: { tab_id: { type: 'number' } },
      required: ['tab_id']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  duplicate_tab: {
    name: 'duplicate_tab',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Duplicate the current active tab',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  zoom: {
    name: 'zoom',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Set page zoom level (0.5 - 3.0) to make small text readable',
    parameters: {
      type: 'object',
      properties: { level: { type: 'number', minimum: 0.5, maximum: 3.0 } },
      required: ['level']
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  wait: {
    name: 'wait',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Wait for duration or until condition is satisfied',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'number', description: 'Duration in milliseconds' },
        condition: {
          type: 'string',
          enum: ['network_idle', 'url_contains', 'text_visible', 'element_appears'],
          description: 'Condition to wait for'
        },
        value: { type: 'string', description: 'Value for condition (string, URL substring, or element ID)' }
      }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic']
  },
  scroll: {
    name: 'scroll',
    category: SKILL_CATEGORIES.NAVIGATION,
    description: 'Scroll viewport by direction/amount, to element, or scroll_to_bottom/top with lazy load loops',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['down', 'up', 'top', 'bottom'] },
        amount: { type: 'number', description: 'Pixels to scroll' },
        target: { type: 'string', description: 'Element ID to scroll into view' },
        variant: { type: 'string', enum: ['scroll_to_bottom', 'scroll_to_top', 'standard'] }
      }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },

  // --- 2. MOUSE & POINTER ---
  click: {
    name: 'click',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Left click target element by short ID',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string', description: 'Target element short ID' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  right_click: {
    name: 'right_click',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Right click on element to trigger context menu',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },
  double_click: {
    name: 'double_click',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Double click on element',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },
  middle_click: {
    name: 'middle_click',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Middle click element (opens link in background tab)',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },
  hover: {
    name: 'hover',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Move pointer to element and dwell 500ms to trigger menus/tooltips',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: true,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },
  drag_drop: {
    name: 'drag_drop',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Drag source element and drop onto destination element via interpolated steps',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source element ID' },
        destination: { type: 'string', description: 'Destination element ID' }
      },
      required: ['source', 'destination']
    },
    requiresTarget: true,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  click_at_coordinates: {
    name: 'click_at_coordinates',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Click exact viewport coordinates (for canvas, maps, custom widgets)',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      },
      required: ['x', 'y']
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  swipe_gesture: {
    name: 'swipe_gesture',
    category: SKILL_CATEGORIES.MOUSE,
    description: 'Touch swipe emulation (touchstart/move/end) for mobile layouts',
    parameters: {
      type: 'object',
      properties: {
        start_x: { type: 'number' },
        start_y: { type: 'number' },
        end_x: { type: 'number' },
        end_y: { type: 'number' },
        duration: { type: 'number' }
      },
      required: ['start_x', 'start_y', 'end_x', 'end_y']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },

  // --- 3. TYPING & KEYBOARD ---
  type: {
    name: 'type',
    category: SKILL_CATEGORIES.KEYBOARD,
    description: 'Type text into input/textarea element',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        text: { type: 'string' },
        clear_first: { type: 'boolean' }
      },
      required: ['target', 'text']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  clear_field: {
    name: 'clear_field',
    category: SKILL_CATEGORIES.KEYBOARD,
    description: 'Clear text from an input or textarea',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  press_key: {
    name: 'press_key',
    category: SKILL_CATEGORIES.KEYBOARD,
    description: 'Press keyboard key (Enter, Escape, Tab, Backspace, ArrowDown, etc.)',
    parameters: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },
  key_combo: {
    name: 'key_combo',
    category: SKILL_CATEGORIES.KEYBOARD,
    description: 'Dispatch modifier+key combination (e.g. Ctrl+A, Ctrl+C, Ctrl+V, Shift+Enter)',
    parameters: {
      type: 'object',
      properties: {
        combo: { type: 'string', description: 'Key combination such as Ctrl+A, Ctrl+V, Enter+Shift' }
      },
      required: ['combo']
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['synthetic', 'cdp']
  },
  paste_text: {
    name: 'paste_text',
    category: SKILL_CATEGORIES.KEYBOARD,
    description: 'Fast paste text into field (recommended for texts > 100 chars)',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        text: { type: 'string' }
      },
      required: ['target', 'text']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  set_value: {
    name: 'set_value',
    category: SKILL_CATEGORIES.KEYBOARD,
    description: 'Direct DOM value assignment fallback with input & change events (for React/Vue)',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        value: { type: 'string' }
      },
      required: ['target', 'value']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },

  // --- 4. FORMS & INPUTS ---
  select_option: {
    name: 'select_option',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Select option in a standard HTML <select> dropdown',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        value: { type: 'string', description: 'Option text or value attribute' }
      },
      required: ['target', 'value']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic']
  },
  select_combobox: {
    name: 'select_combobox',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Select from custom JS dropdown (react-select/MUI): clicks trigger, waits, selects option',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Combobox trigger element ID' },
        option: { type: 'string', description: 'Option text or option element ID' }
      },
      required: ['target', 'option']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  check: {
    name: 'check',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Check a checkbox element if not already checked',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic']
  },
  uncheck: {
    name: 'uncheck',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Uncheck a checkbox element if currently checked',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic']
  },
  select_radio: {
    name: 'select_radio',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Select a radio button option',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic']
  },
  toggle_switch: {
    name: 'toggle_switch',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Toggle element with role=switch and flip aria-checked',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  fill_form: {
    name: 'fill_form',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Batch fill multiple form fields in one call to save LLM roundtrips',
    parameters: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field_id: { type: 'string' },
              value: { type: 'string' },
              type: { type: 'string', enum: ['text', 'select', 'checkbox', 'radio'] }
            },
            required: ['field_id', 'value']
          }
        }
      },
      required: ['fields']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: true,
    escalation: ['dom', 'synthetic']
  },
  set_date: {
    name: 'set_date',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Set date for native <input type=date> or custom datepicker',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD or standard format' }
      },
      required: ['target', 'date']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  set_slider: {
    name: 'set_slider',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Set range slider value via keyboard or CDP drag',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        value: { type: 'number' }
      },
      required: ['target', 'value']
    },
    requiresTarget: true,
    requiresCdp: true,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  upload_file: {
    name: 'upload_file',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Attach file to file input via user picker or CDP DOM.setFileInputFiles',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        file_path: { type: 'string' }
      },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: true,
    sensitive: true,
    escalation: ['cdp']
  },
  handle_autocomplete: {
    name: 'handle_autocomplete',
    category: SKILL_CATEGORIES.FORMS,
    description: 'Type query into field, wait for suggestion popup, and pick suggestion by ID or text',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        query: { type: 'string' },
        suggestion: { type: 'string' }
      },
      required: ['target', 'query']
    },
    requiresTarget: true,
    requiresCdp: false,
    escalation: ['synthetic', 'cdp']
  },

  // --- 5. READING & EXTRACTION ---
  extract: {
    name: 'extract',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Generic extractor for text, table, list, or attribute',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        what: { type: 'string', enum: ['text', 'table', 'list', 'attribute'] },
        attribute: { type: 'string' }
      }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  extract_text: {
    name: 'extract_text',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Extract visible text from target element or page body',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  extract_table: {
    name: 'extract_table',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Extract table data as structured array of rows/columns',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  extract_list: {
    name: 'extract_list',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Extract list items from ul/ol or repeated container',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  extract_attribute: {
    name: 'extract_attribute',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Extract HTML attribute (href, src, data-*, value) from element',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        attribute: { type: 'string' }
      },
      required: ['target', 'attribute']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  read_element: {
    name: 'read_element',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Read complete element metadata (tag, text, attributes, state)',
    parameters: {
      type: 'object',
      properties: { target: { type: 'string' } },
      required: ['target']
    },
    requiresTarget: true,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  extract_all_links: {
    name: 'extract_all_links',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Extract inventory of all page links (text, href, target), capped at 200 deduped',
    parameters: {
      type: 'object',
      properties: { scope: { type: 'string', description: 'Optional container element ID' } }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  get_page_metadata: {
    name: 'get_page_metadata',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Extract page title, meta description, og:image, and canonical URL',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  download_file: {
    name: 'download_file',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Trigger/track file download via chrome.downloads (requires user approval)',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Download button/link ID' },
        url: { type: 'string', description: 'Direct download URL' }
      }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: true,
    escalation: ['dom', 'synthetic']
  },
  save_screenshot_artifact: {
    name: 'save_screenshot_artifact',
    category: SKILL_CATEGORIES.EXTRACTION,
    description: 'Capture screenshot and attach as a labeled viewable artifact card in chat',
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Descriptive title for screenshot artifact' }
      },
      required: ['label']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },

  // --- 6. PAGE STATE & OVERLAYS ---
  dismiss_popup: {
    name: 'dismiss_popup',
    category: SKILL_CATEGORIES.PAGE_STATE,
    description: 'Detect and dismiss cookie banners, newsletters, chat widgets, and GDPR modals',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  accept_cookies: {
    name: 'accept_cookies',
    category: SKILL_CATEGORIES.PAGE_STATE,
    description: 'Find and click cookie consent buttons across common international languages',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom', 'synthetic', 'cdp']
  },
  switch_frame: {
    name: 'switch_frame',
    category: SKILL_CATEGORIES.PAGE_STATE,
    description: 'Switch context to an iframe or back to top level ("parent" / "top")',
    parameters: {
      type: 'object',
      properties: {
        frame_target: { type: 'string', description: 'Iframe index, element ID, or "top"' }
      },
      required: ['frame_target']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  element_exists: {
    name: 'element_exists',
    category: SKILL_CATEGORIES.PAGE_STATE,
    description: 'Check presence and visibility of an element without performing actions',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        query: { type: 'string', description: 'Text or selector to look for' }
      }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  get_scroll_position: {
    name: 'get_scroll_position',
    category: SKILL_CATEGORIES.PAGE_STATE,
    description: 'Returns current viewport scrollX, scrollY, and total scrollable height',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },

  // --- 7. META / AGENT CONTROL ---
  ask_user: {
    name: 'ask_user',
    category: SKILL_CATEGORIES.META,
    description: 'Pause execution loop and ask user a question with optional quick-reply chips',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } }
      },
      required: ['question']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  request_approval: {
    name: 'request_approval',
    category: SKILL_CATEGORIES.META,
    description: 'Explicitly prompt user to approve high-consequence action (120s timeout)',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        action_details: { type: 'object' }
      },
      required: ['description']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: true,
    escalation: ['dom']
  },
  note: {
    name: 'note',
    category: SKILL_CATEGORIES.META,
    description: 'Store extracted fact or key finding in conversation memory for subsequent steps',
    parameters: {
      type: 'object',
      properties: {
        fact: { type: 'string', description: 'Fact to memorize (e.g. "order_number is 9812")' }
      },
      required: ['fact']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  retry_strategy: {
    name: 'retry_strategy',
    category: SKILL_CATEGORIES.META,
    description: 'Re-perceive fresh DOM after manual intervention (login/CAPTCHA) and resume step',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string' }
      }
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  done: {
    name: 'done',
    category: SKILL_CATEGORIES.META,
    description: 'Signal that the overall task goal is achieved and summarize results',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Final response markdown' }
      },
      required: ['summary']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },
  blocked: {
    name: 'blocked',
    category: SKILL_CATEGORIES.META,
    description: 'Halt execution loop due to CAPTCHA, authentication wall, or manual restriction',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string' }
      },
      required: ['reason']
    },
    requiresTarget: false,
    requiresCdp: false,
    sensitive: false,
    escalation: ['dom']
  },

  // --- 8. CHROME DEVTOOLS & DIAGNOSTICS (Inspired by Chrome DevTools MCP) ---
  inspect_console_logs: {
    name: 'inspect_console_logs',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Inspect live page console logs, warnings, and uncaught exceptions with stack traces',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['error', 'warn', 'info', 'log'], description: 'Filter by log level' },
        limit: { type: 'number', description: 'Max entries to return (default: 50)' }
      }
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  inspect_network_activity: {
    name: 'inspect_network_activity',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Inspect recent network requests, status codes, failed calls, and in-flight count',
    parameters: {
      type: 'object',
      properties: {
        failed_only: { type: 'boolean', description: 'Only show failed/4xx/5xx requests' },
        limit: { type: 'number', description: 'Max requests to return (default: 50)' }
      }
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  wait_for_network_idle: {
    name: 'wait_for_network_idle',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Wait until all background network/fetch requests complete before proceeding',
    parameters: {
      type: 'object',
      properties: {
        idle_time_ms: { type: 'number', description: 'Duration in ms with zero active requests (default: 500)' },
        timeout_ms: { type: 'number', description: 'Max timeout in ms (default: 8000)' }
      }
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  emulate_device: {
    name: 'emulate_device',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Emulate viewport dimensions, mobile touch screen, and dark/light color scheme',
    parameters: {
      type: 'object',
      properties: {
        width: { type: 'number', description: 'Viewport width (e.g. 375 for iPhone, 1280 for desktop)' },
        height: { type: 'number', description: 'Viewport height (e.g. 667 for iPhone, 800 for desktop)' },
        mobile: { type: 'boolean', description: 'Enable mobile viewport and touch emulation' },
        color_scheme: { type: 'string', enum: ['light', 'dark', 'none'], description: 'Emulate dark or light theme' }
      }
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  get_performance_insights: {
    name: 'get_performance_insights',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Extract Core Web Vitals (LCP, TTFB, DOMContentLoaded) and JS memory heap metrics',
    parameters: { type: 'object', properties: {} },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  handle_dialog: {
    name: 'handle_dialog',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Handle browser JavaScript modal dialog (alert, confirm, prompt)',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['accept', 'dismiss'], description: 'Accept or dismiss dialog' },
        prompt_text: { type: 'string', description: 'Optional text to enter in prompt' }
      },
      required: ['action']
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  },
  evaluate_script: {
    name: 'evaluate_script',
    category: SKILL_CATEGORIES.DEVTOOLS,
    description: 'Safely evaluate a JavaScript expression in the live webpage context',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'JavaScript code or expression to run' }
      },
      required: ['expression']
    },
    requiresTarget: false,
    requiresCdp: true,
    sensitive: false,
    escalation: ['cdp']
  }
};

/**
 * Checks whether an action requires explicit user approval
 */
export function isActionSensitive(action, elementInfo = null) {
  if (!action || !action.skill) return false;

  const skillDef = SKILL_DEFINITIONS[action.skill];
  if (skillDef?.sensitive) return true;

  const skill = action.skill;

  if (skill === 'download_file') return true;

  if (skill === 'click' || skill === 'right_click') {
    if (elementInfo) {
      const text = (elementInfo.text || '').toLowerCase();
      const role = (elementInfo.role || '').toLowerCase();
      const type = (elementInfo.type || '').toLowerCase();

      if (type === 'submit' || role === 'submit') return true;

      const sensitiveKeywords = [
        'pay', 'buy', 'purchase', 'order', 'checkout',
        'delete', 'remove', 'destroy', 'cancel subscription',
        'transfer', 'confirm purchase', 'send message', 'send email'
      ];

      return sensitiveKeywords.some(kw => text.includes(kw));
    }
  }

  return false;
}

/**
 * Standard verifier for skill execution output
 * Evaluates beforeState, afterState, and execution results
 */
export function verifySkillResult(skill, beforeState, afterState, result) {
  if (!result) {
    return { success: false, observed_change: 'No response received from executor', error: 'No execution result' };
  }

  if (result.error) {
    return { success: false, observed_change: 'Execution returned error', error: result.error };
  }

  switch (skill) {
    // Navigation
    case 'navigate':
    case 'open_tab':
    case 'duplicate_tab': {
      const urlChanged = beforeState.url !== afterState.url;
      if (urlChanged || result.newTabCreated) {
        return { success: true, observed_change: result.details || `Navigated to ${afterState.url}` };
      }
      return { success: true, observed_change: result.details || 'Navigation executed' };
    }

    case 'go_back':
    case 'reload':
    case 'close_tab':
    case 'switch_tab':
      return { success: true, observed_change: result.details || `${skill} executed successfully` };

    case 'zoom':
      return { success: true, observed_change: `Page zoom set to ${result.level || 'target'}` };

    case 'wait':
      return { success: true, observed_change: result.details || 'Wait condition fulfilled' };

    case 'scroll': {
      const scrolled = beforeState.scrollY !== afterState.scrollY;
      return {
        success: true,
        observed_change: result.details || (scrolled ? `Scroll position moved to ${afterState.scrollY}px` : 'Scroll executed')
      };
    }

    // Mouse
    case 'click':
    case 'double_click':
    case 'right_click':
    case 'middle_click':
    case 'click_at_coordinates': {
      const urlChanged = beforeState.url !== afterState.url;
      const domChanged = beforeState.domHash !== afterState.domHash;
      if (urlChanged) return { success: true, observed_change: `Navigated to ${afterState.url}` };
      if (domChanged || result.changed) return { success: true, observed_change: result.details || 'DOM state updated' };
      return { success: true, observed_change: result.details || `${skill} dispatched successfully` };
    }

    case 'hover':
      return {
        success: true,
        observed_change: result.details || 'Hovered over element (500ms dwell completed)'
      };

    case 'drag_drop':
      return { success: true, observed_change: result.details || 'Drag and drop sequence completed' };

    case 'swipe_gesture':
      return { success: true, observed_change: result.details || 'Touch swipe gesture simulated' };

    // Keyboard & Typing
    case 'type':
    case 'set_value':
    case 'paste_text':
      return {
        success: true,
        observed_change: result.details || `Input field updated with text "${result.text || ''}"`
      };

    case 'clear_field':
      return { success: true, observed_change: 'Input field cleared' };

    case 'press_key':
    case 'key_combo':
      return { success: true, observed_change: result.details || `Key event ${result.key || result.combo} dispatched` };

    // Forms
    case 'select_option':
    case 'select_combobox':
      return { success: true, observed_change: result.details || `Selected option "${result.selectedOption || result.option}"` };

    case 'check':
    case 'uncheck':
    case 'select_radio':
    case 'toggle_switch':
      return { success: true, observed_change: result.details || 'Input state updated' };

    case 'fill_form':
      return {
        success: result.filledCount > 0,
        observed_change: `Batch filled ${result.filledCount} fields`,
        results: result.results
      };

    case 'set_date':
      return { success: true, observed_change: `Date set to "${result.date}"` };

    case 'set_slider':
      return { success: true, observed_change: `Slider set to ${result.value}` };

    case 'upload_file':
      return { success: true, observed_change: result.details || `File attached to input` };

    case 'handle_autocomplete':
      return { success: true, observed_change: result.details || `Autocomplete option selected` };

    // Extraction
    case 'extract':
    case 'extract_text':
    case 'extract_table':
    case 'extract_list':
    case 'extract_attribute':
    case 'read_element':
    case 'extract_all_links':
    case 'get_page_metadata':
      return {
        success: result.extractedData !== undefined || result.data !== undefined,
        observed_change: result.details || `Data extracted successfully`,
        data: result.extractedData || result.data
      };

    case 'download_file':
      return { success: true, observed_change: result.details || 'Download initiated' };

    case 'save_screenshot_artifact':
      return { success: true, observed_change: `Saved screenshot artifact: ${result.label}` };

    // Page State
    case 'dismiss_popup':
      return {
        success: result.dismissed === true,
        observed_change: result.dismissed ? 'Detected and closed overlay popup' : 'No popup overlay detected'
      };

    case 'accept_cookies':
      return {
        success: result.accepted === true,
        observed_change: result.accepted ? 'Found and accepted cookie consent banner' : 'No cookie banner detected'
      };

    case 'switch_frame':
      return { success: true, observed_change: `Switched frame context to: ${result.frame || 'top'}` };

    case 'element_exists':
      return {
        success: true,
        observed_change: result.exists ? `Element found: ${result.target || 'match'}` : 'Element does not exist',
        exists: result.exists
      };

    case 'get_scroll_position':
      return { success: true, observed_change: `Scroll: (${result.x}, ${result.y}) of ${result.totalHeight}px`, data: result };

    // DevTools & Diagnostics
    case 'inspect_console_logs':
      return {
        success: true,
        observed_change: `Retrieved ${result.logs?.length || 0} console logs (errors: ${(result.logs || []).filter(l => l.level === 'error').length})`,
        logs: result.logs
      };

    case 'inspect_network_activity':
      return {
        success: true,
        observed_change: `Network: ${result.totalTracked || 0} tracked, ${result.inFlightCount || 0} in-flight`,
        network: result
      };

    case 'wait_for_network_idle':
      return {
        success: result.idle === true,
        observed_change: result.idle ? `Network reached idle state in ${result.waitedMs || 0}ms` : `Network idle timeout (${result.inFlightRemaining || 0} requests remaining)`
      };

    case 'emulate_device':
      return {
        success: result.success === true,
        observed_change: `Emulating device viewport (${result.emulated?.width}x${result.emulated?.height}, mobile: ${result.emulated?.mobile || false}, theme: ${result.emulated?.colorScheme || 'light'})`,
        emulated: result.emulated
      };

    case 'get_performance_insights':
      return {
        success: result.success !== false,
        observed_change: `Performance: TTFB ${result.webVitals?.ttfbMs || 0}ms, LCP ${result.webVitals?.lcpMs || 'N/A'}ms, Heap: ${result.webVitals?.jsHeapUsedMB || 'N/A'}MB`,
        webVitals: result.webVitals,
        cdpRaw: result.cdpRaw
      };

    case 'handle_dialog':
      return {
        success: result.success === true,
        observed_change: `Handled dialog with action: ${result.handled?.action || 'accept'}`
      };

    case 'evaluate_script':
      return {
        success: result.success !== false && !result.error,
        observed_change: result.error ? `Script evaluation error: ${result.error}` : `Script evaluated successfully`,
        result: result.result,
        error: result.error
      };

    // Meta
    case 'ask_user':
      return { success: true, observed_change: `Received user answer: "${result.answer}"` };

    case 'request_approval':
      return { success: result.approved === true, observed_change: result.approved ? 'Action approved by user' : 'Action skipped by user' };

    case 'note':
      return { success: true, observed_change: `Memorized fact: "${result.fact}"` };

    case 'retry_strategy':
      return { success: true, observed_change: 'Resuming loop after manual intervention' };

    case 'done':
    case 'blocked':
    default:
      return { success: true, observed_change: result.details || `${skill} completed` };
  }
}
