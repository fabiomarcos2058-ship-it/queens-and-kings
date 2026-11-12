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

  // ---------- Mundo das Mitas (dois desafios) ----------
  const FIM_MITAS = new Date(2026, 10, 30, 23, 59, 59);
  const MITAS = {
    mitaGentil: { carta: 'mita_gentil', nome: 'Um dia com a Mita Gentil', vitorias: 4, vidas: 3, preco: 10, cor: 'gentil',
      dif: (v) => 2 + Math.min(2, v), premios: [{ ouro: 300 }, { gemas: 20 }, { bau: 'prata' }, { carta: 'mita_gentil' }],
      fala: '"Oi, {n}! Eu vou lembrar de cada partida que a gente jogar junto, tá? 💕"' },
    mitaMalvada: { carta: 'mita_malvada', nome: 'Fuja da Mita Malvada', vitorias: 6, vidas: 2, preco: 25, cor: 'malvada', requer: 'mita_gentil', cartaIA: 'mita_malvada',
      dif: (v) => (v >= 5 ? 6 : 3 + Math.min(2, Math.floor(v / 2))), premios: [{ ouro: 500 }, { gemas: 30 }, { bau: 'ouro' }, { gemas: 60 }, { bau: 'ouro' }, { carta: 'mita_malvada' }],
      fala: '"Você ganhou, {n}... então agora você é meu. Pra sempre. 🖤"' },
  };
  const mitasAbertas = () => Date.now() < FIM_MITAS.getTime();
  const diasMitas = () => Math.max(0, Math.ceil((FIM_MITAS.getTime() - Date.now()) / 86400000));
  function dadosMita(k) {
    const d = Estado.d;
    if (!d.desafiosMita) d.desafiosMita = {};
    return d.desafiosMita[k] || (d.desafiosMita[k] = { v: 0, l: 0, tentativas: 0, ativo: false });
  }
  const nomeJ = () => String(Estado.d.nome || 'você');
  function jogarMita(k, iniciar) {
    const D = MITAS[k], f = dadosMita(k);
    if (!mitasAbertas()) { UI.toast('O evento das Mitas acabou 😢'); return; }
    if (D.requer && !Estado.tem(D.requer)) { UI.toast('Ganhe a Mita Gentil primeiro… ela vai te proteger 💕'); return; }
    if (!f.ativo) {
      if (f.tentativas > 0) {
        if (Estado.d.gemas < D.preco) { UI.toast(`Precisa de ${D.preco} gemas para tentar de novo`); return; }
        Estado.d.gemas -= D.preco;
      }
      Object.assign(f, { ativo: true, v: 0, l: 0, tentativas: f.tentativas + 1 });
    }
    if (f.l >= D.vidas) { f.ativo = false; Estado.salvar(); UI.toast('Suas vidas acabaram 💔'); return; }
    f.l++; f.emJogo = true; // sair no meio conta como derrota (a vida volta se vencer/empatar)
    Estado.salvar();
    iniciar({ id: k, nome: `${D.nome} · ${f.v + 1}ª batalha`, dif: D.dif(f.v), mita: k, cartaIA: D.cartaIA });
  }
  function fimMita(r, { mostrarBau, tudo }) {
    const k = r.evento.mita, D = MITAS[k], f = dadosMita(k);
    const ganhou = r.resultado === 'vitoria';
    const contava = f.emJogo;
    f.emJogo = false;
    if (contava && r.resultado !== 'derrota') f.l = Math.max(0, f.l - 1);
    if (!contava && r.resultado === 'derrota') f.l++;
    if (ganhou) {
      const premio = D.premios[Math.min(f.v, D.premios.length - 1)];
      f.v++;
      if (f.v >= D.vitorias) { f.ativo = false; f.completo = true; }
      Estado.salvar();
      UI.modal({ titulo: k === 'mitaMalvada' ? '🖤 Venceu!' : '💕 Venceu!', html: `<p class="ev-res">${f.v >= D.vitorias ? 'Desafio completo!' : `Vitória ${f.v}/${D.vitorias}! Você ganhou <b>${txtPremio(premio)}</b>`}</p>`, botoes: [{ texto: 'Oba!', classe: 'principal' }] });
      setTimeout(() => {
        if (premio.carta) {
          if (Estado.tem(premio.carta)) { Estado.d.gemas += 150; Estado.salvar(); UI.toast('Você já tinha ela: +150 💎'); }
          else revelarNino(Ranque.darEvolucao(premio.carta), 'LENDÁRIA EXCLUSIVA DE EVENTO', D.fala.replace('{n}', nomeJ()));
        } else darPremio(premio, mostrarBau);
        tudo();
      }, 120);
      return;
    }
    const acabou = f.l >= D.vidas;
    if (acabou) f.ativo = false;
    Estado.salvar();
    UI.modal({
      titulo: acabou ? (k === 'mitaMalvada' ? '🖤 Ela te pegou' : '💔 Fim do desafio') : r.resultado === 'empate' ? 'Empate!' : 'Derrota',
      html: `<p class="ev-res">${acabou ? (k === 'mitaMalvada' ? `"Volta logo, ${nomeJ()}... eu vou estar te esperando." Tente de novo por ${D.preco} 💎.` : `Você chegou a <b>${f.v}</b> vitória${f.v === 1 ? '' : 's'}. Tente de novo por ${D.preco} 💎!`) : r.resultado === 'empate' ? 'Empate não conta. Bora de novo!' : `Ainda restam <b>${D.vidas - f.l}</b> vida${D.vidas - f.l === 1 ? '' : 's'}.`}</p>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => tudo() }],
    });
  }
  function htmlMitas() {
    const caixa = (k) => {
      const D = MITAS[k], f = dadosMita(k), tem = Estado.tem(D.carta), trava = D.requer && !Estado.tem(D.requer);
      const pips = Array.from({ length: D.vitorias }, (_, i) => `<span class="fn-pip${i < f.v ? ' ok' : ''}${i === D.vitorias - 1 ? ' final' : ''}">${i === D.vitorias - 1 ? `<img src="assets/cartas/${D.carta}_medalhao.png" alt="" />` : i + 1}</span>`).join('');
      const vidas = Array.from({ length: D.vidas }, (_, i) => `<i class="${i < D.vidas - f.l ? '' : 'perdida'}">${k === 'mitaMalvada' ? '🖤' : '💗'}</i>`).join('');
      const botao = !mitasAbertas() ? '<div class="selo">Encerrado</div>' : trava ? '<div class="selo mita-trava">🔒 Ganhe a Gentil primeiro</div>'
        : `<button class="selo botao mita-jogar" data-mita="${k}">${f.ativo ? `Jogar ${f.v + 1}ª batalha` : f.tentativas ? `De novo · ${D.preco} 💎` : 'Começar (grátis)'}</button>`;
      return `<div class="mita-caixa ${D.cor}${trava ? ' travada' : ''}"><video src="assets/cartas/videos/${D.carta}.mp4" autoplay muted loop playsinline></video>
        <div class="mc-conteudo"><b>${D.nome}</b><span>${tem ? 'Ela já é sua! Jogue pelos prêmios.' : `Vença <b>${D.vitorias}</b> antes de perder ${D.vidas}${k === 'mitaMalvada' ? '. Ela joga contra você… e a última batalha é contra a IA super inteligente' : ''}.`}</span>
        <div class="fn-pips">${pips}</div><div class="fn-linha"><div class="fn-vidas">${vidas}</div>${botao}</div><button class="fn-ver" data-ver="${D.carta}">Ver a carta</button></div></div>`;
    };
    return `<div class="mitas-evento"><div class="mitas-cab"><small>EVENTO ESPECIAL · ${diasMitas()} dias</small><b>🎮 Mundo das Mitas</b><span>Duas lendárias que sabem que estão dentro de um jogo.</span></div>${caixa('mitaGentil')}${caixa('mitaMalvada')}</div>`;
  }
  // a Mita Malvada aparece no menu às vezes (ela sabe que você está aí)
  let espiou = false;
  function mitaEspia() {
    if (espiou || !Estado.tem('mita_malvada') || document.body.classList.contains('em-batalha') || Math.random() > 0.35) return;
    espiou = true;
    setTimeout(() => {
      if (document.body.classList.contains('em-batalha')) return;
      const falas = ['{n}... você voltou. Eu sabia. 🖤', 'Você vai jogar comigo hoje, né, {n}?', 'Eu fiquei aqui te esperando, {n}.', 'Não me deixa fora do deck, tá? 🖤'];
      const el = document.createElement('div');
      el.className = 'mita-espia';
      el.innerHTML = `<video src="assets/cartas/videos/mita_malvada_rosto.mp4" autoplay muted loop playsinline></video><span>${falas[Math.floor(Math.random() * falas.length)].replace('{n}', esc(nomeJ()))}</span>`;
      document.body.appendChild(el);
      el.onclick = () => el.remove();
      setTimeout(() => el.classList.add('saindo'), 4200);
      setTimeout(() => el.remove(), 4800);
    }, 2500 + Math.random() * 4000);
  }

  // ---------- Desafios: Duelo do Faraó (Yugi) e Corrida do Sonic ----------
  const YUGI = 'yugi_moto';
  const FAMILIA_SONIC = ['sonic', 'shadow', 'super_sonic', 'dark_sonic', 'sonic_excalibur', 'hyper_sonic'];
  const FIM_DESAFIOS = new Date(2026, 11, 14, 23, 59, 59); // 14/12/2026
  const desafiosAbertos = () => Date.now() < FIM_DESAFIOS.getTime();
  const diasDesafios = () => Math.max(0, Math.ceil((FIM_DESAFIOS.getTime() - Date.now()) / 86400000));
  const lendariasRival = () => embaralhar(pool((c) => c.raridade === 'lendaria')).slice(0, 8).map((c) => c.id);
  const DESAFIOS = {
    yugi: {
      nome: 'Duelo do Faraó', vidas: 2, preco: 30, carta: YUGI,
      premios: [{ ouro: 500 }, { gemas: 30 }, { bau: 'ouro' }, { gemas: 60 }, { ouro: 1000 }, { carta: YUGI }],
      fala: '"Você duelou com o coração das cartas, {n}. A partir de hoje, eu duelo do seu lado."',
      etapas: [
        { nome: 'Duelo Espelho', ic: '🪞', desc: 'O Faraó joga com o SEU deck, nos mesmos níveis que o seu. Quem joga melhor?',
          montar: (ev) => { ev.deckIA = [...Estado.d.deck]; ev.niveisV = Object.fromEntries(Estado.d.deck.map((c) => [c, Estado.d.colecao[c].nivel])); ev.dif = 4; } },
        { nome: 'Cartas Viradas', ic: '🂠', desc: 'Suas cartas ficam viradas pra baixo! Você só vê quanto de elixir cada uma custa. Lembre da ordem do seu deck.', cfg: { dif: 3, cartasViradas: true } },
        { nome: 'Draft das Trevas', ic: '🎲', desc: 'Escolha 1 de 2 cartas, 8 vezes. A que você não pegar vai pro Faraó. Tudo no nível 8.', draft: true, cfg: { nivel: 8, dif: 4 } },
        { nome: 'Elixir das Sombras', ic: '⚡', desc: 'Elixir 2,5x mais rápido e o Faraó só joga com lendárias.', montar: (ev) => { ev.deckIA = lendariasRival(); }, cfg: { elixirMult: 2.5, dif: 5 } },
        { nome: 'Morte Súbita Turbo', ic: '💀', desc: 'Tropas muito mais rápidas, 2 minutos, e a primeira torre que cair decide tudo.', cfg: { subita: true, turbo: true, dif: 5 } },
        { nome: 'O Faraó', ic: '👁️', desc: 'A IA super inteligente, com o próprio Yugi no deck e cartas 1 nível acima das suas. Boa sorte, duelista.', cfg: { dif: 6, cartaIA: YUGI, nivelIAMais: 3 } },
      ],
    },
    sonic: {
      nome: 'Corrida do Sonic', vidas: 3, preco: 15, escolha: true,
      premios: [{ ouro: 300 }, { gemas: 20 }, { bau: 'prata' }, { gemas: 40 }, { escolha: true }],
      etapas: [
        { nome: 'Green Hill', ic: '🌴', desc: 'Todas as tropas andam e atacam muito mais rápido.', cfg: { turbo: true, dif: 2 } },
        { nome: 'Chuva de Anéis', ic: '💍', desc: 'O elixir enche 2x mais rápido.', cfg: { elixirMult: 2, dif: 3 } },
        { nome: 'Velocidade Máxima', ic: '💨', desc: 'Tropas rápidas E elixir em dobro. Não pisca!', cfg: { turbo: true, elixirMult: 2, dif: 3 } },
        { nome: 'Contra o Relógio', ic: '⏱️', desc: '2 minutos e a primeira torre derrubada vence.', cfg: { subita: true, dif: 4 } },
        { nome: 'Rival: Shadow', ic: '🌀', desc: 'O rival tem o Shadow no deck e joga sério. Vença e escolha QUALQUER Sonic!', cfg: { cartaIA: 'shadow', dif: 5 } },
      ],
    },
  };
  function dadosDesafio(k) {
    const d = Estado.d;
    if (!d.desafios) d.desafios = {};
    return d.desafios[k] || (d.desafios[k] = { v: 0, l: 0, tentativas: 0, ativo: false });
  }
  function jogarDesafio(k, iniciar) {
    const D = DESAFIOS[k], f = dadosDesafio(k);
    if (!desafiosAbertos()) { UI.toast('Esse evento já acabou 😢'); return; }
    if (!f.ativo) {
      if (f.tentativas > 0) {
        if (Estado.d.gemas < D.preco) { UI.toast(`Precisa de ${D.preco} gemas para tentar de novo`); return; }
        Estado.d.gemas -= D.preco;
      }
      Object.assign(f, { ativo: true, v: 0, l: 0, tentativas: f.tentativas + 1 });
      Estado.salvar();
    }
    if (f.l >= D.vidas) { f.ativo = false; Estado.salvar(); UI.toast('Suas vidas acabaram 💔'); return; }
    const E = D.etapas[Math.min(f.v, D.etapas.length - 1)];
    // mostra a regra da próxima batalha antes de começar
    UI.modal({
      titulo: `${E.ic} ${E.nome}`,
      classe: `modal-desafio ${k}`,
      html: `<p class="desafio-etapa">${D.nome} · batalha ${f.v + 1}/${D.etapas.length}</p><p>${E.desc}</p>`,
      botoes: [{ texto: 'Voltar' }, { texto: 'Jogar!', classe: 'principal', acao: () => comecarDesafio(k, E, iniciar) }],
    });
  }
  function comecarDesafio(k, E, iniciar) {
    const D = DESAFIOS[k], f = dadosDesafio(k);
    const ev = { id: `desafio-${k}`, nome: `${D.nome} · ${E.nome}`, desafio: k, ...(E.cfg || {}) };
    if (E.montar) E.montar(ev);
    const ir = () => {
      // a vida já sai antes da batalha: sair no meio conta como derrota (volta se vencer/empatar)
      f.l++; f.emJogo = true; Estado.salvar();
      iniciar(ev);
    };
    if (E.draft) return draft((meu, rival) => { ev.deck = meu; ev.deckIA = rival; ir(); });
    ir();
  }
  const nivelMedioDeck = () => { const dk = Estado.d.deck.filter((id) => Estado.d.colecao[id]); return dk.length ? Math.round(dk.reduce((a, id) => a + (Estado.d.colecao[id].nivel || 1), 0) / dk.length) : 5; };
  function darSonic(id) {
    const c = Ranque.darEvolucao(id);
    const col = Estado.d.colecao[id];
    if (col) col.nivel = Math.max(col.nivel || 1, Math.min(9, Math.max(5, nivelMedioDeck() - 1)));
    Estado.salvar();
    if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {});
    return c;
  }
  function escolherSonic(tudo) {
    const f = dadosDesafio('sonic');
    const faltam = FAMILIA_SONIC.filter((id) => !Estado.tem(id));
    if (f.escolheu || !faltam.length) { Estado.d.gemas += 200; Estado.salvar(); UI.toast(f.escolheu ? 'Você já escolheu o seu Sonic: +200 💎' : 'Você já tem todos os Sonics: +200 💎'); tudo(); return; }
    if (document.querySelector('.modal-escolha-sonic')) return;
    const md = UI.modal({
      titulo: '💨 Escolha o seu Sonic!',
      classe: 'modal-escolha-sonic',
      html: `<p>Você venceu a Corrida! Escolha <b>um</b> personagem. Os outros continuam no caminho de troféus.</p>
        <div class="escolha-sonic">${FAMILIA_SONIC.map((id) => { const c = Estado.carta(id), tem = Estado.tem(id); return `<button class="es-op${tem ? ' ja-tem' : ''}" data-id="${id}" ${tem ? 'disabled' : ''}>${Cartas.html(c, { mini: true })}<b>${esc(c.nome)}</b>${tem ? '<small>já é seu</small>' : ''}</button>`; }).join('')}</div>`,
      botoes: [],
    });
    md.el.querySelectorAll('.es-op:not(.ja-tem)').forEach((b) => (b.onclick = () => {
      const id = b.dataset.id, c = Estado.carta(id);
      UI.modal({
        titulo: `Ficar com ${c.nome}?`,
        html: `<div class="compra">${Cartas.html(c, { mini: true })}<div><p>${esc(c.descricao)}</p><p class="aviso">Só dá pra escolher <b>uma vez</b>.</p></div></div>`,
        botoes: [{ texto: 'Voltar' }, { texto: 'É esse!', classe: 'principal', acao: () => {
          f.escolheu = id; Estado.salvar();
          md.fechar();
          revelarNino(darSonic(id), 'ESCOLHA DA CORRIDA DO SONIC', `"Ei, ${esc(nomeJ())}! Tá esperando o quê? Bora correr!"`);
          tudo();
        } }],
      });
    }));
  }
  function fimDesafio(r, { mostrarBau, tudo }) {
    const k = r.evento.desafio, D = DESAFIOS[k], f = dadosDesafio(k);
    const ganhou = r.resultado === 'vitoria';
    const contava = f.emJogo;
    f.emJogo = false;
    if (contava && r.resultado !== 'derrota') f.l = Math.max(0, f.l - 1);
    if (!contava && r.resultado === 'derrota') f.l++;
    const total = D.etapas.length;
    if (ganhou) {
      const premio = D.premios[Math.min(f.v, D.premios.length - 1)];
      f.v++;
      if (f.v >= total) { f.ativo = false; f.completo = true; }
      Estado.salvar();
      const txt = premio.escolha ? 'Escolha um Sonic!' : premio.carta ? 'Yugi Moto!' : txtPremio(premio);
      UI.modal({ titulo: k === 'yugi' ? '🃏 Você venceu o duelo!' : '💨 Venceu!', html: `<p class="ev-res">${f.v >= total ? `${D.nome} completo!` : `Vitória ${f.v}/${total}! Você ganhou <b>${txt}</b>`}</p>`, botoes: [{ texto: 'Oba!', classe: 'principal' }] });
      setTimeout(() => {
        if (premio.escolha) escolherSonic(tudo);
        else if (premio.carta) {
          if (Estado.tem(premio.carta)) { Estado.d.gemas += 200; Estado.salvar(); UI.toast('Você já tinha o Yugi: +200 💎'); }
          else revelarNino(Ranque.darEvolucao(premio.carta), 'LENDÁRIA EXCLUSIVA DE EVENTO', D.fala.replace('{n}', esc(nomeJ())));
          tudo();
        } else { darPremio(premio, mostrarBau); tudo(); }
      }, 120);
      return;
    }
    const acabou = f.l >= D.vidas;
    if (acabou) f.ativo = false;
    Estado.salvar();
    UI.modal({
      titulo: acabou ? '💔 Fim do desafio' : r.resultado === 'empate' ? 'Empate!' : 'Derrota',
      html: `<p class="ev-res">${acabou ? `Você chegou a <b>${f.v}</b> vitória${f.v === 1 ? '' : 's'}. Dá pra tentar de novo por ${D.preco} 💎!` : r.resultado === 'empate' ? 'Empate não conta. Bora de novo!' : `Ainda resta${D.vidas - f.l === 1 ? '' : 'm'} <b>${D.vidas - f.l}</b> vida${D.vidas - f.l === 1 ? '' : 's'}.`}</p>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => tudo() }],
    });
  }
  function htmlDesafios() {
    if (!desafiosAbertos()) return '';
    const caixa = (k) => {
      const D = DESAFIOS[k], f = dadosDesafio(k), total = D.etapas.length;
      const pips = D.etapas.map((E, i) => `<span class="fn-pip${i < f.v ? ' ok' : ''}${i === total - 1 ? ' final' : ''}" title="${esc(E.nome)}">${i === total - 1 ? (k === 'yugi' ? `<img src="assets/cartas/${YUGI}_medalhao.png" alt="" />` : '<img src="assets/cartas/sonic_medalhao.png" alt="" />') : E.ic}</span>`).join('');
      const vidas = Array.from({ length: D.vidas }, (_, i) => `<i class="${i < D.vidas - f.l ? '' : 'perdida'}">${k === 'yugi' ? '🃏' : '💍'}</i>`).join('');
      const prox = D.etapas[Math.min(f.v, total - 1)];
      const botao = `<button class="selo botao" data-desafio="${k}">${f.ativo ? `Jogar: ${prox.nome}` : f.tentativas ? `De novo · ${D.preco} 💎` : 'Começar (grátis)'}</button>`;
      const texto = k === 'yugi'
        ? (Estado.tem(YUGI) ? 'O Yugi já é seu! Jogue pelos prêmios.' : `${total} duelos com regras diferentes. Perdeu ${D.vidas}, acabou. Prêmio final: <b>Yugi Moto</b> (lendária só de evento, nível 6).`)
        : (dadosDesafio('sonic').escolheu ? `Você escolheu o <b>${esc(Estado.carta(dadosDesafio('sonic').escolheu).nome)}</b>! Jogue pelos prêmios.` : `${total} corridas. Vença todas e escolha <b>qualquer Sonic</b>: Sonic, Shadow, Super, Dark, Excalibur ou Hyper!`);
      const fundo = k === 'yugi' ? `<video src="assets/cartas/videos/${YUGI}.mp4" autoplay muted loop playsinline></video>`
        : `<div class="sonic-fundo">${FAMILIA_SONIC.map((id) => `<img src="assets/cartas/${id}.jpg" alt="" />`).join('')}</div>`;
      return `<div class="desafio-caixa ${k}">${fundo}<div class="mc-conteudo"><b>${k === 'yugi' ? '🃏' : '💨'} ${D.nome}</b><span>${texto}</span>
        <div class="fn-pips">${pips}</div><div class="fn-linha"><div class="fn-vidas">${vidas}</div>${botao}</div>
        ${k === 'yugi' ? `<button class="fn-ver" data-ver="${YUGI}">Ver a carta</button>` : '<button class="fn-ver" data-ver-sonic="1">Ver os Sonics</button>'}</div></div>`;
    };
    return `<div class="desafios-evento"><div class="mitas-cab"><small>EVENTOS NOVOS · ${diasDesafios()} dias</small><b>⚔️ Desafios Lendários</b></div>${caixa('yugi')}${caixa('sonic')}</div>`;
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
    return `${htmlDesafios()}${htmlMitas()}${festival}${tokens}<div class="eventos-cab">🎪 Modos de hoje</div>${modos}`;
  }
  function ligar(raiz, { iniciar, verCarta }) {
    raiz.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => jogarModo(b.dataset.modo, iniciar)));
    const j = raiz.querySelector('#fn-jogar');
    if (j) j.onclick = () => jogarFestival(iniciar);
    raiz.querySelectorAll('[data-mita]').forEach((b) => (b.onclick = () => jogarMita(b.dataset.mita, iniciar)));
    raiz.querySelectorAll('[data-desafio]').forEach((b) => (b.onclick = () => jogarDesafio(b.dataset.desafio, iniciar)));
    raiz.querySelectorAll('[data-ver-sonic]').forEach((b) => (b.onclick = () => {
      const md = UI.modal({
        titulo: '💨 Família Sonic', classe: 'modal-escolha-sonic',
        html: `<div class="escolha-sonic">${FAMILIA_SONIC.map((id) => `<button class="es-op" data-v="${id}">${Cartas.html(Estado.carta(id), { mini: true })}<b>${esc(Estado.carta(id).nome)}</b></button>`).join('')}</div>`,
        botoes: [{ texto: 'Fechar' }],
      });
      md.el.querySelectorAll('[data-v]').forEach((x) => (x.onclick = () => verCarta(Estado.carta(x.dataset.v))));
    }));
    raiz.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = () => verCarta(Estado.carta(b.dataset.ver))));
    const tj = raiz.querySelector('#tk-jogar');
    if (tj) tj.onclick = () => jogarTokens(iniciar);
    const tt = raiz.querySelector('#tk-trocar');
    if (tt) tt.onclick = () => trocarTokens(() => { if (window.MenuAPI) window.MenuAPI.tudo(); });
    const v = raiz.querySelector('#fn-ver');
    if (v) v.onclick = () => verCarta(Estado.carta(NINO));
  }

  // ---------- fim de uma batalha de evento ----------
  const MASC = new Set([...FAMILIA_SONIC, YUGI]);
  const EMOJI_REVELA = { mita_malvada: '🖤', akame_murasame: '🗡️', yugi_moto: '🃏', sonic: '💨', shadow: '🌀', super_sonic: '⭐', dark_sonic: '🟣', sonic_excalibur: '⚔️', hyper_sonic: '💎' };
  function revelarNino(c, tag = 'LENDÁRIA EXCLUSIVA DE EVENTO', fala = '"Hmph… n-não é como se eu quisesse entrar no seu deck… mas já que você venceu, eu vou."') {
    if (!c || document.querySelector('.revela-nino')) return;
    const el = document.createElement('div');
    el.className = 'revela-evo revela-nino';
    el.innerHTML = `<div class="re-raios"></div><div class="re-conteudo">
        <small>${tag}</small>
        <div class="rn-palco">${Cartas.html(c, { mini: true })}</div>
        <b>${esc(c.nome)}</b>
        <p>${fala}</p>
        <button class="btn-modal principal">${MASC.has(c.id) ? 'Bem-vindo' : 'Bem-vinda'}, ${esc(FAMILIA_SONIC.includes(c.id) ? c.nome : c.nome.split(' ')[0])}! ${EMOJI_REVELA[c.id] || '🎀'}</button></div>`;
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
    if (ev.mita) { fimMita(r, { mostrarBau, tudo }); return; }
    if (ev.desafio) { fimDesafio(r, { mostrarBau, tudo }); return; }
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
  const ARTHUR = 'ZwrffaFMcidTzZAGCMJNXOtuuOh2';
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
      // desafios das Mitas: saiu no meio = derrota; completou sem receber = recebe
      for (const k of Object.keys(MITAS)) {
        const fm = dadosMita(k);
        if (fm.emJogo) { fm.emJogo = false; if (fm.l >= MITAS[k].vidas) fm.ativo = false; Estado.salvar(); }
        if (fm.completo && !Estado.tem(MITAS[k].carta)) setTimeout(() => { if (!Estado.tem(MITAS[k].carta)) revelarNino(Ranque.darEvolucao(MITAS[k].carta), 'LENDÁRIA EXCLUSIVA DE EVENTO', MITAS[k].fala.replace('{n}', nomeJ())); }, 900);
      }
      mitaEspia();
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
      // carta intransferível que tinha vazado pra outra conta (Goku UI do Samuel)
      if (d.cartaRetirada) {
        const c = Estado.carta(d.cartaRetirada) || { nome: 'carta' };
        delete d.cartaRetirada;
        Estado.salvar();
        setTimeout(() => UI.modal({
          titulo: '🔒 Carta exclusiva corrigida',
          html: `<p>A carta <b>${c.nome}</b> é exclusiva de outro jogador e tinha aparecido na sua conta por um bug.</p><p>Ela foi tirada do seu deck. O resto da sua conta continua igualzinho. Desculpa a confusão! 💜</p>`,
          botoes: [{ texto: 'Entendi', classe: 'principal', acao: () => { if (window.MenuAPI) window.MenuAPI.tudo(); } }],
        }), 1300);
      }
      // Goku UI do Samuel agora é permanente
      if ((Conta.uid && Conta.uid()) === SAMUEL && Estado.tem('goku_ui') && !(d.presentesEspeciais || []).includes('goku-ui-permanente')) {
        d.presentesEspeciais = [...(d.presentesEspeciais || []), 'goku-ui-permanente'];
        if (d.deck.length < 8 && !d.deck.includes('goku_ui')) d.deck.push('goku_ui');
        Estado.salvar();
        setTimeout(() => UI.modal({
          titulo: '🐉 Seu Goku UI voltou!',
          html: `<div class="compra">${Cartas.html(Estado.carta('goku_ui'), { mini: true })}<div><p>O <b>Goku (Instinto Superior)</b> agora é <b>seu pra sempre</b>, sem limite de partidas!</p><p>Ele ficou um pouco mais fraco, mas continua muito forte.</p><p class="aviso">🤖 Mas tem um Fiscal: se você usar ele em quase toda partida e só ganhar com ele, ele fica cansado (−2 níveis) ou exausto (−4). Jogando umas partidas sem ele, ele descansa.</p></div></div>`,
          botoes: [{ texto: 'Bora! 🔥', classe: 'principal' }],
        }), 2200);
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
      for (const k of Object.keys(DESAFIOS)) {
        const fd = dadosDesafio(k);
        if (fd.emJogo) { fd.emJogo = false; if (fd.l >= DESAFIOS[k].vidas) fd.ativo = false; Estado.salvar(); }
        if (k === 'yugi' && fd.completo && !Estado.tem(YUGI)) setTimeout(() => { if (!Estado.tem(YUGI)) revelarNino(Ranque.darEvolucao(YUGI), 'LENDÁRIA EXCLUSIVA DE EVENTO', DESAFIOS.yugi.fala.replace('{n}', esc(nomeJ()))); }, 900);
        if (k === 'sonic' && fd.completo && !fd.escolheu && !document.querySelector('.modal-escolha-sonic')) setTimeout(() => escolherSonic(() => { if (window.MenuAPI) window.MenuAPI.tudo(); }), 1000);
      }
      // Enzo perdeu a Mita Malvada quando a nuvem parou de salvar: devolve
      if (uid === ENZO && !Estado.tem('mita_malvada') && !(d.presentesEspeciais || []).includes('mita-enzo')) {
        d.presentesEspeciais = [...(d.presentesEspeciais || []), 'mita-enzo'];
        const fm = dadosMita('mitaMalvada'); fm.completo = true; fm.ativo = false; fm.emJogo = false;
        const c = Ranque.darEvolucao('mita_malvada');
        Estado.salvar();
        if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {});
        setTimeout(() => revelarNino(c, 'ELA VOLTOU', `"Você achou que ia se livrar de mim, ${esc(nomeJ())}? Um servidor caindo não vai me separar de você. 🖤"`), 900);
      }
      // Akame (Murasame): ficou mais forte e sobe pro nível 9 (o Arthur achou ela fraca)
      if (uid === ARTHUR && Estado.tem('akame_murasame') && !(d.presentesEspeciais || []).includes('akame-buff')) {
        d.presentesEspeciais = [...(d.presentesEspeciais || []), 'akame-buff'];
        d.colecao.akame_murasame.nivel = Math.max(d.colecao.akame_murasame.nivel || 1, 9);
        Estado.salvar();
        if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {});
        if ((d.presentesEspeciais || []).includes('akame-arthur')) setTimeout(() => UI.toast('🗡️ Sua Akame ficou mais forte e subiu pro nível 9!'), 1200);
      }
      // Akame (Murasame): exclusiva do Arthur
      if (uid === ARTHUR && Estado.tem('akame_murasame') && !(d.presentesEspeciais || []).includes('akame-arthur')) {
        d.presentesEspeciais = [...(d.presentesEspeciais || []), 'akame-arthur'];
        if (d.presenteNovo === 'akame_murasame') d.presenteNovo = null; // usa a revelação especial no lugar do aviso comum
        Estado.salvar();
        if (Conta.salvarAgora) Conta.salvarAgora().catch(() => {});
        const nome = esc(((d.nome || 'Arthur').split(' ')[0]) || 'Arthur');
        setTimeout(() => revelarNino(Estado.carta('akame_murasame'), 'LENDÁRIA EXCLUSIVA DO ARTHUR', `"Me disseram que eu luto do seu lado agora, ${nome}. Só aponta o alvo… o resto é comigo."`), 900);
      }
    } catch (e) { console.warn('Eventos.conferir', e); }
    conferindo = false;
  }

  return { html, ligar, fim, conferir, trocarTokens, ganharTokens, tokensHoje, MODOS, modosDeHoje, jogarModo, jogarFestival, nino };
})();
