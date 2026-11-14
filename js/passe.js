// Passe da temporada: 60 níveis por semana (acaba todo domingo às 15:00, junto com a ranqueada), três trilhas (Free, Plus, Ultra).
// Plus e Ultra são comprados com gemas (caros de propósito).
const Passe = (() => {
  const NIVEIS = 60;
  const PONTOS_NIVEL = 30; // era 55 no passe mensal; semanal precisa de menos pontos por nível
  const PONTOS_NIVEL_ANTIGO = 55;
  const PRECO = { plus: 600, ultra: 1500 }; // Ultra já inclui o Plus
  // Temporada semanal: acaba todo domingo às 15:00 (horário do aparelho). A primeira acaba em 15/11.
  const PRIMEIRO_FIM = new Date(2026, 10, 15, 15, 0, 0).getTime();
  function fimTemporada(agora = Date.now()) {
    if (agora < PRIMEIRO_FIM) return new Date(PRIMEIRO_FIM);
    const d = new Date(agora);
    d.setHours(15, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); // próximo domingo
    if (d.getTime() <= agora) d.setDate(d.getDate() + 7);
    return d;
  }
  const idDe = (f) => `p${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  const temporadaAtual = () => idDe(fimTemporada());
  const mesDe = (t) => String(t).replace(/^p/, '').slice(0, 7); // AAAA-MM
  const FIM_MES_PAGO = new Date(2026, 10, 30, 23, 59, 59).getTime(); // quem comprou Plus/Ultra no passe mensal de novembro mantém até aqui

  // recompensa de cada nível em cada trilha (bem variada: ouro, gemas, baús, cartas, coringas e tokens)
  function base(trilha, n) {
    const C = (raridade, qtd) => ({ tipo: 'coringa', raridade, qtd });
    if (trilha === 'free') {
      if (n === NIVEIS) return C('epica', 6);
      if (n % 20 === 0) return C('universal', 4);
      if (n % 15 === 0) return { tipo: 'gemas', qtd: 40 };
      if (n % 10 === 0) return { tipo: 'bau', bau: n >= 40 ? 'ouro' : 'prata' };
      if (n % 5 === 0) return { tipo: 'bau', bau: 'madeira' };
      return [
        { tipo: 'ouro', qtd: 50 + n * 4 }, C('comum', 6 + Math.floor(n / 6)), { tipo: 'tokens', qtd: 15 + Math.floor(n / 4) },
        { tipo: 'gemas', qtd: 6 }, C('rara', 2 + Math.floor(n / 15)), { tipo: 'ouro', qtd: 80 + n * 6 },
      ][n % 6];
    }
    if (trilha === 'plus') {
      if (n === NIVEIS) return { tipo: 'carta', raridade: 'lendaria', qtd: 1 };
      if (n % 25 === 0) return C('lendaria', 1);
      if (n % 12 === 0) return C('epica', 4);
      if (n % 10 === 0) return { tipo: 'bau', bau: 'ouro' };
      if (n % 4 === 0) return n % 8 === 0 ? { tipo: 'bau', bau: 'prata' } : { tipo: 'gemas', qtd: 60 };
      return [
        { tipo: 'ouro', qtd: 150 + n * 8 }, C('rara', 4 + Math.floor(n / 10)), { tipo: 'gemas', qtd: 75 },
        C('comum', 15 + Math.floor(n / 4)), { tipo: 'gemas', qtd: 60 }, { tipo: 'carta', raridade: 'epica', qtd: 1 },
      ][n % 6];
    }
    // ultra
    if (n === NIVEIS) return { tipo: 'bau', bau: 'lendario' };
    if (n === 30) return { tipo: 'bau', bau: 'lendario' };
    if (n % 15 === 0) return C('lendaria', 2);
    if (n % 10 === 0) return { tipo: 'carta', raridade: 'lendaria', qtd: 1 };
    if (n % 7 === 0) return { tipo: 'bau', bau: 'ouro' };
    return [
      { tipo: 'gemas', qtd: 150 }, C('epica', 2 + Math.floor(n / 20)), { tipo: 'ouro', qtd: 500 + n * 25 },
      C('universal', 5), { tipo: 'gemas', qtd: 100 }, { tipo: 'carta', raridade: 'epica', qtd: 3 },
    ][n % 6];
  }

  // recompensas em dobro (+100%): quantidades x2 e baús um nível acima (madeira→prata→ouro)
  const BAU_ACIMA = { madeira: 'prata', prata: 'ouro' };
  function recompensa(trilha, n) {
    const r = base(trilha, n);
    if (r.tipo === 'bau') return BAU_ACIMA[r.bau] ? { ...r, bau: BAU_ACIMA[r.bau] } : r;
    return r.qtd ? { ...r, qtd: r.qtd * 2 } : r;
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

  const icone = (r) => Premios.icone(r);
  const texto = (r) => Premios.texto(r);

  // Passes de presente da criadora: { uid: ['AAAA-MM', ...] } (temporadas em que a conta ganha o Ultra)
  const PRESENTES_ULTRA = {
    ZwrffaFMcidTzZAGCMJNXOtuuOh2: ['2026-11'], // Artx
    EwnFPrCPFUMawnc6dttsQQ98yII2: ['2026-11'], // Enzo
    twJXL5kpGtUVwrx7Br3xCq26ZDG3: ['2026-11'], // Samuel
    isCCpwfJROP1drLa4oLtmEiYVKi1: ['2026-11'], // Ovos Mexidos
  };

  function dados() {
    const d = Estado.d;
    const atual = temporadaAtual();
    if (!d.passe || d.passe.temporada !== atual) {
      const v = d.passe;
      let novo = { temporada: atual, pontos: 0, plus: false, ultra: false, pegos: { free: [], plus: [], ultra: [] } };
      const levaPasse = () => { novo.plus = !!v.plus; novo.ultra = !!v.ultra; novo.legado = true; novo.presenteUltra = !!v.presenteUltra; };
      if (v && /^\d{4}-\d{2}$/.test(v.temporada)) {
        // passe mensal antigo vira semanal: quem não terminou continua de onde parou; quem terminou começa um novo já
        if ((v.pontos || 0) < NIVEIS * PONTOS_NIVEL_ANTIGO) novo = { ...v, temporada: atual, legado: true };
        else levaPasse();
      } else if (v && v.legado && fimTemporada().getTime() <= FIM_MES_PAGO) levaPasse(); // Plus/Ultra pagos em novembro valem até o fim do mês
      d.passe = novo;
    }
    const meu = typeof Conta !== 'undefined' && Conta.uid ? Conta.uid() : null;
    if (meu && !d.passe.presenteUltra && (PRESENTES_ULTRA[meu] || []).includes(mesDe(d.passe.temporada))) {
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
    const extra = Premios.dar(r);
    Estado.salvar();
    return { r, extra };
  }

  // Carta exclusiva de quem COMPRA o Ultra, uma por passe. O passe de 15/11 (o atual) não tem; esta começa em 22/11.
  const CARTAS_ULTRA = { 'p2026-11-22': 'gohan_mirai' };
  const cartaUltraDaTemporada = () => { const id = CARTAS_ULTRA[dados().temporada]; return id ? Estado.carta(id) || null : null; };
  function entregarCartaUltra() {
    const p = dados(), d = Estado.d, id = CARTAS_ULTRA[p.temporada];
    if (!id || p.cartaUltraDada) return null;
    const c = Estado.carta(id);
    if (!c) return null;
    d.cartasExtras = [...new Set([...(d.cartasExtras || []), id])];
    const col = d.colecao[id];
    d.colecao[id] = { nivel: Math.max((col && col.nivel) || 1, c.nivelInicial || 6), copias: (col && col.copias) || 0, tem: true, z: (col && col.z) || 0 };
    p.cartaUltraDada = true;
    Estado.recarregarCatalogo();
    return c;
  }

  function comprar(tipo) {
    const d = Estado.d;
    const preco = tipo === 'ultra' && dados().plus ? PRECO.ultra - PRECO.plus : PRECO[tipo];
    if (d.gemas < preco) return { ok: false, motivo: `Faltam ${preco - d.gemas} gemas` };
    d.gemas -= preco;
    dados()[tipo] = true;
    const carta = tipo === 'ultra' ? entregarCartaUltra() : null;
    Estado.salvar();
    return { ok: true, carta };
  }

  const precoAtual = (tipo) => (tipo === 'ultra' && dados().plus ? PRECO.ultra - PRECO.plus : PRECO[tipo]);
  const diasRestantes = () => Math.max(1, Math.ceil((fimTemporada().getTime() - Date.now()) / 86400000));
  const tempoRestante = () => {
    const ms = Math.max(0, fimTemporada().getTime() - Date.now());
    const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  };

  return { ESTILOS_NOME, podeEstilo, estiloNome, escolherEstilo, nomeHtml, NIVEIS, PONTOS_NIVEL, PRECO, dados, nivel, recompensa, icone, texto, temTrilha, podePegar, pendentes, ganharPontos, pegar, comprar, precoAtual, diasRestantes, tempoRestante, fimTemporada, cartaUltraDaTemporada };
})();
