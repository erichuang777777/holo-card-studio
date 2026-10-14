#!/usr/bin/env python3
"""2D art for an officer from one cut-out photo (RGBA, transparent background; e.g. game/tools/prepare_portrait.py's
cut-out): writes into musou/assets/portraits/ (gitignored: portraits of real people stay out of the repo)

  <id>-badge.png   64 × 64 pixel-art head (HUD badge, select roster, dialogue box): k-means palette, dark outline
  <id>-cut.png     anime-style bust for the Musou cut-in: flat cel colours, inked lines (XDoG), a thick outline and an
                   accent-coloured rim light

usage: python3 tools/portrait2d.py <cutout.png> <id> [--accent #3dff8a] [--badge-colors 22] [--cel-colors 12]
The game picks these up when present (chars/index.js paintPortrait, musou/overlay.js) and falls back to the 20 × 20
code portrait when they are not.
"""
import argparse
import os

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'portraits')


def face_box(rgb):
    """Largest frontal face (x, y, w, h); falls back to the top-centre of the silhouette."""
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    cc = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cc.detectMultiScale(gray, 1.1, 6, minSize=(gray.shape[1] // 12,) * 2)
    if len(faces):
        return max(faces, key=lambda f: f[2] * f[3])
    h, w = gray.shape
    return (w * 3 // 8, h // 8, w // 4, w // 4)


def kmeans(img, k, mask):
    """Quantise the masked pixels of img (RGB uint8) to k colours in Lab; unmasked pixels are left as they are."""
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    px = lab[mask].reshape(-1, 3).astype(np.float32)
    k = min(k, len(px))
    _, lbl, ctr = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 4, cv2.KMEANS_PP_CENTERS)
    out = lab.copy()
    out[mask] = ctr[lbl.ravel()].astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_LAB2RGB)


def kmeans_split(img, k, mask, ysplit):
    """kmeans with its own palette above and below ysplit (the chin), so skin highlights never borrow the coat's
    white-blue."""
    top = mask.copy(); top[ysplit:] = False
    bot = mask & ~top
    out = img.copy()
    for m, kk in ((top, k), (bot, max(4, k * 2 // 3))):
        if m.any():
            q = kmeans(img, kk, m)
            out[m] = q[m]
    return out


def crop(rgba, cx, cy, size_w, size_h):
    """Crop a box centred on (cx, cy), padding with transparency where it leaves the image."""
    h, w = rgba.shape[:2]
    x0, y0 = int(cx - size_w / 2), int(cy - size_h / 2)
    out = np.zeros((int(size_h), int(size_w), 4), np.uint8)
    sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(w, x0 + int(size_w)), min(h, y0 + int(size_h))
    out[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = rgba[sy0:sy1, sx0:sx1]
    return out


def badge(rgba, face, colors):
    """64 × 64 pixel-art head and shoulders."""
    fx, fy, fw, fh = face
    side = fw * 1.6
    cy = fy + fh * 0.5
    c = crop(rgba, fx + fw / 2, cy, side, side)
    rgb, a = c[..., :3], c[..., 3]
    rgb = cv2.bilateralFilter(rgb, 9, 40, 9)
    small = cv2.resize(rgb, (64, 64), interpolation=cv2.INTER_AREA)
    alpha = cv2.resize(a, (64, 64), interpolation=cv2.INTER_AREA) > 110
    # a touch more contrast and saturation so it reads at badge size
    hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.15, 0, 255)
    hsv[..., 2] = np.clip((hsv[..., 2] - 128) * 1.1 + 128, 0, 255)
    small = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    chin = int(((fy + fh * 1.05) - (cy - side / 2)) / side * 64)
    small = kmeans_split(small, colors, alpha, chin)
    out = np.zeros((64, 64, 4), np.uint8)
    out[..., :3] = small
    out[..., 3] = np.where(alpha, 255, 0)
    # 1-px dark outline just outside the silhouette (not along the crop's bottom edge)
    ring = cv2.dilate(alpha.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~alpha
    ring[-1, :] = False
    out[ring] = (14, 10, 12, 255)
    return out


def xdog(gray, sigma=0.9, k=1.6, p=19, eps=-0.08, phi=12):
    """Extended difference of Gaussians: soft inked lines (1 = paper, 0 = ink)."""
    g = gray.astype(np.float32) / 255
    a, b = cv2.GaussianBlur(g, (0, 0), sigma), cv2.GaussianBlur(g, (0, 0), sigma * k)
    d = (1 + p) * a - p * b
    return np.where(d >= eps, 1.0, 1 + np.tanh(phi * (d - eps)))


def cut_art(rgba, face, colors, accent):
    """Anime-style bust ≈ 900 px tall: from above the hair to mid-chest."""
    fx, fy, fw, fh = face
    W, H, cy = fw * 3.4, fw * 4.2, fy + fh * 1.45
    c = crop(rgba, fx + fw / 2, cy, W, H)
    scale = 900 / c.shape[0]
    chin = int(((fy + fh * 1.08) - (cy - H / 2)) * scale)
    c = cv2.resize(c, (int(c.shape[1] * scale), 900), interpolation=cv2.INTER_AREA)
    rgb, a = c[..., :3].copy(), c[..., 3]
    mask = a > 128
    for _ in range(4):                                   # flatten the shading into painted regions
        rgb = cv2.bilateralFilter(rgb, 9, 30, 7)
    cel = kmeans_split(rgb, colors, mask, chin)
    cel = cv2.medianBlur(cel, 5)
    # ink: XDoG on the smoothed photo, thinned where the cel regions are flat
    ink = xdog(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
    ink = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 0.6)
    out = cel.astype(np.float32) * (0.25 + 0.75 * ink[..., None])
    # rim light: an accent glow just inside the silhouette on the right side, fading inward
    dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
    side = np.clip((np.arange(mask.shape[1])[None, :] / mask.shape[1] - 0.45) * 3, 0, 1)
    rim = np.exp(-dist / 7.0) * side * mask
    acc = np.array([int(accent[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
    out = out * (1 - 0.7 * rim[..., None]) + acc * 0.7 * rim[..., None] * 1.3
    # thick dark outline round the silhouette
    m8 = mask.astype(np.uint8)
    outline = cv2.dilate(m8, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))).astype(bool) & ~mask
    res = np.zeros(c.shape, np.uint8)
    res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    res[..., 3] = np.where(mask, 255, 0)
    res[outline] = (12, 10, 14, 255)
    # fade the bottom edge (the crop cuts through the chest)
    fade = np.clip((900 - np.arange(900)) / 120, 0, 1)[:, None]
    res[..., 3] = (res[..., 3] * fade).astype(np.uint8)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'), ap.add_argument('id')
    ap.add_argument('--accent', default='#3dff8a')
    ap.add_argument('--badge-colors', type=int, default=22)
    ap.add_argument('--cel-colors', type=int, default=14)
    a = ap.parse_args()
    im = cv2.imread(a.src, cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 3:
        im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    rgba = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA)
    face = face_box(rgba[..., :3])
    os.makedirs(OUT, exist_ok=True)
    for name, img in (('badge', badge(rgba, face, a.badge_colors)), ('cut', cut_art(rgba, face, a.cel_colors, a.accent))):
        p = os.path.join(OUT, f'{a.id}-{name}.png')
        cv2.imwrite(p, cv2.cvtColor(img, cv2.COLOR_RGBA2BGRA))
        print('wrote', os.path.relpath(p), img.shape[1], 'x', img.shape[0])


if __name__ == '__main__':
    main()
