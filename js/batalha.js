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
    const deckIA = embaralhar(Estado.disponiveis().map((c) => c.id)).slice(0, 8);
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
    arena.appendChild(s.zona);
    arena.onpointerdown = tocarArena;
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
        fantasma.className = `fantasma ${c.feitico ? 'feitico-alvo' : ''}`;
        fantasma.innerHTML = c.feitico ? '' : `<img src="assets/cartas/${c.id}_medalhao.png" alt="" />`;
        if (c.feitico) fantasma.style.width = `${(c.area * 2 / W) * s.arena.getBoundingClientRect().width}px`;
        document.getElementById('app').appendChild(fantasma);
        s.selecionada = i;
        s.zona.classList.toggle('ativa', !c.feitico);
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
        s.zona.classList.toggle('ativa', s.selecionada !== null && !c.feitico);
        desenharMao();
      }
    };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', soltar);
  }

  function tocarArena(ev) {
    if (s.selecionada === null || s.acabou) return;
    const r = s.arena.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    const y = ((ev.clientY - r.top) / r.height) * H;
    const id = s.azul.fila[s.selecionada];
    const c = Estado.carta(id);
    if (!c.feitico && (y < RIO_BASE + 6 || y > H - 30 || x < 26 || x > W - 26)) {
      UI.toast('Coloque tropas no seu lado da arena');
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
    const f = Math.pow(1.1, nivel - 1);
    if (c.feitico) {
      lancarFeitico(time, c, x, y, Math.round(c.dano * f));
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
    };
    t.el = document.createElement('div');
    t.el.className = `tropa ${time} surgindo`;
    t.el.innerHTML = `${barraHp()}
      <div class="tropa-corpo"><div class="tropa-medalhao"><img src="assets/cartas/${c.id}_medalhao.png" alt="" /><b>${nivel}</b></div></div><div class="tropa-sombra"></div>`;
    s.arena.appendChild(t.el);
    s.ent.push(t);
    posicionar(t);
    efeito(`onda-surgir ${time}`, x, y, 700);
    setTimeout(() => { if (s && !s.acabou) { efeito(`onda-pouso ${time}`, t.x, t.y, 500); particulas(t.x, t.y + 4, '#ffffffcc', 6, 18); } }, 650);
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
    coroaVoando(t);
    s.ent = s.ent.filter((x) => x !== t);
    const vencedor = t.time === 'azul' ? 'vermelho' : 'azul';
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

  function coroaVoando(t) {
    const vencedor = t.time === 'azul' ? 'vermelho' : 'azul';
    const alvo = document.querySelector(`.coroa.${vencedor}`).getBoundingClientRect();
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
    setTimeout(() => { el.remove(); const c = document.querySelector(`.coroa.${vencedor}`); c.classList.remove('pulou'); void c.offsetWidth; c.classList.add('pulou'); }, 950);
  }

  function atualizarPlacar() {
    document.querySelector('.coroa.vermelha').textContent = s.vermelho.coroas;
    document.querySelector('.coroa.azul').textContent = s.azul.coroas;
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
    const passo = Math.min(d0, t.vel * dt);
    t.x += (dx / d0) * passo;
    t.y += (dy / d0) * passo;
  }

  function atacar(atacante, alvo) {
    if (atacante.alcance > 40 || atacante.torre) {
      if (!atacante.torre) { atacante.el.classList.remove('atirando'); void atacante.el.offsetWidth; atacante.el.classList.add('atirando'); }
      const p = document.createElement('div');
      p.className = `projetil ${atacante.time}${atacante.torre ? ' de-torre' : ''}`;
      s.arena.appendChild(p);
      s.proj.push({ x: atacante.x, y: atacante.y - 14, alvo, dano: atacante.dano, area: atacante.area || 0, time: atacante.time, el: p });
    } else {
      const dx = alvo.x - atacante.x, dy = alvo.y - atacante.y, d0 = Math.hypot(dx, dy) || 1;
      atacante.el.style.setProperty('--lx', `${(dx / d0) * 9}px`);
      atacante.el.style.setProperty('--ly', `${(dy / d0) * 9}px`);
      atacante.el.classList.remove('atacando');
      void atacante.el.offsetWidth;
      atacante.el.classList.add('atacando');
      ferir(alvo, atacante.dano, atacante.time);
      const golpe = document.createElement('div');
      golpe.className = 'golpe';
      Object.assign(golpe.style, pct((atacante.x + alvo.x) / 2, (atacante.y + alvo.y) / 2));
      s.arena.appendChild(golpe);
      setTimeout(() => golpe.remove(), 250);
    }
  }

  // ---------- Oponente (computador) ----------
  function ia(dt) {
    const L = s.vermelho;
    s.iaTimer -= dt;
    if (s.iaTimer > 0) return;
    s.iaTimer = 0.8 + Math.random() * 1.2;
    const mao = L.fila.slice(0, 4);
    const ameacas = s.ent.filter((e) => !e.torre && e.time === 'azul' && e.y < RIO_BASE + 40);
    const podeJogar = (i) => Estado.carta(mao[i]).custo <= L.elixir;

    if (ameacas.length) {
      // defende: feitiço em grupo ou tropa perto da ameaça
      const alvo = ameacas.reduce((a, b) => (a.y < b.y ? a : b));
      const vizinhos = ameacas.filter((e) => dist(e, alvo) < 50).length;
      const iF = mao.findIndex((id, i) => Estado.carta(id).feitico && podeJogar(i));
      if (iF >= 0 && (vizinhos >= 2 || alvo.vida > 600) && Math.random() < 0.7) return jogar('vermelho', iF, alvo.x, alvo.y - 10);
      const iT = mao.findIndex((id, i) => !Estado.carta(id).feitico && podeJogar(i));
      if (iT >= 0) return jogar('vermelho', iT, Math.max(30, Math.min(330, alvo.x + (Math.random() * 40 - 20))), Math.max(60, Math.min(RIO_TOPO - 10, alvo.y - 50)));
      return;
    }
    // ataca quando tem bastante elixir
    if (L.elixir >= 7 + Math.random() * 2.5) {
      const tropas = mao.map((id, i) => i).filter((i) => !Estado.carta(mao[i]).feitico && podeJogar(i));
      if (!tropas.length) return;
      const i = tropas[Math.floor(Math.random() * tropas.length)];
      const x = PONTES[Math.floor(Math.random() * 2)] + (Math.random() * 30 - 15);
      jogar('vermelho', i, x, 150 + Math.random() * 90);
    }
  }

  // ---------- Loop principal ----------
  function loop(agora) {
    if (!s || s.acabou) return;
    const dt = Math.min(0.05, (agora - s.ultimo) / 1000);
    s.ultimo = agora;
    if (!s.pausa) for (let i = 0; i < VEL; i++) { if (s.acabou) break; passo(dt); }
    requestAnimationFrame(loop);
  }

  function passo(dt) {
    s.t += dt;
    const limite = DURACAO + (s.prorrogacao ? PRORROGACAO : 0);
    const resta = Math.max(0, limite - s.t);
    const dobro = s.modo === 'elixir2x' || s.prorrogacao || resta <= 60;
    const ganho = (dt / ELIXIR_SEG) * (dobro ? 2 : 1);
    for (const time of ['azul', 'vermelho']) s[time].elixir = Math.min(10, s[time].elixir + ganho);
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

    // tropas
    for (const t of s.ent) {
      if (t.torre || t.vida <= 0) continue;
      if (t.surgir > 0) { t.surgir -= dt; if (t.surgir <= 0) t.el.classList.remove('surgindo'); continue; }
      if (!t.alvo || t.alvo.vida <= 0 || !s.ent.includes(t.alvo) || Math.random() < 0.02) t.alvo = escolherAlvo(t);
      t.cd -= dt;
      if (!t.alvo) continue;
      const alcance = t.alcance + t.alvo.raio + t.raio;
      if (dist(t, t.alvo) <= alcance) {
        if (t.cd <= 0) { atacar(t, t.alvo); t.cd = t.cadencia; }
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

  return { iniciar, fechar, _estado: () => s };
})();
