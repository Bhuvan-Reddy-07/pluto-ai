"""
Redaction Parser
Converts structured Redaction Protocol JSON into a natural language description for the VLM.
"""

from typing import Dict, Any, List

TYPE_LABELS = {
    "face": "a person's face (blurred)",
    "password_field": "a password input field (blacked out)",
    "email_field": "an email address (partially masked)",
    "phone_field": "a telephone number (partially masked)",
    "aadhar_number": "a national Aadhaar number (partially masked)",
    "pan_number": "a government PAN card identifier (partially masked)",
    "credit_card": "a credit card / CVV number (blacked out)",
    "classified_field": "a classified defense field (sanitized)"
}

class RedactionParser:
    @staticmethod
    def build_context(metadata: Dict[str, Any]) -> str:
        """
        Builds the complete VLM contextual prompt from the redaction metadata JSON.
        """
        dom_summary = metadata.get("dom_summary", {})
        page_title = dom_summary.get("page_title", "ISRO Mission Operations Complex (ISTRAC)")
        user_intent = metadata.get("user_intent", "Navigate and complete the task shown on screen")
        redaction_regions: List[Dict[str, Any]] = metadata.get("redaction_regions", [])
        interactive_elements: List[Dict[str, Any]] = dom_summary.get("interactive_elements", [])

        lines = [
            f"Page: {page_title}",
            f"User intent: {user_intent}",
            f"{len(redaction_regions)} region(s) redacted for privacy:"
        ]

        for r in redaction_regions:
            r_id = r.get("id", "r000")
            r_type = r.get("type", "classified_field")
            label = TYPE_LABELS.get(r_type, r_type.replace("_", " "))
            bbox = r.get("bbox", {})
            conf = r.get("confidence", 0.98)
            src = r.get("source", "dom")
            dom_ref = r.get("domRef")
            ref_str = f" [{dom_ref.get('tag', '')}, {dom_ref.get('type', '')}, {dom_ref.get('name', '')}]" if dom_ref else ""

            lines.append(
                f" - {r_id}: {label}{ref_str} at (x={bbox.get('x', 0)},y={bbox.get('y', 0)},w={bbox.get('w', 0)},h={bbox.get('h', 0)}) conf={conf:.2f} src={src}"
            )

        lines.append(f"Interactive elements ({len(interactive_elements)} visible):")
        for el in interactive_elements:
            el_type = el.get("type", "element")
            label = el.get("label", "Element")
            bbox = el.get("bbox", {})
            redacted_id = el.get("redacted_id")

            if redacted_id:
                lines.append(f" - {el_type} '{label}' @({bbox.get('x', 0)},{bbox.get('y', 0)}) [REDACTED: {redacted_id}]")
            else:
                lines.append(f" - {el_type} '{label}' @({bbox.get('x', 0)},{bbox.get('y', 0)})")

        return "\n".join(lines)
