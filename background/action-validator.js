/**
 * PlutoAI - Action Validator & Safety Governor
 * Enforces structured action allowlists, target confidence bounds,
 * and Human-in-the-Loop confirmations for sensitive or irreversible operations.
 */

export class ActionValidator {
  constructor() {
    this.approvedActions = new Set([
      'click',
      'double_click',
      'right_click',
      'type',
      'press_key',
      'select',
      'hover',
      'scroll',
      'scroll_to',
      'drag_and_drop',
      'navigate',
      'wait',
      'extract',
      'ask_user',
      'finish',
      'screenshot',
      'upload_file',
      'download_file',
      'switch_tab',
      'new_tab',
      'close_tab',
      'set_cookie',
      'get_cookie',
      'clear_cookies',
      'copy_to_clipboard',
      'read_clipboard',
      'audio_play',
      'audio_pause',
      'video_play',
      'video_pause',
      'form_fill',
      'batch_extract',
      'inspect_console_logs',
      'inspect_network_activity',
      'wait_for_network_idle',
      'emulate_device',
      'get_performance_insights',
      'handle_dialog',
      'evaluate_script'
    ]);

    // High-risk semantic patterns that warrant Human-in-the-Loop confirmation
    this.sensitivePatterns = [
      /pay\s*now|checkout|complete\s*purchase|place\s*order|buy\s*now/i,
      /delete\s*account|remove\s*all|erase|format|wipe/i,
      /transfer\s*funds|send\s*money|authorize\s*payment/i,
      /agree\s*and\s*submit|confirm\s*identity/i
    ];
  }

  /**
   * Validates proposed AI action before execution
   * @param {Object} aiAction - The JSON action output from reasoning
   * @param {Array} currentTags - Current indexed DOM tags
   * @param {Object} options - Safety configuration
   */
  validate(aiAction, currentTags = [], options = {}) {
    const { requireConfirmationForSensitive = true } = options;

    if (!aiAction || typeof aiAction !== 'object') {
      return {
        valid: false,
        error: "Action payload is not a valid JSON object.",
        riskLevel: 'HIGH'
      };
    }

    const actionType = (aiAction.action || aiAction.tool || '').trim().toLowerCase();

    // 1. Action Allowlist Check
    if (!this.approvedActions.has(actionType)) {
      return {
        valid: false,
        error: `Action '${actionType}' is not in the approved browser allowlist. Permitted actions: ${Array.from(this.approvedActions).join(', ')}`,
        riskLevel: 'HIGH'
      };
    }

    // 2. Terminal & Information Actions
    if (['finish', 'ask_user', 'wait', 'extract', 'screenshot', 'inspect_console_logs', 'inspect_network_activity', 'wait_for_network_idle', 'emulate_device', 'get_performance_insights', 'handle_dialog', 'evaluate_script'].includes(actionType)) {
      return {
        valid: true,
        actionType,
        requiresHumanConfirmation: false,
        riskLevel: 'LOW',
        confidence: 0.95
      };
    }

    // 3. Navigation Check
    if (actionType === 'navigate') {
      const url = (aiAction.value || aiAction.url || '').trim();
      if (!url) {
        return { valid: false, error: "Navigation action missing destination URL.", riskLevel: 'MEDIUM' };
      }
      // Block dangerous protocols
      if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('file://')) {
        return { valid: false, error: "Blocked unsafe URL protocol in navigation action.", riskLevel: 'CRITICAL' };
      }
      return { valid: true, actionType, requiresHumanConfirmation: false, riskLevel: 'LOW', confidence: 0.9 };
    }

    // 4. Target Tag Validation for Interactive Actions
    if (['click', 'double_click', 'right_click', 'type', 'select', 'hover'].includes(actionType)) {
      const targetTag = String(aiAction.target_tag || aiAction.selector || '').replace(/^TAG_/i, '').replace(/[\[\]]/g, '').trim();

      if (!targetTag && !aiAction.selector && !aiAction.x && !aiAction.y) {
        return {
          valid: false,
          error: `Action '${actionType}' requires a valid 'target_tag' or 'selector'. None provided.`,
          riskLevel: 'MEDIUM'
        };
      }

      // If numeric/tag passed and currentTags exists, check match
      let matchedElement = null;
      if (currentTags && currentTags.length > 0 && targetTag) {
        matchedElement = currentTags.find(t => String(t.tag) === targetTag || String(t.visualId) === targetTag);
      }

      // 5. Sensitive / Irreversible Action Interception (Human-in-the-Loop)
      if (matchedElement) {
        const elementText = (matchedElement.text || '') + ' ' + (matchedElement.ariaLabel || '') + ' ' + (matchedElement.name || '');
        const isSensitive = this.sensitivePatterns.some(pattern => pattern.test(elementText));

        if (isSensitive && requireConfirmationForSensitive) {
          return {
            valid: true,
            actionType,
            targetTag,
            elementMeta: matchedElement,
            requiresHumanConfirmation: true,
            riskLevel: 'HIGH',
            confirmationReason: `Action triggers sensitive operation: "${matchedElement.text || 'Submit'}"`,
            confidence: 0.88
          };
        }
      }

      return {
        valid: true,
        actionType,
        targetTag,
        elementMeta: matchedElement,
        requiresHumanConfirmation: false,
        riskLevel: 'LOW',
        confidence: 0.92
      };
    }

    return { valid: true, actionType, requiresHumanConfirmation: false, riskLevel: 'LOW', confidence: 0.85 };
  }
}

export const actionValidator = new ActionValidator();
