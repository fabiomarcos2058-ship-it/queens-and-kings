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
    defensor: { nome: 'Defensor do Reino', ic: '🏰', raro: 'lendario', como: 'Vença as 20 ondas da Defesa do Reino sozinho', tem: () => (D().titulosGanhos || []).includes('defensor') },
    dupla_defesa: { nome: 'Dupla Imbatível', ic: '🤝', raro: 'lendario', como: 'Vença as 20 ondas da Defesa do Reino em dupla', tem: () => (D().titulosGanhos || []).includes('dupla_defesa') },
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

  // ---------- molduras da ranqueada (uma por patente, estilo cartão de batalha) ----------
  // a, b, c = claro, médio, escuro do material; tudo desenhado em SVG (viewBox 300x425)
  const MOLD = [
    { a: '#E8C08A', b: '#B07A42', c: '#5E3A18' }, // papelão
    { a: '#F0A070', b: '#B5521F', c: '#4A1E0C' }, // ferrugem
    { a: '#F2F5F9', b: '#97A3B3', c: '#2E3540' }, // ferro
    { a: '#FFD2A0', b: '#C2702E', c: '#55280C' }, // bronze
    { a: '#FFFFFF', b: '#B7C8E4', c: '#45577E' }, // prata
    { a: '#FFF6C0', b: '#FFC21A', c: '#7A4204' }, // ouro
    { a: '#EFFFFF', b: '#4FD8E2', c: '#0E5560' }, // platina
    { a: '#F4FAFF', b: '#78BEFF', c: '#22348C' }, // diamante
    { a: '#F3E0FF', b: '#A45CFF', c: '#3A1270' }, // mestre
    { a: '#FFE8F3', b: '#FF5CA8', c: '#6E0E3A' }, // mestre pro
  ];
  let idMold = 0;
  function moldura(i) {
    const m = MOLD[i] || MOLD[0], k = `m${++idMold}`, ouro = '#FFD25E';
    const fora = 'M26 14 H274 Q296 14 296 36 V399 Q296 421 274 421 H26 Q4 421 4 399 V36 Q4 14 26 14 Z';
    const dentro = 'M30 27 H270 Q283 27 283 40 V395 Q283 408 270 408 H30 Q17 408 17 395 V40 Q17 27 30 27 Z';
    const cantos = [[14, 24], [286, 24], [14, 411], [286, 411]];
    let extra = '', atras = '';
    // enfeites de cada patente
    if (i === 0) { // papelão: ondulado e fita adesiva
      extra += `<path d="${fora}" fill="none" stroke="${m.c}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 5" transform="translate(150 217.5) scale(.975) translate(-150 -217.5)"/>`;
      extra += [[-38, 22, 30], [38, 278, 30], [38, 22, 405], [-38, 278, 405]].map(([r, x, y]) => `<rect x="${x - 22}" y="${y - 7}" width="44" height="14" fill="#F3E2B8" fill-opacity=".85" stroke="#C9A86A" stroke-width="1" transform="rotate(${r} ${x} ${y})"/>`).join('');
    }
    if (i === 1) { // ferrugem: manchas e um rasgo
      extra += [[30, 90, 7], [272, 140, 9], [20, 300, 6], [280, 330, 8], [120, 414, 6], [210, 20, 5], [12, 200, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#5A1E06" fill-opacity=".55"/><circle cx="${x + 2}" cy="${y - 1}" r="${r * 0.5}" fill="#E08A4A" fill-opacity=".6"/>`).join('');
      extra += `<path d="M287 210 l-6 10 l5 6 l-7 12" fill="none" stroke="#2A0E04" stroke-width="2.5"/>`;
    }
    if (i >= 2 && i <= 4) { // rebites
      const reb = [...cantos, [150, 414], [10, 217], [290, 217]];
      extra += reb.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#${k}r)" stroke="${m.c}" stroke-width="1.5"/>`).join('');
    }
    if (i >= 4 && i <= 5) { // asinhas ao lado do brasão
      const asa = (s) => `<path d="M${150 + s * 40} 30 q${s * 30} -22 ${s * 62} -14 q${-s * 14} 6 ${-s * 20} 12 q${s * 18} 0 ${s * 26} 6 q${-s * 22} 8 ${-s * 34} 8 q${s * 10} 4 ${s * 12} 10 q${-s * 26} 2 ${-s * 46} -10 Z" fill="url(#${k}g)" stroke="${m.c}" stroke-width="2"/>`;
      atras += `<g transform="translate(0 -6)">${asa(-1) + asa(1)}</g>`;
    }
    if (i === 5) { // ouro: rubis nos cantos
      extra += cantos.map(([x, y]) => `<path d="M${x} ${y - 9} L${x + 8} ${y} L${x} ${y + 9} L${x - 8} ${y} Z" fill="#E8304A" stroke="#7A0010" stroke-width="1.5"/><path d="M${x} ${y - 6} L${x + 3} ${y - 1} L${x - 2} ${y - 1} Z" fill="#fff" fill-opacity=".8"/>`).join('');
    }
    if (i === 6 || i === 7) { // cristais saindo dos cantos
      const g = i === 7 ? 1.35 : 1;
      extra += cantos.map(([x, y], n) => {
        const sx = n % 2 ? 1 : -1, sy = n < 2 ? -1 : 1;
        return `<g class="cb-cristal" transform="translate(${x} ${y}) scale(${sx * g} ${sy * g})"><path d="M0 0 L10 -4 L6 -22 Z" fill="url(#${k}c)" stroke="${m.c}" stroke-width="1.2"/><path d="M0 0 L-4 10 L-20 6 Z" fill="url(#${k}c)" stroke="${m.c}" stroke-width="1.2"/><path d="M0 0 L8 6 L20 -2 L12 -14 Z" fill="${m.a}" fill-opacity=".9" stroke="${m.c}" stroke-width="1.2"/></g>`;
      }).join('');
      if (i === 7) extra += `<path d="M17 120 L283 120 M17 315 L283 315" stroke="${m.a}" stroke-opacity=".0"/>`;
    }
    if (i === 8) { // mestre: chifres no brasão e chamas em cima
      atras += `<g class="cb-chamas">${[-1, 1].map((s) => `<path d="M${150 + s * 36} 40 q${s * 10} -30 ${s * 44} -36 q${-s * 16} 16 ${-s * 10} 30 q${s * 14} -6 ${s * 24} -2 q${-s * 22} 10 ${-s * 30} 24 Z" fill="url(#${k}f)"/>`).join('')}</g>`;
      atras += [-1, 1].map((s) => `<path d="M${150 + s * 30} 22 q${s * 22} -10 ${s * 30} -22 q${s * 2} 18 ${-s * 14} 34 Z" fill="url(#${k}g)" stroke="${m.c}" stroke-width="2"/>`).join('');
      extra += cantos.map(([x, y], n) => `<path d="M${x} ${y} l${n % 2 ? 9 : -9} ${n < 2 ? -9 : 9}" stroke="${m.a}" stroke-width="4" stroke-linecap="round"/>`).join('');
    }
    if (i === 9) { // mestre pro: asas douradas grandes, coroa e raios
      atras += `<g class="cb-raios-pro"><circle cx="150" cy="14" r="62" fill="url(#${k}rp)"/></g>`;
      const asa = (s) => `<path d="M${150 + s * 34} 44 q${s * 40} -50 ${s * 110} -38 q${-s * 18} 10 ${-s * 26} 18 q${s * 26} -2 ${s * 40} 6 q${-s * 22} 10 ${-s * 36} 12 q${s * 20} 4 ${s * 26} 12 q${-s * 34} 8 ${-s * 64} 0 q${s * 6} 6 ${s * 4} 12 q${-s * 30} -6 ${-s * 54} -22 Z" fill="url(#${k}o)" stroke="#7A4204" stroke-width="2"/>`;
      atras += `<g transform="translate(150 20) scale(.9 .62) translate(-150 -44)">${asa(-1) + asa(1)}</g>`;
      extra += cantos.map(([x, y]) => `<path d="M${x} ${y - 10} L${x + 9} ${y} L${x} ${y + 10} L${x - 9} ${y} Z" fill="${m.b}" stroke="${ouro}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" fill="#fff"/>`).join('');
    }
    // brasão no topo (segura o emblema da patente)
    const brasao = i >= 8
      ? 'M150 -2 L196 10 L204 46 L150 84 L96 46 L104 10 Z'
      : i >= 5 ? 'M150 0 L192 12 L198 44 L150 78 L102 44 L108 12 Z'
      : 'M150 2 L188 12 L192 42 L150 72 L108 42 L112 12 Z';
    const coroa = i === 9 ? `<path d="M128 6 L134 -12 L142 0 L150 -16 L158 0 L166 -12 L172 6 Z" fill="url(#${k}o)" stroke="#7A4204" stroke-width="1.8"/><circle cx="150" cy="-12" r="3" fill="#FF5CA8"/>` : '';
    const borda = i === 9 ? ouro : m.a;
    return `<svg class="cb-frame" viewBox="0 -20 300 445" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.a}"/><stop offset=".3" stop-color="${m.b}"/><stop offset=".55" stop-color="${m.c}"/><stop offset=".8" stop-color="${m.b}"/><stop offset="1" stop-color="${m.a}"/></linearGradient>
        <linearGradient id="${k}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${m.b}"/><stop offset="1" stop-color="${m.c}"/></linearGradient>
        <linearGradient id="${k}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6C0"/><stop offset=".5" stop-color="${ouro}"/><stop offset="1" stop-color="#B86A00"/></linearGradient>
        <linearGradient id="${k}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7A1FD0"/><stop offset=".6" stop-color="#C77CFF"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <radialGradient id="${k}r" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${m.b}"/><stop offset="1" stop-color="${m.c}"/></radialGradient>
        <radialGradient id="${k}rp"><stop offset="0" stop-color="#FFE45C" stop-opacity=".9"/><stop offset=".6" stop-color="#FF5CA8" stop-opacity=".35"/><stop offset="1" stop-color="#FF5CA8" stop-opacity="0"/></radialGradient>
      </defs>
      ${atras}
      <path d="${fora} ${dentro}" fill-rule="evenodd" fill="url(#${k}g)" stroke="${m.c}" stroke-width="3"/>
      <path d="${dentro}" fill="none" stroke="${borda}" stroke-width="2.2"/>
      <path d="${fora}" fill="none" stroke="${borda}" stroke-opacity=".7" stroke-width="1.5" transform="translate(150 217.5) scale(.985) translate(-150 -217.5)"/>
      ${extra}
      <path d="${brasao}" fill="url(#${k}g)" stroke="${i === 9 ? ouro : m.c}" stroke-width="3" stroke-linejoin="round"/>
      <path d="${brasao}" fill="none" stroke="${borda}" stroke-width="1.5" transform="translate(150 38) scale(.86) translate(-150 -38)"/>
      ${coroa}
      <image href="${Ranque.img(i)}" x="117" y="2" width="66" height="66"/>
    </svg>`;
  }

  // ---------- cartão de batalha ----------
  // p = { nome, estilo, avatar, titulo (texto), raroTitulo, favorita, pts (PR), trofeus, nivel, cla, eu }
  function cartao(p, { tam = 'grande', lado = '' } = {}) {
    const f = Ranque.info(p.pts || 0), pat = f.p;
    const c = p.favorita && Estado.carta(p.favorita);
    const ultra = c && c.raridade === 'ultra';
    const nome = typeof Passe !== 'undefined' && Passe.nomeHtml ? Passe.nomeHtml(p.nome || 'Jogador', p.estilo) : esc(p.nome || 'Jogador');
    const arte = c ? (c.video ? `<video src="assets/cartas/${c.video}" poster="${Cartas.arte(c)}" autoplay muted loop playsinline preload="auto"></video>` : `<img src="${Cartas.arte(c)}" alt="" draggable="false" />`) : '<div class="cb-vazio">?</div>';
    return `<div class="cartao-batalha ${tam} t${f.i} novo${ultra ? ' fav-ultra' : ''}${lado ? ` ${lado}` : ''}" style="--cor:${pat.cor};--escura:${pat.escura}">
      <div class="cb-dentro">
        <div class="cb-arte">${arte}${ultra ? '<video class="cb-ultra" src="assets/ui/moldura_ultra.mp4" autoplay muted loop playsinline preload="auto"></video>' : ''}<i class="cb-reflexo"></i></div>
        <div class="cb-topo"><span class="cb-av"><img src="${avatarUrl(p.avatar)}" alt="" /><em>${p.nivel || 1}</em></span>
</div>
        ${c ? `<span class="cb-fav ${c.raridade}">${esc(c.nome)}</span>` : ''}
        <div class="cb-base">
          ${p.titulo ? `<span class="cb-titulo r-${p.raroTitulo || 'comum'}">${esc(p.titulo)}</span>` : ''}
          <b class="cb-nome">${nome}</b>
          <div class="cb-stats"><span>🏆 ${fmt(p.trofeus)}</span>${p.cla ? `<span class="cb-cla">🛡️ ${esc(p.cla)}</span>` : ''}</div>
        </div>
      </div>
      ${moldura(f.i)}
      <div class="cb-faixa"><span>${esc(f.nome)}</span></div>
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
