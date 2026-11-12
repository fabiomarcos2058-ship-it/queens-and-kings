// Motor da batalha. Coordenadas da arena: 360 x 620 (azul = você, embaixo).
const Batalha = (() => {
  const W = 360, H = 620, RIO_TOPO = 282, RIO_BASE = 338, PONTE_Y = 310;
  const PONTES = [90, 270];
  const DURACAO = 180, PRORROGACAO = 60;
  const ELIXIR_SEG = 2.8;

  // ?vel=5 no link acelera a batalha (só para testes)
  const VEL = Math.min(20, +new URLSearchParams(location.search).get('vel') || 1);
  let s = null; // estado da partida
  let ao_fim = null;

  const $ = (id) => document.getElementById(id);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // 2v2: cada jogador é um "lado" (azul, azul2, vermelho, vermelho2); o time é azul ou vermelho
  const LADOS = ['azul', 'azul2', 'vermelho', 'vermelho2'];
  const timeDe = (lado) => (lado.startsWith('azul') ? 'azul' : 'vermelho');
  const jogadorDe = (e) => s[e.dono || e.time] || s[e.time];
  const pct = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  // ---------- desempenho ----------
  // tropas e projéteis andam com transform (a placa de vídeo faz o trabalho, sem recalcular a página)
  let escala = 1; // pixels por unidade da arena
  let observador = null;
  const tr = (x, y, extra = '') => `translate3d(${(x * escala).toFixed(1)}px, ${(y * escala).toFixed(1)}px, 0) ${extra}`;
  // reinicia uma animação de CSS sem forçar o navegador a recalcular tudo (antes usava offsetWidth)
  function piscar(el, classe) {
    if (!el) return;
    el.classList.remove(classe);
    requestAnimationFrame(() => el.classList.add(classe));
  }
  // limite de enfeites ao mesmo tempo (partículas e números de dano)
  const LIMITE = { particula: 45, numero: 18 };
  const vivos = { particula: 0, numero: 0 };

  // ---------- Montagem ----------
  // cfgAzul / cfgVermelho = { rei, princesa, tropa } (níveis das torres de cada lado)
  function torres(cfgAzul = { rei: 1, princesa: 1, tropa: 'princesa' }, cfgVermelho = cfgAzul) {
    const t = (id, time, tipo, x, y) => {
      const st = Estado.statsTorre(tipo, time === 'azul' ? cfgAzul : cfgVermelho);
      return {
        id, time, tipo, x, y, torre: true, raio: tipo === 'rei' ? 26 : 20,
        vida: st.vida, max: st.vida, alcance: st.alcance, dano: st.dano, cadencia: st.cadencia,
        nivel: st.nivel, tropa: st.tropa || null, cd: 0, ativa: tipo !== 'rei',
      };
    };
    return [
      t('esq-vermelho', 'vermelho', 'princesa', 90, 104), t('dir-vermelho', 'vermelho', 'princesa', 270, 104),
      t('rei-vermelho', 'vermelho', 'rei', 180, 58),
      t('esq-azul', 'azul', 'princesa', 90, 470), t('dir-azul', 'azul', 'princesa', 270, 470),
      t('rei-azul', 'azul', 'rei', 180, 548),
    ];
  }

  function embaralhar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function lado(deck) {
    const fila = embaralhar(deck);
    return { elixir: 5, fila, coroas: 0, deck: [...deck] };
  }

  // rede (x1): no celular de quem criou a sala, rede = { tipo: 'host', convidado, enviarEstado, fim }
  // ranque (ranqueada): { dupla, rivais, parceiro, dif, nivelDelta } vindo do Ranque.partida()
  // evento: { id, nome, deck, deckIA, nivel, elixirMult, subita, turbo, dif } (modos de evento)
  function iniciar({ modo = 'normal', fim, rede = null, ranque = null, evento = null, tutorial = null } = {}) {
    ao_fim = fim;
    const dupla = modo === '2v2';
    const x1 = rede && !dupla;
    // 2v2 online: rede.jogadores = { azul2, vermelho, vermelho2 } (perfil de quem está em cada vaga; vaga vazia = IA)
    const jog = dupla && rede ? (rede.jogadores || { azul2: rede.convidado }) : {};
    const deck = evento && evento.deck ? evento.deck : tutorial ? tutorial.deck : Estado.d.deck;
    const deckIA = evento && evento.deckIA ? evento.deckIA : tutorial ? tutorial.deckIA : x1 ? embaralhar(rede.convidado.deck) : jog.vermelho ? jog.vermelho.deck : embaralhar(Mod.deckApelao() || deckAleatorioIA()).slice(0, 8);
    const minhas = Estado.minhasTorres();
    // 2v2: a dupla rival tem torres iguais às suas (sem a "desvantagem de IA"); se tiver gente no time vermelho, usa as torres dela
    const humanoV = jog.vermelho || jog.vermelho2;
    const delas = evento || tutorial ? { ...minhas } : x1 ? (rede.convidado.torres || minhas) : humanoV ? (humanoV.torres || minhas) : (dupla || ranque) ? { ...minhas } : torresIA(minhas);
    s = {
      modo, t: 0, prorrogacao: false, acabou: false, pausa: false,
      azul: lado(deck), vermelho: lado(deckIA),
      ent: torres(minhas, delas), proj: [], efeitos: [], agenda: [], selecionada: null, iaTimer: 2, id: 0,
      arenaId: Arena.daQtd(Estado.d.recorde).id,
      nivelIA: (evento && evento.nivel) || (tutorial && 1) || Math.max(1, Math.min(9, Math.round(deck.reduce((a, id) => a + ((Estado.d.colecao[id] || {}).nivel || 1), 0) / deck.length) - (Mod.deckApelao() ? 0 : 2))),
      rede, niveisV: x1 ? rede.convidado.niveis : null, eventos: [], snapTimer: 0,
      ias: x1 ? [] : ['vermelho'],
    };
    if (evento) {
      s.evento = evento;
      if (evento.nivel) s.nivelFixo = evento.nivel;
      if (evento.elixirMult) s.elixirMult = evento.elixirMult;
      if (evento.dif) s.difIA = evento.dif;
      if (evento.turbo) s.turbo = true;
      if (evento.subita) { s.prorrogacao = true; s.t = DURACAO - 60; } // 2 minutos e a primeira torre decide
      if (evento.niveisV) s.niveisV = evento.niveisV;
      if (evento.cartaIA && !s.vermelho.fila.slice(0, 4).includes(evento.cartaIA)) { s.vermelho.fila[Math.floor(Math.random() * 4)] = evento.cartaIA; s.vermelho.deck = [...s.vermelho.fila]; }
      if (evento.elixirInicial) { s.azul.elixir = s.vermelho.elixir = evento.elixirInicial; }
      if (evento.nivelIAMais) s.nivelIA = Math.max(1, Math.min(9, s.nivelIA + evento.nivelIAMais));
      if (evento.cartasViradas) s.viradas = true;
    }
    if (tutorial) { s.tutorial = tutorial; s.difIA = 1; s.nivelFixo = 1; s.iaTimer = 1e9; }
    if (ranque) {
      s.ranque = ranque;
      s.difBaseRanque = ranque.dif;
      const media = Math.round(deck.reduce((a, id) => a + Estado.d.colecao[id].nivel, 0) / deck.length);
      s.nivelIA = Math.max(1, Math.min(9, media + ranque.nivelDelta));
    }
    if (dupla) {
      s.dupla = true;
      s.jogadores = jog;
      s.azul2 = lado(jog.azul2 ? jog.azul2.deck : deckAleatorioIA());
      s.vermelho2 = lado(jog.vermelho2 ? jog.vermelho2.deck : deckAleatorioIA());
      s.niveis = { azul2: jog.azul2 && jog.azul2.niveis, vermelho: jog.vermelho && jog.vermelho.niveis, vermelho2: jog.vermelho2 && jog.vermelho2.niveis };
      s.niveisAzul2 = s.niveis.azul2 || null;
      s.ias = ['vermelho', 'vermelho2', 'azul2'].filter((l) => !jog[l]);
      s.nomes = { azul: Estado.d.nome, azul2: jog.azul2 ? jog.azul2.nome : null, vermelho: jog.vermelho ? jog.vermelho.nome : null, vermelho2: jog.vermelho2 ? jog.vermelho2.nome : null };
      s.nomeParceiro = jog.azul2 ? jog.azul2.nome : ranque && ranque.parceiro ? ranque.parceiro.nome : 'Parceiro IA';
      s.iaTimer_vermelho2 = 3.2; s.iaTimer_azul2 = 2.6;
      // com 4 jogadores as torres aguentam mais
      for (const t of s.ent) if (t.torre) { t.max = Math.round(t.max * 1.9); t.vida = t.max; }
      if (!Mod.deckApelao() && !ranque) s.nivelIA = Math.min(9, s.nivelIA + 1); // cartas da dupla rival no mesmo nível médio das suas
    }
    const tituloRanq = ranque ? `🏅 Ranqueada${dupla ? ' 2v2' : ''} · vs ${ranque.rivais.map((b) => b.nome).join(' e ')}` : null;
    const humanosV = dupla ? [jog.vermelho, jog.vermelho2].filter(Boolean).map((p) => p.nome) : [];
    if (typeof AoVivo !== 'undefined' && !tutorial) AoVivo.comecou({ modo: ranque ? (dupla ? 'ranq2v2' : 'ranq') : evento ? 'evento' : modo, titulo: tituloRanq || (evento ? evento.nome : dupla ? '2v2' : rede ? 'X1' : 'Batalha'), sala: rede && typeof X1 !== 'undefined' ? X1.codigo() : null, lado: 'azul', dupla: !!dupla });
    // IA adaptativa: joga no nível de quem ela enfrenta; às vezes vem uma IA super inteligente
    if (!s.difIA && !tutorial && !(rede && !dupla)) {
      const hab = Estado.habilidade();
      s.adaptativa = true;
      s.difBase = Math.max(1, Math.min(5, Math.round(s.difBaseRanque ? (s.difBaseRanque + hab) / 2 : hab)));
      s.difAjuste = 0;
      if (!evento && Math.random() < 0.08) {
        s.superIA = true;
        s.nivelIA = Math.min(9, s.nivelIA + 1); // a super IA tem cartas só 1 nível abaixo
        if (s.niveisIA) s.niveisIA = {};
      }
    }
    montar(tituloRanq || (dupla ? (rede ? `2v2 · ${humanosV.length ? `vs ${humanosV.join(' e ')}` : `com ${s.nomeParceiro}`}` : '2v2 · Batalha em dupla') : rede ? `X1 contra ${rede.convidado.nome}` : evento ? `🎪 ${evento.nome}` : tutorial ? '🎓 Tutorial' : modo === 'elixir2x' ? 'Evento: elixir em dobro' : 'Batalha'));
  }

  // ---------- Emotes ----------
  const EMOTES = [
    { id: 'oi', ic: '👋', txt: 'Oi!' }, { id: 'gg', ic: '👍', txt: 'GG!' }, { id: 'boa', ic: '👏', txt: 'Boa jogada!' }, { id: 'kkk', ic: '😂', txt: 'Kkkkk' },
    { id: 'uau', ic: '😮', txt: 'Uau!' }, { id: 'pensa', ic: '🤔', txt: 'Hmmm...' }, { id: 'raiva', ic: '😡', txt: 'Grrr!' }, { id: 'chora', ic: '😭', txt: 'Buáá...' },
    { id: 'goku', carta: 'goku_base', txt: 'Oi, eu sou o Goku!' }, { id: 'gojo', carta: 'gojo', txt: 'Relaxa, eu sou o mais forte.' },
    { id: 'nino', carta: 'nino_nakano', txt: 'Baka!!' }, { id: 'robin', carta: 'robin', txt: 'Fufu~' },
    { id: 'akame', carta: 'akame', txt: 'Eliminar.' }, { id: 'bulma', carta: 'bulma', txt: 'Gênia, eu sei.' },
  ];
  // personagens: só aparecem se você tem a carta
  const emotesLiberados = () => EMOTES.filter((e) => !e.carta || Estado.tem(e.carta));
  function mostrarEmote(ladoTela, id) {
    typeof Som !== 'undefined' && Som.tocar('emote');
    const e = EMOTES.find((x) => x.id === id);
    const jan = document.querySelector('.arena-grande-janela');
    if (!e || !jan) return;
    jan.querySelectorAll(`.emote-balao.${ladoTela}`).forEach((x) => x.remove());
    const b = document.createElement('div');
    b.className = `emote-balao ${ladoTela}${e.carta ? ' de-carta' : ''}`;
    b.innerHTML = `${e.carta ? `<img src="assets/cartas/${e.carta}_medalhao.png" alt="" />` : `<span class="emote-ic">${e.ic}</span>`}<b>${e.txt}</b>`;
    jan.appendChild(b);
    setTimeout(() => b.remove(), 2400);
  }
  // quem = lado do host (azul, azul2, vermelho, vermelho2); no host os lados da tela são os mesmos
  function emote(quem, id) {
    if (!s || s.acabou || !EMOTES.some((x) => x.id === id)) return;
    mostrarEmote(quem, id);
    if (s.rede || s.aoVivo) s.eventos.push(['e', quem, id]);
    // a IA às vezes responde
    if (s.ias && s.ias.length && !s.ias.includes(quem) && Math.random() < 0.5) {
      const rival = s.ias.find((l) => timeDe(l) !== timeDe(quem));
      if (rival) agendar(0.8 + Math.random() * 1.2, () => emoteIA(rival, id === 'kkk' ? ['raiva', 'kkk'] : id === 'gg' ? ['gg', 'boa'] : id === 'raiva' || id === 'chora' ? ['kkk', 'pensa'] : ['oi', 'kkk', 'uau', 'pensa']));
    }
  }
  function emoteIA(lado, opcoes) {
    if (!s || s.acabou || (s.iaEmote || 0) > s.t) return;
    s.iaEmote = s.t + 6;
    const id = opcoes[Math.floor(Math.random() * opcoes.length)];
    mostrarEmote(lado, id);
    if (s.rede || s.aoVivo) s.eventos.push(['e', lado, id]);
  }
  function botaoEmote() {
    const jan = document.querySelector('.arena-grande-janela');
    jan.querySelectorAll('.btn-emote, .painel-emotes').forEach((x) => x.remove());
    if (s.espectador) return;
    const btn = document.createElement('button');
    btn.className = 'btn-emote'; btn.type = 'button'; btn.textContent = '💬'; btn.title = 'Emotes';
    const painel = document.createElement('div');
    painel.className = 'painel-emotes oculto';
    painel.innerHTML = emotesLiberados().map((e) => `<button type="button" data-emote="${e.id}">${e.carta ? `<img src="assets/cartas/${e.carta}_medalhao.png" alt="" />` : `<span>${e.ic}</span>`}<small>${e.txt}</small></button>`).join('');
    btn.onpointerdown = (ev) => { ev.stopPropagation(); painel.classList.toggle('oculto'); };
    painel.onpointerdown = (ev) => {
      ev.stopPropagation();
      const b = ev.target.closest('[data-emote]');
      if (!b || !s || btn.classList.contains('esperando')) return;
      painel.classList.add('oculto');
      btn.classList.add('esperando');
      setTimeout(() => btn.classList.remove('esperando'), 2500);
      if (s.convidado) { mostrarEmote('azul', b.dataset.emote); s.rede.enviarComando({ tipo: 'emote', id: b.dataset.emote, lado: s.dupla ? s.meuLado : undefined }); }
      else emote('azul', b.dataset.emote);
      if (typeof Missoes !== 'undefined') Missoes.contar('emotes', 1);
    };
    jan.append(btn, painel);
  }

  function montar(titulo) {
    const arena = $('arena-grande');
    Arena.render(arena, { arena: s.arenaId });
    s.arena = arena;
    escala = (arena.clientWidth || W) / W;
    if (!observador && 'ResizeObserver' in window) observador = new ResizeObserver(() => medirArena());
    if (observador) { observador.disconnect(); observador.observe(arena); }
    // barras de vida das torres
    for (const t of s.ent) {
      t.el = document.createElement('div');
      t.el.className = `vida-torre ${t.time} ${t.tipo}`;
      Object.assign(t.el.style, pct(t.x, t.y + (t.tipo === 'rei' ? 40 : 34)));
      const emoji = t.tipo === 'rei' ? '👑' : (Estado.TROPAS_TORRE[t.tropa] || Estado.TROPAS_TORRE.princesa).emoji;
      t.el.innerHTML = `<span class="nv-torre">${t.nivel}</span><span class="hp-icone">${emoji}</span>${barraHp()}<b>${t.vida}</b>`;
      arena.appendChild(t.el);
    }
    s.zona = document.createElement('div');
    s.zona.className = 'zona-proibida';
    s.zona.innerHTML = '<div class="zona-lado esq"></div><div class="zona-lado dir"></div>';
    arena.appendChild(s.zona);
    atualizarZona();
    arena.onpointerdown = tocarArena;
    let hab = document.getElementById('habilidades');
    if (!hab) { hab = document.createElement('div'); hab.id = 'habilidades'; document.querySelector('.arena-grande-janela').appendChild(hab); }
    hab.innerHTML = '';
    s.habTimer = 0;
    document.querySelectorAll('.chip-parceiro').forEach((e) => e.remove());
    s.chipP = null;
    if (s.dupla) {
      s.chipP = document.createElement('div');
      s.chipP.className = 'chip-parceiro';
      s.chipP.innerHTML = '<span>🤝</span><b></b><i class="gota-mini"></i><em>5</em>';
      document.querySelector('.arena-grande-janela').appendChild(s.chipP);
    }
    $('btn-sair').onclick = desistir;
    botaoEmote();
    if (typeof Som !== 'undefined') Som.musica('batalha');
    if (s.superIA) {
      const jan = document.querySelector('.arena-grande-janela');
      const b = document.createElement('div');
      b.className = 'aviso-super-ia';
      b.innerHTML = '<b>🧠 IA SUPER INTELIGENTE</b><small>Essa é rara! Vencer ela vale muito.</small>';
      jan.appendChild(b);
      setTimeout(() => b.remove(), 3200);
      jan.classList.add('contra-super');
    } else document.querySelector('.arena-grande-janela').classList.remove('contra-super');
    document.querySelector('.selo-previa').textContent = titulo;
    atualizarPlacar();
    desenharMao();
    $('batalha').classList.remove('oculto');
    document.body.classList.add('em-batalha');
    s.ultimo = performance.now();
    requestAnimationFrame(loop);
  }

  // ---------- Mão de cartas ----------
  function desenharMao() {
    const a = s.azul;
    const mao = a.fila.slice(0, 4);
    $('mao').innerHTML = mao.map((id, i) => {
      const c = Estado.carta(id);
      const caro = c.custo > a.elixir ? ' caro' : '';
      const sel = s.selecionada === i ? ' selecionada' : '';
      // Duelo do Faraó: cartas viradas para baixo (só dá pra ver o custo)
      if (s.viradas) return `<div class="slot-mao virada${caro}${sel}" data-i="${i}"><div class="carta-costas"><b>${c.custo}</b></div></div>`;
      // evolução: mostra se a próxima vez que jogar ela vem evoluída
      let evo = '';
      if (c.evolucao) {
        const carga = (s.evoCarga && s.evoCarga[`azul:${id}`]) || 0, pronta = carga >= c.evolucao.ciclos;
        evo = pronta ? ' evo-pronta' : '';
        const pips = Array.from({ length: c.evolucao.ciclos }, (_, k) => `<i class="${k < carga ? 'cheio' : ''}"></i>`).join('');
        return `<div class="slot-mao${caro}${sel}${evo}" data-i="${i}">${Cartas.html(c, { mini: true })}<div class="evo-pips">${pronta ? '<b>EVO!</b>' : pips}</div></div>`;
      }
      return `<div class="slot-mao${caro}${sel}" data-i="${i}">${Cartas.html(c, { mini: true })}</div>`;
    }).join('');
    const prox = a.fila[4] ? Estado.carta(a.fila[4]) : null;
    document.querySelector('.proxima').innerHTML = `<small>Próxima</small>${prox && !s.viradas ? `<div class="mini-prox">${Cartas.html(prox, { mini: true })}</div>` : '<div class="carta-vazia mini">?</div>'}`;
    $('mao').querySelectorAll('.slot-mao').forEach((el) => {
      el.onpointerdown = (ev) => comecarArrastar(ev, +el.dataset.i, el);
    });
  }

  function atualizarElixir() {
    const e = s.azul.elixir;
    if (!s.elxEl) s.elxEl = { spans: [...document.querySelectorAll('#barra-elixir span')], gota: document.querySelector('.gota') };
    const cheio = Math.floor(e);
    s.elxEl.spans.forEach((sp, i) => {
      const cl = i < cheio ? 'cheio' : i < e ? 'enchendo' : '';
      if (sp.className !== cl) sp.className = cl;
      if (i === cheio) sp.style.setProperty('--p', `${Math.round((e % 1) * 100)}%`);
    });
    if (s.elxEl.gota.dataset.n !== String(cheio)) s.elxEl.gota.dataset.n = cheio;
    $('mao').querySelectorAll('.slot-mao').forEach((el) => {
      const c = Estado.carta(s.azul.fila[+el.dataset.i]);
      const caro = c.custo > e;
      if (el.classList.contains('caro') !== caro) el.classList.toggle('caro', caro);
    });
  }

  // Arrastar a carta até a arena (ou tocar na carta e depois na arena)
  function comecarArrastar(ev, i, el) {
    if (s.espectador) return;
    if (s.acabou) return;
    ev.preventDefault();
    const c = Estado.carta(s.azul.fila[i]);
    const x0 = ev.clientX, y0 = ev.clientY;
    let fantasma = null;
    const mover = (e) => {
      if (!fantasma && Math.hypot(e.clientX - x0, e.clientY - y0) > 12) {
        fantasma = document.createElement('div');
        const mira = c.feitico || c.barril;
        fantasma.className = `fantasma ${mira ? 'feitico-alvo' : ''}`;
        fantasma.innerHTML = c.feitico ? '' : `<img src="assets/cartas/${c.id}_medalhao.png" alt="" />`;
        if (mira) fantasma.style.width = `${((c.area || 30) * 2 / W) * s.arena.getBoundingClientRect().width}px`;
        document.getElementById('app').appendChild(fantasma);
        s.selecionada = i;
        s.zona.classList.toggle('ativa', !mira);
        el.classList.add('arrastando');
      }
      if (fantasma) {
        const app = document.getElementById('app').getBoundingClientRect();
        fantasma.style.left = `${e.clientX - app.left}px`;
        fantasma.style.top = `${e.clientY - app.top}px`;
        const r = s.arena.getBoundingClientRect();
        const dentro = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
        fantasma.classList.toggle('fora', !dentro);
      }
    };
    const soltar = (e) => {
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
      document.removeEventListener('pointercancel', soltar);
      el.classList.remove('arrastando');
      if (fantasma) {
        fantasma.remove();
        const r = s.arena.getBoundingClientRect();
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) tocarArena(e);
        else { s.selecionada = null; s.zona.classList.remove('ativa'); desenharMao(); }
      } else {
        // foi só um toque: seleciona/desseleciona
        s.selecionada = s.selecionada === i ? null : i;
        s.zona.classList.toggle('ativa', s.selecionada !== null && !c.feitico && !c.barril);
        desenharMao();
      }
    };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', soltar);
  }

  // ---------- Onde cada time pode colocar tropas ----------
  const BOLSO_AZUL = 150, BOLSO_VERMELHO = 470; // até onde dá pra ir no lado inimigo depois de derrubar a torre
  const torreViva = (id) => s.ent.some((e) => e.torre && e.id === id);

  function podeColocar(time, x, y) {
    if (x < 26 || x > W - 26) return false;
    const esq = x < W / 2;
    if (time === 'azul') {
      if (y > H - 30) return false;
      if (y >= RIO_BASE + 6) return true;
      const caiu = !torreViva(esq ? 'esq-vermelho' : 'dir-vermelho');
      return caiu && y >= BOLSO_AZUL && y <= RIO_TOPO - 6;
    }
    if (y < 30) return false;
    if (y <= RIO_TOPO - 6) return true;
    const caiu = !torreViva(esq ? 'esq-azul' : 'dir-azul');
    return caiu && y <= BOLSO_VERMELHO - 40 && y >= RIO_BASE + 6;
  }

  function atualizarZona() {
    const alt = (lado) => (torreViva(`${lado}-vermelho`) ? RIO_BASE + 6 : BOLSO_AZUL);
    s.zona.querySelector('.esq').style.height = `${(alt('esq') / H) * 100}%`;
    s.zona.querySelector('.dir').style.height = `${(alt('dir') / H) * 100}%`;
  }

  function tocarArena(ev) {
    if (s.espectador) return;
    if (s.selecionada === null || s.acabou) return;
    const r = s.arena.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    const y = ((ev.clientY - r.top) / r.height) * H;
    const id = s.azul.fila[s.selecionada];
    const c = Estado.carta(id);
    if (!c.feitico && !c.barril && !podeColocar('azul', x, y)) {
      UI.toast('Coloque tropas fora da área vermelha');
      return;
    }
    if (c.custo > s.azul.elixir) { UI.toast('Elixir insuficiente'); return; }
    contarCarta(c);
    if (s.convidado) {
      s.rede.enviarComando({ tipo: 'carta', i: s.selecionada, x: Math.round(x), y: Math.round(y), lado: s.dupla ? s.meuLado : undefined }); // o host espelha
      efeito('onda-surgir azul', x, y, 700); // retorno imediato enquanto o host confirma
      if (c.evolucao) { if (!s.evoCarga) s.evoCarga = {}; const k = `azul:${c.id}`; s.evoCarga[k] = (s.evoCarga[k] || 0) >= c.evolucao.ciclos ? 0 : (s.evoCarga[k] || 0) + 1; }
      s.azul.elixir -= c.custo;
      s.selecionada = null; s.zona.classList.remove('ativa'); desenharMao();
      return;
    }
    jogar('azul', s.selecionada, x, y);
    s.selecionada = null;
    s.zona.classList.remove('ativa');
    desenharMao();
  }

  function jogar(quem, indice, x, y) {
    typeof Som !== 'undefined' && Som.tocar('carta');
    const time = timeDe(quem);
    const L = s[quem];
    const id = L.fila[indice];
    const c = Estado.carta(id);
    L.elixir -= c.custo;
    L.fila.splice(indice, 1);
    L.fila.push(id);
    const nivel = s.nivelFixo ? s.nivelFixo : quem === 'azul' ? Estado.nivelEfetivo(id)
      : s.niveis && s.niveis[quem] ? (s.niveis[quem][id] || 1)
      : quem === 'azul2' && s.niveisAzul2 ? (s.niveisAzul2[id] || 1)
      : s.niveisV ? (s.niveisV[id] || 1) : nivelCartaIA(id);
    const f = Math.pow(1.1, nivel - 1) * (quem === 'azul' && Mod.flag('danoX5') ? 5 : 1) * (quem === 'azul' && id === 'mita_gentil' && !s.convidado ? 1 + Estado.mitaAfeto() / 400 : 1);
    if (c.feitico) {
      lancarFeitico(time, c, x, y, Math.round(c.dano * f));
    } else if (c.barril) {
      lancarBarril(time, c, x, y, f, nivel, quem);
    } else {
      // evolução: depois de jogar a carta X vezes, a próxima vem evoluída
      let evo = false;
      if (c.evolucao) {
        if (!s.evoCarga) s.evoCarga = {};
        const k = `${quem}:${id}`;
        evo = (s.evoCarga[k] || 0) >= c.evolucao.ciclos;
        s.evoCarga[k] = evo ? 0 : (s.evoCarga[k] || 0) + 1;
      }
      const t = donoDe(criarTropa(time, c, x, y, evo ? f * 1.2 : f, nivel, { evo }), quem);
      if (evo) agendar(1.05, () => { if (t.vida > 0) expansaoDominio(t); });
    }
  }
  // marca de quem é a tropa (no 2v2 as do parceiro ganham um selo)
  function donoDe(t, quem) {
    if (!t) return t;
    t.dono = quem;
    if (s.dupla && quem === 'azul2') t.el.classList.add('parceiro');
    return t;
  }

  // ---------- Barras de vida e efeitos ----------
  const barraHp = () => '<div class="hp"><i class="hp-rastro"></i><i class="hp-fill"></i><i class="hp-brilho"></i></div>';

  function atualizarHp(e) {
    const p = Math.max(0, Math.min(1, e.vida / e.max));
    if (!e.hpEl) { e.hpEl = e.el.querySelector('.hp'); e.hpFill = e.hpEl.querySelector('.hp-fill'); e.hpRastro = e.hpEl.querySelector('.hp-rastro'); }
    e.hpFill.style.transform = `scaleX(${p.toFixed(3)})`;
    e.hpRastro.style.transform = `scaleX(${p.toFixed(3)})`;
    const faixa = p < 0.25 ? 'baixa' : p < 0.5 ? 'media' : '';
    if (faixa !== e.hpFaixa) { e.hpEl.classList.toggle('media', faixa === 'media'); e.hpEl.classList.toggle('baixa', faixa === 'baixa'); e.hpFaixa = faixa; }
    if (!e.ferido && p < 1) { e.ferido = true; e.el.classList.add('ferido'); }
  }

  function efeito(classe, x, y, ms, estilo = {}) {
    const el = document.createElement('div');
    el.className = classe;
    Object.assign(el.style, pct(x, y), estilo);
    s.arena.appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }

  function particulas(x, y, cor, qtd = 8, forca = 26) {
    qtd = Math.min(qtd, LIMITE.particula - vivos.particula);
    if (qtd <= 0) return;
    vivos.particula += qtd;
    setTimeout(() => (vivos.particula -= qtd), 600);
    for (let i = 0; i < qtd; i++) {
      const a = (i / qtd) * Math.PI * 2 + Math.random() * 0.5;
      const d = forca * (0.6 + Math.random() * 0.6);
      efeito('particula', x, y, 600, { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 8}px`, background: cor });
    }
  }

  function tremer(forte = false) {
    if (forte) typeof Som !== 'undefined' && Som.tocar('explosao');
    s.arena.classList.remove('tremendo', 'tremendo-forte');
    piscar(s.arena, forte ? 'tremendo-forte' : 'tremendo');
  }

  // ---------- Agenda (coisas que acontecem um pouco depois, dentro do tempo do jogo) ----------
  function agendar(seg, fn) { s.agenda.push({ t: s.t + seg, fn }); }
  function rodarAgenda() {
    if (!s.agenda.length) return;
    const agora = s.agenda.filter((a) => a.t <= s.t);
    if (!agora.length) return;
    s.agenda = s.agenda.filter((a) => a.t > s.t);
    for (const a of agora) { try { a.fn(); } catch (e) { console.error(e); } }
  }

  // ---------- Entidades ----------
  function criarTropa(time, c, x, y, f, nivel, opc = {}) {
    const t = {
      id: ++s.id, time, dono: time, carta: c, x, y, raio: 13,
      vida: Math.round(c.vida * f), max: Math.round(c.vida * f), dano: Math.round(c.dano * f),
      alcance: c.alcance, vel: c.velocidade, cadencia: c.cadencia, cd: 0.6, area: c.area || 0,
      alvoTipo: c.alvo || 'tudo', surgir: 1, alvo: null, nasceu: s.t,
      habilidade: c.habilidade || null, recarga: 0, golpesFortes: 0, furia: 0, fenix: 0, nivel, f,
      congelado: 0, adaptacao: 0, adaptTimer: 0, danoBase: Math.round(c.dano * f), velBase: c.velocidade,
      atk: Ataques.de(c), classe: Ataques.classeDe(c), golpes: 0,
      atord: 0, lento: 0, lentoPct: 0, queima: 0, queimaDps: 0, queimaAcum: 0, fraco: 0, fracoPct: 0,
      lentoAtq: 0, lentoAtqPct: 0, marcado: 0, marcaPct: 0, escudo: 0, escudoMax: 0, teleCd: 1.5, investiu: false, buffVel: 0,
    };
    const m0 = t.atk.m || {};
    if (m0.escudo) { t.escudo = t.escudoMax = Math.round(t.max * m0.escudo); }
    t.evo = !!opc.evo;
    if (m0.gojo) { t.infinito = t.evo ? 4 : 2; t.infMax = t.infinito; t.infTimer = 0; }
    t.voo = !!m0.voo;
    if (c.token) t.raio = 8;
    t.el = document.createElement('div');
    t.el.className = `tropa ${time} surgindo${c.token ? ' mini' : ''}${c.habilidade ? ' campea' : ''}${t.escudo ? ' com-escudo' : ''}${t.voo ? ' voando' : ''}${c.evolucao ? ' carta-evo' : ''}${t.evo ? ' evoluida' : ''}${t.infinito ? ' com-infinito' : ''}`;
    t.el.innerHTML = `${barraHp()}
      <div class="tropa-corpo">${c.evolucao ? '<i class="aura-evo"></i><i class="aura-evo dois"></i>' : ''}${t.evo ? '<span class="selo-evo">EVO</span>' : ''}<div class="tropa-medalhao">${c.videoRosto ? `<video src="assets/cartas/${c.videoRosto}" poster="assets/cartas/${c.id}_medalhao.png" autoplay muted loop playsinline></video>` : `<img src="assets/cartas/${c.id}_medalhao.png" alt="" />`}<b>${nivel}</b>${c.passiva && c.passiva.tipo === 'adaptar' ? '<i class="selo-adapt"></i>' : ''}</div></div><div class="tropa-sombra"></div>`;
    s.arena.appendChild(t.el);
    s.ent.push(t);
    posicionar(t);
    efeito(`onda-surgir ${time}`, x, y, 700);
    setTimeout(() => { if (s && !s.acabou) { efeito(`onda-pouso ${time}`, t.x, t.y, 500); particulas(t.x, t.y + 4, '#ffffffcc', 6, 18); } }, 650);
    if (m0.superForma) { t.aneis = m0.superForma; t.aneisMax = m0.superForma; t.el.classList.add('super-forma'); }
    if (m0.aneis) t.aneis = 0;
    if (m0.esmeraldas) { t.esmeraldas = m0.esmeraldas; t.el.classList.add('com-esmeraldas'); t.el.style.setProperty('--esm', m0.esmeraldas); }
    if (m0.hyperFlash) t.flashTimer = m0.hyperFlash[0];
    if (m0.duelista) t.cartaTimer = 2.2;
    if (m0.sombras) { t.intocavel = m0.sombras; t.sombra = m0.sombras; t.el.classList.add('sombra'); }
    if (m0.surgirImpacto) agendar(1, () => { if (t.vida > 0) explosaoArea(t, t, Math.round(t.dano * m0.surgirImpacto[0]), m0.surgirImpacto[1], { visual: 'impacto', cor: t.atk.v.cor, empurrar: 14 }); });
    return t;
  }

  // barril voa da torre do rei, quebra e solta as minis
  function lancarBarril(time, c, x, y, f, nivel, quem = time) {
    if (s.rede || s.aoVivo) s.eventos.push(['b', Math.round(x), Math.round(y), time === 'azul' ? 0 : 1]);
    const rei = s.ent.find((e) => e.torre && e.tipo === 'rei' && e.time === time) || { x: W / 2, y: time === 'azul' ? H - 70 : 60 };
    const b = document.createElement('div');
    b.className = 'barril-voando';
    Object.assign(b.style, pct(rei.x, rei.y));
    s.arena.appendChild(b);
    requestAnimationFrame(() => requestAnimationFrame(() => { Object.assign(b.style, pct(x, y)); b.classList.add('voando'); }));
    setTimeout(() => {
      b.remove();
      if (!s || s.acabou) return;
      efeito('barril-quebra', x, y, 500);
      particulas(x, y, '#BA7517', 10, 24);
      const mini = Estado.carta(c.barril.tropa);
      for (let i = 0; i < c.barril.qtd; i++) {
        const a = (i / c.barril.qtd) * Math.PI * 2;
        donoDe(criarTropa(time, mini, x + Math.cos(a) * 12, y + Math.sin(a) * 10, f, nivel), quem);
      }
    }, 750);
  }

  function lancarFeitico(time, c, x, y, dano) {
    typeof Som !== 'undefined' && Som.tocar('feitico');
    if (s.rede || s.aoVivo) s.eventos.push(['f', c.id, Math.round(x), Math.round(y), time === 'azul' ? 0 : 1]);
    const largura = { width: `${((c.area * 2) / W) * 100}%` };
    efeito(`mira-feitico ${time}`, x, y, 650, largura);
    if (c.id === 'lanterna') {
      // lanterna cai do céu e explode
      efeito('lanterna-caindo', x, y, 460);
    } else {
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * c.area;
        efeito('petala-feitico', x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 800, { animationDelay: `${Math.random() * 0.3}s` });
      }
    }
    setTimeout(() => {
      if (!s || s.acabou) return;
      efeito(`feitico ${c.id}`, x, y, 700, largura);
      particulas(x, y, c.id === 'lanterna' ? '#FAC775' : '#F4C0D1', 12, c.area);
      if (c.id === 'lanterna') tremer();
      for (const e of [...s.ent]) {
        if (e.time === time || e.vida <= 0) continue;
        if (dist(e, { x, y }) <= c.area + e.raio) ferir(e, e.torre ? Math.round(dano * 0.35) : dano, time);
      }
    }, 450);
  }

  function posicionar(e) {
    e.el.style.transform = tr(e.x, e.y, 'translate(-50%, -60%)');
    const z = 5 + Math.round(e.y / 3) * 3;
    if (z !== e.z) { e.z = z; e.el.style.zIndex = z; }
  }
  function medirArena() {
    if (!s || !s.arena) return;
    const w = s.arena.clientWidth;
    if (!w) return;
    escala = w / W;
    for (const e of s.ent) if (!e.torre && e.el) posicionar(e);
  }

  function ferir(e, dano, deTime, fonte = null, opc = {}) {
    if (e.vida <= 0) return 0;
    if (e.torre && e.time === 'azul' && Mod.flag('torresInvenciveis')) return 0;
    // esquiva (Instinto Superior): o golpe erra
    if (!e.torre && e.carta && !opc.semEsquiva) {
      const pv = e.carta.passiva;
      const chance = e.esquiva > 0 ? e.esquivaChance : pv && pv.tipo === 'esquiva' ? pv.chance : 0;
      if (chance && Math.random() < chance) {
        esquivou(e);
        const me = e.atk && e.atk.m;
        if (me && me.contraEsquiva && fonte && fonte.vida > 0 && dist(e, fonte) < 90) {
          golpeVisual(e, fonte, e.atk.v);
          ferir(fonte, Math.round(e.dano * multClasse(e, fonte)), e.time, null, { semEsquiva: true, semContra: true });
        }
        return 0;
      }
    }
    // pulando / atravessando (Goku Presságio e MUI): nada acerta
    if (!e.torre && e.intocavel > 0) { esquivou(e); return 0; }
    // Diavolo: vê o golpe no futuro e desvia (a cada 7s)
    if (!e.torre && fonte && !opc.atravessa && e.atk && e.atk.m && e.atk.m.epitafio && (e.epitafioAte || 0) <= s.t && dano >= 25) { e.epitafioAte = s.t + e.atk.m.epitafio; falar(e, 'Epitáfio!', 'fala-jojo'); esquivou(e); return 0; }
    // Infinito (Gojo): o golpe para no ar e não encosta nele
    if (!e.torre && e.infinito > 0 && !opc.atravessa) {
      e.infinito--;
      numero(e, 0, 'infinito');
      fxEl('fx-infinito', e.x, e.y - 4, 420);
      if (e.infinito <= 0) e.el.classList.remove('com-infinito');
      return 0;
    }
    const ms = !e.torre && e.atk && e.atk.m;
    if (ms && !opc.refletido) {
      // Yugi: Armadilha Espelho devolve o golpe
      if (e.espelho > 0 && fonte && fonte.vida > 0 && opc.tipo !== 'queimadura') {
        e.espelho--; if (e.espelho <= 0) e.el.classList.remove('com-espelho');
        numero(e, 0, 'escudo'); fxEl('fx-espelho', e.x, e.y, 500);
        ferir(fonte, dano, e.time, e, { refletido: true, semContra: true, semEsquiva: true, atravessa: true });
        return 0;
      }
      // Super Sonic: enquanto tiver anéis, nada machuca (mas cada golpe gasta anéis)
      if (ms.superForma && e.aneis > 0) {
        e.aneis -= Math.max(1, Math.ceil(dano / 70));
        numero(e, 0, 'escudo');
        if (e.aneis <= 0) destransformar(e);
        return 0;
      }
      // Hyper Sonic: cada Esmeralda do Caos segura um golpe inteiro
      // (cada esmeralda segura até 110 de dano; golpe maior passa o resto)
      if (ms.esmeraldas && e.esmeraldas > 0 && !opc.atravessa && opc.tipo !== 'queimadura' && dano >= 20) {
        e.esmeraldas--; e.el.style.setProperty('--esm', e.esmeraldas);
        if (e.esmeraldas <= 0) e.el.classList.remove('com-esmeraldas');
        particulas(e.x, e.y - 6, ['#4ADE80', '#60A5FA', '#F472B6', '#FACC15', '#F87171', '#E5E7EB', '#22D3EE'][e.esmeraldas % 7], 6, 18);
        dano -= 110;
        if (dano <= 0) { numero(e, 0, 'escudo'); return 0; }
      }
      // Sonic Excalibur: apara um golpe de perto e contra-ataca (a cada alguns segundos)
      if (ms.aparar && fonte && !fonte.torre && fonte.vida > 0 && dist(e, fonte) < 60 && !(e.apararAte > s.t) && e.atord <= 0) {
        e.apararAte = s.t + ms.aparar;
        numero(e, 0, 'escudo'); falar(e, 'Aparei!', 'fala-sonic');
        golpeVisual(e, fonte, e.atk.v);
        agendar(0.08, () => { if (fonte.vida > 0 && e.vida > 0) ferir(fonte, Math.round(e.dano * 1.3 * multClasse(e, fonte)), e.time, e, { semContra: true }); });
        return 0;
      }
    }
    if (e.adaptacao && e.carta && e.carta.passiva && e.carta.passiva.tipo === 'adaptar') dano = Math.round(dano * (1 - e.carta.passiva.defesa * e.adaptacao));
    if (e.marcado > 0) dano = Math.round(dano * (1 + e.marcaPct));
    // escudo absorve primeiro
    if (e.escudo > 0) {
      const abs = Math.min(e.escudo, dano);
      e.escudo -= abs; dano -= abs;
      if (e.escudo <= 0) { e.el.classList.remove('com-escudo'); particulas(e.x, e.y, '#BFE8FF', 8, 22); }
      if (dano <= 0) { numero(e, 0, 'escudo'); return 0; }
    }
    // contra-ataque
    const mc = !e.torre && e.atk && e.atk.m;
    if (mc && mc.contra && fonte && fonte.vida > 0 && !opc.semContra && dist(e, fonte) < 60 && Math.random() < mc.contra[0]) {
      golpeVisual(e, fonte, e.atk.v);
      agendar(0.05, () => ferir(fonte, Math.round(e.dano * mc.contra[1]), e.time, null, { semContra: true }));
    }
    if (ms && ms.aneis && e.aneis >= 5 && e.vida - dano <= 0) {
      e.aneis = 0; e.vida = Math.round(e.max * 0.25); e.intocavel = 1; e.atord = 0;
      atualizarHp(e);
      fxEl('fx-aneis', e.x, e.y, 800); fxJ(13, e.x, e.y);
      falar(e, 'Meus anéis!', 'fala-sonic');
      return 0;
    }
    e.vida -= dano;
    numero(e, dano, opc.crit ? 'critico' : opc.tipo);
    // Mita Malvada: "Você achou que ia se livrar de mim?"
    if (e.vida <= 0 && !e.torre && !e.reviveu && e.atk && e.atk.m && e.atk.m.mitaMalvada) {
      e.reviveu = true;
      e.vida = Math.round(e.max * 0.5); e.atord = 0; e.intocavel = 0.8;
      atualizarHp(e);
      fxEl('fx-glitch', e.x, e.y, 700); fxJ(8, e.x, e.y);
      falar(e, 'Você achou que ia se livrar de mim?', 'fala-mita-m');
      tremer(true);
      return dano;
    }
    if (!e.torre && e.atk && e.atk.m && e.atk.m.marmita && fonte) ninoBaka(e, dano);
    atualizarHp(e);
    piscar(e.el, 'levou');
    if (e.torre) {
      if (e.tipo === 'rei') e.ativa = true;
      (e.numEl || (e.numEl = e.el.querySelector('b'))).textContent = Math.max(0, Math.round(e.vida));
      const img = e.img || (e.img = s.arena.querySelector(`[data-torre="${e.id}"]`));
      if (img) { piscar(img, 'torre-levou'); }
      if (e.vida <= 0) destruirTorre(e, deTime);
    } else if (e.vida <= 0 && e.fenix > 0) {
      e.fenix = 0;
      e.vida = Math.round(e.max * 0.5);
      atualizarHp(e);
      e.el.classList.remove('aura-fenix');
      efeito('renascer', e.x, e.y, 900);
      particulas(e.x, e.y, '#FAC775', 14, 34);
    } else if (e.vida <= 0) {
      if (e.isca) borboletas(e);
      for (const o of s.ent) if (o !== e && !o.torre && o.time === e.time && o.vida > 0 && o.atk && o.atk.m && o.atk.m.raivaSombria && dist(o, e) < 170) enfurecer(o);
      if (e.rotInf && e.rotInf.resta > 0.6) {
        const r = e.rotInf, f = r.fonte;
        const prox = s.ent.filter((o) => !o.torre && o !== e && o.time === e.time && o.vida > 0 && dist(o, e) < 170).sort((a, b) => dist(a, e) - dist(b, e))[0];
        e.rotInf = null;
        if (prox) aplicarRotacao(prox, f, r.dps, r.resta);
      }
      e.el.classList.add('morrendo');
      const el = e.el;
      efeito(`poof ${e.time}`, e.x, e.y, 500);
      particulas(e.x, e.y, e.time === 'azul' ? '#85B7EB' : '#F09595', 10, 30);
      setTimeout(() => el.remove(), 400);
      s.ent = s.ent.filter((x) => x !== e);
      // Vegito EX: ao derrotar alguém, se teletransporta para o próximo
      if (fonte && fonte.vida > 0 && fonte.atk && fonte.atk.m && fonte.atk.m.teleCadeia) {
        const prox = s.ent.filter((x) => !x.torre && x.time !== fonte.time && x.vida > 0 && dist(x, fonte) < 130).sort((a, b) => dist(a, fonte) - dist(b, fonte))[0];
        if (prox) agendar(0.15, () => teleportar(fonte, prox));
      }
    }
    return dano;
  }

  function numero(e, dano, tipo = '') {
    if (vivos.numero >= LIMITE.numero) return;
    vivos.numero++;
    setTimeout(() => vivos.numero--, 650);
    const n = document.createElement('div');
    n.className = `dano-num${dano >= 250 ? ' grande' : ''}${tipo ? ` ${tipo}` : ''}`;
    n.textContent = tipo === 'critico' ? `${dano}!` : tipo === 'escudo' ? '🛡️' : tipo === 'infinito' ? '∞' : dano;
    Object.assign(n.style, pct(e.x + (Math.random() * 16 - 8), e.y - 22));
    s.arena.appendChild(n);
    setTimeout(() => n.remove(), 650);
  }

  function torreCaiuVisual(t) {
    if (!s.ent.includes(t)) return;
    t.vida = 0;
    const img = s.arena.querySelector(`[data-torre="${t.id}"]`);
    if (img) img.classList.add('destruida');
    t.el.remove();
    s.ent = s.ent.filter((x) => x !== t);
    efeito('explosao-torre', t.x, t.y, 900);
    particulas(t.x, t.y, '#B4B2A9', 16, 50);
    tremer(true);
    try { coroaVoando(t); } catch (e) { /* nada */ }
    atualizarZona();
  }

  function destruirTorre(t, deTime) {
    typeof Som !== 'undefined' && Som.tocar('torre');
    t.vida = 0;
    if (s.ias && s.ias.length) {
      const perdeu = s.ias.find((l) => timeDe(l) === t.time), ganhou = s.ias.find((l) => timeDe(l) !== t.time);
      if (perdeu && Math.random() < 0.5) emoteIA(perdeu, ['chora', 'raiva']);
      else if (ganhou && Math.random() < 0.5) emoteIA(ganhou, ['kkk', 'uau']);
    }
    const img = s.arena.querySelector(`[data-torre="${t.id}"]`);
    if (img) img.classList.add('destruida');
    t.el.remove();
    efeito('explosao-torre', t.x, t.y, 900);
    particulas(t.x, t.y, '#B4B2A9', 16, 50);
    particulas(t.x, t.y, '#FAC775', 10, 36);
    tremer(true);
    try { coroaVoando(t); } catch (e) { console.warn('efeito da coroa:', e); }
    s.ent = s.ent.filter((x) => x !== t);
    const vencedor = t.time === 'azul' ? 'vermelho' : 'azul';
    atualizarZona();
    if (t.time === 'vermelho' && t.tipo === 'princesa') setTimeout(() => s && !s.acabou && UI.toast('Área liberada! Agora dá pra colocar tropas na frente da torre 🎯'), 1200);
    if (t.tipo === 'rei') {
      s[vencedor].coroas = 3;
      atualizarPlacar();
      return terminar();
    }
    s[vencedor].coroas++;
    // rei acorda quando perde uma torre
    const rei = s.ent.find((e) => e.torre && e.tipo === 'rei' && e.time === t.time);
    if (rei) rei.ativa = true;
    atualizarPlacar();
    UI.toast(t.time === 'azul' ? 'Você perdeu uma torre!' : 'Torre derrubada! 👑');
    if (s.prorrogacao) terminar();
  }

  const placar = (time) => document.querySelector(time === 'azul' ? '.placar .coroa.azul' : '.placar .coroa.vermelha');

  function coroaVoando(t) {
    const vencedor = t.time === 'azul' ? 'vermelho' : 'azul';
    const elPlacar = placar(vencedor);
    if (!elPlacar) return;
    const alvo = elPlacar.getBoundingClientRect();
    const r = s.arena.getBoundingClientRect();
    const app = document.getElementById('app').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'coroa-voando';
    el.textContent = '👑';
    el.style.left = `${r.left - app.left + (t.x / W) * r.width}px`;
    el.style.top = `${r.top - app.top + (t.y / H) * r.height}px`;
    document.getElementById('app').appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.left = `${alvo.left - app.left + alvo.width / 2}px`;
      el.style.top = `${alvo.top - app.top + alvo.height / 2}px`;
      el.classList.add('indo');
    }));
    setTimeout(() => { el.remove(); const c = placar(vencedor); if (c) { piscar(c, 'pulou'); } }, 950);
  }

  function atualizarPlacar() {
    document.querySelector('.coroa.vermelha').textContent = s.vermelho.coroas;
    document.querySelector('.coroa.azul').textContent = s.azul.coroas;
  }

  // missões: o que EU joguei
  function contarCarta(c) {
    if (typeof Missoes === 'undefined' || s.tutorial) return;
    Missoes.contar('cartas', 1);
    if (c.id.startsWith('goku')) Missoes.contar('gokus', 1);
    if (c.feitico) Missoes.contar('feiticos', 1);
  }
  // ---------- Habilidades especiais (gastam elixir) ----------
  function ativarHabilidade(t) {
    if (s.convidado) {
      if (!t.habilidade || t.recarga > 0 || s.azul.elixir < t.habilidade.custo) return false;
      if (typeof Missoes !== 'undefined') Missoes.contar('habilidades', 1);
      s.rede.enviarComando({ tipo: 'hab', id: t.hid, lado: s.dupla ? s.meuLado : undefined });
      t.recarga = t.habilidade.recarga || 10;
      return true;
    }
    const h = t.habilidade;
    const L = jogadorDe(t);
    if (!h || t.vida <= 0 || t.recarga > 0 || L.elixir < h.custo || t.surgir > 0) return false;
    L.elixir -= h.custo;
    t.recarga = h.recarga || 10;
    if (t.dono === 'azul' && typeof Missoes !== 'undefined' && !s.tutorial) Missoes.contar('habilidades', 1);
    efeito(`ativou ${t.time}`, t.x, t.y, 700);
    if (s.rede || s.aoVivo) s.eventos.push(['a', Math.round(t.x), Math.round(t.y), t.time === 'azul' ? 0 : 1]);
    if (h.tipo === 'golpes') { t.golpesFortes = 3; t.multGolpes = h.mult || 2.5; t.el.classList.add('aura-golpes'); }
    if (h.tipo === 'furia') { t.furia = h.duracao || 6; t.el.classList.add('aura-furia'); }
    if (h.tipo === 'fenix') { t.fenix = h.duracao || 10; t.el.classList.add('aura-fenix'); }
    if (h.tipo === 'cura') {
      t.vida = Math.min(t.max, t.vida + Math.round(t.max * 0.5));
      atualizarHp(t);
      particulas(t.x, t.y, '#97C459', 12, 26);
      efeito('cura', t.x, t.y, 800);
    }
    if (h.tipo === 'kamehameha') kamehameha(t, Math.round((h.dano || 1500) * (t.f || 1)), { torreMult: 0.3 });
    if (h.tipo === 'vazioPurpura') {
      fxEl('fx-gojo-carga', t.x, t.y - 6, 650);
      kamehameha(t, Math.round((h.dano || 1100) * (t.f || 1)), { tipo: 2, comp: 420, larg: t.evo ? 56 : 44, torreMult: 0.35, atraso: 0.55 });
    }
    if (h.tipo === 'congelar') congelar(t, h);
    if (h.tipo === 'quintuplas') quintuplas(t);
    if (h.tipo === 'starWorld') starWorld(t);
    if (h.tipo === 'mitaJoga') mitaJoga(t);
    if (h.tipo === 'deletar') deletar(t, h);
    if (h.tipo === 'trunfoMurasame') trunfoMurasame(t, h);
    if (h.tipo === 'chaosControl') chaosControl(t, h);
    if (h.tipo === 'superBoost') superBoost(t, h);
    if (h.tipo === 'explosaoSombria') explosaoSombria(t, h);
    if (h.tipo === 'soulSurge') soulSurge(t, h);
    if (h.tipo === 'hiperRajada') hiperRajada(t, h);
    if (h.tipo === 'reinoSombras') reinoSombras(t, h);
    if (h.tipo === 'zaWarudo') zaWarudo(t, h);
    if (h.tipo === 'kingCrimson') kingCrimson(t);
    if (h.tipo === 'madeInHeaven') madeInHeaven(t);
    if (h.tipo === 'ballBreaker') ballBreaker(t, h);
    if (h.tipo === 'tuskAct4') tuskAct4(t, h);
    if (h.tipo === 'gigantescoMano') gigantescoMano(t, h);
    if (h.tipo === 'esquiva') {
      t.esquiva = h.duracao || 5; t.esquivaChance = h.chance || 0.8;
      if (h.furia) { t.furia = t.esquiva; t.el.classList.add('aura-furia'); }
      t.el.classList.add('aura-instinto');
    }
    if (t.dono === 'azul') UI.toast(`⚡ ${h.nome}!`);
    return true;
  }

  function esquivou(e) {
    typeof Som !== 'undefined' && Som.tocar('esquiva');
    const n = document.createElement('div');
    n.className = 'dano-num esquiva';
    n.textContent = 'esquivou!';
    Object.assign(n.style, pct(e.x + (Math.random() * 16 - 8), e.y - 18));
    s.arena.appendChild(n);
    setTimeout(() => n.remove(), 650);
    piscar(e.el, 'desviando');
  }

  // congela as tropas inimigas em volta (não andam nem atacam)
  function congelar(t, h) {
    const raio = h.raio || 95;
    const centro = (t.alvo && t.alvo.vida > 0 && !t.alvo.torre && dist(t, t.alvo) < 160) ? t.alvo : t;
    efeito('gelo', centro.x, centro.y, 1000);
    particulas(centro.x, centro.y, '#DDF3FF', 16, raio * 0.6);
    if (s.rede || s.aoVivo) s.eventos.push(['g', Math.round(centro.x), Math.round(centro.y), 0]);
    for (const e of s.ent) {
      if (e.torre || e.time === t.time || e.vida <= 0 || dist(e, centro) > raio + e.raio) continue;
      if (e.atk && e.atk.m && e.atk.m.imune) continue;
      e.congelado = h.duracao || 2.5;
      e.el.classList.add('congelada');
      if (h.dano) ferir(e, Math.round(h.dano * (t.f || 1)), t.time);
    }
  }

  // passiva do Isagi: a cada segundo vivo ele se adapta (mais dano, mais rápido e aguenta mais)
  function adaptar(t, dt) {
    const p = t.carta.passiva;
    if (t.adaptacao >= p.max) return;
    t.adaptTimer += dt;
    if (t.adaptTimer < p.intervalo) return;
    t.adaptTimer = 0;
    t.adaptacao++;
    t.dano = Math.round(t.danoBase * (1 + p.dano * t.adaptacao));
    t.vel = t.velBase * (1 + p.vel * t.adaptacao);
    const selo = t.el.querySelector('.selo-adapt');
    if (selo) { selo.textContent = t.adaptacao; piscar(selo, 'pulo'); }
    if (t.adaptacao % 5 === 0) { particulas(t.x, t.y, '#7FE8FF', 8, 20); if (t.time === 'azul' && t.adaptacao === p.max) UI.toast('🧩 Isagi se adaptou totalmente!'); }
    t.el.classList.toggle('adaptado', t.adaptacao >= p.max);
  }

  // tipo: 0 = Kamehameha, 1 = Super Kamehameha (fúria do Goku), 2 = Vazio Púrpura (Gojo)
  const CLASSE_RAIO = ['kamehameha', 'kamehameha super', 'kamehameha vazio-purpura', 'kamehameha bola-aco', 'kamehameha boost-dourado', 'kamehameha soul-surge'];
  function desenharRaio(x, y, ang, tipo, comp, larg) {
    const raio = document.createElement('div');
    raio.className = CLASSE_RAIO[tipo] || 'kamehameha';
    Object.assign(raio.style, pct(x, y), { width: `${(comp / W) * 100}%`, transform: `translate(0, -50%) rotate(${ang}rad)` });
    if (larg) raio.style.height = `${larg * escala}px`;
    s.arena.appendChild(raio);
    setTimeout(() => raio.remove(), tipo ? 1150 : 900);
  }
  // mira onde tem mais inimigos (o alvo atual pesa mais)
  function melhorDirecao(t) {
    const alvo = (t.alvo && t.alvo.vida > 0 && t.alvo) || s.ent.filter((e) => e.time !== t.time && e.vida > 0).sort((a, b) => dist(a, t) - dist(b, t))[0];
    return alvo ? Math.atan2(alvo.y - t.y, alvo.x - t.x) : null;
  }
  function kamehameha(t, dano, opc = {}) {
    typeof Som !== 'undefined' && Som.tocar('kame');
    const ang = opc.ang != null ? opc.ang : melhorDirecao(t);
    if (ang == null) return;
    const tipo = opc.tipo || 0, comp = opc.comp || 320, larg = opc.larg || 34;
    if (s.rede || s.aoVivo) s.eventos.push(['k', Math.round(t.x), Math.round(t.y), +ang.toFixed(3), tipo, larg]);
    const fx = Math.cos(ang), fy = Math.sin(ang);
    desenharRaio(t.x, t.y, ang, tipo, comp, opc.larg);
    if (!tipo) efeito('kame-carga', t.x, t.y, 600);
    setTimeout(() => {
      if (!s || s.acabou) return;
      tremer(true);
      for (const e of [...s.ent]) {
        if (e.time === t.time || e.vida <= 0) continue;
        const rx = e.x - t.x, ry = e.y - t.y;
        const ao = rx * fx + ry * fy;            // distância ao longo do raio
        const lado = Math.abs(rx * fy - ry * fx); // distância para o lado
        if (ao >= -10 && ao <= comp && lado <= larg / 2 + e.raio) { ferir(e, e.torre ? Math.round(dano * (opc.torreMult || 0.5)) : dano, t.time, t, { atravessa: tipo === 2 }); if (opc.aoAcertar && e.vida > 0) opc.aoAcertar(e); }
      }
    }, (opc.atraso || 0.3) * 1000);
  }

  // ---------- Goku SSJ: "You're going to pay for this!" ----------
  // se 2 ou 3 inimigos o pressionarem, ele fica furioso e carrega um Super Kamehameha
  function checarFuria(t, dt) {
    t.furiaCd = (t.furiaCd || 0) - dt;
    t.furiaOlhar = (t.furiaOlhar || 0) - dt;
    if (t.furiaCd > 0 || t.furiaOlhar > 0 || t.canal > 0) return;
    t.furiaOlhar = 0.3;
    const n = s.ent.filter((e) => !e.torre && e.vida > 0 && e.time !== t.time && e.surgir <= 0 && (e.alvo === t || dist(e, t) < e.raio + t.raio + 26)).length;
    if (n < 2) return;
    const mm = t.atk.m;
    if (mm.pulosKame) return pulosEKame(t, Math.min(3, n));
    if (mm.atravessar) return atravessarGrupo(t);
    t.furiaN = Math.min(3, n);
    t.furiaCd = 20;
    sacudir();
    t.canal = 1.75; // o corte de cena some antes do raio sair
    t.el.classList.add('carregando-kame');
    if (t.furiaN >= 3) t.el.classList.add('forte');
    cutin('goku_furia');
    if (s.rede || s.aoVivo) s.eventos.push(['c', 0]);
  }
  function soltarFuria(t) {
    t.el.classList.remove('carregando-kame', 'forte');
    const forte = t.furiaN >= 3;
    // mira no meio do grupo que está apertando ele
    const perto = s.ent.filter((e) => !e.torre && e.vida > 0 && e.time !== t.time && dist(e, t) < 80);
    let ang = null;
    if (perto.length) {
      const cx = perto.reduce((a, e) => a + e.x, 0) / perto.length, cy = perto.reduce((a, e) => a + e.y, 0) / perto.length;
      if (Math.hypot(cx - t.x, cy - t.y) > 2) ang = Math.atan2(cy - t.y, cx - t.x);
    }
    // com 3, antes solta uma explosão de ki em volta
    if (forte) explosaoArea(t, t, Math.round(t.dano * 1.5), 46, { visual: 'impacto', cor: '#FFE45C', empurrar: 16 });
    kamehameha(t, Math.round(t.dano * (forte ? 3.6 : 2.1)), { tipo: 1, comp: forte ? 380 : 330, larg: forte ? 58 : 42, torreMult: 0.25, atraso: 0.2, ang });
    particulas(t.x, t.y, '#FFE45C', forte ? 18 : 10, forte ? 40 : 26);
  }

  // tela treme (e avisa quem está assistindo online)
  function sacudir() { tremer(true); if (s.rede || s.aoVivo) s.eventos.push(['q']); }
  const centroInimigos = (t, raio = 80) => {
    const perto = s.ent.filter((e) => !e.torre && e.vida > 0 && e.time !== t.time && dist(e, t) < raio);
    if (!perto.length) return null;
    return { x: perto.reduce((a, e) => a + e.x, 0) / perto.length, y: perto.reduce((a, e) => a + e.y, 0) / perto.length };
  };
  // pulinho rápido: anda "dist" numa direção em poucos passos (desviando do rio e das torres)
  function pular(t, ux, uy, d0) {
    for (let k = 0; k < 5; k++) agendar(k * 0.035, () => {
      if (!s || t.vida <= 0) return;
      const nx = Math.max(14, Math.min(W - 14, t.x + ux * d0 / 5)), ny = Math.max(14, Math.min(H - 14, t.y + uy * d0 / 5));
      if (!t.voo && ny > RIO_TOPO - 2 && ny < RIO_BASE + 2 && !PONTES.some((b) => Math.abs(nx - b) < 26)) return;
      t.x = nx; t.y = ny; evitarTorres(t);
    });
    piscar(t.el, 'pulando');
    fxEl('fx-pulo', t.x, t.y + 6, 380);
  }

  // Goku (Presságio): dois pulos pra trás e Kamehameha no grupo
  function pulosEKame(t, n) {
    t.furiaCd = 18; t.canal = 1.0; t.intocavel = 0.75;
    t.el.classList.add('carregando-kame', 'prata');
    sacudir();
    const c = centroInimigos(t) || t.alvo || t;
    let ux = t.x - c.x, uy = t.y - c.y; const d0 = Math.hypot(ux, uy);
    if (d0 < 1) { ux = 0; uy = t.time === 'azul' ? 1 : -1; } else { ux /= d0; uy /= d0; }
    pular(t, ux, uy, 26);
    agendar(0.3, () => pular(t, ux, uy, 26));
    agendar(0.75, () => {
      if (!s || t.vida <= 0) return;
      t.el.classList.remove('carregando-kame', 'prata');
      const alvo = centroInimigos(t, 130) || c;
      const ang = Math.atan2(alvo.y - t.y, alvo.x - t.x);
      kamehameha(t, Math.round(t.dano * (n >= 3 ? 3.1 : 1.7)), { tipo: 1, comp: 360, larg: n >= 3 ? 52 : 40, torreMult: 0.25, atraso: 0.18, ang });
      sacudir();
    });
  }

  // Goku (MUI): desvia, passa no meio deles e daí pra frente só quer saber das torres (+15% de velocidade)
  function atravessarGrupo(t) {
    t.furiaCd = 1e9; t.canal = 0.4; t.intocavel = 0.5;
    sacudir();
    const torre = s.ent.filter((e) => e.torre && e.time !== t.time && e.vida > 0).sort((a, b) => dist(a, t) - dist(b, t))[0];
    efeito(`teleporte ${t.time}`, t.x, t.y, 450);
    for (let k = 1; k <= 3; k++) agendar(k * 0.07, () => fxEl('fx-rastro-mui', t.x, t.y, 420));
    if (torre) {
      // anda ~95 de uma vez pelo caminho certo (pontes) em direção à torre
      for (let k = 0; k < 4; k++) agendar(k * 0.06, () => { if (s && t.vida > 0) moverPara(t, torre, 0.42); });
    }
    agendar(0.3, () => {
      if (!s || t.vida <= 0) return;
      efeito(`teleporte ${t.time}`, t.x, t.y, 450);
      if (s.rede || s.aoVivo) s.eventos.push(['t', Math.round(t.x), Math.round(t.y)]);
      t.alvoTipo = 'construcoes';
      t.vel *= 1.15; t.velBase *= 1.15;
      t.alvo = escolherAlvo(t);
      t.el.classList.add('foco-torre');
      if (t.dono === 'azul') UI.toast('⚡ Instinto Superior: rumo à torre!');
    });
  }

  // corte de cena por cima da arena (aparece pra todo mundo da partida)
  const CUTINS = ['goku_furia', 'jojo_jotaro', 'jojo_dio', 'jojo_diavolo', 'jojo_pucci', 'jojo_gyro', 'jojo_johnny', 'sonic_shadow', 'sonic_super', 'sonic_dark', 'sonic_excalibur', 'sonic_hyper', 'yugi_reino'];
  const TEXTO_CUTIN_2 = { sonic_shadow: 'Chaos Control!', sonic_super: 'Super Boost!', sonic_dark: 'Explosão Sombria!', sonic_excalibur: 'Soul Surge!', sonic_hyper: 'Hiper Velocidade!', yugi_reino: 'Reino das Sombras!' };
  const TEXTO_CUTIN = { ...TEXTO_CUTIN_2, goku_furia: "You're going to pay for this!", jojo_jotaro: 'Star Platinum: The World!', jojo_dio: 'ZA WARUDO! Toki yo tomare!', jojo_diavolo: 'King Crimson!', jojo_pucci: 'Made in Heaven!', jojo_gyro: 'Ball Breaker!', jojo_johnny: 'Tusk Act 4!' };
  const cutinRede = (qual) => { cutin(qual); if (s.rede || s.aoVivo) s.eventos.push(['c', CUTINS.indexOf(qual)]); };
  function cutin(qual) {
    const jan = document.querySelector('.arena-grande-janela');
    if (!jan || jan.querySelector('.cutin')) return;
    const el = document.createElement('div');
    el.className = `cutin ${qual}`;
    el.innerHTML = `<div class="cutin-linhas"></div><div class="cutin-faixa"><img src="assets/cutins/${qual}.jpg" alt="" /></div><div class="cutin-legenda">${TEXTO_CUTIN[qual]}</div>`;
    jan.appendChild(el);
    try { navigator.vibrate && navigator.vibrate([40, 40, 90]); } catch (e) { /* nada */ }
    setTimeout(() => el.classList.add('saindo'), 1300);
    setTimeout(() => el.remove(), 1650);
  }

  // ---------- Gojo ----------
  function gojoAtaque(a, alvo, dano, crit) {
    a.gojoAlt = !a.gojoAlt;
    const azul = a.gojoAlt;
    const pj = criarProjetil(a, alvo, dano, { p: azul ? 'ki_azul' : 'ki_vermelho', vel: 250, tam: a.evo ? 24 : 20, rastro: azul ? '#4FB4FF' : '#FF4F5E' }, { crit, area: 0, semEfeitos: true });
    pj.gojo = azul ? 'azul' : 'vermelho';
  }
  function gojoImpacto(p, alvo) {
    const a = p.fonte;
    if (!a) return;
    const centro = { x: alvo.x, y: alvo.y };
    if (p.gojo === 'azul') {
      // Azul: puxa todo mundo em volta pro ponto do impacto
      for (const e of s.ent) {
        if (e.torre || e.time === a.time || e.vida <= 0 || e === alvo || dist(e, centro) > 62) continue;
        if (!(e.atk && e.atk.m && e.atk.m.imune)) empurrar(e, centro, -Math.min(16, dist(e, centro) - 6));
        ferir(e, Math.round(p.dano * 0.3), a.time, a);
      }
      fxEl('fx-gojo-azul', centro.x, centro.y, 520);
      if (s.rede || s.aoVivo) s.eventos.push(['x', Math.round(centro.x), Math.round(centro.y), 30, '#4FB4FF']);
    } else {
      // Vermelho: explode e empurra
      explosaoArea(a, centro, Math.round(p.dano * 0.45), a.evo ? 44 : 36, { visual: 'impacto', cor: '#FF4F5E', empurrar: 18 });
      fxEl('fx-gojo-vermelho', centro.x, centro.y, 520);
    }
  }

  // ---------- falas que aparecem em cima da tropa (Clutch!, Baka!, emotes...) ----------
  function falar(e, texto, classe = '', rede = true) {
    const n = document.createElement('div');
    n.className = `dano-num fala ${classe}`;
    n.textContent = texto;
    Object.assign(n.style, pct(e.x + (Math.random() * 14 - 7), e.y - 26 - Math.random() * 10));
    s.arena.appendChild(n);
    setTimeout(() => n.remove(), 1100);
    if (rede && (s.rede || s.aoVivo)) s.eventos.push(['z', Math.round(e.x), Math.round(e.y), texto, classe]);
  }
  const imuneA = (e) => !!(e.atk && e.atk.m && e.atk.m.imune);
  function prender(e, seg) {
    if (e.torre || e.vida <= 0 || imuneA(e)) return;
    e.atord = Math.max(e.atord, seg);
    e.el.classList.add('atordoada', 'presa');
  }

  // ---------- Nico Robin: Hana Hana no Mi (braços brotam do chão, de longe) ----------
  function bracosFx(x, y, grande = false) {
    fxEl(grande ? 'fx-mano' : 'fx-bracos', x, y, grande ? 1150 : 620);
    if (s.rede || s.aoVivo) s.eventos.push(['v', grande ? 1 : 0, Math.round(x), Math.round(y)]);
  }
  function hanaAtaque(a, alvo, dano, crit) {
    bracosFx(alvo.x, alvo.y);
    a.hanaN = (a.hanaN || 0) + 1;
    const clutch = a.hanaN % 3 === 0;
    agendar(0.16, () => {
      if (!s || alvo.vida <= 0) return;
      const feito = ferir(alvo, dano, a.time, a, { crit });
      if (feito) aplicarGolpe(a, alvo, feito);
      if (clutch && !alvo.torre && alvo.vida > 0) { prender(alvo, 1.2); falar(alvo, 'Clutch!', 'fala-robin'); }
    });
  }
  // se alguém corpo a corpo encosta nela, braços brotam e empurram (a cada 4s)
  function robinDefesa(t, dt) {
    if ((t.defCd = (t.defCd || 0) - dt) > 0) return;
    const e = s.ent.find((o) => !o.torre && o.time !== t.time && o.vida > 0 && o.alcance <= 40 && !(o.surgir > 0) && dist(o, t) < o.raio + t.raio + 12);
    if (!e) return;
    t.defCd = 4;
    bracosFx(e.x, e.y);
    if (!imuneA(e)) { empurrar(e, t, 26); prender(e, 0.6); }
    ferir(e, Math.round(t.dano * 0.5), t.time, t);
  }
  function gigantescoMano(t, h) {
    let alvo = t.alvo && t.alvo.vida > 0 && dist(t, t.alvo) < t.alcance + 70 ? t.alvo : null;
    if (!alvo) alvo = s.ent.filter((e) => e.time !== t.time && e.vida > 0 && dist(e, t) < t.alcance + 70).sort((a, b) => dist(a, t) - dist(b, t))[0] || null;
    const c = alvo ? { x: alvo.x, y: alvo.y } : { x: t.x, y: t.y + (t.time === 'azul' ? -80 : 80) };
    bracosFx(c.x, c.y, true);
    falar(t, 'Gigantesco Mano!', 'fala-robin');
    const dano = Math.round((h.dano || 650) * (t.f || 1));
    agendar(0.45, () => {
      if (!s || s.acabou) return;
      sacudir();
      for (const e of [...s.ent]) {
        if (e.time === t.time || e.vida <= 0 || dist(e, c) > 72 + e.raio) continue;
        ferir(e, e.torre ? Math.round(dano * 0.35) : dano, t.time, t, { atravessa: true, semEsquiva: true });
        if (!e.torre) prender(e, 2);
      }
    });
  }

  // ---------- Nino Nakano: marmitas, "Baka!" e as quíntuplas idênticas ----------
  function ninoPassiva(t, dt) {
    if (t.isca) {
      if ((t.vidaIsca -= dt) <= 0) ferir(t, t.vida + 1, t.time === 'azul' ? 'vermelho' : 'azul', null, { atravessa: true, semEsquiva: true });
      return;
    }
    if (t.bakaCd > 0) t.bakaCd -= dt;
    if ((t.marmitaCd = (t.marmitaCd ?? 3) - dt) > 0) return;
    let alvo = null, pior = 0.92;
    for (const e of s.ent) {
      if (e.torre || e.time !== t.time || e.vida <= 0 || e.isca || dist(e, t) > 160) continue;
      const p = e.vida / e.max;
      if (p < pior) { pior = p; alvo = e; }
    }
    if (!alvo) { t.marmitaCd = 1; return; }
    t.marmitaCd = 6;
    voarSprite('marmita', t, alvo, 0.35, 15, { arco: 22 });
    if (s.rede || s.aoVivo) s.eventos.push(['n', Math.round(t.x), Math.round(t.y), Math.round(alvo.x), Math.round(alvo.y)]);
    agendar(0.35, () => {
      if (!s || alvo.vida <= 0) return;
      const cura = Math.round(alvo.max * 0.22);
      alvo.vida = Math.min(alvo.max, alvo.vida + cura);
      atualizarHp(alvo);
      alvo.buffDano = 5;
      alvo.el.classList.add('bem-alimentada');
      efeito('cura', alvo.x, alvo.y, 800);
      particulas(alvo.x, alvo.y, '#FFB3C7', 10, 22);
      falar(alvo, `+${cura} 🍱`, 'fala-cura');
    });
  }
  // levou um golpe forte: "Baka!" e empurra quem está colado nela
  function ninoBaka(e, dano) {
    if (e.isca || e.vida <= 0 || e.bakaCd > 0 || dano < e.max * 0.1) return;
    e.bakaCd = 8;
    falar(e, 'Baka!!', 'fala-nino');
    for (const o of s.ent) {
      if (o.torre || o.time === e.time || o.vida <= 0 || dist(o, e) > 46) continue;
      if (!imuneA(o)) { empurrar(o, e, 22); o.lento = 2; o.lentoPct = 0.3; o.el.classList.add('lenta'); }
    }
  }
  // as cópias somem soltando borboletas que deixam os inimigos lentos
  function borboletas(e) {
    fxEl('fx-borboletas', e.x, e.y, 900);
    if (s.rede || s.aoVivo) s.eventos.push(['y', Math.round(e.x), Math.round(e.y)]);
    for (const o of s.ent) {
      if (o.torre || o.time === e.time || o.vida <= 0 || dist(o, e) > 48 || imuneA(o)) continue;
      o.lento = 2.5; o.lentoPct = 0.35; o.el.classList.add('lenta');
    }
  }
  function quintuplas(t) {
    falar(t, 'Qual de nós é a verdadeira?', 'fala-nino');
    t.quintupla = true;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const c = criarTropa(t.time, t.carta, t.x + Math.cos(a) * 22, t.y + Math.sin(a) * 16, t.f, t.nivel);
      donoDe(c, t.dono);
      c.isca = true; c.quintupla = true; c.surgir = 0.2; c.habilidade = null; c.vidaIsca = 8;
      c.max = c.vida = Math.round(t.max * 0.18);
      c.dano = c.danoBase = Math.round(t.dano * 0.3);
      atualizarHp(c);
    }
    // quem mirava na Nino tem que escolher de novo
    for (const e of s.ent) if (e.alvo === t) e.alvo = null;
  }

  // =================== Família Sonic + Yugi ===================
  const inimigosPerto = (t, r) => s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && !(e.banido > 0) && dist(e, t) < r + e.raio);
  function passivasSonic(t, dt) {
    const m = t.atk.m;
    // Super Sonic: os anéis vão acabando com o tempo
    if (m.superForma && t.aneis > 0 && (t.aneisT = (t.aneisT || 0) + dt) >= 1) { t.aneisT = 0; t.aneis--; if (t.aneis <= 0) destransformar(t); }
    // Shadow: sem os limitadores quando a vida fica baixa (mais forte, mas a vida vai sumindo)
    if (m.inibidores && !t.semLimite && t.vida < t.max * m.inibidores) {
      t.semLimite = true; t.el.classList.add('sem-limite');
      falar(t, 'Sem limitadores!', 'fala-sonic'); fxEl('fx-chaos', t.x, t.y, 900); fxJ(14, t.x, t.y);
    }
    if (t.semLimite && (t.drenoT = (t.drenoT || 0) + dt) >= 0.5) { t.drenoT = 0; t.vida = Math.max(1, t.vida - t.max * 0.012); atualizarHp(t); }
    // Dark Sonic: a raiva passa
    if (t.raiva > 0 && (t.raiva -= dt) <= 0) { t.raivaN = 0; t.el.classList.remove('enfurecida'); }
    // Sonic: Spin Dash até o alvo que está longe
    if (m.spinDash && t.alvo && t.alvo.vida > 0 && !t.alvo.torre && !(t.spinCd > s.t) && t.atord <= 0 && t.canal <= 0) {
      const d0 = dist(t, t.alvo);
      if (d0 > t.alcance + t.raio + t.alvo.raio + 25 && d0 < 190) spinDash(t, t.alvo, m.spinDash);
    }
    // Hyper Sonic: Hiper Flash
    if (m.hyperFlash && (t.flashTimer -= dt) <= 0) {
      const [cad, raio, mult] = m.hyperFlash;
      const alvos = inimigosPerto(t, raio);
      if (alvos.length) {
        t.flashTimer = cad;
        fxEl('fx-hyper-flash', t.x, t.y, 600); fxJ(15, t.x, t.y);
        for (const e of alvos) { ferir(e, Math.round(t.dano * mult * multClasse(t, e)), t.time, t); if (!imuneA(e)) { e.atord = Math.max(e.atord, 0.5); e.el.classList.add('atordoada'); } }
      } else t.flashTimer = 0.5;
    }
    // Yugi: compra uma carta de tempos em tempos
    if (m.duelista && (t.cartaTimer -= dt) <= 0) { t.cartaTimer = m.duelista; comprarCarta(t); }
  }
  function spinDash(t, alvo, [cd, mult]) {
    t.spinCd = s.t + cd;
    t.intocavel = Math.max(t.intocavel || 0, 0.3);
    fxEl('fx-spin', t.x, t.y, 450); fxJ(17, t.x, t.y);
    teleportar(t, alvo);
    agendar(0.08, () => {
      if (t.vida <= 0 || alvo.vida <= 0) return;
      const { dano } = danoDe(t, alvo);
      ferir(alvo, Math.round(dano * mult), t.time, t, { crit: true });
      aplicarGolpe(t, alvo, dano);
      empurrar(alvo, t, 14);
      t.cd = Math.max(t.cd, 0.3);
    });
  }
  function destransformar(t) {
    t.aneis = 0; t.el.classList.remove('super-forma');
    t.dano = t.danoBase = Math.round(t.danoBase * 0.5);
    t.vel = t.velBase = Math.round(t.velBase * 0.8);
    falar(t, 'Os anéis acabaram…', 'fala-sonic');
    particulas(t.x, t.y, '#FFD25E', 10, 24);
  }
  function chaosSpear(a, alvo, dano) {
    const outros = inimigosPerto(a, 150).filter((e) => e !== alvo).sort((x, y) => dist(x, a) - dist(y, a)).slice(0, 3);
    for (const e of outros) criarProjetil(a, e, Math.round(dano * 0.6), { p: 'raio', vel: 360, tam: 18, rastro: '#F5E663' });
    if (outros.length) falar(a, 'Chaos Spear!', 'fala-sonic', false);
  }
  function enfurecer(o) {
    o.raivaN = Math.min(3, (o.raivaN || 0) + 1); o.raiva = 6;
    o.vida = Math.min(o.max, o.vida + o.max * 0.08); atualizarHp(o);
    o.el.classList.add('enfurecida');
    fxEl('fx-sombria', o.x, o.y, 900); fxJ(16, o.x, o.y);
    if (o.raivaN === 1) falar(o, 'Vocês vão pagar…', 'fala-dark');
  }
  function chaosControl(t, h) {
    cutinRede('sonic_shadow');
    pararTempo(t, h.duracao || 2.5, 160, 'Chaos Control!');
    fxEl('fx-chaos', t.x, t.y, 900); fxJ(14, t.x, t.y);
    const alvo = inimigosPerto(t, 220).sort((a, b) => b.vida - a.vida)[0];
    if (alvo) agendar(0.25, () => {
      if (t.vida <= 0 || alvo.vida <= 0) return;
      teleportar(t, alvo); t.alvo = alvo;
      for (let i = 0; i < 3; i++) agendar(0.12 + i * 0.12, () => { if (alvo.vida > 0 && t.vida > 0) { golpeVisual(t, alvo, t.atk.v); ferir(alvo, Math.round(t.dano * 0.8 * multClasse(t, alvo)), t.time, t, { crit: i === 2 }); } });
    });
  }
  function superBoost(t, h) {
    cutinRede('sonic_super');
    t.aneis = Math.min(30, (t.aneis || 0) + (h.aneis || 10)); t.aneisMax = t.aneisMax || 22;
    t.el.classList.add('super-forma');
    kamehameha(t, Math.round(t.dano * (h.mult || 2.2)), { tipo: 4, comp: 200, larg: 30, torreMult: 0.4, atraso: 0.05 });
    const alvo = t.alvo && t.alvo.vida > 0 && dist(t, t.alvo) < 220 ? t.alvo : null;
    if (alvo) agendar(0.15, () => { if (t.vida > 0 && alvo.vida > 0) teleportar(t, alvo); });
  }
  function explosaoSombria(t, h) {
    cutinRede('sonic_dark');
    const raio = h.raio || 130;
    for (const e of inimigosPerto(t, raio)) { empurrar(e, t, -Math.max(0, Math.min(30, dist(e, t) - t.raio - e.raio))); if (!imuneA(e)) { e.lento = 2; e.lentoPct = 0.4; e.el.classList.add('lenta'); } }
    fxEl('fx-sombria', t.x, t.y, 900); fxJ(16, t.x, t.y);
    falar(t, 'Explosão Sombria!', 'fala-dark');
    agendar(0.7, () => { if (t.vida > 0) explosaoArea(t, t, Math.round(t.dano * (h.mult || 2.4)), 70, { visual: 'impacto', cor: '#A855F7', empurrar: 22 }); });
  }
  function soulSurge(t, h) {
    cutinRede('sonic_excalibur');
    fxEl('fx-soul', t.x, t.y, 900); fxJ(19, t.x, t.y);
    t.escudo = t.escudoMax; if (t.escudo) t.el.classList.add('com-escudo');
    kamehameha(t, Math.round((h.dano || 1100) * (t.f || 1)), { tipo: 5, comp: 260, larg: 40, torreMult: 0.35, atraso: 0.35 });
  }
  function hiperRajada(t, h) {
    cutinRede('sonic_hyper');
    const ja = new Set();
    for (let i = 0; i < (h.golpes || 7); i++) agendar(0.05 + i * 0.16, () => {
      if (t.vida <= 0) return;
      const prox = inimigosPerto(t, 170).filter((e) => !ja.has(e)).sort((a, b) => dist(a, t) - dist(b, t))[0];
      if (!prox) return;
      ja.add(prox);
      teleportar(t, prox);
      golpeVisual(t, prox, t.atk.v);
      ferir(prox, Math.round(t.dano * (h.mult || 1.4) * multClasse(t, prox)), t.time, t, { crit: true });
      if (t.esmeraldas < (t.atk.m.esmeraldas || 7)) { t.esmeraldas++; t.el.classList.add('com-esmeraldas'); t.el.style.setProperty('--esm', t.esmeraldas); }
    });
    fxEl('fx-hyper-flash', t.x, t.y, 600); fxJ(15, t.x, t.y);
  }
  // ---- Yugi: Hora do Duelo ----
  const CARTAS_YUGI = {
    raio: 'Carta Mágica: Raio Dourado!', espelho: 'Armadilha: Espelho!', coracao: 'Coração das Cartas!', selo: 'Selo do Faraó!', invocar: 'Invocação!',
  };
  function comprarCarta(t, forcar) {
    const perto = inimigosPerto(t, 140), aliadosFeridos = s.ent.filter((e) => !e.torre && e.time === t.time && e.vida > 0 && e.vida < e.max * 0.6 && dist(e, t) < 120);
    const meBatendo = s.ent.some((e) => !e.torre && e.time !== t.time && e.vida > 0 && e.alvo === t);
    // a carta "certa" aparece mais, mas o deck é imprevisível
    const pesos = { raio: 1 + perto.length, espelho: meBatendo ? 3 : 0.3, coracao: aliadosFeridos.length ? 1 + aliadosFeridos.length : t.vida < t.max * 0.6 ? 2 : 0.2, selo: perto.length >= 2 ? 3 : perto.length ? 1 : 0.1, invocar: 1.6 };
    let qual = forcar;
    if (!qual) { let r = Math.random() * Object.values(pesos).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(pesos)) { if ((r -= w) <= 0) { qual = k; break; } } qual = qual || 'invocar'; }
    falar(t, CARTAS_YUGI[qual], 'fala-yugi');
    fxEl('fx-carta-yugi', t.x, t.y - 18, 900); fxJ(11, t.x, t.y - 18);
    if (qual === 'raio') {
      const alvos = s.ent.filter((e) => e.time !== t.time && e.vida > 0 && !(e.banido > 0) && dist(e, t) < 190).sort((a, b) => dist(a, t) - dist(b, t)).slice(0, 3);
      alvos.forEach((e, i) => agendar(i * 0.12, () => { if (e.vida > 0) { efeitoGolpe('raio', t, e, { cor: '#FFD25E' }); ferir(e, Math.round(t.dano * (e.torre ? 0.7 : 1.4) * multClasse(t, e)), t.time, t); } }));
    } else if (qual === 'espelho') { t.espelho = 3; t.el.classList.add('com-espelho'); }
    else if (qual === 'coracao') {
      for (const e of s.ent) if (!e.torre && e.time === t.time && e.vida > 0 && dist(e, t) < 120) { e.vida = Math.min(e.max, e.vida + e.max * 0.2); atualizarHp(e); particulas(e.x, e.y, '#FFD25E', 6, 18); }
    } else if (qual === 'selo') {
      for (const e of inimigosPerto(t, 100)) if (!imuneA(e)) { e.atord = Math.max(e.atord, 1.6); e.el.classList.add('atordoada'); }
      explosaoArea(t, t, Math.round(t.dano * 0.5), 100, { visual: 'impacto', cor: '#FFD25E' });
    } else if (qual === 'invocar') invocarMonstro(t);
  }
  function invocarMonstro(t) {
    const lado = jogadorDe(t);
    const ids = ((lado && lado.deck) || []).filter((id) => { const c = Estado.carta(id); return c && !c.feitico && !c.barril && !c.token && id !== t.carta.id && !c.exclusivo && !c.evento; });
    const pool = ids.length ? ids : Estado.catalogo().filter((c) => !c.feitico && !c.barril && !c.token && !c.exclusivo && !c.evento && c.raridade !== 'lendaria').map((c) => c.id);
    const c = Estado.carta(pool[Math.floor(Math.random() * pool.length)]);
    if (!c) return;
    const m = criarTropa(t.time, c, t.x + (Math.random() * 30 - 15), t.y + (t.time === 'azul' ? -18 : 18), t.f * 0.75, t.nivel);
    donoDe(m, t.dono);
    m.surgir = 0.4; m.habilidade = null; m.temporario = 10; m.invocado = true;
    m.el.classList.add('invocada');
  }
  function reinoSombras(t, h) {
    cutinRede('yugi_reino');
    fxEl('fx-reino', t.x, t.y, 1300); fxJ(12, t.x, t.y);
    const seg = h.duracao || 3;
    const presos = inimigosPerto(t, h.raio || 150).filter((e) => !imuneA(e));
    for (const e of presos) {
      e.banido = seg; e.intocavel = Math.max(e.intocavel || 0, seg); e.atord = Math.max(e.atord, seg);
      e.el.classList.add('banida');
      for (const o of s.ent) if (o.alvo === e) o.alvo = null;
    }
    agendar(seg, () => {
      for (const e of presos) {
        if (!s.ent.includes(e)) continue;
        e.banido = 0; e.intocavel = 0; e.el.classList.remove('banida', 'atordoada');
        if (e.vida > 0) ferir(e, Math.round(e.max * (h.pct || 0.35)), t.time, null, { atravessa: true, semEsquiva: true, semContra: true });
      }
    });
    agendar(0.4, () => { if (t.vida > 0) comprarCarta(t); });
  }

  // =================== Akame (Murasame) ===================
  function amaldicoar(e, a) {
    if (e.torre || e.vida <= 0) return;
    e.maldAte = s.t + 4; e.maldDe = a;
    e.el.classList.add('amaldicoada');
  }
  // "Um corte, uma morte": quem está amaldiçoado e fraco demais cai na hora
  function checarExecucao(a, e) {
    if (!a || a.vida <= 0 || !e || e.torre || e.vida <= 0 || !(e.maldAte > s.t)) return false;
    const m = a.atk && a.atk.m; if (!m || !m.murasame) return false;
    const limiar = a.trunfo > 0 ? 0.35 : m.murasame;
    // em tropas enormes o corte só mata se faltar pouco (no máximo 3 golpes dela)
    if (e.vida > e.max * limiar || e.vida > a.dano * 4) return false;
    fxEl('fx-murasame', e.x, e.y, 750); fxJ(9, e.x, e.y);
    typeof Som !== 'undefined' && Som.tocar('corte');
    ferir(e, Math.ceil(e.vida + (e.escudo || 0) + 1), a.time, a, { atravessa: true, semEsquiva: true, semContra: true, crit: true });
    if (e.vida > 0) return false; // voltou (ex.: Mita Malvada, fênix)
    // some nas sombras e salta pro próximo
    a.vida = Math.min(a.max, a.vida + Math.round(a.max * 0.12)); atualizarHp(a);
    if (!(a.sombraCd > s.t)) { a.sombraCd = s.t + 2; a.intocavel = Math.max(a.intocavel || 0, 0.8); a.sombra = Math.max(a.sombra || 0, 0.8); a.el.classList.add('sombra'); }
    const prox = s.ent.filter((x) => !x.torre && x.time !== a.time && x.vida > 0 && dist(x, a) < 130).sort((x, y) => dist(x, a) - dist(y, a))[0];
    if (prox) { a.alvo = prox; agendar(0.2, () => { if (a.vida > 0 && prox.vida > 0) teleportar(a, prox); }); }
    return true;
  }
  // o veneno também pode deixar o alvo fraco o bastante: confere algumas vezes por segundo
  function murasamePassiva(t, dt) {
    if (t.sombra > 0 && (t.sombra -= dt) <= 0) t.el.classList.remove('sombra');
    if ((t.murTimer = (t.murTimer || 0) - dt) > 0) return;
    t.murTimer = 0.15;
    for (const e of [...s.ent]) if (!e.torre && e.time !== t.time && e.maldDe === t && e.maldAte > s.t && dist(e, t) < 160) checarExecucao(t, e);
  }
  function trunfoMurasame(t, h) {
    t.vida = Math.max(1, t.vida - Math.round(t.max * 0.1));
    atualizarHp(t);
    t.trunfo = h.duracao || 6;
    t.el.classList.add('aura-trunfo');
    fxEl('fx-trunfo', t.x, t.y, 900); fxJ(10, t.x, t.y);
    falar(t, 'Eliminar.', 'fala-akame');
    tremer();
  }

  // =================== JoJo: Stands ===================
  const fxJ = (i, x, y) => { if (s.rede || s.aoVivo) s.eventos.push(['j', i, Math.round(x), Math.round(y)]); };
  const FX_J = [['fx-ora', 650], ['fx-facas', 2600], ['fx-rolo', 1100], ['fx-kc', 800], ['fx-disco', 700], ['fx-tusk', 900], ['fx-coracao', 1200], ['fx-arquivo', 1400], ['fx-glitch', 700], ['fx-murasame', 750], ['fx-trunfo', 900], ['fx-carta-yugi', 900], ['fx-reino', 1300], ['fx-aneis', 800], ['fx-chaos', 900], ['fx-hyper-flash', 600], ['fx-sombria', 900], ['fx-spin', 450], ['fx-espelho', 500], ['fx-soul', 900]];
  // Tempo parado: o outro time congela (tropas e torres). Quem tem moveNoTempo (Jotaro, Dio) continua andando.
  function pararTempo(t, seg, raio, nome) {
    typeof Som !== 'undefined' && Som.tocar('tempoParado');
    sacudir();
    fxEl('fx-tempo-parado', t.x, t.y, 1000);
    s.tempoParadoAte = Math.max(s.tempoParadoAte || 0, s.t + seg);
    if (s.rede || s.aoVivo) s.eventos.push(['w', seg, Math.round(t.x), Math.round(t.y)]);
    if (nome) falar(t, nome, 'fala-jojo');
    const alvos = [];
    for (const e of s.ent) {
      if (e.time === t.time || e.vida <= 0) continue;
      if (raio && dist(e, t) > raio + e.raio) continue;
      if (e.atk && e.atk.m && e.atk.m.moveNoTempo) { falar(e, 'Também me mexo!', 'fala-jojo'); continue; }
      if (e.torre) e.cd = Math.max(e.cd || 0, seg);
      else { e.atord = Math.max(e.atord, seg); e.el.classList.add('atordoada', 'parada-tempo'); }
      alvos.push(e);
    }
    return alvos;
  }
  // Jotaro
  function oraOra(a, alvo, dano, crit) {
    falar(a, 'ORA ORA ORA!', 'fala-jojo');
    fxEl('fx-ora', alvo.x, alvo.y, 650); fxJ(0, alvo.x, alvo.y);
    for (let i = 0; i < 5; i++) agendar(i * 0.09, () => {
      if (alvo.vida <= 0 || a.vida <= 0) return;
      const f = ferir(alvo, Math.round(dano * 0.45), a.time, a, { crit });
      if (i === 0 && f) aplicarGolpe(a, alvo, f);
    });
  }
  function starWorld(t) {
    cutinRede('jojo_jotaro');
    pararTempo(t, 2, 170, 'Star Platinum: The World!');
    const alvo = t.alvo && t.alvo.vida > 0 && dist(t, t.alvo) < 200 ? t.alvo : null;
    if (alvo) agendar(0.3, () => { if (t.vida > 0 && alvo.vida > 0) oraOra(t, alvo, danoDe(t, alvo).dano * (alvo.torre ? 0.6 : 1), false); });
  }
  // Dio
  function zaWarudo(t, h) {
    cutinRede('jojo_dio');
    const congelados = pararTempo(t, 3, 0, 'ZA WARUDO!');
    const danoFaca = Math.round((h.dano || 220) * (t.f || 1));
    let alvos = congelados.filter((e) => !e.torre).sort((a, b) => dist(a, t) - dist(b, t)).slice(0, 6);
    if (!alvos.length) alvos = congelados.filter((e) => e.torre).sort((a, b) => dist(a, t) - dist(b, t)).slice(0, 1);
    alvos.forEach((e, i) => agendar(0.3 + i * 0.12, () => { if (e.vida > 0) { fxEl('fx-facas', e.x, e.y, 2600 - i * 120); fxJ(1, e.x, e.y); } }));
    // rolo compressor em cima do alvo, ainda no tempo parado
    agendar(2.2, () => {
      const alvo = (t.alvo && t.alvo.vida > 0 && t.alvo) || alvos.find((e) => e.vida > 0);
      if (!alvo) return;
      fxEl('fx-rolo', alvo.x, alvo.y, 1100); fxJ(2, alvo.x, alvo.y);
      falar(alvo, 'Roda Rolla da!', 'fala-jojo');
      agendar(0.5, () => {
        sacudir();
        for (const e of [...s.ent]) if (e.time !== t.time && e.vida > 0 && dist(e, alvo) < 58 + e.raio) ferir(e, e.torre ? Math.round(danoFaca * 1.1) : danoFaca * 3, t.time, t, { atravessa: true, semEsquiva: true });
      });
    });
    // o tempo volta: as facas paradas no ar acertam todas juntas
    agendar(3, () => {
      for (const e of alvos) if (e.vida > 0) ferir(e, e.torre ? Math.round(danoFaca * 0.4) : danoFaca, t.time, t, { atravessa: true, semEsquiva: true });
      if (t.vida > 0) falar(t, 'Toki wa ugokidasu...', 'fala-jojo');
    });
  }
  // Diavolo
  function kingCrimson(t) {
    cutinRede('jojo_diavolo');
    falar(t, 'King Crimson!', 'fala-jojo');
    t.intocavel = 1.8;
    t.el.classList.add('tempo-apagado');
    fxEl('fx-kc', t.x, t.y, 800); fxJ(3, t.x, t.y);
    for (const e of s.ent) if (e.alvo === t) e.alvo = null; // o tempo foi apagado: ninguém sabe onde ele está
    agendar(1.5, () => {
      t.el.classList.remove('tempo-apagado');
      if (t.vida <= 0) return;
      const alvo = t.alvo && t.alvo.vida > 0 ? t.alvo : escolherAlvo(t);
      if (!alvo) return;
      // reaparece atrás do alvo
      const dx = alvo.x - t.x, dy = alvo.y - t.y, d0 = Math.hypot(dx, dy) || 1, r = alvo.raio + t.raio + 4;
      t.x = Math.max(20, Math.min(W - 20, alvo.x + (dx / d0) * r));
      t.y = Math.max(20, Math.min(H - 20, alvo.y + (dy / d0) * r));
      t.alvo = alvo;
      fxEl('fx-kc', t.x, t.y, 700); fxJ(3, t.x, t.y);
      agendar(0.15, () => {
        if (alvo.vida <= 0 || t.vida <= 0) return;
        sacudir();
        ferir(alvo, Math.round(danoDe(t, alvo).dano * 4 * (alvo.torre ? 0.35 : 1)), t.time, t, { atravessa: true, semEsquiva: true, crit: true });
      });
    });
  }
  // Pucci
  function roubarDisco(a, alvo) {
    if (alvo.habilidade) alvo.recarga = Math.max(alvo.recarga || 0, 8);
    alvo.fraco = 6; alvo.fracoPct = 0.25; alvo.el.classList.add('enfraquecida');
    falar(alvo, '💿 Disco roubado!', 'fala-jojo');
    fxEl('fx-disco', alvo.x, alvo.y, 700); fxJ(4, alvo.x, alvo.y);
    voarSprite('disco', alvo, a, 0.4, 16);
  }
  function madeInHeaven(t) {
    typeof Som !== 'undefined' && Som.tocar('acelera');
    cutinRede('jojo_pucci');
    falar(t, 'Made in Heaven!', 'fala-jojo');
    s.aceleraTempo = { time: t.time, dono: t.dono || t.time, ate: s.t + 7 };
    if (s.rede || s.aoVivo) s.eventos.push(['w', -7, 0, 0]);
  }
  // Gyro
  function ballBreaker(t, h) {
    cutinRede('jojo_gyro');
    falar(t, 'Ball Breaker!', 'fala-jojo');
    kamehameha(t, Math.round((h.dano || 620) * (t.f || 1)), {
      tipo: 3, comp: 400, larg: 50, torreMult: 0.3, atraso: 0.4,
      aoAcertar: (e) => { if (e.torre) return; e.fraco = 5; e.fracoPct = 0.3; e.el.classList.add('enfraquecida'); e.lento = 3; e.lentoPct = 0.4; e.el.classList.add('lenta'); },
    });
  }
  // Johnny
  function tuskDano(a, alvo, dano, m) {
    if (a.tuskAlvo === alvo.id) a.tuskN = Math.min(4, (a.tuskN || 0) + 1); else { a.tuskAlvo = alvo.id; a.tuskN = 0; }
    return Math.round(dano * (1 + m.tusk * a.tuskN));
  }
  function aplicarRotacao(e, fonte, dps, seg) {
    e.rotInf = { resta: seg, dps, fonte, tick: 0.2 };
    e.el.classList.add('rotacao-infinita');
    fxEl('fx-tusk', e.x, e.y, 900); fxJ(5, e.x, e.y);
  }
  function tuskAct4(t, h) {
    const tropas = s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0).sort((a, b) => dist(a, t) - dist(b, t));
    const alvo = (t.alvo && t.alvo.vida > 0 && !t.alvo.torre && t.alvo) || tropas[0] || t.alvo;
    if (!alvo) return;
    cutinRede('jojo_johnny');
    falar(t, 'Tusk Act 4!', 'fala-jojo');
    voarSprite('unha', t, alvo, 0.3, 18);
    agendar(0.3, () => { if (alvo.vida > 0) aplicarRotacao(alvo, t, ((h.dano || 900) * (t.f || 1)) / 6, 6); });
  }
  function rodarRotacao(t, dt) {
    const r = t.rotInf;
    r.resta -= dt; r.tick -= dt;
    if (!t.torre) { t.lento = Math.max(t.lento || 0, 0.3); t.lentoPct = 0.4; }
    if (r.tick <= 0) { r.tick = 0.5; ferir(t, Math.round(r.dps * 0.5 * (t.torre ? 0.4 : 1)), r.fonte.time, r.fonte, { atravessa: true, semEsquiva: true }); }
    if (t.rotInf && t.rotInf.resta <= 0) { t.rotInf = null; t.el.classList.remove('rotacao-infinita'); }
  }

  // =================== MITAS (MiSide): elas sabem que estão num jogo ===================
  const nomeJogador = () => String((Estado.d && Estado.d.nome) || 'você').slice(0, 16);
  const minhaTropa = (t) => t.dono === 'azul' && !s.convidado; // tropa do jogador deste celular
  const FALAS_MALVADA = ['{n}... por que você está fugindo de mim?', 'Eu tô te vendo, {n}.', 'Esse jogo é nosso agora, {n}.', 'Não fecha o jogo, tá? 🖤', '{n}, olha pra mim.', 'Você não vai me deixar, né?', 'Eu sei onde você joga, {n}.'];
  // Mita Gentil: fala com você e protege a sua torre do rei uma vez
  function mitaGentilPassiva(t) {
    if (!t.cumprimentou) {
      t.cumprimentou = true;
      if (minhaTropa(t)) { const af = Estado.mitaAfeto(); falar(t, af >= 60 ? `${nomeJogador()}! Senti sua falta 💕` : `Oi, ${nomeJogador()}! Vamos ganhar juntos? 💕`, 'fala-mita'); }
      else falar(t, 'Oi! Eu sou a Mita 💕', 'fala-mita');
    }
    if (t.protegeu) return;
    const rei = s.ent.find((e) => e.torre && e.tipo === 'rei' && e.time === t.time && e.vida > 0);
    if (rei && rei.vida < rei.max * 0.4) {
      t.protegeu = true;
      rei.escudo = (rei.escudo || 0) + Math.round(rei.max * 0.25);
      rei.el.classList.add('escudo-mita');
      fxEl('fx-coracao', rei.x, rei.y, 1200); fxJ(6, rei.x, rei.y);
      falar(rei, minhaTropa(t) ? `Eu te protejo, ${nomeJogador()}!` : 'Deixa comigo!', 'fala-mita');
    }
  }
  // "Deixa que eu jogo!": joga a carta mais forte da mão do dono dela, de graça
  function mitaJoga(t) {
    const quem = t.dono || t.time, L = s[quem];
    if (!L) return;
    const mao = L.fila.slice(0, 4).map((id, i) => ({ i, c: Estado.carta(id) })).filter((m) => !m.c.feitico && !m.c.barril && m.c.id !== 'mita_gentil');
    if (!mao.length) { falar(t, 'Hmm... sua mão só tem feitiço 😅', 'fala-mita'); return; }
    const m = mao.sort((a, b) => b.c.custo - a.c.custo)[0];
    const frente = t.time === 'azul' ? -26 : 26;
    let x = Math.max(28, Math.min(W - 28, t.x)), y = t.y + frente;
    for (let k = 0; k < 10 && !podeColocar(t.time, x, y); k++) y += t.time === 'azul' ? 14 : -14;
    if (!podeColocar(t.time, x, y)) { x = t.x; y = t.y; }
    falar(t, minhaTropa(t) ? `Deixa que eu jogo essa pra você, ${nomeJogador()}!` : 'Deixa que eu jogo!', 'fala-mita');
    fxEl('fx-coracao', x, y, 1200); fxJ(6, x, y);
    L.elixir += m.c.custo; // de graça
    jogar(quem, m.i, x, y);
  }
  // Mita Malvada: "Excluir arquivo"
  function deletar(t, h) {
    const alvos = s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 230).sort((a, b) => b.vida - a.vida);
    const alvo = alvos[0];
    if (!alvo) { falar(t, 'Ninguém pra apagar... ainda.', 'fala-mita-m'); return; }
    const jan = document.querySelector('.arena-grande-janela');
    if (jan) {
      const caixa = document.createElement('div');
      caixa.className = 'mita-dialogo';
      caixa.innerHTML = `<div class="md-titulo">🗑️ Excluir arquivo</div><div class="md-corpo">Tem certeza de que deseja excluir permanentemente<br><b>"${alvo.carta.id}.carta"</b>?</div><div class="md-botoes"><span class="md-sim">Sim</span><span>Não</span></div><i class="md-cursor"></i>`;
      jan.appendChild(caixa);
      setTimeout(() => caixa.remove(), 1500);
    }
    if (s.rede || s.aoVivo) s.eventos.push(['j', 7, Math.round(alvo.x), Math.round(alvo.y)]);
    falar(t, 'Isso aqui não devia existir.', 'fala-mita-m');
    agendar(1.0, () => {
      if (alvo.vida <= 0 || t.vida <= 0) return;
      fxEl('fx-glitch', alvo.x, alvo.y, 700); fxJ(8, alvo.x, alvo.y);
      sacudir();
      if (alvo.vida <= 2500 && !(alvo.atk && alvo.atk.m && alvo.atk.m.mitaMalvada)) { falar(alvo, 'ARQUIVO EXCLUÍDO', 'fala-mita-m'); ferir(alvo, alvo.vida + (alvo.escudo || 0) + 1, t.time, t, { atravessa: true, semEsquiva: true }); }
      else ferir(alvo, Math.round((h.dano || 1600) * (t.f || 1)), t.time, t, { atravessa: true, semEsquiva: true });
    });
  }
  // a Malvada CONTRA você: ela olha pra você (efeitos na sua tela)
  function mitaOlhando(dt) {
    if (s.convidado || !s.ent.some((e) => !e.torre && e.vida > 0 && e.time === 'vermelho' && e.atk && e.atk.m && e.atk.m.mitaMalvada)) return;
    if ((s.mitaOlhar = (s.mitaOlhar ?? 3) - dt) > 0) return;
    s.mitaOlhar = 7 + Math.random() * 4;
    const b = $('batalha');
    b.classList.add('mita-glitch');
    setTimeout(() => b.classList.remove('mita-glitch'), 650);
    const fala = FALAS_MALVADA[Math.floor(Math.random() * FALAS_MALVADA.length)].replace('{n}', nomeJogador());
    const el = document.createElement('div');
    el.className = 'mita-sussurro';
    el.innerHTML = `<video src="assets/cartas/videos/mita_malvada_rosto.mp4" autoplay muted loop playsinline></video><span>${fala.replace(/</g, '&lt;')}</span>`;
    (document.querySelector('.arena-grande-janela') || b).appendChild(el);
    setTimeout(() => el.remove(), 2600);
    if (typeof Som !== 'undefined') Som.tocar('esquiva');
  }
  // tem Mita Malvada viva do outro lado do bot? (ela confunde a IA)
  const mitaConfundeIA = (timeIA) => s.ent.some((e) => !e.torre && e.vida > 0 && e.time !== timeIA && e.atk && e.atk.m && e.atk.m.mitaMalvada);

  // Evolução: Expansão de Domínio — Vazio Infinito
  function expansaoDominio(t) {
    const raio = 175;
    dominioVisual(t.x, t.y, t.time);
    if (s.rede || s.aoVivo) s.eventos.push(['d', Math.round(t.x), Math.round(t.y), t.time === 'azul' ? 0 : 1]);
    agendar(0.55, () => {
      if (!s || s.acabou) return;
      tremer(true);
      for (const e of [...s.ent]) {
        if (e.time === t.time || e.vida <= 0 || dist(e, t) > raio + e.raio) continue;
        if (e.torre) { e.cd = Math.max(e.cd || 0, 3); continue; } // torres ficam paradas um tempo
        ferir(e, Math.round(t.dano * 1.6), t.time, t, { atravessa: true });
        if (!(e.atk && e.atk.m && e.atk.m.imune)) { e.atord = Math.max(e.atord, 3.5); e.el.classList.add('atordoada', 'no-vazio'); setTimeout(() => e.el && e.el.classList.remove('no-vazio'), 3500); }
      }
    });
  }
  function dominioVisual(x, y, time) {
    const jan = document.querySelector('.arena-grande-janela');
    if (!jan) return;
    const el = document.createElement('div');
    el.className = `dominio ${time}`;
    el.style.setProperty('--x', `${(x / W) * 100}%`);
    el.style.setProperty('--y', `${(y / H) * 100}%`);
    el.innerHTML = `<div class="dom-vazio"></div><div class="dom-aneis"></div><div class="dom-estrelas"></div>
      <div class="dom-texto"><small>Expansão de Domínio</small><b>Vazio Infinito</b></div>`;
    jan.appendChild(el);
    setTimeout(() => el.classList.add('saindo'), 1500);
    setTimeout(() => el.remove(), 1950);
  }

  function desenharHabilidades() {
    const caixa = document.getElementById('habilidades');
    if (!caixa) return;
    const minhas = s.ent.filter((e) => !e.torre && (e.dono || e.time) === 'azul' && e.habilidade && e.vida > 0);
    const ids = minhas.map((t) => t.id).join(',');
    if (caixa.dataset.ids !== ids) {
      caixa.dataset.ids = ids;
      caixa.innerHTML = minhas.map((t) => `<button class="btn-habilidade" data-t="${t.id}">
        <img src="assets/cartas/${t.carta.id}_medalhao.png" alt="" /><span class="hab-custo">${t.habilidade.custo}</span>
        <small>${t.habilidade.nome}</small><i class="hab-recarga"></i></button>`).join('');
      caixa.querySelectorAll('button').forEach((b) => (b.onpointerdown = (ev) => {
        ev.stopPropagation();
        const t = s.ent.find((e) => e.id === +b.dataset.t);
        if (t && !ativarHabilidade(t)) UI.toast(t.recarga > 0 ? 'Habilidade recarregando…' : 'Elixir insuficiente');
      }));
    }
    for (const b of caixa.querySelectorAll('button')) {
      const t = minhas.find((e) => e.id === +b.dataset.t);
      if (!t) continue;
      const pronta = t.recarga <= 0 && s.azul.elixir >= t.habilidade.custo && t.surgir <= 0;
      b.classList.toggle('pronta', pronta);
      b.querySelector('.hab-recarga').style.height = `${t.recarga > 0 ? (t.recarga / (t.habilidade.recarga || 10)) * 100 : 0}%`;
    }
  }

  // ---------- Inteligência das tropas ----------
  function escolherAlvo(t) {
    const inimigos = s.ent.filter((e) => e.time !== t.time && e.vida > 0 && !(e.banido > 0) && (t.alvoTipo === 'tudo' || e.torre));
    // atiradores enxergam mais longe (param pra atirar em vez de ir andando até o inimigo)
    const visaoTropa = Math.max(140, t.alcance + 55);
    let melhor = null, md = Infinity;
    for (const e of inimigos) {
      const d0 = dist(t, e);
      if (!e.torre && d0 > visaoTropa) continue;
      // tropas próximas têm prioridade sobre torres; quem está me batendo tem prioridade ainda maior
      let peso = e.torre ? d0 + 60 : d0 - (e.alvo === t ? 30 : 0);
      if (e.quintupla) peso += (e.id * 37 + t.id * 11 + Math.floor(s.t * 2) * 13) % 50; // ninguém sabe qual Nino é a verdadeira
      if (peso < md) { md = peso; melhor = e; }
    }
    return melhor;
  }

  // atirador recua um pouquinho de quem é corpo a corpo e está colado nele (enquanto recarrega o tiro)
  function recuar(t, dt) {
    if (t.cd < 0.12 || t.alcance <= 40) return;
    let perigo = null, pd = Infinity;
    for (const e of s.ent) {
      if (e.torre || e.time === t.time || e.vida <= 0 || e.alcance > 40 || e.surgir > 0 || e.atord > 0 || e.congelado > 0) continue;
      const d0 = dist(e, t);
      if (d0 < e.alcance + e.raio + t.raio + 14 && d0 < pd) { pd = d0; perigo = e; }
    }
    if (!perigo) return;
    const ux = (t.x - perigo.x) / (pd || 1), uy = (t.y - perigo.y) / (pd || 1);
    const passo = t.vel * 0.8 * dt * (t.lento > 0 ? 1 - t.lentoPct : 1);
    const nx = Math.max(14, Math.min(W - 14, t.x + ux * passo)), ny = Math.max(14, Math.min(H - 14, t.y + uy * passo));
    if (!t.voo && ny > RIO_TOPO - 2 && ny < RIO_BASE + 2 && !PONTES.some((b) => Math.abs(nx - b) < 26)) return; // não entra no rio
    if (t.alvo && Math.hypot(nx - t.alvo.x, ny - t.alvo.y) > t.alcance + t.alvo.raio + t.raio) return; // não sai do alcance
    t.x = nx; t.y = ny;
    evitarTorres(t);
  }

  // empurra a tropa para fora das torres (ela desliza em volta)
  function evitarTorres(t) {
    for (const e of s.ent) {
      if (!e.torre) continue;
      const dx = t.x - e.x, dy = t.y - e.y;
      const d0 = Math.hypot(dx, dy) || 0.01;
      const min = e.raio + t.raio + 2;
      if (d0 < min) {
        const k = (min - d0) / d0;
        t.x += dx * k;
        t.y += dy * k;
      }
    }
  }

  function moverPara(t, alvo, dt) {
    let px = alvo.x, py = alvo.y;
    const meuLado = t.y > PONTE_Y ? 'baixo' : 'cima';
    const ladoAlvo = alvo.y > PONTE_Y ? 'baixo' : 'cima';
    if (!t.voo && (meuLado !== ladoAlvo || (t.y > RIO_TOPO - 4 && t.y < RIO_BASE + 4))) {
      const bx = PONTES.reduce((a, b) => (Math.abs(b - t.x) < Math.abs(a - t.x) ? b : a));
      if (Math.abs(t.x - bx) > 6 && t.y > RIO_TOPO - 22 && t.y < RIO_BASE + 22) { px = bx; py = t.y; }
      else if (Math.abs(t.x - bx) > 6) { px = bx; py = meuLado === 'baixo' ? RIO_BASE + 14 : RIO_TOPO - 14; }
      else { px = bx; py = ladoAlvo === 'cima' ? RIO_TOPO - 16 : RIO_BASE + 16; }
    }
    const dx = px - t.x, dy = py - t.y, d0 = Math.hypot(dx, dy) || 1;
    const arrancada = t.atk && t.atk.m && t.atk.m.investida && !t.investiu && dist(t, alvo) < 130 ? 2.6 : 1;
    const passo = Math.min(d0, t.vel * (t.furia > 0 ? 1.25 : 1) * (t.lento > 0 ? 1 - t.lentoPct : 1) * arrancada * (s.turbo && !t.torre ? 1.4 : 1) * (t.acelerado > 0 ? 1.5 : 1) * (t.trunfo > 0 ? 1.4 : 1) * (t.semLimite ? 1.2 : 1) * dt);
    if (arrancada > 1 && !t.correndo) { t.correndo = true; t.el.classList.add('arrancada'); }
    let vx = dx / d0, vy = dy / d0;
    // se tem uma torre no caminho (que não é o alvo), desvia pelo lado mais curto
    for (const e of s.ent) {
      if (!e.torre || e === alvo) continue;
      const ex = e.x - t.x, ey = e.y - t.y;
      const frente = ex * vx + ey * vy; // distância da torre "à frente" da tropa
      if (frente <= 0 || frente > 60) continue;
      const lateral = ex * vy - ey * vx; // de que lado a torre está
      const folga = e.raio + t.raio + 4;
      if (Math.abs(lateral) < folga) {
        const lado = lateral > 0 ? 1 : -1; // desvia para o lado oposto ao da torre
        const peso = (1 - frente / 60) * 1.4;
        const nx = -(dy / d0) * lado, ny = (dx / d0) * lado;
        vx = dx / d0 + nx * peso;
        vy = dy / d0 + ny * peso;
        const n = Math.hypot(vx, vy) || 1;
        vx /= n; vy /= n;
      }
    }
    t.x += vx * passo;
    t.y += vy * passo;
    evitarTorres(t);
  }

  // ---------- Ataques únicos ----------
  // multiplicador de counters (classe contra classe) e dano reduzido nas torres
  function multClasse(a, alvo) {
    if (!a || !a.classe) return 1;
    if (alvo.torre) return a.carta && a.carta.danoTorre != null ? a.carta.danoTorre : Ataques.NA_TORRE[a.classe] || 1;
    return (Ataques.CONTRA[a.classe] && Ataques.CONTRA[a.classe][alvo.classe]) || 1;
  }

  // dano de um golpe (com counters, crítico, combo, kaioken, finalização...)
  function danoDe(a, alvo) {
    if (a.torre) return { dano: a.dano, crit: false };
    const m = (a.atk && a.atk.m) || {};
    let d0 = a.dano;
    if (a.furia > 0) d0 *= 1.3;
    if (a.buffDano > 0) d0 *= 1.2;
    if (a.semLimite) d0 *= 1.35;
    if (a.raiva > 0) d0 *= 1 + 0.2 * (a.raivaN || 1);
    if (a.golpesFortes > 0) { d0 *= a.multGolpes || 2.5; a.golpesFortes--; if (!a.golpesFortes) a.el.classList.remove('aura-golpes'); }
    if (alvo) d0 *= multClasse(a, alvo);
    a.golpes++;
    let crit = false;
    if (m.combo && a.golpes % m.combo === 0) { d0 *= 2; crit = true; }
    if (m.critico && Math.random() < m.critico[0]) { d0 *= m.critico[1]; crit = true; }
    if (m.kaioken) { d0 *= 1 + m.kaioken[1]; a.vida = Math.max(1, a.vida - a.max * m.kaioken[0]); atualizarHp(a); }
    if (m.execucao && alvo && !alvo.torre && alvo.vida / alvo.max < m.execucao[0]) { d0 *= m.execucao[1]; crit = true; }
    if (m.investida && !a.investiu) { d0 *= m.investida; a.investiu = true; crit = true; }
    if (a.fraco > 0) d0 *= 1 - a.fracoPct;
    return { dano: Math.max(1, Math.round(d0)), crit };
  }

  // efeitos ao acertar (atordoar, empurrar, lentidão, veneno, roubar elixir...)
  function aplicarGolpe(a, alvo, dano) {
    const m = (a && a.atk && a.atk.m) || {};
    if (!a || !alvo) return;
    const tropa = !alvo.torre && alvo.vida > 0;
    const imune = tropa && alvo.atk && alvo.atk.m && alvo.atk.m.imune;
    if (tropa && !imune) {
      if (m.atordoar && Math.random() < m.atordoar[0]) { alvo.atord = Math.max(alvo.atord, m.atordoar[1]); alvo.el.classList.add('atordoada'); }
      if (m.lentidao) { alvo.lento = m.lentidao[1]; alvo.lentoPct = m.lentidao[0]; alvo.el.classList.add('lenta'); }
      if (m.lentoAtaque) { alvo.lentoAtq = m.lentoAtaque[1]; alvo.lentoAtqPct = m.lentoAtaque[0]; alvo.el.classList.add('chakra'); }
      if (m.empurrar) empurrar(alvo, a, m.empurrar);
      if (m.puxar) empurrar(alvo, a, -m.puxar);
    }
    if (tropa && m.disco) { a.discoN = (a.discoN || 0) + 1; if (a.discoN % m.disco === 0) roubarDisco(a, alvo); }
    if (tropa) {
      if (m.enfraquecer) { alvo.fraco = m.enfraquecer[1]; alvo.fracoPct = m.enfraquecer[0]; alvo.el.classList.add('enfraquecida'); }
      if (m.marcar) { alvo.marcado = m.marcar[1]; alvo.marcaPct = m.marcar[0]; alvo.el.classList.add('marcada'); }
    }
    if (m.queimar && alvo.vida > 0) {
      const [k, dur, cor, tipo] = m.queimar;
      alvo.queima = dur; alvo.queimaDps = (dano * k * 10) / dur * (alvo.torre ? 0.5 : 1); alvo.queimaCor = cor; alvo.queimaFonte = a.time;
      if (!alvo.torre) { alvo.el.classList.add(tipo === 'veneno' ? 'envenenada' : 'queimando'); }
    }
    if (m.murasame && tropa && alvo.vida > 0) {
      amaldicoar(alvo, a);
      // Trunfo: o corte amaldiçoa quem está em volta também
      if (a.trunfo > 0) for (const e of s.ent) if (e !== alvo && !e.torre && e.time !== a.time && e.vida > 0 && dist(e, alvo) < 42 + e.raio) {
        amaldicoar(e, a);
        e.queima = 3; e.queimaDps = Math.max(e.queimaDps || 0, (dano * 0.6) / 3); e.queimaCor = '#B0123A'; e.queimaFonte = a.time; e.el.classList.add('envenenada');
      }
      checarExecucao(a, alvo);
    }
    if (m.aneis && a.vida > 0) a.aneis = Math.min(30, (a.aneis || 0) + 1);
    if (m.roubo && Math.random() < m.roubo[0]) {
      const vit = alvo.torre ? s[alvo.time] : jogadorDe(alvo), meu = jogadorDe(a);
      const q = Math.min(m.roubo[1], vit.elixir);
      vit.elixir -= q; meu.elixir = Math.min(10, meu.elixir + q);
      if (q > 0) { voarSprite('moeda', alvo, a, 0.45, 16); if (a.dono === 'azul') numero(a, 0, 'roubou'); }
    }
    if (m.vampiro && a.vida > 0) { a.vida = Math.min(a.max, a.vida + dano * m.vampiro); atualizarHp(a); }
    if (m.regen && a.vida > 0) { a.vida = Math.min(a.max, a.vida + a.max * m.regen); atualizarHp(a); }
    if (m.recuo && a.vida > 0) empurrar(a, alvo, m.recuo);
  }

  function empurrar(e, de, forca) {
    if (e.torre) return;
    const dx = e.x - de.x, dy = e.y - de.y, d0 = Math.hypot(dx, dy) || 1;
    e.x = Math.max(10, Math.min(W - 10, e.x + (dx / d0) * forca));
    e.y = Math.max(10, Math.min(H - 10, e.y + (dy / d0) * forca));
    // não pode ser empurrado para dentro do rio (fora das pontes)
    if (!e.voo && e.y > RIO_TOPO - 2 && e.y < RIO_BASE + 2 && !PONTES.some((b) => Math.abs(e.x - b) < 26)) e.y = e.y < PONTE_Y ? RIO_TOPO - 4 : RIO_BASE + 4;
    evitarTorres(e);
  }

  function teleportar(t, alvo) {
    if (!t || t.vida <= 0 || !alvo) return;
    efeito(`teleporte ${t.time}`, t.x, t.y, 450);
    const dx = t.x - alvo.x, dy = t.y - alvo.y, d0 = Math.hypot(dx, dy) || 1;
    const longe = alvo.raio + t.raio + Math.min(t.alcance, 14);
    t.x = alvo.x + (dx / d0) * longe; t.y = alvo.y + (dy / d0) * longe;
    evitarTorres(t);
    efeito(`teleporte ${t.time}`, t.x, t.y, 450);
    t.cd = Math.min(t.cd, 0.15);
    if (s.rede || s.aoVivo) s.eventos.push(['t', Math.round(t.x), Math.round(t.y)]);
  }

  // dano em área em volta de um ponto
  function explosaoArea(a, centro, dano, raio, opc = {}) {
    for (const e of [...s.ent]) {
      if (e.time === a.time || e.vida <= 0 || dist(e, centro) > raio + e.raio) continue;
      ferir(e, Math.round(dano * multClasse(a, e)), a.time, a);
      if (!e.torre && opc.atordoar && !(e.atk && e.atk.m && e.atk.m.imune)) { e.atord = Math.max(e.atord, opc.atordoar); e.el.classList.add('atordoada'); }
      if (!e.torre && opc.empurrar) empurrar(e, centro, opc.empurrar);
    }
    efeitoGolpe(opc.visual || 'impacto', centro, centro, { cor: opc.cor || '#FFD25E', s: opc.s, grande: raio });
    if (s.rede || s.aoVivo) s.eventos.push(['x', Math.round(centro.x), Math.round(centro.y), raio, opc.cor || '#FFD25E']);
    if (raio >= 35) tremer();
  }

  // ---------- Visuais dos golpes ----------
  const SPRITES = new Set(['katana', 'pao', 'nota', 'gelo', 'floco', 'bola', 'shuriken', 'cajado', 'leque', 'raio', 'fogo', 'bomba', 'coringa', 'garras', 'explosao', 'punho', 'tornado', 'espada_vegito', 'espada_trunks', 'espada_fp', 'cristal', 'flor', 'onda_fogo', 'moeda', 'onda', 'bala', 'capsula', 'ki_amarelo', 'ki_azul', 'ki_rosa', 'ki_laranja', 'ki_roxo', 'ki_vermelho', 'ki_prata', 'ki_verde']);
  const spriteUrl = (n) => `assets/ataques/${n}.svg`;

  function fxEl(classe, x, y, ms, estilo = {}) {
    if (vivos.particula >= LIMITE.particula + 10) return null;
    vivos.particula++;
    setTimeout(() => vivos.particula--, ms);
    return efeito(classe, x, y, ms, estilo);
  }

  // sprite voando de um ponto a outro (só visual)
  function voarSprite(nome, de, para, seg = 0.25, tam = 14, opc = {}) {
    const el = fxEl('fx-voa', de.x, de.y, seg * 1000 + 60, { width: `${(tam / W) * 100}%` });
    if (!el) return;
    el.style.backgroundImage = `url(${spriteUrl(nome)})`;
    const dx = (para.x - de.x) * escala, dy = (para.y - de.y) * escala;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    el.animate([
      { transform: `translate(-50%, -50%) rotate(${opc.mira ? ang : 0}deg) scale(0.7)` },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - (opc.arco || 0) * escala}px)) rotate(${opc.mira ? ang : opc.giro || 0}deg) scale(1)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${opc.mira ? ang : (opc.giro || 0) * 2}deg) scale(1)` },
    ], { duration: seg * 1000, easing: 'linear', fill: 'forwards' });
  }

  // desenha o golpe; serve para o jogo e para o convidado do x1 (recebe só posições)
  function efeitoGolpe(tipo, a, alvo, v = {}) {
    const dx = alvo.x - a.x, dy = alvo.y - a.y, ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const mx = a.x + dx * 0.62, my = a.y + dy * 0.62;
    const cor = v.cor || '#ffffff';
    if (tipo === 'esferas') {
      const n = v.n || 2;
      for (let i = 0; i < n; i++) setTimeout(() => s && voarSprite(v.s || 'ki_amarelo', { x: a.x + (i - (n - 1) / 2) * 6, y: a.y - 6 }, alvo, 0.16, 11), i * 70);
      setTimeout(() => s && fxEl('fx-soco', alvo.x, alvo.y, 320, { '--cor': cor }), 150);
      return;
    }
    if (tipo === 'raio') {
      const el = fxEl('fx-raio', a.x, a.y, 260);
      if (!el) return;
      const L = Math.hypot(dx, dy) * escala;
      const pts = Array.from({ length: 7 }, (_, i) => `${(i / 6) * L},${i === 0 || i === 6 ? 0 : (Math.random() - 0.5) * 14}`).join(' ');
      el.innerHTML = `<svg width="${L}" height="20" viewBox="0 -10 ${L} 20" style="overflow:visible"><polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="4" stroke-linejoin="round" opacity="0.6"/><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
      el.style.transform = `rotate(${ang}deg)`;
      fxEl('fx-soco', alvo.x, alvo.y, 260, { '--cor': cor });
      return;
    }
    if (tipo === 'impacto') {
      const tam = v.grande ? v.grande * 2 : 46;
      fxEl('fx-impacto', alvo.x, alvo.y, 480, { '--cor': cor, width: `${(tam / W) * 100}%` });
      if (v.s) { const e2 = fxEl('fx-sprite-pop', alvo.x, alvo.y, 420, { width: `${((v.grande ? tam * 0.6 : 26) / W) * 100}%` }); if (e2) e2.style.backgroundImage = `url(${spriteUrl(v.s)})`; }
      return;
    }
    if (tipo === 'tornado') {
      const e2 = fxEl('fx-tornado', a.x, a.y, 500, { width: `${(34 / W) * 100}%` });
      if (e2) e2.style.backgroundImage = `url(${spriteUrl(v.s || 'tornado')})`;
      fxEl('fx-puxa', alvo.x, alvo.y, 400, { '--cor': cor, '--ang': `${ang + 180}deg` });
      return;
    }
    if (tipo === 'corte') {
      fxEl('fx-corte', mx, my, 300, { '--cor': cor, '--ang': `${ang}deg` });
      if (v.s) { const e2 = fxEl('fx-arma', mx, my, 260, { '--ang': `${ang - 45}deg` }); if (e2) e2.style.backgroundImage = `url(${spriteUrl(v.s)})`; }
      return;
    }
    if (tipo === 'giro') {
      const e2 = fxEl('fx-giro', mx, my, 320, { '--ang': `${ang}deg` });
      if (e2) e2.style.backgroundImage = `url(${spriteUrl(v.s)})`;
      fxEl('fx-soco', alvo.x, alvo.y, 260, { '--cor': cor });
      return;
    }
    if (tipo === 'chute') {
      fxEl('fx-chute', mx, my, 300, { '--cor': cor, '--ang': `${ang}deg` });
      if (v.s === 'bola') voarSprite('bola', a, alvo, 0.14, 10, { giro: 360 });
      return;
    }
    if (tipo === 'palma') {
      const e2 = fxEl('fx-palma', alvo.x, alvo.y, 360, { '--cor': cor });
      if (e2 && v.s) e2.style.backgroundImage = `url(${spriteUrl(v.s)})`;
      return;
    }
    // soco
    fxEl(`fx-soco${v.pesado ? ' pesado' : ''}`, mx + (alvo.x - mx) * 0.6, my + (alvo.y - my) * 0.6, 300, { '--cor': cor });
    if (v.pesado) tremer();
  }
  function golpeVisual(a, alvo, v) {
    typeof Som !== 'undefined' && Som.tocar('golpe', v && v.pesado ? 1.5 : 1);
    efeitoGolpe(v.g || 'soco', a, alvo, v);
    if (s.rede && a.carta) s.eventos.push(['h', Math.round(a.x), Math.round(a.y), Math.round(alvo.x), Math.round(alvo.y), a.carta.id]);
  }

  // ---------- Projéteis ----------
  function criarProjetil(a, alvo, dano, v, opc = {}) {
    typeof Som !== 'undefined' && !(a && a.torre) && Som.tocar('tiro');
    const p = document.createElement('div');
    const sprite = v && v.p && SPRITES.has(v.p) ? v.p : null;
    p.className = `projetil ${a.time}${a.torre ? ` de-torre${a.tropa ? ` t-${a.tropa}` : ''}` : ''}${sprite ? ' com-sprite' : ''}`;
    if (sprite) {
      p.style.backgroundImage = `url(${spriteUrl(sprite)})`;
      p.style.width = `${((v.tam || 16) / W) * 100}%`;
      if (v.rastro) p.style.setProperty('--rastro', v.rastro);
    }
    s.arena.appendChild(p);
    const m = (a.atk && a.atk.m) || {};
    const pj = {
      x: opc.x != null ? opc.x : a.x, y: opc.y != null ? opc.y : a.y - 14, alvo, dano, area: opc.area != null ? opc.area : a.area || 0, time: a.time, el: p, mudou: true,
      fonte: a, vel: (v && v.vel) || 300, giroVel: v && typeof v.giro === 'number' ? v.giro : 0, mira: v && v.giro === 'mira', giro: 0,
      arco: (v && v.arco) || 0, explode: v && v.explode, crit: opc.crit, sprite, semEfeitos: opc.semEfeitos,
      perfura: !opc.semPerfurar && !!m.perfura, ricochete: opc.ricochete != null ? opc.ricochete : m.ricochete || 0,
    };
    pj.x0 = pj.x; pj.y0 = pj.y; pj.total = Math.hypot(alvo.x - pj.x, alvo.y - pj.y) || 1;
    if (pj.perfura) {
      const d0 = pj.total;
      pj.dx = (alvo.x - pj.x) / d0; pj.dy = (alvo.y - pj.y) / d0;
      pj.resta = (a.alcance || 80) + 60; pj.atingidos = new Set();
    }
    s.proj.push(pj);
    return pj;
  }

  // raio que cai do céu (Nami Last)
  function raioDoCeu(a, alvo, dano, crit) {
    const x = alvo.x, y = alvo.y;
    fxEl('fx-mira-raio', x, y, 260);
    agendar(0.22, () => {
      if (!s) return;
      const el = fxEl('fx-raio-ceu', x, y, 380);
      if (el) el.style.backgroundImage = `url(${spriteUrl('raio')})`;
      if (s.rede || s.aoVivo) s.eventos.push(['r', Math.round(x), Math.round(y)]);
      const area = a.area || 30;
      for (const e of [...s.ent]) {
        if (e.time === a.time || e.vida <= 0 || dist(e, { x, y }) > area + e.raio) continue;
        const dd = Math.round(dano * (e === alvo ? 1 : 1) * (multClasse(a, e) / Math.max(0.01, multClasse(a, alvo))));
        ferir(e, dd, a.time, a, { crit });
        aplicarGolpe(a, e, dd);
      }
      particulas(x, y, '#FFE45C', 8, 26);
    });
  }

  function acertarProjetil(p, alvo) {
    const a = p.fonte;
    if (p.area) {
      for (const e of [...s.ent]) {
        if (e.time === p.time || e.vida <= 0 || dist(e, alvo) > p.area + e.raio) continue;
        const dd = e === alvo ? p.dano : Math.round(p.dano * (a && !a.torre ? multClasse(a, e) / Math.max(0.01, multClasse(a, alvo)) : 1));
        ferir(e, dd, p.time, a, { crit: p.crit });
        if (a && !a.torre && !p.semEfeitos) aplicarGolpe(a, e, dd);
      }
      const ex = document.createElement('div');
      ex.className = `explosao ${p.time}${p.explode ? ' grande' : ''}`;
      Object.assign(ex.style, pct(alvo.x, alvo.y), { width: `${((p.area * 2) / W) * 100}%` });
      s.arena.appendChild(ex);
      setTimeout(() => ex.remove(), 400);
    } else {
      ferir(alvo, p.dano, p.time, a, { crit: p.crit });
      if (a && !a.torre && !p.semEfeitos) aplicarGolpe(a, alvo, p.dano);
    }
    if (p.gojo) gojoImpacto(p, alvo);
    // ricochete (Bulma): quica para outro alvo perto
    if (p.ricochete && a) {
      const prox = s.ent.filter((e) => e !== alvo && e.time !== p.time && e.vida > 0 && dist(e, alvo) < 90).sort((x, y) => dist(x, alvo) - dist(y, alvo))[0];
      if (prox) criarProjetil(a, prox, Math.round(p.dano * p.ricochete), a.atk.v, { x: alvo.x, y: alvo.y, ricochete: 0, area: p.area * 0.7 });
    }
  }

  // ---------- Atacar ----------
  function atacar(atacante, alvo) {
    if (atacante.torre) {
      criarProjetil(atacante, alvo, atacante.dano, null);
      return;
    }
    const v = (atacante.atk && atacante.atk.v) || {};
    const m = (atacante.atk && atacante.atk.m) || {};
    const { dano, crit } = danoDe(atacante, alvo);
    const ehEspecial = m.especial && atacante.golpes % m.especial[0] === 0;
    const ehExtra = m.extra && atacante.golpes % m.extra[0] === 0;

    if (atacante.alcance > 40) {
      piscar(atacante.el, 'atirando');
      if (m.gojo) { gojoAtaque(atacante, alvo, dano, crit); return; }
      if (m.hana) { hanaAtaque(atacante, alvo, dano, crit); return; }
      if (m.tusk) { criarProjetil(atacante, alvo, tuskDano(atacante, alvo, dano, m), v, { crit }); return; }
      if (v.ceu) { raioDoCeu(atacante, alvo, dano, crit); return; }
      const n = m.rajada || 1;
      for (let i = 0; i < n; i++) {
        const disparar = () => { if (atacante.vida > 0 && alvo.vida > 0) criarProjetil(atacante, alvo, Math.round(dano / n), v, { crit, x: atacante.x + (i - (n - 1) / 2) * 5 }); };
        if (i === 0) disparar(); else agendar(i * 0.11, disparar);
      }
      return;
    }

    // corpo a corpo
    const dx = alvo.x - atacante.x, dy = alvo.y - atacante.y, d0 = Math.hypot(dx, dy) || 1;
    atacante.el.style.setProperty('--lx', `${(dx / d0) * 9}px`);
    atacante.el.style.setProperty('--ly', `${(dy / d0) * 9}px`);
    piscar(atacante.el, 'atacando');
    golpeVisual(atacante, alvo, v);
    if (m.ora && atacante.golpes % m.ora === 0) { oraOra(atacante, alvo, dano, crit); return; }
    if (m.chaosSpear && atacante.golpes % m.chaosSpear === 0) chaosSpear(atacante, alvo, dano);
    const n = m.rajada || 1;
    const bater = (dd, efeitos) => {
      if (alvo.vida <= 0) return;
      const feito = ferir(alvo, dd, atacante.time, atacante, { crit });
      if (efeitos) aplicarGolpe(atacante, alvo, feito || dd);
    };
    if (n > 1) { for (let i = 0; i < n; i++) { if (i === 0) bater(Math.round(dano / n), true); else agendar(i * 0.07, () => bater(Math.round(dano / n), false)); } }
    else bater(dano, true);
    // dano em área do golpe (ex.: Caulifla SSJ, Gogeta SSJ4)
    if (atacante.area) {
      for (const e of [...s.ent]) {
        if (e === alvo || e.time === atacante.time || e.vida <= 0 || dist(e, alvo) > atacante.area + e.raio) continue;
        const dd = Math.round(atacante.dano * multClasse(atacante, e) * 0.75);
        ferir(e, dd, atacante.time, atacante);
        aplicarGolpe(atacante, e, dd);
      }
    }
    // corte que atravessa (Trunks): acerta também quem está logo atrás
    if (m.perfura) {
      const ux = dx / d0, uy = dy / d0;
      const atras = s.ent.find((e) => e !== alvo && e.time !== atacante.time && !e.torre && e.vida > 0 && Math.hypot(e.x - (alvo.x + ux * 22), e.y - (alvo.y + uy * 22)) < 18);
      if (atras) { ferir(atras, Math.round(dano * 0.6), atacante.time, atacante); efeitoGolpe('corte', alvo, atras, v); }
    }
    // raio em cadeia (Kashimo)
    if (m.cadeia) {
      let de = alvo; const ja = new Set([alvo]);
      for (let i = 0; i < m.cadeia; i++) {
        const prox = s.ent.filter((e) => !ja.has(e) && e.time !== atacante.time && e.vida > 0 && !e.torre && dist(e, de) < 75).sort((x, y) => dist(x, de) - dist(y, de))[0];
        if (!prox) break;
        ja.add(prox);
        const de0 = de;
        agendar(0.08 * (i + 1), () => { efeitoGolpe('raio', de0, prox, v); ferir(prox, Math.round(dano * 0.65), atacante.time, atacante); });
        de = prox;
      }
    }
    if (ehEspecial) {
      const [, mult, raio, sprite, atord] = m.especial;
      agendar(0.05, () => explosaoArea(atacante, alvo, Math.round(atacante.dano * mult), raio, { visual: 'impacto', cor: v.cor, s: sprite, atordoar: atord }));
    }
    if (ehExtra) {
      const [, sprite, mult] = m.extra;
      criarProjetil(atacante, alvo, Math.round(atacante.dano * mult * multClasse(atacante, alvo)), { p: sprite, vel: 320, tam: 20, rastro: v.cor }, { area: 22, semPerfurar: true });
    }
  }

  // ---------- Oponente (computador) ----------
  const ehTanque = (c) => !c.feitico && !c.barril && (c.vida >= 900 || c.alvo === 'construcoes');
  const dpsC = (c) => (c.dano || 0) / (c.cadencia || 1);
  const dpsE = (e) => (e.dano || 0) / (e.cadencia || 1);

  // Dificuldade da IA baseada nos troféus do jogador
  function dificuldadeIA() {
    if (!s) return 3;
    if (s.difIA) return s.difIA; // eventos com dificuldade fixa e tutorial
    if (s.superIA) return 6;     // IA super inteligente (rara)
    if (s.adaptativa) return Math.max(1, Math.min(5, s.difBase + s.difAjuste));
    const t = Estado.d.trofeus || 0;
    // a IA joga bem (as cartas dela é que são de nível mais baixo)
    if (t >= 1200) return 5; // muito esperta
    if (t >= 500)  return 4;
    if (t >= 100)  return 3;
    return 2;                // primeiras partidas
  }



  // cartas da IA: em volta de 1 nível abaixo da média do seu deck; algumas ficam 2 abaixo (sorteado uma vez por partida)
  function nivelCartaIA(id) {
    if (!s.niveisIA) s.niveisIA = {};
    if (s.nivelFixo) return s.nivelFixo;
    if (!(id in s.niveisIA)) s.niveisIA[id] = Math.max(1, s.nivelIA);
    return s.niveisIA[id];
  }

  // torres da IA: mesmo nível de rei que você e torres de princesa iguais ou um pouco abaixo das suas
  function torresIA(m) {
    const apelao = !!Mod.deckApelao();
    const rei = Math.min(Estado.NIVEL_MAX, m.rei + (apelao ? 1 : 0));
    const princesa = Math.max(1, Math.min(rei, m.princesa + (apelao ? 1 : -Math.floor(Math.random() * 2))));
    const tropas = Object.entries(Estado.TROPAS_TORRE).filter(([, t]) => t.rei <= rei).map(([id]) => id);
    return { rei, princesa, tropa: tropas[Math.floor(Math.random() * tropas.length)] };
  }

  // deck aleatório e equilibrado: 1 tanque, 2 feitiços/barril, 1 dano em área, 1 atiradora e o resto sorteado
  function deckAleatorioIA() {
    // só cartas que VOCÊ já liberou (arena/troféus); antes vinha Goku MUI na Arena 1
    let base = Estado.disponiveis().filter((c) => !c.token);
    if (base.length < 12) {
      const resto = Estado.catalogo().filter((c) => !c.exclusivo && !c.token && !base.includes(c)).sort((a, b) => (a.trofeus || 0) - (b.trofeus || 0));
      base = base.concat(resto.slice(0, 12 - base.length));
    }
    const pool = embaralhar(base);
    const deck = [];
    const pega = (filtro, n) => { for (const c of pool) { if (deck.length >= 8 || n <= 0) break; if (!deck.includes(c) && filtro(c)) { deck.push(c); n--; } } };
    pega(ehTanque, 1);
    pega((c) => c.feitico || c.barril, 2);
    pega((c) => c.area && !c.feitico, 1);
    pega((c) => c.alcance > 40 && !c.area, 1);
    pega((c) => c.custo <= 2 && !c.feitico, 1);
    pega(() => true, 8);
    return deck.map((c) => c.id);
  }

  // a IA sempre "pensa" como se estivesse em cima (time vermelho).
  // Para a parceira IA (time azul, embaixo) a arena é virada: visao() espelha posições e times.
  let iaLado = 'vermelho', iaFlip = false;
  const tkIA = (quem) => (quem === 'vermelho' ? 'iaTimer' : `iaTimer_${quem}`);
  const fxI = (x) => (iaFlip ? W - x : x), fyI = (y) => (iaFlip ? H - y : y);
  const outroTime = (t) => (t === 'azul' ? 'vermelho' : 'azul');
  const torreVivaIA = (id) => torreViva(iaFlip ? espelhoTorre(id) : id);
  function visao(e) {
    if (!iaFlip) return e;
    const v = Object.create(e);
    v.x = W - e.x; v.y = H - e.y; v.time = outroTime(e.time);
    if (e.torre) v.id = espelhoTorre(e.id);
    v.alvo = e.alvo ? { x: W - e.alvo.x, y: H - e.alvo.y, torre: e.alvo.torre, time: outroTime(e.alvo.time), raio: e.alvo.raio, vida: e.alvo.vida } : null;
    return v;
  }
  function iaJogar(m, x, y) {
    const meuT = timeDe(iaLado);
    if (!m.c.feitico && !m.c.barril) {
      for (let k = 0; k < 8 && !podeColocar(meuT, fxI(x), fyI(y)); k++) y -= 15;
      if (!podeColocar(meuT, fxI(x), fyI(y))) return false;
    }
    jogar(iaLado, m.i, fxI(Math.max(28, Math.min(W - 28, x))), fyI(y));
    const d = dificuldadeIA();
    s[tkIA(iaLado)] = ({ 1: 1.2, 2: 0.8, 3: 0.5, 4: 0.35, 5: 0.22 }[d] || 0.45) + Math.random() * 0.25 + (s.dupla ? 0.25 : 0);
    return true;
  }

  // onde a tropa vai estar daqui a "seg" segundos
  function prever(e, seg) {
    if (e.torre || !e.alvo || e.surgir > 0) return { x: e.x, y: e.y };
    const dx = e.alvo.x - e.x, dy = e.alvo.y - e.y, d0 = Math.hypot(dx, dy) || 1;
    const anda = Math.min(Math.max(0, d0 - (e.alcance + e.alvo.raio + e.raio)), e.vel * seg);
    return { x: e.x + (dx / d0) * anda, y: e.y + (dy / d0) * anda };
  }

  // melhor ponto para um feitiço: soma o dano útil em tropas e torres
  function melhorFeitico(m, nivel, inimigos, torres) {
    const dano = m.c.dano * nivel;
    const area = m.c.area;
    let melhor = null;
    const candidatos = [...inimigos.map((e) => prever(e, 0.55)), ...torres.map((t) => ({ x: t.x, y: t.y }))];
    for (const p of candidatos) {
      let v = 0, acertos = 0, mata = false, custoMorto = 0;
      for (const e of inimigos) {
        const q = prever(e, 0.55);
        if (Math.hypot(q.x - p.x, q.y - p.y) > area + e.raio) continue;
        acertos++;
        if (e.vida <= dano) { mata = true; custoMorto = Math.max(custoMorto, (e.carta && e.carta.custo) || 0); }
        v += Math.min(e.vida, dano) + (e.vida <= dano ? 120 + dpsE(e) * 3 : 0);
      }
      // numa tropa sozinha, só vale se for troca boa de elixir (matar algo mais caro que o feitiço)
      if (acertos === 1) v = mata ? Math.max(0, custoMorto - 0.5) * 165 : v * 0.25;
      for (const t of torres) {
        if (Math.hypot(t.x - p.x, t.y - p.y) > area + t.raio) continue;
        const dt0 = dano * 0.35;
        v += t.vida <= dt0 ? 5000 : dt0 * 0.8;
      }
      if (!melhor || v > melhor.v) melhor = { ...p, v };
    }
    return melhor;
  }

  // quanto a carta "m" ganha da ameaça (maior = melhor defesa)
  function notaDefesa(m, grupo, nivel) {
    const c = m.c;
    if (c.feitico || c.alvo === 'construcoes') return -999;
    if (c.barril) {
      const mini = Estado.carta(c.barril.tropa);
      return grupo.every((e) => e.alcance > 40) ? 60 - c.custo * 10 : 10 - c.custo * 10;
    }
    const vidaGrupo = grupo.reduce((a, e) => a + e.vida, 0);
    const dpsGrupo = grupo.reduce((a, e) => a + dpsE(e), 0) || 1;
    const alvos = c.area ? Math.min(grupo.length, 3) : 1;
    const matar = vidaGrupo / (dpsC(c) * nivel * alvos + 1);
    const aguentar = (c.vida * nivel) / dpsGrupo;
    let nota = (aguentar / matar) * 100 - c.custo * 14;
    if (grupo.some((e) => e.alcance > 40) && c.velocidade >= 55) nota += 40; // corre atrás das atiradoras
    if (c.alcance > 40) nota += 25; // atirador fica protegido atrás da torre
    if (grupo.every((e) => e.alvoTipo === 'construcoes')) nota += dpsC(c) / 4; // tanque: precisa de muito dano
    return nota;
  }

  function ia(dt, quem = 'vermelho') {
    if (Mod.flag('iaParada') || (s.rede && !s.dupla) || !s[quem]) return;
    iaLado = quem; iaFlip = timeDe(quem) === 'azul';
    const tk = tkIA(quem);
    const meuT = timeDe(quem), outroT = outroTime(meuT);
    const L = s[quem];
    const dif = dificuldadeIA();
    s[tk] = (s[tk] === undefined ? 2 : s[tk]) - dt;
    if (s[tk] > 0) return;
    // tempo de reação conforme dificuldade (fácil = lento, 1500+ = bem rápido)
    const delay = { 1: 1.4, 2: 0.9, 3: 0.55, 4: 0.32, 5: 0.2, 6: 0.12 }[dif] || 0.4;
    s[tk] = delay + Math.random() * (delay * 0.5);
    const ents = s.ent.map(visao);
    const elixirInimigo = Math.min(...LADOS.filter((l) => timeDe(l) === outroT && s[l]).map((l) => s[l].elixir));

    // 0) habilidades das campeãs
    for (const t of s.ent.filter((e) => !e.torre && (e.dono || e.time) === quem && e.habilidade && e.recarga <= 0 && e.surgir <= 0)) {
      const h = t.habilidade;
      if (L.elixir < h.custo) continue;
      const perto = t.alvo && t.alvo.vida > 0 && dist(t, t.alvo) < t.alcance + 60;
      const usar = (h.tipo === 'cura' && t.vida < t.max * 0.45)
        || (h.tipo === 'fenix' && t.vida < t.max * 0.4)
        || ((h.tipo === 'golpes' || h.tipo === 'furia') && perto && (t.alvo.torre || t.alvo.vida > t.dano))
        || ((h.tipo === 'kamehameha' || h.tipo === 'vazioPurpura') && t.alvo && dist(t, t.alvo) < 240)
        || (h.tipo === 'esquiva' && perto && t.vida < t.max * 0.8)
        || (h.tipo === 'mitaJoga' && L.fila.slice(0, 4).some((id) => { const c = Estado.carta(id); return !c.feitico && !c.barril && c.custo >= 4; }))
        || (h.tipo === 'chaosControl' && s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 160).length >= 2)
        || (h.tipo === 'superBoost' && t.alvo && dist(t, t.alvo) < 200 && (t.aneis || 0) < 12)
        || (h.tipo === 'explosaoSombria' && s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 130).length >= 2)
        || (h.tipo === 'soulSurge' && t.alvo && dist(t, t.alvo) < 230 && (t.alvo.torre || s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 230).length >= 2))
        || (h.tipo === 'hiperRajada' && s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 170).length >= 2)
        || (h.tipo === 'reinoSombras' && s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 150).length >= 2)
        || (h.tipo === 'trunfoMurasame' && perto && t.vida > t.max * 0.3 && (t.alvo.torre || s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < 120).length >= 2 || t.alvo.vida > t.dano * 2))
        || (h.tipo === 'deletar' && s.ent.some((e) => !e.torre && e.time !== t.time && e.vida > 600 && dist(e, t) < 230))
        || (h.tipo === 'starWorld' && s.ent.filter((e) => e.time !== t.time && e.vida > 0 && dist(e, t) < 170).length >= 2)
        || (h.tipo === 'zaWarudo' && (s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0).length >= 3 || (perto && t.alvo.torre)))
        || (h.tipo === 'kingCrimson' && perto && (t.vida < t.max * 0.6 || t.alvo.vida > t.dano * 3))
        || (h.tipo === 'madeInHeaven' && s.ent.filter((e) => !e.torre && e.time === t.time && e.vida > 0).length >= 3)
        || (h.tipo === 'ballBreaker' && t.alvo && dist(t, t.alvo) < 260 && (t.alvo.torre || s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t.alvo) < 90).length >= 2))
        || (h.tipo === 'tuskAct4' && t.alvo && !t.alvo.torre && t.alvo.vida > t.dano * 3)
        || (h.tipo === 'quintuplas' && t.vida < t.max * 0.8 && s.ent.some((e) => !e.torre && e.vida > 0 && e.alvo === t))
        || (h.tipo === 'gigantescoMano' && t.alvo && dist(t, t.alvo) < 200 && s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t.alvo) < 72).length >= 2)
        || (h.tipo === 'congelar' && s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && dist(e, t) < (h.raio || 95) + 40).length >= 2);
      if (usar && ativarHabilidade(t)) return;
    }

    const mao = L.fila.slice(0, 4).map((id, i) => ({ i, c: Estado.carta(id) }));
    const pode = mao.filter((m) => m.c.custo <= L.elixir);
    const nivel = Math.pow(1.1, s.nivelIA - 1);

    // Em dificuldades baixas a IA "erra" e joga de forma aleatória/burra
    const confusa = mitaConfundeIA(meuT);
    if ((dif <= 2 || confusa) && pode.length) {
      const chanceBurra = dif === 1 ? 0.72 : dif === 2 ? 0.38 : 0.3; // a Mita Malvada bagunça a cabeça do bot
      if (Math.random() < chanceBurra) {
        const m = pode[Math.floor(Math.random() * pode.length)];
        const x = PONTES[Math.random() < 0.5 ? 0 : 1] + (Math.random() * 40 - 20);
        const y = m.c.feitico || m.c.barril
          ? (80 + Math.random() * 200)
          : (RIO_TOPO - 10 - Math.random() * 30);
        return iaJogar(m, x, y);
      }
    }

    const torresAzuis = ents.filter((e) => e.torre && e.time === 'azul');
    const inimigos = ents.filter((e) => !e.torre && e.time === 'azul' && e.vida > 0);
    const meus = ents.filter((e) => !e.torre && e.time === 'vermelho' && e.vida > 0);
    const resta = DURACAO + (s.prorrogacao ? PRORROGACAO : 0) - s.t;
    const dobro = s.modo === 'elixir2x' || s.prorrogacao || resta <= 60;
    const ganhando = s[meuT].coroas > s[outroT].coroas;
    const perdendo = s[meuT].coroas < s[outroT].coroas;

    // 1) feitiço que vale a pena (finaliza torre, acerta grupo, mata atiradora/campeã)
    // Como uma pessoa: só "enxerga" a tropa nova depois de um tempo de reação (antes ela
    // jogava o feitiço no instante em que a carta aparecia), erra um pouco a mira e não
    // fica jogando feitiço atrás de feitiço.
    const reacao = { 1: 2.2, 2: 1.8, 3: 1.5, 4: 1.25, 5: 1.05, 6: 0.85 }[dif] || 1.3;
    const vistos = inimigos.filter((e) => s.t - (e.nasceu || 0) >= reacao + ((e.id * 7) % 10) / 15);
    if (!s.iaFeitCd) s.iaFeitCd = {};
    if (s.t >= (s.iaFeitCd[quem] || 0)) for (const m of pode.filter((x) => x.c.feitico)) {
      const p = melhorFeitico(m, nivel, vistos, torresAzuis);
      const baseMin = perdendo && resta < 45 ? 90 : 165;
      // fácil/médio exige valor bem maior → quase nunca joga feitiço no momento certo
      const multDif = { 1: 2.4, 2: 1.7, 3: 1.25, 4: 1.05, 5: 0.9, 6: 0.8 }[dif] || 1;
      const minimo = m.c.custo * baseMin * multDif;
      if (p && p.v >= minimo) {
        const erro = { 1: 24, 2: 20, 3: 15, 4: 11, 5: 9, 6: 6 }[dif] || 12;
        const a = Math.random() * Math.PI * 2, r = Math.random() * erro;
        s.iaFeitCd[quem] = s.t + 4 + Math.random() * 3;
        return iaJogar(m, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
    }

    // 2) defesa
    const ameacas = inimigos.filter((e) => e.y < RIO_BASE + 45 || (e.alvo && e.alvo.torre && e.alvo.time === 'vermelho'));
    if (ameacas.length) {
      const alvo = ameacas.reduce((a, b) => (b.y < a.y ? b : a)); // a que está mais perto das minhas torres
      const grupo = ameacas.filter((e) => dist(e, alvo) < 70);
      const perigo = grupo.reduce((a, e) => a + e.vida + dpsE(e) * 6, 0);
      const defensores = meus.filter((e) => dist(e, alvo) < 110);
      const jaDefendido = defensores.reduce((a, e) => a + e.vida + dpsE(e) * 6, 0) > perigo * 1.2;
      const atravessou = alvo.y < RIO_TOPO - 6;

      if (!jaDefendido) {
        const opcoes = pode.filter((m) => !m.c.feitico).map((m) => ({ m, nota: notaDefesa(m, grupo, nivel) })).sort((a, b) => b.nota - a.nota);
        const melhor = opcoes[0];
        const vale = melhor && (melhor.nota > 15 || perigo > 900);
        if (vale) {
          const c = melhor.m.c;
          const ladoX = alvo.x < W / 2 ? 90 : 270;
          if (c.barril) return iaJogar(melhor.m, alvo.x, alvo.y - 10);
          if (c.alcance > 40) return iaJogar(melhor.m, ladoX + (alvo.x < ladoX ? -16 : 16), 72); // atrás da torre
          // tropa que só ataca torre ou corpo a corpo: puxa para o meio, entre as duas torres
          if (!atravessou && grupo.every((e) => e.alcance <= 40 && e.alvoTipo !== 'construcoes') && c.custo <= 3) {
            return iaJogar(melhor.m, W / 2 + (alvo.x < W / 2 ? -20 : 20), 150);
          }
          // espera o tanque atravessar para a torre ajudar; contra os outros, vai direto
          if (!atravessou && grupo.every((e) => e.alvoTipo === 'construcoes')) { s[tk] = 0.2; return; }
          const q = prever(alvo, 0.6);
          return iaJogar(melhor.m, q.x + (Math.random() * 12 - 6), Math.max(130, Math.min(RIO_TOPO - 10, q.y - 30)));
        }
      }
      if (L.elixir < 9.4) return; // guarda elixir para continuar defendendo
    }

    // 3) contra-ataque e apoio: ajuda as minhas tropas que estão atacando
    const atacando = meus.filter((e) => e.y > RIO_TOPO - 40 && e.vida > e.max * 0.35);
    if (atacando.length && L.elixir >= 3) {
      const lider = atacando.reduce((a, b) => (b.max > a.max ? b : a));
      const apoio = pode.filter((m) => !m.c.feitico && !m.c.barril && !ehTanque(m.c)).sort((a, b) => dpsC(b.c) - dpsC(a.c))[0];
      const defesaAzul = inimigos.filter((e) => dist(e, lider) < 120).length;
      if (apoio && (lider.max >= 900 || defesaAzul > 0)) {
        return iaJogar(apoio, lider.x + (Math.random() * 20 - 10), Math.max(60, Math.min(lider.y - 34, RIO_TOPO - 8)));
      }
    }

    // 4) estratégia de fim de jogo: ganhando, só defende
    if (ganhando && resta < 50 && L.elixir < 10) return;

    // 5) ataque: evita desperdiçar elixir e aproveita quando o jogador gasta
    const limite = dobro ? 6.5 : perdendo && resta < 70 ? 7 : 8.8;
    const oportunidade = elixirInimigo < 3 && L.elixir >= 5;
    if (L.elixir < limite && !oportunidade) return;

    // escolhe a torre mais fraca (ou o lado com menos defesa)
    const vida = (id) => { const t = ents.find((e) => e.id === id); return t ? t.vida : -1; };
    const ve = vida('esq-azul'), vd = vida('dir-azul');
    const defEsq = inimigos.filter((e) => e.x < W / 2).length, defDir = inimigos.length - defEsq;
    let lado = ve < 0 ? 0 : vd < 0 ? 1 : (ve - defEsq * 150) <= (vd - defDir * 150) ? 0 : 1;
    if (dobro && Math.random() < 0.35) lado = 1 - lado; // ataque dividido no elixir em dobro
    const x = PONTES[lado];
    const bolso = !torreVivaIA(lado ? 'dir-azul' : 'esq-azul');
    const torreAlvo = ents.find((e) => e.id === (lado ? 'dir-azul' : 'esq-azul')) || ents.find((e) => e.id === 'rei-azul');

    // barril quando a torre está sem defesa
    const barril = pode.find((m) => m.c.barril);
    if (barril && torreAlvo && !inimigos.some((e) => dist(e, torreAlvo) < 100)) return iaJogar(barril, torreAlvo.x, torreAlvo.y - 28);

    const tropas = pode.filter((m) => !m.c.feitico && !m.c.barril);
    if (!tropas.length) return;
    const tanque = tropas.filter((m) => ehTanque(m.c)).sort((a, b) => b.c.vida - a.c.vida)[0];
    if (tanque && (L.elixir >= 8 || bolso)) return iaJogar(tanque, x + (Math.random() * 14 - 7), bolso ? RIO_BASE + 30 : 66); // tanque atrás para juntar elixir
    const pressao = tropas.sort((a, b) => (b.c.velocidade || 0) - (a.c.velocidade || 0) || a.c.custo - b.c.custo)[0];
    return iaJogar(pressao, x + (Math.random() * 14 - 7), bolso ? RIO_BASE + 30 : RIO_TOPO - 18);
  }

  // ---------- Loop principal ----------
  // "foto" do estado da batalha que vai para o celular do convidado
  function foto() {
    return {
      t: +s.t.toFixed(2), p: s.prorrogacao ? 1 : 0,
      cz: [s.azul.coroas, s.vermelho.coroas], el: [+s.azul.elixir.toFixed(2), +s.vermelho.elixir.toFixed(2), s.dupla ? +s.azul2.elixir.toFixed(2) : 0],
      fila: (s.dupla ? s.azul2 : s.vermelho).fila.slice(0, 5), d2: s.dupla ? 1 : 0,
      filas: s.dupla ? Object.fromEntries(['azul2', 'vermelho', 'vermelho2'].filter((l) => s.jogadores && s.jogadores[l]).map((l) => [l, s[l].fila.slice(0, 5)])) : undefined,
      els: s.dupla ? Object.fromEntries(LADOS.map((l) => [l, +s[l].elixir.toFixed(2)])) : undefined,
      tm: Object.fromEntries(s.ent.filter((e) => e.torre).map((e) => [e.id, e.max])),
      tw: Object.fromEntries(s.ent.filter((e) => e.torre).map((e) => [e.id, Math.round(e.vida)])),
      tr: s.ent.filter((e) => !e.torre).map((e) => [e.id, e.carta.id, e.time === 'azul' ? 0 : 1, Math.round(e.x * 10) / 10, Math.round(e.y * 10) / 10,
        Math.round(e.vida), e.max, e.nivel, (e.surgir > 0 ? 1 : 0) | (e.furia > 0 ? 2 : 0) | (e.golpesFortes > 0 ? 4 : 0) | (e.fenix > 0 ? 8 : 0) | (e.congelado > 0 ? 16 : 0) | (e.esquiva > 0 ? 32 : 0) | (e.atord > 0 ? 64 : 0) | (e.lento > 0 ? 128 : 0) | (e.queima > 0 ? 256 : 0) | (e.escudo > 0 ? 512 : 0) | (e.fraco > 0 ? 1024 : 0) | ((e.adaptacao || 0) << 11) | (e.evo ? 131072 : 0) | (e.infinito > 0 ? 262144 : 0) | (e.canal > 0 ? 524288 : 0) | (e.trunfo > 0 ? 1048576 : 0) | (e.sombra > 0 ? 2097152 : 0) | (e.maldAte > s.t ? 4194304 : 0) | (e.aneis > 0 && e.aneisMax ? 8388608 : 0) | (e.semLimite ? 16777216 : 0) | (e.esmeraldas > 0 ? 33554432 : 0) | (e.banido > 0 ? 67108864 : 0) | (e.espelho > 0 ? 134217728 : 0) | (e.raiva > 0 ? 268435456 : 0), e.recarga > 0 ? +e.recarga.toFixed(1) : 0, e.dono && e.dono.endsWith('2') ? 1 : 0]),
      pj: s.proj.map((p) => [Math.round(p.x), Math.round(p.y - (p.alt || 0)), p.time === 'azul' ? 0 : 1, p.el.classList.contains('de-torre') ? 1 : 0, p.sprite || 0, Math.round(p.giro || 0)]),
      ev: s.eventos,
    };
  }

  // ---------- X1: celular do convidado (só mostra o que o host calcula) ----------
  const espelhoTime = (n) => (n === 0 ? 'vermelho' : 'azul'); // azul do host = vermelho para o convidado
  const espelhoTorre = (id) => id.replace('esq', 'X').replace('dir', 'esq').replace('X', 'dir').replace('azul', 'Y').replace('vermelho', 'azul').replace('Y', 'vermelho');

  function iniciarConvidado({ fim, rede }) {
    ao_fim = fim;
    const dupla = rede.host.modo === '2v2';
    // 2v2 online: rede.meuLado = minha vaga do ponto de vista do host (azul2, vermelho ou vermelho2)
    const meuLado = dupla ? (rede.meuLado || 'azul2') : 'vermelho';
    const parceiroLado = { azul: 'azul2', azul2: 'azul', vermelho: 'vermelho2', vermelho2: 'vermelho' }[meuLado];
    s = {
      dupla, meuLado, parceiroLado, vira: !dupla || timeDe(meuLado) === 'vermelho',
      nomeParceiro: dupla ? (rede.nomeParceiro || rede.host.nome) : null,
      modo: 'x1c', convidado: true, rede, t: 0, prorrogacao: false, acabou: false, pausa: false,
      azul: { elixir: 5, fila: [], coroas: 0 }, vermelho: { elixir: 5, fila: [], coroas: 0 },
      ent: torres(Estado.minhasTorres(), rede.host.torres || Estado.minhasTorres()), proj: [], efeitos: [], agenda: [], selecionada: null, id: 0, mapa: new Map(), pjEls: [],
      arenaId: rede.host.arena || 'festival',
    };
    if (dupla) s.azul2 = { elixir: 5 };
    if (rede.ranque) s.ranque = rede.ranque;
    if (typeof AoVivo !== 'undefined') AoVivo.comecou({ modo: dupla ? '2v2' : 'x1', titulo: dupla ? '2v2' : `X1 contra ${rede.host.nome}`, sala: typeof X1 !== 'undefined' ? X1.codigo() : null, lado: meuLado, dupla: !!dupla });
    montar(rede.ranque ? `🏅 Ranqueada 2v2 · vs ${rede.ranque.rivais.map((b) => b.nome).join(' e ')}` : dupla ? `2v2 · ${rede.titulo || `com ${s.nomeParceiro}`}` : `X1 contra ${rede.host.nome}`);
  }

  // ---------- Assistindo a batalha de um amigo (só olha, não joga) ----------
  function iniciarEspectador({ info, nome, sair }) {
    if (s && !s.acabou) fechar();
    const dupla = !!info.dupla;
    const meuLado = info.lado || 'azul';
    const parceiroLado = { azul: 'azul2', azul2: 'azul', vermelho: 'vermelho2', vermelho2: 'vermelho' }[meuLado];
    s = {
      espectador: true, convidado: true, nomeAssistido: nome, sairEsp: sair,
      dupla, meuLado, parceiroLado, vira: timeDe(meuLado) === 'vermelho',
      modo: 'espectador', rede: { host: {} }, t: 0, prorrogacao: false, acabou: false, pausa: false,
      azul: { elixir: 5, fila: [], coroas: 0 }, vermelho: { elixir: 5, fila: [], coroas: 0 },
      ent: torres(Estado.minhasTorres(), Estado.minhasTorres()), proj: [], efeitos: [], agenda: [], selecionada: null, id: 0, mapa: new Map(), pjEls: [],
      arenaId: Arena.daQtd(Estado.d.recorde).id,
    };
    if (dupla) s.azul2 = { elixir: 5 };
    document.body.classList.add('espectando');
    montar(`👁 Assistindo ${nome}${info.titulo ? ` · ${info.titulo}` : ''}`);
    $('btn-sair').onclick = () => sairEspectador();
  }
  function sairEspectador() {
    if (!s || !s.espectador) return;
    const f = s.sairEsp;
    s.acabou = true;
    document.body.classList.remove('espectando');
    fechar();
    if (f) f();
    if (ao_esp) ao_esp();
  }
  let ao_esp = null;
  function espectadorFim(resultadoHost) {
    if (!s || !s.espectador || s.mostrouFim) return;
    s.mostrouFim = true;
    const inv = { vitoria: 'derrota', derrota: 'vitoria', empate: 'empate' };
    const res = resultadoHost ? (timeDe(s.meuLado) === 'vermelho' ? inv[resultadoHost] : resultadoHost) : null;
    const nome = s.nomeAssistido || 'Seu amigo';
    setTimeout(() => UI.modal({
      titulo: res === 'vitoria' ? `🎉 ${nome} venceu!` : res === 'derrota' ? `😢 ${nome} perdeu` : res === 'empate' ? '🤝 Empate!' : 'A batalha acabou',
      html: `<p class="ev-res">${s ? `${s.azul.coroas} 👑 x ${s.vermelho.coroas} 👑` : ''}</p>`,
      botoes: [{ texto: 'Voltar', classe: 'principal', acao: () => sairEspectador() }],
    }), 600);
  }

  function receberEstado(est) {
    if (!s || !s.convidado || s.acabou || !est) return;
    // quem está no time vermelho (x1 ou 2v2) vê a arena virada; quem está no time do host vê igual
    const D = s.dupla, V = s.vira;
    const mx = (x) => (V ? W - x : x), my = (y) => (V ? H - y : y);
    const mt = (n) => (V ? espelhoTime(n) : (n === 0 ? 'azul' : 'vermelho'));
    // lado do host -> lado na minha tela (eu sempre sou "azul")
    const paraMim = (l) => (l === s.meuLado ? 'azul' : l === s.parceiroLado ? 'azul2' : l.endsWith('2') ? 'vermelho2' : 'vermelho');
    s.t = est.t; s.prorrogacao = !!est.p;
    marcarTempo();
    if (V) { s.azul.coroas = est.cz[1]; s.vermelho.coroas = est.cz[0]; } else { s.azul.coroas = est.cz[0]; s.vermelho.coroas = est.cz[1]; }
    if (D && est.els) { s.azul.elixir = est.els[s.meuLado] || 0; s.azul2.elixir = est.els[s.parceiroLado] || 0; }
    else if (D) { s.azul.elixir = est.el[2] || 0; s.azul2.elixir = est.el[0]; }
    else { s.azul.elixir = est.el[1]; s.vermelho.elixir = est.el[0]; }
    const minhaFila = D && est.filas && est.filas[s.meuLado] ? est.filas[s.meuLado] : est.fila || [];
    const filaMudou = minhaFila.join() !== s.azul.fila.join();
    s.azul.fila = minhaFila;
    if (filaMudou) desenharMao();
    atualizarPlacar();

    // torres
    for (const t of s.ent.filter((e) => e.torre)) {
      const idHost = V ? espelhoTorre(t.id) : t.id;
      const v = est.tw ? est.tw[idHost] : undefined;
      if (v === undefined) { torreCaiuVisual(t); continue; }
      if (est.tm && est.tm[idHost] && !t.maxOk) { t.maxOk = true; t.max = est.tm[idHost]; t.vida = v; atualizarHp(t); t.el.querySelector('b').textContent = v; }
      if (v < t.vida) { t.vida = v; atualizarHp(t); t.el.querySelector('b').textContent = v; piscar(t.el, 'levou'); }
    }

    // tropas
    const vistas = new Set();
    for (const [hid, cartaId, timeN, hx, hy, vida, max, nivel, flags, recarga, segundo] of est.tr || []) {
      vistas.add(hid);
      let t = s.mapa.get(hid);
      const x = mx(hx), y = my(hy);
      if (!t) {
        const time = mt(timeN);
        t = criarTropa(time, Estado.carta(cartaId), x, y, 1, nivel, { evo: !!(flags & 131072) });
        // 2v2: descobre de quem é a tropa (eu, meu parceiro ou um rival)
        if (D) { t.dono = paraMim((timeN === 0 ? 'azul' : 'vermelho') + (segundo ? '2' : '')); if (t.dono === 'azul2') t.el.classList.add('parceiro'); }
        t.hid = hid; t.max = max; t.vida = vida;
        s.mapa.set(hid, t);
      }
      t.tx = x; t.ty = y;
      if (vida < t.vida) { piscar(t.el, 'levou'); numero(t, t.vida - vida); }
      t.vida = vida; t.max = max;
      atualizarHp(t);
      t.surgir = flags & 1 ? 1 : 0;
      t.el.classList.toggle('surgindo', !!(flags & 1));
      t.el.classList.toggle('aura-furia', !!(flags & 2));
      t.el.classList.toggle('aura-golpes', !!(flags & 4));
      t.el.classList.toggle('aura-fenix', !!(flags & 8));
      t.el.classList.toggle('congelada', !!(flags & 16));
      t.el.classList.toggle('aura-instinto', !!(flags & 32));
      t.el.classList.toggle('atordoada', !!(flags & 64));
      t.el.classList.toggle('lenta', !!(flags & 128));
      t.el.classList.toggle('queimando', !!(flags & 256));
      t.el.classList.toggle('com-escudo', !!(flags & 512));
      t.el.classList.toggle('enfraquecida', !!(flags & 1024));
      t.el.classList.toggle('com-infinito', !!(flags & 262144));
      t.el.classList.toggle('carregando-kame', !!(flags & 524288));
      t.el.classList.toggle('aura-trunfo', !!(flags & 1048576));
      t.el.classList.toggle('sombra', !!(flags & 2097152));
      t.el.classList.toggle('amaldicoada', !!(flags & 4194304));
      t.el.classList.toggle('super-forma', !!(flags & 8388608));
      t.el.classList.toggle('sem-limite', !!(flags & 16777216));
      t.el.classList.toggle('com-esmeraldas', !!(flags & 33554432));
      t.el.classList.toggle('banida', !!(flags & 67108864));
      t.el.classList.toggle('com-espelho', !!(flags & 134217728));
      t.el.classList.toggle('enfurecida', !!(flags & 268435456));
      const ad = (flags >> 11) & 63, selo = t.el.querySelector('.selo-adapt');
      if (selo && String(ad || '') !== selo.textContent) { selo.textContent = ad || ''; t.el.classList.toggle('adaptado', !!(t.carta.passiva && ad >= t.carta.passiva.max)); }
      t.recarga = recarga;
    }
    for (const [hid, t] of s.mapa) {
      if (vistas.has(hid)) continue;
      s.mapa.delete(hid);
      s.ent = s.ent.filter((e) => e !== t);
      t.el.classList.add('morrendo');
      efeito(`poof ${t.time}`, t.x, t.y, 500);
      particulas(t.x, t.y, t.time === 'azul' ? '#85B7EB' : '#F09595', 8, 26);
      setTimeout(() => t.el.remove(), 400);
    }

    // projéteis (redesenhados a cada foto)
    s.pjEls.forEach((el) => el.remove());
    s.pjEls = (est.pj || []).map(([px, py, timeN, deTorre, sprite, giro]) => {
      const el = document.createElement('div');
      el.className = `projetil ${mt(timeN)}${deTorre ? ' de-torre' : ''}${sprite ? ' com-sprite' : ''}`;
      Object.assign(el.style, pct(mx(px), my(py)));
      if (sprite) { el.style.backgroundImage = `url(${spriteUrl(sprite)})`; el.style.width = `${(16 / W) * 100}%`; el.style.transform = `translate(-50%, -50%) rotate(${(giro || 0) + (V ? 180 : 0)}deg)`; }
      s.arena.appendChild(el);
      return el;
    });

    // efeitos
    for (const ev of est.ev || []) {
      if (ev[0] === 'f') {
        const c = Estado.carta(ev[1]); const x = mx(ev[2]), y = my(ev[3]);
        const largura = { width: `${((c.area * 2) / W) * 100}%` };
        efeito(`mira-feitico ${mt(ev[4])}`, x, y, 650, largura);
        if (c.id === 'lanterna') efeito('lanterna-caindo', x, y, 460);
        setTimeout(() => { if (!s || s.acabou) return; efeito(`feitico ${c.id}`, x, y, 700, largura); particulas(x, y, c.id === 'lanterna' ? '#FAC775' : '#F4C0D1', 12, c.area); if (c.id === 'lanterna') tremer(); }, 450);
      } else if (ev[0] === 'b') {
        efeito('barril-quebra', mx(ev[1]), my(ev[2]), 500);
      } else if (ev[0] === 'k') {
        const x = mx(ev[1]), y = my(ev[2]), ang = ev[3] + (V ? Math.PI : 0), tipo = ev[4] || 0;
        desenharRaio(x, y, ang, tipo, [320, 360, 420][tipo] || 320, tipo ? ev[5] : 0);
        setTimeout(() => tremer(true), 300);
      } else if (ev[0] === 'q') {
        tremer(true);
      } else if (ev[0] === 'c') {
        cutin(CUTINS[ev[1]] || 'goku_furia');
      } else if (ev[0] === 'd') {
        dominioVisual(mx(ev[1]), my(ev[2]), mt(ev[3]));
      } else if (ev[0] === 'a') {
        efeito(`ativou ${mt(ev[3])}`, mx(ev[1]), my(ev[2]), 700);      } else if (ev[0] === 'g') {
        efeito('gelo', mx(ev[1]), my(ev[2]), 1000);
        particulas(mx(ev[1]), my(ev[2]), '#DDF3FF', 16, 55);
      } else if (ev[0] === 'h') {
        const c = Estado.carta(ev[5]);
        if (c) { const v = Ataques.de(c).v; efeitoGolpe(v.g || 'soco', { x: mx(ev[1]), y: my(ev[2]) }, { x: mx(ev[3]), y: my(ev[4]) }, v); }
      } else if (ev[0] === 'x') {
        efeitoGolpe('impacto', { x: mx(ev[1]), y: my(ev[2]) }, { x: mx(ev[1]), y: my(ev[2]) }, { cor: ev[4], grande: ev[3] });
      } else if (ev[0] === 'r') {
        const el = fxEl('fx-raio-ceu', mx(ev[1]), my(ev[2]), 380);
        if (el) el.style.backgroundImage = `url(${spriteUrl('raio')})`;
      } else if (ev[0] === 'e') {
        const lt = paraMim(ev[1]);
        if (s.espectador || lt !== 'azul') mostrarEmote(lt, ev[2]);
      } else if (ev[0] === 'w') {
        if (ev[1] > 0) { s.tempoParadoAte = s.t + ev[1]; fxEl('fx-tempo-parado', mx(ev[2]), my(ev[3]), 1000); tremer(true); }
        else s.aceleraTempo = { ate: s.t - ev[1] };
        marcarTempo();
      } else if (ev[0] === 'j') {
        const [cl, ms] = FX_J[ev[1]] || FX_J[0];
        if (cl !== 'fx-arquivo') fxEl(cl, mx(ev[2]), my(ev[3]), ms);
      } else if (ev[0] === 'v') {
        fxEl(ev[1] ? 'fx-mano' : 'fx-bracos', mx(ev[2]), my(ev[3]), ev[1] ? 1150 : 620);
      } else if (ev[0] === 'n') {
        voarSprite('marmita', { x: mx(ev[1]), y: my(ev[2]) }, { x: mx(ev[3]), y: my(ev[4]) }, 0.35, 15, { arco: 22 });
      } else if (ev[0] === 'y') {
        fxEl('fx-borboletas', mx(ev[1]), my(ev[2]), 900);
      } else if (ev[0] === 'z') {
        falar({ x: mx(ev[1]), y: my(ev[2]) }, ev[3], ev[4], false);
      } else if (ev[0] === 't') {
        efeito('teleporte', mx(ev[1]), my(ev[2]), 450);
      }
    }

    // fim (resultado do ponto de vista do host)
    if (est.fim && s.espectador) { espectadorFim(est.fim.resultado); return; }
    if (est.fim) {
      s.acabou = true;
      const inv = { vitoria: 'derrota', derrota: 'vitoria', empate: 'empate' };
      const dados = D ? { resultado: (V ? inv[est.fim.resultado] : est.fim.resultado) || 'empate', coroas: s.azul.coroas, coroasInimigo: s.vermelho.coroas, modo: '2v2', ranque: s.ranque || null, deck: Estado.d.deck.slice(0, 8), deckParceiro: s.rede.deckParceiro || s.rede.host.deck, nomeParceiro: s.nomeParceiro, duracao: Math.round(s.t) }
        : { resultado: inv[est.fim.resultado] || 'empate', coroas: est.cz[1], coroasInimigo: est.cz[0], modo: 'x1', deck: Estado.d.deck.slice(0, 8), deckRival: s.rede.host.deck, nomeRival: s.rede.host.nome, duracao: Math.round(s.t) };
      setTimeout(() => ao_fim && ao_fim(dados), 900);
    }
  }

  // anima as tropas suavemente entre uma foto e outra
  function assistir(agora) {
    const dt = Math.min(0.05, (agora - s.ultimo) / 1000);
    s.ultimo = agora;
    for (const t of s.ent) {
      if (t.torre || t.tx === undefined) continue;
      const k = Math.min(1, dt * 10);
      t.x += (t.tx - t.x) * k; t.y += (t.ty - t.y) * k;
      if (t.recarga > 0) t.recarga -= dt;
      posicionar(t);
    }
    hud();
    s.habTimer = (s.habTimer || 0) - dt;
    if (s.habTimer <= 0) { s.habTimer = 0.2; desenharHabilidades(); }
  }

  // jogada do convidado (vem com as coordenadas da tela dele, que é espelhada)
  function comandoRemoto(cmd) {
    if (!s || s.acabou || !s.rede) return;
    const D = s.dupla;
    const quem = D ? (cmd.lado && s.jogadores && s.jogadores[cmd.lado] ? cmd.lado : 'azul2') : 'vermelho', time = timeDe(quem);
    // a vaga tinha virado IA (a internet dele caiu), mas ele continua jogando: devolve o controle
    if (D && s.ias.includes(quem)) {
      s.ias = s.ias.filter((l) => l !== quem);
      const nome = (s.nomes && s.nomes[quem]) || 'Seu parceiro';
      if (quem === 'azul2' && s.nomeParceiro) s.nomeParceiro = s.nomeParceiro.replace(/ \(IA\)$/, '');
      UI.toast(`${nome} voltou! 🎮`);
    }
    const vira = time === 'vermelho'; // quem joga do time vermelho vê a arena virada
    const x = vira ? W - cmd.x : cmd.x, y = vira ? H - cmd.y : cmd.y;
    if (cmd.tipo === 'emote') { emote(quem, cmd.id); return; }
    if (cmd.tipo === 'carta') {
      const id = s[quem].fila[cmd.i];
      if (!id || cmd.i > 3) return;
      const c = Estado.carta(id);
      if (c.custo > s[quem].elixir) return;
      if (!c.feitico && !c.barril && !podeColocar(time, x, y)) return;
      jogar(quem, cmd.i, x, y);
    } else if (cmd.tipo === 'hab') {
      const t = s.ent.find((e) => e.id === cmd.id && (e.dono || e.time) === quem);
      if (t) ativarHabilidade(t);
    }
  }

  function adversarioSaiu(quem = 'azul2') {
    if (!s || s.acabou) return;
    if (s.dupla && !s.convidado) {
      // alguém saiu: a IA assume as cartas dele
      if (s.ias.includes(quem)) return;
      s.ias.push(quem);
      const nome = (s.nomes && s.nomes[quem]) || s.nomeParceiro || 'Um jogador';
      UI.toast(`${nome} saiu. A IA assumiu as cartas! 🤖`);
      if (quem === 'azul2' && !/ \(IA\)$/.test(s.nomeParceiro || '')) s.nomeParceiro = `${s.nomeParceiro} (IA)`;
      return;
    }
    UI.toast(s.dupla ? 'Seu parceiro saiu da partida!' : 'Seu adversário saiu da partida!');
    s.forcar = s.dupla ? 'empate' : 'vitoria';
    terminar();
  }

  function loop(agora) {
    if (!s || s.acabou) return;
    if (s.convidado) { assistir(agora); requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (agora - s.ultimo) / 1000);
    s.ultimo = agora;
    if (!s.pausa) for (let i = 0; i < VEL * Mod.vel(); i++) {
      if (s.acabou) break;
      try { passo(dt); } catch (e) { console.error('Erro na batalha (o jogo continua):', e); }
    }
    if (s.rede && !s.acabou && (s.snapTimer -= dt) <= 0) { s.snapTimer = 0.1; s.rede.enviarEstado(foto()); s.eventos = []; }
    else if (!s.rede && s.aoVivo && !s.acabou && (s.vivoTimer = (s.vivoTimer || 0) - dt) <= 0) { s.vivoTimer = 0.2; AoVivo.publicar(foto()); s.eventos = []; }
    if (s && !s.acabou) desenhar();
    requestAnimationFrame(loop);
  }

  // desenha tudo uma vez por quadro (a simulação pode rodar várias vezes por quadro)
  function desenhar() {
    for (const e of s.ent) if (!e.torre && e.el) posicionar(e);
    for (const p of s.proj) if (p.mudou) { p.el.style.transform = tr(p.x, p.y - (p.alt || 0), p.giro ? `translate(-50%, -50%) rotate(${p.giro.toFixed(0)}deg)` : 'translate(-50%, -50%)'); p.mudou = false; }
    hud();
  }

  // relógio e elixir: só mexe na tela quando o valor muda
  function hud() {
    const limite = DURACAO + (s.prorrogacao ? PRORROGACAO : 0);
    const resta = Math.max(0, limite - s.t);
    const txt = `${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}`;
    if (!s.hudEl) s.hudEl = { tempo: document.querySelector('.tempo') };
    if (txt !== s.hudTxt) { s.hudTxt = txt; s.hudEl.tempo.textContent = txt; s.hudEl.tempo.classList.toggle('dobro', s.modo === 'elixir2x' || !!s.prorrogacao || resta <= 60); }
    const el = Math.round(s.azul.elixir * 50) / 50;
    if (el !== s.hudElixir) { s.hudElixir = el; atualizarElixir(); }
    if (s.chipP && s.azul2) {
      const ep = Math.floor(s.azul2.elixir);
      if (ep !== s.hudParc) { s.hudParc = ep; s.chipP.querySelector('em').textContent = ep; }
      if (s.nomeParceiro !== s.chipNome) { s.chipNome = s.nomeParceiro; s.chipP.querySelector('b').textContent = s.nomeParceiro || 'Parceiro'; }
    }
  }

  function passo(dt) {
    s.t += dt;
    const limite = DURACAO + (s.prorrogacao ? PRORROGACAO : 0);
    const resta = Math.max(0, limite - s.t);
    const dobro = s.modo === 'elixir2x' || s.prorrogacao || resta <= 60;
    const ganho = (dt / ELIXIR_SEG) * (dobro ? 2 : 1) * (s.elixirMult || 1);
    if (typeof Som !== 'undefined' && !s.tutorial) Som.musica(resta <= 60 ? 'final' : 'batalha');
    const acel = s.aceleraTempo && s.t < s.aceleraTempo.ate ? s.aceleraTempo.dono : null; // Made in Heaven
    for (const quem of LADOS) if (s[quem]) s[quem].elixir = Math.min(10, s[quem].elixir + ganho * (quem === acel ? 1.7 : 1));
    marcarTempo();
    if (Mod.flag('elixirInfinito')) s.azul.elixir = 10;

    if (resta <= 0) {
      if (!s.prorrogacao && s.azul.coroas === s.vermelho.coroas) {
        s.prorrogacao = true;
        UI.toast('Prorrogação! Quem derrubar uma torre vence');
      } else return terminar();
    }

    if (s.adaptativa && !s.superIA && (s.adaptaTimer = (s.adaptaTimer ?? 12) - dt) <= 0) { s.adaptaTimer = 12; adaptarIA(); }
    mitaOlhando(dt);
    for (const quem of s.ias) ia(dt, quem);

    // habilidades: recarga e duração dos efeitos
    for (const t of s.ent) {
      if (t.torre || !t.habilidade) continue;
      if (t.recarga > 0) t.recarga -= dt;
      if (t.furia > 0 && (t.furia -= dt) <= 0) t.el.classList.remove('aura-furia');
      if (t.fenix > 0 && (t.fenix -= dt) <= 0) t.el.classList.remove('aura-fenix');
      if (t.trunfo > 0 && (t.trunfo -= dt) <= 0) t.el.classList.remove('aura-trunfo');
      if (t.esquiva > 0 && (t.esquiva -= dt) <= 0) t.el.classList.remove('aura-instinto');
    }
    s.habTimer -= dt;
    if (s.habTimer <= 0) { s.habTimer = 0.2; desenharHabilidades(); }
    rodarAgenda();
    s.auraTimer = (s.auraTimer || 0) - dt;
    if (s.auraTimer <= 0) { s.auraTimer = 0.5; auras(); }
    for (const tw of s.ent) if (tw.torre && tw.queima > 0) queimar(tw, dt);

    // tropas
    for (const t of s.ent) {
      if (t.torre || t.vida <= 0) continue;
      if (t.surgir > 0) { t.surgir -= dt; if (t.surgir <= 0) t.el.classList.remove('surgindo'); continue; }
      if (t.carta.passiva && t.carta.passiva.tipo === 'adaptar') adaptar(t, dt);
      atualizarStatus(t, dt);
      if (t.vida <= 0) continue;
      if (t.congelado > 0) { if ((t.congelado -= dt) <= 0) t.el.classList.remove('congelada'); continue; }
      if (t.atord > 0) { if ((t.atord -= dt) <= 0) t.el.classList.remove('atordoada', 'presa', 'parada-tempo'); continue; }
      const mm = t.atk && t.atk.m;
      if (mm && mm.gojo && t.infinito < t.infMax && (t.infTimer += dt) >= 6) { t.infTimer = 0; t.infinito++; t.el.classList.add('com-infinito'); }
      if (mm && (mm.furiaNamek || mm.pulosKame || mm.atravessar)) checarFuria(t, dt);
      if (t.rotInf) rodarRotacao(t, dt);
      if (s.aceleraTempo && s.t < s.aceleraTempo.ate && t.time === s.aceleraTempo.time && !(t.acelerado > 0)) { t.acelerado = s.aceleraTempo.ate - s.t; t.el.classList.add('acelerada'); }
      if (mm && mm.mitaGentil) mitaGentilPassiva(t);
      if (mm && mm.marmita) ninoPassiva(t, dt);
      if (mm && mm.murasame) murasamePassiva(t, dt);
      if (mm && (mm.superForma || mm.spinDash || mm.inibidores || mm.hyperFlash || mm.duelista || mm.raivaSombria)) passivasSonic(t, dt);
      if (t.temporario > 0 && (t.temporario -= dt) <= 0) { ferir(t, t.vida + 1, t.time === 'azul' ? 'vermelho' : 'azul', null, { atravessa: true, semEsquiva: true }); continue; }
      if (mm && mm.hana) robinDefesa(t, dt);
      if (t.vida <= 0) continue;
      if (t.intocavel > 0) t.intocavel -= dt;
      if (t.canal > 0) { if ((t.canal -= dt) <= 0 && mm && mm.furiaNamek) soltarFuria(t); continue; } // carregando / pulando / atravessando
      // olha em volta 4x por segundo: troca de alvo se o atual está fora do alcance
      // ou se alguém está batendo nela enquanto ela bate numa torre
      t.olhar = (t.olhar || Math.random() * 0.25) - dt;
      if (!t.alvo || t.alvo.vida <= 0 || !s.ent.includes(t.alvo)) { t.alvo = escolherAlvo(t); t.olhar = 0.25; }
      else if (t.olhar <= 0) {
        t.olhar = 0.25;
        const novo = escolherAlvo(t);
        if (novo && novo !== t.alvo) {
          const noAlcance = dist(t, t.alvo) <= t.alcance + t.alvo.raio + t.raio + 2;
          const meBatendo = !novo.torre && novo.alvo === t && dist(t, novo) <= t.alcance + novo.raio + t.raio + 2;
          if (!noAlcance || (t.alvo.torre && meBatendo)) t.alvo = novo;
        }
      }
      t.cd -= dt;
      if (t.teleCd > 0) t.teleCd -= dt;
      if (!t.alvo) continue;
      const alcance = t.alcance + t.alvo.raio + t.raio;
      const d0 = dist(t, t.alvo);
      if (d0 <= alcance) {
        if (t.correndo) { t.correndo = false; t.el.classList.remove('arrancada'); }
        if (t.cd <= 0) { atacar(t, t.alvo); t.cd = t.cadencia * cadenciaMult(t); }
        else if (t.alcance > 40) recuar(t, dt);
      } else {
        // Goku: teletransporte quando o alvo está longe
        const mt = t.atk && t.atk.m;
        if (mt && mt.teleporte && t.teleCd <= 0 && d0 > alcance + 45 && d0 < 230) { t.teleCd = mt.teleporte; teleportar(t, t.alvo); continue; }
        moverPara(t, t.alvo, dt);
      }
    }
    // afasta tropas grudadas
    const tropas = s.ent.filter((e) => !e.torre);
    for (let i = 0; i < tropas.length; i++) {
      for (let j = i + 1; j < tropas.length; j++) {
        const a = tropas[i], b = tropas[j];
        const d0 = dist(a, b), min = a.raio + b.raio;
        if (d0 < min) {
          // empurra cada uma metade da sobreposição (a conta usa a distância de ANTES de mover;
          // antes usava a posição já mexida e às vezes arremessava a tropa pra fora da arena)
          let ux, uy;
          if (d0 > 0.01) { const k = (min - d0) / 2 / d0; ux = (b.x - a.x) * k; uy = (b.y - a.y) * k; }
          else { const ang = ((a.id * 7 + b.id * 13) % 360) * (Math.PI / 180); ux = Math.cos(ang) * min / 2; uy = Math.sin(ang) * min / 2; }
          a.x -= ux; a.y -= uy; b.x += ux; b.y += uy;
          for (const e of [a, b]) { e.x = Math.max(10, Math.min(W - 10, e.x)); e.y = Math.max(10, Math.min(H - 10, e.y)); }
        }
      }
    }
    tropas.forEach(evitarTorres);

    // torres
    for (const t of s.ent) {
      if (!t.torre || !t.ativa) continue;
      t.cd -= dt;
      if (t.cd > 0) continue;
      const alvo = s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && e.surgir <= 0 && dist(e, t) <= t.alcance + e.raio) // igual ao Clash: alcance até a borda da tropa
        .sort((a, b) => dist(a, t) - dist(b, t))[0];
      if (alvo) { atacar(t, alvo); t.cd = t.cadencia; }
    }

    // projéteis
    for (const p of [...s.proj]) {
      const passo = (p.vel || 300) * dt;
      if (p.giroVel) p.giro = (p.giro + p.giroVel * dt) % 360;
      // projétil que atravessa: segue reto e acerta todo mundo no caminho
      if (p.perfura) {
        p.x += p.dx * passo; p.y += p.dy * passo; p.resta -= passo;
        if (p.mira) p.giro = Math.atan2(p.dy, p.dx) * 180 / Math.PI;
        for (const e of s.ent) {
          if (e.time === p.time || e.vida <= 0 || p.atingidos.has(e) || dist(e, p) > e.raio + 6) continue;
          p.atingidos.add(e);
          const dd = e === p.alvo || !p.fonte ? p.dano : Math.round(p.dano * multClasse(p.fonte, e) / Math.max(0.01, multClasse(p.fonte, p.alvo)));
          ferir(e, dd, p.time, p.fonte, { crit: p.crit });
          if (p.fonte && !p.fonte.torre) aplicarGolpe(p.fonte, e, dd);
          if (e.torre) { p.resta = 0; break; }
        }
        p.mudou = true;
        if (p.resta <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) { p.el.remove(); s.proj = s.proj.filter((x) => x !== p); }
        continue;
      }
      const dx = p.alvo.x - p.x, dy = p.alvo.y - p.y, d0 = Math.hypot(dx, dy);
      if (d0 <= passo || p.alvo.vida <= 0) {
        if (p.alvo.vida > 0) acertarProjetil(p, p.alvo);
        p.el.remove();
        s.proj = s.proj.filter((x) => x !== p);
        continue;
      }
      p.x += (dx / d0) * passo;
      p.y += (dy / d0) * passo;
      if (p.mira) p.giro = Math.atan2(dy, dx) * 180 / Math.PI;
      if (p.arco) { const t0 = 1 - d0 / p.total; p.alt = Math.sin(Math.max(0, Math.min(1, t0)) * Math.PI) * p.arco; }
      p.mudou = true;
    }

    // efeitos de feitiço
    for (const f of [...s.efeitos]) {
      f.vida -= dt;
      if (f.vida <= 0) { f.el.remove(); s.efeitos = s.efeitos.filter((x) => x !== f); }
    }
  }

  // velocidade de ataque: fúria, Punho Gentil, berserk e aura da Hatsune
  function cadenciaMult(t) {
    let k = t.furia > 0 ? 0.8 : 1;
    if (s.turbo) k *= 0.7;
    if (t.acelerado > 0) k *= 0.67;
    if (t.trunfo > 0) k *= 0.6;
    if (t.semLimite) k *= 0.8;
    if (t.lentoAtq > 0) k *= 1 + t.lentoAtqPct;
    const m = t.atk && t.atk.m;
    if (m && m.berserk) k *= 1 - m.berserk * (1 - t.vida / t.max);
    if (t.buffVel > 0) k *= 1 - t.buffVel;
    return k;
  }

  function atualizarStatus(t, dt) {
    if (t.lento > 0 && (t.lento -= dt) <= 0) t.el.classList.remove('lenta');
    if (t.lentoAtq > 0 && (t.lentoAtq -= dt) <= 0) t.el.classList.remove('chakra');
    if (t.fraco > 0 && (t.fraco -= dt) <= 0) t.el.classList.remove('enfraquecida');
    if (t.marcado > 0 && (t.marcado -= dt) <= 0) t.el.classList.remove('marcada');
    if (t.buffDano > 0 && (t.buffDano -= dt) <= 0) t.el.classList.remove('bem-alimentada');
    if (t.acelerado > 0 && (t.acelerado -= dt) <= 0) t.el.classList.remove('acelerada');
    if (t.maldAte && t.maldAte <= s.t) { t.maldAte = 0; t.el.classList.remove('amaldicoada'); }
    queimar(t, dt);
  }
  // veneno / fogo: dano aos poucos (aplicado a cada meio segundo)
  function queimar(t, dt) {
    if (!(t.queima > 0)) return;
    t.queima -= dt;
    t.queimaAcum += t.queimaDps * dt;
    if (t.queimaAcum >= t.queimaDps * 0.5 || t.queima <= 0) {
      const d0 = Math.round(t.queimaAcum);
      t.queimaAcum = 0;
      if (d0 > 0) ferir(t, d0, t.queimaFonte, null, { semEsquiva: true, semContra: true, tipo: 'queimadura' });
    }
    if (t.queima <= 0 && t.el) t.el.classList.remove('queimando', 'envenenada');
  }
  // aura de velocidade (Hatsune Miku), recalculada a cada meio segundo
  function auras() {
    const tropas = s.ent.filter((e) => !e.torre && e.vida > 0);
    for (const t of tropas) t.buffVel = 0;
    for (const f of tropas) {
      const a = f.atk && f.atk.m && f.atk.m.auraVel;
      if (!a) continue;
      for (const t of tropas) if (t !== f && t.time === f.time && dist(t, f) < a[0]) t.buffVel = Math.max(t.buffVel, a[1]);
    }
    for (const t of tropas) if (t.el) t.el.classList.toggle('com-aura', t.buffVel > 0);
  }

  // efeito de tela do tempo parado / acelerado
  function marcarTempo() {
    const jan = document.querySelector('.arena-grande-janela');
    if (!jan) return;
    jan.classList.toggle('tempo-parado', s.t < (s.tempoParadoAte || 0));
    jan.classList.toggle('tempo-acelerado', !!(s.aceleraTempo && s.t < s.aceleraTempo.ate));
  }
  // Durante a partida: se o jogador está apanhando muito, a IA alivia; se está atropelando, ela aperta.
  function adaptarIA() {
    const vida = (time) => { const ts = s.ent.filter((e) => e.torre && e.time === time); return ts.reduce((a, t) => a + t.vida / t.max, 0) / 3; };
    const vant = (vida('azul') - vida('vermelho')) + (s.azul.coroas - s.vermelho.coroas) * 0.3;
    s.difAjuste = vant < -0.35 ? -1 : vant > 0.35 ? 1 : 0;
  }

  // ---------- Fim ----------
  function vidaMinima(time) {
    const ts = s.ent.filter((e) => e.torre && e.time === time);
    return ts.length ? Math.min(...ts.map((t) => t.vida / t.max)) : 0;
  }

  function terminar(desistiu = false) {
    if (s.acabou) return;
    s.acabou = true;
    let resultado;
    if (s.forcar) resultado = s.forcar;
    else if (desistiu) resultado = 'derrota';
    else if (s.azul.coroas !== s.vermelho.coroas) resultado = s.azul.coroas > s.vermelho.coroas ? 'vitoria' : 'derrota';
    else {
      const a = vidaMinima('azul'), v = vidaMinima('vermelho');
      resultado = Math.abs(a - v) < 0.01 ? 'empate' : a > v ? 'vitoria' : 'derrota';
    }
    const dados = { resultado, coroas: s.azul.coroas, coroasInimigo: s.vermelho.coroas, modo: s.modo, ranque: s.ranque || null,
      deck: s.azul.deck, deckRival: s.vermelho.deck, deckParceiro: s.azul2 && s.azul2.deck, deckRival2: s.vermelho2 && s.vermelho2.deck,
      nomeRival: s.rede && s.rede.convidado ? s.rede.convidado.nome : null, nomeParceiro: s.nomeParceiro || null, duracao: Math.round(s.t), evento: s.evento || null, tutorial: s.tutorial ? true : undefined };
    if (typeof Som !== 'undefined') { Som.musica(null); Som.tocar(resultado === 'vitoria' ? 'vitoria' : 'derrota'); }
    if (s.adaptativa) Estado.ajustarHabilidade(resultado, s.superIA, s.azul.coroas - s.vermelho.coroas);
    if (typeof AoVivo !== 'undefined') AoVivo.terminou(foto(), resultado);
    if (s.rede && s.rede.fim) { s.rede.enviarEstado({ ...foto(), fim: { resultado } }); s.rede.fim(dados, desistiu); }
    setTimeout(() => ao_fim && ao_fim(dados), 900);
  }

  function desistir() {
    if (!s || s.acabou) { fechar(); return; }
    if (s.convidado) {
      UI.modal({ titulo: s.dupla ? 'Sair do 2v2?' : 'Sair do x1?', html: s.dupla ? '<p>Se sair, a IA assume suas cartas e conta como derrota pra você.</p>' : '<p>Se sair, seu amigo vence.</p>', botoes: [
        { texto: 'Continuar', classe: 'secundario' },
        { texto: 'Sair', classe: 'perigo', acao: () => { s.rede.sair(); s.acabou = true; ao_fim && ao_fim({ resultado: 'derrota', coroas: s.azul.coroas, coroasInimigo: 3, modo: s.dupla ? '2v2' : 'x1' }); } },
      ] });
      return;
    }
    s.pausa = true;
    UI.modal({
      titulo: 'Sair da batalha?',
      html: '<p>Se sair agora, a batalha conta como derrota.</p>',
      botoes: [
        { texto: 'Continuar', classe: 'secundario', acao: () => { s.pausa = false; s.ultimo = performance.now(); } },
        { texto: 'Sair', classe: 'perigo', acao: () => { s.pausa = false; s.azul.coroas = 0; terminar(true); } },
      ],
    });
  }

  function fechar() {
    $('batalha').classList.add('oculto');
    document.body.classList.remove('em-batalha', 'espectando');
    if (typeof Som !== 'undefined') Som.musica('menu');
    if (s) s.acabou = true;
    s = null;
  }

  function vencerAgora() {
    if (!s || s.acabou) return false;
    s.azul.coroas = 3;
    atualizarPlacar();
    terminar();
    return true;
  }

  // _teste: usado só pelos testes automáticos de balanceamento
  return { iniciar, iniciarConvidado, iniciarEspectador, espectadorFim, sairEspectador, aoSairEspectador: (f) => (ao_esp = f), receberEstado, comandoRemoto, adversarioSaiu, fechar, vencerAgora, _estado: () => s, _teste: { jogar, criarTropa } };
})();
