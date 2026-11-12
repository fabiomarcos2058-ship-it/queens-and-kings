// Ataques únicos de cada personagem + classes com counters (pedra-papel-tesoura).
// v = visual do ataque, m = mecânicas especiais, d = descrição curta (aparece na carta).
const Ataques = (() => {
  // ---------- Classes ----------
  const CLASSES = {
    tanque: { nome: 'Tanque', ic: '🛡️', desc: 'Muita vida e é quem mais machuca torres, mas sofre com atiradores e enxames.' },
    lutador: { nome: 'Lutador', ic: '⚔️', desc: 'Corpo a corpo equilibrado. Ótimo contra assassinos.' },
    assassino: { nome: 'Assassino', ic: '🗡️', desc: 'Rápido e letal contra atiradores e magos, mas frágil.' },
    atirador: { nome: 'Atirador', ic: '🎯', desc: 'Ataca de longe e derrete tanques. Sofre com assassinos.' },
    mago: { nome: 'Mago', ic: '🔮', desc: 'Dano em área. Destrói grupos, assassinos e lutadores.' },
    enxame: { nome: 'Enxame', ic: '👥', desc: 'Vários pequenos. Bons contra tanques e atiradores.' },
  };
  // multiplicador de dano: CONTRA[atacante][alvo]
  const CONTRA = {
    tanque: { tanque: 1, lutador: 0.95, assassino: 0.85, atirador: 0.85, mago: 0.85, enxame: 0.8 },
    lutador: { tanque: 0.8, lutador: 1, assassino: 1.35, atirador: 1, mago: 1, enxame: 1 },
    assassino: { tanque: 0.85, lutador: 0.85, assassino: 1, atirador: 1.5, mago: 1.5, enxame: 1 },
    atirador: { tanque: 1.65, lutador: 1, assassino: 0.9, atirador: 1, mago: 1.15, enxame: 0.9 },
    mago: { tanque: 1, lutador: 1.2, assassino: 1.25, atirador: 1, mago: 1, enxame: 1.6 },
    enxame: { tanque: 1.4, lutador: 1, assassino: 1, atirador: 1.2, mago: 1.2, enxame: 1 },
  };
  // dano nas torres por classe (torres não caem fácil; tanques são os que mais derrubam)
  const NA_TORRE = { tanque: 1.1, lutador: 0.85, assassino: 0.8, atirador: 0.7, mago: 0.65, enxame: 1 };

  const CLASSE_DA_CARTA = {
    tanque: ['itsuki', 'shizuku', 'gogeta_ssj4', 'goku_ssj3', 'goku_ssj4', 'goku_blue_lb', 'gogeta_ultra'],
    assassino: ['bra', 'teto', 'pan_dbh', 'akame', 'mbappe', 'kashimo', 'goku_pressagio'],
    atirador: ['mai', 'miku_nakano', 'pan_gt', 'riruka', 'rukia_remake'],
    mago: ['rukia', 'nami_last', 'hatsune_miku', 'bambietta', 'bulma'],
    enxame: ['mini'],
  };
  const classeDe = (c) => {
    if (!c || c.feitico || c.barril) return null;
    for (const [k, ids] of Object.entries(CLASSE_DA_CARTA)) if (ids.includes(c.id)) return k;
    return 'lutador';
  };
  const fortes = (k) => Object.entries(CONTRA[k] || {}).filter(([, v]) => v > 1.05).map(([a]) => a);
  const fracos = (k) => Object.keys(CONTRA).filter((a) => (CONTRA[a][k] || 1) > 1.05);

  // ---------- Ataques ----------
  // visuais de golpe: soco, chute, palma, corte (com sprite), giro (sprite girando), raio, impacto, tornado, esferas
  // projéteis: { p: sprite, vel, tam, giro ('mira' ou graus/s), arco, rastro, ceu (raio do céu) }
  const A = {
    mini: { v: { g: 'soco', cor: '#cfd6e0' }, d: 'Socos rápidos em bando.' },
    bra: { v: { g: 'palma', cor: '#FF7FC8', s: 'ki_rosa' }, m: { recuo: 16 }, d: 'Tapa de ki rosa e recua logo depois.' },
    teto: { v: { g: 'giro', s: 'pao', cor: '#E9AE5A' }, m: { atordoar: [0.22, 0.5] }, d: 'Baguetada! Pode deixar o inimigo tonto.' },
    chichi: { v: { g: 'chute', cor: '#FF5A4A' }, m: { empurrar: 10 }, d: 'Chute de artes marciais que empurra.' },
    mai: { v: { p: 'bala', vel: 560, tam: 22, giro: 'mira', rastro: '#FFE9A8' }, m: { critico: [0.25, 2] }, d: 'Tiro de precisão: 25% de chance de crítico (dano dobrado).' },
    miku_nakano: { v: { p: 'onda', vel: 250, tam: 26, giro: 'mira' }, m: { perfura: true }, d: 'Ondas sonoras dos fones que atravessam os inimigos.' },
    nami_old: { v: { g: 'giro', s: 'cajado', cor: '#7FB2FF' }, m: { roubo: [0.28, 0.5] }, d: 'Golpe de bastão. Ladra: às vezes rouba elixir do inimigo!' },
    shizuku: { v: { g: 'tornado', s: 'tornado', cor: '#BFD7FF' }, m: { puxar: 12 }, d: 'O aspirador puxa os inimigos para perto dela.' },
    itsuki: { v: { g: 'soco', cor: '#FF8A65', pesado: true }, m: { escudo: 0.25 }, d: 'Começa com um escudo de 25% da vida.' },
    rukia: { v: { p: 'floco', vel: 210, tam: 22, giro: 360, rastro: '#DDF3FF' }, m: { lentidao: [0.35, 2] }, d: 'Dança do gelo: os atingidos ficam lentos.' },
    pan_dbh: { v: { g: 'soco', cor: '#FF9A2E' }, m: { voo: true }, d: 'Voa! Atravessa o rio por qualquer lugar, sem ponte.' },
    hinata: { v: { g: 'palma', cor: '#8FD3FF', s: 'ki_azul' }, m: { lentoAtaque: [0.35, 2.5] }, d: 'Punho Gentil: bloqueia o chakra e o alvo ataca mais devagar.' },
    nami_last: { v: { p: 'raio', ceu: true, tam: 30 }, m: { atordoar: [1, 0.3] }, d: 'Raio do Clima-Tact cai do céu e atordoa por um instante.' },
    trunks_base: { v: { g: 'corte', s: 'espada_trunks', cor: '#E6F0FF' }, m: { perfura: true }, d: 'Corte de espada que acerta também quem está atrás.' },
    pan_gt: { v: { p: 'ki_laranja', vel: 300, tam: 14, rastro: '#FF9A2E' }, m: { rajada: 2 }, d: 'Rajada dupla de esferas de ki.' },
    hatsune_miku: { v: { p: 'nota', vel: 200, tam: 22, giro: 220, rastro: '#39C5BB' }, m: { auraVel: [75, 0.2] }, d: 'Notas musicais. Aliados perto dela atacam 20% mais rápido.' },
    akame: { v: { g: 'corte', s: 'katana', cor: '#FF3B3B' }, m: { queimar: [0.05, 3, '#7BE04A', 'veneno'] }, d: 'Murasame: o corte envenena o alvo.' },
    trunks_ssj: { v: { g: 'corte', s: 'espada_trunks', cor: '#FFD25E' }, m: { especial: [4, 2.2, 32, 'fogo'] }, d: 'A cada 4 golpes, um Burning Attack em área.' },
    riruka: { v: { p: 'coringa', vel: 260, tam: 18, giro: 540, rastro: '#FF6FAE' }, m: { enfraquecer: [0.25, 3] }, d: 'Cartas que prendem na casinha: o alvo causa 25% menos dano.' },
    gohan_ssj: { v: { g: 'soco', cor: '#FFE45C' }, m: { extra: [3, 'ki_amarelo', 1.6] }, d: 'A cada 3 socos, dispara um Masenko.' },
    caulifla: { v: { g: 'palma', cor: '#FF5FB0', s: 'ki_rosa' }, m: { berserk: 0.5 }, d: 'Quanto menos vida tem, mais rápido ataca (até +50%).' },
    bambietta: { v: { p: 'ki_rosa', vel: 230, tam: 20, rastro: '#FF7FC8', explode: true }, m: { queimar: [0.04, 3, '#FF6A00', 'fogo'] }, d: 'The Explode: explosões que deixam os alvos queimando.' },
    trunks_full_power: { v: { g: 'corte', s: 'espada_fp', cor: '#FFE07A' }, m: { execucao: [0.3, 1.6] }, d: 'Finaliza: +60% de dano em quem tem menos de 30% de vida.' },
    bulma: { v: { p: 'capsula', vel: 210, tam: 20, giro: 300, arco: 46 }, m: { ricochete: 0.5 }, d: 'Cápsula da Capsule Corp que explode e quica num segundo alvo.' },
    caulifla_ssj: { v: { g: 'impacto', cor: '#FF4FA0', s: 'onda_fogo' }, m: { queimar: [0.035, 2.5, '#FF2E8A', 'fogo'] }, d: 'Crush Cannon: energia rosa que queima em área.' },
    vegito_ssj: { v: { g: 'soco', cor: '#FFD25E' }, m: { contra: [0.25, 0.8] }, d: 'Contra-ataque: 25% de chance de revidar quando apanha.' },
    isagi: { v: { g: 'chute', cor: '#5EC8FF', s: 'bola' }, d: 'Chutes certeiros. Se adapta a cada segundo em campo.' },
    mbappe: { v: { g: 'chute', cor: '#3B6BFF', s: 'bola' }, m: { investida: 1.6 }, d: 'Arrancada: dispara até o alvo e o primeiro chute dá +60%.' },
    kashimo: { v: { g: 'raio', cor: '#B98CFF' }, m: { cadeia: 2 }, d: 'Raio que salta para mais 2 inimigos.' },
    rukia_remake: { v: { p: 'cristal', vel: 330, tam: 24, giro: 'mira', rastro: '#BFE8FF' }, m: { perfura: true }, d: 'Lança de gelo que atravessa tudo em linha reta.' },
    gogeta_ssjz: { v: { g: 'soco', cor: '#7FD0FF' }, m: { combo: 3 }, d: 'Combo: o 3º soco sempre causa o dobro de dano.' },
    gogeta_ssj4: { v: { g: 'soco', cor: '#FF4B3A', pesado: true }, m: { empurrar: 20 }, d: 'Golpes pesados que arremessam os inimigos longe.' },
    vegito_ex: { v: { g: 'corte', s: 'espada_vegito', cor: '#C38BFF' }, m: { teleCadeia: true }, d: 'Espada Espiritual. Ao derrotar alguém, se teletransporta para o próximo.' },
    gogeta_ultra: { v: { g: 'impacto', cor: '#FFD25E', s: 'explosao' }, m: { especial: [4, 1.5, 40, 'explosao', 0.7] }, d: 'A cada 4 golpes, uma onda que atordoa todos em volta.' },
    goku_base: { v: { g: 'esferas', cor: '#FFC21A', s: 'ki_amarelo', n: 2 }, m: { rajada: 2 }, d: 'Lança duas esferas de ki amarelas.' },
    goku_ssj: { v: { g: 'soco', cor: '#FFD25E' }, m: { teleporte: 6 }, d: 'Teletransporte: aparece do lado do alvo (a cada 6s).' },
    goku_ssj2: { v: { g: 'raio', cor: '#FFE45C' }, m: { atordoar: [0.15, 0.45] }, d: 'Socos eletrizados que podem atordoar.' },
    goku_ssj3: { v: { g: 'impacto', cor: '#FFC21A', s: 'punho', pesado: true }, m: { especial: [4, 2.5, 36, 'punho'] }, d: 'A cada 4 golpes, o Punho do Dragão em área.' },
    goku_deus: { v: { g: 'palma', cor: '#FF4B3A', s: 'ki_vermelho' }, m: { regen: 0.03 }, d: 'Ki divino: recupera 3% da vida a cada golpe.' },
    goku_ssj4: { v: { g: 'soco', cor: '#E8303A', pesado: true }, m: { vampiro: 0.2 }, d: 'Poder primitivo: cura 20% do dano que causa.' },
    goku_blue: { v: { g: 'esferas', cor: '#3FC4FF', s: 'ki_azul', n: 3 }, m: { rajada: 3 }, d: 'Rajada de 3 esferas de ki azul.' },
    goku_blue_kaioken: { v: { g: 'soco', cor: '#FF2E2E' }, m: { kaioken: [0.02, 0.45] }, d: 'Kaioken: +45% de dano, mas perde 2% da vida a cada golpe.' },
    goku_blue_lb: { v: { g: 'impacto', cor: '#3FC4FF', s: 'ki_azul' }, m: { surgirImpacto: [1.5, 55] }, d: 'Chega quebrando tudo: uma explosão quando entra na arena.' },
    goku_pressagio: { v: { g: 'corte', cor: '#E8F4FF', s: 'ki_prata' }, m: { contraEsquiva: true }, d: 'Quando desvia de um ataque, revida na hora.' },
    goku_isc: { v: { g: 'impacto', cor: '#E8F4FF', s: 'ki_prata' }, m: { marcar: [0.2, 3], imune: true }, d: 'Imune a lentidão e atordoamento. Marca o alvo: +20% de dano de todos.' },
    goku_ui: { v: { g: 'impacto', cor: '#E8F4FF', s: 'ki_prata' }, m: { imune: true }, d: 'Imune a lentidão e atordoamento.' },
  };
  const padrao = (c) => (c && c.alcance > 40 ? { v: { p: 'ki_amarelo', vel: 300, tam: 14 } } : { v: { g: 'soco', cor: '#ffffff' } });
  const de = (c) => A[c && c.id] || padrao(c);

  return { CLASSES, CONTRA, NA_TORRE, classeDe, fortes, fracos, de, lista: A };
})();
