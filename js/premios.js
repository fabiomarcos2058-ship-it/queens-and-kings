// Prêmios dos passes (Passe da Temporada e Pro Pass): entregar, ícone e texto.
// Tipos: ouro, gemas, bau, carta (cópias de uma carta sua da raridade), coringa, tokens, evolucao.
const Premios = (() => {
  const NOME_RAR = { comum: 'comum', rara: 'rara', epica: 'épica', lendaria: 'lendária', ultra: 'ultra' };
  const NOME_BAU = { madeira: 'madeira', prata: 'prata', ouro: 'ouro', lendario: 'Lendário' };

  function texto(r) {
    if (r.tipo === 'ouro') return `${UI.fmt(r.qtd)} ouro`;
    if (r.tipo === 'gemas') return `${r.qtd} gemas`;
    if (r.tipo === 'tokens') return `${r.qtd} tokens`;
    if (r.tipo === 'bau') return r.bau === 'lendario' ? 'Baú Lendário' : `Baú de ${NOME_BAU[r.bau] || r.bau}`;
    if (r.tipo === 'coringa') return `${r.qtd}x Coringa ${r.raridade === 'universal' ? 'Universal' : NOME_RAR[r.raridade]}`;
    if (r.tipo === 'evolucao') return r.nome || 'Evolução';
    return `${r.qtd}x carta ${NOME_RAR[r.raridade] || ''}`;
  }
  // imagem do prêmio (bem mais bonita que um emoji)
  function icone(r) {
    if (r.tipo === 'ouro') return `<img src="assets/ui/${r.qtd >= 1500 ? 'ouro_3' : r.qtd >= 500 ? 'ouro_2' : 'moeda'}.svg" alt="" />`;
    if (r.tipo === 'gemas') return `<i class="ic-gema premio-gema${r.qtd >= 40 ? ' muitas' : ''}"></i>`;
    if (r.tipo === 'tokens') return '<img src="assets/ui/token.svg" alt="" />';
    if (r.tipo === 'bau') return `<img src="assets/ui/bau_${r.bau}.svg" alt="" />`;
    if (r.tipo === 'coringa') return `<img src="assets/ui/coringa_${r.raridade}.svg" alt="" />`;
    if (r.tipo === 'evolucao') return '<span class="premio-emoji">🧬</span>';
    return `<span class="premio-carta r-${r.raridade}"><b>?</b></span>`;
  }
  // classe de cor do quadradinho
  const classe = (r) => `t-${r.tipo}${r.raridade ? ` r-${r.raridade}` : ''}${r.bau ? ` b-${r.bau}` : ''}`;

  // entrega o prêmio; devolve { extra } para o menu mostrar
  function dar(r) {
    const d = Estado.d;
    let extra = null;
    if (r.tipo === 'ouro') d.ouro += r.qtd;
    else if (r.tipo === 'gemas') d.gemas += r.qtd;
    else if (r.tipo === 'tokens') d.tokens = (d.tokens || 0) + r.qtd;
    else if (r.tipo === 'coringa') { Estado.darCoringa(r.raridade, r.qtd); extra = { coringa: r }; }
    else if (r.tipo === 'bau') extra = { bau: r.bau, abertura: Estado.abrirBau(r.bau) };
    else if (r.tipo === 'carta') {
      // cópias de uma carta sua que ainda pode subir; se não tiver nenhuma, vira coringa da raridade
      const pool = Estado.disponiveis().filter((c) => c.raridade === r.raridade && Estado.tem(c.id) && !Estado.maxada(c.id));
      if (!pool.length) { Estado.darCoringa(r.raridade, r.qtd); extra = { coringa: { tipo: 'coringa', raridade: r.raridade, qtd: r.qtd } }; }
      else {
        const c = pool[Math.floor(Math.random() * pool.length)];
        d.colecao[c.id].copias += r.qtd;
        extra = { carta: c, qtd: r.qtd };
      }
    }
    Estado.salvar();
    return extra;
  }
  // aviso depois de pegar (o baú e a evolução têm tela própria)
  function avisar(r, extra) {
    if (extra && extra.carta && extra.qtd) UI.toast(`🃏 +${extra.qtd} ${extra.carta.nome}!`);
    else if (extra && extra.coringa) UI.toast(`🃏 +${texto(extra.coringa)} (veja no 🎒 Inventário)`);
    else if (r.tipo === 'tokens') UI.toast(`+${r.qtd} tokens 🪙 (troque por gemas nos Eventos)`);
    else UI.toast(`+ ${texto(r)}!`);
  }

  return { dar, texto, icone, classe, avisar };
})();
