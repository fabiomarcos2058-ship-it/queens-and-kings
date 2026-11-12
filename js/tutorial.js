// Tutorial: uma batalha guiada, passo a passo, para quem nunca jogou.
const Tutorial = (() => {
  const DECK = ['bra', 'teto', 'chichi', 'mai', 'miku_nakano', 'nami_old', 'shizuku', 'chuva'];
  const DECK_IA = ['bra', 'teto', 'chichi', 'mai', 'nami_old', 'shizuku', 'itsuki', 'miku_nakano'];
  const PREMIO = { gemas: 50, ouro: 500 };
  let caixa = null, timer = null;

  const PASSOS = [
    { txt: '👋 Oi! Esta é a <b>arena</b>. Derrube as torres <b style="color:#FF8A8A">vermelhas</b> do rival e proteja as suas torres <b style="color:#8AC4FF">azuis</b>!', alvo: '.arena-grande-janela', botao: 'Próximo' },
    { txt: '💧 Este é o seu <b>elixir</b>. Ele enche sozinho com o tempo. Cada carta custa elixir: é o número rosa no canto dela.', alvo: '.elixir', botao: 'Próximo' },
    { txt: '👆 Agora <b>arraste uma carta</b> da sua mão até a arena, no <b>seu lado</b> (a parte de baixo). Pode ser qualquer uma!', alvo: '.mao', espera: 'carta' },
    { txt: '✨ Isso! As tropas <b>andam sozinhas</b> e atacam o que estiver perto. Mande mais cartas quando tiver elixir.', alvo: '.arena-grande-janela', botao: 'Entendi' },
    { txt: '⚔️ O rival vai começar a jogar agora. <b>Defenda</b> colocando cartas perto das suas torres quando ele atacar!', alvo: '.arena-grande-janela', botao: 'Bora!', ligaIA: true },
    { txt: '⚡ Cartas com raio têm <b>habilidade especial</b>: quando aparecer um botão redondo no canto direito, toque nele (gasta elixir). E 💬 manda emotes!', alvo: '.arena-grande-janela', botao: 'Próximo' },
    { txt: '👑 Cada torre pequena derrubada vale <b>1 coroa</b>. A torre do rei (a do meio) vale <b>3 coroas</b> e a vitória na hora! Agora é com você!', alvo: '.placar', botao: 'Vamos lá!' },
  ];

  function limpar() {
    if (timer) clearInterval(timer);
    timer = null;
    document.querySelectorAll('.tutorial-dica, .tutorial-foco').forEach((e) => e.remove());
    caixa = null;
  }
  function mostrar(i) {
    limpar();
    const p = PASSOS[i];
    const s = Batalha._estado();
    if (!p || !s || s.acabou) return;
    const bat = document.getElementById('batalha');
    const alvo = bat.querySelector(p.alvo);
    // destaque em volta do elemento
    if (alvo) {
      const r = alvo.getBoundingClientRect(), b = bat.getBoundingClientRect();
      const foco = document.createElement('div');
      foco.className = 'tutorial-foco';
      Object.assign(foco.style, { left: `${r.left - b.left - 4}px`, top: `${r.top - b.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
      bat.appendChild(foco);
    }
    caixa = document.createElement('div');
    caixa.className = `tutorial-dica${p.alvo === '.mao' || p.alvo === '.elixir' ? ' em-cima' : ''}`;
    caixa.innerHTML = `<img src="assets/cartas/nino_nakano_medalhao.png" alt="" /><div><small>Passo ${i + 1}/${PASSOS.length}</small><p>${p.txt}</p>${p.botao ? `<button class="btn-modal principal">${p.botao}</button>` : '<em class="tutorial-espera">esperando você…</em>'}</div>`;
    bat.appendChild(caixa);
    if (p.ligaIA) { s.iaTimer = 3; }
    if (p.botao) caixa.querySelector('button').onclick = () => (i + 1 < PASSOS.length ? mostrar(i + 1) : limpar());
    if (p.espera === 'carta') {
      const antes = s.ent.filter((e) => !e.torre && e.time === 'azul').length;
      s.azul.elixir = Math.max(s.azul.elixir, 5);
      timer = setInterval(() => {
        const s2 = Batalha._estado();
        if (!s2 || s2.acabou) return limpar();
        if (s2.ent.filter((e) => !e.torre && e.time === 'azul').length > antes || s2.proj.length) mostrar(i + 1);
      }, 250);
    }
  }

  function comecar(fim) {
    limpar();
    Batalha.iniciar({ modo: 'tutorial', tutorial: { deck: DECK, deckIA: DECK_IA }, fim });
    setTimeout(() => mostrar(0), 600);
  }

  function fim(r) {
    limpar();
    const d = Estado.d;
    const primeira = !d.tutorialFeito;
    if (primeira) { d.tutorialFeito = true; d.gemas += PREMIO.gemas; d.ouro += PREMIO.ouro; Estado.salvar(); }
    const ganhou = r.resultado === 'vitoria';
    UI.modal({
      titulo: ganhou ? '🎓 Tutorial completo!' : '🎓 Quase lá!',
      html: `<p class="ev-res">${ganhou ? 'Você venceu sua primeira batalha guiada! 🎉' : 'Não foi dessa vez, mas agora você já sabe jogar!'}</p>
        ${primeira ? `<p class="ev-res">Presente de boas-vindas:<br><b>${PREMIO.gemas} 💎 e ${PREMIO.ouro} 🪙</b></p>` : ''}
        <p class="aviso">Dica: complete as 📜 Missões todo dia e jogue os 🎪 Eventos para ganhar prêmios!</p>`,
      botoes: [{ texto: 'Bora jogar!', classe: 'principal', acao: () => { if (window.MenuAPI) window.MenuAPI.tudo(); } }],
    });
  }

  return { comecar, fim, feito: () => !!(Estado.d && Estado.d.tutorialFeito) };
})();
