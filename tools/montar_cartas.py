"""Gera a arte da carta e o medalhão de cada personagem.

Uso: python tools/montar_cartas.py
Lê assets/cartas/cartas.json e as imagens em assets/cartas/originais/<id>.(jpg|png).
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / 'assets' / 'cartas'


def original(id_):
    for ext in ('png', 'jpg', 'jpeg', 'webp'):
        p = PASTA / 'originais' / f'{id_}.{ext}'
        if p.exists():
            return Image.open(p).convert('RGB')
    raise FileNotFoundError(f'Imagem de {id_} não encontrada em assets/cartas/originais')


for c in json.loads((PASTA / 'cartas.json').read_text(encoding='utf-8'))['cartas']:
    if c.get('feitico') or c.get('imagem') or c.get('token'):
        continue  # feitiços, barril e minis usam imagens próprias
    try:
        img = original(c['id'])
    except FileNotFoundError as e:
        print('pulando:', e)
        continue
    x, y, w = c['arte']
    h = round(w * 4 / 3)
    img.crop((x, y, x + w, y + h)).resize((360, 480), Image.LANCZOS).save(PASTA / f"{c['id']}.jpg", quality=88)

    cx, cy, r = c['rosto']
    rosto = img.crop((cx - r, cy - r, cx + r, cy + r)).resize((256, 256), Image.LANCZOS)
    mascara = Image.new('L', (256 * 4, 256 * 4), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, 256 * 4 - 1, 256 * 4 - 1), fill=255)
    medalhao = rosto.convert('RGBA')
    medalhao.putalpha(mascara.resize((256, 256), Image.LANCZOS))
    medalhao.save(PASTA / f"{c['id']}_medalhao.png")

    # faixa horizontal com o rosto (usada na tela de título)
    W, H = img.size
    fw = min(W, round(r * 4.2))
    fh = round(fw / 3)
    x0 = max(0, min(W - fw, cx - fw // 2))
    y0 = max(0, min(H - fh, cy - fh // 2 - round(r * 0.1)))
    img.crop((x0, y0, x0 + fw, y0 + fh)).resize((720, 240), Image.LANCZOS).save(PASTA / f"{c['id']}_faixa.jpg", quality=85)
    print('ok', c['id'])
