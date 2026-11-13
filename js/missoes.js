// Missões diárias e semanais.
// Cada dia sorteia 3 missões diárias (iguais para todo mundo naquele dia) e cada semana 3 semanais.
// O resto do jogo só chama Missoes.contar('tipo', n) quando algo acontece.
const Missoes = (() => {
  const DIARIAS = [
    { tipo: 'batalhas', alvo: 3, txt: 'Jogue 3 batalhas', premio: { ouro: 150 } },
    { tipo: 'vitorias', alvo: 2, txt: 'Vença 2 batalhas', premio: { ouro: 250 } },
    { tipo: 'cartas', alvo: 25, txt: 'Jogue 25 cartas', premio: { ouro: 180 } },
    { tipo: 'coroas', alvo: 5, txt: 'Ganhe 5 coroas', premio: { gemas: 10 } },
    { tipo: 'habilidades', alvo: 4, txt: 'Use 4 habilidades especiais', premio: { ouro: 200 } },
    { tipo: 'emotes', alvo: 3, txt: 'Mande 3 emotes na batalha', premio: { ouro: 100 } },
    { tipo: 'gokus', alvo: 5, txt: 'Jogue 5 cartas de Goku', premio: { ouro: 200 } },
    { tipo: 'evento', alvo: 2, txt: 'Jogue 2 batalhas de evento', premio: { gemas: 12 } },
    { tipo: 'feiticos', alvo: 4, txt: 'Use 4 feitiços', premio: { ouro: 150 } },
    { tipo: 'torres', alvo: 3, txt: 'Derrube 3 torres', premio: { ouro: 220 } },
  ];
  const SEMANAIS = [
    { tipo: 'vitorias', alvo: 15, txt: 'Vença 15 batalhas', premio: { bau: 'ouro' } },
    { tipo: 'coroas', alvo: 40, txt: 'Ganhe 40 coroas', premio: { gemas: 60 } },
    { tipo: 'dupla', alvo: 5, txt: 'Jogue 5 batalhas 2v2', premio: { ouro: 1200 } },
    { tipo: 'ranqueada', alvo: 5, txt: 'Vença 5 ranqueadas', premio: { gemas: 80 } },
    { tipo: 'evento', alvo: 8, txt: 'Jogue 8 batalhas de evento', premio: { bau: 'prata' } },
    { tipo: 'cartas', alvo: 200, txt: 'Jogue 200 cartas', premio: { ouro: 1500 } },
    { tipo: 'habilidades', alvo: 25, txt: 'Use 25 habilidades especiais', premio: { gemas: 50 } },
  ];
  const BONUS_DIA = { gemas: 20 }; // fez as 3 diárias

  const dois = (n) => String(n).padStart(2, '0');
  const hoje = () => { const t = new Date(); return `${t.getFullYear()}-${dois(t.getMonth() + 1)}-${dois(t.getDate())}`; };
  const semana = () => { const t = new Date(); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return `${t.getFullYear()}-${dois(t.getMonth() + 1)}-${dois(t.getDate())}`; };
  // sorteio com semente (todo mundo recebe as mesmas missões no mesmo dia)
  function sortear(chave, qtd, total) {
    let h = 0;
    for (const ch of chave) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const idx = [...Array(total).keys()];
    for (let i = idx.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx.slice(0, qtd);
  }
  function dados() {
    const d = Estado.d;
    if (!d.missoes) d.missoes = {};
    const m = d.missoes;
    if (m.dia !== hoje()) { m.dia = hoje(); m.d = sortear('d' + m.dia, 3, DIARIAS.length).map((i) => ({ i, prog: 0, pego: false })); m.bonus = false; }
    if (m.semana !== semana()) { m.semana = semana(); m.s = sortear('s' + m.semana, 3, SEMANAIS.length).map((i) => ({ i, prog: 0, pego: false })); }
    return m;
  }
  const lista = () => { const m = dados(); return [...m.d.map((x) => ({ ...x, ...DIARIAS[x.i], grupo: 'd' })), ...m.s.map((x) => ({ ...x, ...SEMANAIS[x.i], grupo: 's' }))]; };

  let avisar = null; // callback do menu (atualiza o selo)
  function contar(tipo, n = 1) {
    try { if (typeof Eventos !== 'undefined' && Eventos.contarGemas) Eventos.contarGemas(tipo, n); } catch (e) { /* nada */ }
    try {
      if (!Estado.d || !n) return;
      const m = dados();
      let completou = null;
      for (const [grupo, tab] of [['d', DIARIAS], ['s', SEMANAIS]]) {
        for (const x of m[grupo]) {
          const def = tab[x.i];
          if (def.tipo !== tipo || x.prog >= def.alvo) continue;
          x.prog = Math.min(def.alvo, x.prog + n);
          if (x.prog >= def.alvo) completou = def;
        }
      }
      Estado.salvar();
      if (completou && !document.body.classList.contains('em-batalha')) UI.toast(`📜 Missão completa: ${completou.txt}!`);
      if (avisar) avisar();
    } catch (e) { /* missões nunca podem quebrar a batalha */ }
  }
  const pendentes = () => { const m = dados(); return lista().filter((x) => x.prog >= x.alvo && !x.pego).length + (m.d.every((x) => x.pego) && !m.bonus ? 1 : 0); };

  const txtPremio = (p) => p.ouro ? `${p.ouro} 🪙` : p.gemas ? `${p.gemas} 💎` : p.bau ? `Baú de ${p.bau}` : '';
  function darPremio(p, mostrarBau) {
    const d = Estado.d;
    if (p.ouro) d.ouro += p.ouro;
    if (p.gemas) d.gemas += p.gemas;
    Estado.salvar();
    if (p.bau && mostrarBau) mostrarBau(p.bau, Estado.abrirBau(p.bau));
    else UI.toast(`+${txtPremio(p)}`);
  }

  // tela das missões (modal)
  function abrir({ mostrarBau, aoMudar } = {}) {
    const m = dados();
    const fim = (grupo) => {
      const t = new Date();
      if (grupo === 'd') { const h = 24 - t.getHours(); return `Novas em ${h}h`; }
      const dias = 7 - ((t.getDay() + 6) % 7);
      return `Novas em ${dias} dia${dias > 1 ? 's' : ''}`;
    };
    const linha = (x, k) => {
      const pronto = x.prog >= x.alvo;
      return `<div class="missao${pronto ? ' pronta' : ''}${x.pego ? ' pega' : ''}">
        <div class="missao-txt"><b>${x.txt}</b><div class="ev-barra"><i style="width:${(x.prog / x.alvo) * 100}%"></i><small>${x.prog}/${x.alvo}</small></div></div>
        ${x.pego ? '<span class="missao-ok">✓</span>' : `<button class="missao-btn${pronto ? '' : ' travado'}" data-k="${k}">${txtPremio(x.premio)}</button>`}
      </div>`;
    };
    const desenhar = (corpo) => {
      const l = lista();
      const todasD = m.d.every((x) => x.pego);
      corpo.innerHTML = `<div class="missoes">
        <div class="missoes-cab"><b>☀️ Diárias</b><small>${fim('d')}</small></div>
        ${l.filter((x) => x.grupo === 'd').map((x) => linha(x, `d${m.d.findIndex((y) => y.i === x.i)}`)).join('')}
        <div class="missao bonus${todasD ? ' pronta' : ''}${m.bonus ? ' pega' : ''}"><div class="missao-txt"><b>🎁 Bônus: termine as 3 diárias</b></div>
          ${m.bonus ? '<span class="missao-ok">✓</span>' : `<button class="missao-btn${todasD ? '' : ' travado'}" data-k="bonus">${txtPremio(BONUS_DIA)}</button>`}</div>
        <div class="missoes-cab"><b>📅 Semanais</b><small>${fim('s')}</small></div>
        ${l.filter((x) => x.grupo === 's').map((x) => linha(x, `s${m.s.findIndex((y) => y.i === x.i)}`)).join('')}
      </div>`;
      corpo.querySelectorAll('.missao-btn').forEach((b) => (b.onclick = () => {
        if (b.classList.contains('travado')) { UI.toast('Termine a missão primeiro! 💪'); return; }
        const k = b.dataset.k;
        if (k === 'bonus') { m.bonus = true; darPremio(BONUS_DIA, mostrarBau); }
        else {
          const x = m[k[0]][+k.slice(1)];
          if (!x || x.pego) return;
          const def = (k[0] === 'd' ? DIARIAS : SEMANAIS)[x.i];
          if (x.prog < def.alvo) return;
          x.pego = true;
          darPremio(def.premio, mostrarBau);
        }
        Estado.salvar();
        desenhar(corpo);
        if (aoMudar) aoMudar();
      }));
    };
    const md = UI.modal({ titulo: '📜 Missões', classe: 'modal-missoes', html: '<div id="missoes-corpo"></div>', botoes: [{ texto: 'Fechar' }] });
    desenhar(md.el.querySelector('#missoes-corpo'));
  }

  return { contar, pendentes, abrir, lista, dados, aoMudar: (f) => (avisar = f), DIARIAS, SEMANAIS };
})();
