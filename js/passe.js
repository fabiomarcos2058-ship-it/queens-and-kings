// Passe da temporada: 60 níveis por mês, três trilhas (Free, Plus, Ultra).
// Plus e Ultra são comprados com gemas (caros de propósito).
const Passe = (() => {
  const NIVEIS = 60;
  const PONTOS_NIVEL = 55;
  const PRECO = { plus: 600, ultra: 1500 }; // Ultra já inclui o Plus
  const temporadaAtual = () => new Date().toISOString().slice(0, 7); // AAAA-MM

  // recompensa de cada nível em cada trilha (melhorada)
  function recompensa(trilha, n) {
    if (trilha === 'free') {
      if (n === NIVEIS) return { tipo: 'carta', raridade: 'epica', qtd: 2 };
      if (n % 15 === 0) return { tipo: 'gemas', qtd: 40 };
      if (n % 10 === 0) return { tipo: 'bau', bau: n >= 40 ? 'ouro' : 'prata' };
      if (n % 5 === 0) return { tipo: 'bau', bau: 'madeira' };
      if (n % 3 === 0) return { tipo: 'ouro', qtd: 80 + n * 6 };
      return { tipo: 'ouro', qtd: 50 + n * 4 };
    }
    if (trilha === 'plus') {
      if (n === NIVEIS) return { tipo: 'carta', raridade: 'lendaria', qtd: 1 };
      if (n % 12 === 0) return { tipo: 'carta', raridade: 'epica', qtd: 3 };
      if (n % 10 === 0) return { tipo: 'bau', bau: 'ouro' };
      if (n % 6 === 0) return { tipo: 'gemas', qtd: 50 };
      if (n % 4 === 0) return { tipo: 'bau', bau: 'prata' };
      if (n % 3 === 0) return { tipo: 'ouro', qtd: 220 + n * 12 };
      return { tipo: 'ouro', qtd: 150 + n * 8 };
    }
    // ultra
    if (n === NIVEIS) return { tipo: 'carta', raridade: 'lendaria', qtd: 3 };
    if (n % 15 === 0) return { tipo: 'carta', raridade: 'lendaria', qtd: 1 };
    if (n % 10 === 0) return { tipo: 'carta', raridade: 'epica', qtd: 5 };
    if (n % 7 === 0) return { tipo: 'bau', bau: 'ouro' };
    if (n % 5 === 0) return { tipo: 'gemas', qtd: 60 };
    if (n % 3 === 0) return { tipo: 'ouro', qtd: 500 + n * 25 };
    return { tipo: 'gemas', qtd: 25 + Math.floor(n / 4) };
  }

  // Estilos de nome: quem tem o Passe Plus ou Ultra escolhe; os animados são só do Ultra.
  const ESTILOS_NOME = {
    rosa: { nome: 'Rosa', tipo: 'Cor' }, ouro: { nome: 'Ouro', tipo: 'Cor' }, ciano: { nome: 'Ciano', tipo: 'Cor' },
    menta: { nome: 'Menta', tipo: 'Cor' }, lilas: { nome: 'Lilás', tipo: 'Cor' }, rubi: { nome: 'Rubi', tipo: 'Cor' },
    'por-do-sol': { nome: 'Pôr do sol', tipo: 'Gradiente' }, oceano: { nome: 'Oceano', tipo: 'Gradiente' },
    'algodao-doce': { nome: 'Algodão-doce', tipo: 'Gradiente' }, aurora: { nome: 'Aurora', tipo: 'Gradiente' },
    sakura: { nome: 'Sakura', tipo: 'Gradiente' }, fogo: { nome: 'Fogo', tipo: 'Gradiente' },
    'arco-iris': { nome: 'Arco-íris', tipo: 'Animado', ultra: true }, galaxia: { nome: 'Galáxia', tipo: 'Animado', ultra: true },
    'ouro-real': { nome: 'Ouro real', tipo: 'Animado', ultra: true }, 'coracao-neon': { nome: 'Neon', tipo: 'Animado', ultra: true },
  };
  const podeEstilo = (id) => !!ESTILOS_NOME[id] && temTrilha(ESTILOS_NOME[id].ultra ? 'ultra' : 'plus');
  // estilo que vale agora (se o passe acabar, o nome volta ao normal)
  const estiloNome = () => (podeEstilo(Estado.d.estiloNome) ? Estado.d.estiloNome : '');
  function escolherEstilo(id) {
    if (id && !podeEstilo(id)) return false;
    Estado.d.estiloNome = id || '';
    Estado.salvar();
    return true;
  }
  const escNome = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // nome com o estilo (o estilo vem de dados públicos, então só aceita os da lista)
  const nomeHtml = (nome, estilo) => (ESTILOS_NOME[estilo] ? `<span class="nome-estilo nc-${estilo}">${escNome(nome)}</span>` : escNome(nome));

  const icone = (r) => ({ ouro: '🪙', gemas: '💎', bau: '🎁', carta: '🃏' }[r.tipo]);
  function texto(r) {
    if (r.tipo === 'ouro') return `${UI.fmt(r.qtd)} ouro`;
    if (r.tipo === 'gemas') return `${r.qtd} gemas`;
    if (r.tipo === 'bau') return `Baú de ${r.bau}`;
    return `${r.qtd}x ${r.raridade === 'lendaria' ? 'lendária' : 'épica'}`;
  }

  // Passes de presente da criadora: { uid: ['AAAA-MM', ...] } (temporadas em que a conta ganha o Ultra)
  const PRESENTES_ULTRA = {
    ZwrffaFMcidTzZAGCMJNXOtuuOh2: ['2026-11'], // Artx
    EwnFPrCPFUMawnc6dttsQQ98yII2: ['2026-11'], // Enzo
    twJXL5kpGtUVwrx7Br3xCq26ZDG3: ['2026-11'], // Samuel
  };

  function dados() {
    const d = Estado.d;
    if (!d.passe || d.passe.temporada !== temporadaAtual()) {
      d.passe = { temporada: temporadaAtual(), pontos: 0, plus: false, ultra: false, pegos: { free: [], plus: [], ultra: [] } };
    }
    const meu = typeof Conta !== 'undefined' && Conta.uid ? Conta.uid() : null;
    if (meu && !d.passe.presenteUltra && (PRESENTES_ULTRA[meu] || []).includes(d.passe.temporada)) {
      d.passe.ultra = true;
      d.passe.presenteUltra = true;
      Estado.salvar();
      setTimeout(() => UI.modal({
        titulo: '🎁 Presente!',
        html: '<p style="font-size:40px;margin:4px 0">🎟️👑</p><p>A criadora do jogo te deu o <b>Passe Ultra</b> desta temporada!</p><p class="aviso">Vá em Eventos → Passe para pegar suas recompensas.</p>',
        botoes: [{ texto: 'Obrigado! 💜', classe: 'principal' }],
      }), 1200);
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

  return { ESTILOS_NOME, podeEstilo, estiloNome, escolherEstilo, nomeHtml, NIVEIS, PONTOS_NIVEL, PRECO, dados, nivel, recompensa, icone, texto, temTrilha, podePegar, pendentes, ganharPontos, pegar, comprar, precoAtual, diasRestantes };
})();
