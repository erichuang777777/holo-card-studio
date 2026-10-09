"""把醫師照片處理成 3D 展示用素材：AI 去背、程式推算深度圖、偵測臉部位置。

用法：python3 tools/prepare_portrait.py <輸出資料夾> <名稱>=<照片路徑> [<名稱>=<照片路徑> ...]
輸出：<名稱>.png（透明背景）、<名稱>-depth.png（灰階深度）、meta.json（臉部框，0–1 座標）。
需要：rembg、opencv-python-headless<5（需 Haar 人臉偵測）、numpy、Pillow。照片建議為單色背景、半身以上、正面。
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

MAX_SIDE = 2048
DEPTH_SIDE = 768


def cutout(path, session):
    im = Image.open(path).convert('RGB')
    scale = min(1, MAX_SIDE / max(im.size))
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    rgba = remove(im, session=session)
    # 去掉去背後殘留的半透明背景色光暈：把邊緣像素的顏色往內側推。
    a = np.asarray(rgba)[..., 3]
    ys, xs = np.nonzero(a > 8)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return rgba.crop(box)


def detect_face(rgb):
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, 1.1, 6, minSize=(gray.shape[1] // 10, gray.shape[1] // 10))
    if not len(faces):
        h, w = gray.shape
        return (w * 0.35, h * 0.08, w * 0.3, h * 0.2)
    return max(faces, key=lambda f: f[2] * f[3])


def depth_map(rgba, face):
    w, h = rgba.size
    s = DEPTH_SIDE / max(w, h)
    small = rgba.resize((round(w * s), round(h * s)), Image.LANCZOS)
    alpha = np.asarray(small)[..., 3].astype(np.float32) / 255
    mask = (alpha > 0.5).astype(np.uint8)
    # 身體：依離輪廓的距離做圓弧隆起，邊緣圓、中間平。
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    radius = 0.16 * small.width
    t = np.clip(dist / radius, 0, 1)
    body = np.sqrt(1 - (1 - t) ** 2)
    # 頭部：臉框外擴的橢球；鼻子：小凸起。
    fx, fy, fw, fh = [v * s for v in face]
    cx, cy = fx + fw / 2, fy + fh / 2
    yy, xx = np.mgrid[0:small.height, 0:small.width].astype(np.float32)
    r = ((xx - cx) / (fw * 0.9)) ** 2 + ((yy - cy) / (fh * 0.95)) ** 2  # 夠寬才能讓耳朵落在緩坡上
    head = np.sqrt(np.clip(1 - r, 0, 1))
    nose = np.exp(-(((xx - cx) / (fw * 0.09)) ** 2 + ((yy - (cy + fh * 0.08)) / (fh * 0.16)) ** 2))
    depth = 0.55 * body + 0.4 * head + 0.12 * nose
    depth = cv2.GaussianBlur(depth, (0, 0), small.width * 0.014) * mask
    depth /= depth.max()
    return Image.fromarray((depth * 255).astype(np.uint8), 'L')


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    session = new_session('isnet-general-use')
    meta = {}
    for arg in sys.argv[2:]:
        name, path = arg.split('=', 1)
        rgba = cutout(path, session)
        face = detect_face(np.asarray(rgba.convert('RGB')))
        rgba.save(out / f'{name}.png', optimize=True)
        depth_map(rgba, face).save(out / f'{name}-depth.png')
        w, h = rgba.size
        meta[name] = {'size': [w, h], 'face': [round(float(v), 4) for v in (face[0] / w, face[1] / h, face[2] / w, face[3] / h)]}
        print(name, rgba.size, 'face', meta[name]['face'])
    (out / 'meta.json').write_text(json.dumps(meta, indent=2))


if __name__ == '__main__':
    main()
