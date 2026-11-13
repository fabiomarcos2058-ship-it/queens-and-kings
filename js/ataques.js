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
    tanque: ['itsuki', 'shizuku', 'gogeta_ssj4', 'goku_ssj3', 'goku_ssj4', 'goku_blue_lb', 'gogeta_ultra', 'sonic_excalibur', 'conquest', 'omni_man', 'vegeta_ultra_ego', 'gogeta_blue_solo', 'adam_smasher', 'adam_smasher_evo', 'albedo'],
    assassino: ['bra', 'teto', 'pan_dbh', 'akame', 'mbappe', 'kashimo', 'goku_pressagio', 'diavolo', 'mita_malvada', 'akame_murasame', 'sonic', 'dark_sonic', 'kurona', 'goku_black_rose', 'goku_blue_kaioken_remake', 'vegetto_blue_solo', 'agente_rubi', 'david_martinez', 'lucy_kushinada', 'shalltear'],
    atirador: ['mai', 'miku_nakano', 'pan_gt', 'riruka', 'rukia_remake', 'nino_nakano', 'gyro', 'johnny', 'roman_cyber', 'johnny_silverhand', 'pandoras_actor'],
    mago: ['rukia', 'nami_last', 'hatsune_miku', 'bambietta', 'bulma', 'gojo', 'robin', 'pucci', 'mita_gentil', 'yugi_moto', 'anri_halloween', 'eve_atomica', 'ainz_ooal_gown', 'demiurge'],
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
    sonic: { v: { g: 'giro', cor: '#3B82F6' }, m: { spinDash: [4, 1.8], aneis: 5 }, d: 'Spin Dash em quem está longe. Junta anéis e espalha eles em vez de cair.' },
    shadow: { v: { g: 'chute', cor: '#E8463C' }, m: { chaosSpear: 3, inibidores: 0.4, moveNoTempo: true }, d: 'A cada 3 golpes, Chaos Spears em até 3 inimigos.' },
    super_sonic: { v: { g: 'impacto', cor: '#FFD25E' }, m: { superForma: 16, voo: true }, d: 'Voa e é invencível enquanto tiver anéis.' },
    dark_sonic: { v: { g: 'giro', cor: '#A855F7' }, m: { raivaSombria: true, berserk: 0.35 }, d: 'Fica furioso quando um aliado cai perto.' },
    sonic_excalibur: { v: { g: 'corte', s: 'espada_trunks', cor: '#BFE8FF' }, m: { escudo: 0.2, aparar: 7 }, d: 'Corte em área, escudo e aparar com contra-ataque.' },
    hyper_sonic: { v: { g: 'impacto', cor: '#F5F5FF' }, m: { esmeraldas: 7, hyperFlash: [5, 90, 0.45], voo: true }, d: '7 Esmeraldas do Caos seguram golpes. Hiper Flash atordoa em volta.' },
    yugi_moto: { v: { p: 'coringa', vel: 300, tam: 18, giro: 540, rastro: '#FFD25E' }, m: { duelista: 8 }, d: 'Joga cartas de longe e compra uma carta especial a cada 8s.' },
    anissa: { v: { g: 'soco', cor: '#E8EEF8' }, m: { combo: 3, atordoar: [0.25, 0.4], veterano: 0.1, voo: true }, d: 'Socos Viltrumitas rápidos que deixam tonto.' },
    omni_man: { v: { g: 'soco', cor: '#E8463C', pesado: true }, m: { combo: 3, empurrar: 22, atordoar: [1, 0.25], veterano: 0.2, voo: true }, d: 'O Regente de Viltrum: socos que arremessam longe.' },
    mark_eve: { v: { g: 'soco', cor: '#3B9BFF' }, m: { dupla: 0.5, separar: 0.5, voo: true }, d: 'Soco do Mark + rajada da Eve no mesmo alvo.' },
    invencivel: { v: { g: 'soco', cor: '#FFC21A', pesado: true }, m: { combo: 4, empurrar: 10, regen: 0.012, voo: true }, d: 'Socos Viltrumitas: a cada 4, um golpe dobrado.' },
    eve_atomica: { v: { p: 'cristal', vel: 360, tam: 18, rastro: '#FF5CC8' }, m: { chaEncantado: [6, 0.12, 120], voo: true }, d: 'Energia rosa de longe. Reconstrói a matéria pra curar aliados.' },
    conquest: { v: { g: 'soco', cor: '#B9B4D6', pesado: true }, m: { berserk: 0.4, empurrar: 14, veterano: 0.2 }, d: 'Veterano Viltrumita: leva menos dano e bate em área.' },
    mark_azul: { v: { g: 'soco', cor: '#3B6BFF' }, m: { furiaAzul: 5, voo: true }, d: 'Cada soco seguido no mesmo alvo fica mais rápido.' },
    mark_cabelo_longo: { v: { g: 'soco', cor: '#FFC21A' }, m: { vampiro: 0.2, berserk: 0.3, voo: true }, d: 'Rouba vida a cada soco.' },
    mark_sem_lentes: { v: { g: 'soco', cor: '#FFC21A' }, m: { critico: [0.3, 2], voo: true }, d: '30% de chance de crítico.' },
    mark_flaxan: { v: { g: 'soco', cor: '#7FB8A8' }, m: { escudo: 0.3 }, d: 'Armadura Flaxan: começa com escudo.' },
    mark_prisioneiro: { v: { g: 'soco', cor: '#E8A07A' }, d: 'Rápido e escorregadio: desvia de golpes.' },
    roman_cyber: { v: { g: 'tiro', s: 'bala', cor: '#3CFF9A' }, m: { camera: true }, d: 'Se prende num aliado: +30% de dano, ataque e movimento 25% mais rápidos.' },
    lucy_kushinada: { v: { g: 'corte', cor: '#FF5CF4' }, m: { netrunner: 7 }, d: 'A cada 7s hackeia um inimigo: atordoa, curto-circuito ou controle mental.' },
    agente_rubi: { v: { g: 'soco', cor: '#FF3A3A' }, m: { critico: [0.2, 1.8] }, d: 'Ciberpsicose: muito forte por 5s, depois cai.' },
    david_martinez: { v: { g: 'soco', cor: '#3CFF9A' }, m: { empurrar: 8 }, d: 'Sandevistan: os inimigos param e ele ataca 4x mais rápido.' },
    adam_smasher: { v: { g: 'tiro', s: 'bala', cor: '#FF6A3A' }, m: { veterano: 0.25, imune: true }, d: 'Recebe 25% menos dano e não pode ser atordoado. Rajada de mísseis.' },
    adam_smasher_evo: { v: { g: 'tiro', s: 'bala', cor: '#FF3A3A' }, m: { veterano: 0.25, imune: true }, d: 'Chassi militar, mísseis e Sandevistan.' },
    johnny_silverhand: { v: { g: 'tiro', s: 'bala', cor: '#FFD25E' }, m: {}, d: 'Malorian Arms: tiro pesado.' },
    ainz_ooal_gown: { v: { p: 'ki_roxo', vel: 240, tam: 22, rastro: '#B15CFF', explode: true }, m: { nz: true, imune: true, graspHeart: 8, auraDesespero: [130, 0.15] }, d: 'Magias sombrias em área. Agarrar Coração a cada 8s. Aura do Desespero enfraquece quem chega perto.' },
    albedo: { v: { g: 'corte', cor: '#9B5CFF', pesado: true }, m: { nz: true, escudo: 0.25, veterano: 0.15, guardia: 150, empurrar: 8 }, d: 'Tanque com escudo. Recebe parte do dano dos aliados (metade do dano do Ainz).' },
    shalltear: { v: { g: 'corte', cor: '#FF2A5C' }, m: { nz: true, vampiro: 0.25, berserk: 0.35 }, d: 'Rouba 25% do dano. Ataca mais rápido quanto mais machucada.' },
    demiurge: { v: { p: 'fogo', vel: 230, tam: 20, rastro: '#FF4A1A', explode: true }, m: { nz: true, queimar: [0.05, 3, '#FF4A1A', 'fogo'], dominar: [6, 3, 1.2] }, d: 'Fogo infernal que queima. A cada 6s faz até 3 inimigos se ajoelharem.' },
    sebas_tian: { v: { g: 'soco', cor: '#E8EEF8' }, m: { nz: true, combo: 3, atordoar: [0.15, 0.5], empurrar: 6 }, d: 'Socos precisos: todo 3º golpe causa o dobro.' },
    pandoras_actor: { v: { p: 'ki_amarelo', vel: 300, tam: 16, rastro: '#FFD25E' }, m: { nz: true, milFaces: true }, d: 'Copia o dano do aliado mais forte ao entrar. Imita habilidades.' },
    goku_vegeta: { v: { g: 'soco', cor: '#C9B8FF', pesado: true }, m: { rivais: true, voo: true }, d: 'Revezam: Instinto (desvia e revida) e Ego (fica mais forte apanhando e rouba vida).' },
    gogeta_vegetto_blue: { v: { g: 'soco', cor: '#3FC4FF', pesado: true }, m: { voo: true }, d: 'Entram dois: Gogeta e Vegetto. Dividem o dano e focam o mesmo alvo.' },
    gogeta_blue_solo: { v: { g: 'soco', cor: '#3FC4FF', pesado: true }, m: { empurrar: 8, voo: true }, d: 'Soco pesado. Divide o dano com o Vegetto.' },
    vegetto_blue_solo: { v: { g: 'corte', s: 'espada_vegito', cor: '#5CE1FF' }, m: { voo: true }, d: 'Espada Espiritual rápida. Divide o dano com o Gogeta.' },
    vegetto_gogeta: { v: { g: 'corte', s: 'espada_vegito', cor: '#C38BFF' }, m: { alternar: true, voo: true }, d: 'Espada (atravessa escudo, não dá pra desviar) e Punho (atordoa) se alternam.' },
    vegeta_ultra_ego: { v: { g: 'soco', cor: '#C04BFF', pesado: true }, m: { ultraEgo: true, vampiro: 0.2, voo: true }, d: 'Mais forte quanto mais machucado. Volta uma vez quando cairia.' },
    goku_blue_kaioken_remake: { v: { g: 'soco', cor: '#FF2E5E' }, m: { kaiokenRemake: 10, voo: true }, d: 'Empilha Kaioken a cada golpe: mais dano e velocidade, mas drena vida.' },
    goku_deus_remake: { v: { g: 'palma', cor: '#FF4B3A', s: 'ki_vermelho' }, m: { kiDivino: [110, 0.015, 0.15], imune: true, voo: true }, d: 'Aura que cura e fortalece os aliados. Imune a atordoar e lentidão.' },
    goku_black_rose: { v: { g: 'corte', cor: '#FF5CC8' }, m: { laminaDivina: 3, perfura: true, voo: true }, d: 'Corte que atravessa e deixa uma ferida que não deixa curar.' },
    vegeta_evolution: { v: { g: 'soco', cor: '#3B6BFF' }, m: { escudo: 0.2, orgulho: [10, 0.1, 6], voo: true }, d: 'Escudo que volta. Quando quebra, evolui: +30% de dano.' },
    vegeta_ssj4: { v: { g: 'soco', cor: '#E8303A', pesado: true }, m: { berserk: 0.45, vampiro: 0.15 }, d: 'Bate mais rápido quanto menos vida tem e rouba vida.' },
    vegeta_blue: { v: { g: 'soco', cor: '#3FC4FF' }, m: { galick: 4, voo: true }, d: 'A cada 4 golpes, um Galick Gun em linha.' },
    vegeta_deus: { v: { g: 'palma', cor: '#FF4B3A', s: 'ki_vermelho' }, m: { regen: 0.03, imune: true }, d: 'Cura 3% a cada golpe. Imune a atordoar e lentidão.' },
    majin_vegeta: { v: { g: 'soco', cor: '#FFD25E', pesado: true }, m: { explosaoFinal: [3, 75] }, d: 'Quando cai, se explode levando todo mundo junto.' },
    vegeta_ssj: { v: { g: 'soco', cor: '#FFD25E' }, m: { especial: [5, 1.8, 36, 'explosao'] }, d: 'A cada 5 golpes, o Big Bang Attack explode em área.' },
    vegeta_base: { v: { g: 'soco', cor: '#4B6BFF' }, m: { critico: [0.25, 1.8] }, d: '25% de chance de crítico.' },
    kurona: { v: { g: 'chute', cor: '#FF4F8B', s: 'bola' }, m: { tabelinha: 2 }, d: 'Tabelinha: a cada 2 golpes um aliado bate junto.' },
    itoshi_sae: { v: { g: 'chute', cor: '#E8E4D8', s: 'bola' }, m: { passePerfeito: 3 }, d: 'Passa a bola pro aliado mais forte, que bate na hora e fica mais forte.' },
    itoshi_rin: { v: { g: 'chute', cor: '#4FD1C5', s: 'bola' }, m: { chuteFantasma: 4 }, d: 'Chute Fantasma: curva, não dá pra esquivar e ricocheteia.' },
    isagi_ultra: { v: { g: 'chute', cor: '#5EC8FF', s: 'bola' }, m: { devorar: 10 }, d: 'Metavisão: desvia de golpes e fica mais forte a cada inimigo que cai perto.' },
    anri_halloween: { v: { p: 'abobora', vel: 260, tam: 20, giro: 300, rastro: '#F58A28' }, m: { chaEncantado: [5, 0.1, 100] }, d: 'Joga abóboras e cura os aliados com chá encantado.' },
    akame_murasame: { v: { g: 'corte', s: 'katana', cor: '#E0102F' }, m: { queimar: [0.06, 3, '#B0123A', 'veneno'], murasame: 0.2, sombras: 1.5 }, d: 'Murasame: o corte amaldiçoa com veneno e elimina na hora quem fica fraco demais.' },
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
    goku_ssj: { v: { g: 'soco', cor: '#FFD25E' }, m: { teleporte: 6, furiaNamek: true }, d: 'Teletransporte: aparece do lado do alvo (a cada 6s). Passiva: se 2 ou 3 inimigos o pressionarem, ele fica furioso e solta um Super Kamehameha (bem mais forte com 3).' },
    gojo: { v: { p: 'ki_azul', vel: 250, tam: 20, rastro: '#4FB4FF', cor: '#A64DFF' }, m: { gojo: true }, d: 'Alterna o Azul (puxa os inimigos pro impacto) e o Vermelho (explode e empurra). Infinito: os primeiros golpes nem encostam nele.' },
    goku_ssj2: { v: { g: 'raio', cor: '#FFE45C' }, m: { atordoar: [0.15, 0.45] }, d: 'Socos eletrizados que podem atordoar.' },
    goku_ssj3: { v: { g: 'impacto', cor: '#FFC21A', s: 'punho', pesado: true }, m: { especial: [4, 2.5, 36, 'punho'] }, d: 'A cada 4 golpes, o Punho do Dragão em área.' },
    goku_deus: { v: { g: 'palma', cor: '#FF4B3A', s: 'ki_vermelho' }, m: { regen: 0.03 }, d: 'Ki divino: recupera 3% da vida a cada golpe.' },
    goku_ssj4: { v: { g: 'soco', cor: '#E8303A', pesado: true }, m: { vampiro: 0.2 }, d: 'Poder primitivo: cura 20% do dano que causa.' },
    goku_blue: { v: { g: 'esferas', cor: '#3FC4FF', s: 'ki_azul', n: 3 }, m: { rajada: 3 }, d: 'Rajada de 3 esferas de ki azul.' },
    goku_blue_kaioken: { v: { g: 'soco', cor: '#FF2E2E' }, m: { kaioken: [0.02, 0.45] }, d: 'Kaioken: +45% de dano, mas perde 2% da vida a cada golpe.' },
    goku_blue_lb: { v: { g: 'impacto', cor: '#3FC4FF', s: 'ki_azul' }, m: { surgirImpacto: [1.5, 55] }, d: 'Chega quebrando tudo: uma explosão quando entra na arena.' },
    goku_pressagio: { v: { g: 'corte', cor: '#E8F4FF', s: 'ki_prata' }, m: { contraEsquiva: true, pulosKame: true }, d: 'Quando desvia de um ataque, revida na hora. Passiva: se 2 ou 3 inimigos o cercarem, dá dois pulos pra trás e solta um Kamehameha no grupo.' },
    goku_isc: { v: { g: 'impacto', cor: '#E8F4FF', s: 'ki_prata' }, m: { marcar: [0.2, 3], imune: true, atravessar: true }, d: 'Imune a lentidão e atordoamento. Marca o alvo: +20% de dano de todos. Passiva: se 2 ou 3 inimigos o cercarem, desvia, passa no meio deles e vai só atrás das torres, 15% mais rápido.' },
    nino_nakano: { v: { p: 'borboleta', vel: 220, tam: 16, rastro: '#FF8FB1' }, m: { marmita: true }, d: 'Joga borboletas. Passiva: a cada 6s uma marmita cura a aliada mais ferida (+22% de vida e +20% de dano por 5s). Levou um golpe forte? "Baka!" e empurra quem está colado.' },
    robin: { v: { g: 'bracos', cor: '#F2C4A0' }, m: { hana: true }, d: 'Hana Hana: braços brotam do chão embaixo do alvo (não dá pra desviar do projétil, não tem projétil!). A cada 3 golpes prende o alvo. Quem encosta nela é empurrado pelos braços.' },
    jotaro: { v: { g: 'soco', cor: '#8E6CFF' }, m: { ora: 4, moveNoTempo: true }, d: 'Socos do Stand. A cada 4 golpes, uma rajada de 5 socos. Anda no tempo parado.' },
    dio: { v: { g: 'soco', cor: '#FFD25E', pesado: true }, m: { vampiro: 0.25, moveNoTempo: true }, d: 'Golpes que roubam vida (25%). Anda no tempo parado.' },
    diavolo: { v: { g: 'corte', cor: '#FF3D7F' }, m: { epitafio: 7 }, d: 'Corte do Stand. Epitáfio: desvia de um golpe a cada 7s.' },
    pucci: { v: { p: 'disco', vel: 230, tam: 20, giro: 720, rastro: '#D9B8FF' }, m: { disco: 3 }, d: 'Discos. A cada 3, rouba o disco do alvo (trava a habilidade e enfraquece).' },
    gyro: { v: { p: 'bola_aco', vel: 240, tam: 18, giro: 900, rastro: '#C9D3DE' }, m: { ricochete: 0.6, lentidao: [0.3, 1.5] }, d: 'Bola de Aço que quica em outro inimigo e deixa todos lentos.' },
    johnny: { v: { p: 'unha', vel: 330, tam: 15, giro: 1080, rastro: '#8FD3FF' }, m: { tusk: 0.15 }, d: 'Unhas giratórias de longe. +15% de dano por tiro seguido no mesmo alvo (até +60%).' },
    mita_gentil: { v: { p: 'coracao_mita', vel: 220, tam: 17, rastro: '#FF8FC0' }, m: { mitaGentil: true }, d: 'Joga corações. Lembra de você e fica mais forte a cada partida juntos. Protege sua torre do rei uma vez.' },
    mita_malvada: { v: { g: 'corte', s: 'tesoura', cor: '#E0204A' }, m: { mitaMalvada: true }, d: 'Corta com a tesoura. Volta da morte uma vez e deixa o bot rival confuso.' },
    goku_ui: { v: { g: 'impacto', cor: '#E8F4FF', s: 'ki_prata' }, m: { imune: true }, d: 'Imune a lentidão e atordoamento.' },
  };
  const padrao = (c) => (c && c.alcance > 40 ? { v: { p: 'ki_amarelo', vel: 300, tam: 14 } } : { v: { g: 'soco', cor: '#ffffff' } });
  const de = (c) => A[c && c.id] || padrao(c);

  return { CLASSES, CONTRA, NA_TORRE, classeDe, fortes, fracos, de, lista: A };
})();
