// Progresso do jogador, salvo no navegador (localStorage).
const Estado = (() => {
  const CHAVE = 'queens-and-kings-v3'; // v3: começa sem cartas e ganha as 8 básicas nos baús iniciais
  const NIVEL_MAX = 9;
  // Para evoluir do nível N para N+1: cópias e ouro (índice = nível atual)
  const COPIAS = [0, 2, 4, 10, 20, 50, 100, 200, 400];
  const OURO = [0, 5, 20, 50, 150, 400, 1000, 2000, 4000];
  const XP_NIVEL = (n) => 20 + n * 30;

  const BAUS = {
    inicial: { nome: 'Baú inicial', segundos: 0, ouro: [20, 30], copias: 0, gemas: 0, imagem: 'madeira' },
    madeira: { nome: 'Baú de madeira', segundos: 60, ouro: [30, 60], copias: 6, gemas: 0 },
    prata: { nome: 'Baú de prata', segundos: 5 * 60, ouro: [80, 140], copias: 15, gemas: 2 },
    ouro: { nome: 'Baú de ouro', segundos: 15 * 60, ouro: [250, 400], copias: 40, gemas: 5 },
  };

  let catalogo = []; // cartas.json
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
    };
  }

  function carregar(lista) {
    catalogo = lista;
    try { d = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { d = null; }
    if (!d) d = novo();
    const base = novo();
    for (const k in base) if (d[k] === undefined) d[k] = base[k];
    for (const k in base.conquistas) if (d.conquistas[k] === undefined) d.conquistas[k] = 0;
    // toda carta do catálogo entra na coleção
    for (const c of catalogo) if (!d.colecao[c.id]) d.colecao[c.id] = { nivel: 1, copias: 0, tem: false };
    if (!d.baus) {
      const basicas = catalogo.filter((c) => c.inicial).map((c) => c.id);
      d.baus = [0, 1, 2, 3].map((i) => ({ tipo: 'inicial', inicio: 1, cartas: basicas.slice(i * 2, i * 2 + 2) }));
    }
    d.deck = d.deck.filter((id) => catalogo.some((c) => c.id === id) && d.colecao[id].tem);
    salvar();
    return d;
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* modo anônimo etc. */ }
  }

  function apagar() {
    d = novo();
    carregar(catalogo);
  }

  const carta = (id) => catalogo.find((c) => c.id === id);
  const tem = (id) => !!(d.colecao[id] && d.colecao[id].tem);
  const liberada = (id) => (carta(id).trofeus || 0) <= d.recorde; // já aparece em baús e na loja
  const disponiveis = () => catalogo.filter((c) => liberada(c.id));
  const proximaLiberacao = () => catalogo.filter((c) => !liberada(c.id)).sort((a, b) => a.trofeus - b.trofeus)[0] || null;
  const sorteio = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // Estatísticas com o nível aplicado (+10% por nível)
  function stats(id) {
    const c = carta(id);
    const n = d.colecao[id].nivel;
    const f = Math.pow(1.1, n - 1);
    return { ...c, nivel: n, vida: c.vida ? Math.round(c.vida * f) : 0, dano: Math.round(c.dano * f) };
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
    const niveis = ganharXp(4 + n * 3);
    salvar();
    return { niveis };
  }

  // Distribui cópias entre cartas aleatórias
  function sortearCopias(total) {
    const ganhos = {};
    const pesos = { comum: 6, rara: 3, epica: 1.2, lendaria: 0.4 };
    const lista = disponiveis();
    while (total > 0) {
      const soma = lista.reduce((s, c) => s + pesos[c.raridade], 0);
      let r = Math.random() * soma;
      const c = lista.find((x) => (r -= pesos[x.raridade]) < 0) || lista[0];
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
      cartas = sortearCopias(b.copias);
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

  function ofertasDoDia() {
    const hoje = new Date().toISOString().slice(0, 10);
    if (d.ofertas.dia !== hoje) d.ofertas = { dia: hoje, compradas: [] };
    // sorteio fixo por dia
    let semente = [...hoje].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((semente = (semente * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const preco = { comum: [10, 100], rara: [4, 300], epica: [1, 800], lendaria: [1, 3000] };
    const lista = [];
    const pool = disponiveis().filter((c) => tem(c.id) || !c.inicial);
    if (!pool.length) return [];
    for (let i = 0; i < 3; i++) {
      const c = pool[Math.floor(rnd() * pool.length)];
      lista.push({ i, id: c.id, copias: preco[c.raridade][0], preco: preco[c.raridade][1] });
    }
    return lista;
  }

  return {
    get d() { return d; }, carregar, salvar, apagar, carta, stats, catalogo: () => catalogo, tem, liberada, disponiveis, proximaLiberacao,
    COPIAS, OURO, NIVEL_MAX, BAUS, XP_NIVEL,
    ganharXp, podeEvoluir, evoluir, abrirBau, tempoRestante, sortearCopias, ofertasDoDia, sorteio,
  };
})();
