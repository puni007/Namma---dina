import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_base_icon(size=1024, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    scale = size / 512.0

    # Draw gradient background
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_bg = ImageDraw.Draw(bg)
    top_color = (11, 26, 29, 255) # #0b1a1d
    bot_color = (1, 6, 9, 255)    # #010609

    for y in range(size):
        ratio = y / size
        r = int(top_color[0] * (1 - ratio) + bot_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bot_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bot_color[2] * ratio)
        draw_bg.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask background if not maskable (rounded rect rx=128 in 512 space)
    if not maskable:
        mask = Image.new('L', (size, size), 0)
        draw_mask = ImageDraw.Draw(mask)
        radius = int(128 * scale)
        draw_mask.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
        bg.putalpha(mask)

    img.alpha_composite(bg)

    # Glow layer
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    gx, gy = int(344 * scale), int(147 * scale)
    gr = int(206 * scale)
    for r in range(gr, 0, -4):
        alpha = int(100 * ((1 - (r / gr)) ** 1.5))
        glow_draw.ellipse([gx - r, gy - r, gx + r, gy + r], fill=(126, 242, 191, alpha))

    img.alpha_composite(glow)

    # Wave drawing
    waves = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_waves = ImageDraw.Draw(waves)

    # Upper wave: mint to violet
    points_upper = []
    for x_orig in range(78, 435):
        t = (x_orig - 78) / (434 - 78)
        # Bezier-like curve approximation
        y_orig = 288 - 120 * math.sin(t * math.pi) + 30 * math.sin(t * 2 * math.pi)
        points_upper.append((x_orig * scale, y_orig * scale))

    w_width1 = max(4, int(24 * scale))
    for i in range(len(points_upper) - 1):
        t = i / len(points_upper)
        # mint #7ef2bf to violet #ae9de2
        r = int(126 * (1 - t) + 174 * t)
        g = int(242 * (1 - t) + 157 * t)
        b = int(191 * (1 - t) + 226 * t)
        draw_waves.line([points_upper[i], points_upper[i+1]], fill=(r, g, b, 240), width=w_width1)

    # Lower wave: light mint
    points_lower = []
    for x_orig in range(86, 433):
        t = (x_orig - 86) / (432 - 86)
        y_orig = 350 - 70 * math.sin(t * math.pi) + 20 * math.sin(t * 2 * math.pi)
        points_lower.append((x_orig * scale, y_orig * scale))

    w_width2 = max(3, int(16 * scale))
    for i in range(len(points_lower) - 1):
        draw_waves.line([points_lower[i], points_lower[i+1]], fill=(154, 255, 212, 195), width=w_width2)

    # Morning star circles
    sx, sy = int(358 * scale), int(179 * scale)
    outer_r = int(51 * scale)
    inner_r = int(29 * scale)
    draw_waves.ellipse([sx - outer_r, sy - outer_r, sx + outer_r, sy + outer_r], fill=(126, 242, 191, 35))
    draw_waves.ellipse([sx - inner_r, sy - inner_r, sx + inner_r, sy + inner_r], fill=(203, 255, 242, 245))

    img.alpha_composite(waves)
    return img

def main():
    target_dir = os.path.join(os.path.dirname(__file__), '..', 'client', 'public')
    os.makedirs(target_dir, exist_ok=True)

    master = create_base_icon(1024, maskable=False)
    master_maskable = create_base_icon(1024, maskable=True)

    icons = [
        ('pwa-192x192.png', 192, master),
        ('pwa-512x512.png', 512, master),
        ('apple-touch-icon.png', 180, master),
        ('favicon.png', 64, master),
        ('pwa-maskable-512x512.png', 512, master_maskable),
    ]

    for name, sz, source in icons:
        out_path = os.path.join(target_dir, name)
        resized = source.resize((sz, sz), Image.Resampling.LANCZOS)
        resized.save(out_path, 'PNG', optimize=True)
        print(f"Generated {out_path} ({sz}x{sz})")

if __name__ == '__main__':
    main()

