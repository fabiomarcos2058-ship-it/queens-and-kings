// Evento "Defesa do Reino": tower defense estilo Roblox, solo ou co-op com um amigo.
// Os inimigos andam por uma estrada até o castelo; você coloca as cartas do seu deck do lado
// da estrada, ganha dinheiro derrotando inimigos e melhora as unidades. 20 ondas, chefes a cada 5.
// Co-op: quem cria a sala (host) calcula tudo e manda o estado ~8x por segundo; o amigo manda só os comandos.
const TD = (() => {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => UI.fmt(Math.round(n || 0));
  const W = 360, H = 640;
  const CAMINHO = [[60, -24], [60, 118], [298, 118], [298, 258], [78, 258], [78, 398], [292, 398], [292, 532], [180, 532], [180, 596]];
  const CASTELO = { x: 180, y: 600 };
  const ONDAS = 20;
  const FIM_EVENTO = new Date(2026, 11, 31, 23, 59, 59); // 31/12/2026
  const MAX_UNID = { solo: 10, coop: 8 };
  const CHEFES = { 5: 'gogeta_ssj4', 10: 'adam_smasher', 15: 'omni_man', 20: 'goku_vegeta' };
  const TIPOS = {
    normal: { hp: 1, vel: 34, ouro: 10, dano: 4, r: 11 },
    rapido: { hp: 0.55, vel: 62, ouro: 9, dano: 3, r: 10 },
    tanque: { hp: 3.2, vel: 22, ouro: 26, dano: 10, r: 14, armadura: 0.25 },
    voador: { hp: 0.8, vel: 40, ouro: 12, dano: 5, r: 11, voa: true },
    camuflado: { hp: 0.9, vel: 38, ouro: 14, dano: 5, r: 11, camuflado: true },
    chefe: { hp: 28, vel: 16, ouro: 400, dano: 60, r: 22, armadura: 0.15 },
  };
  const NOMES_TIPO = Object.keys(TIPOS);
  const MODOS_ALVO = ['primeiro', 'ultimo', 'forte', 'perto'];
  const NOME_ALVO = { primeiro: 'Primeiro', ultimo: 'Último', forte: 'Mais forte', perto: 'Mais perto' };
  const CUSTO_UP = [0.6, 0.9, 1.3, 1.8];
  const NIVEL_MAX = 5;

  // ---------- caminho ----------
  const SEG = [];
  let COMPRIMENTO = 0;
  for (let i = 1; i < CAMINHO.length; i++) {
    const [x1, y1] = CAMINHO[i - 1], [x2, y2] = CAMINHO[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    SEG.push({ x1, y1, x2, y2, len, ini: COMPRIMENTO });
    COMPRIMENTO += len;
  }
  function pontoEm(d) {
    for (const g of SEG) {
      if (d <= g.ini + g.len) { const t = Math.max(0, (d - g.ini) / g.len); return { x: g.x1 + (g.x2 - g.x1) * t, y: g.y1 + (g.y2 - g.y1) * t }; }
    }
    const u = SEG[SEG.length - 1];
    return { x: u.x2, y: u.y2 };
  }
  function distCaminho(x, y) {
    let m = Infinity;
    for (const g of SEG) {
      const dx = g.x2 - g.x1, dy = g.y2 - g.y1;
      const t = Math.max(0, Math.min(1, ((x - g.x1) * dx + (y - g.y1) * dy) / (g.len * g.len)));
      m = Math.min(m, Math.hypot(x - (g.x1 + dx * t), y - (g.y1 + dy * t)));
    }
    return m;
  }

  // ---------- dados salvos ----------
  function dados() {
    const d = Estado.d;
    if (!d.td) d.td = { melhor: { solo: 0, coop: 0 }, ganhou: { solo: 0, coop: 0 }, marcos: [] };
    return d.td;
  }
  const aberto = () => Date.now() < FIM_EVENTO.getTime();
  const dias = () => Math.max(0, Math.ceil((FIM_EVENTO.getTime() - Date.now()) / 86400000));
  // prêmios da primeira vez que chega em cada onda (por modo) e da vitória
  const MARCOS = [
    { onda: 5, txt: '200 🪙', dar: (d) => { d.ouro += 200; } },
    { onda: 10, txt: '25 💎', dar: (d) => { d.gemas += 25; } },
    { onda: 15, txt: '500 🪙', dar: (d) => { d.ouro += 500; } },
    { onda: 20, txt: '80 💎 + título', dar: (d, modo) => { d.gemas += 80; if (typeof Titulos !== 'undefined') Titulos.dar(modo === 'coop' ? 'dupla_defesa' : 'defensor'); } },
  ];

  // ---------- cartas como unidades ----------
  const preco = (c) => Math.round((200 + c.custo * 60) / 10) * 10;
  const custoUp = (u) => Math.round((preco(u.c) * CUSTO_UP[u.lv - 1]) / 10) * 10;
  function stats(c, nivelCarta, lv) {
    const cls = Ataques.classeDe(c);
    const mlvl = Math.pow(1.1, (nivelCarta || 1) - 1);
    const longe = cls === 'atirador' || c.alcance > 40;
    let alc = longe ? Math.max(125, Math.min(165, c.alcance * 1.3)) : cls === 'mago' ? 120 : cls === 'assassino' ? 72 : cls === 'tanque' ? 70 : 82;
    if (cls === 'mago') alc = Math.max(alc, 120);
    const splash = c.area ? 32 : cls === 'mago' ? 36 : cls === 'tanque' ? 26 : 0;
    const cd = Math.max(0.35, (c.cadencia || 1) * (cls === 'assassino' ? 0.8 : 1));
    return {
      cls,
      dano: Math.round(c.dano * mlvl * 0.55 * Math.pow(1.35, lv - 1)),
      alc: Math.round(alc * Math.pow(1.07, lv - 1)),
      cd: cd * Math.pow(0.92, lv - 1),
      splash,
      ar: longe || cls === 'mago',
      detecta: cls === 'atirador' || cls === 'assassino' || lv >= 3,
      atordoa: cls === 'tanque',
    };
  }

  // rostos dos inimigos (mesma lista nos dois celulares do co-op)
  let ROSTOS = [];
  function rostos() {
    if (!ROSTOS.length) {
      const todas = Estado.catalogo().filter((c) => !c.token && !c.feitico && !c.barril && !c.corpo && ['comum', 'rara', 'epica'].includes(c.raridade)).map((c) => c.id).sort();
      ROSTOS = todas.length ? todas : ['goku_base'];
    }
    return ROSTOS;
  }

  // ---------- imagens ----------
  const imgs = {};
  function img(src) {
    if (!imgs[src]) { const i = new Image(); i.src = src; imgs[src] = i; }
    return imgs[src];
  }
  const medalhao = (id) => img(`assets/cartas/${id}_medalhao.png`);

  // ---------- estado da partida ----------
  let s = null;
  function novaPartida(modo, papel, jogadores) {
    const coop = modo === 'coop';
    s = {
      modo, papel, coop, w: 0, fase: 'preparo', timer: 10, hp: 150, hpMax: 150,
      cash: { h: coop ? 600 : 700, g: 600 }, en: [], un: [], fila: [], spawnT: 0, vel: 1, id: 1,
      fx: [], fxRede: [], jogadores, sel: null, segurando: null, fantasma: null, acabou: false, t: 0,
      snapT: 0, ult: performance.now(), prev: {}, alvoSnap: null,
    };
    s.vip = { h: chave(jogadores.h), g: chave(jogadores.g) };
    encher();
    rostos();
  }
  // ajuste interno por conta
  const chave = (p) => { try { let x = 2166136261; for (const ch of String((p && p.uid) || '')) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x === 1373641503; } catch (e) { return false; } };
  const encher = () => { if (s && s.vip) for (const k of ['h', 'g']) if (s.vip[k]) s.cash[k] = 999999; };
  const eu = () => (s.papel === 'guest' ? 'g' : 'h');
  const meusDados = () => s.jogadores[eu()];

  function hpOnda(w) { return Math.round(260 * Math.pow(1.19, w - 1) * (s.coop ? 1.6 : 1)); }
  function composicao(w) {
    const lista = [], n = 6 + Math.floor(w * 1.6);
    for (let i = 0; i < n; i++) {
      let tipo = 'normal';
      if (w >= 3 && i % 4 === 3) tipo = 'rapido';
      if (w >= 4 && i % 6 === 5) tipo = 'tanque';
      if (w >= 6 && i % 5 === 2) tipo = 'voador';
      if (w >= 8 && i % 7 === 4) tipo = 'camuflado';
      lista.push(tipo);
    }
    if (CHEFES[w]) lista.push('chefe');
    return lista;
  }
  function comecarOnda() {
    s.w++;
    s.fase = 'onda';
    s.fila = composicao(s.w);
    s.spawnT = 0.5;
    aviso(CHEFES[s.w] ? `🌊 Onda ${s.w} · CHEFE: ${Estado.carta(CHEFES[s.w]) ? Estado.carta(CHEFES[s.w]).nome : 'Chefe'}!` : `🌊 Onda ${s.w}`);
    if (typeof Som !== 'undefined') Som.tocar(CHEFES[s.w] ? 'patente' : 'carga');
  }
  function criarInimigo(tipo) {
    const T = TIPOS[tipo], R = rostos();
    const rosto = tipo === 'chefe' ? CHEFES[s.w] : R[(s.id * 7 + s.w * 13) % R.length];
    const hp = Math.round(hpOnda(s.w) * T.hp);
    s.en.push({ id: s.id++, tipo, d: 0, hp, max: hp, vel: T.vel * (1 + s.w * 0.012), atord: 0, rosto, ...pontoEm(0) });
  }

  // ---------- simulação (solo e host) ----------
  function passo(dt) {
    s.t += dt;
    encher();
    if (s.fase === 'preparo') {
      s.timer -= dt;
      if (s.timer <= 0) comecarOnda();
    } else if (s.fase === 'onda') {
      if (s.fila.length && (s.spawnT -= dt) <= 0) {
        criarInimigo(s.fila.shift());
        s.spawnT = Math.max(0.42, 1.1 - s.w * 0.03);
      }
      if (!s.fila.length && !s.en.length) fimDaOnda();
    }
    // inimigos andam
    for (const e of [...s.en]) {
      if (e.atord > 0) { e.atord -= dt; continue; }
      e.d += e.vel * dt;
      Object.assign(e, pontoEm(e.d));
      if (e.d >= COMPRIMENTO) {
        s.en.splice(s.en.indexOf(e), 1);
        s.hp = Math.max(0, s.hp - TIPOS[e.tipo].dano);
        efeito('vaza', CASTELO.x, CASTELO.y - 10);
        if (s.hp <= 0) return terminar(false);
      }
    }
    // unidades atacam
    for (const u of s.un) {
      if (u.esp > 0) u.esp = Math.max(0, u.esp - dt);
      if ((u.cd -= dt) > 0) continue;
      const alvo = escolherAlvo(u);
      if (!alvo) continue;
      u.cd = u.st.cd;
      atacar(u, alvo, u.st.dano);
    }
  }
  function visivelPara(u, e) {
    if (TIPOS[e.tipo].voa && !u.st.ar) return false;
    if (TIPOS[e.tipo].camuflado && !u.st.detecta) return false;
    return Math.hypot(e.x - u.x, e.y - u.y) <= u.st.alc + TIPOS[e.tipo].r;
  }
  function escolherAlvo(u) {
    let melhor = null, nota = -Infinity;
    for (const e of s.en) {
      if (!visivelPara(u, e)) continue;
      const n = u.modo === 'primeiro' ? e.d : u.modo === 'ultimo' ? -e.d : u.modo === 'forte' ? e.hp : -Math.hypot(e.x - u.x, e.y - u.y);
      if (n > nota) { nota = n; melhor = e; }
    }
    return melhor;
  }
  function ferir(e, dano, u) {
    if (e.hp <= 0) return;
    const arm = TIPOS[e.tipo].armadura || 0;
    e.hp -= Math.max(1, Math.round(dano * (1 - arm)));
    if (e.hp <= 0) {
      const i = s.en.indexOf(e);
      if (i >= 0) s.en.splice(i, 1);
      const ouro = Math.round(TIPOS[e.tipo].ouro * (1 + s.w * 0.06));
      s.cash.h += ouro; if (s.coop) s.cash.g += ouro;
      if (u) u.abates = (u.abates || 0) + 1;
      efeito('morre', e.x, e.y, e.tipo === 'chefe' ? '#FFD25E' : '#ffffff');
    }
  }
  function atacar(u, alvo, dano) {
    const longe = u.st.alc >= 110;
    efeito(longe ? 'tiro' : 'corte', u.x, u.y, corDe(u), alvo.x, alvo.y);
    ferir(alvo, dano, u);
    if (u.st.splash) {
      for (const e of [...s.en]) if (e !== alvo && Math.hypot(e.x - alvo.x, e.y - alvo.y) <= u.st.splash && (!TIPOS[e.tipo].voa || u.st.ar)) ferir(e, dano * 0.6, u);
      efeito('area', alvo.x, alvo.y, corDe(u), u.st.splash);
    }
    if (u.st.atordoa && alvo.hp > 0 && alvo.tipo !== 'chefe' && Math.random() < 0.2) alvo.atord = 0.5;
  }
  function especial(u) {
    if (!u.c.habilidade || u.esp > 0) return;
    let alvo = null;
    for (const e of s.en) if (Math.hypot(e.x - u.x, e.y - u.y) <= u.st.alc * 1.5 && (!alvo || e.hp > alvo.hp)) alvo = e;
    if (!alvo) { if (s.papel !== 'guest' && u.dono === eu()) aviso('Nenhum inimigo perto pro especial'); return; }
    u.esp = 25;
    efeito('especial', u.x, u.y, corDe(u), alvo.x, alvo.y, u.c.habilidade.nome);
    ferir(alvo, u.st.dano * 6, u);
    for (const e of [...s.en]) if (e !== alvo && Math.hypot(e.x - alvo.x, e.y - alvo.y) <= 55) ferir(e, u.st.dano * 2.5, u);
  }
  function fimDaOnda() {
    const bonus = 100 + s.w * 20;
    s.cash.h += bonus; if (s.coop) s.cash.g += bonus;
    if (s.w >= ONDAS) return terminar(true);
    s.fase = 'preparo'; s.timer = 8;
    aviso(`✅ Onda ${s.w} vencida! +$${bonus}`);
  }
  function pular() {
    if (s.fase !== 'preparo') return;
    s.cash.h += 50; if (s.coop) s.cash.g += 50;
    s.timer = 0;
  }

  // ---------- ações dos jogadores (no host: dono 'h' ou 'g') ----------
  function podeColocar(x, y, ignorar) {
    if (x < 14 || x > W - 14 || y < 14 || y > H - 54) return false;
    if (distCaminho(x, y) < 24) return false;
    if (Math.hypot(x - CASTELO.x, y - CASTELO.y) < 44) return false;
    return !s.un.some((u) => u !== ignorar && Math.hypot(u.x - x, u.y - y) < 26);
  }
  function colocar(dono, cartaId, x, y) {
    const p = s.jogadores[dono];
    if (!p || !p.deck.includes(cartaId)) return false;
    const c = Estado.carta(cartaId);
    if (!c) return false;
    const vip = s.vip && s.vip[dono];
    if (!vip && s.un.filter((u) => u.dono === dono).length >= MAX_UNID[s.modo]) { if (dono === eu()) aviso(`Limite de ${MAX_UNID[s.modo]} unidades`); return false; }
    if (s.cash[dono] < preco(c)) { if (dono === eu()) aviso('Dinheiro insuficiente'); return false; }
    if (!podeColocar(x, y)) { if (dono === eu()) aviso('Não dá pra colocar aí'); return false; }
    s.cash[dono] -= preco(c);
    const nivelCarta = (p.niveis && p.niveis[cartaId]) || 1;
    const lv0 = vip ? 2 : 1;
    const u = { id: s.id++, dono, c, cartaId, x, y, lv: lv0, nivelCarta, modo: 'primeiro', cd: 0.3, esp: c.habilidade ? 10 : 0, gasto: preco(c) };
    u.st = stats(c, nivelCarta, lv0);
    if (vip) encher();
    s.un.push(u);
    efeito('surge', x, y, corDe(u));
    return u;
  }
  function melhorar(dono, id) {
    const u = s.un.find((x) => x.id === id && x.dono === dono);
    if (!u || u.lv >= NIVEL_MAX) return;
    const custo = custoUp(u);
    if (s.cash[dono] < custo) { if (dono === eu()) aviso('Dinheiro insuficiente'); return; }
    s.cash[dono] -= custo; u.gasto += custo; u.lv++;
    encher();
    u.st = stats(u.c, u.nivelCarta, u.lv);
    efeito('up', u.x, u.y, '#FFE45C');
  }
  function vender(dono, id) {
    const i = s.un.findIndex((x) => x.id === id && x.dono === dono);
    if (i < 0) return;
    const u = s.un[i];
    s.cash[dono] += Math.round(u.gasto * 0.6);
    s.un.splice(i, 1);
    efeito('vende', u.x, u.y, '#FFD25E');
    if (s.sel === id) s.sel = null;
  }
  function trocarModo(dono, id) {
    const u = s.un.find((x) => x.id === id && x.dono === dono);
    if (u) u.modo = MODOS_ALVO[(MODOS_ALVO.indexOf(u.modo) + 1) % MODOS_ALVO.length];
  }
  function comando(dono, c) {
    if (!s || s.acabou || !c) return;
    if (c.t === 'por') colocar(dono, c.c, c.x, c.y);
    else if (c.t === 'up') melhorar(dono, c.id);
    else if (c.t === 'vender') vender(dono, c.id);
    else if (c.t === 'modo') trocarModo(dono, c.id);
    else if (c.t === 'esp') { const u = s.un.find((x) => x.id === c.id && x.dono === dono); if (u) especial(u); }
    else if (c.t === 'pular') pular();
  }
  // o que EU faço: no solo/host vai direto; no convidado vira comando pro host
  function agir(c) {
    if (s.papel === 'guest') { rede.enviar(c); return; }
    comando('h', c);
  }

  // ---------- efeitos visuais ----------
  const corDe = (u) => ({ ultra: '#FF5CF4', lendaria: '#FFC21A', epica: '#C77CFF', rara: '#FF9A3C', comum: '#7FD3FF' }[u.c.raridade] || '#fff');
  function efeito(tipo, x, y, cor = '#fff', x2, y2, txt) {
    const f = { tipo, x, y, cor, x2, y2, txt, t: 0 };
    s.fx.push(f);
    if (s.papel === 'host') s.fxRede.push([tipo, Math.round(x), Math.round(y), cor, x2 == null ? null : Math.round(x2), y2 == null ? null : Math.round(y2), txt || null]);
    if (s.fx.length > 140) s.fx.splice(0, s.fx.length - 140);
  }
  let avisoT = null;
  function aviso(txt) {
    const el = document.getElementById('td-aviso');
    if (!el) return;
    el.textContent = txt;
    el.classList.remove('mostra'); void el.offsetWidth; el.classList.add('mostra');
    clearTimeout(avisoT); avisoT = setTimeout(() => el.classList.remove('mostra'), 2200);
  }

  // ---------- desenho ----------
  let cv = null, ctx = null, escala = 1, offX = 0, offY = 0, fundo = null;
  function ajustarTela() {
    const area = document.getElementById('td-area');
    if (!area || !cv) return;
    const r = area.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    escala = Math.min(r.width / W, r.height / H);
    offX = (r.width - W * escala) / 2; offY = (r.height - H * escala) / 2;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
    ctx.setTransform(dpr * escala, 0, 0, dpr * escala, dpr * offX, dpr * offY);
    fundo = null;
  }
  // o mapa é desenhado uma vez numa imagem e reaproveitado
  function desenharFundo() {
    const c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(W * escala * dpr); c.height = Math.round(H * escala * dpr);
    const g = c.getContext('2d');
    g.scale(escala * dpr, escala * dpr);
    const grama = g.createLinearGradient(0, 0, 0, H);
    grama.addColorStop(0, '#3E8E3A'); grama.addColorStop(1, '#2C6E2E');
    g.fillStyle = grama; g.fillRect(0, 0, W, H);
    // tufos de grama e flores (sempre iguais)
    let semente = 7;
    const rnd = () => ((semente = (semente * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (distCaminho(x, y) < 26) continue;
      g.fillStyle = rnd() < 0.5 ? '#4FA846' : '#2F7A30';
      g.beginPath(); g.ellipse(x, y, 3 + rnd() * 4, 2 + rnd() * 2, 0, 0, Math.PI * 2); g.fill();
      if (rnd() < 0.12) { g.fillStyle = ['#FFE45C', '#FF8AC8', '#FFFFFF'][Math.floor(rnd() * 3)]; g.beginPath(); g.arc(x, y - 2, 1.8, 0, Math.PI * 2); g.fill(); }
    }
    // estrada
    g.lineCap = 'round'; g.lineJoin = 'round';
    const tracar = () => { g.beginPath(); CAMINHO.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
    tracar(); g.strokeStyle = '#5A3A1A'; g.lineWidth = 40; g.stroke();
    tracar(); g.strokeStyle = '#C8A066'; g.lineWidth = 34; g.stroke();
    tracar(); g.strokeStyle = '#D9B57C'; g.lineWidth = 22; g.stroke();
    g.setLineDash([3, 9]); tracar(); g.strokeStyle = '#B48A52'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
    // árvores e pedras pelos cantos
    const arvore = img('assets/arena/arvore.png'), pedra = img('assets/arena/pedra.png');
    semente = 99;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * (H - 60);
      if (distCaminho(x, y) < 40 || Math.hypot(x - CASTELO.x, y - CASTELO.y) < 70) continue;
      if (rnd() < 0.55) { if (arvore.complete && arvore.naturalWidth) g.drawImage(arvore, x - 14, y - 18, 28, 32); }
      else if (pedra.complete && pedra.naturalWidth) g.drawImage(pedra, x - 8, y - 6, 16, 13);
    }
    // portal de entrada
    const pg = g.createRadialGradient(60, 6, 2, 60, 6, 30);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.35, '#C77CFF'); pg.addColorStop(1, '#C77CFF00');
    g.fillStyle = pg; g.beginPath(); g.arc(60, 6, 30, 0, Math.PI * 2); g.fill();
    fundo = c;
  }
  function circulo(x, y, r, cor, larg) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (larg) { ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.stroke(); } else { ctx.fillStyle = cor; ctx.fill(); } }
  function rostoEm(id, x, y, r, borda, larg = 2.5, alfa = 1) {
    const im = medalhao(id);
    ctx.save(); ctx.globalAlpha = alfa;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#1a1030'; ctx.fill();
    if (im.complete && im.naturalWidth) { ctx.save(); ctx.clip(); ctx.drawImage(im, x - r, y - r, r * 2, r * 2); ctx.restore(); }
    ctx.lineWidth = larg; ctx.strokeStyle = borda; ctx.stroke();
    ctx.restore();
  }
  function desenhar() {
    if (!ctx) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore();
    if (!fundo) desenharFundo();
    ctx.drawImage(fundo, 0, 0, W, H);
    // castelo
    const torre = img('assets/arena/torre_rei_azul.png');
    if (torre.complete && torre.naturalWidth) ctx.drawImage(torre, CASTELO.x - 34, CASTELO.y - 46, 68, 68);
    else circulo(CASTELO.x, CASTELO.y, 26, '#3B6BFF');
    // portal girando
    ctx.save(); ctx.translate(60, 6); ctx.rotate(s.t * 2);
    ctx.strokeStyle = '#E6C2FF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 1.4); ctx.stroke(); ctx.restore();
    // alcance da unidade escolhida / fantasma
    const sel = s.un.find((u) => u.id === s.sel);
    if (sel) { circulo(sel.x, sel.y, sel.st.alc, '#ffffff22'); circulo(sel.x, sel.y, sel.st.alc, '#ffffff99', 1.5); }
    if (s.fantasma) {
      const ok = podeColocar(s.fantasma.x, s.fantasma.y);
      circulo(s.fantasma.x, s.fantasma.y, s.fantasma.alc, ok ? '#7CFF8A2a' : '#FF4B3A2a');
      circulo(s.fantasma.x, s.fantasma.y, s.fantasma.alc, ok ? '#7CFF8Acc' : '#FF4B3Acc', 1.5);
      rostoEm(s.fantasma.id, s.fantasma.x, s.fantasma.y, 13, ok ? '#7CFF8A' : '#FF4B3A', 2.5, 0.85);
    }
    // inimigos
    for (const e of s.en) {
      const T = TIPOS[e.tipo];
      const alfa = T.camuflado ? 0.45 : 1;
      if (T.voa) { ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 10, T.r * 0.8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      const y = T.voa ? e.y - 8 : e.y;
      if (e.tipo === 'chefe') { const p = 1 + Math.sin(s.t * 6) * 0.06; circulo(e.x, y, T.r * 1.45 * p, '#FF4B3A44'); }
      if (T.voa) { ctx.fillStyle = '#ffffffcc'; ctx.beginPath(); ctx.ellipse(e.x - T.r, y - 2, 7, 3, -0.5 + Math.sin(s.t * 18) * 0.3, 0, Math.PI * 2); ctx.ellipse(e.x + T.r, y - 2, 7, 3, 0.5 - Math.sin(s.t * 18) * 0.3, 0, Math.PI * 2); ctx.fill(); }
      rostoEm(e.rosto, e.x, y, T.r, e.tipo === 'chefe' ? '#FFD25E' : e.tipo === 'tanque' ? '#8A93A6' : '#FF4B3A', e.tipo === 'tanque' || e.tipo === 'chefe' ? 3.5 : 2.5, alfa);
      if (e.atord > 0) { ctx.fillStyle = '#FFE45C'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('★', e.x - 3, y - T.r - 6); }
      // barra de vida
      const lw = T.r * 2, pct = Math.max(0, e.hp / e.max);
      ctx.fillStyle = '#000a'; ctx.fillRect(e.x - lw / 2, y - T.r - 6, lw, 3.5);
      ctx.fillStyle = pct > 0.5 ? '#7CFF8A' : pct > 0.25 ? '#FFD25E' : '#FF4B3A'; ctx.fillRect(e.x - lw / 2, y - T.r - 6, lw * pct, 3.5);
    }
    // unidades
    for (const u of s.un) {
      const meu = u.dono === eu();
      circulo(u.x, u.y + 11, 10, '#0004');
      rostoEm(u.cartaId, u.x, u.y, 13, corDe(u), u.id === s.sel ? 4 : 3);
      // nível
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000b'; ctx.fillRect(u.x - 11, u.y + 10, 22, 9);
      ctx.fillStyle = '#FFE45C'; ctx.fillText('★'.repeat(u.lv), u.x, u.y + 17.5);
      if (s.coop && !meu) { ctx.fillStyle = '#7FD3FF'; ctx.fillText('👥', u.x + 12, u.y - 10); }
      if (u.c.habilidade && u.esp <= 0 && meu) { const p = 1 + Math.sin(s.t * 8) * 0.15; circulo(u.x, u.y, 16 * p, '#FFE45Caa', 2); }
    }
    // efeitos
    for (const f of s.fx) desenharFx(f);
    ctx.textAlign = 'start';
  }
  function desenharFx(f) {
    const vida = { tiro: 0.14, corte: 0.18, area: 0.3, morre: 0.45, vaza: 0.6, surge: 0.4, up: 0.6, vende: 0.5, especial: 0.8 }[f.tipo] || 0.4;
    const p = f.t / vida;
    if (p >= 1) return;
    ctx.save();
    if (f.tipo === 'tiro') {
      const x = f.x + (f.x2 - f.x) * p, y = f.y + (f.y2 - f.y) * p;
      circulo(x, y, 3, f.cor); circulo(x, y, 6, `${f.cor}55`);
    } else if (f.tipo === 'corte') {
      ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.cor; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x2, f.y2, 10 + p * 6, -0.9 + p, 0.9 + p); ctx.stroke();
    } else if (f.tipo === 'area') {
      ctx.globalAlpha = (1 - p) * 0.7; circulo(f.x, f.y, f.x2 * (0.4 + p * 0.6), f.cor, 3);
    } else if (f.tipo === 'morre') {
      ctx.globalAlpha = 1 - p;
      for (let k = 0; k < 6; k++) { const a = k * 1.05; circulo(f.x + Math.cos(a) * p * 18, f.y + Math.sin(a) * p * 18, 2.5, f.cor); }
    } else if (f.tipo === 'vaza') {
      ctx.globalAlpha = 1 - p; ctx.fillStyle = '#FF4B3A'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💔', f.x, f.y - p * 20);
    } else if (f.tipo === 'surge' || f.tipo === 'up' || f.tipo === 'vende') {
      ctx.globalAlpha = 1 - p; circulo(f.x, f.y, 14 + p * 16, f.cor, 3);
      if (f.tipo !== 'surge') { ctx.fillStyle = f.cor; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.tipo === 'up' ? '⬆' : '$', f.x, f.y - 16 - p * 10); }
    } else if (f.tipo === 'especial') {
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = f.cor; ctx.lineWidth = 6 * (1 - p) + 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      circulo(f.x2, f.y2, 20 + p * 45, `${f.cor}88`);
      if (f.txt) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(f.txt, f.x, f.y - 22 - p * 12); ctx.fillText(f.txt, f.x, f.y - 22 - p * 12); }
    }
    ctx.restore();
  }

  // ---------- interface ----------
  function montarTela() {
    fechar(true);
    const el = document.createElement('div');
    el.className = 'td-tela';
    el.id = 'td-tela';
    el.innerHTML = `
      <div class="td-topo">
        <button class="td-sair" id="td-sair">✕</button>
        <span class="td-hp">❤️ <b id="td-hp">150</b></span>
        <span class="td-onda">🌊 <b id="td-onda">0</b>/${ONDAS}</span>
        <span class="td-cash">💰 <b id="td-cash">0</b></span>
        <button class="td-vel" id="td-vel">⏩ 1x</button>
      </div>
      ${s.coop ? `<div class="td-amigo" id="td-amigo"></div>` : ''}
      <div class="td-area" id="td-area"><canvas id="td-cv"></canvas>
        <div class="td-chefe oculto" id="td-chefe"><span id="td-chefe-nome"></span><i><i id="td-chefe-hp"></i></i></div>
        <div class="td-aviso" id="td-aviso"></div>
        <div class="td-prox oculto" id="td-prox"><span id="td-prox-txt"></span><button id="td-pular">Começar agora (+$50)</button></div>
      </div>
      <div class="td-painel oculto" id="td-painel"></div>
      <div class="td-mao" id="td-mao"></div>`;
    document.getElementById('app').appendChild(el);
    cv = el.querySelector('#td-cv'); ctx = cv.getContext('2d');
    ajustarTela();
    window.addEventListener('resize', ajustarTela);
    el.querySelector('#td-sair').onclick = () => UI.modal({
      titulo: 'Sair da defesa?', html: `<p>${s.coop ? 'Seu amigo continua jogando sozinho.' : 'Você chegou até a onda ' + s.w + '.'}</p>`,
      botoes: [{ texto: 'Continuar' }, { texto: 'Sair', classe: 'perigo', acao: () => terminar(false, true) }],
    });
    el.querySelector('#td-vel').onclick = () => {
      if (s.papel === 'guest') { aviso('Só quem criou a sala muda a velocidade'); return; }
      s.vel = s.vel === 1 ? 2 : 1;
    };
    el.querySelector('#td-pular').onclick = () => agir({ t: 'pular' });
    desenharMao();
    // tocar no mapa
    const pos = (ev) => { const r = cv.getBoundingClientRect(); const p = ev.touches ? ev.touches[0] || ev.changedTouches[0] : ev; return { x: (p.clientX - r.left - offX) / escala, y: (p.clientY - r.top - offY) / escala }; };
    cv.addEventListener('pointermove', (ev) => { if (s.segurando) { const p = pos(ev); s.fantasma = { ...p, id: s.segurando, alc: stats(Estado.carta(s.segurando), nivelDe(s.segurando), 1).alc }; } });
    cv.addEventListener('pointerdown', (ev) => {
      const p = pos(ev);
      if (s.segurando) {
        if (podeColocar(p.x, p.y)) { agir({ t: 'por', c: s.segurando, x: Math.round(p.x), y: Math.round(p.y) }); s.segurando = null; s.fantasma = null; desenharMao(); }
        else { s.fantasma = { ...p, id: s.segurando, alc: stats(Estado.carta(s.segurando), nivelDe(s.segurando), 1).alc }; aviso('Não dá pra colocar aí (longe da estrada e de outras unidades)'); }
        return;
      }
      const u = s.un.filter((x) => Math.hypot(x.x - p.x, x.y - p.y) < 18).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      s.sel = u ? u.id : null;
      desenharPainel();
    });
  }
  const nivelDe = (id) => { const p = meusDados(); return (p && p.niveis && p.niveis[id]) || 1; };
  function desenharMao() {
    const caixa = document.getElementById('td-mao');
    if (!caixa) return;
    const p = meusDados();
    caixa.innerHTML = p.deck.map((id) => {
      const c = Estado.carta(id);
      if (!c) return '';
      return `<button class="td-carta r-${c.raridade}${s.segurando === id ? ' segurando' : ''}" data-c="${id}"><img src="assets/cartas/${id}_medalhao.png" alt="" /><b>$${preco(c)}</b></button>`;
    }).join('');
    caixa.querySelectorAll('.td-carta').forEach((b) => (b.onclick = () => {
      const id = b.dataset.c;
      s.segurando = s.segurando === id ? null : id;
      s.fantasma = null; s.sel = null;
      desenharPainel(); desenharMao();
      if (s.segurando) aviso(`Toque no mapa pra colocar ${Estado.carta(id).nome}`);
    }));
  }
  function desenharPainel() {
    const el = document.getElementById('td-painel');
    if (!el) return;
    const u = s.un.find((x) => x.id === s.sel);
    if (!u) { el.classList.add('oculto'); return; }
    el.classList.remove('oculto');
    const meu = u.dono === eu();
    const prox = u.lv < NIVEL_MAX ? stats(u.c, u.nivelCarta, u.lv + 1) : null;
    const cls = Ataques.CLASSES[u.st.cls] ? Ataques.CLASSES[u.st.cls].nome : u.st.cls;
    el.innerHTML = `<div class="tdp-cab"><img src="assets/cartas/${u.cartaId}_medalhao.png" alt="" /><div><b>${esc(u.c.nome)}</b><small>${cls} · ${'★'.repeat(u.lv)}${'☆'.repeat(NIVEL_MAX - u.lv)}${meu ? '' : ' · do seu amigo'}</small></div><button class="tdp-x" data-a="x">✕</button></div>
      <div class="tdp-stats"><span>⚔️ ${u.st.dano}${prox ? ` → ${prox.dano}` : ''}</span><span>🎯 ${u.st.alc}${prox ? ` → ${prox.alc}` : ''}</span><span>⏱️ ${u.st.cd.toFixed(2)}s</span><span>💀 ${u.abates || 0}</span></div>
      <div class="tdp-tags">${u.st.ar ? '<i>✈️ acerta voadores</i>' : '<i class="nao">✈️ não acerta voadores</i>'}${u.st.detecta ? '<i>👁️ vê camuflados</i>' : '<i class="nao">👁️ camuflado: nível 3</i>'}${u.st.splash ? '<i>💥 área</i>' : ''}</div>
      ${meu ? `<div class="tdp-botoes">
        <button data-a="modo">🎯 ${NOME_ALVO[u.modo]}</button>
        ${u.c.habilidade ? `<button data-a="esp" class="${u.esp > 0 ? 'carregando' : 'pronto'}">✨ ${esc(u.c.habilidade.nome)}${u.esp > 0 ? ` (${Math.ceil(u.esp)}s)` : ''}</button>` : ''}
        ${prox ? `<button data-a="up" class="up">⬆ Melhorar $${custoUp(u)}</button>` : '<button class="up" disabled>Nível máximo</button>'}
        <button data-a="vender" class="vender">Vender +$${Math.round(u.gasto * 0.6)}</button></div>` : ''}`;
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'x') { s.sel = null; desenharPainel(); return; }
      agir({ t: a === 'up' ? 'up' : a === 'vender' ? 'vender' : a === 'modo' ? 'modo' : 'esp', id: u.id });
      setTimeout(desenharPainel, s.papel === 'guest' ? 250 : 0);
    }));
  }
  let painelT = 0;
  function atualizarHud(dt) {
    const $ = (id) => document.getElementById(id);
    if (!$('td-hp')) return;
    $('td-hp').textContent = Math.max(0, Math.ceil(s.hp));
    $('td-onda').textContent = s.w;
    $('td-cash').textContent = s.cash[eu()] >= 900000 ? '∞' : fmt(Math.floor(s.cash[eu()]));
    $('td-vel').textContent = `⏩ ${s.vel}x`;
    if (s.coop && $('td-amigo')) { const o = eu() === 'h' ? 'g' : 'h', pa = s.jogadores[o]; $('td-amigo').innerHTML = pa ? `👥 ${esc(pa.nome)} · 💰 ${s.cash[o] >= 900000 ? '∞' : fmt(Math.floor(s.cash[o]))}` : '👥 Amigo saiu'; }
    const prox = $('td-prox');
    if (s.fase === 'preparo' && !s.acabou) { prox.classList.remove('oculto'); $('td-prox-txt').textContent = s.w === 0 ? `Coloque suas unidades! Começa em ${Math.ceil(s.timer)}s` : `Próxima onda em ${Math.ceil(s.timer)}s`; }
    else prox.classList.add('oculto');
    const chefe = s.en.find((e) => e.tipo === 'chefe');
    $('td-chefe').classList.toggle('oculto', !chefe);
    if (chefe) { $('td-chefe-nome').textContent = `👑 ${Estado.carta(chefe.rosto) ? Estado.carta(chefe.rosto).nome : 'Chefe'}`; $('td-chefe-hp').style.width = `${Math.max(0, (chefe.hp / chefe.max) * 100)}%`; }
    // botões da mão apagados quando falta dinheiro
    document.querySelectorAll('.td-carta').forEach((b) => { const c = Estado.carta(b.dataset.c); b.classList.toggle('caro', !!c && s.cash[eu()] < preco(c)); });
    if ((painelT -= dt) <= 0) { painelT = 0.5; if (s.sel) desenharPainel(); }
  }

  // ---------- laço ----------
  let raf = null;
  function laco(agora) {
    if (!s || s.acabou) return;
    const dt = Math.min(0.05, (agora - s.ult) / 1000);
    s.ult = agora;
    if (s.papel !== 'guest') {
      const n = s.vel;
      for (let i = 0; i < n && !s.acabou; i++) {
        let resto = dt;
        while (resto > 0 && !s.acabou) { const h = Math.min(1 / 60, resto); passo(h); resto -= h; }
      }
      if (s.papel === 'host' && !s.acabou && (s.snapT -= dt) <= 0) { s.snapT = 0.12; rede.mandarEstado(foto()); }
    } else interpolar(dt);
    for (const f of s.fx) f.t += dt * (s.papel === 'guest' ? 1 : s.vel);
    s.fx = s.fx.filter((f) => f.t < 1);
    if (s.papel === 'guest') s.t += dt;
    desenhar();
    atualizarHud(dt);
    raf = requestAnimationFrame(laco);
  }

  // ---------- fim ----------
  function terminar(venceu, saiu = false) {
    if (!s || s.acabou) return;
    s.acabou = true;
    cancelAnimationFrame(raf);
    if (s.papel === 'host') rede.mandarEstado({ ...foto(), fim: venceu ? 'v' : saiu ? 's' : 'd' });
    rede.sair();
    const modo = s.modo, onda = venceu ? ONDAS : Math.max(0, s.w - 1), hostSaiu = saiu === 'host';
    const ganhos = premiar(modo, onda, venceu);
    setTimeout(() => {
      fechar(true);
      UI.modal({
        titulo: venceu ? '🏰 Reino defendido!' : hostSaiu ? '🚪 Seu amigo encerrou a defesa' : saiu ? '🚪 Você saiu' : '💔 O castelo caiu',
        classe: 'modal-td-fim',
        html: `<p class="td-fim-onda">${venceu ? `Você venceu as <b>${ONDAS}</b> ondas${modo === 'coop' ? ' em dupla' : ''}!` : `Você sobreviveu até a onda <b>${onda}</b>.`}</p>
          <p>Seu recorde ${modo === 'coop' ? 'no co-op' : 'solo'}: <b>onda ${dados().melhor[modo]}</b></p>
          ${ganhos.length ? `<div class="td-ganhos">${ganhos.map((g) => `<span>🎁 ${g}</span>`).join('')}</div>` : ''}`,
        botoes: [{ texto: 'OK', classe: 'principal', acao: () => { if (window.MenuAPI) { MenuAPI.tudo(); MenuAPI.irPara('eventos'); } } }],
      });
    }, saiu ? 0 : 900);
  }
  function premiar(modo, onda, venceu) {
    const d = Estado.d, t = dados(), ganhos = [];
    t.melhor[modo] = Math.max(t.melhor[modo] || 0, onda);
    for (const mc of MARCOS) {
      const k = `${modo}-${mc.onda}`;
      if (onda >= mc.onda && !t.marcos.includes(k)) { t.marcos.push(k); mc.dar(d, modo); ganhos.push(`Onda ${mc.onda}${modo === 'coop' ? ' (co-op)' : ''}: ${mc.txt}`); }
    }
    if (venceu) { t.ganhou[modo] = (t.ganhou[modo] || 0) + 1; d.ouro += 150; ganhos.push('Vitória: 150 🪙'); }
    else if (onda >= 3) { const o = onda * 10; d.ouro += o; ganhos.push(`${o} 🪙 pelas ondas`); }
    Estado.salvar();
    return ganhos;
  }
  function fechar(silencioso) {
    window.removeEventListener('resize', ajustarTela);
    cancelAnimationFrame(raf);
    const el = document.getElementById('td-tela');
    if (el) el.remove();
    cv = null; ctx = null; fundo = null;
    if (!silencioso && window.MenuAPI) MenuAPI.tudo();
  }

  // ---------- rede (co-op) ----------
  const rede = { mandarEstado() {}, enviar() {}, sair() {} };
  let salaCod = null, desligar = [];
  const limparRede = () => { desligar.forEach((f) => { try { f(); } catch (e) { /* nada */ } }); desligar = []; };
  function perfilTD() {
    const d = Estado.d;
    return { uid: Conta.uid(), nome: d.nome, avatar: d.avatar || '', deck: d.deck.slice(0, 8), niveis: Object.fromEntries(d.deck.map((id) => [id, d.colecao[id] ? Estado.nivelEfetivo(id) : 1])) };
  }
  function foto() {
    const fx = s.fxRede; s.fxRede = [];
    return {
      w: s.w, f: s.fase, t: +s.timer.toFixed(1), hp: s.hp, c: [Math.floor(s.cash.h), Math.floor(s.cash.g)], v: s.vel,
      e: s.en.map((e) => [e.id, Math.round(e.x), Math.round(e.y), Math.round((e.hp / e.max) * 1000), NOMES_TIPO.indexOf(e.tipo), e.rosto, e.atord > 0 ? 1 : 0]),
      u: s.un.map((u) => [u.id, u.dono, u.cartaId, u.x, u.y, u.lv, MODOS_ALVO.indexOf(u.modo), Math.ceil(u.esp), u.nivelCarta, u.abates || 0, u.gasto]),
      x: fx,
    };
  }
  // convidado: aplica o que o host mandou
  function receber(est) {
    if (!s || s.acabou || !est) return;
    s.w = est.w; s.fase = est.f; s.timer = est.t; s.hp = est.hp; s.cash.h = est.c[0]; s.cash.g = est.c[1]; s.vel = est.v;
    const antes = new Map(s.en.map((e) => [e.id, e]));
    s.en = (est.e || []).map(([id, x, y, pm, ti, rosto, at]) => {
      const a = antes.get(id), tipo = NOMES_TIPO[ti];
      return { id, tipo, rosto, x: a ? a.x : x, y: a ? a.y : y, tx: x, ty: y, hp: pm, max: 1000, atord: at };
    });
    s.un = (est.u || []).map(([id, dono, cartaId, x, y, lv, mi, esp, nivelCarta, abates, gasto]) => {
      const c = Estado.carta(cartaId);
      return { id, dono, cartaId, c, x, y, lv, modo: MODOS_ALVO[mi], esp, nivelCarta, abates, gasto, st: stats(c, nivelCarta, lv) };
    });
    for (const [tipo, x, y, cor, x2, y2, txt] of est.x || []) s.fx.push({ tipo, x, y, cor, x2, y2, txt, t: 0 });
    if (est.fim) terminar(est.fim === 'v', est.fim === 's' ? 'host' : false);
  }
  function interpolar(dt) {
    for (const e of s.en) if (e.tx != null) { const k = Math.min(1, dt * 10); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
  }

  async function criarSalaCoop(aoEntrar) {
    const { m, r } = await X1.rt();
    let cod = 'T' + Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    salaCod = cod;
    await m.set(r(`salas/${cod}`), { host: { ...perfilTD(), modo: 'td' }, status: 'esperando', criado: m.serverTimestamp() });
    m.onDisconnect(r(`salas/${cod}`)).remove();
    desligar.push(m.onValue(r(`salas/${cod}/convidado`), (snap) => { if (snap.exists() && !snap.val().saiu) aoEntrar(snap.val()); }));
    return cod;
  }
  async function comecarHost(convidado) {
    const { m, r } = await X1.rt();
    const cod = salaCod;
    novaPartida('coop', 'host', { h: perfilTD(), g: convidado });
    await m.update(r(`salas/${cod}`), { status: 'jogando' });
    desligar.push(m.onChildAdded(r(`salas/${cod}/cmds`), (snap) => comando('g', snap.val())));
    desligar.push(m.onValue(r(`salas/${cod}/convidado/saiu`), (snap) => { if (snap.val() && s && !s.acabou) { aviso('Seu amigo saiu. A defesa continua!'); s.jogadores.g = null; } }));
    let enviando = false;
    Object.assign(rede, {
      mandarEstado: (est) => { if (enviando && !est.fim) return; enviando = true; m.set(r(`salas/${cod}/estado`), JSON.parse(JSON.stringify(est))).catch(() => {}).finally(() => (enviando = false)); },
      enviar() {},
      sair: () => { setTimeout(() => { m.remove(r(`salas/${cod}`)).catch(() => {}); limparRede(); }, 4000); },
    });
    iniciarJogo();
  }
  async function entrar(codigo) {
    let espera = null;
    try {
      if (!(await Atualizacao.podeJogar())) return;
      espera = UI.modal({ titulo: '🏰 Entrando na defesa...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { sairSala(); } }] });
      const { m, r } = await X1.rt();
      const cod = String(codigo).toUpperCase().replace(/[^A-Z]/g, '');
      const snap = await m.get(r(`salas/${cod}`));
      if (!snap.exists()) throw new Error('Sala não encontrada. Confira o código.');
      const v = snap.val();
      if (!v.host || v.host.modo !== 'td') throw new Error('Esse código não é de uma sala da Defesa do Reino.');
      if (v.host.uid === Conta.uid()) throw new Error('Essa sala é sua! Mande o código pro seu amigo.');
      if (v.status !== 'esperando' || v.convidado) throw new Error('Essa sala já está cheia.');
      salaCod = cod;
      await m.set(r(`salas/${cod}/convidado`), perfilTD());
      m.onDisconnect(r(`salas/${cod}/convidado/saiu`)).set(true);
      const corpo = espera.el.querySelector('.modal-corpo');
      if (corpo) corpo.innerHTML = `<p>Você entrou na sala de <b>${esc(v.host.nome)}</b>!</p><p class="aviso">Esperando ${esc(v.host.nome)} começar…</p>`;
      let comecou = false;
      desligar.push(m.onValue(r(`salas/${cod}/status`), (st) => {
        if (st.val() !== 'jogando' || comecou) return;
        comecou = true;
        if (espera) espera.fechar();
        novaPartida('coop', 'guest', { h: v.host, g: perfilTD() });
        Object.assign(rede, {
          mandarEstado() {},
          enviar: (c) => m.push(r(`salas/${cod}/cmds`), c).catch(() => {}),
          sair: () => { m.set(r(`salas/${cod}/convidado/saiu`), true).catch(() => {}); limparRede(); },
        });
        desligar.push(m.onValue(r(`salas/${cod}/estado`), (e) => receber(e.val())));
        desligar.push(m.onValue(r(`salas/${cod}`), (x) => { if (!x.exists() && s && !s.acabou) { aviso('Seu amigo fechou a sala'); setTimeout(() => terminar(false, 'host'), 1500); } }));
        iniciarJogo();
      }));
    } catch (e) {
      if (espera) espera.fechar();
      UI.toast(e.message || 'Não deu pra entrar na sala');
      sairSala();
    }
  }
  async function sairSala() {
    try {
      const { m, r } = await X1.rt();
      if (salaCod && !(s && !s.acabou)) await m.remove(r(`salas/${salaCod}`)).catch(() => {});
    } catch (e) { /* nada */ }
    limparRede(); salaCod = null;
  }

  // ---------- começar ----------
  function iniciarJogo() {
    montarTela();
    s.ult = performance.now();
    aviso(s.coop ? '🤝 Defendam o castelo juntos!' : '🏰 Defenda o castelo!');
    raf = requestAnimationFrame(laco);
  }
  async function jogarSolo() {
    if (!aberto()) { UI.toast('Esse evento já acabou 😢'); return; }
    if (Estado.d.deck.length < 8) { UI.toast('Monte um deck com 8 cartas primeiro'); return; }
    const p = { uid: (Conta.uid && Conta.uid()) || '', nome: Estado.d.nome, deck: Estado.d.deck.slice(0, 8), niveis: Object.fromEntries(Estado.d.deck.map((id) => [id, Estado.d.colecao[id] ? Estado.nivelEfetivo(id) : 1])) };
    novaPartida('solo', 'solo', { h: p });
    Object.assign(rede, { mandarEstado() {}, enviar() {}, sair() {} });
    iniciarJogo();
  }
  async function jogarCoop() {
    if (!aberto()) { UI.toast('Esse evento já acabou 😢'); return; }
    if (!Conta.logado || !Conta.logado()) { UI.toast('Entre numa conta para jogar co-op 👥'); return; }
    if (Estado.d.deck.length < 8) { UI.toast('Monte um deck com 8 cartas primeiro'); return; }
    if (!(await Atualizacao.podeJogar())) return;
    let md = null, convidado = null;
    try {
      md = UI.modal({
        titulo: '🤝 Defesa em dupla',
        classe: 'modal-td-sala',
        html: `<div class="td-sala"><p>Criando a sala…</p></div>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { sairSala(); } }],
      });
      const cod = await criarSalaCoop((c) => {
        convidado = c;
        const caixa = md.el.querySelector('.td-sala-amigo');
        if (caixa) caixa.innerHTML = `<b>✅ ${esc(c.nome)} entrou!</b><button class="btn-modal principal" id="td-comecar">Começar a defesa!</button>`;
        const b = md.el.querySelector('#td-comecar');
        if (b) b.onclick = () => { md.fechar(); comecarHost(convidado); };
      });
      const corpo = md.el.querySelector('.td-sala');
      corpo.innerHTML = `<p>Código da sala:</p><div class="td-codigo">${cod}</div>
        <div class="td-sala-amigo"><span class="aviso">Esperando um amigo entrar…</span></div>
        <p class="td-sub">Chame um amigo online:</p><div class="td-amigos"><span class="aviso">Carregando amigos…</span></div>
        <div class="td-entrar"><input id="td-cod" maxlength="5" placeholder="Ou digite o código de outra sala" /><button class="btn-modal" id="td-entrar-btn">Entrar</button></div>`;
      md.el.querySelector('#td-entrar-btn').onclick = () => { const v = md.el.querySelector('#td-cod').value; if (!v) return; md.fechar(); sairSala().then(() => entrar(v)); };
      try {
        const lista = (await Amigos.listar()).filter((a) => Amigos.online(a));
        const caixa = md.el.querySelector('.td-amigos');
        if (caixa) {
          caixa.innerHTML = lista.length ? lista.map((a) => `<button class="td-amigo-op" data-id="${a.uid}">${esc(a.nome || 'Amigo')} <small>chamar</small></button>`).join('') : '<span class="aviso">Nenhum amigo online agora. Mande o código!</span>';
          caixa.querySelectorAll('.td-amigo-op').forEach((b) => (b.onclick = async () => { b.disabled = true; b.querySelector('small').textContent = 'chamado ✓'; try { await Amigos.convidar(b.dataset.id, cod, 'td'); } catch (e) { UI.toast('Não deu pra chamar agora'); } }));
        }
      } catch (e) { const caixa = md.el.querySelector('.td-amigos'); if (caixa) caixa.innerHTML = '<span class="aviso">Mande o código pro seu amigo!</span>'; }
    } catch (e) {
      if (md) md.fechar();
      UI.toast(e.message || 'Não deu pra criar a sala');
      sairSala();
    }
  }

  // ---------- caixa na aba Eventos ----------
  function htmlEvento() {
    if (!aberto()) return '';
    const t = dados();
    const marco = (modo) => MARCOS.map((mc) => `<span class="fn-pip${t.marcos.includes(`${modo}-${mc.onda}`) ? ' ok' : ''}" title="Onda ${mc.onda}: ${mc.txt}">${mc.onda}</span>`).join('');
    return `<div class="td-evento"><div class="td-ev-fundo"></div><div class="td-ev-conteudo">
      <small class="td-ev-tag">EVENTO NOVO · ${dias()} dias</small>
      <b>🏰 Defesa do Reino</b>
      <span>Coloque as cartas do seu deck do lado da estrada e segure <b>${ONDAS} ondas</b> de inimigos. Chefes nas ondas 5, 10, 15 e 20!</span>
      <div class="td-ev-modos">
        <div><em>👤 Solo · recorde: onda ${t.melhor.solo || 0}</em><div class="fn-pips">${marco('solo')}</div><button class="selo botao" data-td="solo">Jogar solo</button></div>
        <div><em>🤝 Co-op · recorde: onda ${t.melhor.coop || 0}</em><div class="fn-pips">${marco('coop')}</div><button class="selo botao" data-td="coop">Jogar com amigo</button></div>
      </div></div></div>`;
  }
  function ligar(raiz) {
    raiz.querySelectorAll('[data-td]').forEach((b) => (b.onclick = () => (b.dataset.td === 'coop' ? jogarCoop() : jogarSolo())));
  }

  return { htmlEvento, ligar, jogarSolo, jogarCoop, entrar, ativo: () => !!(s && !s.acabou), _sim: { novaPartida: (m, p, j) => novaPartida(m, p, j), passo: (dt) => passo(dt), estado: () => s, colocar, melhorar, podeColocar, stats, preco, custoUp, foto: () => foto(), receber: (e) => receber(e), iniciarJogo: () => iniciarJogo(), comando } };
})();
