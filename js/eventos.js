// Modos de evento (mudam todo dia) + Festival das Quíntuplas (o desafio que dá a Nino Nakano).
const Eventos = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  const MODOS = {
    triplo: { nome: 'Elixir Triplo', ic: '⚡', cor: 'roxo', desc: 'O elixir enche 3x mais rápido o jogo inteiro. Caos total!', cfg: { elixirMult: 3 } },
    subita: { nome: 'Morte Súbita', ic: '💀', cor: 'vermelho', desc: '2 minutos, elixir em dobro e a primeira torre derrubada vence.', cfg: { subita: true } },
    draft: { nome: 'Draft', ic: '🎲', cor: 'verde', desc: 'Escolha 1 de 2 cartas, 8 vezes. A que você não pegar vai pro rival! Tudo no nível 7.', cfg: { nivel: 7 } },
    lendarias: { nome: 'Só Lendárias', ic: '👑', cor: 'dourado', desc: 'Os dois decks são 8 lendárias sorteadas, todas no nível 7.', cfg: { nivel: 7 } },
    espelho: { nome: 'Espelho', ic: '🪞', cor: 'azul', desc: 'O rival joga com o SEU deck, nos mesmos níveis. Quem joga melhor?', cfg: {} },
    turbo: { nome: 'Turbo', ic: '🏎️', cor: 'laranja', desc: 'Todas as tropas andam 40% e atacam 30% mais rápido.', cfg: { turbo: true } },
  };
  const RODIZIO = ['triplo', 'draft', 'subita', 'lendarias', 'turbo', 'espelho'];
  const diaN = () => { const t = new Date(); return Math.floor((t.getTime() - t.getTimezoneOffset() * 60000) / 86400000); };
  const modosDeHoje = () => { const n = diaN(); return [RODIZIO[(n * 2) % RODIZIO.length], RODIZIO[(n * 2 + 1) % RODIZIO.length]]; };
  const horasAteAmanha = () => 24 - new Date().getHours();

  // ---------- Festival das Quíntuplas (Desafio da Nino) ----------
  const NINO = 'nino_nakano';
  const FIM_FESTIVAL = new Date(2026, 10, 26, 23, 59, 59); // 26/11/2026
  const VITORIAS = 5, VIDAS = 3, PRECO_NOVA = 10;
  const PREMIOS = [{ ouro: 300 }, { gemas: 20 }, { bau: 'prata' }, { gemas: 40 }, { carta: NINO }];
  const festivalAberto = () => Date.now() < FIM_FESTIVAL.getTime();
  const diasFestival = () => Math.max(0, Math.ceil((FIM_FESTIVAL.getTime() - Date.now()) / 86400000));
  function nino() {
    const d = Estado.d;
    if (!d.festivalNino) d.festivalNino = { v: 0, l: 0, tentativas: 0, ativo: false };
    return d.festivalNino;
  }
  const txtPremio = (p) => p.ouro ? `${p.ouro} 🪙` : p.gemas ? `${p.gemas} 💎` : p.bau ? `Baú de ${p.bau}` : p.carta ? 'NINO!' : '';

  // ---------- montar o deck de cada modo ----------
  const embaralhar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const pool = (filtro = () => true) => Estado.catalogo().filter((c) => !c.token && !c.exclusivo && filtro(c));

  function draft(pronto) {
    const cartas = embaralhar(pool()).slice(0, 16);
    const meu = [], rival = [];
    let r = 0;
    const md = UI.modal({ titulo: '🎲 Draft', classe: 'modal-draft', html: '<div id="draft-corpo"></div>', botoes: [{ texto: 'Desistir' }] });
    const corpo = md.el.querySelector('#draft-corpo');
    const passo = () => {
      if (r >= 8) { md.fechar(); pronto(meu.map((c) => c.id), rival.map((c) => c.id)); return; }
      const par = [cartas[r * 2], cartas[r * 2 + 1]];
      corpo.innerHTML = `<p class="draft-dica">Rodada <b>${r + 1}/8</b> · escolha uma. A outra vai pro rival!</p>
        <div class="draft-par">${par.map((c, i) => `<button class="draft-op" data-i="${i}">${Cartas.html(c, { mini: true })}<b>${esc(c.nome)}</b></button>`).join('<span class="draft-vs">ou</span>')}</div>
        <div class="draft-decks"><div><small>Seu deck</small><div class="draft-mini">${meu.map((c) => `<img src="${Cartas.arte(c)}" alt="" />`).join('')}</div></div>
        <div><small>Rival</small><div class="draft-mini rival">${rival.map((c) => `<img src="${Cartas.arte(c)}" alt="" />`).join('')}</div></div></div>`;
      corpo.querySelectorAll('.draft-op').forEach((b) => (b.onclick = () => {
        const i = +b.dataset.i;
        meu.push(par[i]); rival.push(par[1 - i]); r++;
        passo();
      }));
    };
    passo();
  }

  // começa uma batalha de evento
  function jogarModo(id, iniciar) {
    const m = MODOS[id];
    if (!m) return;
    const ev = { id, nome: m.nome, ...m.cfg };
    if (id === 'draft') return draft((meu, rival) => iniciar({ ...ev, deck: meu, deckIA: rival }));
    if (id === 'lendarias') {
      const l = embaralhar(pool((c) => c.raridade === 'lendaria'));
      ev.deck = l.slice(0, 8).map((c) => c.id);
      ev.deckIA = (l.length >= 16 ? l.slice(8, 16) : embaralhar(l).slice(0, 8)).map((c) => c.id);
    }
    if (id === 'espelho') {
      ev.deckIA = [...Estado.d.deck];
      ev.niveisV = Object.fromEntries(Estado.d.deck.map((c) => [c, Estado.d.colecao[c].nivel]));
    }
    iniciar(ev);
  }
  function jogarFestival(iniciar) {
    const f = nino();
    if (!festivalAberto()) { UI.toast('O festival já acabou 😢'); return; }
    if (!f.ativo) {
      // primeira tentativa é grátis; depois custa gemas
      if (f.tentativas > 0) {
        if (Estado.d.gemas < PRECO_NOVA) { UI.toast(`Precisa de ${PRECO_NOVA} gemas para tentar de novo`); return; }
        Estado.d.gemas -= PRECO_NOVA;
      }
      f.ativo = true; f.v = 0; f.l = 0; f.tentativas++;
      Estado.salvar();
    }
    if (f.l >= VIDAS) { f.ativo = false; Estado.salvar(); UI.toast('Suas vidas acabaram 💔'); return; }
    // a vida já sai antes da batalha: sair/fechar o app no meio conta como derrota.
    // Se vencer ou empatar, a vida volta no fim.
    f.l++; f.emJogo = true;
    Estado.salvar();
    // cada vitória deixa o rival mais esperto
    iniciar({ id: 'festival', nome: `Festival das Quíntuplas · ${f.v + 1}ª batalha`, dif: Math.min(5, 2 + f.v), festival: true });
  }

  // ---------- Caça aos Tokens (evento fixo) ----------
  const LIMITE_TOKENS_DIA = 300;
  const TROCAS = [{ t: 100, g: 10 }, { t: 450, g: 50, tag: '+11%' }, { t: 850, g: 100, tag: '+18%' }];
  const dia = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
  function tokensHoje() {
    const d = Estado.d;
    if (!d.tokensDia || d.tokensDia.dia !== dia()) d.tokensDia = { dia: dia(), qtd: 0 };
    return d.tokensDia;
  }
  // ganha tokens respeitando o limite do dia
  function ganharTokens(q) {
    const h = tokensHoje();
    const g = Math.max(0, Math.min(q, LIMITE_TOKENS_DIA - h.qtd));
    h.qtd += g;
    Estado.d.tokens = (Estado.d.tokens || 0) + g;
    Estado.salvar();
    return g;
  }
  function jogarTokens(iniciar) {
    if (tokensHoje().qtd >= LIMITE_TOKENS_DIA) UI.toast('Você já pegou todos os tokens de hoje! Pode jogar, mas só ganha ouro 😉');
    iniciar({ id: 'tokens', nome: 'Caça aos Tokens', tokens: true, elixirMult: 1.25 });
  }
  function trocarTokens(depois) {
    const d = Estado.d;
    const md = UI.modal({
      titulo: '🪙 Trocar tokens',
      classe: 'modal-tokens',
      html: `<div class="tk-saldo"><img src="assets/ui/token.svg" alt="" /><b>${UI.fmt(d.tokens || 0)}</b><small>tokens</small></div>
        <div class="tk-trocas">${TROCAS.map((x, i) => `<button class="tk-troca${(d.tokens || 0) < x.t ? ' travado' : ''}" data-i="${i}">
          ${x.tag ? `<em>${x.tag}</em>` : ''}<span><img src="assets/ui/token.svg" alt="" />${x.t}</span><i>➜</i><span><i class="ic-gema"></i>${x.g}</span></button>`).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
    md.el.querySelectorAll('.tk-troca').forEach((b) => (b.onclick = () => {
      const x = TROCAS[+b.dataset.i];
      if ((d.tokens || 0) < x.t) { UI.toast(`Faltam ${x.t - (d.tokens || 0)} tokens`); return; }
      d.tokens -= x.t; d.gemas += x.g; Estado.salvar();
      UI.toast(`+${x.g} 💎!`);
      md.fechar();
      if (depois) depois();
      if (window.MenuAPI) window.MenuAPI.tudo();
    }));
  }

  // ---------- tela (dentro da aba Eventos) ----------
  function html() {
    const f = nino();
    const temNino = Estado.tem(NINO);
    const hoje = modosDeHoje();
    const pips = Array.from({ length: VITORIAS }, (_, i) => `<span class="fn-pip${i < f.v ? ' ok' : ''}${i === VITORIAS - 1 ? ' final' : ''}" title="${txtPremio(PREMIOS[i])}">${i === VITORIAS - 1 ? '<img src="assets/cartas/nino_nakano_medalhao.png" alt="" />' : i + 1}</span>`).join('');
    const vidas = Array.from({ length: VIDAS }, (_, i) => `<i class="${i < VIDAS - f.l ? '' : 'perdida'}">❤️</i>`).join('');
    const botaoF = !festivalAberto() ? '<div class="selo">Encerrado</div>'
      : f.ativo ? `<button class="selo botao fn-jogar" id="fn-jogar">Jogar ${f.v + 1}ª batalha</button>`
      : `<button class="selo botao fn-jogar" id="fn-jogar">${f.tentativas ? `Tentar de novo · ${PRECO_NOVA} 💎` : 'Começar (grátis)'}</button>`;
    const festival = `<div class="banner-nino">
        <video src="assets/cartas/videos/nino_nakano.mp4" autoplay muted loop playsinline></video>
        <div class="bn-conteudo">
          <small class="bn-tag">EVENTO ESPECIAL · ${diasFestival()} dia${diasFestival() === 1 ? '' : 's'}</small>
          <b>🎀 Festival das Quíntuplas</b>
          <span>${temNino ? 'Você já tem a <b>Nino Nakano</b>! Jogue de novo pelos prêmios.' : `Vença <b>${VITORIAS}</b> batalhas antes de perder ${VIDAS} e ganhe a <b>Nino Nakano</b> (Lendária só de evento, nível 5)!`}</span>
          <div class="fn-pips">${pips}</div>
          <div class="fn-linha"><div class="fn-vidas">${vidas}</div>${botaoF}</div>
          <button class="fn-ver" id="fn-ver">Ver a carta da Nino</button>
        </div>
      </div>`;
    const modos = hoje.map((id) => { const m = MODOS[id]; return `<div class="evento modo-ev ${m.cor}"><span class="modo-ic">${m.ic}</span><div><b>${m.nome}</b><span>${m.desc}</span><small class="modo-tempo">Troca em ${horasAteAmanha()}h · vitória = 60 🪙</small></div><button class="selo botao" data-modo="${id}">Jogar</button></div>`; }).join('');
    const h = tokensHoje();
    const tokens = `<div class="evento ev-tokens"><img class="ev-tk-ic" src="assets/ui/token.svg" alt="" /><div><b>Caça aos Tokens</b>
        <span>Batalhas com elixir mais rápido. Vitória = 30 tokens (+5 por coroa), empate 15, derrota 8. Troque os tokens por gemas!</span>
        <div class="ev-barra"><i style="width:${(h.qtd / LIMITE_TOKENS_DIA) * 100}%"></i><small>${h.qtd}/${LIMITE_TOKENS_DIA} hoje</small></div>
        <small class="modo-tempo">Você tem <b>${UI.fmt(Estado.d.tokens || 0)}</b> tokens</small></div>
        <div class="ev-tk-botoes"><button class="selo botao" id="tk-jogar">Jogar</button><button class="selo botao tk-trocar" id="tk-trocar">Trocar</button></div></div>`;
    return `${festival}${tokens}<div class="eventos-cab">🎪 Modos de hoje</div>${modos}`;
  }
  function ligar(raiz, { iniciar, verCarta }) {
    raiz.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => jogarModo(b.dataset.modo, iniciar)));
    const j = raiz.querySelector('#fn-jogar');
    if (j) j.onclick = () => jogarFestival(iniciar);
    const tj = raiz.querySelector('#tk-jogar');
    if (tj) tj.onclick = () => jogarTokens(iniciar);
    const tt = raiz.querySelector('#tk-trocar');
    if (tt) tt.onclick = () => trocarTokens(() => { if (window.MenuAPI) window.MenuAPI.tudo(); });
    const v = raiz.querySelector('#fn-ver');
    if (v) v.onclick = () => verCarta(Estado.carta(NINO));
  }

  // ---------- fim de uma batalha de evento ----------
  function revelarNino(c, tag = 'LENDÁRIA EXCLUSIVA DE EVENTO', fala = '"Hmph… n-não é como se eu quisesse entrar no seu deck… mas já que você venceu, eu vou."') {
    if (!c || document.querySelector('.revela-nino')) return;
    const el = document.createElement('div');
    el.className = 'revela-evo revela-nino';
    el.innerHTML = `<div class="re-raios"></div><div class="re-conteudo">
        <small>${tag}</small>
        <div class="rn-palco">${Cartas.html(c, { mini: true })}</div>
        <b>${esc(c.nome)}</b>
        <p>${fala}</p>
        <button class="btn-modal principal">Bem-vinda, Nino! 🎀</button></div>`;
    $('app').appendChild(el);
    try { navigator.vibrate && navigator.vibrate([80, 50, 160]); } catch (e) { /* nada */ }
    el.querySelector('button').onclick = () => { el.classList.add('sumir'); setTimeout(() => el.remove(), 300); };
  }
  function darPremio(p, mostrarBau) {
    const d = Estado.d;
    if (p.ouro) d.ouro += p.ouro;
    if (p.gemas) d.gemas += p.gemas;
    Estado.salvar();
    if (p.bau) mostrarBau(p.bau, Estado.abrirBau(p.bau));
    if (p.carta) {
      if (Estado.tem(p.carta)) { d.gemas += 100; Estado.salvar(); UI.toast('Você já tinha a Nino: +100 💎'); }
      else revelarNino(Ranque.darEvolucao(p.carta));
    }
  }
  function fim(r, { mostrarBau, tudo }) {
    const ev = r.evento || {};
    const ganhou = r.resultado === 'vitoria';
    const d = Estado.d;
    if (ev.festival) {
      const f = nino();
      const contava = f.emJogo;
      f.emJogo = false;
      if (contava && r.resultado !== 'derrota') f.l = Math.max(0, f.l - 1); // devolve a vida
      if (!contava && r.resultado === 'derrota') f.l++;
      if (ganhou) {
        const premio = PREMIOS[Math.min(f.v, PREMIOS.length - 1)];
        f.v++;
        if (f.v >= VITORIAS) { f.ativo = false; f.completo = true; }
        Estado.salvar();
        // o prêmio é entregue NA HORA (antes dependia de tocar em "Pegar")
        const msg = f.v >= VITORIAS ? 'Você completou o Festival das Quíntuplas! 🎀' : `Vitória ${f.v}/${VITORIAS}! Você ganhou <b>${txtPremio(premio)}</b>`;
        UI.modal({ titulo: '🎀 Venceu!', html: `<p class="ev-res">${msg}</p>`, botoes: [{ texto: 'Oba!', classe: 'principal' }] });
        setTimeout(() => { darPremio(premio, mostrarBau); tudo(); }, 120);
        return;
      }
      const acabou = f.l >= VIDAS;
      if (acabou) f.ativo = false;
      Estado.salvar();
      UI.modal({
        titulo: acabou ? '💔 Fim do desafio' : r.resultado === 'empate' ? 'Empate!' : 'Derrota',
        html: `<p class="ev-res">${acabou ? `Você chegou a <b>${f.v}</b> vitória${f.v === 1 ? '' : 's'}. Dá pra tentar de novo por ${PRECO_NOVA} 💎!` : r.resultado === 'empate' ? 'Empate não conta. Bora de novo!' : `Ainda restam <b>${VIDAS - f.l}</b> vida${VIDAS - f.l === 1 ? '' : 's'}.`}</p>`,
        botoes: [{ texto: 'OK', classe: 'principal', acao: () => tudo() }],
      });
      return;
    }
    // modos normais de evento: um pouco de ouro (e tokens), sem troféus
    const ouro = ganhou ? 60 : r.resultado === 'empate' ? 30 : 15;
    d.ouro += ouro;
    const tk = ev.tokens ? ganharTokens(ganhou ? 30 + (r.coroas || 0) * 5 : r.resultado === 'empate' ? 15 : 8) : ganhou ? ganharTokens(10) : 0;
    if (ganhou) d.vitorias++; else if (r.resultado === 'derrota') d.derrotas++;
    Estado.salvar();
    UI.modal({
      titulo: ganhou ? `🎉 Vitória no ${esc(ev.nome)}!` : r.resultado === 'empate' ? 'Empate!' : `Derrota no ${esc(ev.nome)}`,
      html: `<p class="ev-res">${r.coroas} 👑 x ${r.coroasInimigo} 👑<br />+${ouro} de ouro${tk ? `<br /><img class="ev-tk-mini" src="assets/ui/token.svg" alt="" /> +${tk} tokens` : ev.tokens ? '<br /><small>Limite de tokens de hoje atingido</small>' : ''}</p>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => tudo() }],
    });
  }

  // ---------- conferências (rodam sempre que o menu atualiza) ----------
  const SAMUEL = 'twJXL5kpGtUVwrx7Br3xCq26ZDG3';
  const ENZO = 'EwnFPrCPFUMawnc6dttsQQ98yII2';
  let conferindo = false;
  function conferir() {
    if (conferindo || !Estado.d) return;
    const bat = Batalha._estado();
    if (bat && !bat.acabou) return;
    conferindo = true;
    try {
      const d = Estado.d, f = nino();
      // saiu no meio de uma batalha do festival (fechou o app/recarregou): a vida já foi descontada
      if (f.emJogo) {
        f.emJogo = false;
        if (f.l >= VIDAS) f.ativo = false;
        Estado.salvar();
        UI.toast('Você saiu no meio de uma batalha do Festival: contou como derrota 💔');
      }
      // completou o festival mas a Nino não veio (bug antigo do botão "Pegar")
      if ((f.completo || f.v >= VITORIAS) && !Estado.tem(NINO)) {
        f.completo = true; f.ativo = false;
        setTimeout(() => { if (!Estado.tem(NINO)) revelarNino(Ranque.darEvolucao(NINO)); }, 900);
      }
      // reparo do Enzo: o bug do carregamento apagou cartas dele. Volta tudo (nível 5 no mínimo) + compensação.
      if ((Conta.uid && Conta.uid()) === ENZO && !(d.presentesEspeciais || []).includes('reparo-enzo')) {
        d.presentesEspeciais = [...(d.presentesEspeciais || []), 'reparo-enzo'];
        let voltaram = 0;
        for (const c of Estado.catalogo()) {
          if (c.token) continue;
          const col = d.colecao[c.id] || (d.colecao[c.id] = { nivel: 1, copias: 0, tem: false });
          if (!col.tem) { col.tem = true; col.nivel = Math.max(col.nivel || 1, 5); voltaram++; }
        }
        for (const c of Estado.catalogo()) if (d.deck.length < 8 && !d.deck.includes(c.id) && Estado.tem(c.id) && !c.token) d.deck.push(c.id);
        d.ouro += 15000; d.gemas += 800; Estado.darCoringa('universal', 60);
        Estado.salvar();
        if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {});
        setTimeout(() => UI.modal({
          titulo: '🛠️ Suas cartas voltaram!',
          html: `<p>Um bug no carregamento do jogo apagou cartas da sua conta. Desculpa! 💜</p><p><b>${voltaram} cartas</b> voltaram (no nível 5 ou mais) e você ganhou de compensação:<br><b>15.000 🪙 · 800 💎 · 60 Coringas Universais</b></p><p class="aviso">Já arrumei o bug pra isso não acontecer de novo.</p>`,
          botoes: [{ texto: 'Valeu! 🎉', classe: 'principal', acao: () => { if (window.MenuAPI) window.MenuAPI.tudo(); } }],
        }), 1100);
      }
      // presente da criadora pro Samuel (foi prejudicado pelo bug do festival)
      const uid = Conta.uid && Conta.uid();
      if (uid === SAMUEL && !(d.presentesEspeciais || []).includes('nino-samuel')) {
        d.presentesEspeciais = [...(d.presentesEspeciais || []), 'nino-samuel'];
        const tinha = Estado.tem(NINO);
        const c = Ranque.darEvolucao(NINO);
        if (!tinha) d.colecao[NINO].nivel = 4;
        else d.colecao[NINO].nivel = Math.max(4, d.colecao[NINO].nivel);
        Estado.salvar();
        if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {});
        setTimeout(() => revelarNino(c, 'PRESENTE DA CRIADORA', 'Desculpa pelo bug do festival! Toma a Nino, já no nível 4 💜'), 900);
      }
    } catch (e) { console.warn('Eventos.conferir', e); }
    conferindo = false;
  }

  return { html, ligar, fim, conferir, trocarTokens, ganharTokens, tokensHoje, MODOS, modosDeHoje, jogarModo, jogarFestival, nino };
})();
