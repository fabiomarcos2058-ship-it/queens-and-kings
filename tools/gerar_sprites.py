# Cria os sprites dos ataques a partir dos ícones do game-icons.net (CC BY 3.0) e desenhos próprios.
import re, os
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ICO = os.path.join(RAIZ, 'assets', 'icones')
OUT = os.path.join(RAIZ, 'assets', 'ataques')
os.makedirs(OUT, exist_ok=True)

ICONES = {
    'katana': ('delapouite__katana', '#EEF3F8', '#1b1f2a'),
    'pao': ('delapouite__bread', '#E9AE5A', '#5a3412'),
    'nota': ('delapouite__musical-notes', '#39C5BB', '#0b3b38'),
    'gelo': ('lorc__ice-bolt', '#CFF0FF', '#2a6a96'),
    'floco': ('lorc__snowflake-2', '#F2FBFF', '#3a7fb0'),
    'bola': ('delapouite__soccer-ball', '#FFFFFF', '#111111'),
    'shuriken': ('lorc__shuriken', '#D6DEE8', '#222831'),
    'cajado': ('lorc__wizard-staff', '#7FB2FF', '#14305e'),
    'leque': ('delapouite__handheld-fan', '#FF8FB1', '#5e1430'),
    'raio': ('lorc__focused-lightning', '#FFE45C', '#7a5200'),
    'fogo': ('lorc__fireball', '#FF8A2E', '#6e1a00'),
    'bomba': ('lorc__unlit-bomb', '#9AA4B2', '#1d2430'),
    'coringa': ('delapouite__card-joker', '#FF6FAE', '#4a0f2c'),
    'garras': ('lorc__claw-slashes', '#FF5B5B', '#3a0000'),
    'explosao': ('lorc__spiky-explosion', '#FFC94A', '#7a2a00'),
    'punho': ('lorc__fulguro-punch', '#FFD25E', '#6b3b00'),
    'tornado': ('lorc__whirlwind', '#BFD7FF', '#1d3a6b'),
    'espada_vegito': ('lorc__energy-sword', '#C38BFF', '#2e0d5a'),
    'espada_trunks': ('lorc__sparkling-sabre', '#E6F0FF', '#1d2a44'),
    'espada_fp': ('delapouite__sword-brandish', '#FFE07A', '#5a3a00'),
    'cristal': ('lorc__crystal-bars', '#9FE6FF', '#124a66'),
    'flor': ('lorc__lotus-flower', '#FFB3CF', '#6a1f3c'),
    'raio_cadeia': ('willdabeast__chain-lightning', '#B98CFF', '#2c0b5e'),
    'onda_fogo': ('lorc__fire-wave', '#FF6A2A', '#5e1200'),
}


def recolorir(svg, cor, contorno):
    svg = re.sub(r'<path d="M0 0h512v512H0z"\s*/>', '', svg)
    svg = svg.replace('fill="#fff"', f'fill="{cor}" stroke="{contorno}" stroke-width="14" paint-order="stroke" stroke-linejoin="round"')
    return svg


for nome, (ico, cor, cont) in ICONES.items():
    s = open(os.path.join(ICO, ico + '.svg')).read()
    open(os.path.join(OUT, nome + '.svg'), 'w').write(recolorir(s, cor, cont))

# desenhos próprios
def orbe(nome, c1, c2, c3):
    open(os.path.join(OUT, nome + '.svg'), 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><radialGradient id="g" cx="40%" cy="38%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="{c1}"/><stop offset="0.75" stop-color="{c2}"/><stop offset="1" stop-color="{c3}" stop-opacity="0"/></radialGradient></defs>
<circle cx="50" cy="50" r="48" fill="url(#g)"/></svg>''')

orbe('ki_amarelo', '#FFF59A', '#FFC21A', '#FF8A00')
orbe('ki_azul', '#C9F3FF', '#3FC4FF', '#0A5BFF')
orbe('ki_rosa', '#FFE0F2', '#FF7FC8', '#E0258A')
orbe('ki_laranja', '#FFE2B0', '#FF9A2E', '#E04A00')
orbe('ki_roxo', '#F0DCFF', '#B57BFF', '#5B1FD6')
orbe('ki_vermelho', '#FFD0C8', '#FF4B3A', '#B00000')
orbe('ki_prata', '#FFFFFF', '#D8E6FF', '#8FA9D6')
orbe('ki_verde', '#E9FFD8', '#7BE04A', '#1E8A12')

open(os.path.join(OUT, 'moeda.svg'), 'w').write('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><radialGradient id="g" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF7C2"/><stop offset="0.55" stop-color="#F5C02E"/><stop offset="1" stop-color="#B07800"/></radialGradient></defs>
<circle cx="50" cy="50" r="44" fill="url(#g)" stroke="#6b4400" stroke-width="6"/><text x="50" y="66" font-size="46" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#8a5a00">B</text></svg>''')
open(os.path.join(OUT, 'onda.svg'), 'w').write('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke-linecap="round">
<path d="M30 20 Q55 50 30 80" stroke="#7FE9FF" stroke-width="8"/><path d="M48 12 Q80 50 48 88" stroke="#7FE9FF" stroke-width="7" opacity="0.75"/><path d="M66 6 Q102 50 66 94" stroke="#7FE9FF" stroke-width="6" opacity="0.5"/></svg>''')
open(os.path.join(OUT, 'bala.svg'), 'w').write('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><defs><linearGradient id="g"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0"/><stop offset="0.75" stop-color="#FFE9A8"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
<rect x="0" y="11" width="84" height="8" rx="4" fill="url(#g)"/><ellipse cx="88" cy="15" rx="12" ry="7" fill="#C9A13B" stroke="#5b4300" stroke-width="2"/></svg>''')
open(os.path.join(OUT, 'capsula.svg'), 'w').write('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-30 50 50)">
<rect x="18" y="32" width="64" height="36" rx="18" fill="#F2F4F8" stroke="#2a2f3a" stroke-width="5"/><rect x="50" y="32" width="32" height="36" rx="0" fill="#E85A4F" stroke="#2a2f3a" stroke-width="5"/>
<circle cx="36" cy="50" r="7" fill="#3FA9F5" stroke="#2a2f3a" stroke-width="3"/><text x="66" y="57" font-size="18" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">CC</text></g></svg>''')
print('sprites:', len(os.listdir(OUT)))
