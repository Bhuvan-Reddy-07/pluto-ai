import os
import shutil
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(ROOT_DIR, "website", "assets")
ARTIFACTS_DIR = r"C:\Users\bhuva\.gemini\antigravity-ide\brain\58cca26b-fc45-40ca-b681-a5f951586092"
EMBLEM_PATH = os.path.join(ASSETS_DIR, "emblem.png")

WEBSITE_URL = "https://bhuvan-reddy-07.github.io/pluto-ai/"
GITHUB_URL = "https://github.com/Bhuvan-Reddy-07/pluto-ai"

def create_qr_with_logo(url, output_path, box_size=12, border=4, add_emblem=True):
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Base QR code image (RGBA)
    img_qr = qr.make_image(fill_color="#0a0c10", back_color="#ffffff").convert("RGBA")

    if add_emblem and os.path.exists(EMBLEM_PATH):
        # Center logo calculation
        emblem = Image.open(EMBLEM_PATH).convert("RGBA")
        qr_w, qr_h = img_qr.size
        
        # Max logo size ~ 22% of QR code to ensure 100% scan reliability with ERROR_CORRECT_H (30% tolerance)
        logo_size = int(qr_w * 0.22)
        emblem = emblem.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        
        # Rounded squircle badge background matching emblem shape with white quiet zone
        pad = 6
        badge_size = logo_size + pad * 2
        badge = Image.new("RGBA", (badge_size, badge_size), (0, 0, 0, 0))
        badge_draw = ImageDraw.Draw(badge)
        
        rad = int(badge_size * 0.25)
        badge_draw.rounded_rectangle([0, 0, badge_size, badge_size], radius=rad, fill=(255, 255, 255, 255), outline=(66, 133, 244, 255), width=2)
        
        # Mask emblem cleanly to squircle
        emblem_mask = Image.new("L", (logo_size, logo_size), 0)
        emblem_mask_draw = ImageDraw.Draw(emblem_mask)
        emblem_mask_draw.rounded_rectangle([0, 0, logo_size, logo_size], radius=int(logo_size * 0.22), fill=255)
        
        badge.paste(emblem, (pad, pad), emblem_mask)
        
        # Paste badge in center of QR
        pos = ((qr_w - badge_size) // 2, (qr_h - badge_size) // 2)
        img_qr.paste(badge, pos, badge)

    img_qr.save(output_path, "PNG")
    print(f"[+] Saved QR code to {output_path}")
    return img_qr

def create_presentation_card(qr_img, url, output_path):
    # Create a presentation card (width 800, height 1020)
    card_w, card_h = 800, 1040
    card = Image.new("RGBA", (card_w, card_h), (10, 12, 16, 255))
    draw = ImageDraw.Draw(card)

    # Outer border / subtle glow
    draw.rounded_rectangle([16, 16, card_w - 16, card_h - 16], radius=28, outline=(138, 180, 248, 80), width=2)

    # Top Brand Bar with Emblem
    if os.path.exists(EMBLEM_PATH):
        emblem = Image.open(EMBLEM_PATH).convert("RGBA").resize((64, 64), Image.Resampling.LANCZOS)
        card.paste(emblem, ((card_w - 64) // 2, 50), emblem)

    # Font handling
    try:
        font_title = ImageFont.truetype("arial.ttf", 36)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_url = ImageFont.truetype("consola.ttf", 18)
        font_badge = ImageFont.truetype("arial.ttf", 15)
    except:
        font_title = font_sub = font_url = font_badge = ImageFont.load_default()

    # Title & Subtitle
    title_text = "Pluto AI"
    sub_text = "Privacy-First Autonomous Browser Agent"
    
    # Calculate bounding boxes
    t_bbox = draw.textbbox((0, 0), title_text, font=font_title)
    draw.text(((card_w - (t_bbox[2] - t_bbox[0])) // 2, 130), title_text, fill=(240, 244, 249), font=font_title)
    
    s_bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
    draw.text(((card_w - (s_bbox[2] - s_bbox[0])) // 2, 180), sub_text, fill=(196, 199, 197), font=font_sub)

    # QR container box (white card background for maximum optical contrast on all smartphone cameras)
    box_padding = 24
    qr_card_w = qr_img.width + box_padding * 2
    qr_card_h = qr_img.height + box_padding * 2
    box_x = (card_w - qr_card_w) // 2
    box_y = 230
    
    draw.rounded_rectangle([box_x, box_y, box_x + qr_card_w, box_y + qr_card_h], radius=24, fill=(255, 255, 255, 255))
    card.paste(qr_img, (box_x + box_padding, box_y + box_padding), qr_img)

    # Scan instruction
    scan_text = "Scan to Visit Website"
    scan_bbox = draw.textbbox((0, 0), scan_text, font=font_sub)
    draw.text(((card_w - (scan_bbox[2] - scan_bbox[0])) // 2, box_y + qr_card_h + 30), scan_text, fill=(138, 180, 248), font=font_sub)

    # URL Text Chip
    url_box_y = box_y + qr_card_h + 75
    url_bbox = draw.textbbox((0, 0), url, font=font_url)
    url_text_w = url_bbox[2] - url_bbox[0]
    chip_w = url_text_w + 36
    chip_x = (card_w - chip_w) // 2
    draw.rounded_rectangle([chip_x, url_box_y, chip_x + chip_w, url_box_y + 42], radius=21, fill=(22, 24, 28, 255), outline=(255, 255, 255, 30), width=1)
    draw.text((chip_x + 18, url_box_y + 11), url, fill=(120, 217, 236), font=font_url)

    # Feature pills row at bottom
    badge_text = "Zero-Leak Vision  *  On-Device PII  *  Multi-Model BYOK"
    b_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
    draw.text(((card_w - (b_bbox[2] - b_bbox[0])) // 2, url_box_y + 70), badge_text, fill=(142, 145, 143), font=font_badge)

    card.save(output_path, "PNG")
    print(f"[+] Saved Presentation Card to {output_path}")

def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    # 1. Website - Clean QR Code
    clean_site_path = os.path.join(ASSETS_DIR, "qr_code_website_clean.png")
    create_qr_with_logo(WEBSITE_URL, clean_site_path, box_size=14, border=4, add_emblem=False)

    # 2. Website - Branded QR Code (With centered Pluto emblem badge)
    branded_site_path = os.path.join(ASSETS_DIR, "qr_code_website.png")
    qr_site_img = create_qr_with_logo(WEBSITE_URL, branded_site_path, box_size=12, border=3, add_emblem=True)

    # 3. Website - Full Presentation Shareable Card
    card_path = os.path.join(ASSETS_DIR, "qr_code_presentation_card.png")
    create_presentation_card(qr_site_img, WEBSITE_URL, card_path)

    # 4. GitHub Repository - Branded QR Code
    branded_gh_path = os.path.join(ASSETS_DIR, "qr_code_github.png")
    create_qr_with_logo(GITHUB_URL, branded_gh_path, box_size=12, border=3, add_emblem=True)

    # Copy to artifacts directory so user and system can view directly
    files_to_copy = [
        "qr_code_website_clean.png",
        "qr_code_website.png",
        "qr_code_presentation_card.png",
        "qr_code_github.png"
    ]
    for filename in files_to_copy:
        src = os.path.join(ASSETS_DIR, filename)
        dst = os.path.join(ARTIFACTS_DIR, filename)
        shutil.copy2(src, dst)
        print(f"[+] Copied {filename} to artifacts directory: {dst}")

if __name__ == "__main__":
    main()
