/**
 * Redaction Protocol Metadata Builder
 * Formats the structured Redaction Protocol JSON schema sent alongside the sanitized screenshot.
 */

import { CapturedContext, DOMElement } from './capture';
import { PIIRegion } from './pii_detector';

export interface RedactionMetadata {
  session_id: string;
  timestamp: number;
  screen_size: { w: number; h: number };
  user_intent: string;
  redaction_regions: PIIRegion[];
  dom_summary: {
    page_title: string;
    interactive_elements: any[];
  };
}

export interface RedactionPayload {
  sanitized_image: string;
  metadata: RedactionMetadata;
}

export class MetadataBuilder {
  public static build(
    sanitizedBase64: string,
    regions: PIIRegion[],
    context: CapturedContext,
    userIntent: string = "Navigate and complete the task shown on screen"
  ): RedactionPayload {
    const sessionId = `pluto-${Date.now()}`;

    // Cross-reference top interactive elements with redacted IDs
    const interactiveElements = (context.domElements || []).slice(0, 30).map(el => {
      // Find matching redaction region
      const matchedRegion = regions.find(r => 
        r.domRef?.id === el.id || 
        r.domRef?.name === el.name ||
        (r.bbox.x === el.bbox.x && r.bbox.y === el.bbox.y)
      );

      if (matchedRegion) {
        return {
          type: el.tag,
          label: el.placeholder || el.name || 'Sensitive Input',
          redacted_id: matchedRegion.id,
          bbox: el.bbox
        };
      }

      return {
        type: el.tag,
        label: el.textContent || el.placeholder || el.ariaLabel || el.name || 'Interactive Element',
        selector: el.id ? `#${el.id}` : (el.name ? `[name="${el.name}"]` : el.tag),
        bbox: el.bbox
      };
    });

    const metadata: RedactionMetadata = {
      session_id: sessionId,
      timestamp: Date.now(),
      screen_size: context.screenSize,
      user_intent: userIntent,
      redaction_regions: regions,
      dom_summary: {
        page_title: context.title,
        interactive_elements: interactiveElements
      }
    };

    return {
      sanitized_image: sanitizedBase64,
      metadata
    };
  }
}
