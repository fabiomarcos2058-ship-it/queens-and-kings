// Abertura do Summon: 3 jogadores (criados pro jogo) tocam a bola entre si até a área,
// e quem invocou arrasta a bola pro gol. Depois do gol, vêm os personagens.
// Três variações, conforme o melhor que veio na invocação:
// - 'normal'   : jogada limpa, gol azul
// - 'lendaria' : a bola pega fogo dourado, lençol e calcanhar, GOLAÇO dourado
// - 'ultra'    : o céu racha, a bola atravessa uma fenda do multiverso e o gol vira um portal
const GolSummon = (() => {
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

  // jogadores originais do jogo (não são de nenhum anime): Faísca (7), Maré (10) e Nuvem (9)
  const ELENCO = [
    { nome: 'Faísca', num: 7, pele: '#F2C7A5', cabelo: '#FF5C8A', estilo: 'espetado' },
    { nome: 'Maré', num: 10, pele: '#C98B5E', cabelo: '#1E2A4A', estilo: 'coque' },
    { nome: 'Nuvem', num: 9, pele: '#FBE0C8', cabelo: '#F4F4FF', estilo: 'franja' },
  ];
  const CAMISA = { normal: ['#2F6BFF', '#1A3A9A'], lendaria: ['#FFC53D', '#B37400'], ultra: ['#1B1033', '#000'] };

  function jogadorSVG(j, v) {
    const [c1, c2] = CAMISA[v];
    const cab = {
      espetado: `<path d="M14 14 L10 4 L17 10 L20 1 L24 10 L30 3 L30 12 L36 8 L33 17 Z" fill="${j.cabelo}" stroke="#0004" stroke-width=".8"/>`,
      coque: `<circle cx="24" cy="5" r="5" fill="${j.cabelo}"/><path d="M13 16 Q14 6 24 7 Q34 6 35 16 Q30 11 24 12 Q18 11 13 16 Z" fill="${j.cabelo}"/>`,
      franja: `<path d="M12 17 Q11 5 24 5 Q37 5 36 17 L33 12 L30 16 L27 11 L24 16 L21 11 L18 16 L15 12 Z" fill="${j.cabelo}" stroke="#0002" stroke-width=".8"/>`,
    }[j.estilo];
    return `<svg viewBox="0 0 48 80" class="gs-svg">
      <ellipse cx="24" cy="77" rx="13" ry="3" fill="#0005"/>
      <g class="gs-perna-a"><rect x="17" y="52" width="6" height="18" rx="3" fill="${j.pele}"/><rect x="16" y="66" width="8" height="6" rx="2" fill="#fff"/><path d="M15 71 h10 v4 h-12 q0-4 2-4z" fill="#111"/></g>
      <g class="gs-perna-b"><rect x="25" y="52" width="6" height="18" rx="3" fill="${j.pele}"/><rect x="24" y="66" width="8" height="6" rx="2" fill="#fff"/><path d="M23 71 h10 v4 h-12 q0-4 2-4z" fill="#111"/></g>
      <rect x="15" y="46" width="18" height="10" rx="3" fill="${c2}"/>
      <rect x="7" y="27" width="6" height="16" rx="3" fill="${j.pele}" transform="rotate(14 10 27)"/><rect x="35" y="27" width="6" height="16" rx="3" fill="${j.pele}" transform="rotate(-14 38 27)"/>
      <path d="M13 26 Q24 22 35 26 L36 48 Q24 51 12 48 Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
      <path d="M8 27 L14 25 L15 33 L9 34 Z M40 27 L34 25 L33 33 L39 34 Z" fill="${c1}" stroke="${c2}" stroke-width="1"/>
      <text x="24" y="42" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="12" fill="#fff" stroke="${c2}" stroke-width=".6">${j.num}</text>
      <rect x="21" y="20" width="6" height="6" fill="${j.pele}"/>
      <circle cx="24" cy="14" r="10" fill="${j.pele}"/>
      <circle cx="20.5" cy="15" r="1.4" fill="#222"/><circle cx="27.5" cy="15" r="1.4" fill="#222"/><path d="M21 19.5 Q24 21.5 27 19.5" stroke="#9a4a3a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      ${cab}
    </svg>`;
  }
  const goleiroSVG = () => `<svg viewBox="0 0 48 80" class="gs-svg">
      <ellipse cx="24" cy="77" rx="13" ry="3" fill="#0005"/>
      <rect x="17" y="52" width="6" height="20" rx="3" fill="#6b4a3a"/><rect x="25" y="52" width="6" height="20" rx="3" fill="#6b4a3a"/>
      <rect x="15" y="46" width="18" height="10" rx="3" fill="#222"/>
      <rect x="2" y="20" width="10" height="7" rx="3" fill="#7BE04A"/><rect x="36" y="20" width="10" height="7" rx="3" fill="#7BE04A"/>
      <path d="M12 22 L13 26 L10 26 Z M36 22 L35 26 L38 26 Z" fill="#6b4a3a"/>
      <path d="M13 26 Q24 22 35 26 L36 48 Q24 51 12 48 Z" fill="#2ECC71" stroke="#1a7a43" stroke-width="1.5"/>
      <circle cx="24" cy="14" r="10" fill="#6b4a3a"/><path d="M14 12 Q24 0 34 12 Q24 8 14 12 Z" fill="#111"/>
      <circle cx="20.5" cy="15" r="1.4" fill="#fff"/><circle cx="27.5" cy="15" r="1.4" fill="#fff"/>
    </svg>`;

  // posições (em % da cena)
  const GOL = { x: 50, y: 13 };
  const POS = [{ x: 18, y: 80 }, { x: 80, y: 62 }, { x: 34, y: 44 }];
  const MARCA = { x: 50, y: 34 }; // onde a bola para pro chute

  async function jogar(cena, variante, { pulou = () => false, som = () => {} } = {}) {
    const v = ['normal', 'lendaria', 'ultra'].includes(variante) ? variante : 'normal';
    cena.className = `gol-summon v-${v}`;
    cena.innerHTML = `
      <div class="gs-ceu">${v === 'ultra' ? '<i class="gs-racha"></i><i class="gs-racha r2"></i>' : ''}<i class="gs-refletor e"></i><i class="gs-refletor d"></i><div class="gs-torcida"></div></div>
      <div class="gs-campo"><i class="gs-linhas"></i><i class="gs-area"></i><i class="gs-circulo"></i></div>
      <div class="gs-gol"><i class="gs-rede"></i><i class="gs-trave"></i>${v === 'ultra' ? '<i class="gs-portal"></i>' : ''}</div>
      <div class="gs-goleiro" style="left:${GOL.x}%;top:${GOL.y + 9}%">${goleiroSVG()}</div>
      ${ELENCO.map((j, i) => `<div class="gs-jog j${i}" style="left:${POS[i].x}%;top:${POS[i].y}%">${jogadorSVG(j, v)}<span class="gs-nome">${j.nome}</span></div>`).join('')}
      <div class="gs-bola" style="left:${POS[0].x + 4}%;top:${POS[0].y + 7}%"><i></i></div>
      ${v === 'ultra' ? '<i class="gs-fenda"></i>' : ''}
      <div class="gs-dica"><b>${v === 'ultra' ? 'Chute pro multiverso!' : v === 'lendaria' ? 'É contigo! Faz o golaço!' : 'Arraste a bola pro gol!'}</b><i class="gs-dedo">👆</i></div>
      <div class="gs-gooool"></div>
      <div class="gs-confetes"></div>`;
    const $ = (s) => cena.querySelector(s);
    const bola = $('.gs-bola'), jogs = [...cena.querySelectorAll('.gs-jog')];
    const rapido = () => pulou();
    const T = (ms) => (rapido() ? 1 : ms);

    // anima a bola de um ponto a outro (com arco opcional)
    const passe = (de, para, ms, arco = 0) => {
      const meioY = (de.y + para.y) / 2 - arco;
      const a = bola.animate([
        { left: `${de.x}%`, top: `${de.y}%`, transform: 'translate(-50%,-50%) scale(1)' },
        { left: `${(de.x + para.x) / 2}%`, top: `${meioY}%`, transform: `translate(-50%,-50%) scale(${1 + arco / 40})`, offset: 0.5 },
        { left: `${para.x}%`, top: `${para.y}%`, transform: 'translate(-50%,-50%) scale(1)' },
      ], { duration: T(ms), easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'forwards' });
      return a.finished.catch(() => {});
    };
    const correr = (i, para, ms) => jogs[i].animate([{ left: jogs[i].style.left, top: jogs[i].style.top }, { left: `${para.x}%`, top: `${para.y}%` }], { duration: T(ms), easing: 'ease-in-out', fill: 'forwards' })
      .finished.then(() => { jogs[i].style.left = `${para.x}%`; jogs[i].style.top = `${para.y}%`; }).catch(() => {});
    const chutar = (i) => { jogs[i].classList.remove('chuta'); void jogs[i].offsetWidth; jogs[i].classList.add('chuta'); som('golpe'); };
    const pe = (i, dx = 4, dy = 7) => { const r = jogs[i].style; return { x: parseFloat(r.left) + dx, y: parseFloat(r.top) + dy }; };

    cena.classList.add('entra');
    await espera(T(500));
    // a jogada (cada variação tem a sua)
    jogs.forEach((j) => j.classList.add('corre'));
    if (v === 'normal') {
      chutar(0); const c1 = correr(1, { x: 72, y: 54 }, 700); await passe(pe(0), { x: 76, y: 61 }, 700, 4); await c1;
      chutar(1); const c2 = correr(2, { x: 42, y: 40 }, 700); await passe({ x: 76, y: 61 }, { x: 46, y: 47 }, 700, 6); await c2;
      chutar(2); await passe({ x: 46, y: 47 }, MARCA, 600, 3);
    } else if (v === 'lendaria') {
      chutar(0); const c1 = correr(1, { x: 70, y: 56 }, 650); await passe(pe(0), { x: 74, y: 63 }, 650, 4); await c1;
      cena.classList.add('fogo');
      chutar(1); som('esquiva'); const c2 = correr(2, { x: 44, y: 38 }, 900); await passe({ x: 74, y: 63 }, { x: 48, y: 45 }, 900, 26); await c2; // lençol
      chutar(2); jogs[2].classList.add('calcanhar'); await passe({ x: 48, y: 45 }, { x: 60, y: 50 }, 380, 2); // calcanhar
      const c3 = correr(1, { x: 64, y: 44 }, 300); await c3;
      chutar(1); await passe({ x: 60, y: 50 }, MARCA, 500, 6);
    } else {
      cena.classList.add('racha');
      som('carga');
      chutar(0); await passe(pe(0), { x: 50, y: 66 }, 600, 6); // a bola entra na fenda...
      cena.classList.add('fenda-abre'); bola.classList.add('some'); som('portal');
      await espera(T(450));
      bola.classList.remove('some'); bola.classList.add('prisma'); // ...e sai do outro lado, colorida
      const c2 = correr(2, { x: 40, y: 40 }, 650);
      await passe({ x: 78, y: 56 }, { x: 74, y: 58 }, 120, 0);
      chutar(1); await passe({ x: 74, y: 58 }, { x: 44, y: 46 }, 650, 10); await c2;
      chutar(2); await passe({ x: 44, y: 46 }, MARCA, 520, 4);
    }
    jogs.forEach((j) => j.classList.remove('corre'));

    // o goleiro fica balançando; agora é com você
    cena.classList.add('sua-vez');
    const chute = await new Promise((ok) => {
      if (rapido()) return ok({ dx: 0 });
      let arrastando = null, feito = false;
      const caixa = () => cena.getBoundingClientRect();
      const mover = (e) => {
        if (!arrastando) return;
        const b = caixa();
        const x = Math.max(8, Math.min(92, ((e.clientX - b.left) / b.width) * 100));
        const y = Math.max(16, Math.min(60, ((e.clientY - b.top) / b.height) * 100));
        bola.style.left = `${x}%`; bola.style.top = `${y}%`;
        arrastando.ux = x; arrastando.uy = y;
        if (y < MARCA.y - 7) soltar(e); // passou da linha: chuta sozinho
      };
      const soltar = () => {
        if (!arrastando || feito) return;
        const { ux = MARCA.x, uy = MARCA.y } = arrastando;
        arrastando = null;
        if (uy < MARCA.y - 3 || Math.abs(ux - MARCA.x) < 4) { feito = true; limpar(); ok({ dx: Math.max(-14, Math.min(14, (ux - MARCA.x) * 1.6)), x: ux, y: uy }); }
        else { bola.animate([{ left: `${ux}%`, top: `${uy}%` }, { left: `${MARCA.x}%`, top: `${MARCA.y}%` }], { duration: 200, fill: 'forwards' }); }
      };
      const tocar = (e) => { e.preventDefault(); arrastando = { ux: MARCA.x, uy: MARCA.y }; cena.classList.add('arrastando'); bola.getAnimations().forEach((a) => a.cancel()); bola.style.left = `${MARCA.x}%`; bola.style.top = `${MARCA.y}%`; };
      const limpar = () => { bola.removeEventListener('pointerdown', tocar); window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); clearInterval(vigia); };
      bola.addEventListener('pointerdown', tocar);
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
      // se apertar "Pular" no meio, chuta sozinho
      const vigia = setInterval(() => { if (rapido() && !feito) { feito = true; limpar(); ok({ dx: 0 }); } }, 150);
    });
    cena.classList.remove('sua-vez', 'arrastando');
    // GOL! (o goleiro pula pro lado errado)
    const alvo = { x: GOL.x + chute.dx, y: GOL.y + 2 };
    cena.querySelector('.gs-goleiro').classList.add(chute.dx > 0 ? 'pula-e' : 'pula-d');
    som('tiro');
    await bola.animate([
      { left: `${chute.x != null ? chute.x : MARCA.x}%`, top: `${chute.y != null ? chute.y : MARCA.y}%`, transform: 'translate(-50%,-50%) scale(1)' },
      { left: `${alvo.x}%`, top: `${alvo.y}%`, transform: 'translate(-50%,-50%) scale(0.55)' },
    ], { duration: T(v === 'normal' ? 380 : 300), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    cena.classList.add('gol');
    som(v === 'normal' ? 'coroa' : 'explosao');
    try { navigator.vibrate && navigator.vibrate(v === 'ultra' ? [60, 40, 60, 40, 200] : [80, 40, 120]); } catch (e) { /* nada */ }
    const txt = { normal: 'GOOOL!', lendaria: 'GOLAÇO!', ultra: 'GOL DO MULTIVERSO!' }[v];
    cena.querySelector('.gs-gooool').innerHTML = txt.split('').map((ch, k) => `<span style="--k:${k}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    const cores = { normal: ['#2F6BFF', '#fff', '#7BE04A'], lendaria: ['#FFC53D', '#fff', '#FF8A00'], ultra: ['#FF5CF4', '#5CE1FF', '#7CFF8A', '#FFE45C'] }[v];
    cena.querySelector('.gs-confetes').innerHTML = Array.from({ length: 40 }, (_, k) => `<i style="--x:${Math.round(Math.random() * 100)}%;--d:${(Math.random() * 0.6).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;--c:${cores[k % cores.length]}"></i>`).join('');
    jogs.forEach((j, i) => setTimeout(() => j.classList.add('comemora'), i * 90));
    await espera(T(v === 'normal' ? 1300 : 1600));
  }

  return { jogar };
})();
