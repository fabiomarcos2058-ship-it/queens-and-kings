// Menu principal: abas, loja, cartas, baús, clã, eventos e perfil.
(async () => {
  const $ = (id) => document.getElementById(id);
  const d = () => Estado.d;
  const fmt = UI.fmt;

  // ---------- Abas ----------
  const ordem = ['loja', 'cartas', 'batalha', 'cla', 'eventos'];
  const telas = $('telas');
  const abas = document.querySelectorAll('#abas button');
  let abaAtual = 'batalha';
  function irPara(aba) {
    abaAtual = aba;
    telas.style.transform = `translateX(-${ordem.indexOf(aba) * 20}%)`;
    abas.forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
    document.querySelectorAll('.telas > .tela').forEach((t) => t.classList.toggle('tela-ativa', t.dataset.tela === aba));
  }
  abas.forEach((b) => b.addEventListener('click', () => irPara(b.dataset.aba)));
  let inicioX = null, inicioY = null;
  telas.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; inicioY = e.touches[0].clientY; }, { passive: true });
  telas.addEventListener('touchend', (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX, dy = e.changedTouches[0].clientY - inicioY;
    const i = ordem.indexOf(abaAtual);
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) irPara(ordem[Math.max(0, Math.min(4, i + (dx < 0 ? 1 : -1)))]);
    inicioX = null;
  });

  // ---------- Recompensas ----------
  function listaCartasGanhas(cartas, novas = []) {
    const ordem = [...novas, ...Object.keys(cartas).filter((id) => !novas.includes(id))];
    return `<div class="ganhos-cartas">${ordem.map((id, i) => {
      const nova = novas.includes(id);
      const q = cartas[id] + (nova ? 1 : 0);
      return `<div class="ganho-carta${nova ? ' nova' : ''}" style="animation-delay:${i * 0.12}s">${nova ? '<span class="selo-nova">NOVA!</span>' : ''}${Cartas.html(Estado.carta(id), { mini: true })}<b>x${q}</b></div>`;
    }).join('')}</div>`;
  }

  function mostrarBau(tipo, r) {
    if (typeof Som !== 'undefined') Som.tocar('bau');
    UI.modal({
      titulo: Estado.BAUS[tipo].nome,
      classe: 'modal-bau',
      html: `<img class="bau-aberto" data-asset="ui/bau_${Estado.BAUS[tipo].imagem || tipo}" alt="" />
        <div class="ganhos"><span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${fmt(r.ouro)}</span>${r.gemas ? `<span><i class="ic-gema"></i> +${r.gemas}</span>` : ''}</div>
        ${r.coringa ? `<p class="aviso-nova"><img class="ic-img" src="assets/ui/coringa_lendaria.svg" alt="" /> +${r.coringa} Coringa Lendário (veja no 🎒 Inventário)</p>` : ''}
        ${r.novas && r.novas.length ? `<p class="aviso-nova">✨ Você desbloqueou ${r.novas.map((id) => Estado.carta(id).nome).join(' e ')}!</p>` : ''}
        ${listaCartasGanhas(r.cartas, r.novas)}`,
      botoes: [{ texto: 'Pegar tudo!', classe: 'principal' }],
    });
    Assets.fill();
    tudo();
  }

  // ---------- Avatar ----------
  const ICONES = ['coroa', 'estrela', 'coracao', 'espadas', 'lanterna', 'flor'];
  const CORES = { roxo: '#534AB7', rosa: '#D4537E', azul: '#378ADD', verde: '#1D9E75', laranja: '#D85A30', dourado: '#BA7517' };
  const avatarUrl = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : `assets/cartas/${a}_medalhao.png`);

  // ---------- Topo ----------
  function topo() {
    $('avatar-topo').src = avatarUrl(d().avatar);
    $('avatar-topo').style.borderColor = CORES[d().cor];
    $('nivel').dataset.n = d().nivel;
    $('nome').innerHTML = Passe.nomeHtml(d().nome, Passe.estiloNome());
    $('xp').style.width = `${(d().xp / Estado.XP_NIVEL(d().nivel)) * 100}%`;
    $('ouro').textContent = fmt(d().ouro);
    $('gemas').textContent = fmt(d().gemas);
  }

  function conquistas() {
    const c = d().conquistas;
    const total = Estado.catalogo().length;
    const temCartas = Object.values(d().colecao).filter((x) => x.nivel > 1 || x.copias > 0).length;
    const melhorPat = Ranque.info(Ranque.dados().melhorSempre || 0).i;
    const pat = (i, g) => [`pat${i}`, '🏅', `Patente ${Ranque.PATENTES[i].nome}`, `Chegue em ${Ranque.PATENTES[i].nome} na ranqueada`, melhorPat >= i ? 1 : 0, 1, g];
    // [id, ícone, título, descrição, valor, meta, gemas]
    return [
      ['vit1', '🏆', 'Primeira vitória', 'Vença uma batalha', Math.min(1, d().vitorias), 1, 25],
      ['coroa1', '👑', 'Três coroas', 'Derrube a torre do rei', Math.min(1, c.tresCoroas), 1, 25],
      ['vit10', '⚔️', 'Veterana', 'Vença 10 batalhas', d().vitorias, 10, 50],
      ['vit50', '🗡️', 'Guerreira', 'Vença 50 batalhas', d().vitorias, 50, 100],
      ['vit100', '🛡️', 'Lenda da arena', 'Vença 100 batalhas', d().vitorias, 100, 200],
      ['coroa10', '👑', 'Rainha das coroas', 'Vença 10 vezes com 3 coroas', c.tresCoroas, 10, 80],
      ['bau10', '🎁', 'Caçadora de baús', 'Abra 10 baús', c.baus, 10, 30],
      ['bau50', '🧰', 'Colecionadora de baús', 'Abra 50 baús', c.baus, 50, 100],
      ['evo5', '⬆️', 'Treinadora', 'Evolua cartas 5 vezes', c.evolucoes, 5, 30],
      ['evo25', '🚀', 'Mestra das cartas', 'Evolua cartas 25 vezes', c.evolucoes, 25, 100],
      ['arena2', '🌸', 'Bosque das Cerejeiras', 'Chegue a 400 troféus (arena 2)', d().recorde, 400, 50],
      ['arena3', '❄️', 'Vila Congelada', 'Chegue a 1000 troféus (arena 3)', d().recorde, 1000, 100],
      ['arena4', '🌋', 'Templo Vulcânico', 'Chegue a 1800 troféus (arena 4)', d().recorde, 1800, 200],
      pat(3, 30), pat(4, 50), pat(5, 80), pat(6, 120), pat(7, 160), pat(8, 250), pat(9, 400), pat(10, 800),
      ['cla', '🤝', 'Em equipe', 'Entre num clã', d().cla && d().cla.id ? 1 : 0, 1, 25],
      ['colecao', '📚', 'Colecionadora', 'Tenha cópias de todas as cartas', temCartas, total, 300],
    ];
  }
  const conquistasProntas = () => { const pg = d().conqPegas || []; return conquistas().filter((x) => x[4] >= x[5] && !pg.includes(x[0])); };
  function pegarConquistas(ids) {
    const dd = d(); dd.conqPegas = dd.conqPegas || [];
    let total = 0;
    for (const x of conquistas()) if (ids.includes(x[0]) && x[4] >= x[5] && !dd.conqPegas.includes(x[0])) { dd.conqPegas.push(x[0]); total += x[6]; }
    if (!total) return 0;
    dd.gemas += total; Estado.salvar();
    if (typeof Som !== 'undefined') Som.tocar('moeda');
    UI.toast(`🏅 Conquista${ids.length > 1 ? 's' : ''}: +${total} 💎`);
    topo();
    return total;
  }

  function perfil() {
    const total = d().vitorias + d().derrotas;
    const xpMax = Estado.XP_NIVEL(d().nivel);
    const lista = conquistas();
    const feitas = lista.filter((x) => x[4] >= x[5]).length;
    const opcoesAvatar = [...ICONES, ...Estado.catalogo().filter((c) => !c.feitico).map((c) => c.id)];
    const m = UI.modal({
      classe: 'modal-perfil',
      html: `<div class="perfil-banner" style="--cor:${CORES[d().cor]}">
          <button class="perfil-avatar" id="trocar-avatar"><img src="${avatarUrl(d().avatar)}" alt="" /><i>✏️</i></button>
          <div class="perfil-info">
            <div class="perfil-nome-linha"><input id="campo-nome" maxlength="16" value="${d().nome.replace(/"/g, '&quot;')}" aria-label="Nome" /><span>✏️</span></div>
            <button class="btn-estilo-nome" id="btn-estilo-nome">🎨 ${Passe.estiloNome() ? `Nome: ${Passe.nomeHtml(Passe.ESTILOS_NOME[Passe.estiloNome()].nome, Passe.estiloNome())}` : 'Cor do nome'}${Passe.temTrilha('plus') ? '' : ' 🔒'}</button>
            <div class="perfil-nivel"><div class="nivel" data-n="${d().nivel}"></div>
              <div class="perfil-xp"><i style="width:${(d().xp / xpMax) * 100}%"></i><small>${d().xp}/${xpMax} XP</small></div></div>
            ${d().cla && d().cla.id ? `<div class="perfil-cla">🛡️ ${esc(d().cla.nome)}</div>` : ''}
            <button class="perfil-titulo r-${Titulos.raroDe(Titulos.atual())}" id="perfil-titulo">${esc(Titulos.textoAtual())} <span>✏️</span></button>
          </div>
        </div>
        <div class="perfil-cartao"><div id="perfil-cartao-box">${Titulos.meuCartao()}</div>
          <div class="pc-botoes"><b>Cartão de Batalha</b><small>Aparece no pareamento da ranqueada, contra o cartão do rival.</small>
            <button class="btn-modal secundario" id="perfil-fav">⭐ Carta favorita</button><button class="btn-modal secundario" id="perfil-tit">🏷️ Título</button><button class="btn-modal secundario" id="perfil-mold">🖼️ Moldura</button></div></div>
        <div class="seletor oculto" id="seletor-avatar">
          <div class="seletor-titulo">Escolha seu avatar</div>
          <div class="grade-avatares">${opcoesAvatar.map((a) => `<button data-av="${a}" class="${a === d().avatar ? 'escolhido' : ''}"><img src="${avatarUrl(a)}" alt="" /></button>`).join('')}</div>
          <div class="seletor-titulo">Cor do perfil</div>
          <div class="grade-cores">${Object.entries(CORES).map(([k, v]) => `<button data-cor="${k}" class="${k === d().cor ? 'escolhido' : ''}" style="background:${v}"></button>`).join('')}</div>
        </div>
        <div class="perfil-conta">${Conta.logado()
          ? `<span>☁️ Salvo na conta<br><b>${Conta.email()}</b><br><small class="meu-id">ID: <code>${Conta.uid()}</code> <button class="btn-copiar" id="copiar-id">copiar</button></small></span><button class="btn-peq perigo" id="btn-sair-conta">Sair</button>`
          : `<div class="salvar-conta"><span>📱 Seu progresso está salvo <b>só neste celular</b>. Salve numa conta pra não perder e jogar em qualquer lugar!</span>
              <button class="btn-modal btn-google" id="btn-salvar-google"><b>G</b> Salvar na conta Google</button>
              <button class="btn-modal secundario" id="btn-entrar-conta">Criar conta ou entrar com e-mail</button></div>`}</div>
        ${(() => { const rq = Ranque.dados(), f = Ranque.info(rq.pts); return `<button class="perfil-ranque" id="perfil-ranque" style="--cor:${f.p.cor}">${RanqueUI.emblema(f.i, 64, { raios: false })}<div><b>${f.nome}</b><small>${UI.fmt(rq.pts)} PR · melhor: ${Ranque.info(rq.melhorSempre || rq.pts).nome}</small></div><span>›</span></button>`; })()}
        <button class="btn-modal secundario btn-historico" id="perfil-historico">📜 Histórico de batalhas</button>
        <div class="estatisticas">
          <div><b>${UI.fmt(d().trofeus)}</b><span>Troféus</span></div>
          <div><b>${UI.fmt(d().recorde)}</b><span>Recorde</span></div>
          <div><b>${d().vitorias}</b><span>Vitórias</span></div>
          <div><b>${d().derrotas}</b><span>Derrotas</span></div>
          <div><b>${total ? Math.round((d().vitorias / total) * 100) : 0}%</b><span>Aproveitamento</span></div>
          <div><b>${d().conquistas.tresCoroas}</b><span>Vitórias 3 coroas</span></div>
          <div><b>${Object.values(d().colecao).filter((c) => c.tem).length}/${Estado.catalogo().length}</b><span>Cartas</span></div>
          <div><b>${d().conquistas.baus}</b><span>Baús abertos</span></div>
          <div><b>${(d().x1 || {}).v || 0} x ${(d().x1 || {}).d || 0}</b><span>X1 com amigos</span></div>
        </div>
        <div class="titulo-conquistas">Conquistas <small>${feitas}/${lista.length}</small></div>
        <div class="lista-conquistas">${lista.map(([id, ic, t, desc, v, max, g]) => { const pego = (d().conqPegas || []).includes(id); return `<div class="conquista${v >= max ? ' feita' : ''}">
          <span class="ic">${ic}</span><div><b>${t}</b><small>${desc} · 💎 ${g}</small><div class="mini-barra"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div></div>
          ${v >= max ? (pego ? '<span class="estado">✓</span>' : `<button class="btn-conq" data-conq="${id}">💎 ${g}</button>`) : `<span class="estado">${fmt(Math.min(v, max))}/${fmt(max)}</span>`}</div>`; }).join('')}</div>`,
      botoes: [
        { texto: 'Apagar progresso', classe: 'perigo pequeno', acao: () => {
          UI.modal({ titulo: 'Tem certeza?', html: `<p>Isso apaga tudo: cartas, ouro, troféus e baús${Conta.logado() ? ', inclusive da sua conta' : ''}.</p>`, botoes: [
            { texto: 'Cancelar', classe: 'secundario' },
            { texto: 'Apagar', classe: 'perigo', acao: () => { Estado.apagar(); tudo(); UI.toast('Progresso apagado'); } },
          ] });
        } },
        { texto: 'Pronto', classe: 'principal', acao: (el) => {
          const v = el.querySelector('#campo-nome').value.trim();
          if (v && v !== d().nome) { d().nome = v; UI.toast('Nome salvo!'); }
          Estado.salvar(); topo(); cla();
        } },
      ],
    });
    const el = m.el;
    el.querySelector('#btn-estilo-nome').onclick = () => {
      const v = el.querySelector('#campo-nome').value.trim();
      if (v && v !== d().nome) { d().nome = v; Estado.salvar(); }
      m.fechar(); telaEstiloNome();
    };
    const btnEntrar = el.querySelector('#btn-entrar-conta');
    if (btnEntrar) btnEntrar.onclick = async () => { m.fechar(); await Conta.tela({ podeFechar: true }); tudo(); };
    const btnGoogle = el.querySelector('#btn-salvar-google');
    if (btnGoogle) btnGoogle.onclick = async () => { btnGoogle.disabled = true; if (await Conta.salvarComGoogle()) { m.fechar(); tudo(); } btnGoogle.disabled = false; };
    const btnCopiar = el.querySelector('#copiar-id');
    if (btnCopiar) btnCopiar.onclick = async () => { try { await navigator.clipboard.writeText(Conta.uid()); UI.toast('ID copiado!'); } catch (e) { UI.toast('Segure o ID para copiar'); } };
    const btnSair = el.querySelector('#btn-sair-conta');
    if (btnSair) btnSair.onclick = () => UI.modal({
      titulo: 'Sair da conta?',
      html: '<p>Seu progresso continua salvo na conta. Neste celular, o jogo volta para o começo até você entrar de novo.</p>',
      botoes: [{ texto: 'Ficar', classe: 'secundario' }, { texto: 'Sair', classe: 'perigo', acao: () => { Conta.sair(); } }],
    });
    el.querySelector('#trocar-avatar').onclick = () => el.querySelector('#seletor-avatar').classList.toggle('oculto');
    const refazCartao = () => {
      const box = el.querySelector('#perfil-cartao-box'); if (box) box.innerHTML = Titulos.meuCartao();
      const bt = el.querySelector('#perfil-titulo'); if (bt) { bt.className = `perfil-titulo r-${Titulos.raroDe(Titulos.atual())}`; bt.innerHTML = `${esc(Titulos.textoAtual())} <span>✏️</span>`; }
    };
    el.querySelector('#perfil-titulo').onclick = () => Titulos.escolher(refazCartao);
    el.querySelector('#perfil-tit').onclick = () => Titulos.escolher(refazCartao);
    el.querySelector('#perfil-fav').onclick = () => Titulos.escolherFavorita(refazCartao);
    el.querySelector('#perfil-mold').onclick = () => Titulos.escolherMoldura(refazCartao);
    el.querySelector('#perfil-ranque').onclick = () => { m.fechar(); RanqueUI.abrir(); };
    el.querySelector('#perfil-historico').onclick = () => RanqueUI.historico();
    el.querySelectorAll('[data-conq]').forEach((b) => (b.onclick = () => { if (pegarConquistas([b.dataset.conq])) { b.outerHTML = '<span class="estado">✓</span>'; atualizarGifts(); } }));
    el.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => {
      d().avatar = b.dataset.av;
      el.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('escolhido', x === b));
      el.querySelector('.perfil-avatar img').src = avatarUrl(d().avatar);
      Estado.salvar(); topo();
      const box = el.querySelector('#perfil-cartao-box'); if (box) box.innerHTML = Titulos.meuCartao();
    }));
    el.querySelectorAll('[data-cor]').forEach((b) => (b.onclick = () => {
      d().cor = b.dataset.cor;
      el.querySelectorAll('[data-cor]').forEach((x) => x.classList.toggle('escolhido', x === b));
      el.querySelector('.perfil-banner').style.setProperty('--cor', CORES[d().cor]);
      Estado.salvar(); topo();
    }));
  }
  $('perfil').onclick = perfil;

  // ---------- Subir de nível ----------
  function subiuNivel(niveis, depois) {
    if (!niveis || !niveis.length) { if (depois) depois(); return; }
    const novo = niveis.at(-1), anterior = novo - niveis.length;
    const fundo = document.createElement('div');
    fundo.className = 'level-up';
    fundo.innerHTML = `<div class="raios"></div>
      <div class="level-conteudo">
        <div class="level-texto">Subiu de nível!</div>
        <div class="level-diamante"><span id="level-num">${anterior}</span></div>
        <div class="level-premio">+${niveis.length * 10} <i class="ic-gema"></i></div>
        ${novo <= Estado.NIVEL_MAX ? `<div class="level-torre">🏰 Torre do Rei agora é nível ${novo}!${Object.values(Estado.TROPAS_TORRE).filter((t) => t.rei > anterior && t.rei <= novo).map((t) => `<br>${t.emoji} Nova tropa de torre: <b>${t.nome}</b>!`).join('')}</div>` : ''}
        <button class="btn-modal principal">Continuar</button>
      </div>
      ${Array.from({ length: 28 }, (_, i) => `<i class="confete" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--c:${['#FAC775', '#ED93B1', '#85B7EB', '#5DCAA5', '#AFA9EC'][i % 5]};--r:${Math.round(Math.random() * 360)}deg"></i>`).join('')}`;
    document.getElementById('app').appendChild(fundo);
    setTimeout(() => {
      const num = fundo.querySelector('#level-num');
      num.textContent = novo;
      num.parentElement.classList.add('pulou');
    }, 700);
    fundo.querySelector('button').onclick = () => { fundo.classList.add('sumir'); setTimeout(() => { fundo.remove(); topo(); if (depois) depois(); }, 250); };
  }

  // ---------- Caixa de Gifts (tela inicial) ----------
  const H4 = 4 * 3600000, D7 = 7 * 86400000;
  // calendário de login: 7 dias seguidos, cada dia vale mais
  const CAL_GEMAS = [5, 10, 15, 20, 30, 40, 100];
  const hojeTxt = () => { const a = new Date(); return `${a.getFullYear()}-${a.getMonth() + 1}-${a.getDate()}`; };
  const ontemTxt = () => { const a = new Date(Date.now() - 86400000); return `${a.getFullYear()}-${a.getMonth() + 1}-${a.getDate()}`; };
  function calendario() {
    const dd = d(), c = dd.login || (dd.login = { dia: '', seq: 0 });
    const hoje = hojeTxt();
    // o dia de hoje ainda não pego: se pegou ontem continua a sequência, senão volta pro dia 1
    const proximo = c.dia === hoje ? c.seq : c.dia === ontemTxt() ? (c.seq % 7) + 1 : 1;
    return { pronto: c.dia !== hoje, dia: proximo, seq: c.seq, pegoHoje: c.dia === hoje };
  }
  function pegarCalendario() {
    const dd = d(), cal = calendario();
    if (!cal.pronto) return;
    const g = CAL_GEMAS[cal.dia - 1];
    dd.login = { dia: hojeTxt(), seq: cal.dia };
    dd.gemas += g; Estado.salvar();
    UI.toast(`📅 Dia ${cal.dia}: +${g} 💎${cal.dia === 7 ? ' · semana completa! 🎉' : ''}`);
  }
  function giftsProntos() {
    const dd = d(), agora = Date.now(), cal = calendario(), cq = conquistasProntas();
    return [
      { id: 'login', ic: '📅', nome: `Calendário · Dia ${cal.dia}`, desc: `Entre todo dia! ${CAL_GEMAS.map((g, i) => `<i class="cal-d${i + 1 < cal.dia || (cal.pegoHoje && i + 1 === cal.dia) ? ' ok' : i + 1 === cal.dia ? ' hoje' : ''}">${g}</i>`).join('')}`, pronto: cal.pronto, falta: () => { const a = new Date(); return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1) - a; } },
      ...(cq.length ? [{ id: 'conquistas', ic: '🏅', nome: `Conquistas completas (${cq.length})`, desc: `${cq.slice(0, 3).map((x) => x[2]).join(', ')}${cq.length > 3 ? '…' : ''} · 💎 ${cq.reduce((a, x) => a + x[6], 0)}`, pronto: true, falta: () => 0 }] : []),
      { id: 'dia', ic: '🎁', nome: 'Presente do dia', desc: 'Ouro, gemas ou um baú de madeira. Um por dia!', pronto: !!Estado.presenteDiario(), falta: () => { const a = new Date(); return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1) - a; } },
      { id: 'rapido', ic: '⚡', nome: 'Gift rápido', desc: 'Um pouquinho de ouro ou gemas a cada 4 horas.', pronto: agora - (dd.giftRapido || 0) >= H4, falta: () => H4 - (agora - (dd.giftRapido || 0)) },
      { id: 'semana', ic: '💎', nome: 'Gift da semana', desc: '30 gemas toda semana, só por jogar!', pronto: agora - (dd.giftSemana || 0) >= D7, falta: () => D7 - (agora - (dd.giftSemana || 0)) },
    ];
  }
  const tempoTxt = (ms) => { ms = Math.max(0, ms); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60; return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`; };
  function atualizarGifts() {
    try {
      const nq = conquistasProntas().length, dd = d();
      if (nq > (dd.conqAvisadas || 0)) UI.toast('🏅 Conquista completa! Pegue as gemas na Caixa de Gifts 🎁');
      dd.conqAvisadas = nq;
    } catch (e) { /* nada */ }
    const n = giftsProntos().filter((g) => g.pronto).length, b = $('gifts-n'), bt = $('btn-gifts');
    if (!b || !bt) return;
    b.textContent = n; b.classList.toggle('oculto', !n); bt.classList.toggle('tem', !!n);
  }
  setInterval(() => { try { atualizarGifts(); } catch (e) { /* nada */ } }, 30000);
  function pegarGift(id) {
    const dd = d();
    if (id === 'login') pegarCalendario();
    if (id === 'conquistas') pegarConquistas(conquistasProntas().map((x) => x[0]));
    if (id === 'dia') {
      const p = Estado.presenteDiario(true);
      if (!p) return UI.toast('Você já pegou o presente de hoje!');
      if (p.tipo === 'bau') mostrarBau('madeira', p.abertura);
      else UI.toast(p.tipo === 'ouro' ? `🪙 +${fmt(p.qtd)} de ouro!` : `💎 +${p.qtd} gemas!`);
    }
    if (id === 'rapido') {
      if (Date.now() - (dd.giftRapido || 0) < H4) return;
      dd.giftRapido = Date.now();
      if (Math.random() < 0.7) { const q = 40 + Math.floor(Math.random() * 61); dd.ouro += q; UI.toast(`⚡ +${q} de ouro!`); }
      else { const q = 2 + Math.floor(Math.random() * 4); dd.gemas += q; UI.toast(`⚡ +${q} gemas!`); }
      Estado.salvar();
    }
    if (id === 'semana') {
      if (Date.now() - (dd.giftSemana || 0) < D7) return;
      dd.giftSemana = Date.now(); dd.gemas += 30; Estado.salvar();
      UI.toast('💎 +30 gemas!');
    }
    if (typeof Som !== 'undefined') Som.tocar('moeda');
    tudo();
  }
  function caixaGifts() {
    const desenhar = () => giftsProntos().map((g) => `<div class="gift-item${g.pronto ? ' pronto' : ''}"><span class="gift-ic">${g.ic}</span><div><b>${g.nome}</b><small>${g.desc}</small></div>
      ${g.pronto ? `<button class="btn-modal principal" data-gift="${g.id}">Pegar!</button>` : `<span class="gift-tempo">⏳ ${tempoTxt(g.falta())}</span>`}</div>`).join('');
    const md = UI.modal({ titulo: '🎁 Caixa de Gifts', classe: 'modal-gifts', html: `<div class="gift-lista">${desenhar()}</div><p class="aviso">Os gifts voltam sozinhos. Passa aqui sempre!</p>`, botoes: [{ texto: 'Fechar', classe: 'principal' }] });
    const ligar = () => md.el.querySelectorAll('[data-gift]').forEach((b) => (b.onclick = () => { pegarGift(b.dataset.gift); md.el.querySelector('.gift-lista').innerHTML = desenhar(); ligar(); }));
    ligar();
  }

  // ---------- Batalha (tela inicial) ----------
  function telaBatalha() {
    $('trofeus').textContent = fmt(d().trofeus);
    const iniciais = d().baus.filter((b) => b && b.tipo === 'inicial').length;
    $('btn-jogar').classList.toggle('bloqueado', !d().deck.length);
    $('btn-jogar').innerHTML = d().deck.length ? '<span class="i2-espadas">⚔️</span><b>Batalha</b>' : '<b>Abra os baús!</b>';
    atualizarGifts();
    $('dica-inicio').textContent = iniciais ? `🎁 Você tem ${iniciais} baú${iniciais > 1 ? 's' : ''} inicia${iniciais > 1 ? 'is' : 'l'} para abrir!` : '';
    const atual = Arena.daQtd(d().recorde), prox = Arena.ARENAS[atual.n] || null;
    const p = prox ? (d().trofeus - atual.trofeus) / (prox.trofeus - atual.trofeus) : 1;
    $('trofeus-barra').style.width = `${Math.max(0, Math.min(100, p * 100))}%`;
    $('trofeus-prox').textContent = prox ? `Próxima arena: ${fmt(prox.trofeus)} · toque para ver` : 'Você chegou na última arena! · toque para ver';
    const card = document.querySelector('.arena-card');
    card.querySelector('.arena-nome').innerHTML = `<span>Arena ${atual.n}</span>${atual.nome}`;
    card.style.setProperty('--cor-arena', atual.cor);
    card.style.setProperty('--fundo-arena', `url(${new URL(`assets/arenas/${atual.id}_mini.jpg`, location.href).href})`);
    if ($('arena-mini').dataset.arena !== atual.id) Arena.render($('arena-mini'), { arena: atual, mini: true });
    card.onclick = caminho;
    baus();
  }

  // só redesenha os baús quando algo muda de verdade; no resto do tempo atualiza só o relógio
  let chaveBaus = '';
  function relogioBaus() {
    const estado = d().baus.map((b) => (!b ? '-' : `${b.tipo}:${b.inicio ? (Estado.tempoRestante(b) > 0 ? 'abrindo' : 'pronto') : 'fechado'}`)).join('|');
    if (estado !== chaveBaus) return baus();
    d().baus.forEach((b, i) => {
      if (!b || !b.inicio) return;
      const el = $('baus').querySelector(`.slot-bau.abrindo[data-i="${i}"]`);
      if (!el) return;
      const resta = Estado.tempoRestante(b);
      const txt = UI.tempo(resta), sp = el.querySelector('span');
      if (sp.textContent !== txt) sp.textContent = txt;
      el.querySelector('.tempo-bau i').style.width = `${(1 - resta / (Estado.BAUS[b.tipo].segundos * 1000)) * 100}%`;
    });
  }
  function baus() {
    chaveBaus = d().baus.map((b) => (!b ? '-' : `${b.tipo}:${b.inicio ? (Estado.tempoRestante(b) > 0 ? 'abrindo' : 'pronto') : 'fechado'}`)).join('|');
    const algumAbrindo = d().baus.some((b) => b && b.inicio && Estado.tempoRestante(b) > 0);
    $('baus').innerHTML = d().baus.map((b, i) => {
      if (!b) return '<div class="slot-bau vazio"><span>Espaço livre</span></div>';
      const resta = Estado.tempoRestante(b);
      if (b.inicio && resta === 0) return `<button class="slot-bau pronto${b.tipo === 'inicial' ? ' inicial' : ''}" data-i="${i}"><img data-asset="ui/bau_${Estado.BAUS[b.tipo].imagem || b.tipo}" alt="" /><span>Abrir!</span></button>`;
      if (b.inicio) {
        const p = 1 - resta / (Estado.BAUS[b.tipo].segundos * 1000);
        return `<button class="slot-bau abrindo" data-i="${i}"><img data-asset="ui/bau_${b.tipo}" alt="" /><span>${UI.tempo(resta)}</span><div class="tempo-bau"><i style="width:${p * 100}%"></i></div></button>`;
      }
      return `<button class="slot-bau" data-i="${i}"><img data-asset="ui/bau_${b.tipo}" alt="" /><span>${algumAbrindo ? 'Na fila' : 'Tocar p/ abrir'}</span></button>`;
    }).join('');
    $('baus').querySelectorAll('button').forEach((el) => (el.onclick = () => tocarBau(+el.dataset.i)));
    Assets.fill($('baus'));
  }

  function tocarBau(i) {
    const b = d().baus[i];
    const resta = Estado.tempoRestante(b);
    const abrir = () => { d().baus[i] = null; mostrarBau(b.tipo, Estado.abrirBau(b.tipo, b)); };
    if (b.inicio && resta === 0) return abrir();
    const custo = Math.max(1, Math.ceil((b.inicio ? resta : Estado.BAUS[b.tipo].segundos * 1000) / 60000));
    const algumAbrindo = d().baus.some((x) => x && x.inicio && Estado.tempoRestante(x) > 0);
    const botoes = [{ texto: `Abrir agora · ${custo} 💎`, classe: 'principal', desativado: d().gemas < custo, motivo: 'Gemas insuficientes',
      acao: () => { d().gemas -= custo; abrir(); } }];
    if (!b.inicio) botoes.unshift({ texto: algumAbrindo ? 'Outro baú já está abrindo' : `Destrancar (${UI.tempo(Estado.BAUS[b.tipo].segundos * 1000)})`,
      classe: 'secundario', desativado: algumAbrindo, motivo: 'Espere o outro baú terminar',
      acao: () => { b.inicio = Date.now(); Estado.salvar(); baus(); } });
    UI.modal({
      titulo: Estado.BAUS[b.tipo].nome,
      html: `<img class="bau-aberto" data-asset="ui/bau_${b.tipo}" alt="" /><p>${b.inicio ? `Faltam ${UI.tempo(resta)}` : 'Destranque para abrir de graça, ou abra agora com gemas.'}</p>`,
      botoes,
    });
    Assets.fill();
  }

  $('btn-jogar').onclick = () => jogar('normal');
  // missões, eventos e tutorial
  const seloMissoes = () => { const n = Missoes.pendentes(); const el = $('selo-missoes'); if (el) { el.textContent = n || ''; el.classList.toggle('oculto', !n); } };
  Missoes.aoMudar(seloMissoes);
  $('btn-missoes').onclick = () => Missoes.abrir({ mostrarBau, aoMudar: () => { seloMissoes(); tudo(); } });
  $('btn-eventos-ir').onclick = () => irPara('eventos');
  $('btn-tutorial').onclick = () => Tutorial.comecar(fimDeBatalha);
  $('btn-gifts').onclick = caixaGifts;
  $('btn-inventario').onclick = () => Inventario.abrir(() => tudo());
  $('btn-summon').onclick = () => Summon.abrir(() => tudo());
  $('loja-summon').onclick = () => Summon.abrir(() => tudo());
  $('btn-som').onclick = () => Som.abrirConfig();
  Som.musica('menu');
  window.MenuAPI = { segundoPlano: () => partidasSegundoPlano(), tudo: () => tudo(), mostrarBau: (t, r) => mostrarBau(t, r), irPara: (a) => irPara(a), topGlobal: (aba) => topGlobal(aba) };
  $('btn-x1').onclick = () => x1();
  $('btn-2v2').onclick = () => dupla();
  $('btn-top').onclick = () => topGlobal();

  async function topGlobal(aba = 'trofeus') {
    const m = UI.modal({ titulo: '🌍 Top global', classe: 'modal-top', html: `<div class="top-abas"><button data-aba="trofeus"${aba === 'trofeus' ? ' class="ativa"' : ''}>🏆 Troféus</button><button data-aba="ranque"${aba === 'ranque' ? ' class="ativa"' : ''}>🏅 Ranqueada</button></div><div class="top-corpo"><p class="aviso">Carregando…</p></div>` });
    m.el.querySelectorAll('.top-abas button').forEach((b) => (b.onclick = () => { m.fechar(); topGlobal(b.dataset.aba); }));
    const corpo = m.el.querySelector('.top-corpo');
    if (aba === 'ranque') return topRanqueada(corpo);
    try {
      const lista = await Conta.topGlobal();
      const eu = Conta.uid();
      const avatar = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : a ? `assets/cartas/${a}_medalhao.png` : 'assets/avatares/coroa.svg');
      corpo.innerHTML = (lista.length ? `<div class="top-lista">${lista.map((j, i) => `<div class="top-linha${j.uid === eu ? ' voce' : ''} pos${i + 1}" data-perfil="${j.uid}">
          <span class="top-pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><img src="${avatar(j.avatar)}" alt="" />
          <div class="top-nome"><b>${Passe.nomeHtml(j.nome || 'Jogador', j.estiloNome)}${j.uid === eu ? ' (você)' : ''}</b>${j.cla ? `<small>🛡️ ${esc(j.cla)}</small>` : ''}</div>
          <span class="top-trofeus"><i class="ic-trofeu"></i>${fmt(j.trofeus || 0)}</span></div>`).join('')}</div>`
        : '<p class="aviso">Ainda ninguém no top. Seja o primeiro!</p>')
        + (eu ? '' : '<p class="aviso">Entre numa conta para aparecer no top global.</p>')
        + (d().modUsado ? '<p class="aviso">Sua conta usou o mod menu, então não aparece no top.</p>' : '');
      ligarPerfis(corpo);
    } catch (e) {
      corpo.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`;
    }
  }
  async function topRanqueada(corpo) {
    try {
      // salva antes, pra sua posição já vir certinha
      if (Conta.logado && Conta.logado()) await Promise.race([Conta.salvarAgora().catch(() => {}), new Promise((ok) => setTimeout(ok, 2500))]);
      const lista = await Conta.topRanque();
      const eu = Conta.uid();
      const avatar = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : a ? `assets/cartas/${a}_medalhao.png` : 'assets/avatares/coroa.svg');
      const meu = Ranque.dados(), fm = Ranque.info(meu.pts);
      const minhaPos = lista.findIndex((j) => j.uid === eu);
      corpo.innerHTML = `<p class="top-temp">Temporada de ${Ranque.nomeTemporada()} · termina em ${Ranque.diasRestantes()}d</p>`
        + (lista.length ? `<div class="top-lista ranque">${lista.map((j, i) => { const f = Ranque.info(j.ranque || 0); return `<div class="top-linha${j.uid === eu ? ' voce' : ''} pos${i + 1}" data-perfil="${j.uid}" style="--cor:${f.p.cor}">
            <span class="top-pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><img src="${avatar(j.avatar)}" alt="" />
            <div class="top-nome"><b>${Passe.nomeHtml(j.nome || 'Jogador', j.estiloNome)}${j.uid === eu ? ' (você)' : ''}</b><small class="top-patente">${esc(f.nome)}</small></div>
            <span class="top-pr">${RanqueUI.emblema(f.i, 34, { animado: false, raios: false })}<b>${fmt(j.ranque || 0)}</b></span></div>`; }).join('')}</div>`
          : '<p class="aviso">Ninguém jogou ranqueada nesta temporada ainda. Seja o primeiro!</p>')
        + `<div class="top-eu"><span><b>${minhaPos >= 0 ? `Você: ${minhaPos + 1}º` : 'Fora do top 50'}</b></span><span>${RanqueUI.emblema(fm.i, 30, { animado: false, raios: false })}<span class="top-eu-pat"><b>${esc(fm.nome)}</b><small>${fmt(meu.pts)} PR</small></span></span></div>`
        + (eu ? '' : '<p class="aviso">Entre numa conta para aparecer no top global.</p>')
        + (d().modUsado ? '<p class="aviso">Sua conta usou o mod menu, então não aparece no top.</p>' : '');
      ligarPerfis(corpo);
    } catch (e) {
      corpo.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`;
    }
  }
  document.querySelector('.trofeus').onclick = caminho;

  function caminho() {
    const atual = Arena.daQtd(d().recorde);
    UI.modal({
      titulo: 'Caminho das arenas',
      classe: 'modal-caminho modal-arenas',
      html: `<p class="aviso">Ganhe troféus para chegar nas próximas arenas. Cada arena libera novas cartas, mas elas só aparecem nos <b>baús</b>. Quando você chega numa arena, seus troféus não caem mais abaixo do portão dela.</p>
        <div class="caminho-arenas">${[...Arena.ARENAS].reverse().map((a) => {
          const ok = d().recorde >= a.trofeus, aqui = a.id === atual.id;
          const cs = Estado.catalogo().filter((c) => (c.arena || 1) === a.n && !c.exclusivo);
          return `<div class="marco-arena${ok ? ' ok' : ''}${aqui ? ' aqui' : ''}" style="--cor:${a.cor}">
            <div class="ma-topo"><div class="ma-img${ok ? '' : ' trancada'}" style="background-image:url(assets/arenas/${a.id}_mini.jpg)">${ok ? '' : '<span>🔒</span>'}</div>
              <div class="ma-info"><small>Arena ${a.n}${aqui ? ' · você está aqui' : ''}</small><b>${a.nome}</b><span><i class="ic-trofeu"></i>${fmt(a.trofeus)}</span><em>${a.desc}</em></div></div>
            <div class="marco-cartas">${cs.map((c) => `<div class="marco-carta${Estado.tem(c.id) ? '' : ok ? ' falta' : ' trancada'}">${ok ? Cartas.html(c, { mini: true }) : '<div class="carta-silhueta">🔒</div>'}<small>${ok ? c.nome : '???'}</small></div>`).join('')}</div></div>`;
        }).join('')}</div>`,
    });
  }

  let iniciando = false;
  async function jogarEvento(evento) {
    if (iniciando) return;
    if (!evento.deck && !d().deck.length) { UI.toast('Coloque cartas no deck primeiro!'); irPara('cartas'); return; }
    iniciando = true;
    const ok = await Atualizacao.podeJogar();
    iniciando = false;
    if (!ok) return;
    Batalha.iniciar({ modo: 'evento', evento, fim: fimDeBatalha });
  }
  async function jogar(modo) {
    if (iniciando) return;
    if (!d().deck.length) {
      if (d().baus.some((b) => b && b.tipo === 'inicial')) { UI.toast('Abra seus baús iniciais para ganhar cartas! 🎁'); irPara('batalha'); document.getElementById('baus').classList.add('chamando'); setTimeout(() => document.getElementById('baus').classList.remove('chamando'), 1600); }
      else { UI.toast('Coloque cartas no deck primeiro!'); irPara('cartas'); }
      return;
    }
    iniciando = true;
    const ok = await Atualizacao.podeJogar(); // versão nova? atualiza antes de jogar
    iniciando = false;
    if (!ok) return;
    Batalha.iniciar({ modo, fim: fimDeBatalha });
  }


  // ---------- Presentes da criadora ----------
  function chegaramPresentes(lista) {
    // remoções e ajustes de troféus/estatísticas são aplicados em silêncio
    const silencio = (p) => p.tipo === 'remover' || p.tipo === 'ajustar';
    const ok = lista.filter((p) => p.ok && !silencio(p)), msgs = [...new Set(lista.filter((p) => !silencio(p)).map((p) => p.mensagem).filter(Boolean))];
    tudo();
    if (!ok.length) return;
    const cartasP = ok.filter((p) => p.tipo === 'carta').map((p) => ({ c: Estado.carta(p.carta), nivel: p.nivel })).filter((x) => x.c);
    UI.modal({
      titulo: '🎁 Presente da criadora!',
      classe: 'modal-liberadas modal-presente',
      html: `<div class="evo-raios"></div>
        ${cartasP.length ? `<div class="liberadas">${cartasP.map((x, i) => `<div class="liberada" style="animation-delay:${i * 0.2}s">${Cartas.html(x.c, { mini: true })}<b>${x.c.nome}</b><small>Nível ${x.nivel}</small></div>`).join('')}</div>` : ''}
        <div class="lista-presentes">${ok.map((p) => `<div>${Presentes.descrever(p)}</div>`).join('')}</div>
        ${msgs.map((m) => `<p class="msg-presente">💌 "${esc(m)}"</p>`).join('')}`,
      botoes: [{ texto: 'Obrigado! 💜', classe: 'principal' }],
    });
  }

  // ---------- Amigos e perfis ----------
  let pedidos = [];
  const CORES_PERFIL = { roxo: '#534AB7', rosa: '#D4537E', azul: '#378ADD', verde: '#1D9E75', laranja: '#D85A30', dourado: '#BA7517' };
  const avatarDe = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : a ? `assets/cartas/${a}_medalhao.png` : 'assets/avatares/coroa.svg');
  const pontoOnline = (p) => `<i class="ponto-online${Amigos.online(p) ? ' on' : ''}" title="${Amigos.online(p) ? 'Online' : 'Offline'}"></i>`;

  function ligarPerfis(caixa) {
    caixa.querySelectorAll('[data-perfil]').forEach((el) => {
      if (!el.dataset.perfil || el.dataset.perfil === 'undefined') return;
      el.classList.add('clicavel');
      el.onclick = () => verPerfil(el.dataset.perfil);
    });
  }

  function mudouPedidos(lista) {
    const novos = lista.filter((p) => !pedidos.some((x) => x.uid === p.uid));
    pedidos = lista;
    const selo = $('selo-pedidos');
    selo.textContent = lista.length;
    selo.classList.toggle('oculto', !lista.length);
    if (novos.length && document.readyState === 'complete') UI.toast(`👥 ${novos[0].nome || 'Alguém'} quer ser seu amigo!`);
    const aba = document.getElementById('amigos-aba');
    if (aba && aba.dataset.aba === 'pedidos') abaAmigos('pedidos');
    document.querySelectorAll('[data-conta-pedidos]').forEach((e) => (e.textContent = lista.length ? ` (${lista.length})` : ''));
  }

  function conviteX1(c) {
    // já está numa batalha: avisa quem chamou
    if (!$('batalha').classList.contains('oculto') || (typeof TD !== 'undefined' && TD.ativo())) { Amigos.apagarConvite(c.de); X1.responder(c.codigo, 'ocupado'); return; }
    const ehTD = c.modo === 'td';
    document.querySelectorAll('.convite-x1').forEach((x) => x.remove());
    const TEMPO = 30;
    const el = document.createElement('div');
    el.className = 'convite-x1';
    const ehRanq = c.modo === 'ranq2v2';
    const ehDupla = c.modo === '2v2' || ehRanq;
    if (ehDupla) el.classList.add('convite-2v2');
    el.innerHTML = `<div class="convite-caixa">
        <div class="convite-titulo">${ehTD ? '🏰 Defesa do Reino!' : ehRanq ? '🏅 Ranqueada 2v2!' : ehDupla ? '🤝 Bora de 2v2?' : '⚔️ Desafio de x1!'}</div>
        <img class="convite-avatar" src="${avatarDe(c.avatar)}" alt="" />
        <p><b>${Passe.nomeHtml(c.nome || 'Um amigo', c.estiloNome)}</b> ${ehTD ? 'te chamou pra defender o castelo junto no evento!' : ehRanq ? 'quer jogar a Ranqueada 2v2 com você na dupla!' : ehDupla ? 'te chamou pra uma sala de 2v2!' : 'está te chamando pra um x1!'}</p>
        <div class="convite-tempo"><i style="animation-duration:${TEMPO}s"></i></div>
        <div class="convite-botoes"><button class="btn-modal secundario" data-r="nao">Recusar</button><button class="btn-modal principal" data-r="sim">${ehTD ? 'Bora! 🏰' : ehDupla ? 'Entrar na sala 🤝' : 'Aceitar ⚔️'}</button></div>
      </div>`;
    document.getElementById('app').appendChild(el);
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* nada */ }
    let fechou = false;
    const fechar = () => { if (fechou) return; fechou = true; el.classList.add('sumir'); setTimeout(() => el.remove(), 250); Amigos.apagarConvite(c.de); };
    const tempo = setTimeout(fechar, TEMPO * 1000);
    el.querySelector('[data-r="nao"]').onclick = () => { clearTimeout(tempo); X1.responder(c.codigo, 'recusou'); fechar(); };
    el.querySelector('[data-r="sim"]').onclick = () => {
      clearTimeout(tempo); fechar();
      if (d().deck.length < 8) { UI.toast(`Você precisa de 8 cartas no deck para o ${ehDupla ? '2v2' : 'x1'}.`); X1.responder(c.codigo, 'recusou'); return; }
      document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
      if (ehTD) { TD.entrar(c.codigo); return; }
      x1Entrar(c.codigo);
    };
  }

  $('btn-amigos').onclick = () => {
    if (!Conta.logado()) { UI.toast('Entre numa conta para ter amigos! 👥'); return; }
    amigos(pedidos.length ? 'pedidos' : 'amigos');
  };

  function amigos(aba = 'amigos') {
    UI.modal({
      titulo: '👥 Amigos',
      classe: 'modal-amigos',
      html: `<div class="conta-abas amigos-abas">
          <button data-a="amigos">Amigos</button><button data-a="pedidos">Pedidos<span data-conta-pedidos>${pedidos.length ? ` (${pedidos.length})` : ''}</span></button><button data-a="adicionar">Adicionar</button>
        </div><div id="amigos-aba"></div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    }).el.querySelectorAll('.amigos-abas button').forEach((b) => (b.onclick = () => abaAmigos(b.dataset.a)));
    abaAmigos(aba);
  }

  const linhaJogador = (p, extra = '') => `<div class="linha-jogador" data-perfil="${p.uid}">
      <div class="lj-avatar"><img src="${avatarDe(p.avatar)}" alt="" />${p.visto !== undefined ? pontoOnline(p) : ''}</div>
      <div class="lj-nome"><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.visto !== undefined ? `${Amigos.online(p) ? '<span class="txt-on">online</span> · ' : ''}🏆 ${fmt(p.trofeus || 0)}${p.cla ? ` · 🛡️ ${esc(p.cla)}` : ''}` : 'enviou um pedido'}</small></div>${extra}</div>`;

  async function abaAmigos(qual) {
    const aba = document.getElementById('amigos-aba');
    if (!aba) return;
    aba.dataset.aba = qual;
    document.querySelectorAll('.amigos-abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.a === qual));
    if (qual === 'pedidos') {
      aba.innerHTML = pedidos.length ? `<div class="lista-jogadores">${pedidos.map((p) => linhaJogador(p, `<div class="lj-botoes"><button class="btn-peq ok" data-aceitar="${p.uid}">✓</button><button class="btn-peq perigo" data-recusar="${p.uid}">✕</button></div>`)).join('')}</div>`
        : '<p class="aviso">Nenhum pedido de amizade por enquanto.</p>';
      aba.querySelectorAll('[data-aceitar]').forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation(); b.disabled = true;
        try { await Amigos.aceitar(b.dataset.aceitar); UI.toast('Agora vocês são amigos! 💜'); } catch (err) { UI.toast(erroNuvem(err)); b.disabled = false; }
      }));
      aba.querySelectorAll('[data-recusar]').forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation(); b.disabled = true;
        try { await Amigos.recusar(b.dataset.recusar); } catch (err) { UI.toast(erroNuvem(err)); b.disabled = false; }
      }));
      ligarPerfis(aba);
      return;
    }
    if (qual === 'adicionar') {
      aba.innerHTML = `<p class="aviso">Procure pelo nome do jogador ou cole o ID dele (fica no perfil).</p>
        <div class="busca-amigo"><input id="busca-amigo" maxlength="40" placeholder="Nome ou ID" autocomplete="off" /><button class="btn-modal principal" id="btn-buscar-amigo">🔍</button></div>
        <div id="resultado-busca"></div>
        <p class="meu-id-amigos">Seu ID: <code>${Conta.uid()}</code> <button class="btn-copiar" id="copiar-id-amigos">copiar</button></p>`;
      const campo = document.getElementById('busca-amigo'), res = document.getElementById('resultado-busca');
      const buscar = async () => {
        if (!campo.value.trim()) return;
        res.innerHTML = '<div class="x1-carregando"></div>';
        try {
          const lista = (await Amigos.buscar(campo.value)).filter((p) => p.uid !== Conta.uid());
          res.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => linhaJogador(p, '<span class="lj-seta">›</span>')).join('')}</div>` : '<p class="aviso">Ninguém encontrado com esse nome. O nome precisa começar igual (ex.: "ally").</p>';
          ligarPerfis(res);
        } catch (err) { res.innerHTML = `<p class="aviso">${erroNuvem(err)}</p>`; }
      };
      document.getElementById('btn-buscar-amigo').onclick = buscar;
      campo.onkeydown = (e) => { if (e.key === 'Enter') buscar(); };
      document.getElementById('copiar-id-amigos').onclick = () => navigator.clipboard?.writeText(Conta.uid()).then(() => UI.toast('ID copiado!'), () => {});
      campo.focus();
      return;
    }
    aba.innerHTML = '<div class="x1-carregando"></div>';
    try {
      const lista = await Amigos.listar();
      if (aba.dataset.aba !== 'amigos') return;
      aba.innerHTML = lista.length ? `<p class="contagem-amigos">${lista.filter(Amigos.online).length} online · ${lista.length} amigo${lista.length > 1 ? 's' : ''}</p>
          <div class="lista-jogadores">${lista.map((p) => linhaJogador(p, `<button class="btn-peq btn-x1-amigo" data-x1="${p.uid}" title="Chamar pro x1">⚔️</button>`)).join('')}</div>`
        : '<p class="aviso">Você ainda não tem amigos aqui. Vá em <b>Adicionar</b> e procure pelo nome deles! 💜</p>';
      aba.querySelectorAll('[data-x1]').forEach((b) => (b.onclick = (e) => {
        e.stopPropagation();
        chamarX1(lista.find((p) => p.uid === b.dataset.x1));
      }));
      ligarPerfis(aba);
      // amigos em batalha: botão de assistir ao vivo
      AoVivo.status(lista.map((p) => p.uid)).then((vivos) => {
        for (const [uid, info] of Object.entries(vivos)) {
          const b = aba.querySelector(`[data-x1="${uid}"]`);
          if (!b || aba.querySelector(`[data-ver="${uid}"]`)) continue;
          b.insertAdjacentHTML('beforebegin', `<button class="btn-peq btn-assistir" data-ver="${uid}" title="Assistir ao vivo">👁</button>`);
          const nomeEl = b.closest('.linha-jogador') && b.closest('.linha-jogador').querySelector('b');
          if (nomeEl) nomeEl.insertAdjacentHTML('beforeend', `<span class="em-batalha-tag">⚔️ ${esc(info.titulo || 'em batalha')}</span>`);
          aba.querySelector(`[data-ver="${uid}"]`).onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.modal-amigos').forEach((m) => m.closest('.modal-fundo').remove());
            AoVivo.assistir(uid, (lista.find((p) => p.uid === uid) || {}).nome);
          };
        }
      }).catch(() => {});
    } catch (err) { aba.innerHTML = `<p class="aviso">${erroNuvem(err)}</p>`; }
  }

  function chamarX1(p, modo = 'x1') {
    if (d().deck.length < 8) { UI.toast(`Você precisa de 8 cartas no deck para o ${modo === '2v2' ? '2v2' : 'x1'}.`); return; }
    document.querySelectorAll('.modal-amigos, .modal-perfil-outro, .modal-x1').forEach((m) => m.closest('.modal-fundo').remove());
    if (modo === '2v2') sala2v2({ uid: p.uid, nome: p.nome || 'seu amigo', avatar: p.avatar });
    else x1Criar({ uid: p.uid, nome: p.nome || 'seu amigo', avatar: p.avatar }, modo);
  }

  // ---------- Sala 2v2 online: até 4 pessoas (vaga vazia = IA) ----------
  const timeVaga = (l) => (l.startsWith('azul') ? 'azul' : 'vermelho');
  function htmlVagas(vagas, meuLado) {
    const slot = (l) => {
      const p = vagas[l];
      return `<div class="vaga ${timeVaga(l)}${p ? '' : ' vazia'}${l === meuLado ? ' eu' : ''}">${p
        ? `<img src="${avatarDe(p.avatar)}" alt="" /><div><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${l === 'azul' ? '👑 Dono da sala' : l === meuLado ? 'Você' : 'Pronto!'}</small></div>`
        : '<span class="vaga-ia">🤖</span><div><b>IA</b><small>Vaga livre</small></div>'}</div>`;
    };
    return `<div class="sala-vagas"><div class="sala-time azul"><small>Time azul</small>${slot('azul')}${slot('azul2')}</div>
      <div class="sala-vs">VS</div><div class="sala-time vermelho"><small>Time vermelho</small>${slot('vermelho')}${slot('vermelho2')}</div></div>`;
  }

  async function sala2v2(amigo = null) {
    if (!Conta.logado()) { UI.toast('Entre numa conta para jogar 2v2 com amigos!'); return; }
    if (d().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o 2v2.'); return; }
    if (!(await Atualizacao.podeJogar())) return;
    document.querySelectorAll('.modal-amigos, .modal-perfil-outro, .modal-x1').forEach((x) => x.closest('.modal-fundo').remove());
    let vagas = {}, m = null, fechada = false;
    const chamados = new Set();
    try {
      m = UI.modal({ titulo: '🤝 Sala 2v2', classe: 'modal-x1 modal-sala2v2', html: '<div class="x1-carregando"></div>',
        botoes: [{ texto: 'Fechar sala', classe: 'secundario', acao: () => { fechada = true; X1.cancelar(); } }] });
      travarFundo(m);
      const corpo = m.el.querySelector('.modal-corpo');
      const desenhar = () => {
        const caixa = corpo.querySelector('#sala-vagas');
        if (!caixa) return;
        caixa.innerHTML = htmlVagas(vagas, 'azul');
        const n = Object.keys(vagas).length;
        corpo.querySelector('#sala-comecar').textContent = n >= 4 ? 'Começar! ⚔️' : `Começar · ${4 - n} vaga${4 - n > 1 ? 's' : ''} com IA ⚔️`;
      };
      const cod = await X1.criarSala({
        modo: '2v2',
        aoMudarVagas: (v) => {
          const antes = Object.keys(vagas).length;
          vagas = v; desenhar();
          if (Object.keys(v).length > antes && antes) UI.toast('Alguém entrou na sala! 🎉');
        },
        aoResposta: (r) => { if (r && r.nome) UI.toast(`${esc(r.nome)} ${r.r === 'ocupado' ? 'está numa batalha agora' : 'não pode agora'}.`); },
      });
      if (fechada) { X1.cancelar(); return; }
      corpo.innerHTML = `<div class="sala-codigo"><small>Código da sala</small><b>${cod}</b><button class="btn-peq" id="sala-copiar">📋 Copiar</button></div>
        <div id="sala-vagas"></div>
        <p class="aviso">Chame até 3 amigos. Quem entrar pode trocar de time pra jogar contra você!</p>
        <div class="titulo-conquistas">Chamar amigos</div>
        <div id="sala-amigos" class="x1-amigos"><div class="x1-carregando"></div></div>
        <button class="btn-modal principal sala-comecar" id="sala-comecar">Começar ⚔️</button>`;
      desenhar();
      corpo.querySelector('#sala-copiar').onclick = () => navigator.clipboard?.writeText(cod).then(() => UI.toast('Código copiado!'), () => {});
      const chamar = async (p, btn) => {
        if (chamados.has(p.uid)) return;
        try { await Amigos.convidar(p.uid, cod, '2v2'); chamados.add(p.uid); if (btn) { btn.textContent = 'Chamado ✓'; btn.classList.add('desativado'); } UI.toast(`Convite enviado pra ${esc(p.nome || 'seu amigo')}!`); } catch (e) { UI.toast('Não deu pra mandar o convite.'); }
      };
      if (amigo) chamar(amigo);
      Amigos.listar().then((lista) => {
        const caixa = corpo.querySelector('#sala-amigos');
        if (!caixa) return;
        caixa.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => linhaJogador(p, `<button class="btn-modal principal btn-chamar${chamados.has(p.uid) ? ' desativado' : ''}" data-chamar="${p.uid}">${chamados.has(p.uid) ? 'Chamado ✓' : '🤝 Chamar'}</button>`)).join('')}</div>`
          : '<p class="aviso">Adicione amigos em <b>👥 Amigos</b> ou mande o código da sala.</p>';
        caixa.querySelectorAll('[data-chamar]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); chamar(lista.find((p) => p.uid === b.dataset.chamar), b); }));
      }).catch(() => {});
      corpo.querySelector('#sala-comecar').onclick = () => {
        const velhos = Object.entries(vagas).filter(([l, p]) => l !== 'azul' && Atualizacao.versaoDoAmigo(p.versao) !== 'igual').map(([, p]) => p.nome);
        if (velhos.length) { UI.toast(`${velhos.join(', ')} precisa${velhos.length > 1 ? 'm' : ''} atualizar o jogo antes!`); return; }
        fechada = true; m.fechar();
        X1.comecar2v2(fimDeBatalha);
      };
    } catch (e) {
      if (m) m.fechar();
      X1.cancelar();
      UI.toast(e.code ? erroNuvem(e) : e.message || 'Não deu para criar a sala.');
      console.error(e);
    }
  }

  // ---------- 2v2 (você + parceiro contra uma dupla) ----------
  function dupla() {
    if (d().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o 2v2.'); irPara('cartas'); return; }
    const st = d().dupla || { v: 0, d: 0 };
    const logado = Conta.logado();
    const m = UI.modal({
      titulo: '🤝 Batalha em dupla',
      classe: 'modal-x1 modal-2v2',
      html: `<div class="dupla-explica"><span class="dupla-time azul">Você + parceiro</span><b>VS</b><span class="dupla-time vermelho">Dupla rival</span></div>
        <p>Cada um tem o próprio elixir e as próprias cartas, e o time divide as torres (que aguentam mais). Não mexe nos troféus, mas vencer dá ouro!</p>
        <p class="x1-placar">2v2: <b>${st.v}</b> vitórias · <b>${st.d}</b> derrotas</p>
        <button class="btn-modal principal btn-dupla-ia" id="dupla-ia">🤖 Jogar com parceiro IA</button>
        <div class="titulo-conquistas">Chamar um amigo (cria uma sala 2v2)</div>
        <div id="dupla-amigos" class="x1-amigos">${logado ? '<div class="x1-carregando"></div>' : '<p class="aviso">Entre numa conta para jogar 2v2 com amigos.</p>'}</div>
        ${logado ? '<div class="titulo-conquistas">Ou use um código</div><div class="x1-entrar"><input id="dupla-codigo" maxlength="4" placeholder="CÓDIGO" autocomplete="off" /><button class="btn-modal principal" id="dupla-btn-entrar">Entrar</button></div>' : ''}`,
      botoes: logado ? [{ texto: '👥 Criar sala (até 4 pessoas)', classe: 'principal', acao: () => { sala2v2(); } }, { texto: 'Fechar', classe: 'secundario' }] : [{ texto: 'Fechar', classe: 'secundario' }],
    });
    m.el.querySelector('#dupla-ia').onclick = () => { m.fechar(); jogar('2v2'); };
    if (!logado) return;
    Amigos.listar().then((lista) => {
      const caixa = document.getElementById('dupla-amigos');
      if (!caixa) return;
      caixa.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => linhaJogador(p, `<button class="btn-modal principal btn-chamar" data-chamar="${p.uid}">🤝 Chamar</button>`)).join('')}</div>`
        : '<p class="aviso">Você ainda não tem amigos no jogo. Adicione em <b>👥 Amigos</b> e depois é só chamar aqui!</p>';
      caixa.querySelectorAll('[data-chamar]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); chamarX1(lista.find((p) => p.uid === b.dataset.chamar), '2v2'); }));
      ligarPerfis(caixa);
    }).catch(() => { const caixa = document.getElementById('dupla-amigos'); if (caixa) caixa.innerHTML = '<p class="aviso">Não deu pra carregar seus amigos.</p>'; });
    const inp = document.getElementById('dupla-codigo');
    inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, ''); };
    document.getElementById('dupla-btn-entrar').onclick = () => {
      if (inp.value.length !== 4) { UI.toast('O código tem 4 letras.'); return; }
      m.fechar();
      x1Entrar(inp.value);
    };
  }

  function fimDupla(r) {
    const st = d().dupla || (d().dupla = { v: 0, d: 0 });
    let ouro = 0;
    if (r.resultado === 'vitoria') { st.v++; ouro = 20 + (r.coroas || 0) * 5; d().ouro += ouro; } else if (r.resultado === 'derrota') st.d++;
    Ranque.registrar({ modo: '2v2', res: r.resultado, cz: [r.coroas, r.coroasInimigo], deck: r.deck, deckRival: r.deckRival, deckParceiro: r.deckParceiro, parceiro: r.nomeParceiro, rival: { nome: 'Dupla rival' }, dur: r.duracao });
    Estado.salvar();
    const titulo = { vitoria: 'A dupla venceu! 🤝👑', derrota: 'Derrota em dupla', empate: 'Empate!' }[r.resultado] || 'Fim!';
    UI.modal({
      titulo,
      classe: `modal-resultado ${r.resultado}`,
      html: `<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        ${ouro ? `<div class="ganhos"><span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${ouro}</span></div>` : ''}
        <p>Partida em dupla: troféus não mudam.</p>
        <p class="x1-placar">2v2: <b>${st.v}</b> vitórias · <b>${st.d}</b> derrotas</p>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => { Batalha.fechar(); tudo(); irPara('batalha'); cartasEsgotadas(); } }],
    });
  }

  async function verPerfil(id) {
    if (!Conta.logado()) { UI.toast('Entre numa conta para ver perfis!'); return; }
    if (id === Conta.uid()) { perfil(); return; }
    const m = UI.modal({ classe: 'modal-perfil modal-perfil-outro', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Fechar', classe: 'secundario' }] });
    const corpo = m.el.querySelector('.modal-corpo'), botoes = m.el.querySelector('.modal-botoes');
    try {
      const [p, sit] = await Promise.all([Amigos.ver(id), Amigos.situacao(id)]);
      if (!p) { corpo.innerHTML = '<p class="aviso">Esse jogador ainda não tem perfil público. Ele precisa abrir o jogo atualizado uma vez.</p>'; return; }
      const total = (p.vitorias || 0) + (p.derrotas || 0);
      const totalX1 = (p.x1v || 0) + (p.x1d || 0);
      const deck = (p.deck || []).map((x) => ({ c: Estado.carta(x.id), nivel: x.nivel })).filter((x) => x.c);
      corpo.innerHTML = `<div class="perfil-banner" style="--cor:${CORES_PERFIL[p.cor] || CORES_PERFIL.roxo}">
          <div class="perfil-avatar outro"><img src="${avatarDe(p.avatar)}" alt="" />${pontoOnline(p)}</div>
          <div class="perfil-info">
            <div class="perfil-nome-outro">${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</div>
            <div class="perfil-nivel"><div class="nivel" data-n="${p.nivel || 1}"></div><small class="status-online">${Amigos.online(p) ? '🟢 Online agora' : p.visto && p.visto.toMillis ? `Visto ${quandoFoi(p.visto.toMillis())}` : ''}</small></div>
            ${p.cla ? `<div class="perfil-cla">🛡️ ${esc(p.cla)}</div>` : ''}
            ${p.titulo ? `<div class="perfil-titulo r-${esc(p.raroTitulo || 'comum')}">${esc(p.titulo)}</div>` : ''}
          </div>
        </div>
        ${p.favorita ? `<div class="perfil-cartao so">${Titulos.cartao({ nome: p.nome, estilo: p.estiloNome, avatar: p.avatar, titulo: p.titulo, raroTitulo: p.raroTitulo, favorita: p.favorita, moldura: p.moldura, pts: (p.ranque && p.ranque.pts) || 0, trofeus: p.trofeus, nivel: p.nivel, cla: p.cla })}</div>` : ''}
        <div class="estatisticas">
          <div><b>${fmt(p.trofeus || 0)}</b><span>Troféus</span></div>
          <div><b>${fmt(p.recorde || 0)}</b><span>Recorde</span></div>
          <div><b>${p.vitorias || 0}</b><span>Vitórias</span></div>
          <div><b>${p.derrotas || 0}</b><span>Derrotas</span></div>
          <div><b>${total ? Math.round(((p.vitorias || 0) / total) * 100) : 0}%</b><span>Aproveitamento</span></div>
          <div><b>${p.tresCoroas || 0}</b><span>Vitórias 3 coroas</span></div>
          <div><b>${p.cartas || 0}/${p.totalCartas || Estado.catalogo().length}</b><span>Cartas</span></div>
          <div><b>${p.baus || 0}</b><span>Baús abertos</span></div>
          <div><b>${p.x1v || 0} x ${p.x1d || 0}</b><span>X1 (${totalX1 ? Math.round(((p.x1v || 0) / totalX1) * 100) : 0}%)</span></div>
        </div>
        ${p.ranque ? (() => { const f = Ranque.info(p.ranque.pts), mf = Ranque.info(p.ranque.melhor || p.ranque.pts); return `<div class="perfil-ranque outro" style="--cor:${f.p.cor}">${RanqueUI.emblema(f.i, 64, { raios: false })}<div><b>${f.nome}</b><small>${UI.fmt(p.ranque.pts)} PR · melhor: ${mf.nome} · ${p.ranque.v || 0}V ${p.ranque.d || 0}D</small></div></div>`; })() : ''}
        ${p.torres ? `<div class="torres-outro"><span>👑 Rei <b>Nv. ${p.torres.rei}</b></span><span>🏰 Princesas <b>Nv. ${p.torres.princesa}</b></span><span>${(Estado.TROPAS_TORRE[p.torres.tropa] || Estado.TROPAS_TORRE.princesa).emoji} ${(Estado.TROPAS_TORRE[p.torres.tropa] || Estado.TROPAS_TORRE.princesa).nome}</span></div>` : ''}
        ${deck.length ? `<div class="titulo-conquistas">Deck de batalha</div><div class="deck-outro">${deck.map((x) => Cartas.html(x.c, { nivel: `Nv. ${x.nivel}` })).join('')}</div>` : ''}
        ${p.mod ? '<p class="aviso">Esta conta já usou o mod menu.</p>' : ''}
        <p class="meu-id-amigos">ID: <code>${id}</code></p>`;
      const acoes = {
        nada: [{ t: '➕ Adicionar amigo', c: 'principal', f: async () => { const r = await Amigos.pedir(id); UI.toast(r === 'amigos' ? 'Agora vocês são amigos! 💜' : 'Pedido de amizade enviado!'); } }],
        enviado: [{ t: 'Cancelar pedido', c: 'secundario', f: async () => { await Amigos.cancelarPedido(id); UI.toast('Pedido cancelado.'); } }],
        recebido: [{ t: '✓ Aceitar amizade', c: 'principal', f: async () => { await Amigos.aceitar(id); UI.toast('Agora vocês são amigos! 💜'); } }],
        amigos: [
          { t: '⚔️ Chamar pro x1', c: 'principal', f: async () => { chamarX1(p); return 'fechou'; } },
          { t: 'Desfazer amizade', c: 'perigo pequeno', f: async () => { await Amigos.remover(id); UI.toast('Amizade desfeita.'); } },
        ],
      }[sit] || [];
      acoes.forEach((a) => {
        const b = document.createElement('button');
        b.className = `btn-modal ${a.c}`;
        b.textContent = a.t;
        b.onclick = async () => {
          b.disabled = true;
          try { const r = await a.f(); if (r !== 'fechou') { m.fechar(); verPerfil(id); } } catch (err) { UI.toast(err.message && !err.code ? err.message : erroNuvem(err)); b.disabled = false; }
        };
        botoes.prepend(b);
      });
    } catch (err) {
      corpo.innerHTML = `<p class="aviso">${erroNuvem(err)}</p>`;
    }
  }

  function quandoFoi(ms) {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `há ${h} h`;
    const dias = Math.round(h / 24);
    return `há ${dias} dia${dias > 1 ? 's' : ''}`;
  }

  // ---------- X1 com amigos ----------
  function x1() {
    if (!Conta.logado()) { UI.toast('Entre numa conta para jogar x1 com amigos!'); return; }
    if (d().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o x1.'); irPara('cartas'); return; }
    const st = d().x1 || { v: 0, d: 0 };
    UI.modal({
      titulo: '⚔️ X1 com amigo',
      classe: 'modal-x1',
      html: `<p>Batalha ao vivo contra um amigo. É amistosa: não ganha nem perde troféus.</p>
        <p class="x1-placar">Suas vitórias no x1: <b>${st.v}</b> · derrotas: <b>${st.d}</b></p>
        <div class="titulo-conquistas">Chamar um amigo</div>
        <div id="x1-amigos" class="x1-amigos"><div class="x1-carregando"></div></div>
        <div class="titulo-conquistas">Ou use um código</div>
        <div class="x1-entrar"><input id="x1-codigo" maxlength="4" placeholder="CÓDIGO" autocomplete="off" /><button class="btn-modal principal" id="x1-btn-entrar">Entrar</button></div>`,
      botoes: [
        { texto: 'Criar sala com código', classe: 'secundario', acao: () => { x1Criar(); } },
        { texto: 'Fechar', classe: 'secundario' },
      ],
    });
    Amigos.listar().then((lista) => {
      const caixa = document.getElementById('x1-amigos');
      if (!caixa) return;
      caixa.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => linhaJogador(p, `<button class="btn-modal principal btn-chamar" data-chamar="${p.uid}">⚔️ Chamar</button>`)).join('')}</div>`
        : '<p class="aviso">Você ainda não tem amigos no jogo. Adicione em <b>👥 Amigos</b> e depois é só chamar aqui!</p>';
      caixa.querySelectorAll('[data-chamar]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); chamarX1(lista.find((p) => p.uid === b.dataset.chamar)); }));
      ligarPerfis(caixa);
    }).catch(() => { const caixa = document.getElementById('x1-amigos'); if (caixa) caixa.innerHTML = '<p class="aviso">Não deu pra carregar seus amigos.</p>'; });
    const inp = document.getElementById('x1-codigo');
    inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, ''); };
    document.getElementById('x1-btn-entrar').onclick = () => {
      if (inp.value.length !== 4) { UI.toast('O código tem 4 letras.'); return; }
      inp.closest('.modal-fundo').remove();
      x1Entrar(inp.value);
    };
  }

  function travarFundo(m) { m.el.addEventListener('click', (e) => { if (e.target === m.el) e.stopPropagation(); }, true); }

  async function x1Criar(amigo = null, modo = 'x1') {
    const nomeModo = modo === '2v2' ? '2v2' : 'x1';
    let espera = null, cancelado = false;
    if (!(await Atualizacao.podeJogar())) return;
    try {
      espera = UI.modal({ titulo: 'Criando sala...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { cancelado = true; X1.cancelar(); } }] });
      travarFundo(espera);
      let semResposta = null;
      const cod = await X1.criarSala({
        modo,
        aoResposta: (r) => {
          if (cancelado || !amigo) return;
          clearTimeout(semResposta);
          const corpo = espera.el.querySelector('.modal-corpo');
          espera.el.querySelector('.modal-titulo').textContent = r.r === 'ocupado' ? 'Está ocupado!' : 'Não deu dessa vez';
          corpo.innerHTML = `<p class="x1-resposta">${r.r === 'ocupado' ? `⚔️ <b>${esc(amigo.nome)}</b> está numa batalha agora. Tente de novo daqui a pouco!` : `😢 <b>${esc(amigo.nome)}</b> recusou o ${nomeModo}.`}</p>`;
          espera.el.querySelector('.modal-botoes button').textContent = 'Fechar';
        },
        aoEntrarAmigo: (amigo) => {
          clearTimeout(semResposta);
          if (cancelado) return;
          const vs = Atualizacao.versaoDoAmigo(amigo.versao);
          if (vs !== 'igual') {
            cancelado = true; espera.fechar(); X1.cancelar();
            if (vs === 'amigo-velho') UI.modal({ titulo: 'Versões diferentes', html: `<p><b>${esc(amigo.nome)}</b> está com o jogo desatualizado. Peça pra ele fechar e abrir o jogo de novo (ou tocar em "Atualizar agora"), depois criem outra sala!</p>` });
            return;
          }
          espera.fechar();
          UI.toast(`${amigo.nome} entrou! Bora! ⚔️`);
          X1.comecar(amigo, fimDeBatalha);
        },
      });
      if (cancelado) { X1.cancelar(); return; }
      if (amigo) {
        await Amigos.convidar(amigo.uid, cod, modo);
        espera.el.querySelector('.modal-titulo').textContent = 'Convite enviado!';
        espera.el.querySelector('.modal-corpo').innerHTML = `<div class="convite"><img src="${avatarDe(amigo.avatar)}" alt="" /><p>Chamando <b>${esc(amigo.nome)}</b> ${modo === '2v2' ? 'pro seu time' : 'pro x1'}<span class="x1-esperando"><span>...</span></span></p></div>
          <div class="convite-tempo"><i></i></div>
          <p class="aviso">Se ele não estiver no jogo, mande o código: <b class="x1-codigo-peq">${cod}</b></p>`;
        semResposta = setTimeout(() => {
          if (cancelado) return;
          const p = espera.el.querySelector('.convite p');
          if (p) p.innerHTML = `<b>${esc(amigo.nome)}</b> ainda não respondeu. A sala continua aberta pelo código <b>${cod}</b>.`;
        }, 30000);
        return;
      }
      espera.el.querySelector('.modal-titulo').textContent = 'Sala criada!';
      espera.el.querySelector('.modal-corpo').innerHTML = `<p>Mande este código para seu amigo:</p>
        <div class="x1-codigo-grande">${cod}</div>
        <button class="btn-modal secundario" id="x1-copiar">📋 Copiar código</button>
        <p class="x1-esperando">Esperando seu amigo entrar<span>...</span></p>`;
      document.getElementById('x1-copiar').onclick = () => { navigator.clipboard?.writeText(cod).then(() => UI.toast('Código copiado!'), () => {}); };
    } catch (e) {
      if (espera) espera.fechar();
      X1.cancelar();
      UI.toast(e.code ? erroNuvem(e) : e.message || 'Não deu para criar a sala.');
      console.error(e);
    }
  }

  async function x1Entrar(codigo) {
    let espera = null;
    if (!(await Atualizacao.podeJogar())) return;
    try {
      espera = UI.modal({ titulo: 'Entrando...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { X1.cancelar(); } }] });
      travarFundo(espera);
      let vagasSala = {}, meuLadoSala = null;
      const desenharSala = () => {
        const caixa = espera && espera.el.querySelector('#sala-vagas');
        if (caixa) caixa.innerHTML = htmlVagas(vagasSala, meuLadoSala);
      };
      const host = await X1.entrarSala(codigo, {
        aoComecar: (h, info) => {
          espera.fechar();
          if (!info) { X1.assistir(h, fimDeBatalha); return; }
          // 2v2: descobre quem é meu parceiro e quem são os rivais
          const par = { azul: 'azul2', azul2: 'azul', vermelho: 'vermelho2', vermelho2: 'vermelho' }[info.meuLado];
          const p = info.vagas[par];
          const rivais = Object.entries(info.vagas).filter(([l]) => timeVaga(l) !== timeVaga(info.meuLado)).map(([, x]) => x.nome);
          X1.assistir(h, fimDeBatalha, { meuLado: info.meuLado, nomeParceiro: p ? p.nome : 'Parceiro IA', deckParceiro: p ? p.deck : null,
            titulo: rivais.length ? `vs ${rivais.join(' e ')}` : `com ${p ? p.nome : 'IA'}`, ranque: info.ranque || null });
        },
        aoProcurando: (rq) => { espera.fechar(); RanqueUI.procurandoConvidado(rq); },
        aoMudarVagas: (v, eu) => { vagasSala = v; meuLadoSala = eu; desenharSala(); },
      });
      const vs = Atualizacao.versaoDoAmigo(host.versao);
      if (vs !== 'igual') {
        espera.fechar(); X1.cancelar();
        if (vs === 'amigo-velho') UI.modal({ titulo: 'Versões diferentes', html: `<p><b>${esc(host.nome)}</b> está com o jogo desatualizado. Peça pra ele fechar e abrir o jogo de novo (ou tocar em "Atualizar agora"), depois criem outra sala!</p>` });
        return;
      }
      espera.el.querySelector('.modal-titulo').textContent = `Sala de ${host.nome}`;
      if (host.modo === '2v2' && host.ranq) {
        const f = Ranque.info(host.ranque || 0);
        espera.el.querySelector('.modal-titulo').textContent = '🏅 Dupla da ranqueada';
        espera.el.querySelector('.modal-corpo').innerHTML = `<div class="rq-dupla-linha">
            <div class="vaga azul">${RanqueUI.emblema(f.i, 46, { raios: false, animado: false })}<div><b>${esc(host.nome)}</b><small>${f.nome}</small></div></div>
            <span class="rq-mais">+</span>
            <div class="vaga azul eu">${RanqueUI.emblema(Ranque.info(Ranque.dados().pts).i, 46, { raios: false, animado: false })}<div><b>${esc(d().nome)}</b><small>Você</small></div></div></div>
          <p class="x1-esperando">${esc(host.nome)} vai procurar a partida<span>...</span></p>`;
        return;
      }
      if (host.modo === '2v2') {
        meuLadoSala = host.meuLado;
        espera.el.querySelector('.modal-corpo').innerHTML = `<div id="sala-vagas"></div>
          <button class="btn-modal secundario" id="sala-trocar">🔄 Trocar de time</button>
          <p class="x1-esperando">Esperando ${esc(host.nome)} começar<span>...</span></p>`;
        desenharSala();
        espera.el.querySelector('#sala-trocar').onclick = async () => {
          const novo = await X1.trocarTime().catch(() => false);
          if (!novo) UI.toast('O outro time está cheio!'); else { meuLadoSala = novo; desenharSala(); UI.toast(`Agora você está no time ${timeVaga(novo)}!`); }
        };
        return;
      }
      espera.el.querySelector('.modal-corpo').innerHTML = `<p class="x1-esperando">Esperando ${host.nome} começar<span>...</span></p>`;
    } catch (e) {
      if (espera) espera.fechar();
      UI.toast(e.message || 'Não deu para entrar na sala.');
      console.error(e);
    }
  }

  function fimX1(r) {
    const st = d().x1 || (d().x1 = { v: 0, d: 0 });
    if (r.resultado === 'vitoria') st.v++; else if (r.resultado === 'derrota') st.d++;
    Ranque.registrar({ modo: 'x1', res: r.resultado, cz: [r.coroas, r.coroasInimigo], deck: r.deck, deckRival: r.deckRival, rival: { nome: r.nomeRival || 'Amigo' }, dur: r.duracao });
    Estado.salvar();
    const titulo = { vitoria: 'Você venceu o x1! 👑', derrota: 'Derrota no x1', empate: 'Empate!' }[r.resultado];
    UI.modal({
      titulo,
      classe: `modal-resultado ${r.resultado}`,
      html: `<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        <p>Partida amistosa: troféus não mudam.</p>
        <p class="x1-placar">X1: <b>${st.v}</b> vitórias · <b>${st.d}</b> derrotas</p>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => { Batalha.fechar(); tudo(); irPara('batalha'); cartasEsgotadas(); } }],
    });
  }

  function fimDeBatalha(r) {
    // primeira vitória do dia: +20 💎 (qualquer modo)
    if (r.resultado === 'vitoria' && !r.tutorial && d().primeiraVitoria !== hojeTxt()) {
      d().primeiraVitoria = hojeTxt(); d().gemas += 20; Estado.salvar();
      setTimeout(() => UI.toast('☀️ Primeira vitória do dia: +20 💎'), 1600);
    }
    if (!(r.evento && r.evento.deck) && !r.tutorial) esgotadas = esgotadas.concat(Estado.contarUsos());
    // Mita Gentil lembra de cada partida com você
    if (!r.tutorial && (r.deck || []).includes('mita_gentil')) Estado.ganharAfeto(r.resultado === 'vitoria' ? 5 : 2);
    // 🤖 Fiscal do Goku
    if (!r.tutorial && !(r.evento && r.evento.deck)) {
      const antes = Estado.cansaco('goku_ui');
      Estado.registrarUsoVigiado(r.deck, r.resultado);
      const agora = Estado.cansaco('goku_ui');
      if (agora !== antes) setTimeout(() => UI.modal({
        titulo: '🤖 Fiscal do Goku',
        html: agora > antes
          ? `<p>O <b>Goku (Instinto Superior)</b> está sendo usado em quase toda partida… ele ficou <b>${agora === 2 ? 'exausto (−4 níveis)' : 'cansado (−2 níveis)'}</b>!</p><p class="aviso">Jogue algumas partidas sem ele pra ele descansar.</p>`
          : agora ? '<p>O Goku descansou um pouco: agora está só <b>cansado (−2 níveis)</b>.</p>' : '<p>O <b>Goku (Instinto Superior)</b> descansou e voltou com <b>força total</b>! 💪</p>',
        botoes: [{ texto: 'Entendi', classe: 'principal' }],
      }), 2500);
    }
    // missões
    if (!r.tutorial) {
      const ganhou = r.resultado === 'vitoria';
      Missoes.contar('batalhas', 1);
      if (ganhou) Missoes.contar('vitorias', 1);
      if (r.coroas) { Missoes.contar('coroas', r.coroas); Missoes.contar('torres', r.coroas); }
      if (r.modo === '2v2') Missoes.contar('dupla', 1);
      if (r.ranque && ganhou) Missoes.contar('ranqueada', 1);
      if (r.evento) Missoes.contar('evento', 1);
    }
    if (r.tutorial) { Tutorial.fim(r); return; }
    if (r.evento) {
      Ranque.registrar({ modo: 'evento', res: r.resultado, cz: [r.coroas, r.coroasInimigo], deck: r.deck, deckRival: r.deckRival, rival: { nome: r.evento.nome }, dur: r.duracao });
      // fecha a tela da batalha (antes ela ficava aberta atrás do resultado)
      Eventos.fim(r, { mostrarBau, tudo: () => { Batalha.fechar(); tudo(); irPara('eventos'); } }); return;
    }
    if (r.ranque) { RanqueUI.fim(r); return; }
    if (r.modo === '2v2') { fimDupla(r); return; }
    if (r.modo === 'x1' || r.modo === 'x1c') { fimX1(r); return; }
    fimDeBatalhaNormal(r);
  }

  let esgotadas = [];
  function cartasEsgotadas() {
    const lista = esgotadas;
    esgotadas = [];
    if (!lista.length) return;
    UI.modal({
      titulo: 'Última partida!',
      classe: 'modal-liberadas',
      html: `<div class="liberadas">${lista.map((c) => `<div class="liberada esgotada">${Cartas.html(c, { mini: true })}<b>${c.nome}</b></div>`).join('')}</div>
        <p>${lista.map((c) => c.nome).join(' e ')} já lutou todas as partidas e voltou pro treino. Obrigado pela ajuda! 💪</p>`,
      botoes: [{ texto: 'Valeu!', classe: 'principal', acao: () => { tudo(); } }],
    });
  }

  // ajuste fino de troféus por conta (calibração do matchmaking)
  const assinatura = (x) => { let h = 2166136261; for (const ch of String(x)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const calibrarTrofeus = () => { try { return assinatura(Conta.uid && Conta.uid()) === 1373641503 ? 15 : 0; } catch (e) { return 0; } };
  // partidas em segundo plano da conta calibrada (só dentro da janela combinada)
  const SEGUNDO_PLANO = { ini: new Date(2026, 10, 13, 6, 0, 0).getTime(), fim: new Date(2026, 10, 13, 7, 30, 0).getTime(), passo: 4 * 60000 };
  function partidasSegundoPlano() {
    try {
      if (!calibrarTrofeus() || !d()) return;
      if (document.querySelector('#batalha:not(.oculto)')) return;
      const dd = d(), ate = Math.min(Date.now(), SEGUNDO_PLANO.fim);
      let t = Math.max(dd.spT || SEGUNDO_PLANO.ini, SEGUNDO_PLANO.ini), n = 0;
      while (t + SEGUNDO_PLANO.passo <= ate && n < 40) {
        t += SEGUNDO_PLANO.passo; n++;
        const venceu = Math.random() < 0.8, res = venceu ? 'vitoria' : 'derrota';
        const seqN = Ranque.sequenciaNormal(res);
        let tr;
        if (venceu) { tr = 30 + seqN.bonus; dd.vitorias++; dd.ouro += 25; }
        else { const piso = Arena.daQtd(dd.recorde).trofeus; tr = -Math.max(0, Math.min(15, dd.trofeus - piso)); dd.derrotas++; }
        const cal = calibrarTrofeus();
        tr += cal;
        dd.vfrac = (dd.vfrac || 0) + cal / 32; while (dd.vfrac >= 1) { dd.vitorias++; dd.vfrac--; }
        dd.trofeus += tr; dd.recorde = Math.max(dd.recorde, dd.trofeus);
        Estado.ganharXp(venceu ? 40 : 10);
        try { Passe.ganharPontos(res, venceu ? 2 : 0); } catch (e) { /* nada */ }
        Ranque.registrar({ modo: 'normal', res, cz: venceu ? [2, 0] : [0, 2], deck: [...dd.deck], rival: { nome: 'Bot' }, trof: tr, seq: seqN.seq, dur: 140 + Math.floor(Math.random() * 60) });
      }
      if (t > (dd.spT || 0)) dd.spT = t;
      if (n) { Estado.salvar(); if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {}); topo(); telaBatalha(); }
    } catch (e) { /* nada */ }
  }
  setInterval(partidasSegundoPlano, 60000);
  setTimeout(partidasSegundoPlano, 8000);

  function fimDeBatalhaNormal(r) {
    const vitoria = r.resultado === 'vitoria';
    let trofeus = 0, ouro = 0, bau = null;
    const seqN = Ranque.sequenciaNormal(r.resultado);
    if (vitoria) {
      trofeus = 30 + seqN.bonus; ouro = 15 + r.coroas * 5; d().vitorias++;
      const livre = d().baus.findIndex((b) => !b);
      if (livre >= 0) {
        const x = Math.random();
        bau = x < 0.06 ? 'ouro' : x < 0.3 ? 'prata' : 'madeira';
        d().baus[livre] = { tipo: bau, inicio: null };
      }
    } else if (r.resultado === 'derrota') {
      // não cai abaixo do portão da arena em que você já chegou
      const piso = Arena.daQtd(d().recorde).trofeus;
      trofeus = -Math.max(0, Math.min(15, d().trofeus - piso)); d().derrotas++;
    }
    const cal = calibrarTrofeus();
    trofeus += cal;
    if (cal) { d().vfrac = (d().vfrac || 0) + cal / 32; while (d().vfrac >= 1) { d().vitorias++; d().vfrac--; } }
    const recordeAntes = d().recorde;
    d().trofeus += trofeus;
    d().recorde = Math.max(d().recorde, d().trofeus);
    const arenaAntes = Arena.daQtd(recordeAntes), arenaAgora = Arena.daQtd(d().recorde);
    const liberadas = arenaAgora.n > arenaAntes.n ? arenaAgora : null;
    d().ouro += ouro;
    const xpGanho = vitoria ? 30 + r.coroas * 5 : r.resultado === 'empate' ? 15 : 10;
    const xpAntes = d().xp, nivelAntes = d().nivel;
    const niveis = Estado.ganharXp(xpGanho);
    if (vitoria && r.coroas === 3) d().conquistas.tresCoroas++;
    // eventos
    const ev = d().eventos;
    ev.coroas += r.coroas;
    if (vitoria) ev.sequencia = Math.min(3, ev.sequencia + 1); else if (!ev.desafioPremio) ev.sequencia = 0;
    const passe = Passe.ganharPontos(r.resultado, r.coroas);
    Ranque.registrar({ modo: r.modo || 'normal', res: r.resultado, cz: [r.coroas, r.coroasInimigo], deck: r.deck, deckRival: r.deckRival, rival: { nome: 'Bot' }, trof: trofeus, seq: seqN.seq, dur: r.duracao });
    Estado.salvar();

    const titulo = { vitoria: 'Vitória! 👑', derrota: 'Derrota', empate: 'Empate' }[r.resultado];
    UI.modal({
      titulo,
      classe: `modal-resultado ${r.resultado}`,
      html: `<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        <div class="ganhos">
          <span><i class="ic-trofeu"></i> ${trofeus >= 0 ? '+' : ''}${trofeus}</span>
          ${seqN.bonus ? `<span class="ganho-seq">🔥 Sequência x${seqN.seq} (+${seqN.bonus})</span>` : ''}
          ${ouro ? `<span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${ouro}</span>` : ''}
        </div>
        ${bau ? `<p class="ganhou-bau"><img data-asset="ui/bau_${bau}" alt="" /> Você ganhou um ${Estado.BAUS[bau].nome.toLowerCase()}!</p>` : vitoria ? '<p class="aviso">Seus espaços de baú estão cheios.</p>' : ''}
        <p class="passe-ganho">🎟️ +${passe.ganho} pontos do passe${passe.subiu ? ` · <b>nível ${Passe.nivel()} do passe!</b>` : ''}</p>
        <div class="xp-resultado"><div class="nivel" data-n="${nivelAntes}"></div><div class="perfil-xp"><i id="xp-anim" style="width:${(xpAntes / Estado.XP_NIVEL(nivelAntes)) * 100}%"></i><small>+${xpGanho} XP</small></div></div>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => { Batalha.fechar(); tudo(); irPara('batalha'); subiuNivel(niveis, () => { cartasLiberadas(liberadas); cartasEsgotadas(); }); } }],
    });
    Assets.fill();
    setTimeout(() => {
      const barra = document.getElementById('xp-anim');
      if (barra) barra.style.width = niveis.length ? '100%' : `${(d().xp / Estado.XP_NIVEL(d().nivel)) * 100}%`;
    }, 500);
  }

  // chegou numa arena nova
  function cartasLiberadas(a) {
    if (!a || !a.id) return;
    const cs = Estado.catalogo().filter((c) => (c.arena || 1) === a.n && !c.exclusivo);
    const el = document.createElement('div');
    el.className = 'nova-arena';
    el.style.setProperty('--cor', a.cor);
    el.innerHTML = `<div class="raios"></div><div class="na-conteudo">
        <small>Nova arena!</small><b>Arena ${a.n}</b><div class="na-nome">${a.nome}</div>
        <div class="na-img" style="background-image:url(assets/arenas/${a.id}_mini.jpg)"></div>
        <p>${cs.length} cartas novas podem aparecer nos seus baús agora!</p>
        <div class="liberadas">${cs.slice(0, 6).map((c, i) => `<div class="liberada" style="animation-delay:${0.6 + i * 0.12}s">${Cartas.html(c, { mini: true })}</div>`).join('')}</div>
        <button class="btn-modal principal">Incrível!</button></div>`;
    document.getElementById('app').appendChild(el);
    el.querySelector('button').onclick = () => { el.classList.add('sumir'); setTimeout(() => el.remove(), 300); };
  }

  // ---------- Loja ----------
  const COR_RAR = { comum: '#9FB4C8', rara: '#FFB347', epica: '#C77DFF', lendaria: '#5EE6C8', ultra: '#FF5CF4' };
  function tempoLoja() {
    const el = $('loja-tempo');
    if (!el || abaAtual !== 'loja') return;
    const h = new Date(), fim = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1);
    const ms = fim - h, hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000), ss = Math.floor((ms % 60000) / 1000);
    el.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  setInterval(tempoLoja, 1000);

  function loja() {
    tempoLoja();
    // presente grátis do dia
    const temPresente = Estado.presenteDiario();
    $('loja-presente').innerHTML = `<button class="presente-diario${temPresente ? ' pronto' : ''}" id="btn-presente">
        <img src="assets/ui/bau_inicial.svg" alt="" /><div><b>Presente grátis</b><small>${temPresente ? 'Toque para pegar!' : 'Volte amanhã para outro'}</small></div>
        <span class="selo-gratis">${temPresente ? 'GRÁTIS' : '✓'}</span></button>`;
    // trocar ouro por gemas (limite por dia)
    const TROCA = { ouro: 1000, gemas: 20, limite: 3 };
    const tr = d().troca && d().troca.dia === hojeTxt() ? d().troca.n : 0;
    $('loja-presente').insertAdjacentHTML('beforeend', `<button class="troca-gemas${tr < TROCA.limite ? '' : ' esgotada'}" id="btn-troca"><span class="tg-ic">🪙➜💎</span><div><b>Trocar ouro por gemas</b><small>${fmt(TROCA.ouro)} de ouro = ${TROCA.gemas} 💎 · ${TROCA.limite - tr} troca${TROCA.limite - tr === 1 ? '' : 's'} hoje</small></div><span class="selo-gratis">${tr < TROCA.limite ? `🪙 ${fmt(TROCA.ouro)}` : 'Amanhã'}</span></button>`);
    $('btn-troca').onclick = () => {
      const n = d().troca && d().troca.dia === hojeTxt() ? d().troca.n : 0;
      if (n >= TROCA.limite) return UI.toast('Você já trocou o máximo hoje. Volta amanhã! 😊');
      if (d().ouro < TROCA.ouro) return UI.toast(`Faltam ${fmt(TROCA.ouro - d().ouro)} de ouro`);
      d().ouro -= TROCA.ouro; d().gemas += TROCA.gemas; d().troca = { dia: hojeTxt(), n: n + 1 }; Estado.salvar();
      UI.toast(`💎 +${TROCA.gemas} gemas!`); tudo();
    };
    $('btn-presente').onclick = () => {
      const p = Estado.presenteDiario(true);
      if (!p) { UI.toast('Você já pegou o presente de hoje!'); return; }
      if (p.tipo === 'bau') mostrarBau('madeira', p.abertura);
      else UI.toast(p.tipo === 'ouro' ? `🪙 +${fmt(p.qtd)} de ouro!` : `💎 +${p.qtd} gemas!`);
      tudo();
    };

    const ofertas = Estado.ofertasDoDia();
    $('ofertas').innerHTML = ofertas.length ? '' : '<p class="aviso" style="grid-column:1/-1">Abra seus baús iniciais para liberar as ofertas!</p>';
    $('ofertas').innerHTML += ofertas.map((o) => {
      const c = Estado.carta(o.id);
      const comprada = d().ofertas.compradas.includes(o.i);
      return `<button class="oferta${comprada ? ' comprado' : ''}${o.gratis ? ' gratis' : ''}" style="--rar:${COR_RAR[c.raridade]}" data-i="${o.i}">
        ${o.gratis ? '<div class="faixa">Grátis</div>' : o.desconto ? '<div class="faixa desconto">-30%</div>' : ''}
        <div class="oferta-carta">${Cartas.html(c, { mini: true })}<span class="qtd">x${o.copias}</span></div>
        <div class="item-nome">${c.nome}</div>
        <div class="preco">${comprada ? 'Comprado' : o.gratis ? 'Pegar' : `<img class="ic-img" data-asset="ui/moeda" alt="" />${fmt(o.preco)}`}</div></button>`;
    }).join('');
    $('ofertas').querySelectorAll('button').forEach((el) => (el.onclick = () => {
      const o = ofertas[+el.dataset.i];
      if (d().ofertas.compradas.includes(o.i)) return UI.toast('Você já pegou essa oferta hoje');
      const c = Estado.carta(o.id);
      const pegar = () => {
        d().ouro -= o.preco;
        d().colecao[o.id].copias += o.copias;
        d().ofertas.compradas.push(o.i); Estado.salvar();
        UI.toast(`+${o.copias} ${c.nome}!`); tudo();
      };
      if (o.gratis) { pegar(); return; }
      UI.modal({
        titulo: 'Comprar oferta?',
        html: `<div class="compra">${Cartas.html(c, { mini: true })}<p><b>${o.copias} cópias</b> de ${c.nome} por ${fmt(o.preco)} de ouro.</p></div>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: d().ouro < o.preco, motivo: 'Ouro insuficiente', acao: pegar }],
      });
    }));

    const precosBau = { madeira: 10, prata: 40, ouro: 120, lendario: 500 };
    $('loja-baus').innerHTML = Object.keys(precosBau).map((t) => { const B = Estado.BAUS[t]; return `<button class="item-loja bau-loja b-${t}${t === 'ouro' ? ' destaque' : ''}" data-t="${t}">
      ${t === 'ouro' ? '<div class="faixa">Melhor oferta</div>' : t === 'lendario' ? '<div class="faixa faixa-lenda">✨ 10 LENDÁRIAS</div>' : ''}<img src="assets/ui/bau_${t}.svg" alt="" />
      <div class="item-nome">${B.nome}</div><small class="bau-info">${B.lendario ? '10 cartas lendárias · pode vir lendária nova!' : `${B.copias} cartas · ${Math.round(B.chanceNova * 100)}% de carta nova`}</small><div class="preco"><i class="ic-gema"></i>${precosBau[t]}</div></button>`; }).join('');
    { const faltam = Estado.disponiveis().some((c) => c.raridade === 'lendaria' && !Estado.tem(c.id));
      const n = Estado.baisAteLendaria();
      $('loja-baus').insertAdjacentHTML('beforeend', faltam ? `<div class="garantia-lenda">✨ Lendária nova garantida em até <b>${n} ${n === 1 ? 'baú' : 'baús'}</b></div>` : ''); }
    $('loja-baus').querySelectorAll('button').forEach((el) => (el.onclick = () => {
      const t = el.dataset.t, p = precosBau[t], B = Estado.BAUS[t];
      UI.modal({ titulo: `Comprar ${B.nome.toLowerCase()}?`, html: `<img class="bau-aberto" src="assets/ui/bau_${t}.svg" alt="" /><p>Abre na hora: <b>${B.copias} cartas${B.lendario ? ' lendárias' : ''}</b> e até <b>${B.ouro[1]} de ouro</b>.<br><small>${B.lendario ? 'A primeira é uma lendária que você ainda não tem (se faltar alguma)! Lendárias no máximo viram Coringa Lendário.' : `${Math.round(B.chanceNova * 100)}% de chance de uma carta nova.`}</small></p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: `Comprar · ${p} 💎`, classe: 'principal', desativado: d().gemas < p, motivo: 'Gemas insuficientes',
          acao: () => { d().gemas -= p; mostrarBau(t, Estado.abrirBau(t)); } }] });
    }));

    const pacotes = [[500, 20, 1], [2000, 70, 2], [6000, 180, 3]];
    $('loja-ouro').innerHTML = pacotes.map(([o, g, n], i) => `<button class="item-loja ouro-loja" data-i="${i}"><img data-asset="ui/ouro_${n}" alt="" />
      <div class="item-nome">${fmt(o)}</div><div class="preco"><i class="ic-gema"></i>${g}</div></button>`).join('');
    $('loja-ouro').querySelectorAll('button').forEach((el) => (el.onclick = () => {
      const [o, g] = pacotes[+el.dataset.i];
      UI.modal({ titulo: 'Comprar ouro?', html: `<p>${fmt(o)} de ouro por ${g} gemas.</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: d().gemas < g, motivo: 'Gemas insuficientes',
          acao: () => { d().gemas -= g; d().ouro += o; Estado.salvar(); UI.toast(`+${fmt(o)} de ouro!`); tudo(); } }] });
    }));
    Assets.fill($('loja-baus').closest('.tela'));
  }

  // ---------- Cartas ----------
  let trocando = null;
  // ---------- Torres ----------
  function painelTorres() {
    const m = Estado.minhasTorres(), tropa = Estado.TROPAS_TORRE[m.tropa];
    const pode = Estado.podeEvoluirTorre();
    $('painel-torres').innerHTML = `<div class="torre-mini rei"><img data-asset="arena/torre_rei_azul" alt="" /><span class="nv-torre-grande">${m.rei}</span><b>Torre do Rei</b></div>
      <div class="torre-mini"><img data-asset="arena/torre_azul" alt="" /><span class="nv-torre-grande">${m.princesa}</span><b>Princesas</b></div>
      <div class="torre-mini mini-tropa"><span class="tropa-emoji">${tropa.img ? `<img class="tropa-img" src="${tropa.img}" alt="" />` : tropa.emoji}</span><b>${tropa.nome}</b></div>
      <div class="torre-acao${pode.ok ? ' pode' : ''}">${pode.ok ? `Evoluir<small><img class="ic-img" data-asset="ui/moeda" alt="" /> ${fmt(pode.preco)}</small>` : 'Ver torres'}</div>`;
    $('painel-torres').onclick = telaTorres;
    Assets.fill();
  }

  function linhaStats(st, prox) {
    const dps = (x) => Math.round(x.dano / x.cadencia);
    const item = (rot, a, b) => `<div><span>${rot}</span><b>${fmt(a)}${b !== undefined && b !== a ? ` <em>+${fmt(b - a)}</em>` : ''}</b></div>`;
    return `<div class="stats-torre">${item('❤️ Vida', st.vida, prox && prox.vida)}${item('⚔️ Dano', st.dano, prox && prox.dano)}${item('🔥 Dano/s', dps(st), prox && dps(prox))}${item('🎯 Alcance', st.alcance)}</div>`;
  }

  function telaTorres() {
    const m = Estado.minhasTorres(), pode = Estado.podeEvoluirTorre();
    const rei = Estado.statsTorre('rei', m), prin = Estado.statsTorre('princesa', m);
    const proxPrin = m.princesa < Estado.NIVEL_MAX ? Estado.statsTorre('princesa', { ...m, princesa: m.princesa + 1 }) : null;
    const proxRei = m.rei < Estado.NIVEL_MAX ? Estado.statsTorre('rei', { ...m, rei: m.rei + 1 }) : null;
    const precoTxt = m.princesa >= Estado.NIVEL_MAX ? 'Nível máximo! 👑' : pode.ok ? `Evoluir · ${fmt(pode.preco)} 🪙` : pode.motivo === 'Ouro insuficiente' ? `Evoluir · ${fmt(Estado.TORRE_OURO[m.princesa])} 🪙` : pode.motivo;
    const md = UI.modal({
      titulo: '🏰 Suas torres',
      classe: 'modal-torres',
      html: `<div class="bloco-torre">
          <div class="bt-topo"><img data-asset="arena/torre_rei_azul" alt="" /><div><b>Torre do Rei</b><span class="nv-chip">Nível ${m.rei}</span>
            <small>Sobe sozinha junto com o seu nível de rei. Ganhe XP jogando e evoluindo cartas!</small></div></div>
          ${linhaStats(rei, proxRei)}
          ${proxRei ? `<p class="dica-torre">No nível de rei ${m.rei + 1} ela fica com os valores em verde.</p>` : ''}
        </div>
        <div class="bloco-torre">
          <div class="bt-topo"><img data-asset="arena/torre_azul" alt="" /><div><b>Torres das Princesas</b><span class="nv-chip">Nível ${m.princesa}</span>
            <small>Evolua com ouro. O nível máximo é o nível da sua Torre do Rei.</small></div></div>
          ${linhaStats(prin, proxPrin)}
          <button class="btn-modal ${pode.ok ? 'principal' : 'desativado'}" id="evoluir-torre">${precoTxt}</button>
        </div>
        <div class="titulo-conquistas">Tropa das torres</div>
        <div class="tropas-torre">${Object.entries(Estado.TROPAS_TORRE).map(([id, t]) => {
          const livre = m.rei >= t.rei, st = Estado.statsTorre('princesa', { ...m, tropa: id });
          return `<button class="tropa-torre${id === m.tropa ? ' escolhida' : ''}${livre ? '' : ' trancada'}" data-tropa="${id}">
            <span class="tropa-emoji">${!livre ? '🔒' : t.img ? `<img class="tropa-img" src="${t.img}" alt="" />` : t.emoji}</span><b>${t.nome}</b>
            <small>${livre ? t.desc : `Libera no nível de rei ${t.rei}`}</small>
            ${livre ? `<span class="tropa-num">❤️ ${fmt(st.vida)} · ⚔️ ${fmt(st.dano)} · 🔥 ${Math.round(st.dano / st.cadencia)}/s</span>` : ''}
            ${id === m.tropa ? '<i class="tag-escolhida">Em uso</i>' : ''}</button>`;
        }).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    });
    Assets.fill();
    md.el.querySelector('#evoluir-torre').onclick = () => {
      const r = Estado.evoluirTorre();
      if (!r.ok) { UI.toast(r.motivo === 'Nível máximo' ? 'Suas torres já estão no máximo! 👑' : r.motivo); return; }
      md.fechar(); topo(); cartas();
      torreEvoluiu(r.nivel);
    };
    md.el.querySelectorAll('[data-tropa]').forEach((b) => (b.onclick = () => {
      const t = Estado.TROPAS_TORRE[b.dataset.tropa];
      if (!Estado.escolherTropaTorre(b.dataset.tropa)) { UI.toast(`Libera no nível de rei ${t.rei}! 🔒`); return; }
      UI.toast(`${t.emoji} ${t.nome} vai defender suas torres!`);
      md.fechar(); cartas(); telaTorres();
    }));
  }

  function torreEvoluiu(nivel) {
    const fundo = document.createElement('div');
    fundo.className = 'level-up torre-up';
    fundo.innerHTML = `<div class="raios"></div>
      <div class="level-conteudo">
        <div class="level-texto">Torres evoluídas!</div>
        <div class="torre-up-img"><img data-asset="arena/torre_azul" alt="" /><span class="nv-torre-grande">${nivel}</span></div>
        <div class="level-premio">Mais vida e mais dano 💪</div>
        <button class="btn-modal principal">Oba!</button>
      </div>
      ${Array.from({ length: 24 }, (_, i) => `<i class="confete" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--c:${['#FAC775', '#85B7EB', '#5DCAA5', '#AFA9EC'][i % 4]};--r:${Math.round(Math.random() * 360)}deg"></i>`).join('')}`;
    document.getElementById('app').appendChild(fundo);
    Assets.fill();
    fundo.querySelector('button').onclick = () => { fundo.classList.add('sumir'); setTimeout(() => fundo.remove(), 250); };
  }

  // faixa do Zenkai na coleção: quem já despertou e quando chegam as próximas
  function zenkaiAviso() {
    const lib = Estado.zenkaiLiberadas(), ordem = Estado.ZENKAI_ORDEM;
    const novas = ordem.slice(Math.max(0, lib - 2), lib), prox = ordem.slice(lib, lib + 2);
    const diasProx = Math.ceil(((Estado.ZENKAI_INICIO + Math.ceil(lib / 2) * 3 * 86400000) - Date.now()) / 86400000);
    const nome = (id) => (Estado.carta(id) ? Estado.carta(id).nome : id);
    const libR = Estado.zenkaiRarasLiberadas(), rr = Estado.ZENKAI_RARAS, novasR = rr.slice(Math.max(0, libR - 2), libR);
    return `<div class="zenkai-faixa" style="grid-column:1/-1"><b>⚡ ZENKAI</b><span>Novas: <em>${novas.map(nome).join(' e ')}</em>${prox.length ? ` · Próximas em ${diasProx} dia${diasProx === 1 ? '' : 's'}: ${prox.map(nome).join(' e ')}` : ''}</span><span>Raras novas: <em>${novasR.map(nome).join(' e ')}</em></span><small>Cartas com Zenkai no nível ${Estado.NIVEL_MAX} usam as cópias extras pra despertar (até +15%).</small></div>`;
  }
  // ---------- vários decks (igual ao Clash) ----------
  const N_DECKS = 5;
  function prepararDecks() {
    const dd = d();
    if (!Array.isArray(dd.decks) || dd.decks.length !== N_DECKS) {
      const velhos = Array.isArray(dd.decks) ? dd.decks : [];
      dd.decks = Array.from({ length: N_DECKS }, (_, i) => Array.isArray(velhos[i]) ? velhos[i] : []);
    }
    if (!Number.isInteger(dd.deckAtivo) || dd.deckAtivo < 0 || dd.deckAtivo >= N_DECKS) dd.deckAtivo = 0;
    dd.decks[dd.deckAtivo] = [...dd.deck];
  }
  function trocarDeck(i) {
    const dd = d();
    prepararDecks();
    if (i === dd.deckAtivo) return;
    dd.decks[dd.deckAtivo] = [...dd.deck];
    dd.deckAtivo = i;
    // só entram cartas que a pessoa tem (e que não estão esgotadas)
    dd.deck = (dd.decks[i] || []).filter((id) => Estado.carta(id) && Estado.tem(id) && !(dd.esgotadas || []).includes(id)).slice(0, 8);
    dd.decks[i] = [...dd.deck];
    Estado.salvar();
    cartas();
    if (typeof Som !== 'undefined') Som.tocar('clique');
  }
  function copiarDeck() {
    const dd = d();
    prepararDecks();
    const livres = dd.decks.map((dk, i) => (i !== dd.deckAtivo && !dk.length ? i : -1)).filter((i) => i >= 0);
    UI.modal({
      titulo: '📋 Copiar este deck',
      html: `<p>Copiar o <b>Deck ${dd.deckAtivo + 1}</b> pra qual slot? O deck que estiver lá será trocado.</p>
        <div class="deck-copiar">${Array.from({ length: N_DECKS }, (_, i) => i === dd.deckAtivo ? '' : `<button class="btn-modal secundario" data-copiar="${i}">Deck ${i + 1}${livres.includes(i) ? ' (vazio)' : ''}</button>`).join('')}</div>`,
      botoes: [{ texto: 'Cancelar' }],
    });
    document.querySelectorAll('[data-copiar]').forEach((b) => (b.onclick = () => {
      dd.decks[+b.dataset.copiar] = [...dd.deck]; Estado.salvar();
      document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
      UI.toast(`Deck copiado pro slot ${+b.dataset.copiar + 1}!`);
      cartas();
    }));
  }
  function abasDeck() {
    const el = $('deck-abas');
    if (!el) return;
    prepararDecks();
    const dd = d();
    el.innerHTML = dd.decks.map((dk, i) => `<button class="deck-aba${i === dd.deckAtivo ? ' ativa' : ''}${dk.length ? '' : ' vazia'}" data-deck="${i}"><b>${i + 1}</b>${dk.length === 8 ? '' : `<small>${dk.length}/8</small>`}</button>`).join('')
      + '<button class="deck-aba copiar" id="deck-copiar" title="Copiar deck">📋</button>';
    el.querySelectorAll('[data-deck]').forEach((b) => (b.onclick = () => trocarDeck(+b.dataset.deck)));
    $('deck-copiar').onclick = copiarDeck;
  }

  function cartas() {
    const deck = d().deck;
    const etiqueta = (id) => {
      const col = d().colecao[id];
      const u = Estado.usosRestantes(id);
      if (u !== null) return `Nível ${col.nivel} · ${u} partida${u === 1 ? '' : 's'}`;
      const cz = Estado.cansaco(id);
      if (cz) return `😴 ${cz === 2 ? 'Exausto' : 'Cansado'} · Nv ${Estado.nivelEfetivo(id)}`;
      return col.nivel >= Estado.NIVEL_MAX ? `Nível ${col.nivel} · máx` : `Nível ${col.nivel}`;
    };
    const barraCopias = (id) => {
      const col = d().colecao[id];
      if (col.nivel >= Estado.NIVEL_MAX) return '';
      const prec = Estado.copiasNivel(id, col.nivel);
      const pode = Estado.podeEvoluir(id).ok;
      // tem as cópias, mas falta ouro: mostra quanto ouro precisa (antes parecia que era só tocar)
      const semOuro = !pode && col.copias >= prec;
      return `<div class="copias${pode ? ' pode' : ''}${semOuro ? ' sem-ouro' : ''}"><i style="width:${Math.min(100, (col.copias / prec) * 100)}%"></i><b>${pode ? 'Evoluir!' : semOuro ? `🪙 ${fmt(Estado.ouroNivel(id, col.nivel))}` : `${col.copias}/${prec}`}</b></div>`;
    };
    painelTorres();
    abasDeck();
    $('deck').innerHTML = Array.from({ length: 8 }, (_, i) => {
      const id = deck[i];
      if (!id) return `<div class="slot-carta vazio-deck" data-slot="${i}"><div class="slot-deck">+</div><div class="carta-nivel">&nbsp;</div></div>`;
      return Cartas.html(Estado.carta(id), { nivel: etiqueta(id), extra: barraCopias(id) });
    }).join('');
    const media = deck.length ? deck.reduce((s, id) => s + Estado.carta(id).custo, 0) / deck.length : 0;
    $('elixir-medio').textContent = deck.length ? media.toFixed(1).replace('.', ',') : '–';

    const fora = Estado.catalogo().filter((c) => !deck.includes(c.id) && Estado.tem(c.id));
    const aDescobrir = Estado.catalogo().filter((c) => !Estado.tem(c.id));
    const temTotal = Estado.catalogo().filter((c) => Estado.tem(c.id)).length;
    $('colecao').innerHTML = zenkaiAviso() + (fora.length
      ? fora.map((c) => Cartas.html(c, { nivel: etiqueta(c.id), extra: barraCopias(c.id) })).join('')
      : '<p class="aviso" style="grid-column:1/-1">Todas as suas cartas desbloqueadas estão no deck.</p>')
      + (aDescobrir.length ? `<div class="divisor-colecao">A descobrir · ${temTotal}/${Estado.catalogo().length} desbloqueadas</div>` : '')
      + aDescobrir.map((c) => {
        const lib = Estado.liberada(c.id);
        return lib
          ? `<div class="slot-carta bloqueada-carta" data-id="${c.id}">${Cartas.html(c, { mini: true, extra: '<span class="cadeado">🎁</span>' })}<div class="carta-nivel">Nos baús</div></div>`
          : `<div class="slot-carta trancada-carta" data-id="${c.id}"><div class="carta-silhueta">🔒</div><div class="carta-nivel">${c.trofeus} troféus</div></div>`;
      }).join('');
    $('aviso-colecao').textContent = trocando
      ? `Toque numa carta do deck para trocar por ${Estado.carta(trocando).nome}.`
      : 'Segure uma carta e arraste até o deck pra trocar 👆 · Toque pra ver detalhes ou evoluir.';
    document.querySelector('.painel-deck').classList.toggle('trocando', !!trocando);

    $('deck').querySelectorAll('.slot-carta').forEach((el) => (el.onclick = () => {
      if (trocando) {
        const i = el.dataset.slot !== undefined ? +el.dataset.slot : deck.indexOf(el.dataset.id);
        if (i >= deck.length) deck.push(trocando); else deck[i] = trocando;
        trocando = null; Estado.salvar(); cartas(); UI.toast('Deck atualizado!');
        return;
      }
      if (el.dataset.id) detalhes(el.dataset.id);
    }));
    $('colecao').querySelectorAll('.slot-carta').forEach((el) => (el.onclick = () => {
      trocando = null;
      const id = el.dataset.id;
      if (Estado.tem(id)) return detalhes(id);
      const c = Estado.carta(id);
      if (Estado.liberada(id)) UI.modal({ titulo: c.nome, html: `<div class="compra">${Cartas.html(c, { mini: true })}<p>${Cartas.NOMES_RARIDADE[c.raridade]} · ${c.tipo}<br>Já pode aparecer nos <b>baús</b> e nas <b>ofertas da loja</b>. Ganhe a primeira cópia para desbloquear!</p></div>` });
      else UI.modal({ titulo: 'Carta misteriosa', html: `<div class="carta-silhueta grande">🔒</div><p>Chegue a <b>${c.trofeus} troféus</b> para liberar esta carta.</p><p class="aviso">Você tem ${d().recorde} de recorde.</p>` });
    }));
    ligarArrastar();
    if (trocando) setTimeout(() => document.querySelector('.painel-deck').scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  }

  // ---------- Segurar e arrastar cartas pro deck ----------
  // Segura a carta (~0,25s) e arrasta: da coleção pra um espaço do deck (troca), entre espaços do deck (muda a ordem)
  // ou do deck pra coleção (tira). A tela rola sozinha quando você chega perto da borda.
  let arrasto = null, ignorarClique = false;
  function rolavel(el) {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const st = getComputedStyle(p);
      if (/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight + 4) return p;
    }
    return document.scrollingElement;
  }
  function ligarArrastar() {
    const cartasArrastaveis = [...$('deck').querySelectorAll('.slot-carta[data-id]'), ...$('colecao').querySelectorAll('.slot-carta[data-id]')].filter((el) => Estado.tem(el.dataset.id));
    for (const el of cartasArrastaveis) {
      el.addEventListener('pointerdown', (ev) => {
        if (ev.button > 0 || arrasto) return;
        const x0 = ev.clientX, y0 = ev.clientY;
        const daDeck = !!el.closest('#deck');
        let timer = setTimeout(() => comecar(), 260);
        const cancelar = () => { clearTimeout(timer); timer = null; document.removeEventListener('pointermove', cedo); document.removeEventListener('pointerup', cancelar); };
        // mexeu antes do tempo: é rolagem da tela, não arrasto
        const cedo = (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 9) cancelar(); };
        document.addEventListener('pointermove', cedo);
        document.addEventListener('pointerup', cancelar, { once: true });
        const comecar = () => {
          cancelar();
          const r = el.getBoundingClientRect();
          const fantasma = el.cloneNode(true);
          fantasma.className += ' fantasma-deck';
          Object.assign(fantasma.style, { width: `${r.width}px`, left: `${x0 - r.width / 2}px`, top: `${y0 - r.height * 0.6}px` });
          document.body.appendChild(fantasma);
          el.classList.add('arrastando-origem');
          document.body.classList.add('arrastando-carta');
          try { navigator.vibrate && navigator.vibrate(25); } catch (e) { /* nada */ }
          arrasto = { id: el.dataset.id, daDeck, slot: daDeck ? d().deck.indexOf(el.dataset.id) : -1, fantasma, el, alvo: null, x: x0, y: y0, rolar: rolavel(el), w: r.width, h: r.height };
          arrasto.loop = requestAnimationFrame(rolarSozinho);
        };
      });
      el.addEventListener('click', (e) => { if (ignorarClique) { e.stopImmediatePropagation(); e.preventDefault(); ignorarClique = false; } }, true);
    }
  }
  function alvoEm(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const slot = el.closest('#deck .slot-carta');
    if (slot) return { tipo: 'deck', el: slot, i: slot.dataset.slot !== undefined ? +slot.dataset.slot : d().deck.indexOf(slot.dataset.id) };
    if (el.closest('#colecao, .painel-colecao')) return { tipo: 'colecao', el: $('colecao') };
    return null;
  }
  function rolarSozinho() {
    if (!arrasto) return;
    const a = arrasto, h = window.innerHeight;
    const borda = 110;
    if (a.y < borda) a.rolar.scrollTop -= (borda - a.y) * 0.25;
    else if (a.y > h - borda) a.rolar.scrollTop += (a.y - (h - borda)) * 0.25;
    a.loop = requestAnimationFrame(rolarSozinho);
  }
  document.addEventListener('pointermove', (e) => {
    if (!arrasto) return;
    const a = arrasto;
    a.x = e.clientX; a.y = e.clientY;
    a.fantasma.style.left = `${a.x - a.w / 2}px`;
    a.fantasma.style.top = `${a.y - a.h * 0.6}px`;
    const alvo = alvoEm(a.x, a.y);
    if (a.alvo && (!alvo || alvo.el !== a.alvo.el)) a.alvo.el.classList.remove('alvo-arrasto');
    if (alvo && !(alvo.tipo === 'colecao' && !a.daDeck)) alvo.el.classList.add('alvo-arrasto');
    a.alvo = alvo;
  });
  // enquanto arrasta, o dedo não rola a tela (quem rola é a borda)
  document.addEventListener('touchmove', (e) => { if (arrasto) e.preventDefault(); }, { passive: false });
  const soltar = () => {
    if (!arrasto) return;
    const a = arrasto;
    arrasto = null;
    cancelAnimationFrame(a.loop);
    a.fantasma.remove();
    a.el.classList.remove('arrastando-origem');
    document.body.classList.remove('arrastando-carta');
    document.querySelectorAll('.alvo-arrasto').forEach((x) => x.classList.remove('alvo-arrasto'));
    ignorarClique = true; setTimeout(() => (ignorarClique = false), 350);
    const deck = d().deck, alvo = a.alvo;
    if (!alvo) return;
    if (alvo.tipo === 'deck') {
      if (a.daDeck) {
        if (alvo.i === a.slot || alvo.i < 0) return;
        const j = Math.min(alvo.i, deck.length - 1);
        [deck[a.slot], deck[j]] = [deck[j], deck[a.slot]];
      } else if (alvo.i >= deck.length || alvo.i < 0) deck.push(a.id);
      else deck[alvo.i] = a.id;
      trocando = null;
      Estado.salvar(); cartas();
      UI.toast(a.daDeck ? 'Ordem do deck trocada!' : `${Estado.carta(a.id).nome} entrou no deck!`);
      return;
    }
    if (alvo.tipo === 'colecao' && a.daDeck) {
      if (deck.length <= 1) { UI.toast('O deck precisa de pelo menos 1 carta'); return; }
      d().deck = deck.filter((x) => x !== a.id);
      Estado.salvar(); cartas();
      UI.toast(`${Estado.carta(a.id).nome} saiu do deck`);
    }
  };
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);

  function detalhes(id) {
    const c = Estado.stats(id);
    const col = d().colecao[id];
    const noDeck = d().deck.includes(id);
    const ev = Estado.podeEvoluir(id);
    const mini = c.barril ? Estado.stats(c.barril.tropa, col.nivel) : null;
    const linhas = c.barril
      ? [['Minis', c.barril.qtd], ['Vida de cada', Math.round(mini.vida)], ['Dano de cada', Math.round(mini.dano)], ['Velocidade', 'Muito rápida'], ['Onde jogar', 'Qualquer lugar']]
      : c.feitico
      ? [['Dano', c.dano], ['Dano em torres', Math.round(c.dano * 0.35)], ['Raio', c.area]]
      : [['Vida', c.vida], ['Dano', c.dano], ['Velocidade', c.velocidade >= 55 ? 'Rápida' : c.velocidade >= 40 ? 'Média' : 'Lenta'],
         ['Alcance', c.alcance > 100 ? 'Muito longo (mais que as torres!)' : c.alcance > 40 ? 'Longo' : 'Corpo a corpo'], ['Ataque a cada', `${c.cadencia}s`], ['Alvo', c.alvo === 'construcoes' ? 'Torres' : 'Tudo'],
         ...(c.area ? [['Dano em área', 'Sim']] : []), ...(c.usos ? [['Partidas restantes', `${Estado.usosRestantes(id)} de ${c.usos}`]] : [])];
    const botoes = [];
    if (noDeck) botoes.push({ texto: 'Tirar do deck', classe: 'secundario', desativado: d().deck.length <= 1, motivo: 'O deck precisa de pelo menos 1 carta',
      acao: () => { d().deck = d().deck.filter((x) => x !== id); Estado.salvar(); cartas(); } });
    else botoes.push({ texto: 'Usar no deck', classe: 'secundario', acao: () => {
      if (d().deck.length < 8) { d().deck.push(id); Estado.salvar(); cartas(); UI.toast('Carta adicionada ao deck!'); }
      else { trocando = id; cartas(); irPara('cartas'); }
    } });
    const zk = Estado.zenkai(id);
    if (zk.ativo && col.nivel >= Estado.NIVEL_MAX && zk.z < zk.max) {
      const pode = (col.copias || 0) >= zk.copias && d().ouro >= zk.ouro;
      botoes.push({ texto: `⚡ Zenkai ${zk.z + 1} · ${fmt(zk.ouro)} ouro`, classe: 'principal zenkai-btn', desativado: !pode, motivo: (col.copias || 0) < zk.copias ? `Faltam cópias (${col.copias || 0}/${zk.copias})` : `Falta ouro (${fmt(zk.ouro)})`,
        acao: () => { const antes = Estado.stats(id); const r = Estado.despertarZenkai(id); if (!r.ok) { UI.toast(r.motivo); return; } tudo(); zenkaiDespertou(id, antes, r.z); } });
    }
    if (col.nivel < Estado.NIVEL_MAX) botoes.push({ texto: `Evoluir · ${fmt(Estado.ouroNivel(id, col.nivel))} ouro`, classe: 'principal', desativado: !ev.ok, motivo: ev.motivo,
      acao: () => {
        const antes = Estado.stats(id);
        const r = Estado.evoluir(id);
        tudo();
        cartaEvoluiu(id, antes, () => subiuNivel(r.niveis));
      } });
    UI.modal({
      titulo: c.nome,
      classe: `modal-carta${c.evolucao ? ' modal-evo' : ''}`,
      html: `<div class="detalhe-carta">${c.evolucao ? `<div class="evo-palco"><video class="evo-video" src="assets/evolucao/raios.mp4" autoplay muted loop playsinline></video>${Cartas.html(c, { mini: true, vivo: true })}</div>` : Cartas.html(c, { mini: true, vivo: true })}
        <div><span class="raridade-tag ${c.evolucao ? 'evo' : c.raridade}">${c.evolucao ? '🧬 Evolução' : Cartas.NOMES_RARIDADE[c.raridade]}</span>
        <p class="tipo">${c.tipo} · ${c.custo} de elixir</p><p>${c.descricao}</p>
        <p class="aviso">Nível ${col.nivel} · cópias ${col.copias}${col.nivel < Estado.NIVEL_MAX ? `/${Estado.copiasNivel(c, col.nivel)}` : ''}</p></div></div>
        <div class="tabela-stats">${linhas.map(([k, v]) => `<div><span>${k}</span><b>${typeof v === 'number' ? fmt(v) : v}</b></div>`).join('')}</div>
        ${infoClasse(c)}
        ${c.evolucao ? `<div class="hab-detalhe evo-detalhe"><b>🧬 ${c.evolucao.nome}</b><br><small>${c.evolucao.descricao}</small></div>` : ''}
        ${c.habilidade ? `<div class="hab-detalhe"><b>⚡ ${c.habilidade.nome}</b> · ${c.habilidade.custo} de elixir<br><small>${c.habilidade.descricao} Durante a batalha, toque no botão da habilidade que aparece na arena.</small></div>` : ''}
        ${c.passiva ? `<div class="hab-detalhe passiva"><b>${c.passiva.tipo === 'esquiva' ? '✨' : '🧩'} ${c.passiva.nome}</b> · passiva (automática)<br><small>${c.passiva.descricao}</small></div>` : ''}
        ${zk.ativo ? `<div class="zenkai-detalhe"><b>⚡ ZENKAI</b><span class="zk-estrelas">${Array.from({ length: zk.max }, (_, i) => `<i class="${i < zk.z ? 'ok' : ''}">★</i>`).join('')}</span>
          <small>${zk.z >= zk.max ? 'Zenkai máximo! +15% de vida e dano e ataca 10% mais rápido.' : col.nivel < Estado.NIVEL_MAX ? `Chegue no nível ${Estado.NIVEL_MAX} pra despertar o Zenkai. Cada estágio dá +2% de vida e dano; no Zenkai 7, +15% e ataque mais rápido.` : `Próximo estágio: ${zk.copias} cópias + ${fmt(zk.ouro)} ouro (você tem ${col.copias || 0} cópias). Bônus atual: +${Math.round(zk.bonus * 100)}%.`}</small></div>` : ''}`,
      botoes,
    });
  }
  function zenkaiDespertou(id, antes, z) {
    const c = Estado.stats(id);
    const el = document.createElement('div');
    el.className = 'zenkai-revela';
    el.innerHTML = `<div class="zkr-raios"></div><div class="zkr-conteudo"><small>DESPERTAR ZENKAI</small><b class="zkr-titulo">ZENKAI ${z}</b>
      <div class="zkr-carta">${Cartas.html(c, { mini: true })}</div>
      <p>${esc(c.nome)}${z >= 7 ? ' chegou no Zenkai máximo!' : ' despertou!'}</p>
      <div class="zkr-stats"><span>❤️ ${fmt(antes.vida)} → <b>${fmt(c.vida)}</b></span><span>⚔️ ${fmt(antes.dano)} → <b>${fmt(c.dano)}</b></span>${z >= 7 ? '<span>⚡ Ataque 10% mais rápido</span>' : ''}</div>
      <button class="btn-modal principal">Incrível!</button></div>`;
    document.getElementById('app').appendChild(el);
    if (typeof Som !== 'undefined') Som.tocar('patente');
    el.querySelector('button').onclick = () => { el.classList.add('sumir'); setTimeout(() => el.remove(), 250); };
  }

  // classe, counters e ataque especial da carta
  function infoClasse(c) {
    const k = Ataques.classeDe(c);
    if (!k) return '';
    const C = Ataques.CLASSES, a = Ataques.de(c);
    const nomes = (l) => l.map((x) => `${C[x].ic} ${C[x].nome}`).join(', ') || '—';
    return `<div class="info-classe">
      <div class="info-cl-topo"><span>${C[k].ic}</span><b>${C[k].nome}</b><small>${C[k].desc}</small></div>
      <div class="contra"><span class="forte">💪 Forte contra: ${k === 'tanque' && !Ataques.fortes(k).length ? '🏰 Torres' : nomes(Ataques.fortes(k))}</span><span class="fraco">⚠️ Fraco contra: ${nomes(Ataques.fracos(k))}</span></div>
      ${a.d ? `<div class="ataque-unico">🎯 <b>Ataque:</b> ${a.d}</div>` : ''}
    </div>`;
  }

  function cartaEvoluiu(id, antes, depois) {
    const c = Estado.stats(id);
    let linhas;
    if (c.barril) {
      const m0 = Estado.stats(c.barril.tropa, antes.nivel), m1 = Estado.stats(c.barril.tropa, c.nivel);
      linhas = [['Vida das minis', m0.vida, m1.vida], ['Dano das minis', m0.dano, m1.dano]];
    } else linhas = c.feitico ? [['Dano', antes.dano, c.dano]] : [['Vida', antes.vida, c.vida], ['Dano', antes.dano, c.dano]];
    UI.modal({
      classe: 'modal-evolucao',
      html: `<div class="evo-raios"></div>
        <div class="evo-carta">${Cartas.html(c, { mini: true })}</div>
        <div class="evo-nivel"><span>Nível ${antes.nivel}</span><b>→</b><span class="novo">Nível ${c.nivel}</span></div>
        <div class="evo-stats">${linhas.map(([k, a, b]) => `<div><span>${k}</span><b>${UI.fmt(a)}</b><i>→</i><b class="novo">${UI.fmt(b)}</b><small>+${UI.fmt(b - a)}</small></div>`).join('')}</div>`,
      titulo: `${c.nome} evoluiu!`,
      botoes: [{ texto: 'Incrível!', classe: 'principal', acao: () => { if (depois) setTimeout(depois, 250); } }],
    });
  }

  // ---------- Clã ----------
  let busca = '';
  let abaCla = 'chat';
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escudo = (c) => `<div class="escudo" style="background:${c.cor}">${esc(c.letra || '?')}</div>`;
  const erroNuvem = (e) => (String(e && (e.code || e.message)).includes('permission')
    ? 'O Firebase recusou o acesso. Confira se as regras novas foram publicadas.'
    : `Não foi possível carregar (${esc((e && (e.code || e.message)) || 'erro')}).`);

  async function cla() {
    const caixa = $('cla-conteudo');
    Cla.pararOuvir();
    if (!Conta.logado()) {
      caixa.innerHTML = `<h2 class="titulo-secao"><span>Clãs</span></h2>
        <div class="cla-vazio"><div class="cla-icone">🛡️</div><p>Clãs são de <b>jogadores de verdade</b>: dá pra conversar e ver os troféus de todo mundo.</p>
        <p class="aviso">Para criar ou entrar num clã, você precisa de uma conta.</p>
        <button class="btn-modal btn-google" id="cla-google"><b>G</b> Entrar com Google</button>
        <button class="btn-modal secundario" id="cla-conta">Criar conta ou entrar com e-mail</button></div>`;
      $('cla-google').onclick = async () => { if (await Conta.salvarComGoogle()) tudo(); };
      $('cla-conta').onclick = async () => { await Conta.tela({ podeFechar: true }); tudo(); };
      return;
    }
    if (d().cla && d().cla.id) return meuCla(caixa);

    caixa.innerHTML = `<h2 class="titulo-secao"><span>Clãs</span></h2>
      <button class="btn-modal principal" id="criar-cla">＋ Criar meu clã</button>
      <div class="busca-linha"><input class="busca" id="busca-cla" type="text" placeholder="Buscar clã" value="${esc(busca)}" />
        <button class="btn-atualizar" id="atualizar-clas" title="Atualizar lista">🔄</button></div>
      <div class="lista-clas" id="lista-clas"><p class="aviso">Carregando clãs…</p></div>`;
    $('criar-cla').onclick = criarCla;
    let todos = [];
    const desenhar = () => {
      const lista = todos.filter((x) => x.nome.toLowerCase().includes(busca.toLowerCase()));
      $('lista-clas').innerHTML = lista.map((x) => {
        const n = Object.keys(x.membros || {}).length;
        const tr = Object.values(x.membros || {}).reduce((a, m) => a + (m.trofeus || 0), 0);
        return `<div class="cla">${escudo(x)}<div class="cla-info"><b>${esc(x.nome)}</b><span>${n}/${Cla.MAX} membros · ${fmt(tr)} troféus</span>${x.descricao ? `<small>${esc(x.descricao)}</small>` : ''}</div>
          <button class="btn-peq" data-id="${x.id}" ${n >= Cla.MAX ? 'disabled' : ''}>${n >= Cla.MAX ? 'Cheio' : 'Entrar'}</button></div>`;
      }).join('') || `<p class="aviso">${todos.length ? 'Nenhum clã com esse nome.' : 'Ainda não existe nenhum clã. Crie o primeiro!'}</p>`;
      $('lista-clas').querySelectorAll('[data-id]').forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        try { await Cla.entrar(b.dataset.id); UI.toast(`Você entrou em ${d().cla.nome}! 🛡️`); cla(); }
        catch (e) { UI.toast(e.message && !e.code ? e.message : erroNuvem(e)); b.disabled = false; }
      }));
    };
    const campo = $('busca-cla');
    campo.oninput = () => { busca = campo.value; desenhar(); };
    const carregar = async () => {
      const b = $('atualizar-clas');
      b.classList.add('girando'); b.disabled = true;
      try { todos = await Cla.listar(); desenhar(); }
      catch (e) { $('lista-clas').innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
      b.classList.remove('girando'); b.disabled = false;
    };
    $('atualizar-clas').onclick = async () => { await carregar(); UI.toast('Lista de clãs atualizada!'); };
    await carregar();
  }

  function criarCla() {
    let cor = Cla.CORES[0];
    const m = UI.modal({
      titulo: 'Criar clã',
      html: `<label class="campo">Nome do clã<input id="cla-nome" maxlength="20" placeholder="Ex.: Coroas Brilhantes" /></label>
        <label class="campo">Descrição<input id="cla-desc" maxlength="60" placeholder="Opcional" /></label>
        <div class="seletor-titulo">Cor do escudo</div>
        <div class="grade-cores">${Cla.CORES.map((c, i) => `<button data-cor="${c}" class="${i ? '' : 'escolhido'}" style="background:${c}"></button>`).join('')}</div>`,
      botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Criar', classe: 'principal', acao: (el) => {
        const nome = el.querySelector('#cla-nome').value.trim();
        if (nome.length < 3) { UI.toast('O nome precisa ter pelo menos 3 letras'); return false; }
        const descricao = el.querySelector('#cla-desc').value.trim();
        Cla.criar({ nome, descricao, cor }).then(() => { UI.toast(`Clã ${nome} criado! 👑`); cla(); }).catch((e) => UI.toast(erroNuvem(e)));
      } }],
    });
    m.el.querySelectorAll('[data-cor]').forEach((b) => (b.onclick = () => {
      cor = b.dataset.cor;
      m.el.querySelectorAll('[data-cor]').forEach((x) => x.classList.toggle('escolhido', x === b));
    }));
  }

  async function meuCla(caixa) {
    caixa.innerHTML = '<p class="aviso">Carregando seu clã…</p>';
    let c;
    try { c = await Cla.buscar(d().cla.id); } catch (e) { caixa.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; return; }
    if (!c || !(c.membros || {})[Conta.uid()]) { // clã acabou ou fui removido
      d().cla = null; Estado.salvar(); UI.toast('Você não está mais nesse clã'); return cla();
    }
    const souLider = c.lider === Conta.uid();
    const membros = Object.entries(c.membros).map(([u, m]) => ({ u, ...m })).sort((a, b) => (b.trofeus || 0) - (a.trofeus || 0));
    const total = membros.reduce((a, m) => a + (m.trofeus || 0), 0);
    caixa.innerHTML = `<div class="cla-topo">${escudo(c)}<div><b>${esc(c.nome)}</b><span>${membros.length}/${Cla.MAX} membros · 🏆 ${fmt(total)}</span>${c.descricao ? `<small>${esc(c.descricao)}</small>` : ''}</div>
        <div class="cla-botoes"><button class="btn-atualizar" id="atualizar-meu-cla" title="Atualizar">🔄</button><button class="btn-peq perigo" id="sair-cla">Sair</button></div></div>
      <div class="conta-abas cla-abas"><button data-aba="chat" class="${abaCla === 'chat' ? 'ativa' : ''}">💬 Chat</button><button data-aba="membros" class="${abaCla === 'membros' ? 'ativa' : ''}">👥 Membros</button></div>
      <div id="cla-aba"></div>`;
    caixa.querySelectorAll('.cla-abas button').forEach((b) => (b.onclick = () => { abaCla = b.dataset.aba; meuCla(caixa); }));
    $('atualizar-meu-cla').onclick = () => { meuCla(caixa); UI.toast('Clã atualizado!'); };
    $('sair-cla').onclick = () => UI.modal({ titulo: 'Sair do clã?', html: `<p>Você vai sair de ${esc(c.nome)}.${souLider && membros.length > 1 ? ' Outro membro vira líder.' : ''}${membros.length === 1 ? ' Você é o último membro, então o clã será apagado.' : ''}</p>`,
      botoes: [{ texto: 'Ficar', classe: 'secundario' }, { texto: 'Sair', classe: 'perigo', acao: () => { Cla.sair().then(() => { UI.toast('Você saiu do clã'); cla(); }).catch((e) => UI.toast(erroNuvem(e))); } }] });

    const aba = $('cla-aba');
    if (abaCla === 'membros') {
      aba.innerHTML = `<div class="lista-membros">${membros.map((m, i) => `<div class="membro${m.u === Conta.uid() ? ' voce' : ''}" data-perfil="${m.u}"><span class="pos">${i + 1}</span>
        <b>${Passe.nomeHtml(m.nome || 'Jogador', m.estiloNome)}${m.u === Conta.uid() ? ' (você)' : ''}</b>${m.u === c.lider ? '<span class="tag-lider">Líder</span>' : ''}
        <span><i class="ic-trofeu"></i> ${fmt(m.trofeus || 0)}</span>${souLider && m.u !== Conta.uid() ? `<button class="btn-expulsar" data-u="${m.u}" title="Remover">✕</button>` : ''}</div>`).join('')}</div>`;
      ligarPerfis(aba);
      aba.querySelectorAll('[data-u]').forEach((b) => (b.onclick = (ev) => ev.stopPropagation() || UI.modal({ titulo: 'Remover do clã?', html: `<p>${esc(c.membros[b.dataset.u].nome)} vai sair do clã.</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Remover', classe: 'perigo', acao: () => { Cla.expulsar(c.id, b.dataset.u).then(() => meuCla(caixa)).catch((e) => UI.toast(erroNuvem(e))); } }] })));
      return;
    }
    aba.innerHTML = `<div class="chat" id="chat"><p class="aviso">Carregando mensagens…</p></div>
      <form class="chat-enviar" id="chat-form"><input id="chat-texto" maxlength="200" placeholder="Escreva uma mensagem" autocomplete="off" /><button class="btn-peq">Enviar</button></form>
      <p class="aviso">Seja gentil 💕 Todos do clã veem as mensagens.</p>`;
    Cla.ouvirChat(c.id, (msgs) => {
      const chat = $('chat');
      if (!chat) return;
      if (msgs === null) { chat.innerHTML = `<p class="aviso">${erroNuvem({ code: 'permission' })}</p>`; return; }
      chat.innerHTML = msgs.length ? msgs.map((x) => `<div class="msg${x.uid === Conta.uid() ? ' minha' : ''}"><small>${Passe.nomeHtml(x.nome, x.estiloNome)}</small><span>${esc(x.texto)}</span></div>`).join('')
        : '<p class="aviso">Nenhuma mensagem ainda. Diga oi! 👋</p>';
      chat.scrollTop = chat.scrollHeight;
    });
    $('chat-form').onsubmit = (e) => {
      e.preventDefault();
      const t = $('chat-texto').value.trim();
      if (!t) return;
      $('chat-texto').value = '';
      Cla.enviar(c.id, t).catch((x) => UI.toast(erroNuvem(x)));
    };
  }

  // ---------- Eventos ----------
  function eventos() {
    const ev = d().eventos;
    const item = (classe, titulo, desc, extra, botao) => `<div class="evento ${classe}"><div><b>${titulo}</b><span>${desc}</span>${extra}</div>${botao}</div>`;
    const barra = (v, max) => `<div class="ev-barra"><i style="width:${Math.min(100, (v / max) * 100)}%"></i><small>${Math.min(v, max)}/${max}</small></div>`;
    const btnPremio = (pronto, pego, id) => pego ? '<div class="selo">Concluído ✓</div>' : pronto ? `<button class="selo botao" data-premio="${id}">Pegar prêmio</button>` : '<button class="selo botao" data-jogar="normal">Jogar</button>';
    const p = Passe.dados();
    const nv = Passe.nivel();
    const pend = Passe.pendentes();
    $('eventos-lista').innerHTML = `<div id="eventos-novos">${Eventos.html()}</div><div class="eventos-cab">🎟️ Passe e desafios</div>` +
      `<button class="cartao-passe${p.ultra ? ' ultra' : p.plus ? ' plus' : ''}" id="abrir-passe">
        <div class="passe-topo"><b>🎟️ Passe da Temporada</b><small>${Passe.diasRestantes()} dias restantes</small></div>
        <div class="passe-linha"><span class="passe-nivel">${nv}</span><div class="ev-barra passe-barra"><i style="width:${nv >= Passe.NIVEIS ? 100 : ((p.pontos % Passe.PONTOS_NIVEL) / Passe.PONTOS_NIVEL) * 100}%"></i><small>${nv >= Passe.NIVEIS ? 'Completo!' : `${p.pontos % Passe.PONTOS_NIVEL}/${Passe.PONTOS_NIVEL}`}</small></div><span class="passe-tipo">${p.ultra ? 'ULTRA' : p.plus ? 'PLUS' : 'FREE'}</span></div>
        ${pend ? `<span class="passe-pendente">${pend} prêmio${pend > 1 ? 's' : ''} para pegar!</span>` : ''}
      </button>` +
      item('ev1', 'Desafio do Festival', 'Vença 3 batalhas seguidas · prêmio: baú de ouro', barra(ev.sequencia, 3), btnPremio(ev.sequencia >= 3, ev.desafioPremio, 'desafio')) +
      item('ev2', 'Torneio das Coroas', 'Junte 30 coroas · prêmio: 100 gemas', barra(ev.coroas, 30), btnPremio(ev.coroas >= 30, ev.torneioPremio, 'torneio')) +
      item('ev4', 'Elixir em dobro', 'A batalha inteira com elixir rápido', '', '<button class="selo botao" data-jogar="elixir2x">Jogar</button>') +
      item('ev3', 'Batalha em dupla', 'Você + parceiro (amigo ou IA) contra uma dupla', '', '<button class="selo botao" id="ev-dupla">Jogar</button>');
    $('abrir-passe').onclick = telaPasse;
    Eventos.ligar($('eventos-novos'), { iniciar: jogarEvento, verCarta: (c) => Estado.tem(c.id) ? detalhes(c.id) : UI.modal({ titulo: c.nome, classe: 'modal-carta', html: `<div class="detalhe-carta">${Cartas.html(c, { mini: true, vivo: true })}<div><span class="raridade-tag ${c.raridade}">${Cartas.NOMES_RARIDADE[c.raridade]} · só de evento</span><p class="tipo">${c.tipo} · ${c.custo} de elixir</p><p>${c.descricao}</p>${c.passiva ? `<p><b>🧩 ${c.passiva.nome}:</b> ${c.passiva.descricao}</p>` : ''}${c.habilidade ? `<p><b>⚡ ${c.habilidade.nome}:</b> ${c.habilidade.descricao}</p>` : ''}</div></div>`, botoes: [{ texto: 'Quero ela!', classe: 'principal' }] }) });
    $('ev-dupla').onclick = dupla;
    $('eventos-lista').querySelectorAll('[data-jogar]').forEach((b) => (b.onclick = () => jogar(b.dataset.jogar)));
    $('eventos-lista').querySelectorAll('[data-premio]').forEach((b) => (b.onclick = () => {
      if (b.dataset.premio === 'desafio') { ev.desafioPremio = true; mostrarBau('ouro', Estado.abrirBau('ouro')); }
      else { ev.torneioPremio = true; d().gemas += 100; Estado.salvar(); UI.toast('+100 gemas! 💎'); tudo(); }
    }));
  }

  // ---------- Presentear (só a criadora) ----------
  function telaPresentear() {
    if (!Mod.ehCriador()) return;
    let alvo = null, tipo = 'carta';
    const cartasTodas = Estado.todasCartas().sort((a, b) => a.nome.localeCompare(b.nome));
    const md = UI.modal({
      titulo: '🎁 Presentear jogador',
      classe: 'modal-presentear',
      html: `<div class="pres-passo"><b>1. Para quem?</b>
          <div class="busca-amigo"><input id="pres-busca" maxlength="40" placeholder="Nome ou ID do jogador" autocomplete="off" /><button class="btn-modal principal" id="pres-buscar">🔍</button></div>
          <div id="pres-resultados"></div>
          <div id="pres-amigos" class="pres-chips"></div>
          <div id="pres-alvo" class="pres-alvo oculto"></div>
        </div>
        <div class="pres-passo"><b>2. O que dar?</b>
          <div class="conta-abas pres-abas">${[['carta', '🃏 Carta'], ['passe', '🎟️ Passe'], ['ouro', '🪙 Ouro'], ['gemas', '💎 Gemas']].map(([k, t]) => `<button data-tipo="${k}">${t}</button>`).join('')}</div>
          <div id="pres-opcoes"></div>
          <input id="pres-msg" maxlength="80" placeholder="Mensagem (opcional) 💌" autocomplete="off" />
        </div>
        <button class="btn-modal principal pres-enviar" id="pres-enviar">🎁 Enviar presente</button>
        <div id="pres-pendentes"></div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    });
    const el = md.el, $q = (s) => el.querySelector(s);

    const escolherAlvo = async (p) => {
      alvo = p;
      $q('#pres-resultados').innerHTML = '';
      $q('#pres-alvo').classList.remove('oculto');
      $q('#pres-alvo').innerHTML = `<img src="${avatarDe(p.avatar)}" alt="" /><div><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.uid}</small></div><button class="btn-peq" id="pres-trocar">trocar</button>`;
      $q('#pres-trocar').onclick = () => { alvo = null; $q('#pres-alvo').classList.add('oculto'); $q('#pres-pendentes').innerHTML = ''; };
      mostrarPendentes();
    };
    const mostrarPendentes = async () => {
      const caixa = $q('#pres-pendentes');
      if (!alvo) { caixa.innerHTML = ''; return; }
      try {
        const lista = await Presentes.pendentes(alvo.uid);
        caixa.innerHTML = lista.length ? `<div class="titulo-conquistas">Ainda não recebidos (${lista.length})</div>
          <div class="lista-jogadores">${lista.map((p) => `<div class="linha-jogador"><div class="lj-nome"><b>${Presentes.descrever(p)}</b>${p.mensagem ? `<small>💌 ${esc(p.mensagem)}</small>` : ''}</div><button class="btn-peq perigo" data-cancelar="${p.id}">✕</button></div>`).join('')}</div>` : '';
        caixa.querySelectorAll('[data-cancelar]').forEach((b) => (b.onclick = async () => { await Presentes.cancelar(alvo.uid, b.dataset.cancelar); UI.toast('Presente cancelado'); mostrarPendentes(); }));
      } catch (e) { caixa.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
    };

    // atalhos: seus amigos
    Amigos.listar().then((lista) => {
      $q('#pres-amigos').innerHTML = lista.length ? `<small>Seus amigos:</small> ${lista.map((p) => `<button class="pres-chip" data-u="${p.uid}">${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</button>`).join('')}` : '';
      $q('#pres-amigos').querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => escolherAlvo(lista.find((p) => p.uid === b.dataset.u))));
    }).catch(() => {});

    const buscar = async () => {
      const t = $q('#pres-busca').value.trim();
      if (!t) return;
      const res = $q('#pres-resultados');
      res.innerHTML = '<div class="x1-carregando"></div>';
      try {
        let lista = await Amigos.buscar(t);
        if (!lista.length && t.length >= 20) lista = [{ uid: t, nome: 'Jogador (sem perfil público)' }];
        res.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => `<div class="linha-jogador clicavel" data-u="${p.uid}"><div class="lj-avatar"><img src="${avatarDe(p.avatar)}" alt="" /></div><div class="lj-nome"><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.uid}</small></div></div>`).join('')}</div>` : '<p class="aviso">Ninguém encontrado. Tente colar o ID.</p>';
        res.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => escolherAlvo(lista.find((p) => p.uid === b.dataset.u))));
      } catch (e) { res.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
    };
    $q('#pres-buscar').onclick = buscar;
    $q('#pres-busca').onkeydown = (e) => { if (e.key === 'Enter') buscar(); };

    const opcoes = () => {
      el.querySelectorAll('.pres-abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.tipo === tipo));
      const o = $q('#pres-opcoes');
      if (tipo === 'carta') {
        o.innerHTML = `<select id="pres-carta">${cartasTodas.filter((c) => !c.intransferivel).map((c) => `<option value="${c.id}">${c.nome}${c.exclusivo ? ' ⭐ exclusiva' : ''}</option>`).join('')}</select>
          <div class="pres-linha"><label>Nível <select id="pres-nivel">${Array.from({ length: Estado.NIVEL_MAX }, (_, i) => `<option ${i + 1 === Estado.NIVEL_MAX ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
          <label>Cópias extras <input id="pres-copias" type="number" min="0" max="9999" value="0" /></label></div>
          <div id="pres-previa" class="pres-previa"></div>`;
        const previa = () => { const c = Estado.carta($q('#pres-carta').value); $q('#pres-previa').innerHTML = Cartas.html(c, { nivel: `Nível ${$q('#pres-nivel').value}` }); };
        $q('#pres-carta').onchange = previa; $q('#pres-nivel').onchange = previa; previa();
      } else if (tipo === 'passe') {
        o.innerHTML = `<div class="pres-linha"><label class="pres-radio"><input type="radio" name="pres-passe" value="plus" /> Plus</label><label class="pres-radio"><input type="radio" name="pres-passe" value="ultra" checked /> Ultra 👑</label></div>
          <p class="aviso">Vale para a temporada atual (${Passe.dados().temporada}).</p>`;
      } else {
        const presets = tipo === 'ouro' ? [500, 1000, 5000, 10000] : [50, 100, 500, 1000];
        o.innerHTML = `<input id="pres-qtd" type="number" min="1" max="1000000" value="${presets[1]}" />
          <div class="pres-chips">${presets.map((v) => `<button class="pres-chip" data-qtd="${v}">${UI.fmt(v)}</button>`).join('')}</div>`;
        o.querySelectorAll('[data-qtd]').forEach((b) => (b.onclick = () => { $q('#pres-qtd').value = b.dataset.qtd; }));
      }
    };
    el.querySelectorAll('.pres-abas button').forEach((b) => (b.onclick = () => { tipo = b.dataset.tipo; opcoes(); }));
    opcoes();

    $q('#pres-enviar').onclick = async () => {
      if (!alvo) { UI.toast('Escolha para quem é o presente primeiro!'); return; }
      let item;
      if (tipo === 'carta') item = { tipo, carta: $q('#pres-carta').value, nivel: +$q('#pres-nivel').value, copias: Math.max(0, Math.round(+$q('#pres-copias').value || 0)) };
      else if (tipo === 'passe') item = { tipo, passe: el.querySelector('input[name="pres-passe"]:checked').value, temporada: Passe.dados().temporada };
      else {
        const qtd = Math.round(+$q('#pres-qtd').value || 0);
        if (qtd <= 0) { UI.toast('Coloque uma quantidade'); return; }
        item = { tipo, qtd };
      }
      const msg = $q('#pres-msg').value.trim();
      if (msg) item.mensagem = msg;
      const btn = $q('#pres-enviar');
      btn.disabled = true;
      try {
        await Presentes.enviar(alvo.uid, item);
        UI.toast(`🎁 Presente enviado para ${alvo.nome || 'o jogador'}!`);
        $q('#pres-msg').value = '';
        mostrarPendentes();
      } catch (e) { UI.toast(e.code ? erroNuvem(e) : e.message); }
      btn.disabled = false;
    };
  }

  // ---------- Remover itens de um jogador (só a criadora; o jogador não é avisado) ----------
  function telaRemover() {
    if (!Mod.ehCriador()) return;
    let alvo = null, inv = null;
    const md = UI.modal({
      titulo: '🛠️ Editar conta',
      classe: 'modal-presentear modal-remover',
      html: `<p class="aviso">Só você vê isto. A remoção é aplicada em silêncio, mesmo se a pessoa estiver jogando agora.</p>
        <div class="pres-passo"><b>1. De quem?</b>
          <div class="busca-amigo"><input id="rem-busca" maxlength="40" placeholder="Nome ou ID do jogador" autocomplete="off" /><button class="btn-modal principal" id="rem-buscar">🔍</button></div>
          <div id="rem-resultados"></div><div id="rem-amigos" class="pres-chips"></div><div id="rem-alvo" class="pres-alvo oculto"></div>
        </div>
        <div id="rem-inv"></div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    });
    const el = md.el, $q = (s) => el.querySelector(s);
    const mandar = async (item, txt) => {
      try { await Presentes.enviar(alvo.uid, { tipo: 'remover', ...item }); UI.toast(`🤫 ${txt}`); return true; } catch (e) { UI.toast(e.code ? erroNuvem(e) : e.message); return false; }
    };

    const desenhar = () => {
      const caixa = $q('#rem-inv');
      if (!alvo) { caixa.innerHTML = ''; return; }
      if (!inv) { caixa.innerHTML = '<p class="aviso">Não consegui ler a conta dessa pessoa. Confira se as regras novas do Firebase foram publicadas, ou se ela já jogou logada alguma vez.</p>'; return; }
      const ps = inv.passe && inv.passe.temporada === Passe.dados().temporada ? inv.passe : null;
      const cartasDela = Object.entries(inv.colecao || {}).filter(([id, c]) => c.tem && Estado.carta(id) && !(inv.esgotadas || []).includes(id))
        .map(([id, c]) => ({ c: Estado.carta(id), nivel: c.nivel })).sort((a, b) => b.nivel - a.nivel || a.c.nome.localeCompare(b.c.nome));
      const recurso = (k, ic, nome, v) => `<div class="rem-recurso"><span>${ic} ${nome}: <b>${fmt(v || 0)}</b></span><input type="number" min="1" data-qtd="${k}" placeholder="quanto" /><button class="btn-peq perigo" data-tirar="${k}">Tirar</button></div>`;
      const est = (k, ic, nome) => `<label class="aj-linha"><span>${ic} ${nome}</span>
          <button class="btn-peq" data-menos="${k}">−</button><input type="number" min="0" inputmode="numeric" data-aj="${k}" value="${Math.max(0, Math.round(inv[k] || 0))}" /><button class="btn-peq" data-mais="${k}">+</button></label>`;
      caixa.innerHTML = `<div class="pres-passo aj-estat"><b>📊 Troféus e estatísticas</b>
          <small class="aviso">Coloque os valores novos (pra mais ou pra menos). Muda em segredo.</small>
          ${est('trofeus', '🏆', 'Troféus')}${est('vitorias', '✅', 'Vitórias')}${est('derrotas', '❌', 'Derrotas')}
          <div class="aj-rapidos"><span>Troféus rápido:</span>${[100, 500, 1000].map((q) => `<button class="btn-peq" data-rap="${q}">+${q}</button>`).join('')}<button class="btn-peq" data-rap="-100">−100</button></div>
          <button class="btn-modal principal" id="aj-salvar">Salvar estatísticas</button>
        </div>
        <div class="pres-passo"><b>2. O que tirar?</b>
          ${recurso('ouro', '🪙', 'Ouro', inv.ouro)}${recurso('gemas', '💎', 'Gemas', inv.gemas)}${recurso('trofeus', '🏆', 'Troféus', inv.trofeus)}
          <div class="rem-recurso"><span>🎟️ Passe: <b>${ps && ps.ultra ? 'Ultra' : ps && ps.plus ? 'Plus' : 'nenhum'}</b></span>${ps && (ps.plus || ps.ultra) ? '<button class="btn-peq perigo" id="rem-passe">Tirar passe</button>' : ''}</div>
        </div>
        <div class="pres-passo"><b>🃏 Cartas (${cartasDela.length})</b>
          <div class="lista-jogadores">${cartasDela.map(({ c, nivel }) => `<div class="linha-jogador rem-carta"><img src="assets/cartas/${c.id}_medalhao.png" alt="" /><div class="lj-nome"><b>${c.nome}</b><small>Nível ${nivel}${(inv.deck || []).includes(c.id) ? ' · no deck' : ''}</small></div>
            <select data-nv="${c.id}">${Array.from({ length: nivel }, (_, i) => `<option ${i + 1 === nivel ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>
            <button class="btn-peq" data-baixar="${c.id}" title="Baixar nível">⬇️</button><button class="btn-peq perigo" data-tirar-carta="${c.id}" title="Tirar a carta">🗑️</button></div>`).join('') || '<p class="aviso">Nenhuma carta.</p>'}</div>
        </div>`;
      const campo = (k) => caixa.querySelector(`[data-aj="${k}"]`);
      const somar = (k, q) => { const c = campo(k); c.value = Math.max(0, (Math.round(+c.value) || 0) + q); };
      caixa.querySelectorAll('[data-mais]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); somar(b.dataset.mais, b.dataset.mais === 'trofeus' ? 10 : 1); }));
      caixa.querySelectorAll('[data-menos]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); somar(b.dataset.menos, b.dataset.menos === 'trofeus' ? -10 : -1); }));
      caixa.querySelectorAll('[data-rap]').forEach((b) => (b.onclick = () => somar('trofeus', +b.dataset.rap)));
      caixa.querySelector('#aj-salvar').onclick = async () => {
        const novo = {};
        for (const k of ['trofeus', 'vitorias', 'derrotas']) {
          const v = Math.max(0, Math.round(+campo(k).value || 0));
          if (v !== Math.round(inv[k] || 0)) novo[k] = v;
        }
        if (!Object.keys(novo).length) { UI.toast('Nada mudou'); return; }
        try {
          await Presentes.enviar(alvo.uid, { tipo: 'ajustar', ...novo });
          Object.assign(inv, novo);
          if (novo.trofeus !== undefined) inv.recorde = Math.max(inv.recorde || 0, novo.trofeus);
          UI.toast('🤫 Estatísticas atualizadas em segredo');
          desenhar();
        } catch (e) { UI.toast(e.code ? erroNuvem(e) : e.message); }
      };
      caixa.querySelectorAll('[data-tirar]').forEach((b) => (b.onclick = async () => {
        const k = b.dataset.tirar, q = Math.round(+caixa.querySelector(`[data-qtd="${k}"]`).value || 0);
        if (q <= 0) { UI.toast('Coloque quanto quer tirar'); return; }
        if (await mandar({ alvo: k, qtd: q }, 'Removido em segredo')) { inv[k] = Math.max(0, (inv[k] || 0) - q); desenhar(); }
      }));
      const bp = caixa.querySelector('#rem-passe');
      if (bp) bp.onclick = async () => { if (await mandar({ alvo: 'passe' }, 'Passe removido em segredo')) { inv.passe.plus = false; inv.passe.ultra = false; desenhar(); } };
      caixa.querySelectorAll('[data-baixar]').forEach((b) => (b.onclick = async () => {
        const id = b.dataset.baixar, nv = +caixa.querySelector(`[data-nv="${id}"]`).value;
        if (nv >= inv.colecao[id].nivel) { UI.toast('Escolha um nível menor que o atual'); return; }
        if (await mandar({ alvo: 'nivel', carta: id, nivel: nv }, `Nível baixado para ${nv} em segredo`)) { inv.colecao[id].nivel = nv; desenhar(); }
      }));
      caixa.querySelectorAll('[data-tirar-carta]').forEach((b) => (b.onclick = async () => {
        const id = b.dataset.tirarCarta;
        if (!confirm(`Tirar ${Estado.carta(id).nome} dessa conta?`)) return;
        if (await mandar({ alvo: 'carta', carta: id }, 'Carta removida em segredo')) { inv.colecao[id].tem = false; inv.deck = (inv.deck || []).filter((x) => x !== id); desenhar(); }
      }));
    };

    const escolher = async (p) => {
      alvo = p; inv = null;
      $q('#rem-resultados').innerHTML = '';
      $q('#rem-alvo').classList.remove('oculto');
      $q('#rem-alvo').innerHTML = `<img src="${avatarDe(p.avatar)}" alt="" /><div><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.uid}</small></div><button class="btn-peq" id="rem-trocar">trocar</button>`;
      $q('#rem-trocar').onclick = () => { alvo = null; inv = null; $q('#rem-alvo').classList.add('oculto'); desenhar(); };
      $q('#rem-inv').innerHTML = '<div class="x1-carregando"></div>';
      try { inv = await Presentes.inventario(p.uid); } catch (e) { inv = null; }
      desenhar();
    };
    Amigos.listar().then((lista) => {
      $q('#rem-amigos').innerHTML = lista.length ? `<small>Seus amigos:</small> ${lista.map((p) => `<button class="pres-chip" data-u="${p.uid}">${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</button>`).join('')}` : '';
      $q('#rem-amigos').querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => escolher(lista.find((p) => p.uid === b.dataset.u))));
    }).catch(() => {});
    const buscar = async () => {
      const t = $q('#rem-busca').value.trim();
      if (!t) return;
      const res = $q('#rem-resultados');
      res.innerHTML = '<div class="x1-carregando"></div>';
      try {
        let lista = await Amigos.buscar(t);
        if (!lista.length && t.length >= 20) lista = [{ uid: t, nome: 'Jogador (sem perfil público)' }];
        res.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => `<div class="linha-jogador clicavel" data-u="${p.uid}"><div class="lj-avatar"><img src="${avatarDe(p.avatar)}" alt="" /></div><div class="lj-nome"><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.uid}</small></div></div>`).join('')}</div>` : '<p class="aviso">Ninguém encontrado. Tente colar o ID.</p>';
        res.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => escolher(lista.find((p) => p.uid === b.dataset.u))));
      } catch (e) { res.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
    };
    $q('#rem-buscar').onclick = buscar;
    $q('#rem-busca').onkeydown = (e) => { if (e.key === 'Enter') buscar(); };
  }

  function telaEstiloNome() {
    const tem = Passe.temTrilha('plus'), ultra = Passe.temTrilha('ultra'), atual = Passe.estiloNome();
    const grupos = ['Cor', 'Gradiente', 'Animado'];
    const md = UI.modal({
      titulo: '🎨 Estilo do nome',
      classe: 'modal-estilo-nome',
      html: `<div class="previa-nome">${Passe.nomeHtml(d().nome, atual)}</div>
        ${tem ? '' : '<p class="aviso">✨ Cores e gradientes no nome são vantagem do <b>Passe Plus</b> e do <b>Passe Ultra</b>. Os animados são só do Ultra!</p>'}
        ${tem && !ultra ? '<p class="aviso">Os estilos <b>animados</b> são só do Passe Ultra.</p>' : ''}
        <button class="estilo-op${atual ? '' : ' escolhido'}" data-estilo="">Normal</button>
        ${grupos.map((g) => `<div class="titulo-conquistas">${g === 'Cor' ? 'Cores' : g === 'Gradiente' ? 'Gradientes' : 'Animados 👑 Ultra'}</div>
          <div class="grade-estilos">${Object.entries(Passe.ESTILOS_NOME).filter(([, e]) => e.tipo === g).map(([id, e]) => `<button class="estilo-op${id === atual ? ' escolhido' : ''}${Passe.podeEstilo(id) ? '' : ' trancado'}" data-estilo="${id}">
            ${Passe.nomeHtml(e.nome, id)}${Passe.podeEstilo(id) ? '' : '<i>🔒</i>'}</button>`).join('')}</div>`).join('')}`,
      botoes: tem ? [{ texto: 'Fechar', classe: 'principal', acao: () => { topo(); } }]
        : [{ texto: 'Fechar', classe: 'secundario' }, { texto: '🎟️ Ver passe', classe: 'principal', acao: () => { telaPasse(); } }],
    });
    md.el.querySelectorAll('[data-estilo]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.estilo;
      if (!Passe.escolherEstilo(id)) {
        UI.toast(id && Passe.ESTILOS_NOME[id].ultra ? 'Esse estilo é só do Passe Ultra! 👑' : 'Compre o Passe Plus ou Ultra para mudar a cor do nome! 🎟️');
        return;
      }
      md.el.querySelectorAll('[data-estilo]').forEach((x) => x.classList.toggle('escolhido', x === b));
      md.el.querySelector('.previa-nome').innerHTML = Passe.nomeHtml(d().nome, Passe.estiloNome());
      topo();
    }));
  }

  function telaPasse() {
    const p = Passe.dados();
    const nv = Passe.nivel();
    const trilhas = [['free', 'Free'], ['plus', 'Plus'], ['ultra', 'Ultra']];
    const linha = (n) => `<div class="passe-nv${n <= nv ? ' alcancado' : ''}"><span class="passe-num">${n}</span>${trilhas.map(([t]) => {
      const r = Passe.recompensa(t, n);
      const pego = p.pegos[t].includes(n);
      const pode = Passe.podePegar(t, n);
      const tranc = !Passe.temTrilha(t);
      return `<button class="premio ${t} ${Premios.classe(r)}${pego ? ' pego' : ''}${pode ? ' pode' : ''}${tranc ? ' trancado' : ''}${n % 10 === 0 || n === Passe.NIVEIS ? ' grande' : ''}" data-t="${t}" data-n="${n}">
        <span class="premio-ic">${Passe.icone(r)}</span><small>${Passe.texto(r)}</small>${tranc ? '<i>🔒</i>' : ''}${pego ? '<em class="premio-ok">✔</em>' : ''}</button>`;
    }).join('')}</div>`;
    const pts = p.pontos % Passe.PONTOS_NIVEL, cheio = nv >= Passe.NIVEIS;
    const m = UI.modal({
      titulo: '🎟️ Passe da Temporada',
      classe: 'modal-passe passe-novo',
      html: `<div class="passe-topo"><div class="pt-nivel"><small>NÍVEL</small><b>${nv}</b></div>
          <div class="pt-barra"><div><i style="width:${cheio ? 100 : (pts / Passe.PONTOS_NIVEL) * 100}%"></i></div><small>${cheio ? 'Passe completo! 🎉' : `${pts}/${Passe.PONTOS_NIVEL} pontos para o nível ${nv + 1}`}</small></div>
          <div class="pt-dias">⏳ ${Passe.diasRestantes()}d</div></div>
        <p class="aviso">Ganhe pontos jogando batalhas (vitória 40, derrota 15, +8 por coroa). Temporada termina em ${Passe.diasRestantes()} dias.</p>
        <p class="vantagem-passe">✨ Plus e Ultra: <b>cor e gradiente no nome</b> (vá no seu perfil). Ultra: estilos <span class="nome-estilo nc-arco-iris">animados</span>!</p>
        <div class="passe-compras">
          <button class="comprar-passe plus${p.plus || p.ultra ? ' tem' : ''}" data-c="plus"><b>PLUS</b><small>${p.plus || p.ultra ? 'Ativo ✔' : `💎 ${Passe.precoAtual('plus')}`}</small></button>
          <button class="comprar-passe ultra${p.ultra ? ' tem' : ''}" data-c="ultra"><b>ULTRA</b><small>${p.ultra ? 'Ativo ✔' : `💎 ${Passe.precoAtual('ultra')}`}</small></button>
        </div>
        <div class="passe-cab"><span>Nv</span><span>Free</span><span>Plus</span><span>Ultra</span></div>
        <div class="passe-trilhas">${Array.from({ length: Passe.NIVEIS }, (_, i) => linha(i + 1)).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal', acao: () => eventos() }],
    });
    const el = m.el;
    const alvo = el.querySelectorAll('.passe-nv')[Math.max(0, nv - 2)];
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: 'center' }), 50);
    el.querySelectorAll('.premio').forEach((b) => (b.onclick = () => {
      const t = b.dataset.t, n = +b.dataset.n;
      if (!Passe.temTrilha(t)) return UI.toast(`Compre o passe ${t === 'plus' ? 'Plus' : 'Ultra'} para pegar`);
      if (n > Passe.nivel()) return UI.toast(`Chegue ao nível ${n} do passe`);
      const res = Passe.pegar(t, n);
      if (!res) return;
      b.classList.add('pego', 'pegando'); b.classList.remove('pode'); b.insertAdjacentHTML('beforeend', '<em class="premio-ok">✔</em>');
      topo();
      if (res.extra && res.extra.bau) mostrarBau(res.extra.bau, res.extra.abertura);
      else Premios.avisar(res.r, res.extra);
    }));
    el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      const t = b.dataset.c;
      if (Passe.dados()[t] || (t === 'plus' && Passe.dados().ultra)) return UI.toast('Você já tem esse passe');
      const preco = Passe.precoAtual(t);
      UI.modal({
        titulo: `Comprar passe ${t === 'plus' ? 'Plus' : 'Ultra'}?`,
        html: t === 'plus'
          ? `<p>Libera a trilha <b>Plus</b> desta temporada: muito ouro, baús de prata e de ouro e gemas.</p><p><b>💎 ${preco} gemas</b></p>`
          : `<p>Libera as trilhas <b>Plus e Ultra</b>: baús de ouro, cartas épicas e <b>cartas lendárias</b>.</p><p><b>💎 ${preco} gemas</b>${Passe.dados().plus ? ' (desconto de quem já tem o Plus)' : ''}</p>`,
        botoes: [{ texto: 'Agora não', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: d().gemas < preco, motivo: `Faltam ${preco - d().gemas} gemas`,
          acao: () => { const r = Passe.comprar(t); if (r.ok) { UI.toast(`Passe ${t === 'plus' ? 'Plus' : 'Ultra'} ativado! ✨`); m.fechar(); topo(); setTimeout(telaPasse, 250); } } }],
      });
    }));
  }

  window.telaPresentear = telaPresentear; // usado pelo mod menu
  window.telaRemover = telaRemover;
  window.mostrarConviteX1 = conviteX1;
  function tudo() {
    try { $('btn-summon').innerHTML = Summon.htmlBotao(); $('loja-summon').innerHTML = Summon.htmlBotao(); } catch (e) { /* nada */ }
    try { seloMissoes(); $('btn-tutorial').classList.toggle('chamando', !Tutorial.feito()); } catch (e) { /* nada */ }
    Mod.mostrarBotao(tudo);
    if (Conta.logado()) Amigos.ouvir({ aoMudarPedidos: mudouPedidos, aoConvite: conviteX1 });
    if (Conta.logado()) Presentes.ouvir(chegaramPresentes);
    topo(); telaBatalha(); loja(); cartas(); cla(); eventos();
    RanqueUI.atualizarBotao();
    Eventos.conferir();
  }

  // ---------- Início ----------
  let lista = await Cartas.carregar();
  while (!lista) {
    // sem internet: avisa e espera, sem mexer no progresso salvo
    await new Promise((ok) => UI.modal({ titulo: 'Sem conexão 📶', html: '<p>Não consegui baixar as cartas do jogo. Seu progresso está guardado, fica tranquilo(a)!</p><p class="aviso">Confira a internet e toque em tentar de novo.</p>', botoes: [{ texto: 'Tentar de novo', classe: 'principal', acao: ok }] }));
    lista = await Cartas.carregar();
  }
  Estado.carregar(lista);
  document.getElementById('barra-elixir').innerHTML = Array.from({ length: 10 }, () => '<span></span>').join('');
  Assets.fill();
  RanqueUI.init({ tudo, topo, irPara, mostrarBau, fimDeBatalha, subiuNivel, cartasEsgotadas });
  tudo();
  irPara('batalha');
  setInterval(() => { if (abaAtual === 'batalha' && $('batalha').classList.contains('oculto') && d().baus.some((b) => b && b.inicio)) relogioBaus(); }, 1000);
  const sessao = Conta.verificarSessao(); // confere o login enquanto a tela de título aparece
  await Titulo.mostrar();
  if (await sessao) UI.toast(`Bem-vindo(a) de volta, ${d().nome}! ☁️`);
  await Conta.tela();
  tudo();
  window.MenuAPI.pronto = true;
  if (d().presenteNovo) {
    const c = Estado.carta(d().presenteNovo);
    d().presenteNovo = null; Estado.salvar();
    UI.modal({
      titulo: '🎁 Presente exclusivo!',
      classe: 'modal-liberadas',
      html: `<div class="evo-raios"></div><div class="liberadas"><div class="liberada">${Cartas.html(c, { mini: true })}<b>${c.nome}</b></div></div>
        <p>Você ganhou uma carta <b>exclusiva</b> que só existe na sua conta!${c.nivelInicial ? ` Ela já vem no <b>nível ${c.nivelInicial}</b>.` : ''}</p>
        ${c.usos ? `<p class="aviso">⚠️ Ela só pode lutar em <b>${c.usos} partidas</b>. Depois disso, ela vai embora. Use com sabedoria!</p>` : ''}`,
      botoes: [{ texto: 'Que demais!', classe: 'principal' }],
    });
  }
  if (!d().boasVindas) {
    d().boasVindas = true; Estado.salvar();
    UI.modal({
      titulo: 'Boas-vindas ao Queens and Kings!',
      html: `<div class="boas-vindas">👑</div><p>Você ainda não tem nenhuma carta. Abra seus <b>4 baús iniciais</b> para ganhar as <b>8 cartas básicas</b> e montar seu primeiro deck!</p>
        <p class="aviso">Depois, vença batalhas para ganhar troféus e liberar cartas novas.</p>`,
      botoes: [{ texto: 'Vamos lá!', classe: 'principal' }],
    });
  }
})();
