// Passe da temporada: 30 níveis por mês, três trilhas (Free, Plus, Ultra).
// Plus e Ultra são comprados com gemas (caros de propósito).
const Passe = (() => {
  const NIVEIS = 30;
  const PONTOS_NIVEL = 60;
  const PRECO = { plus: 600, ultra: 1500 }; // Ultra já inclui o Plus
  const temporadaAtual = () => new Date().toISOString().slice(0, 7); // AAAA-MM

  // recompensa de cada nível em cada trilha
  function recompensa(trilha, n) {
    if (trilha === 'free') {
      if (n % 10 === 0) return { tipo: 'gemas', qtd: 15 };
      if (n % 5 === 0) return { tipo: 'bau', bau: n >= 20 ? 'prata' : 'madeira' };
      return { tipo: 'ouro', qtd: 40 + n * 5 };
    }
    if (trilha === 'plus') {
      if (n % 10 === 0) return { tipo: 'bau', bau: 'ouro' };
      if (n % 3 === 0) return { tipo: 'bau', bau: 'prata' };
      if (n % 5 === 0) return { tipo: 'gemas', qtd: 30 };
      return { tipo: 'ouro', qtd: 120 + n * 10 };
    }
    // ultra
    if (n === NIVEIS) return { tipo: 'carta', raridade: 'lendaria', qtd: 2 };
    if (n % 10 === 0) return { tipo: 'carta', raridade: 'lendaria', qtd: 1 };
    if (n % 5 === 0) return { tipo: 'carta', raridade: 'epica', qtd: 4 };
    if (n % 4 === 0) return { tipo: 'bau', bau: 'ouro' };
    if (n % 2 === 0) return { tipo: 'ouro', qtd: 400 + n * 20 };
    return { tipo: 'gemas', qtd: 20 };
  }

  const icone = (r) => ({ ouro: '🪙', gemas: '💎', bau: '🎁', carta: '🃏' }[r.tipo]);
  function texto(r) {
    if (r.tipo === 'ouro') return `${UI.fmt(r.qtd)} ouro`;
    if (r.tipo === 'gemas') return `${r.qtd} gemas`;
    if (r.tipo === 'bau') return `Baú de ${r.bau}`;
    return `${r.qtd}x ${r.raridade === 'lendaria' ? 'lendária' : 'épica'}`;
  }

  function dados() {
    const d = Estado.d;
    if (!d.passe || d.passe.temporada !== temporadaAtual()) {
      d.passe = { temporada: temporadaAtual(), pontos: 0, plus: false, ultra: false, pegos: { free: [], plus: [], ultra: [] } };
    }
    return d.passe;
  }

  const nivel = () => Math.min(NIVEIS, Math.floor(dados().pontos / PONTOS_NIVEL));
  const temTrilha = (t) => t === 'free' || (t === 'plus' && (dados().plus || dados().ultra)) || (t === 'ultra' && dados().ultra);
  const podePegar = (t, n) => temTrilha(t) && n <= nivel() && !dados().pegos[t].includes(n);
  const pendentes = () => ['free', 'plus', 'ultra'].reduce((s, t) => s + Array.from({ length: NIVEIS }, (_, i) => i + 1).filter((n) => podePegar(t, n)).length, 0);

  function ganharPontos(resultado, coroas) {
    const p = dados();
    const ganho = (resultado === 'vitoria' ? 40 : resultado === 'empate' ? 20 : 15) + coroas * 8;
    const antes = nivel();
    p.pontos = Math.min(NIVEIS * PONTOS_NIVEL, p.pontos + ganho);
    Estado.salvar();
    return { ganho, subiu: nivel() > antes };
  }

  // entrega a recompensa; devolve info para mostrar
  function pegar(t, n) {
    if (!podePegar(t, n)) return null;
    const r = recompensa(t, n);
    const d = Estado.d;
    dados().pegos[t].push(n);
    let extra = null;
    if (r.tipo === 'ouro') d.ouro += r.qtd;
    else if (r.tipo === 'gemas') d.gemas += r.qtd;
    else if (r.tipo === 'bau') extra = { bau: r.bau, abertura: Estado.abrirBau(r.bau) };
    else {
      const lista = Estado.disponiveis().filter((c) => c.raridade === r.raridade);
      const pool = lista.length ? lista : Estado.catalogo().filter((x) => x.raridade === r.raridade);
      const c = pool[Math.floor(Math.random() * pool.length)] || Estado.catalogo()[0];
      const col = d.colecao[c.id];
      if (!col.tem) { col.tem = true; col.copias += r.qtd - 1; } else col.copias += r.qtd;
      extra = { carta: c, qtd: r.qtd };
    }
    Estado.salvar();
    return { r, extra };
  }

  function comprar(tipo) {
    const d = Estado.d;
    const preco = tipo === 'ultra' && dados().plus ? PRECO.ultra - PRECO.plus : PRECO[tipo];
    if (d.gemas < preco) return { ok: false, motivo: `Faltam ${preco - d.gemas} gemas` };
    d.gemas -= preco;
    dados()[tipo] = true;
    Estado.salvar();
    return { ok: true };
  }

  const precoAtual = (tipo) => (tipo === 'ultra' && dados().plus ? PRECO.ultra - PRECO.plus : PRECO[tipo]);
  const diasRestantes = () => {
    const h = new Date();
    const fim = new Date(h.getFullYear(), h.getMonth() + 1, 1);
    return Math.ceil((fim - h) / 86400000);
  };

  return { NIVEIS, PONTOS_NIVEL, PRECO, dados, nivel, recompensa, icone, texto, temTrilha, podePegar, pendentes, ganharPontos, pegar, comprar, precoAtual, diasRestantes };
})();
