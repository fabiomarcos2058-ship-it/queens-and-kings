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
  const pct = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  // ---------- Montagem ----------
  function torres() {
    const t = (id, time, tipo, x, y) => ({
      id, time, tipo, x, y, torre: true, raio: tipo === 'rei' ? 26 : 20,
      vida: tipo === 'rei' ? 2400 : 1400, max: tipo === 'rei' ? 2400 : 1400,
      alcance: tipo === 'rei' ? 125 : 120, dano: tipo === 'rei' ? 80 : 62, cadencia: tipo === 'rei' ? 1 : 0.8,
      cd: 0, ativa: tipo !== 'rei',
    });
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
    return { elixir: 5, fila, coroas: 0 };
  }

  function iniciar({ modo = 'normal', fim } = {}) {
    ao_fim = fim;
    const deck = Estado.d.deck;
    // o computador só usa cartas já liberadas para o seu número de troféus
    const deckIA = embaralhar(Mod.deckApelao() || Estado.disponiveis().map((c) => c.id)).slice(0, 8);
    s = {
      modo, t: 0, prorrogacao: false, acabou: false, pausa: false,
      azul: lado(deck), vermelho: lado(deckIA),
      ent: torres(), proj: [], efeitos: [], selecionada: null, iaTimer: 2, id: 0,
      nivelIA: Math.max(1, Math.min(9, Math.round(deck.reduce((a, id) => a + Estado.d.colecao[id].nivel, 0) / deck.length))),
    };
    const arena = $('arena-grande');
    Arena.render(arena);
    s.arena = arena;
    // barras de vida das torres
    for (const t of s.ent) {
      t.el = document.createElement('div');
      t.el.className = `vida-torre ${t.time} ${t.tipo}`;
      Object.assign(t.el.style, pct(t.x, t.y + (t.tipo === 'rei' ? 40 : 34)));
      t.el.innerHTML = `<span class="hp-icone">${t.tipo === 'rei' ? '👑' : '🏰'}</span>${barraHp()}<b>${t.vida}</b>`;
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
    $('btn-sair').onclick = desistir;
    document.querySelector('.selo-previa').textContent = modo === 'elixir2x' ? 'Evento: elixir em dobro' : 'Batalha';
    desenharMao();
    $('batalha').classList.remove('oculto');
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
      return `<div class="slot-mao${caro}${sel}" data-i="${i}">${Cartas.html(c, { mini: true })}</div>`;
    }).join('');
    const prox = a.fila[4] ? Estado.carta(a.fila[4]) : null;
    document.querySelector('.proxima').innerHTML = `<small>Próxima</small>${prox ? `<div class="mini-prox">${Cartas.html(prox, { mini: true })}</div>` : '<div class="carta-vazia mini">?</div>'}`;
    $('mao').querySelectorAll('.slot-mao').forEach((el) => {
      el.onpointerdown = (ev) => comecarArrastar(ev, +el.dataset.i, el);
    });
  }

  function atualizarElixir() {
    const e = s.azul.elixir;
    document.querySelectorAll('#barra-elixir span').forEach((sp, i) => {
      sp.className = i < Math.floor(e) ? 'cheio' : i < e ? 'enchendo' : '';
      if (i === Math.floor(e)) sp.style.setProperty('--p', `${(e % 1) * 100}%`);
    });
    document.querySelector('.gota').dataset.n = Math.floor(e);
    $('mao').querySelectorAll('.slot-mao').forEach((el) => {
      const c = Estado.carta(s.azul.fila[+el.dataset.i]);
      el.classList.toggle('caro', c.custo > e);
    });
  }

  // Arrastar a carta até a arena (ou tocar na carta e depois na arena)
  function comecarArrastar(ev, i, el) {
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
    jogar('azul', s.selecionada, x, y);
    s.selecionada = null;
    s.zona.classList.remove('ativa');
    desenharMao();
  }

  function jogar(time, indice, x, y) {
    const L = s[time];
    const id = L.fila[indice];
    const c = Estado.carta(id);
    L.elixir -= c.custo;
    L.fila.splice(indice, 1);
    L.fila.push(id);
    const nivel = time === 'azul' ? Estado.d.colecao[id].nivel : s.nivelIA;
    const f = Math.pow(1.1, nivel - 1) * (time === 'azul' && Mod.flag('danoX5') ? 5 : 1);
    if (c.feitico) {
      lancarFeitico(time, c, x, y, Math.round(c.dano * f));
    } else if (c.barril) {
      lancarBarril(time, c, x, y, f, nivel);
    } else {
      criarTropa(time, c, x, y, f, nivel);
    }
  }

  // ---------- Barras de vida e efeitos ----------
  const barraHp = () => '<div class="hp"><i class="hp-rastro" style="width:100%"></i><i class="hp-fill" style="width:100%"></i><i class="hp-brilho"></i></div>';

  function atualizarHp(e) {
    const p = Math.max(0, e.vida / e.max);
    const hp = e.el.querySelector('.hp');
    hp.querySelector('.hp-fill').style.width = `${p * 100}%`;
    hp.querySelector('.hp-rastro').style.width = `${p * 100}%`;
    hp.classList.toggle('media', p < 0.5 && p >= 0.25);
    hp.classList.toggle('baixa', p < 0.25);
    e.el.classList.toggle('ferido', p < 1);
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
    for (let i = 0; i < qtd; i++) {
      const a = (i / qtd) * Math.PI * 2 + Math.random() * 0.5;
      const d = forca * (0.6 + Math.random() * 0.6);
      efeito('particula', x, y, 600, { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 8}px`, background: cor });
    }
  }

  function tremer(forte = false) {
    s.arena.classList.remove('tremendo', 'tremendo-forte');
    void s.arena.offsetWidth;
    s.arena.classList.add(forte ? 'tremendo-forte' : 'tremendo');
  }

  // ---------- Entidades ----------
  function criarTropa(time, c, x, y, f, nivel) {
    const t = {
      id: ++s.id, time, carta: c, x, y, raio: 13,
      vida: Math.round(c.vida * f), max: Math.round(c.vida * f), dano: Math.round(c.dano * f),
      alcance: c.alcance, vel: c.velocidade, cadencia: c.cadencia, cd: 0.6, area: c.area || 0,
      alvoTipo: c.alvo || 'tudo', surgir: 1, alvo: null,
      habilidade: c.habilidade || null, recarga: 0, golpesFortes: 0, furia: 0, fenix: 0, nivel, f,
    };
    if (c.token) t.raio = 8;
    t.el = document.createElement('div');
    t.el.className = `tropa ${time} surgindo${c.token ? ' mini' : ''}${c.habilidade ? ' campea' : ''}`;
    t.el.innerHTML = `${barraHp()}
      <div class="tropa-corpo"><div class="tropa-medalhao"><img src="assets/cartas/${c.id}_medalhao.png" alt="" /><b>${nivel}</b></div></div><div class="tropa-sombra"></div>`;
    s.arena.appendChild(t.el);
    s.ent.push(t);
    posicionar(t);
    efeito(`onda-surgir ${time}`, x, y, 700);
    setTimeout(() => { if (s && !s.acabou) { efeito(`onda-pouso ${time}`, t.x, t.y, 500); particulas(t.x, t.y + 4, '#ffffffcc', 6, 18); } }, 650);
  }

  // barril voa da torre do rei, quebra e solta as minis
  function lancarBarril(time, c, x, y, f, nivel) {
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
        criarTropa(time, mini, x + Math.cos(a) * 12, y + Math.sin(a) * 10, f, nivel);
      }
    }, 750);
  }

  function lancarFeitico(time, c, x, y, dano) {
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
    Object.assign(e.el.style, pct(e.x, e.y));
    e.el.style.zIndex = 5 + Math.round(e.y);
  }

  function ferir(e, dano, deTime) {
    if (e.vida <= 0) return;
    if (e.torre && e.time === 'azul' && Mod.flag('torresInvenciveis')) return;
    e.vida -= dano;
    numero(e, dano);
    atualizarHp(e);
    e.el.classList.remove('levou');
    void e.el.offsetWidth;
    e.el.classList.add('levou');
    if (e.torre) {
      if (e.tipo === 'rei') e.ativa = true;
      e.el.querySelector('b').textContent = Math.max(0, Math.round(e.vida));
      const img = s.arena.querySelector(`[data-torre="${e.id}"]`);
      if (img) { img.classList.remove('torre-levou'); void img.offsetWidth; img.classList.add('torre-levou'); }
      if (e.vida <= 0) destruirTorre(e, deTime);
    } else if (e.vida <= 0 && e.fenix > 0) {
      e.fenix = 0;
      e.vida = Math.round(e.max * 0.5);
      atualizarHp(e);
      e.el.classList.remove('aura-fenix');
      efeito('renascer', e.x, e.y, 900);
      particulas(e.x, e.y, '#FAC775', 14, 34);
    } else if (e.vida <= 0) {
      e.el.classList.add('morrendo');
      const el = e.el;
      efeito(`poof ${e.time}`, e.x, e.y, 500);
      particulas(e.x, e.y, e.time === 'azul' ? '#85B7EB' : '#F09595', 10, 30);
      setTimeout(() => el.remove(), 400);
      s.ent = s.ent.filter((x) => x !== e);
    }
  }

  function numero(e, dano) {
    const n = document.createElement('div');
    n.className = `dano-num${dano >= 250 ? ' grande' : ''}`;
    n.textContent = dano;
    Object.assign(n.style, pct(e.x + (Math.random() * 16 - 8), e.y - 22));
    s.arena.appendChild(n);
    setTimeout(() => n.remove(), 650);
  }

  function destruirTorre(t, deTime) {
    t.vida = 0;
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
    setTimeout(() => { el.remove(); const c = placar(vencedor); if (c) { c.classList.remove('pulou'); void c.offsetWidth; c.classList.add('pulou'); } }, 950);
  }

  function atualizarPlacar() {
    document.querySelector('.coroa.vermelha').textContent = s.vermelho.coroas;
    document.querySelector('.coroa.azul').textContent = s.azul.coroas;
  }

  // ---------- Habilidades especiais (gastam elixir) ----------
  function ativarHabilidade(t) {
    const h = t.habilidade;
    const L = s[t.time];
    if (!h || t.vida <= 0 || t.recarga > 0 || L.elixir < h.custo || t.surgir > 0) return false;
    L.elixir -= h.custo;
    t.recarga = h.recarga || 10;
    efeito(`ativou ${t.time}`, t.x, t.y, 700);
    if (h.tipo === 'golpes') { t.golpesFortes = 3; t.el.classList.add('aura-golpes'); }
    if (h.tipo === 'furia') { t.furia = h.duracao || 6; t.el.classList.add('aura-furia'); }
    if (h.tipo === 'fenix') { t.fenix = h.duracao || 10; t.el.classList.add('aura-fenix'); }
    if (h.tipo === 'cura') {
      t.vida = Math.min(t.max, t.vida + Math.round(t.max * 0.5));
      atualizarHp(t);
      particulas(t.x, t.y, '#97C459', 12, 26);
      efeito('cura', t.x, t.y, 800);
    }
    if (h.tipo === 'kamehameha') kamehameha(t, Math.round((h.dano || 1500) * (t.f || 1)));
    if (t.time === 'azul') UI.toast(`⚡ ${h.nome}!`);
    return true;
  }

  function kamehameha(t, dano) {
    // mira no alvo atual ou na torre inimiga mais próxima
    const alvo = (t.alvo && t.alvo.vida > 0 && t.alvo) || s.ent.filter((e) => e.time !== t.time && e.vida > 0).sort((a, b) => dist(a, t) - dist(b, t))[0];
    if (!alvo) return;
    const ang = Math.atan2(alvo.y - t.y, alvo.x - t.x);
    const comp = 320, larg = 34;
    const fx = Math.cos(ang), fy = Math.sin(ang);
    const raio = document.createElement('div');
    raio.className = 'kamehameha';
    Object.assign(raio.style, pct(t.x, t.y), { width: `${(comp / W) * 100}%`, transform: `translate(0, -50%) rotate(${ang}rad)` });
    s.arena.appendChild(raio);
    efeito('kame-carga', t.x, t.y, 600);
    setTimeout(() => raio.remove(), 900);
    setTimeout(() => {
      if (!s || s.acabou) return;
      tremer(true);
      for (const e of [...s.ent]) {
        if (e.time === t.time || e.vida <= 0) continue;
        const rx = e.x - t.x, ry = e.y - t.y;
        const ao = rx * fx + ry * fy;            // distância ao longo do raio
        const lado = Math.abs(rx * fy - ry * fx); // distância para o lado
        if (ao >= -10 && ao <= comp && lado <= larg / 2 + e.raio) ferir(e, e.torre ? Math.round(dano * 0.5) : dano, t.time);
      }
    }, 300);
  }

  function desenharHabilidades() {
    const caixa = document.getElementById('habilidades');
    if (!caixa) return;
    const minhas = s.ent.filter((e) => !e.torre && e.time === 'azul' && e.habilidade && e.vida > 0);
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
    const inimigos = s.ent.filter((e) => e.time !== t.time && e.vida > 0 && (t.alvoTipo === 'tudo' || e.torre));
    let melhor = null, md = Infinity;
    for (const e of inimigos) {
      const d0 = dist(t, e);
      const visao = e.torre ? Infinity : 140;
      if (d0 > visao) continue;
      // tropas próximas têm prioridade sobre torres distantes
      const peso = e.torre ? d0 + 60 : d0;
      if (peso < md) { md = peso; melhor = e; }
    }
    return melhor;
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
    if (meuLado !== ladoAlvo || (t.y > RIO_TOPO - 4 && t.y < RIO_BASE + 4)) {
      const bx = PONTES.reduce((a, b) => (Math.abs(b - t.x) < Math.abs(a - t.x) ? b : a));
      if (Math.abs(t.x - bx) > 6 && t.y > RIO_TOPO - 22 && t.y < RIO_BASE + 22) { px = bx; py = t.y; }
      else if (Math.abs(t.x - bx) > 6) { px = bx; py = meuLado === 'baixo' ? RIO_BASE + 14 : RIO_TOPO - 14; }
      else { px = bx; py = ladoAlvo === 'cima' ? RIO_TOPO - 16 : RIO_BASE + 16; }
    }
    const dx = px - t.x, dy = py - t.y, d0 = Math.hypot(dx, dy) || 1;
    const passo = Math.min(d0, t.vel * (t.furia > 0 ? 1.4 : 1) * dt);
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

  function danoDe(a) {
    if (a.torre) return a.dano;
    let d0 = a.dano;
    if (a.furia > 0) d0 *= 1.6;
    if (a.golpesFortes > 0) { d0 *= 3; a.golpesFortes--; if (!a.golpesFortes) a.el.classList.remove('aura-golpes'); }
    return Math.round(d0);
  }

  function atacar(atacante, alvo) {
    if (atacante.alcance > 40 || atacante.torre) {
      if (!atacante.torre) { atacante.el.classList.remove('atirando'); void atacante.el.offsetWidth; atacante.el.classList.add('atirando'); }
      const p = document.createElement('div');
      p.className = `projetil ${atacante.time}${atacante.torre ? ' de-torre' : ''}`;
      s.arena.appendChild(p);
      s.proj.push({ x: atacante.x, y: atacante.y - 14, alvo, dano: danoDe(atacante), area: atacante.area || 0, time: atacante.time, el: p });
    } else {
      const dx = alvo.x - atacante.x, dy = alvo.y - atacante.y, d0 = Math.hypot(dx, dy) || 1;
      atacante.el.style.setProperty('--lx', `${(dx / d0) * 9}px`);
      atacante.el.style.setProperty('--ly', `${(dy / d0) * 9}px`);
      atacante.el.classList.remove('atacando');
      void atacante.el.offsetWidth;
      atacante.el.classList.add('atacando');
      ferir(alvo, danoDe(atacante), atacante.time);
      const golpe = document.createElement('div');
      golpe.className = 'golpe';
      Object.assign(golpe.style, pct((atacante.x + alvo.x) / 2, (atacante.y + alvo.y) / 2));
      s.arena.appendChild(golpe);
      setTimeout(() => golpe.remove(), 250);
    }
  }

  // ---------- Oponente (computador) ----------
  // Estratégia: finaliza torres com feitiço, defende com a carta certa no lugar certo,
  // não desperdiça elixir, monta ataques com tanque na frente e apoio atrás e ataca a torre mais fraca.
  const ehTanque = (c) => !c.feitico && (c.vida >= 1000 || c.alvo === 'construcoes');
  const dps = (c) => (c.dano || 0) / (c.cadencia || 1);
  const valor = (e) => e.vida + e.dano * 3;

  function iaJogar(m, x, y) {
    if (!podeColocar('vermelho', x, y) && !m.c.feitico && !m.c.barril) {
      // procura um lugar válido perto do pedido
      for (let k = 0; k < 6 && !podeColocar('vermelho', x, y); k++) y -= 20;
      if (!podeColocar('vermelho', x, y)) return false;
    }
    jogar('vermelho', m.i, Math.max(28, Math.min(W - 28, x)), y);
    s.iaTimer = 0.6 + Math.random() * 0.4;
    return true;
  }

  function ia(dt) {
    if (Mod.flag('iaParada')) return;
    const L = s.vermelho;
    s.iaTimer -= dt;
    if (s.iaTimer > 0) return;
    s.iaTimer = 0.3 + Math.random() * 0.4; // reage rápido

    // usa habilidades das campeãs na hora certa
    for (const t of s.ent.filter((e) => !e.torre && e.time === 'vermelho' && e.habilidade && e.recarga <= 0 && e.surgir <= 0)) {
      const h = t.habilidade;
      if (L.elixir < h.custo) continue;
      const pertoAlvo = t.alvo && t.alvo.vida > 0 && dist(t, t.alvo) < t.alcance + 60;
      const usar = (h.tipo === 'cura' && t.vida < t.max * 0.4)
        || (h.tipo === 'fenix' && t.vida < t.max * 0.35)
        || ((h.tipo === 'golpes' || h.tipo === 'furia') && pertoAlvo)
        || (h.tipo === 'kamehameha' && t.alvo && dist(t, t.alvo) < 220);
      if (usar && ativarHabilidade(t)) return;
    }

    const mao = L.fila.slice(0, 4).map((id, i) => ({ i, c: Estado.carta(id) }));
    const pode = mao.filter((m) => m.c.custo <= L.elixir);
    const nivel = Math.pow(1.1, s.nivelIA - 1);
    const torresAzuis = s.ent.filter((e) => e.torre && e.time === 'azul');
    const inimigos = s.ent.filter((e) => !e.torre && e.time === 'azul' && e.vida > 0);
    const resta = DURACAO + (s.prorrogacao ? PRORROGACAO : 0) - s.t;
    const dobro = s.modo === 'elixir2x' || s.prorrogacao || resta <= 60;

    // 1) Finaliza torre com feitiço
    for (const m of pode.filter((x) => x.c.feitico)) {
      const danoTorre = Math.round(m.c.dano * nivel * 0.35);
      const t = torresAzuis.find((x) => x.vida <= danoTorre);
      if (t) return iaJogar(m, t.x, t.y);
    }

    // 2) Defesa: ameaças do meu lado do rio (ou chegando na ponte)
    const ameacas = inimigos.filter((e) => e.y < RIO_BASE + 40);
    if (ameacas.length) {
      const alvo = ameacas.reduce((a, b) => (valor(b) > valor(a) ? b : a));
      const grupo = ameacas.filter((e) => dist(e, alvo) < 60);
      const cx = grupo.reduce((a, e) => a + e.x, 0) / grupo.length;
      const cy = grupo.reduce((a, e) => a + e.y, 0) / grupo.length;

      // feitiço quando pega vários, ou mata um atirador/tropa cara
      const f = pode.filter((m) => m.c.feitico).sort((a, b) => b.c.dano - a.c.dano)[0];
      if (f) {
        const danoF = f.c.dano * nivel;
        const pega = ameacas.filter((e) => Math.hypot(e.x - cx, e.y - cy) <= f.c.area + e.raio);
        const mata = pega.filter((e) => e.vida <= danoF).length;
        if (pega.length >= 2 || mata >= 1 && pega.some((e) => e.alcance > 40 || e.max > 700)) {
          return iaJogar(f, cx, cy - 8); // mira um pouco à frente (as tropas andam pra cima)
        }
      }

      // escolhe a melhor tropa para defender
      const tropas = pode.filter((m) => !m.c.feitico);
      if (tropas.length) {
        const tanqueInimigo = alvo.alvoTipo === 'construcoes' || alvo.max >= 1000;
        const pontua = (m) => {
          const c = m.c;
          let p = dps(c) * 2;
          if (grupo.length >= 2 && c.area) p += 160;
          if (tanqueInimigo && !c.area) p += dps(c) * 1.5; // muito dano num alvo só
          if (c.alcance > 40) p += 60; // atirador defende atrás da torre
          if (c.alvo === 'construcoes') p -= 400; // tanque que só bate em torre não defende
          p -= c.custo * 25;
          return p;
        };
        const m = tropas.sort((a, b) => pontua(b) - pontua(a))[0];
        if (pontua(m) > -200) {
          const lado = alvo.x < W / 2 ? 90 : 270;
          if (m.c.alcance > 40) return iaJogar(m, lado + (alvo.x < lado ? -14 : 14), 74); // atrás da torre
          // corpo a corpo: na frente da ameaça, perto da torre para ela ajudar
          const y = Math.max(140, Math.min(RIO_TOPO - 12, alvo.y - 40));
          return iaJogar(m, alvo.x + (Math.random() * 16 - 8), y);
        }
      }
      if (L.elixir < 9.5) return; // guarda elixir para defender
    }

    // 3) Apoio: se tenho um tanque atacando, coloca ajuda atrás dele
    const meuTanque = s.ent.find((e) => !e.torre && e.time === 'vermelho' && e.max >= 1000 && e.y > 110 && e.y < RIO_BASE + 60);
    if (meuTanque && L.elixir >= 3) {
      const apoio = pode.filter((m) => !m.c.feitico && !ehTanque(m.c)).sort((a, b) => dps(b.c) - dps(a.c))[0];
      if (apoio) return iaJogar(apoio, meuTanque.x + (Math.random() * 20 - 10), Math.max(60, meuTanque.y - 34));
    }

    // 4) Ataque: só quando vale a pena (elixir quase cheio ou o jogador gastou tudo)
    const limite = dobro ? 7.5 : 9.2;
    const oportunidade = s.azul.elixir < 3 && L.elixir >= 6;
    if (L.elixir < limite && !oportunidade) return;

    // ataca a torre mais fraca (ou a que já caiu, pelo bolso)
    const vida = (id) => { const t = s.ent.find((e) => e.id === id); return t ? t.vida : -1; };
    const ve = vida('esq-azul'), vd = vida('dir-azul');
    const lado = ve < 0 ? 0 : vd < 0 ? 1 : ve <= vd ? 0 : 1;
    const x = PONTES[lado];
    const bolso = !torreViva(lado ? 'dir-azul' : 'esq-azul');

    // barril: joga direto na torre mais fraca
    const barril = pode.find((m) => m.c.barril);
    if (barril && Math.random() < 0.5) {
      const alvoT = s.ent.find((e) => e.id === (lado ? 'dir-azul' : 'esq-azul')) || s.ent.find((e) => e.id === 'rei-azul');
      if (alvoT) return iaJogar(barril, alvoT.x, alvoT.y - 30);
    }
    const tropas = pode.filter((m) => !m.c.feitico && !m.c.barril);
    if (!tropas.length) return;
    const tanque = tropas.filter((m) => ehTanque(m.c)).sort((a, b) => b.c.vida - a.c.vida)[0];
    if (tanque) return iaJogar(tanque, x + (Math.random() * 16 - 8), bolso ? RIO_BASE + 30 : 70); // tanque lá atrás, junta elixir
    const rapida = tropas.sort((a, b) => b.c.velocidade - a.c.velocidade)[0];
    return iaJogar(rapida, x + (Math.random() * 16 - 8), bolso ? RIO_BASE + 30 : RIO_TOPO - 20); // pressão na ponte
  }

  // ---------- Loop principal ----------
  function loop(agora) {
    if (!s || s.acabou) return;
    const dt = Math.min(0.05, (agora - s.ultimo) / 1000);
    s.ultimo = agora;
    if (!s.pausa) for (let i = 0; i < VEL * Mod.vel(); i++) {
      if (s.acabou) break;
      try { passo(dt); } catch (e) { console.error('Erro na batalha (o jogo continua):', e); }
    }
    requestAnimationFrame(loop);
  }

  function passo(dt) {
    s.t += dt;
    const limite = DURACAO + (s.prorrogacao ? PRORROGACAO : 0);
    const resta = Math.max(0, limite - s.t);
    const dobro = s.modo === 'elixir2x' || s.prorrogacao || resta <= 60;
    const ganho = (dt / ELIXIR_SEG) * (dobro ? 2 : 1);
    for (const time of ['azul', 'vermelho']) s[time].elixir = Math.min(10, s[time].elixir + ganho);
    if (Mod.flag('elixirInfinito')) s.azul.elixir = 10;
    const tempoEl = document.querySelector('.tempo');
    tempoEl.textContent = `${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}`;
    tempoEl.classList.toggle('dobro', dobro);
    atualizarElixir();

    if (resta <= 0) {
      if (!s.prorrogacao && s.azul.coroas === s.vermelho.coroas) {
        s.prorrogacao = true;
        UI.toast('Prorrogação! Quem derrubar uma torre vence');
      } else return terminar();
    }

    ia(dt);

    // habilidades: recarga e duração dos efeitos
    for (const t of s.ent) {
      if (t.torre || !t.habilidade) continue;
      if (t.recarga > 0) t.recarga -= dt;
      if (t.furia > 0 && (t.furia -= dt) <= 0) t.el.classList.remove('aura-furia');
      if (t.fenix > 0 && (t.fenix -= dt) <= 0) t.el.classList.remove('aura-fenix');
    }
    s.habTimer -= dt;
    if (s.habTimer <= 0) { s.habTimer = 0.2; desenharHabilidades(); }

    // tropas
    for (const t of s.ent) {
      if (t.torre || t.vida <= 0) continue;
      if (t.surgir > 0) { t.surgir -= dt; if (t.surgir <= 0) t.el.classList.remove('surgindo'); continue; }
      if (!t.alvo || t.alvo.vida <= 0 || !s.ent.includes(t.alvo) || Math.random() < 0.02) t.alvo = escolherAlvo(t);
      t.cd -= dt;
      if (!t.alvo) continue;
      const alcance = t.alcance + t.alvo.raio + t.raio;
      if (dist(t, t.alvo) <= alcance) {
        if (t.cd <= 0) { atacar(t, t.alvo); t.cd = t.cadencia * (t.furia > 0 ? 0.65 : 1); }
      } else {
        moverPara(t, t.alvo, dt);
      }
    }
    // afasta tropas grudadas
    const tropas = s.ent.filter((e) => !e.torre);
    for (let i = 0; i < tropas.length; i++) {
      for (let j = i + 1; j < tropas.length; j++) {
        const a = tropas[i], b = tropas[j];
        const d0 = dist(a, b), min = a.raio + b.raio;
        if (d0 < min && d0 > 0.01) {
          const k = (min - d0) / 2 / d0;
          a.x -= (b.x - a.x) * k; a.y -= (b.y - a.y) * k;
          b.x += (b.x - a.x) * k; b.y += (b.y - a.y) * k;
        }
      }
    }
    tropas.forEach(evitarTorres);
    tropas.forEach(posicionar);

    // torres
    for (const t of s.ent) {
      if (!t.torre || !t.ativa) continue;
      t.cd -= dt;
      if (t.cd > 0) continue;
      const alvo = s.ent.filter((e) => !e.torre && e.time !== t.time && e.vida > 0 && e.surgir <= 0 && dist(e, t) <= t.alcance)
        .sort((a, b) => dist(a, t) - dist(b, t))[0];
      if (alvo) { atacar(t, alvo); t.cd = t.cadencia; }
    }

    // projéteis
    for (const p of [...s.proj]) {
      const dx = p.alvo.x - p.x, dy = p.alvo.y - p.y, d0 = Math.hypot(dx, dy);
      const passo = 300 * dt;
      if (d0 <= passo || p.alvo.vida <= 0) {
        if (p.alvo.vida > 0) {
          if (p.area) {
            for (const e of [...s.ent]) if (e.time !== p.time && dist(e, p.alvo) <= p.area + e.raio) ferir(e, p.dano, p.time);
            const ex = document.createElement('div');
            ex.className = `explosao ${p.time}`;
            Object.assign(ex.style, pct(p.alvo.x, p.alvo.y), { width: `${((p.area * 2) / W) * 100}%` });
            s.arena.appendChild(ex);
            setTimeout(() => ex.remove(), 400);
          } else ferir(p.alvo, p.dano, p.time);
        }
        p.el.remove();
        s.proj = s.proj.filter((x) => x !== p);
        continue;
      }
      p.x += (dx / d0) * passo;
      p.y += (dy / d0) * passo;
      Object.assign(p.el.style, pct(p.x, p.y));
    }

    // efeitos de feitiço
    for (const f of [...s.efeitos]) {
      f.vida -= dt;
      if (f.vida <= 0) { f.el.remove(); s.efeitos = s.efeitos.filter((x) => x !== f); }
    }
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
    if (desistiu) resultado = 'derrota';
    else if (s.azul.coroas !== s.vermelho.coroas) resultado = s.azul.coroas > s.vermelho.coroas ? 'vitoria' : 'derrota';
    else {
      const a = vidaMinima('azul'), v = vidaMinima('vermelho');
      resultado = Math.abs(a - v) < 0.01 ? 'empate' : a > v ? 'vitoria' : 'derrota';
    }
    const dados = { resultado, coroas: s.azul.coroas, coroasInimigo: s.vermelho.coroas, modo: s.modo };
    setTimeout(() => ao_fim && ao_fim(dados), 900);
  }

  function desistir() {
    if (!s || s.acabou) { fechar(); return; }
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

  return { iniciar, fechar, vencerAgora, _estado: () => s };
})();
