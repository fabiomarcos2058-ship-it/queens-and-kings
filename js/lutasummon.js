// Abertura do Summon: uma luta em 2D entre o Zaphir (Saiyajin original do jogo) e o Vorak (rival original),
// no estilo das cinemáticas de golpe: câmera baixa, close, investida, trocação e duelo de rajadas.
// Três variações, conforme o melhor que veio na invocação:
// - 'normal'   : Zaphir (forma base) x Vorak, céu de pôr do sol, 3 golpes
// - 'lendaria' : Zaphir Fúria Carmesim x Vorak Escarlate, céu vermelho, 4 golpes
// - 'ultra'    : Zaphir Ascensão Estelar x Vorak do Vazio, céu cósmico, 5 golpes e rajada enorme
const LutaSummon = (() => {
  const PASTA = 'assets/summon/luta/';
  const VAR = {
    normal: { heroi: 'zaphir', rival: 'vorak_normal', golpes: 3 },
    lendaria: { heroi: 'zaphir_carmesim', rival: 'vorak_lendaria', golpes: 4 },
    ultra: { heroi: 'zaphir_estelar', rival: 'vorak_ultra', golpes: 5 },
  };
  const BARULHOS = ['POW!', 'BAM!', 'CRASH!', 'BOOM!', 'WHAM!', 'KRAAK!'];
  const leve = () => document.documentElement.classList.contains('leve');

  // espera que acaba na hora se a pessoa tocou em "Pular"
  const esp = (ms, pulou) => new Promise((ok) => {
    const t0 = Date.now();
    const iv = setInterval(() => { if (pulou() || Date.now() - t0 >= ms) { clearInterval(iv); ok(); } }, 25);
  });
  const carregar = (src) => new Promise((ok) => { const i = new Image(); i.onload = i.onerror = () => ok(); i.src = src; setTimeout(ok, 1800); });

  async function jogar(cena, variante, { pulou = () => false, som = () => {} } = {}) {
    const v = VAR[variante] ? variante : 'normal';
    const C = VAR[v];
    cena.className = `luta-summon v-${v}`;
    cena.dataset.cut = '';
    cena.innerHTML = `
      <div class="ls-ceu"><i class="ls-sol"></i>${v === 'ultra' ? '<div class="ls-estrelas"></div>' : ''}</div>
      <div class="ls-linhas"></div>
      <div class="ls-cam">
        <img class="ls-rival" src="${PASTA}${C.rival}.png" alt="" draggable="false" />
        <img class="ls-heroi" src="${PASTA}${C.heroi}.png" alt="" draggable="false" />
        <i class="ls-esfera"></i>
        <i class="ls-feixe h"></i><i class="ls-feixe r"></i><i class="ls-colisao"></i>
      </div>
      <div class="ls-fx"></div>
      <i class="ls-faixa"></i>
      <i class="ls-clarao"></i>`;
    const q = (s) => cena.querySelector(s);
    const fx = q('.ls-fx'), clarao = q('.ls-clarao'), cam = q('.ls-cam');
    const corte = (c) => { cena.dataset.cut = c; };
    await Promise.all([carregar(`${PASTA}${C.heroi}.png`), carregar(`${PASTA}${C.rival}.png`)]);
    if (v === 'ultra' && !leve()) q('.ls-estrelas').innerHTML = Array.from({ length: 26 }, () => `<i style="left:${(Math.random() * 100).toFixed(0)}%;top:${(Math.random() * 100).toFixed(0)}%;--d:${(0.8 + Math.random() * 1.6).toFixed(1)}s"></i>`).join('');
    requestAnimationFrame(() => cena.classList.add('entra'));

    // 1) câmera baixa: o Zaphir de pé, o rival pequeno no alto, perto do sol
    corte('a');
    await esp(1700, pulou);
    // 2) close no rosto, o olhar acende
    corte('b'); som('carga');
    await esp(1150, pulou);
    // 3) investida: os dois se lançam um contra o outro, esfera de impacto
    corte('c');
    await esp(850, pulou);
    // 4) trocação de golpes
    corte('d');
    for (let i = 0; i < C.golpes && !pulou(); i++) {
      cena.dataset.hit = String(i % 2);
      cam.classList.remove('treme'); void cam.offsetWidth; cam.classList.add('treme');
      const x = 28 + Math.random() * 44, y = 22 + Math.random() * 34;
      const n = document.createElement('div');
      n.className = 'ls-impacto';
      n.style.cssText = `left:${x}%;top:${y}%`;
      n.innerHTML = `<i class="anel"></i><i class="anel b"></i><i class="estrela"></i><b style="--r:${(Math.random() * 24 - 12).toFixed(0)}deg">${BARULHOS[(i + (Math.random() * 3 | 0)) % BARULHOS.length]}</b>`;
      fx.appendChild(n);
      setTimeout(() => n.remove(), 600);
      clarao.classList.remove('pisca'); void clarao.offsetWidth; clarao.classList.add('pisca');
      som(v === 'normal' ? 'carta' : 'coroa');
      await esp(i === C.golpes - 1 ? 420 : 330 - i * 12, pulou);
    }
    // 5) duelo de rajadas: carregam, disparam, as duas se chocam e tudo vira luz
    corte('e'); som('carga');
    await esp(1000, pulou);
    corte('f');
    await esp(v === 'ultra' ? 1500 : 1200, pulou);
    clarao.className = 'ls-clarao total';
    await esp(450, pulou);
  }
  return { jogar };
})();
