/**
 * Dual-Path PII Detector
 * Merges high-precision DOM rules (passwords, emails, Aadhaar, PAN, CC) with
 * on-device Vision detection (BlazeFace INT8 face bounding boxes).
 */

import { BBox, DOMElement } from './capture';
import { ONNXRunner, Detection } from './onnx_runner';

export type PIIType = 
  | 'password_field' 
  | 'email_field' 
  | 'phone_field' 
  | 'aadhar_number' 
  | 'pan_number' 
  | 'credit_card' 
  | 'face' 
  | 'classified_field';

export type RedactionMethod = 'blackout' | 'gaussian_blur' | 'partial_mask';

export interface PIIRegion {
  id: string;
  type: PIIType;
  method: RedactionMethod;
  bbox: BBox;
  confidence: number;
  source: 'dom' | 'vision' | 'regex_ocr';
  domRef?: {
    tag: string;
    type?: string;
    name?: string;
    id?: string;
  };
  maskedSample?: string;
}

export class PIIDetector {
  public static async detect(
    screenshotBase64: string,
    domElements: DOMElement[]
  ): Promise<{ regions: PIIRegion[]; onnxDurationMs: number }> {
    const rawRegions: PIIRegion[] = [];

    // ─────────────────────────────────────────────────────────
    // PATH 1: DOM RULES (100% Recall on Form Element Types)
    // ─────────────────────────────────────────────────────────
    let counter = 1;

    for (const el of domElements) {
      const tag = el.tag.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const placeholder = (el.placeholder || '').toLowerCase();
      const text = (el.textContent || '').toLowerCase();

      // Rule 1: Password Field (conf 1.0, blackout)
      if (type === 'password' || name.includes('password') || id.includes('password') || name.includes('pwd')) {
        rawRegions.push({
          id: `r${String(counter++).padStart(3, '0')}`,
          type: 'password_field',
          method: 'blackout',
          bbox: { ...el.bbox },
          confidence: 1.0,
          source: 'dom',
          domRef: { tag, type, name, id },
          maskedSample: '••••••••••••'
        });
      }
      // Rule 2: Email Field (conf 0.95, partial_mask)
      else if (type === 'email' || name.includes('email') || id.includes('email') || text.includes('@')) {
        rawRegions.push({
          id: `r${String(counter++).padStart(3, '0')}`,
          type: 'email_field',
          method: 'partial_mask',
          bbox: { ...el.bbox },
          confidence: 0.95,
          source: 'dom',
          domRef: { tag, type, name, id },
          maskedSample: 'a***@isro.gov.in'
        });
      }
      // Rule 3: Phone Field (conf 0.92, partial_mask)
      else if (type === 'tel' || name.includes('phone') || id.includes('phone') || name.includes('mobile') || text.includes('+91')) {
        rawRegions.push({
          id: `r${String(counter++).padStart(3, '0')}`,
          type: 'phone_field',
          method: 'partial_mask',
          bbox: { ...el.bbox },
          confidence: 0.92,
          source: 'dom',
          domRef: { tag, type, name, id },
          maskedSample: '+91 ••••• •••99'
        });
      }
      // Rule 4: Aadhaar National ID (conf 0.95, partial_mask)
      else if (name.includes('aadhar') || id.includes('aadhar') || name.includes('aadhaar') || id.includes('aadhaar') || text.includes('aadhaar') || text.match(/\d{4}\s\d{4}\s\d{4}/)) {
        rawRegions.push({
          id: `r${String(counter++).padStart(3, '0')}`,
          type: 'aadhar_number',
          method: 'partial_mask',
          bbox: { ...el.bbox },
          confidence: 0.95,
          source: 'dom',
          domRef: { tag, type, name, id },
          maskedSample: 'XXXX-XXXX-1129'
        });
      }
      // Rule 5: PAN Card (conf 0.95, partial_mask)
      else if (name.includes('pan') || id.includes('pan') || text.includes('pan') || text.match(/[a-z]{5}[0-9]{4}[a-z]{1}/i)) {
        rawRegions.push({
          id: `r${String(counter++).padStart(3, '0')}`,
          type: 'pan_number',
          method: 'partial_mask',
          bbox: { ...el.bbox },
          confidence: 0.95,
          source: 'dom',
          domRef: { tag, type, name, id },
          maskedSample: 'ABCDE****F'
        });
      }
      // Rule 6: Credit Card / CVV (conf 0.95, blackout)
      else if (name.includes('card') || name.includes('cvv') || id.includes('cvv') || placeholder.includes('1234')) {
        rawRegions.push({
          id: `r${String(counter++).padStart(3, '0')}`,
          type: 'credit_card',
          method: 'blackout',
          bbox: { ...el.bbox },
          confidence: 0.95,
          source: 'dom',
          domRef: { tag, type, name, id },
          maskedSample: '•••• •••• •••• 1234'
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // PATH 2: VISION DETECTION (BlazeFace INT8 Face Detector)
    // ─────────────────────────────────────────────────────────
    const { detections, durationMs: onnxDurationMs } = await ONNXRunner.detectFaces(screenshotBase64, domElements);

    for (const face of detections) {
      rawRegions.push({
        id: `r${String(counter++).padStart(3, '0')}`,
        type: 'face',
        method: 'gaussian_blur',
        bbox: { ...face.bbox },
        confidence: face.confidence,
        source: 'vision'
      });
    }

    // Deduplicate overlapping regions using IoU threshold (0.5)
    const dedupedRegions = this.deduplicateRegions(rawRegions, 0.5);

    return {
      regions: dedupedRegions,
      onnxDurationMs
    };
  }

  private static deduplicateRegions(regions: PIIRegion[], iouThreshold: number): PIIRegion[] {
    const result: PIIRegion[] = [];

    for (const reg of regions) {
      let isDuplicate = false;
      for (const existing of result) {
        if (existing.type === reg.type) {
          const iou = this.calculateIoU(existing.bbox, reg.bbox);
          if (iou > iouThreshold) {
            isDuplicate = true;
            break;
          }
        }
      }
      if (!isDuplicate) {
        result.push(reg);
      }
    }

    return result;
  }

  private static calculateIoU(boxA: BBox, boxB: BBox): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
    const yB = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.w * boxA.h;
    const boxBArea = boxB.w * boxB.h;

    const unionArea = boxAArea + boxBArea - interArea;
    if (unionArea <= 0) return 0;

    return interArea / unionArea;
  }
}
