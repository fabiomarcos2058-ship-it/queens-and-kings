// Progresso do jogador, salvo no navegador (localStorage).
const Estado = (() => {
  const CHAVE = 'queens-and-kings-v3'; // v3: começa sem cartas e ganha as 8 básicas nos baús iniciais
  const NIVEL_MAX = 9;
  // Para evoluir do nível N para N+1: cópias e ouro (índice = nível atual)
  const COPIAS = [0, 2, 4, 10, 20, 50, 100, 200, 400];
  const OURO = [0, 5, 20, 50, 150, 400, 1000, 2000, 4000];
  const XP_NIVEL = (n) => 30 + n * 20; // nível 2 com ~2 vitórias; nível 9 com ~40 batalhas

  // ---------- Torres (igual Clash Royale) ----------
  // Torre do Rei: o nível acompanha o seu nível de rei (até o máximo).
  // Torres de princesa: evoluem com ouro, no máximo até o nível da Torre do Rei.
  // Cada nível deixa a torre ~10% mais forte (vida e dano), igual às cartas.
  const TORRE_OURO = [0, 30, 100, 250, 600, 1500, 3000, 6000, 10000]; // TORRE_OURO[n] = preço para ir do nível n ao n+1
  const TROPAS_TORRE = {
    princesa: { nome: 'Arqueira Real', emoji: '🏹', rei: 1, desc: 'Equilibrada: bom alcance e tiros constantes.', vida: 1, dano: 65, cadencia: 0.8, alcance: 120 },
    canhoneiro: { nome: 'Canhoneira', emoji: '💣', rei: 4, desc: 'Tiros lentos e muito fortes. Ótima contra tanques.', vida: 1.05, dano: 165, cadencia: 1.8, alcance: 108 },
    duquesa: { nome: 'Duquesa das Adagas', emoji: '🗡️', rei: 7, desc: 'Joga adagas sem parar. Destrói tropas pequenas, mas tem menos vida.', vida: 0.88, dano: 30, cadencia: 0.28, alcance: 100 },
  };
  // vida parecida com a do Clash: tropa barata leva ~20s para derrubar uma torre, tropa pesada ~8s
  const BASE_TORRE = { princesa: { vida: 3000 }, rei: { vida: 5000, dano: 90, cadencia: 1, alcance: 125 } };
  const nivelRei = (nv) => Math.max(1, Math.min(NIVEL_MAX, nv || (d ? d.nivel : 1)));
  // configuração das torres de um jogador: { rei, princesa, tropa }
  function minhasTorres() {
    return { rei: nivelRei(), princesa: Math.min(nivelRei(), d.torres.princesa), tropa: d.torres.tropa };
  }
  function statsTorre(tipo, cfg) {
    if (tipo === 'rei') {
      const f = Math.pow(1.1, (cfg.rei || 1) - 1);
      return { nivel: cfg.rei || 1, vida: Math.round(BASE_TORRE.rei.vida * f), dano: Math.round(BASE_TORRE.rei.dano * f), cadencia: 1, alcance: 125 };
    }
    const t = TROPAS_TORRE[cfg.tropa] || TROPAS_TORRE.princesa;
    const n = cfg.princesa || 1, f = Math.pow(1.1, n - 1);
    return { nivel: n, tropa: cfg.tropa in TROPAS_TORRE ? cfg.tropa : 'princesa', vida: Math.round(BASE_TORRE.princesa.vida * t.vida * f), dano: Math.round(t.dano * f), cadencia: t.cadencia, alcance: t.alcance };
  }
  // conta uma partida para cartas com usos limitados que estavam no deck; devolve as que acabaram agora
  function contarUsos() {
    const acabaram = [];
    for (const id of [...d.deck]) {
      const c = carta(id);
      if (!c || !c.usos) continue;
      d.usos[id] = (d.usos[id] || 0) + 1;
      if (d.usos[id] >= c.usos) {
        acabaram.push(c);
        if (!d.esgotadas.includes(id)) d.esgotadas.push(id);
        d.deck = d.deck.filter((x) => x !== id);
        if (d.avatar === id) d.avatar = 'coroa';
      }
    }
    if (acabaram.length) catalogo = todas.filter(visivel);
    salvar();
    return acabaram;
  }
  const usosRestantes = (id) => { const c = carta(id); return c && c.usos ? Math.max(0, c.usos - ((d.usos && d.usos[id]) || 0)) : null; };

  function podeEvoluirTorre() {
    const n = d.torres.princesa;
    if (n >= NIVEL_MAX) return { ok: false, motivo: 'Nível máximo' };
    if (n >= nivelRei()) return { ok: false, motivo: `Suba seu nível de rei para ${n + 1} primeiro` };
    if (d.ouro < TORRE_OURO[n]) return { ok: false, motivo: 'Ouro insuficiente' };
    return { ok: true, preco: TORRE_OURO[n] };
  }
  function evoluirTorre() {
    const p = podeEvoluirTorre();
    if (!p.ok) return p;
    d.ouro -= p.preco;
    d.torres.princesa++;
    salvar();
    return { ok: true, nivel: d.torres.princesa };
  }
  function escolherTropaTorre(id) {
    const t = TROPAS_TORRE[id];
    if (!t || nivelRei() < t.rei) return false;
    d.torres.tropa = id;
    salvar();
    return true;
  }

  const BAUS = {
    inicial: { nome: 'Baú inicial', segundos: 0, ouro: [20, 30], copias: 0, gemas: 0, imagem: 'inicial' },
    // chanceNova: chance de vir uma carta que você ainda não tem (cartas novas só saem de baú!)
    madeira: { nome: 'Baú de madeira', segundos: 60, ouro: [30, 60], copias: 6, gemas: 0, chanceNova: 0.12 },
    prata: { nome: 'Baú de prata', segundos: 5 * 60, ouro: [80, 140], copias: 15, gemas: 2, chanceNova: 0.3 },
    ouro: { nome: 'Baú de ouro', segundos: 15 * 60, ouro: [250, 400], copias: 40, gemas: 5, chanceNova: 0.75 },
  };

  let todas = []; // cartas.json inteiro
  let catalogo = []; // só as cartas que este jogador pode ver (as exclusivas aparecem só para os IDs da carta)
  const meuUid = () => (typeof Conta !== 'undefined' && Conta.uid ? Conta.uid() : null);
  const visivel = (c) => !c.token && (!c.exclusivo || c.exclusivo.includes(meuUid()) || !!(d && d.cartasExtras && d.cartasExtras.includes(c.id))) && !(d && d.esgotadas && d.esgotadas.includes(c.id)); // tokens (ex.: minis do barril) não são cartas
  let d = null;

  function novo() {
    return {
      nome: 'Jogador', nivel: 1, xp: 0, ouro: 500, gemas: 100, trofeus: 0, recorde: 0,
      avatar: 'coroa', cor: 'roxo', conquistas: { baus: 0, evolucoes: 0, tresCoroas: 0 },
      deck: [], colecao: {},
      baus: null, // criados em carregar(): 4 baús iniciais com 2 cartas básicas cada
      boasVindas: false,
      cla: null,
      eventos: { sequencia: 0, desafioPremio: false, coroas: 0, torneioPremio: false },
      ofertas: { dia: '', compradas: [] },
      vitorias: 0, derrotas: 0,
      torres: { princesa: 1, tropa: 'princesa' },
    };
  }

  function carregar(lista) {
    todas = lista;
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { salvo = null; }
    return normalizar(salvo);
  }

  // Coloca um progresso (do navegador ou da nuvem) no formato atual do jogo
  function normalizar(obj) {
    d = obj || novo();
    const base = novo();
    for (const k in base) if (d[k] === undefined) d[k] = base[k];
    for (const k in base.conquistas) if (d.conquistas[k] === undefined) d.conquistas[k] = 0;
    if (!d.torres || typeof d.torres !== 'object' || d.torresNovas !== true) {
      // quem já jogava ganha as torres de princesa no nível médio do deck (sem passar do nível de rei)
      const dk = (d.deck || []).filter((id) => d.colecao && d.colecao[id]);
      const media = dk.length ? Math.round(dk.reduce((a, id) => a + (d.colecao[id].nivel || 1), 0) / dk.length) : 1;
      d.torres = { princesa: Math.max(1, Math.min(nivelRei(d.nivel), media)), tropa: (d.torres && d.torres.tropa) || 'princesa' };
      d.torresNovas = true;
    }
    if (typeof d.cla === 'string') d.cla = null; // clãs antigos (simulados) não existem mais
    // toda carta do catálogo entra na coleção
    catalogo = todas.filter(visivel);
    for (const c of catalogo) if (!d.colecao[c.id]) d.colecao[c.id] = { nivel: 1, copias: 0, tem: false };
    // cartas exclusivas são presenteadas para as contas escolhidas
    if (!d.presentes) d.presentes = [];
    for (const c of catalogo.filter((x) => x.exclusivo)) {
      if (d.presentes.includes(c.id)) continue;
      d.colecao[c.id].tem = true;
      if (c.nivelInicial) d.colecao[c.id].nivel = Math.max(d.colecao[c.id].nivel, c.nivelInicial);
      d.presentes.push(c.id);
      d.presenteNovo = c.id;
      if (d.deck.length < 8 && !d.deck.includes(c.id)) d.deck.push(c.id);
    }
    // cartas com partidas limitadas que já acabaram saem do deck
    if (!d.usos) d.usos = {};
    if (!d.esgotadas) d.esgotadas = [];
    d.deck = d.deck.filter((id) => !d.esgotadas.includes(id));
    if (!d.id) d.id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (!d.baus) {
      // cada jogador ganha 8 cartas básicas sorteadas (sempre com pelo menos 1 feitiço)
      const basicas = embaralhar(catalogo.filter((c) => c.inicial));
      const feitico = basicas.find((c) => c.feitico);
      const escolhidas = embaralhar([feitico, ...basicas.filter((c) => c !== feitico).slice(0, 7)].filter(Boolean)).map((c) => c.id);
      d.baus = [0, 1, 2, 3].map((i) => ({ tipo: 'inicial', inicio: 1, cartas: escolhidas.slice(i * 2, i * 2 + 2) }));
    }
    d.deck = d.deck.filter((id) => catalogo.some((c) => c.id === id) && d.colecao[id].tem);
    for (const id of Object.keys(d.colecao)) if (!todas.some((c) => c.id === id)) delete d.colecao[id]; // cartas removidas do jogo
    salvar();
    return d;
  }

  let ouvinte = null; // chamado a cada salvamento (sincroniza com a nuvem)
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* modo anônimo etc. */ }
    if (ouvinte) ouvinte(d);
  }
  const aoSalvar = (fn) => { ouvinte = fn; };

  // troca o progresso atual por outro (ex.: o que veio da nuvem)
  function importar(obj) { normalizar(obj); }
  // refaz a lista de cartas visíveis (depois de entrar ou sair de uma conta)
  function recarregarCatalogo() { normalizar(d); salvar(); }

  function apagar() {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ }
    normalizar(null);
  }

  const carta = (id) => todas.find((c) => c.id === id);
  function embaralhar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const tem = (id) => !!(d.colecao[id] && d.colecao[id].tem);
  const liberada = (id) => (carta(id).trofeus || 0) <= d.recorde; // já aparece em baús e na loja
  const disponiveis = () => catalogo.filter((c) => liberada(c.id) && !c.exclusivo); // exclusivas não saem em baú/loja
  const proximaLiberacao = () => catalogo.filter((c) => !liberada(c.id)).sort((a, b) => a.trofeus - b.trofeus)[0] || null;
  const sorteio = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // Estatísticas com o nível aplicado (+10% por nível)
  function stats(id, nivelForcado) {
    const c = carta(id);
    const n = nivelForcado || (d.colecao[id] ? d.colecao[id].nivel : 1);
    const f = Math.pow(1.1, n - 1);
    return { ...c, nivel: n, vida: c.vida ? Math.round(c.vida * f) : 0, dano: c.dano ? Math.round(c.dano * f) : 0 };
  }

  function ganharXp(qtd) {
    d.xp += qtd;
    const subiu = [];
    while (d.xp >= XP_NIVEL(d.nivel)) {
      d.xp -= XP_NIVEL(d.nivel);
      d.nivel++;
      d.gemas += 10;
      subiu.push(d.nivel);
    }
    return subiu;
  }

  function podeEvoluir(id) {
    const n = d.colecao[id].nivel;
    if (n >= NIVEL_MAX) return { ok: false, motivo: 'Nível máximo' };
    if (d.colecao[id].copias < COPIAS[n]) return { ok: false, motivo: `Faltam cópias (${d.colecao[id].copias}/${COPIAS[n]})` };
    if (d.ouro < OURO[n]) return { ok: false, motivo: `Falta ouro (${OURO[n]})` };
    return { ok: true };
  }

  function evoluir(id) {
    if (!podeEvoluir(id).ok) return false;
    const n = d.colecao[id].nivel;
    d.colecao[id].copias -= COPIAS[n];
    d.ouro -= OURO[n];
    d.colecao[id].nivel++;
    d.conquistas.evolucoes++;
    const niveis = ganharXp(10 + n * 5); // evoluir carta dá bastante XP, igual ao Clash
    salvar();
    return { niveis };
  }

  // Distribui cópias entre cartas aleatórias.
  // Quase tudo vai para cartas que você já tem; uma carta nova só aparece com a chance do baú.
  const PESO = { comum: 6, rara: 3, epica: 1, lendaria: 0.2 };
  function pesado(lista) {
    const soma = lista.reduce((a, c) => a + PESO[c.raridade], 0);
    let r = Math.random() * soma;
    return lista.find((x) => (r -= PESO[x.raridade]) < 0) || lista[0];
  }
  function sortearCopias(total, chanceNova = 0) {
    const ganhos = {};
    const lista = disponiveis();
    const minhas = lista.filter((c) => tem(c.id)), outras = lista.filter((c) => !tem(c.id));
    if (outras.length && (Math.random() < chanceNova || !minhas.length)) {
      const nova = pesado(outras);
      ganhos[nova.id] = 1; // a 1ª cópia desbloqueia
      total -= 1;
    }
    const pool = minhas.length ? minhas : lista;
    while (total > 0 && pool.length) {
      const c = pesado(pool);
      const q = Math.min(total, Math.max(1, Math.round(total * (c.raridade === 'comum' ? 0.4 : c.raridade === 'rara' ? 0.3 : 0.15))));
      ganhos[c.id] = (ganhos[c.id] || 0) + q;
      total -= q;
    }
    const novas = [];
    for (const id in ganhos) {
      if (!d.colecao[id].tem) { d.colecao[id].tem = true; novas.push(id); ganhos[id]--; } // a 1ª cópia desbloqueia
      d.colecao[id].copias += ganhos[id];
    }
    ganhos._novas = novas;
    return ganhos;
  }

  // carta recém-desbloqueada entra no deck se tiver espaço
  function encaixarNoDeck(ids) {
    for (const id of ids) if (d.deck.length < 8 && !d.deck.includes(id)) d.deck.push(id);
  }

  function abrirBau(tipo, slot = null) {
    const b = BAUS[tipo];
    const ouro = sorteio(...b.ouro);
    d.ouro += ouro;
    d.gemas += b.gemas;
    let cartas, novas;
    if (slot && slot.cartas) {
      // baú inicial: cartas garantidas
      cartas = {}; novas = [];
      for (const id of slot.cartas) {
        if (!d.colecao[id].tem) { d.colecao[id].tem = true; novas.push(id); cartas[id] = 0; }
        else { d.colecao[id].copias += 1; cartas[id] = 1; }
      }
    } else {
      cartas = sortearCopias(b.copias, b.chanceNova || 0);
      novas = cartas._novas; delete cartas._novas;
    }
    encaixarNoDeck(novas);
    d.conquistas.baus++;
    salvar();
    return { ouro, gemas: b.gemas, cartas, novas };
  }

  function tempoRestante(slot) {
    if (!slot || !slot.inicio) return null;
    return Math.max(0, slot.inicio + BAUS[slot.tipo].segundos * 1000 - Date.now());
  }

  const hojeLocal = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };
  // presente grátis da loja (1 por dia)
  function presenteDiario(pegar = false) {
    const hoje = hojeLocal();
    if (d.presenteDia === hoje) return null;
    if (!pegar) return true;
    d.presenteDia = hoje;
    const r = Math.random();
    let p;
    if (r < 0.55) { const q = sorteio(60, 140); d.ouro += q; p = { tipo: 'ouro', qtd: q }; }
    else if (r < 0.85) { const q = sorteio(4, 10); d.gemas += q; p = { tipo: 'gemas', qtd: q }; }
    else p = { tipo: 'bau', bau: 'madeira', abertura: abrirBau('madeira') };
    salvar();
    return p;
  }
  function ofertasDoDia() {
    const hoje = hojeLocal();
    if (d.ofertas.dia !== hoje) d.ofertas = { dia: hoje, compradas: [] };
    // sorteio fixo por dia
    let semente = [...(hoje + d.id)].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rnd = () => ((semente = (semente * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const preco = { comum: [10, 100], rara: [4, 300], epica: [1, 800], lendaria: [1, 3000] };
    const lista = [];
    const pool = disponiveis().filter((c) => tem(c.id)); // a loja só vende cópias de cartas que você já tem
    if (!pool.length) return []; // ainda não abriu os baús iniciais
    const usados = new Set();
    for (let i = 0; i < 6; i++) {
      let c = pool[Math.floor(rnd() * pool.length)];
      for (let k = 0; k < 6 && usados.has(c.id) && pool.length > usados.size; k++) c = pool[Math.floor(rnd() * pool.length)];
      usados.add(c.id);
      if (i === 0) { lista.push({ i, id: c.id, copias: Math.max(1, Math.ceil(preco[c.raridade][0] / 2)), preco: 0, gratis: true }); continue; }
      // desconto aleatório em algumas ofertas
      const desconto = rnd() < 0.3 ? 0.7 : 1;
      lista.push({ i, id: c.id, copias: preco[c.raridade][0], preco: Math.round(preco[c.raridade][1] * desconto), desconto: desconto < 1 });
    }
    return lista;
  }

  return {
    get d() { return d; }, carregar, salvar, apagar, importar, recarregarCatalogo, aoSalvar, carta, stats, catalogo: () => catalogo, tem, liberada, disponiveis, proximaLiberacao,
    COPIAS, OURO, NIVEL_MAX, BAUS, XP_NIVEL,
    contarUsos, usosRestantes, todasCartas: () => todas.filter((c) => !c.token),
    TORRE_OURO, TROPAS_TORRE, nivelRei, minhasTorres, statsTorre, podeEvoluirTorre, evoluirTorre, escolherTropaTorre,
    ganharXp, podeEvoluir, evoluir, abrirBau, tempoRestante, sortearCopias, ofertasDoDia, presenteDiario, sorteio,
  };
})();
