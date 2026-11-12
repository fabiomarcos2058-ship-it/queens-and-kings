// Som do jogo: tudo é criado na hora com a Web Audio API (nenhum arquivo de áudio, nada com direitos autorais).
// - Música: phonk próprio (cowbell, 808, kick distorcido, palmas e chimbal) em 3 climas: menu, batalha e final.
// - Efeitos: golpes, tiros, feitiços, torres, tempo parado...
// - Spotify: a pessoa cola o link de uma playlist/música e ela toca no player oficial do Spotify (aí a música do jogo fica quieta).
const Som = (() => {
  const CHAVE = 'qk_som';
  const cfg = Object.assign({ musica: true, efeitos: true, volMus: 0.55, volSfx: 0.8, spotify: '' }, (() => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } })());
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) { /* nada */ } };

  let ctx = null, mestre, gMus, gSfx, ruido, distorcao;
  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    mestre = ctx.createGain(); mestre.gain.value = 0.9;
    mestre.connect(comp).connect(ctx.destination);
    gMus = ctx.createGain(); gMus.connect(mestre);
    gSfx = ctx.createGain(); gSfx.connect(mestre);
    aplicarVolumes();
    // ruído branco reaproveitado (palmas, chimbal, explosões)
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const dd = ruido.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
    // distorção do 808/kick (o "sujo" do phonk)
    distorcao = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; distorcao[i] = Math.tanh(x * 3.2); }
    return true;
  }
  function aplicarVolumes() {
    if (!ctx) return;
    const spotifyAtivo = !!cfg.spotify;
    gMus.gain.setTargetAtTime(cfg.musica && !spotifyAtivo ? cfg.volMus * 0.55 : 0, ctx.currentTime, 0.15);
    gSfx.gain.setTargetAtTime(cfg.efeitos ? cfg.volSfx * 0.6 : 0, ctx.currentTime, 0.05);
  }
  // o navegador só deixa tocar depois de um toque
  const primeiroToque = () => { if (iniciar() && atual) comecarMusica(atual); };
  document.addEventListener('pointerdown', primeiroToque, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });

  // ---------- peças de som ----------
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  function env(g, t, a, pico, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pico, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function osc(tipo, f, t, dur, destino, pico = 0.5, a = 0.004) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    env(g, t, a, pico, dur);
    o.connect(g).connect(destino);
    o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function barulho(t, dur, destino, { tipo = 'bandpass', f = 1500, q = 1, pico = 0.5 } = {}) {
    const n = ctx.createBufferSource(); n.buffer = ruido;
    const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.003, pico, dur);
    n.connect(fl).connect(g).connect(destino);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
  }
  function sujo(destino) { const w = ctx.createWaveShaper(); w.curve = distorcao; w.connect(destino); return w; }
  // instrumentos do phonk
  function kick(t, d = gMus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.002, 1.0, 0.32);
    o.connect(g).connect(sujo(d)); o.start(t); o.stop(t + 0.4);
  }
  function oitocentos(t, nota, dur, d = gMus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(hz(nota + 12), t); o.frequency.exponentialRampToValueAtTime(hz(nota), t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75, t + 0.01); g.gain.setTargetAtTime(0.0001, t + dur * 0.7, dur * 0.25);
    o.connect(g).connect(sujo(d)); o.start(t); o.stop(t + dur + 0.2);
  }
  function cowbell(t, nota, d = gMus, brilho = 2600, vol = 0.32) {
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = brilho; fl.Q.value = 1.4;
    const g = ctx.createGain(); env(g, t, 0.002, vol, 0.22);
    fl.connect(g).connect(d);
    for (const k of [1, 1.4835]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz(nota) * k; o.connect(fl); o.start(t); o.stop(t + 0.3); }
  }
  const palma = (t, d = gMus) => { barulho(t, 0.16, d, { f: 1400, q: 0.9, pico: 0.45 }); barulho(t + 0.012, 0.12, d, { f: 1900, q: 1.2, pico: 0.3 }); };
  const chimbal = (t, d = gMus, v = 0.16) => barulho(t, 0.035, d, { tipo: 'highpass', f: 7500, q: 0.7, pico: v });

  // ---------- música: sequenciador de phonk ----------
  // 16 passos por compasso, 4 compassos. Notas em ré menor.
  const CLIMAS = {
    menu: { bpm: 112, kick: 'x.........x.....', palma: '........x.......', hat: 'x.x.x.x.x.x.x.x.', baixo: [38, 38, 41, 36], bell: [[0, 74], [3, 77], [6, 74], [8, 72], [10, 74], [14, 69]], brilho: 1800, bellVol: 0.22 },
    batalha: { bpm: 138, kick: 'x.....x...x..x..', palma: '....x.......x...', hat: 'x.xxx.x.x.xxx.x.', baixo: [38, 38, 34, 36], bell: [[0, 74], [2, 77], [4, 79], [6, 77], [7, 74], [8, 81], [10, 79], [12, 77], [14, 74]], brilho: 2600, bellVol: 0.3 },
    final: { bpm: 156, kick: 'x...x.x...x.x.x.', palma: '....x..x....x...', hat: 'xxxxxxxxxxxxxxxx', baixo: [38, 41, 34, 36], bell: [[0, 81], [1, 79], [2, 77], [4, 81], [6, 84], [8, 81], [9, 79], [10, 77], [12, 74], [14, 77], [15, 79]], brilho: 3200, bellVol: 0.34 },
  };
  let atual = null, timer = null, passo = 0, proximo = 0;
  function comecarMusica(clima) {
    if (!ctx) return;
    clearInterval(timer);
    passo = 0; proximo = ctx.currentTime + 0.08;
    timer = setInterval(() => {
      const C = CLIMAS[atual];
      if (!C || !ctx) return;
      const dur = 60 / C.bpm / 4;
      while (proximo < ctx.currentTime + 0.12) {
        const p = passo % 16, compasso = Math.floor(passo / 16) % 4, t = proximo;
        if (C.kick[p] === 'x') { kick(t); oitocentos(t, C.baixo[compasso], dur * (p === 0 ? 6 : 3)); }
        if (C.palma[p] === 'x') palma(t);
        if (C.hat[p] === 'x') chimbal(t, gMus, p % 4 === 0 ? 0.18 : 0.1);
        if (atual === 'final' && compasso === 3 && p >= 12) chimbal(t + dur / 2, gMus, 0.1); // rufada no fim
        for (const [ps, n] of C.bell) if (ps === p) cowbell(t, n + (compasso === 2 ? -2 : 0), gMus, C.brilho, C.bellVol);
        proximo += dur; passo++;
      }
    }, 25);
  }
  function musica(clima) {
    if (clima === atual) return;
    atual = clima;
    if (!clima) { clearInterval(timer); return; }
    if (ctx) comecarMusica(clima);
  }

  // ---------- efeitos ----------
  const ultimo = {};
  function tocar(nome, forca = 1) {
    if (!cfg.efeitos || !ctx || ctx.state !== 'running') return;
    const agora = ctx.currentTime;
    if (ultimo[nome] && agora - ultimo[nome] < 0.06) return; // sem enxurrada de sons
    ultimo[nome] = agora;
    const t = agora + 0.005, d = gSfx;
    switch (nome) {
      case 'botao': osc('triangle', 880, t, 0.06, d, 0.18); break;
      case 'carta': osc('sine', 520, t, 0.08, d, 0.3); osc('sine', 780, t + 0.05, 0.1, d, 0.25); barulho(t, 0.08, d, { f: 3000, pico: 0.12 }); break;
      case 'golpe': barulho(t, 0.07, d, { tipo: 'lowpass', f: 900, pico: 0.35 * forca }); osc('sine', 120, t, 0.08, d, 0.35 * forca); break;
      case 'tiro': barulho(t, 0.05, d, { f: 2400, q: 2, pico: 0.14 }); break;
      case 'feitico': barulho(t, 0.5, d, { tipo: 'lowpass', f: 700, pico: 0.5 }); osc('sawtooth', 220, t, 0.3, d, 0.12); break;
      case 'explosao': kick(t, d); barulho(t, 0.45, d, { tipo: 'lowpass', f: 500, pico: 0.6 }); break;
      case 'torre': kick(t, d); barulho(t, 0.9, d, { tipo: 'lowpass', f: 350, pico: 0.8 }); [60, 55, 48].forEach((n, i) => osc('square', hz(n), t + 0.1 + i * 0.12, 0.2, d, 0.12)); break;
      case 'esquiva': { const o = osc('sine', 600, t, 0.15, d, 0.2); o.frequency.exponentialRampToValueAtTime(1400, t + 0.12); break; }
      case 'kame': { const o = osc('sawtooth', 110, t, 1.1, d, 0.2, 0.4); o.frequency.exponentialRampToValueAtTime(440, t + 1.0); barulho(t + 0.9, 0.6, d, { tipo: 'lowpass', f: 1200, pico: 0.5 }); break; }
      case 'tempoParado': { // relógio parando + estrondo invertido
        [0, 0.18, 0.36].forEach((x, i) => osc('square', 1800 - i * 400, t + x, 0.04, d, 0.2));
        const o = osc('sine', 900, t + 0.5, 0.9, d, 0.4, 0.3); o.frequency.exponentialRampToValueAtTime(60, t + 1.4);
        barulho(t + 0.5, 1.0, d, { tipo: 'lowpass', f: 400, pico: 0.4 }); break;
      }
      case 'corte': { barulho(t, 0.12, d, { f: 5200, q: 3, pico: 0.3 }); const o = osc('sawtooth', 1800, t, 0.18, d, 0.12); o.frequency.exponentialRampToValueAtTime(240, t + 0.16); osc('sine', 70, t + 0.05, 0.25, d, 0.3); break; }
      case 'acelera': { const o = osc('sawtooth', 80, t, 1.2, d, 0.15, 0.2); o.frequency.exponentialRampToValueAtTime(1600, t + 1.2); break; }
      case 'vitoria': [72, 76, 79, 84].forEach((n, i) => { cowbell(t + i * 0.13, n, d, 2600, 0.35); }); kick(t + 0.52, d); break;
      case 'derrota': [64, 62, 58, 55].forEach((n, i) => osc('triangle', hz(n), t + i * 0.18, 0.25, d, 0.3)); break;
      case 'bau': barulho(t, 0.25, d, { f: 900, pico: 0.3 }); [76, 79, 83, 88].forEach((n, i) => osc('triangle', hz(n), t + 0.15 + i * 0.07, 0.25, d, 0.22)); break;
      case 'carga': { const o = osc('sawtooth', 110, t, 1.1, d, 0.12, 0.6); o.frequency.exponentialRampToValueAtTime(880, t + 1.1); barulho(t + 0.2, 0.9, d, { f: 2400, q: 2, pico: 0.12 }); break; }
      case 'patente': kick(t, d); osc('sine', 55, t, 0.6, d, 0.5); [72, 76, 79, 84, 88].forEach((n, i) => { cowbell(t + 0.12 + i * 0.09, n, d, 2600, 0.3); }); [84, 88, 91].forEach((n) => osc('triangle', hz(n), t + 0.6, 0.9, d, 0.16)); break;
      case 'portal': { barulho(t, 1.2, d, { tipo: 'lowpass', f: 500, pico: 0.35 }); const o = osc('sine', 60, t, 1.2, d, 0.4, 0.2); o.frequency.exponentialRampToValueAtTime(30, t + 1.2); const o2 = osc('triangle', 400, t, 0.9, d, 0.08, 0.3); o2.frequency.exponentialRampToValueAtTime(1600, t + 0.9); break; }
      case 'ultra': { kick(t, d); kick(t + 0.18, d); osc('sine', 40, t, 1.4, d, 0.6, 0.01); barulho(t, 0.8, d, { tipo: 'lowpass', f: 900, pico: 0.5 });
        [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => osc('sawtooth', hz(n), t + 0.25 + i * 0.06, 1.1, d, 0.06));
        [84, 88, 91, 96].forEach((n, i) => cowbell(t + 0.7 + i * 0.1, n, d, 3200, 0.22)); break; }
      case 'coroa': [79, 84, 88].forEach((n, i) => osc('triangle', hz(n), t + i * 0.08, 0.3, d, 0.25)); break;
      case 'emote': osc('sine', 660, t, 0.08, d, 0.2); osc('sine', 990, t + 0.07, 0.1, d, 0.2); break;
      default: break;
    }
  }

  // ---------- Spotify ----------
  // aceita link de playlist, álbum, música, artista ou podcast (open.spotify.com/...)
  function spotifyEmbed(link) {
    const m = String(link || '').match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
  }
  function desenharSpotify() {
    let caixa = document.getElementById('spotify-player');
    const url = spotifyEmbed(cfg.spotify);
    if (!url) { if (caixa) caixa.remove(); return; }
    if (!caixa) {
      caixa = document.createElement('div');
      caixa.id = 'spotify-player';
      caixa.innerHTML = '<button class="sp-alca" type="button">🎧</button><iframe allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify"></iframe>';
      document.body.appendChild(caixa);
      caixa.querySelector('.sp-alca').onclick = () => caixa.classList.toggle('aberto');
    }
    const fr = caixa.querySelector('iframe');
    if (fr.dataset.url !== url) { fr.src = url; fr.dataset.url = url; caixa.classList.add('aberto'); }
  }

  // ---------- tela de configurações ----------
  function abrirConfig() {
    const md = UI.modal({
      titulo: '🔊 Som e música',
      classe: 'modal-som',
      html: `<label class="som-linha"><span>🎵 Música (phonk do jogo)</span><input type="checkbox" id="som-mus" ${cfg.musica ? 'checked' : ''} /></label>
        <input type="range" id="som-vmus" min="0" max="1" step="0.05" value="${cfg.volMus}" />
        <label class="som-linha"><span>💥 Efeitos</span><input type="checkbox" id="som-sfx" ${cfg.efeitos ? 'checked' : ''} /></label>
        <input type="range" id="som-vsfx" min="0" max="1" step="0.05" value="${cfg.volSfx}" />
        <div class="som-spotify"><b>🎧 Sua música do Spotify</b>
          <small>Cole o link de uma playlist, álbum ou música (Spotify → Compartilhar → Copiar link). Enquanto ela estiver ligada, a música do jogo fica quieta.</small>
          <input type="url" id="som-sp" placeholder="https://open.spotify.com/playlist/..." value="${cfg.spotify ? String(cfg.spotify).replace(/"/g, '') : ''}" />
          <div class="som-sp-botoes"><button class="btn-peq" id="som-sp-ok">Usar</button><button class="btn-peq perigo" id="som-sp-tirar">Tirar</button></div>
          <small class="aviso">Sem Premium/sem login, o Spotify toca só uma prévia de 30s de cada música.</small></div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
    const el = md.el;
    iniciar();
    el.querySelector('#som-mus').onchange = (e) => { cfg.musica = e.target.checked; salvar(); aplicarVolumes(); };
    el.querySelector('#som-sfx').onchange = (e) => { cfg.efeitos = e.target.checked; salvar(); aplicarVolumes(); tocar('botao'); };
    el.querySelector('#som-vmus').oninput = (e) => { cfg.volMus = +e.target.value; salvar(); aplicarVolumes(); };
    el.querySelector('#som-vsfx').oninput = (e) => { cfg.volSfx = +e.target.value; salvar(); aplicarVolumes(); tocar('carta'); };
    el.querySelector('#som-sp-ok').onclick = () => {
      const v = el.querySelector('#som-sp').value.trim();
      if (!spotifyEmbed(v)) { UI.toast('Esse link não é do Spotify 😅'); return; }
      cfg.spotify = v; salvar(); aplicarVolumes(); desenharSpotify(); UI.toast('🎧 Spotify conectado! Aperte o play no player.');
    };
    el.querySelector('#som-sp-tirar').onclick = () => { cfg.spotify = ''; salvar(); aplicarVolumes(); desenharSpotify(); el.querySelector('#som-sp').value = ''; UI.toast('Voltou o phonk do jogo 🎵'); };
  }

  // som de clique nos botões do menu
  document.addEventListener('click', (e) => { if (e.target.closest('button') && !document.body.classList.contains('em-batalha')) tocar('botao'); }, true);
  setTimeout(desenharSpotify, 1500);

  // para conferir em testes: volume que está saindo agora
  function _medir() {
    if (!ctx) return null;
    if (!_medir.an) { _medir.an = ctx.createAnalyser(); mestre.connect(_medir.an); }
    const b = new Float32Array(_medir.an.fftSize); _medir.an.getFloatTimeDomainData(b);
    return { estado: ctx.state, musica: atual, pico: Math.max(...b.map(Math.abs)) };
  }
  // grava alguns segundos do que está tocando (pra prévia)
  function _gravar(seg) {
    return new Promise((ok) => {
      const dest = ctx.createMediaStreamDestination(); mestre.connect(dest);
      const rec = new MediaRecorder(dest.stream); const partes = [];
      rec.ondataavailable = (e) => partes.push(e.data);
      rec.onstop = () => { mestre.disconnect(dest); const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(new Blob(partes, { type: 'audio/webm' })); };
      rec.start(); setTimeout(() => rec.stop(), seg * 1000);
    });
  }
  return { tocar, musica, abrirConfig, iniciar, cfg, _medir, _gravar };
})();
