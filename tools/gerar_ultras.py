"""Cria as 23 cartas Ultra do evento ULTRAS (cartas.json) e imprime as entradas de js/ataques.js.
Uso: python3 tools/gerar_ultras.py   (idempotente: pula ids que já existem)
"""
import json
from pathlib import Path
from PIL import Image
RAIZ = Path(__file__).resolve().parent.parent
J = RAIZ / 'assets/cartas/cartas.json'
dados = json.loads(J.read_text(encoding='utf-8'))
ja = {c['id'] for c in dados['cartas']}

# id, nome, epíteto, descrição, classe, custo, rosto(cx,cy,r), passiva(nome,desc), m, hab(nome,tipo,custo,recarga,extra,desc), golpe(v)
C = [
('ul_black_rose','Goku Black Rosé (Ultra)','Justiça Mortal','A justiça de Zamasu em corpo de Saiyajin. Corta de longe, rouba vida e nunca erra o voo.','assassino',6,(240,575,105),
 ('Justiça Mortal','Os cortes atravessam quem está atrás e roubam 10% do dano em vida.'),{'perfura':True,'vampiro':0.10,'voo':True},
 ('Lâmina de Ki','golpes',3,14,{'mult':2.8},'Uma sequência de cortes rosados (2,8x de dano) no alvo mais perto.'),{'g':'corte','cor':'#FF5CC8'}),
('ul_goku_ui','Goku Instinto Superior (Ultra)','Corpo Move Sozinho','Domínio total do Instinto Superior: o corpo reage antes do pensamento.','assassino',6,(300,270,120),
 ('Reflexo Perfeito','Combos de 3 golpes, 20% de crítico e contra-ataque ao aparar.'),{'combo':3,'critico':[0.2,2],'aparar':6},
 ('Esquiva Divina','esquiva',3,16,{'duracao':5,'chance':0.85,'furia':True},'Por 5s desvia de 85% dos golpes e entra em fúria.'),{'g':'soco','cor':'#CFE6FF'}),
('ul_goku_namek','Goku Namek Full Power','Fúria de Namek','O grito de Goku diante do impossível. Quanto mais machucado, mais forte.','lutador',6,(395,395,105),
 ('Fúria Saiyajin','Ataca até 35% mais rápido quanto menos vida tem e 20% de crítico.'),{'berserk':0.35,'critico':[0.2,2]},
 ('Grito de Guerra','furia',2,13,{'duracao':7},'Entra em fúria por 7s: mais dano e mais velocidade.'),{'g':'soco','cor':'#FFE14D','pesado':True}),
('ul_vegito_blue','Vegito Blue','Fusão Absoluta','A fusão perfeita pelos brincos Potara. Escudo de ki e golpes que atravessam.','lutador',6,(440,545,110),
 ('Fusão Potara','Começa com 20% de escudo e os golpes atravessam os inimigos.'),{'escudo':0.2,'perfura':True},
 ('Kamehameha de Fusão','kamehameha',4,20,{'dano':900},'Um Kamehameha gigante que atravessa tudo (metade do dano nas torres).'),{'g':'soco','cor':'#4DE1FF','pesado':True}),
('ul_gogeta_ssj','Gogeta Super Saiyajin','Ataque Fantasma','A fusão da dança: velocidade e confiança de sobra.','assassino',6,(395,490,95),
 ('Dança da Fusão','Combos de 3 golpes e 25% de crítico.'),{'combo':3,'critico':[0.25,2]},
 ('Ataque Fantasma','golpes',3,15,{'mult':3},'Fantasmas de ki atacam em sequência (3x de dano).'),{'g':'chute','cor':'#FFD93B'}),
('ul_vegito_ssj','Vegito Super Saiyajin (Ultra)','Poder Inigualável','Os dois guerreiros num só. Desvia, devolve e pune quem encosta.','lutador',6,(275,470,75),
 ('Guarda Cruzada','Escudo de 15% da vida e contra-ataque ao aparar.'),{'escudo':0.15,'aparar':7},
 ('Punição da Alma','soulPunisher',4,22,{'mult':2.4},'Um golpe que castiga a alma do alvo (2,4x de dano).'),{'g':'soco','cor':'#FFD25E','pesado':True}),
('ul_goku_ssj','Goku Super Saiyajin (Ultra)','O Lendário de Namek','O primeiro Super Saiyajin. A raiva que virou ouro.','lutador',6,(375,610,100),
 ('Raiva Dourada','Ataca até 30% mais rápido machucado e regenera vida devagar.'),{'berserk':0.3,'regen':0.01},
 ('Aura Dourada','furia',2,12,{'duracao':6},'Entra em fúria por 6s.'),{'g':'soco','cor':'#FFD93B'}),
('ul_gogeta_blue_pronto','Gogeta Blue: Pronto para Combate','Postura de Guerra','A pose de quem vai terminar a luta. Ágil, firme e certeiro.','lutador',6,(335,400,85),
 ('Postura Impecável','Começa com 20% de escudo e 20% de crítico (x2,1).'),{'escudo':0.2,'critico':[0.2,2.1]},
 ('Punho Divino','punhoDeus',3,18,{'mult':2.5},'Um soco de ki divino (2,5x de dano).'),{'g':'soco','cor':'#6FD8FF'}),
('ul_majin_vegeta','Majin Vegeta (Ultra)','Orgulho Sombrio','Sacrificou o orgulho para ter poder. Cai levando todo mundo junto.','tanque',6,(385,235,110),
 ('Explosão Final','Ao cair explode em área (3x de dano) e ataca mais rápido machucado.'),{'explosaoFinal':[3,80],'berserk':0.2},
 ('Galick Majin','esmagar',3,17,{'mult':2.8},'Esmaga o alvo com uma onda de ki (2,8x de dano).'),{'g':'soco','cor':'#FF6B3D','pesado':True}),
('ul_gogeta_blue_extremo','Gogeta Blue Extremo','Big Bang Kamehameha','O ataque final da fusão azul. Empurra e atravessa quem estiver na frente.','lutador',6,(470,420,105),
 ('Impacto Extremo','Golpes que atravessam, empurram e 25% de crítico (x2,2).'),{'perfura':True,'empurrar':12,'critico':[0.25,2.2]},
 ('Big Bang Kamehameha','finalFlash',4,20,{'mult':2.72},'Um disparo gigantesco de ki em linha reta (2,72x de dano).'),{'g':'soco','cor':'#3DA8FF','pesado':True}),
('ul_turles','Turles','Fruto do Poder','Comeu o fruto da Árvore do Poder e ficou muito mais perigoso.','assassino',5,(365,195,85),
 ('Fruto Proibido','Rouba 12% do dano em vida e regenera devagar.'),{'vampiro':0.12,'regen':0.008},
 ('Fruto da Árvore','cura',2,14,{},'Come o fruto e recupera uma boa parte da vida.'),{'g':'chute','cor':'#C77DFF'}),
('ul_hit','Hit','Salto no Tempo','O assassino que pula o tempo. Poucos golpes, todos mortais.','assassino',6,(215,225,100),
 ('Assassino Perfeito','Combos de 3 golpes e 30% de crítico (x2,4).'),{'critico':[0.3,2.4],'combo':3},
 ('Salto no Tempo','investidaInv',3,18,{'mult':2.8},'Some e reaparece no alvo, causando 2,8x de dano.'),{'g':'soco','cor':'#B07CFF'}),
('ul_freeza','Freeza Forma Final','Imperador do Universo','O terror do universo no auge. Resistente e cruel.','tanque',6,(405,235,95),
 ('Pele de Imperador','Escudo de 20% da vida e 20% de chance de atordoar (0,5s).'),{'escudo':0.2,'atordoar':[0.2,0.5]},
 ('Death Ball','kamehameha',4,20,{'dano':860},'Dispara uma esfera de morte que atravessa tudo.'),{'g':'soco','cor':'#E86CFF','pesado':True}),
('ul_janemba','Janemba Super','Espada Demoníaca','Um demônio com uma espada que corta a realidade.','assassino',6,(575,600,75),
 ('Fúria Demoníaca','Cortes atravessam, rouba 10% em vida e ataca mais rápido machucado.'),{'perfura':True,'vampiro':0.10,'berserk':0.2},
 ('Chuva de Lâminas','misseis',4,20,{'mult':1,'n':8},'Lança 8 lâminas de ki que perseguem os inimigos.'),{'g':'corte','cor':'#FF3D3D'}),
('ul_vegeta_ssj4','Vegeta SSJ4 (Ultra)','Orgulho Primitivo','O príncipe no poder primitivo. Sangue Saiyajin em estado puro.','tanque',6,(500,400,110),
 ('Poder Primitivo','Ataca até 25% mais rápido machucado e rouba 8% em vida.'),{'berserk':0.25,'vampiro':0.08},
 ('Big Bang Attack','kamehameha',4,20,{'dano':840},'Uma esfera de ki que atravessa tudo em linha reta.'),{'g':'soco','cor':'#E8303A','pesado':True}),
('ul_cooler','Cooler Forma Final','Irmão do Imperador','O irmão mais velho do Freeza: ainda mais forte e orgulhoso.','tanque',5,(270,375,90),
 ('Armadura Cooler','Escudo de 25% da vida e golpes que empurram.'),{'escudo':0.25,'empurrar':14},
 ('Supernova do Cooler','esmagar',3,18,{'mult':2.6},'Uma explosão de ki que esmaga o alvo (2,6x de dano).'),{'g':'soco','cor':'#B45CFF','pesado':True}),
('ul_cell','Cell Perfeito','Perfeição Biológica','A forma perfeita: se regenera sozinho e quase nunca cai.','tanque',5,(370,175,90),
 ('Regeneração Perfeita','Escudo de 15% da vida e regenera 1,5% por segundo.'),{'escudo':0.15,'regen':0.015},
 ('Regenerar','cura',2,12,{},'Se regenera e recupera uma boa parte da vida.'),{'g':'soco','cor':'#9CFF3D'}),
('ul_omega','Omega Shenron','Dragão Sombrio','O pior dos dragões: esmaga tudo e não cai fácil.','tanque',6,(385,210,100),
 ('Escamas das Esferas','Escudo de 20%, regenera devagar e 25% de chance de atordoar.'),{'atordoar':[0.25,0.5],'escudo':0.2,'regen':0.008},
 ('Fúria do Dragão','furiaViltrum',4,22,{'mult':3},'Uma sequência brutal de golpes (3x de dano).'),{'g':'soco','cor':'#C14DFF','pesado':True}),
('ul_broly','Broly Lendário','Fúria Incontrolável','O Super Saiyajin Lendário: ninguém para essa fúria.','tanque',6,(300,255,90),
 ('Fúria Lendária','Ataca até 40% mais rápido machucado, empurra e 25% de atordoar.'),{'berserk':0.4,'empurrar':20,'atordoar':[0.25,0.4]},
 ('Esmagar Lendário','esmagar',4,22,{'mult':3.2},'Esmaga tudo na frente (3,2x de dano).'),{'g':'soco','cor':'#B8FF3D','pesado':True}),
('ul_freeza_dourado','Freeza Dourado','Ressurreição Dourada','Treinou por 4 meses para se vingar. Brilha e machuca.','assassino',6,(565,180,75),
 ('Brilho Dourado','25% de crítico (x2,2) e rouba 8% do dano em vida.'),{'critico':[0.25,2.2],'vampiro':0.08},
 ('Raios Dourados','rajadaViltrum',3,16,{'golpes':5,'mult':1.7},'5 raios dourados em sequência (1,7x de dano cada).'),{'g':'tiro','cor':'#FFD93B'}),
('ul_gogeta_ssj4','Gogeta SSJ4 (Ultra)','Poder Absoluto','O guerreiro mais poderoso de Dragon Ball GT.','tanque',6,(345,350,100),
 ('Poder Primitivo Fundido','Ataca mais rápido machucado, rouba 10% em vida e escudo de 15%.'),{'berserk':0.3,'vampiro':0.10,'escudo':0.15},
 ('Kamehameha Supremo','kamehameha',4,20,{'dano':920},'O Kamehameha mais forte do jogo (metade do dano nas torres).'),{'g':'soco','cor':'#FF8A3D','pesado':True}),
('ul_zamasu','Zamasu Fusão','Justiça Imortal','A fusão imortal que quer apagar a humanidade.','lutador',6,(500,760,95),
 ('Corpo Imortal','Rouba 15% em vida, regenera 1%/s e voa.'),{'vampiro':0.15,'regen':0.01,'voo':True},
 ('Imortalidade Divina','fenix',3,18,{'duracao':10},'Fica imortal por 10s.'),{'g':'palma','cor':'#E86CFF'}),
('ul_vegeta_saga','Vegeta Príncipe Saiyajin','Orgulho de Príncipe','O príncipe no auge da arrogância e da luta.','lutador',6,(555,545,85),
 ('Orgulho Saiyajin','20% de crítico (x2) e ataca mais rápido machucado.'),{'critico':[0.2,2],'berserk':0.25},
 ('Galick Gun','kamehameha',3,18,{'dano':780},'Dispara o Galick Gun em linha reta.'),{'g':'soco','cor':'#FF5CC8'}),
]
CLASSE = {'tanque': (1750, 225, 78, 18, 0.95), 'lutador': (1550, 245, 88, 18, 0.9), 'assassino': (1400, 265, 96, 18, 0.8)}
novas = []
for (i, nome, ep, desc, cl, custo, rosto, pas, m, hab, v) in C:
    if i in ja: continue
    im = Image.open(RAIZ / f'assets/cartas/originais/{i}.jpg'); W, H = im.size
    w = min(W, H * 3 // 4); h = w * 4 // 3
    x = int(max(0, min(W - w, rosto[0] - w / 2))); y = int(max(0, min(H - h, rosto[1] - 0.28 * h)))
    vida, dano, vel, alc, cad = CLASSE[cl]
    if custo == 5: vida = int(vida * 0.92); dano = int(dano * 0.95)
    habil = {'nome': hab[0], 'tipo': hab[1], 'custo': hab[2], 'recarga': hab[3], **hab[4], 'descricao': hab[5]}
    novas.append({'id': i, 'nome': nome, 'raridade': 'ultra', 'custo': custo, 'tipo': f'Ultra · {ep}', 'descricao': desc,
      'vida': vida, 'dano': dano, 'velocidade': vel, 'alcance': alc, 'cadencia': cad, 'danoTorre': 0.55,
      'passiva': {'nome': pas[0], 'tipo': 'ultras_' + i, 'descricao': pas[1]}, 'habilidade': habil,
      'trofeus': 0, 'exclusivo': [], 'summon': True, 'alvo': 'tudo', 'arena': 1, 'rosto': list(rosto), 'arte': [x, y, w]})
dados['cartas'].extend(novas)
J.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('cartas novas:', len(novas))
# entradas do ataques.js
out = []
for (i, nome, ep, desc, cl, custo, rosto, pas, m, hab, v) in C:
    vv = ', '.join(f"{k}: {json.dumps(x)}" for k, x in v.items()).replace('"', "'")
    mm = ', '.join(f"{k}: {json.dumps(x)}".replace('"', "'").replace('true', 'true') for k, x in m.items())
    out.append(f"    {i}: {{ v: {{ {vv} }}, m: {{ {mm} }}, d: '{pas[1]}' }},")
(RAIZ / 'tools/_ataques_ultras.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
tanque = [i for (i, *_r) in C if _r[3] == 'tanque']; ass = [i for (i, *_r) in C if _r[3] == 'assassino']
print('TANQUE', tanque); print('ASSASSINO', ass)
