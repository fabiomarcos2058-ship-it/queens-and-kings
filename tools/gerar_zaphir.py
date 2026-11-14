"""Desenha o Zaphir, Saiyajin original do jogo (nada de Dragon Ball), em 3 formas.

Gera SVGs em tools/recursos/zaphir/ e rasteriza com rsvg-convert para
assets/cartas/originais/<id>.png (720x960). Depois rode montar_cartas.py (só estes ids).
Uso: python3 tools/gerar_zaphir.py
"""
import math, random, subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SVGS = RAIZ / 'tools' / 'recursos' / 'zaphir'
ORIG = RAIZ / 'assets' / 'cartas' / 'originais'
SVGS.mkdir(parents=True, exist_ok=True)

W, H = 720, 960
HC = (360, 335)  # centro da cabeça

FORMAS = {
    'zaphir': dict(
        nome='Zaphir', pele='#C98F5E', pele_s='#A06A40', cabelo='#1B1733', cabelo_l='#5A4E9A', cabelo_s='#0C0A1C',
        olho='#2B1B0E', brilho_olho=None, aura=('#7A5CFF', '#2A1B7A'), bg=('#3A2A78', '#120A2E'), metal='#2B2F4A', metal_l='#4A5080',
        ouro='#E5B94A', traje='#232640', lenco='#C8323C', spikes=11, longo=0.0, raios=False, estrelas=False, cicatriz=True, boca='firme',
    ),
    'zaphir_carmesim': dict(
        nome='Zaphir Fúria Carmesim', pele='#C98F5E', pele_s='#9C5E38', cabelo='#D8142E', cabelo_l='#FF7A8A', cabelo_s='#7A0614',
        olho='#FF2A2A', brilho_olho='#FF6A4A', aura=('#FF3A2A', '#7A0A18'), bg=('#7A1424', '#1E0510'), metal='#2A1A24', metal_l='#6A3040',
        ouro='#FFB347', traje='#2A1522', lenco='#FF3A2A', spikes=14, longo=0.55, raios=True, estrelas=False, cicatriz=True, boca='grito',
    ),
    'zaphir_estelar': dict(
        nome='Zaphir Ascensão Estelar', pele='#D6A070', pele_s='#A87650', cabelo='#EAF4FF', cabelo_l='#FFFFFF', cabelo_s='#7FA8D8',
        olho='#2FD8E8', brilho_olho='#9FFFFF', aura=('#58E0FF', '#2A4AC8'), bg=('#1E3E9A', '#08113A'), metal='#E8EEF8', metal_l='#FFFFFF',
        ouro='#FFD86A', traje='#1C2A5C', lenco='#58E0FF', spikes=15, longo=0.9, raios=False, estrelas=True, cicatriz=True, boca='sereno',
    ),
}


def pt(cx, cy, ang, r):
    a = math.radians(ang)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def spike(cx, cy, ang, r0, comp, larg, curva=0.0):
    """Espeto de cabelo: base no círculo de raio r0, ponta a r0+comp, com uma curvinha."""
    b1 = pt(cx, cy, ang - larg / 2, r0)
    b2 = pt(cx, cy, ang + larg / 2, r0)
    t = pt(cx, cy, ang + curva, r0 + comp)
    m1 = pt(cx, cy, ang - larg * 0.3 + curva * 0.4, r0 + comp * 0.55)
    m2 = pt(cx, cy, ang + larg * 0.3 + curva * 0.4, r0 + comp * 0.55)
    return (f'M{b1[0]:.1f},{b1[1]:.1f} Q{m1[0]:.1f},{m1[1]:.1f} {t[0]:.1f},{t[1]:.1f} '
            f'Q{m2[0]:.1f},{m2[1]:.1f} {b2[0]:.1f},{b2[1]:.1f} Z')


def estrela4(x, y, r, cor, op=1):
    p = f'M{x},{y - r} Q{x},{y} {x + r},{y} Q{x},{y} {x},{y + r} Q{x},{y} {x - r},{y} Q{x},{y} {x},{y - r}Z'
    return f'<path d="{p}" fill="{cor}" opacity="{op}"/>'


def raio_zig(rng, x0, y0, x1, y1, n=7, desv=26):
    pts = [(x0, y0)]
    for i in range(1, n):
        t = i / n
        pts.append((x0 + (x1 - x0) * t + rng.uniform(-desv, desv), y0 + (y1 - y0) * t + rng.uniform(-desv, desv)))
    pts.append((x1, y1))
    return ' '.join(f'{x:.0f},{y:.0f}' for x, y in pts)


def desenhar(id_, f):
    rng = random.Random(hash(id_) % 99991 + 7)
    cx, cy = HC
    o = []
    a = o.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    a(f'''<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="{f['bg'][0]}"/><stop offset="1" stop-color="{f['bg'][1]}"/></radialGradient>
<radialGradient id="aura" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="{f['aura'][0]}" stop-opacity=".95"/><stop offset=".6" stop-color="{f['aura'][0]}" stop-opacity=".45"/><stop offset="1" stop-color="{f['aura'][1]}" stop-opacity="0"/></radialGradient>
<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{f['metal_l']}"/><stop offset="1" stop-color="{f['metal']}"/></linearGradient>
<linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="{f['ouro']}"/><stop offset="1" stop-color="#9A6A18"/></linearGradient>
<linearGradient id="hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{f['cabelo_l']}"/><stop offset=".35" stop-color="{f['cabelo']}"/><stop offset="1" stop-color="{f['cabelo_s']}"/></linearGradient>
<linearGradient id="pele" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{f['pele_s']}"/><stop offset=".45" stop-color="{f['pele']}"/><stop offset="1" stop-color="{f['pele']}"/></linearGradient>
<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="5"/></filter>
</defs>''')
    a(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')
    # raios de luz saindo da cabeça
    for i in range(26):
        ang = i * (360 / 26) + rng.uniform(-3, 3)
        p1 = pt(cx, cy, ang - 2.2, 60)
        p2 = pt(cx, cy, ang + 2.2, 60)
        t = pt(cx, cy, ang, 900)
        a(f'<path d="M{p1[0]:.0f},{p1[1]:.0f} L{t[0]:.0f},{t[1]:.0f} L{p2[0]:.0f},{p2[1]:.0f}Z" fill="{f["aura"][0]}" opacity="{rng.uniform(.06, .16):.2f}"/>')
    # aura grande, atrás
    a(f'<ellipse cx="{cx}" cy="470" rx="330" ry="470" fill="url(#aura)" filter="url(#blur)"/>')
    # chamas da aura
    for i in range(16):
        bx = 90 + i * 36 + rng.uniform(-12, 12)
        top = rng.uniform(120, 460)
        lg = rng.uniform(26, 48)
        a(f'<path d="M{bx - lg:.0f},{H} C{bx - lg:.0f},{(top + H) / 2:.0f} {bx + rng.uniform(-30, 30):.0f},{top + 120:.0f} {bx + rng.uniform(-10, 10):.0f},{top:.0f} C{bx + lg:.0f},{top + 140:.0f} {bx + lg * 1.2:.0f},{(top + H) / 2:.0f} {bx + lg:.0f},{H}Z" fill="{f["aura"][0]}" opacity=".30" filter="url(#blur2)"/>')

    # ---------- cabelo de trás ----------
    n = f['spikes']
    back = []
    for i in range(n):
        ang = 188 + i * (164 / (n - 1))
        comp = 95 + 70 * math.sin(i / (n - 1) * math.pi) + rng.uniform(-14, 22)
        back.append(spike(cx, cy - 5, ang, 112, comp, 22 + rng.uniform(0, 8), curva=rng.uniform(-6, 6)))
    # mechas compridas caindo atrás dos ombros (formas mais poderosas)
    if f['longo'] > 0:
        L = f['longo']
        for ang, comp, lg in [(165, 250 * L, 40), (150, 330 * L, 44), (15, 250 * L, 40), (30, 330 * L, 44), (180, 190 * L, 34), (0, 190 * L, 34)]:
            back.append(spike(cx, cy + 20, ang, 105, comp, lg, curva=(8 if ang < 90 else -8)))
    a(f'<g fill="url(#hair)" stroke="{f["cabelo_s"]}" stroke-width="4" stroke-linejoin="round">')
    for p in back:
        a(f'<path d="{p}"/>')
    a('</g>')

    # ---------- pescoço e corpo ----------
    a(f'<path d="M318,470 L318,560 Q360,600 402,560 L402,470Z" fill="url(#pele)" stroke="#000" stroke-opacity=".35" stroke-width="3"/>')
    a(f'<path d="M318,505 Q360,540 402,505 L402,470 L318,470Z" fill="#000" opacity=".22"/>')
    # traje base (ombros e braços)
    a(f'<path d="M40,{H} L62,640 Q90,560 200,540 L320,520 L400,520 L520,540 Q630,560 658,640 L680,{H}Z" fill="{f["traje"]}" stroke="#000" stroke-opacity=".5" stroke-width="4"/>')
    # braços (mangas) com faixas douradas
    for s in (-1, 1):
        x = cx + s * 250
        a(f'<path d="M{x - 55 * s:.0f},640 Q{x + 50 * s:.0f},650 {x + 62 * s:.0f},760 L{x + 78 * s:.0f},{H} L{x - 52 * s:.0f},{H}Z" fill="{f["traje"]}" stroke="#000" stroke-opacity=".5" stroke-width="3"/>')
        a(f'<path d="M{x - 8 * s:.0f},790 L{x + 72 * s:.0f},775 L{x + 78 * s:.0f},805 L{x - 6 * s:.0f},822Z" fill="url(#ouro)" stroke="#5a3a00" stroke-width="3"/>')
    # ombreiras
    for s in (-1, 1):
        x = cx + s * 205
        a(f'<path d="M{x - 90 * s:.0f},560 Q{x - 10 * s:.0f},505 {x + 105 * s:.0f},585 Q{x + 150 * s:.0f},650 {x + 100 * s:.0f},705 Q{x + 20 * s:.0f},700 {x - 90 * s:.0f},640Z" fill="url(#metal)" stroke="#05060f" stroke-width="5" stroke-linejoin="round"/>')
        a(f'<path d="M{x - 70 * s:.0f},575 Q{x - 5 * s:.0f},530 {x + 85 * s:.0f},592" fill="none" stroke="url(#ouro)" stroke-width="9" stroke-linecap="round"/>')
        a(f'<path d="M{x - 60 * s:.0f},628 Q{x + 15 * s:.0f},672 {x + 92 * s:.0f},672" fill="none" stroke="url(#ouro)" stroke-width="6" stroke-linecap="round"/>')
        for k in range(3):
            a(f'<circle cx="{x + (20 + k * 26) * s:.0f}" cy="{608 + k * 14}" r="5" fill="{f["ouro"]}" stroke="#5a3a00" stroke-width="2"/>')
    # peitoral
    a(f'<path d="M262,590 Q360,640 458,590 L482,700 Q470,820 360,880 Q250,820 238,700Z" fill="url(#metal)" stroke="#05060f" stroke-width="5" stroke-linejoin="round"/>')
    a(f'<path d="M262,590 Q360,640 458,590" fill="none" stroke="url(#ouro)" stroke-width="9" stroke-linecap="round"/>')
    a(f'<path d="M360,640 L360,880" stroke="#05060f" stroke-opacity=".55" stroke-width="4"/>')
    a(f'<path d="M250,730 Q360,770 470,730" fill="none" stroke="url(#ouro)" stroke-width="6" stroke-linecap="round" opacity=".9"/>')
    # emblema: lua crescente + estrela (símbolo original do clã de Zaphir)
    a(f'<circle cx="360" cy="735" r="46" fill="#0a0c1e" stroke="url(#ouro)" stroke-width="6"/>')
    a(f'<path d="M376,708 A32,32 0 1 0 376,762 A25,25 0 1 1 376,708Z" fill="url(#ouro)"/>')
    a(estrela4(384, 735, 14, '#FFF3B0'))
    # lenço / faixa no pescoço
    a(f'<path d="M296,520 Q360,575 424,520 L430,548 Q360,605 290,548Z" fill="{f["lenco"]}" stroke="#000" stroke-opacity=".5" stroke-width="3"/>')
    a(f'<path d="M418,545 Q470,600 455,690 Q440,640 410,575Z" fill="{f["lenco"]}" stroke="#000" stroke-opacity=".5" stroke-width="3"/>')

    # ---------- rosto ----------
    rosto = 'M268,300 C262,235 458,235 452,300 C456,372 424,432 360,470 C296,432 264,372 268,300Z'
    a(f'<path d="{rosto}" fill="url(#pele)" stroke="#000" stroke-opacity=".55" stroke-width="4"/>')
    # orelhas
    for s in (-1, 1):
        x = cx + s * 92
        a(f'<path d="M{x:.0f},325 Q{x + 28 * s:.0f},322 {x + 26 * s:.0f},352 Q{x + 22 * s:.0f},378 {x - 2 * s:.0f},376Z" fill="{f["pele"]}" stroke="#000" stroke-opacity=".55" stroke-width="3.5"/>')
    # sombra do lado esquerdo e do queixo
    a(f'<clipPath id="cr"><path d="{rosto}"/></clipPath>')
    a(f'<g clip-path="url(#cr)"><path d="M262,250 L330,300 Q318,400 360,480 L262,480Z" fill="{f["pele_s"]}" opacity=".45"/>'
      f'<ellipse cx="360" cy="470" rx="95" ry="38" fill="{f["pele_s"]}" opacity=".5"/>'
      f'<path d="M262,300 Q300,330 300,372" fill="none" stroke="{f["pele_s"]}" stroke-width="10" opacity=".35"/></g>')
    # olhos
    for s in (-1, 1):
        ex = cx + s * 44
        ox = cx + s * 82  # canto externo
        ix = cx + s * 12  # canto interno
        a(f'<path d="M{ox},340 Q{ex},322 {ix},345 Q{ex},362 {ox},340Z" fill="#F7F2EA" stroke="#0b0b14" stroke-width="3"/>')
        a(f'<ellipse cx="{ex - s * 2}" cy="343" rx="14" ry="15" fill="{f["olho"]}"/>')
        if f['brilho_olho']:
            a(f'<ellipse cx="{ex - s * 2}" cy="343" rx="22" ry="22" fill="{f["brilho_olho"]}" opacity=".35" filter="url(#blur2)"/>')
        a(f'<ellipse cx="{ex - s * 2}" cy="343" rx="6" ry="11" fill="#0b0710"/>')
        a(f'<circle cx="{ex - s * 7}" cy="337" r="4.5" fill="#fff"/>')
        # pálpebra superior grossa (olhar sério)
        a(f'<path d="M{ox + s * 6},337 Q{ex},316 {ix - s * 4},345" fill="none" stroke="#0b0b14" stroke-width="7" stroke-linecap="round"/>')
        # sobrancelha inclinada
        a(f'<path d="M{ox + s * 8},316 Q{ex + s * 4},312 {ix - s * 6},338 Q{ex},322 {ox + s * 8},322Z" fill="{f["cabelo_s"]}" stroke="#05030a" stroke-width="2.5"/>')
    # nariz
    a(f'<path d="M358,352 Q352,392 340,402 Q360,410 380,402" fill="none" stroke="{f["pele_s"]}" stroke-width="5" stroke-linecap="round"/>')
    # boca
    if f['boca'] == 'grito':
        a(f'<path d="M318,420 Q360,414 402,420 Q392,452 360,456 Q328,452 318,420Z" fill="#3a0a10" stroke="#0b0b14" stroke-width="3.5"/>')
        a(f'<path d="M322,423 Q360,418 398,423 L394,432 Q360,428 326,432Z" fill="#fff"/>')
    elif f['boca'] == 'sereno':
        a(f'<path d="M334,424 Q360,432 386,423" fill="none" stroke="#3a1a10" stroke-width="5" stroke-linecap="round"/>')
    else:
        a(f'<path d="M332,425 Q360,420 388,426" fill="none" stroke="#3a1a10" stroke-width="5" stroke-linecap="round"/>')
    if f['cicatriz']:
        a(f'<path d="M398,300 L420,372" stroke="#7a2a2a" stroke-width="6" stroke-linecap="round" opacity=".85"/><path d="M392,330 L418,336 M396,352 L420,356" stroke="#7a2a2a" stroke-width="3" opacity=".6"/>')

    # ---------- cabelo da frente ----------
    a(f'<g fill="url(#hair)" stroke="{f["cabelo_s"]}" stroke-width="4" stroke-linejoin="round">')
    # espetos laterais e do topo (na frente)
    front = []
    for i in range(n - 2):
        ang = 208 + i * (124 / max(1, n - 3))
        comp = 80 + 62 * math.sin(i / max(1, n - 3) * math.pi) + rng.uniform(-10, 14)
        front.append(spike(cx, cy - 22, ang, 100, comp, 24, curva=rng.uniform(-5, 5)))
    for p in front:
        a(f'<path d="{p}"/>')
    # franja caindo na testa (3 mechas)
    for (x0, x1, tx, ty) in [(300, 340, 322, 330), (338, 384, 366, 346), (384, 428, 410, 322)]:
        a(f'<path d="M{x0},256 Q{x0 + 4},300 {tx},{ty} Q{x1 - 6},296 {x1},256Z"/>')
    a('</g>')
    # calota do cabelo (sem contorno, pra não parecer uma faixa na testa)
    a(f'<path d="M262,322 C246,200 474,200 458,322 C446,282 418,262 392,266 C376,258 344,258 328,266 C302,262 274,282 262,322Z" fill="url(#hair)"/>')
    for (x0, x1, tx, ty) in [(300, 340, 322, 330), (338, 384, 366, 346), (384, 428, 410, 322)]:
        a(f'<path d="M{x0 + 6},262 Q{x0 + 6},300 {tx},{ty - 4} Q{x1 - 8},296 {x1 - 6},262Z" fill="url(#hair)"/>')
    # brilho no cabelo
    a(f'<g fill="none" stroke="{f["cabelo_l"]}" stroke-width="5" stroke-linecap="round" opacity=".75">')
    for i in range(5):
        ang = 215 + i * 24
        p1 = pt(cx, cy - 22, ang, 104)
        p2 = pt(cx, cy - 22, ang + 3, 150 + (i % 2) * 20)
        a(f'<path d="M{p1[0]:.0f},{p1[1]:.0f} L{p2[0]:.0f},{p2[1]:.0f}"/>')
    a('<path d="M300,262 Q312,285 318,310 M352,258 Q360,290 362,326 M404,262 Q412,284 414,308"/>')
    a('</g>')

    # ---------- efeitos ----------
    if f['raios']:
        for _ in range(7):
            sx = rng.choice([rng.uniform(40, 200), rng.uniform(520, 680)])
            sy = rng.uniform(250, 800)
            ex = sx + rng.uniform(-110, 110)
            ey = sy + rng.uniform(-150, 150)
            a(f'<polyline points="{raio_zig(rng, sx, sy, ex, ey)}" fill="none" stroke="#FFD8B0" stroke-width="7" stroke-linejoin="round" opacity=".9"/>')
            a(f'<polyline points="{raio_zig(rng, sx, sy, ex, ey)}" fill="none" stroke="{f["aura"][0]}" stroke-width="16" stroke-linejoin="round" opacity=".35" filter="url(#blur2)"/>')
    if f['estrelas']:
        for _ in range(26):
            x, y = rng.uniform(20, 700), rng.uniform(40, 900)
            a(estrela4(round(x), round(y), rng.uniform(5, 20), '#FFFFFF', rng.uniform(.5, 1)))
        a(f'<circle cx="{cx}" cy="150" r="112" fill="none" stroke="url(#ouro)" stroke-width="7" opacity=".95"/>')
        a(f'<circle cx="{cx}" cy="150" r="124" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>')
    for _ in range(40):
        x, y = rng.uniform(10, 710), rng.uniform(30, 940)
        a(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rng.uniform(1.5, 4.5):.1f}" fill="{f["ouro"]}" opacity="{rng.uniform(.4, .95):.2f}"/>')
    # contorno de luz nas bordas (vinheta leve)
    a(f'<rect width="{W}" height="{H}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="16"/>')
    a('</svg>')
    return '\n'.join(o)


if __name__ == '__main__':
    for id_, f in FORMAS.items():
        svg = SVGS / f'{id_}.svg'
        svg.write_text(desenhar(id_, f), encoding='utf-8')
        subprocess.run(['rsvg-convert', '-w', str(W), '-h', str(H), str(svg), '-o', str(ORIG / f'{id_}.png')], check=True)
        print('ok', id_)
