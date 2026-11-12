// Títulos do perfil e Cartão de Batalha.
// - Títulos especiais (conquistas, eventos, presentes da criadora) e um título por carta: "Main {carta}"
//   depois de jogar a carta 30 vezes.
// - Cartão de batalha: a carta favorita em destaque, com a moldura da patente da ranqueada em volta.
//   Aparece no perfil e no pareamento da ranqueada (o seu contra o do rival).
const Titulos = (() => {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => UI.fmt(Math.round(n || 0));
  const USOS = 30;
  const ADMIN = 'TxtfHnU2BXbcWpHkOSlDZQRpYNw1';
  const ICONES = ['coroa', 'estrela', 'coracao', 'espadas', 'lanterna', 'flor'];
  const avatarUrl = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : `assets/cartas/${a}_medalhao.png`);
  const uid = () => (typeof Conta !== 'undefined' && Conta.uid ? Conta.uid() : null);
  const D = () => Estado.d;
  const r = () => (typeof Ranque !== 'undefined' ? Ranque.dados() : {});

  // ---------- títulos especiais ----------
  // tem(): já ganhou | prog(): [atual, meta] para mostrar a barra
  const ESPECIAIS = {
    criadora: { nome: 'Criadora do Reino', ic: '👑', raro: 'mitico', como: 'Só a criadora do jogo tem', tem: () => uid() === ADMIN },
    cacador_bugs: { nome: 'Caçador de Bugs', ic: '🐛', raro: 'mitico', como: 'Presente da criadora pra quem caça bugs', tem: () => (D().titulosGanhos || []).includes('cacador_bugs') },
    novato: { nome: 'Novato do Reino', ic: '🌱', como: 'Todo mundo começa aqui', tem: () => true },
    colecionador: { nome: 'Colecionador', ic: '📚', como: 'Tenha 50 cartas', prog: () => [Object.values(D().colecao || {}).filter((c) => c.tem).length, 50] },
    abre_baus: { nome: 'Abridor de Baús', ic: '🎁', como: 'Abra 200 baús', prog: () => [(D().conquistas && D().conquistas.baus) || 0, 200] },
    cacador_trofeus: { nome: 'Caçador de Troféus', ic: '🏆', como: 'Chegue a 3.000 troféus', prog: () => [D().recorde || 0, 3000] },
    imparavel: { nome: 'Imparável', ic: '🔥', raro: 'epico', como: '10 vitórias seguidas na ranqueada', prog: () => [r().maiorSeq || 0, 10] },
    epico: { nome: 'Vitória Épica', ic: '💥', raro: 'epico', como: '10 Vitórias Épicas (3x0) na ranqueada', prog: () => [r().epicasSempre || 0, 10] },
    mestre: { nome: 'Mestre do Ranque', ic: '🏅', raro: 'lendario', como: 'Chegue no Mestre na ranqueada', prog: () => [Math.min(r().melhorSempre || 0, 2400), 2400] },
    lenda_x1: { nome: 'Lenda do X1', ic: '⚔️', raro: 'epico', como: 'Vença 20 X1 com amigos', prog: () => [(D().x1 && D().x1.v) || 0, 20] },
    invocador: { nome: 'Invocador Ultra', ic: '🌀', raro: 'lendario', como: 'Consiga um personagem Ultra no Summon', prog: () => [(D().summon && D().summon.ultras) || 0, 1] },
    farao: { nome: 'Duelista do Faraó', ic: '🃏', raro: 'lendario', como: 'Complete o Duelo do Faraó', tem: () => !!(D().desafios && D().desafios.yugi && D().desafios.yugi.completo) },
    corredor: { nome: 'Mais Rápido do Multiverso', ic: '💨', raro: 'lendario', como: 'Complete a Corrida do Sonic', tem: () => !!(D().desafios && D().desafios.sonic && D().desafios.sonic.completo) },
    mitas: { nome: 'Dentro do Jogo', ic: '🎮', raro: 'lendario', como: 'Consiga as duas Mitas', tem: () => Estado.tem('mita_gentil') && Estado.tem('mita_malvada') },
  };
  const ganhouEspecial = (id) => { const t = ESPECIAIS[id]; if (!t) return false; if (t.tem) return !!t.tem(); const [a, m] = t.prog(); return a >= m; };

  // ---------- títulos por carta ----------
  const nomeCarta = (id) => { const c = Estado.carta(id); return c ? c.nome : id; };
  const tituloCarta = (id) => `Main ${nomeCarta(id)}`;
  function usou(id) {
    const d = D();
    if (!d.usos) d.usos = {};
    const antes = d.usos[id] || 0;
    d.usos[id] = antes + 1;
    if (antes + 1 === USOS) {
      setTimeout(() => UI.toast(`🏷️ Título novo: ${tituloCarta(id)}! Equipe no seu perfil.`), 400);
    }
  }

  // ---------- título atual ----------
  // ids: 'e:<especial>' ou 'c:<carta>'
  function textoDe(tid) {
    if (!tid) return '';
    const [tipo, id] = [tid.slice(0, 1), tid.slice(2)];
    if (tipo === 'e' && ESPECIAIS[id]) return `${ESPECIAIS[id].ic} ${ESPECIAIS[id].nome}`;
    if (tipo === 'c' && Estado.carta(id)) return `⭐ ${tituloCarta(id)}`;
    return '';
  }
  function tem(tid) {
    if (!tid) return false;
    const [tipo, id] = [tid.slice(0, 1), tid.slice(2)];
    if (tipo === 'e') return ganhouEspecial(id);
    return ((D().usos || {})[id] || 0) >= USOS && !!Estado.carta(id);
  }
  const atual = () => (tem(D().titulo) ? D().titulo : 'e:novato');
  const textoAtual = () => textoDe(atual());
  const raroDe = (tid) => (tid && tid.startsWith('e:') && ESPECIAIS[tid.slice(2)] && ESPECIAIS[tid.slice(2)].raro) || (tid && tid.startsWith('c:') ? 'carta' : 'comum');

  // ---------- escolher título ----------
  function escolher(depois) {
    const d = D();
    const esp = Object.entries(ESPECIAIS).map(([id, t]) => {
      const ok = ganhouEspecial(id);
      if (!ok && (id === 'criadora' || id === 'cacador_bugs')) return ''; // os de presente nem aparecem pra quem não tem
      const p = t.prog ? t.prog() : null;
      return `<button class="tt-op r-${t.raro || 'comum'}${ok ? '' : ' bloq'}${atual() === `e:${id}` ? ' usando' : ''}" data-t="e:${id}" ${ok ? '' : 'disabled'}>
        <b>${t.ic} ${esc(t.nome)}</b><small>${esc(t.como)}</small>${!ok && p ? `<i class="tt-barra"><i style="width:${Math.min(100, (p[0] / p[1]) * 100)}%"></i></i><em>${fmt(Math.min(p[0], p[1]))}/${fmt(p[1])}</em>` : ''}</button>`;
    }).join('');
    const usos = d.usos || {};
    const cartas = Object.keys(usos).filter((id) => Estado.carta(id)).sort((a, b) => usos[b] - usos[a]);
    const porCarta = cartas.map((id) => {
      const ok = usos[id] >= USOS;
      return `<button class="tt-op com-img r-carta${ok ? '' : ' bloq'}${atual() === `c:${id}` ? ' usando' : ''}" data-t="c:${id}" ${ok ? '' : 'disabled'}>
        <img src="${Cartas.arte(Estado.carta(id))}" alt="" /><b>⭐ ${esc(tituloCarta(id))}</b>${ok ? '<small>Liberado!</small>' : `<i class="tt-barra"><i style="width:${(usos[id] / USOS) * 100}%"></i></i><em>${usos[id]}/${USOS} usos</em>`}</button>`;
    }).join('');
    const md = UI.modal({
      titulo: '🏷️ Títulos',
      classe: 'modal-titulos',
      html: `<p class="tt-txt">O título aparece no seu perfil e no seu cartão de batalha. Jogue uma carta <b>${USOS} vezes</b> pra ganhar o título dela!</p>
        <div class="tt-sec">Especiais</div><div class="tt-lista">${esp}</div>
        <div class="tt-sec">Das cartas</div><div class="tt-lista">${porCarta || '<p class="tt-txt">Jogue suas cartas nas batalhas pra começar a liberar títulos!</p>'}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
    md.el.querySelectorAll('.tt-op:not(.bloq)').forEach((b) => (b.onclick = () => {
      d.titulo = b.dataset.t; Estado.salvar();
      md.el.querySelectorAll('.tt-op').forEach((x) => x.classList.toggle('usando', x === b));
      UI.toast(`Título: ${textoDe(d.titulo)}`);
      if (depois) depois();
    }));
  }

  // ---------- carta favorita ----------
  function favorita() {
    const d = D();
    if (d.favorita && Estado.tem(d.favorita) && Estado.carta(d.favorita)) return d.favorita;
    const usos = d.usos || {};
    const mais = Object.keys(usos).filter((id) => Estado.tem(id)).sort((a, b) => usos[b] - usos[a])[0];
    return mais || (d.deck || [])[0] || null;
  }
  function escolherFavorita(depois) {
    const d = D();
    const minhas = Estado.catalogo().filter((c) => Estado.tem(c.id) && !c.token)
      .sort((a, b) => ['ultra', 'lendaria', 'epica', 'rara', 'comum'].indexOf(a.raridade) - ['ultra', 'lendaria', 'epica', 'rara', 'comum'].indexOf(b.raridade));
    const md = UI.modal({
      titulo: '⭐ Carta favorita',
      classe: 'modal-favorita',
      html: `<p class="tt-txt">Ela aparece grandona no seu cartão de batalha.</p><div class="fav-grade">${minhas.map((c) => `<button class="fav-op${favorita() === c.id ? ' usando' : ''}" data-id="${c.id}">${Cartas.html(c, { mini: true })}</button>`).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
    md.el.querySelectorAll('.fav-op').forEach((b) => (b.onclick = () => {
      d.favorita = b.dataset.id; Estado.salvar();
      md.el.querySelectorAll('.fav-op').forEach((x) => x.classList.toggle('usando', x === b));
      if (depois) depois();
    }));
  }

  // ---------- cartão de batalha ----------
  // p = { nome, estilo, avatar, titulo (texto), raroTitulo, favorita, pts (PR), trofeus, nivel, cla, eu }
  function cartao(p, { tam = 'grande', lado = '' } = {}) {
    const f = Ranque.info(p.pts || 0), pat = f.p;
    const c = p.favorita && Estado.carta(p.favorita);
    const ultra = c && c.raridade === 'ultra';
    const nome = typeof Passe !== 'undefined' && Passe.nomeHtml ? Passe.nomeHtml(p.nome || 'Jogador', p.estilo) : esc(p.nome || 'Jogador');
    const arte = c ? (c.video ? `<video src="assets/cartas/${c.video}" poster="${Cartas.arte(c)}" autoplay muted loop playsinline preload="auto"></video>` : `<img src="${Cartas.arte(c)}" alt="" draggable="false" />`) : '<div class="cb-vazio">?</div>';
    return `<div class="cartao-batalha ${tam} t${f.i}${ultra ? ' fav-ultra' : ''}${lado ? ` ${lado}` : ''}" style="--cor:${pat.cor};--escura:${pat.escura}">
      <div class="cb-moldura"></div>
      <div class="cb-dentro">
        <div class="cb-arte">${arte}${ultra ? '<video class="cb-ultra" src="assets/ui/moldura_ultra.mp4" autoplay muted loop playsinline preload="auto"></video>' : ''}<i class="cb-reflexo"></i></div>
        <div class="cb-topo"><span class="cb-av"><img src="${avatarUrl(p.avatar)}" alt="" /><em>${p.nivel || 1}</em></span>
          <span class="cb-emb"><img src="${Ranque.img(f.i, true)}" alt="" /></span></div>
        ${c ? `<span class="cb-fav ${c.raridade}">${esc(c.nome)}</span>` : ''}
        <div class="cb-base">
          ${p.titulo ? `<span class="cb-titulo r-${p.raroTitulo || 'comum'}">${esc(p.titulo)}</span>` : ''}
          <b class="cb-nome">${nome}</b>
          <div class="cb-stats"><span>🏆 ${fmt(p.trofeus)}</span><span class="cb-pat">${esc(f.nome)}</span></div>
          ${p.cla ? `<small class="cb-cla">🛡️ ${esc(p.cla)}</small>` : ''}
        </div>
      </div>
    </div>`;
  }
  // o meu cartão
  function meuCartao(opc = {}) {
    const d = D();
    return cartao({ nome: d.nome, estilo: typeof Passe !== 'undefined' && Passe.estiloNome ? Passe.estiloNome() : '', avatar: d.avatar, titulo: textoAtual(), raroTitulo: raroDe(atual()),
      favorita: favorita(), pts: r().pts || 0, trofeus: d.trofeus, nivel: d.nivel, cla: d.cla && d.cla.nome, eu: true }, opc);
  }
  // cartão de um bot da ranqueada (fica igual durante a partida: sorteia uma vez e guarda no bot)
  const TITULOS_BOT = ['imparavel', 'epico', 'colecionador', 'abre_baus', 'cacador_trofeus', 'lenda_x1', 'novato', 'invocador', 'corredor', 'farao'];
  function cartaoBot(b, opc = {}) {
    if (!b.cartao) {
      const pool = Estado.catalogo().filter((c) => !c.token && !c.feitico && !c.barril && ['lendaria', 'epica', 'ultra'].includes(c.raridade));
      const fav = pool[Math.floor(Math.random() * pool.length)];
      const porCarta = Math.random() < 0.5 && fav;
      const tid = porCarta ? `c:${fav.id}` : `e:${TITULOS_BOT[Math.floor(Math.random() * TITULOS_BOT.length)]}`;
      const info = Ranque.info(b.pts || 0);
      b.cartao = { favorita: fav && fav.id, titulo: porCarta ? `⭐ ${tituloCarta(fav.id)}` : textoDe(tid), raroTitulo: raroDe(tid),
        nivel: Math.max(1, Math.min(60, 8 + info.i * 5 + Math.floor(Math.random() * 6))), trofeus: Math.round(300 + (b.pts || 0) * 1.1 + Math.random() * 400) };
    }
    return cartao({ nome: b.nome, avatar: b.avatar, pts: b.pts, ...b.cartao }, opc);
  }

  // ---------- presentes de título ----------
  function dar(id) {
    const d = D();
    d.titulosGanhos = [...new Set([...(d.titulosGanhos || []), id])];
    Estado.salvar();
  }

  return { usou, escolher, escolherFavorita, favorita, textoAtual, textoDe, atual, raroDe, cartao, meuCartao, cartaoBot, dar, tituloCarta, USOS, ESPECIAIS };
})();
