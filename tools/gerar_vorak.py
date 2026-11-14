"""Desenha o Vorak, rival original do Zaphir (nada de Dragon Ball), em 3 versões, sem fundo.
Gera assets/summon/luta/vorak_<versao>.png. Uso: python3 tools/gerar_vorak.py
"""
import math, random, subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SVGS = RAIZ / 'tools' / 'recursos' / 'vorak'
LUTA = RAIZ / 'assets' / 'summon' / 'luta'
SVGS.mkdir(parents=True, exist_ok=True); LUTA.mkdir(parents=True, exist_ok=True)

VERSOES = {
    'normal': dict(pele='#8D7CC4', pele_s='#5E4E99', corno='#EFE6C8', corno_s='#9C8F66', olho='#FFE45C', metal='#38304F', metal_l='#6C5F96', ouro='#D9B04A', capa='#2A1F45', capa_l='#4B3A7A'),
    'lendaria': dict(pele='#B5483A', pele_s='#7A2A22', corno='#FFD9A0', corno_s='#B07A3A', olho='#FFFFFF', metal='#3A1218', metal_l='#7A2A35', ouro='#FFB347', capa='#4A0F18', capa_l='#8A2030'),
    'ultra': dict(pele='#2A2F5A', pele_s='#12163A', corno='#9FE6FF', corno_s='#3A7AC8', olho='#7FFFFF', metal='#10142E', metal_l='#3A4A9A', ouro='#58E0FF', capa='#0A0C24', capa_l='#2A3A8A'),
}


def desenhar(f):
    cx = 360
    o = []; a = o.append
    a('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 960" width="720" height="960">')
    a(f'''<defs>
<linearGradient id="pele" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{f['pele_s']}"/><stop offset=".5" stop-color="{f['pele']}"/><stop offset="1" stop-color="{f['pele']}"/></linearGradient>
<linearGradient id="corno" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{f['corno_s']}"/><stop offset="1" stop-color="{f['corno']}"/></linearGradient>
<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{f['metal_l']}"/><stop offset="1" stop-color="{f['metal']}"/></linearGradient>
<linearGradient id="capa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{f['capa_l']}"/><stop offset="1" stop-color="{f['capa']}"/></linearGradient>
<linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="{f['ouro']}"/><stop offset="1" stop-color="#5a3a10"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="6"/></filter></defs>''')
    # gola alta da capa atrás da cabeça
    a(f'<path d="M110,960 L90,520 Q120,380 230,330 L250,430 L470,430 L490,330 Q600,380 630,520 L610,960Z" fill="url(#capa)" stroke="#05030a" stroke-width="5" stroke-linejoin="round"/>')
    a(f'<path d="M90,520 Q60,430 100,360 Q160,420 190,520Z M630,520 Q660,430 620,360 Q560,420 530,520Z" fill="url(#capa)" stroke="#05030a" stroke-width="4"/>')
    # chifres grandes e curvos
    for s in (-1, 1):
        x = cx + s * 70
        a(f'<path d="M{x},300 Q{x + s * 120},250 {x + s * 150},110 Q{x + s * 190},230 {x + s * 150},330 Q{x + s * 90},330 {x},330Z" fill="url(#corno)" stroke="{f["corno_s"]}" stroke-width="5" stroke-linejoin="round"/>')
        a(f'<path d="M{x + s * 20},300 Q{x + s * 100},260 {x + s * 138},150" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/>')
    # coroa central (espeto)
    a(f'<path d="M{cx - 34},300 L{cx - 18},150 L{cx},235 L{cx + 18},150 L{cx + 34},300Z" fill="url(#corno)" stroke="{f["corno_s"]}" stroke-width="5" stroke-linejoin="round"/>')
    # pescoço + torso
    a(f'<path d="M310,470 L310,560 Q360,600 410,560 L410,470Z" fill="url(#pele)" stroke="#05030a" stroke-opacity=".5" stroke-width="3"/>')
    a(f'<path d="M60,960 L90,660 Q130,570 230,545 L490,545 Q590,570 630,660 L660,960Z" fill="{f["metal"]}" stroke="#05030a" stroke-width="5"/>')
    # ombreiras espinhosas
    for s in (-1, 1):
        x = cx + s * 215
        a(f'<path d="M{x - 95 * s},575 Q{x},500 {x + 120 * s},560 L{x + 175 * s},470 L{x + 150 * s},620 Q{x + 150 * s},700 {x + 90 * s},720 Q{x},720 {x - 95 * s},650Z" fill="url(#metal)" stroke="#05030a" stroke-width="5" stroke-linejoin="round"/>')
        a(f'<path d="M{x - 70 * s},590 Q{x},535 {x + 100 * s},585" fill="none" stroke="url(#ouro)" stroke-width="8" stroke-linecap="round"/>')
        a(f'<path d="M{x + 40 * s},650 L{x + 120 * s},700 L{x + 70 * s},610Z" fill="url(#corno)" stroke="{f["corno_s"]}" stroke-width="3"/>')
    # peitoral com emblema de coroa/espinho
    a(f'<path d="M255,585 Q360,630 465,585 L488,720 Q470,840 360,890 Q250,840 232,720Z" fill="url(#metal)" stroke="#05030a" stroke-width="5" stroke-linejoin="round"/>')
    a(f'<path d="M255,585 Q360,630 465,585" fill="none" stroke="url(#ouro)" stroke-width="8" stroke-linecap="round"/>')
    a(f'<path d="M318,720 L338,690 L360,725 L382,690 L402,720 L402,760 L318,760Z" fill="url(#ouro)" stroke="#2a1a05" stroke-width="4" stroke-linejoin="round"/>')
    # rosto: queixo largo, boca coberta por placa de metal
    rosto = 'M262,320 C258,250 462,250 458,320 C462,385 430,440 360,470 C290,440 258,385 262,320Z'
    a(f'<path d="{rosto}" fill="url(#pele)" stroke="#05030a" stroke-opacity=".6" stroke-width="4"/>')
    a(f'<clipPath id="cr"><path d="{rosto}"/></clipPath>')
    a(f'<g clip-path="url(#cr)"><path d="M258,250 L330,320 Q318,420 360,480 L258,480Z" fill="{f["pele_s"]}" opacity=".5"/></g>')
    # olhos estreitos, brilhando
    for s in (-1, 1):
        ex = cx + s * 46; ox = cx + s * 88; ix = cx + s * 10
        a(f'<ellipse cx="{ex}" cy="352" rx="34" ry="16" fill="{f["olho"]}" opacity=".35" filter="url(#blur)"/>')
        a(f'<path d="M{ox},338 Q{ex},330 {ix},352 Q{ex},364 {ox},338Z" fill="{f["olho"]}" stroke="#05030a" stroke-width="3.5"/>')
        a(f'<ellipse cx="{ex - s * 2}" cy="348" rx="5" ry="10" fill="#14040a"/>')
        a(f'<path d="M{ox + s * 10},322 Q{ex + s * 2},322 {ix - s * 8},350" fill="none" stroke="#05030a" stroke-width="9" stroke-linecap="round"/>')
    # marcas no rosto
    a(f'<path d="M290,310 L310,330 M430,310 L410,330" stroke="{f["pele_s"]}" stroke-width="6" stroke-linecap="round"/>')
    # placa de mandíbula
    a(f'<path d="M278,400 Q360,382 442,400 Q430,455 360,478 Q290,455 278,400Z" fill="url(#metal)" stroke="#05030a" stroke-width="4"/>')
    for k in range(5):
        x = 306 + k * 27
        a(f'<path d="M{x},418 L{x + 8},446 L{x + 16},418Z" fill="{f["corno"]}" stroke="{f["corno_s"]}" stroke-width="2"/>')
    a('</svg>')
    return '\n'.join(o)


if __name__ == '__main__':
    for nome, f in VERSOES.items():
        svg = SVGS / f'{nome}.svg'
        svg.write_text(desenhar(f), encoding='utf-8')
        subprocess.run(['rsvg-convert', '-w', '560', '-h', '747', str(svg), '-o', str(LUTA / f'vorak_{nome}.png')], check=True)
        print('ok', nome)
