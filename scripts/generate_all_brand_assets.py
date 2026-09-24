"""
Pluto AI - Master Brand & Icon Generator
Processes the user's uploaded Pluto AI logo into all production extension and website icon formats.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

SOURCE_IMAGE_PATH = r"C:\Users\bhuva\.gemini\antigravity-ide\brain\58cca26b-fc45-40ca-b681-a5f951586092\.user_uploaded\media_1790259803276.png"

def generate_assets():
    if not os.path.exists(SOURCE_IMAGE_PATH):
        raise FileNotFoundError(f"Source logo not found at {SOURCE_IMAGE_PATH}")

    src = Image.open(SOURCE_IMAGE_PATH).convert("RGBA")
    w, h = src.size
    print(f"Loaded master logo: {w}x{h}")

    # 1. Master Full Logo (emblem + text)
    full_logo = src.copy()
    
    # 2. Extract Planet Emblem:
    # Planet center is cx=263, cy=192. Ring extent rx=196, ry=146
    cx, cy = 263, 192
    rx, ry = 196, 146

    # Elliptical anti-aliased mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=2))

    emblem_isolated = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    emblem_isolated.paste(src, (0, 0), mask)
    emblem_crop = emblem_isolated.crop((cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + ry + 4))

    # 3. Create 512x512 Master Emblem Squircle Icon
    size = 512
    master_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Cosmic dark radial gradient background
    bg = Image.new("RGBA", (size, size), (5, 13, 28, 255))
    bg_draw = ImageDraw.Draw(bg)
    for r in range(size // 2, 0, -6):
        alpha = int(80 * (1 - r / (size / 2)))
        bg_draw.ellipse([size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r], fill=(22, 38, 80, alpha))

    # Scale emblem into 512 squircle with comfortable padding
    ew, eh = emblem_crop.size
    target_w = int(size * 0.86)
    target_h = int(eh * (target_w / ew))
    emblem_resized = emblem_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)

    ox = (size - target_w) // 2
    oy = (size - target_h) // 2
    bg.paste(emblem_resized, (ox, oy), emblem_resized)

    # Squircle mask (radius ~22%)
    sq_radius = int(size * 0.22)
    sq_mask = Image.new("L", (size, size), 0)
    sq_draw = ImageDraw.Draw(sq_mask)
    sq_draw.rounded_rectangle([0, 0, size, size], radius=sq_radius, fill=255)

    master_icon.paste(bg, (0, 0), sq_mask)

    # Subtle glowing outer/inner border
    border_draw = ImageDraw.Draw(master_icon)
    border_draw.rounded_rectangle(
        [2, 2, size - 3, size - 3],
        radius=sq_radius,
        outline=(138, 180, 248, 80),
        width=4
    )

    # 4. Generate all icon sizes
    icons = {
        "icon16.png": master_icon.resize((16, 16), Image.Resampling.LANCZOS),
        "icon32.png": master_icon.resize((32, 32), Image.Resampling.LANCZOS),
        "icon48.png": master_icon.resize((48, 48), Image.Resampling.LANCZOS),
        "icon128.png": master_icon.resize((128, 128), Image.Resampling.LANCZOS),
        "emblem.png": master_icon,
        "logo.png": full_logo
    }

    # Destinations
    destinations = [
        r"c:\Users\bhuva\Desktop\practice\Pluto AI\Pluto AI\icons",
        r"c:\Users\bhuva\Desktop\practice\Pluto AI\Pluto AI\frontend\icons",
        r"c:\Users\bhuva\Desktop\practice\Pluto AI\Pluto AI\dist\icons",
        r"c:\Users\bhuva\Desktop\practice\Pluto AI\Pluto AI\website\assets",
        r"c:\Users\bhuva\Desktop\practice\integration pluto\extension\icons"
    ]

    for dest in destinations:
        os.makedirs(dest, exist_ok=True)
        for name, img in icons.items():
            out_path = os.path.join(dest, name)
            img.save(out_path, format="PNG")
            print(f"[OK] Wrote {out_path}")

    print("\nAll icons and logos successfully generated and synchronized!")

if __name__ == "__main__":
    generate_assets()
