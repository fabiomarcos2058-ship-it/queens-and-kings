// Menu principal: abas, loja, cartas, baús, clã, eventos e perfil.
(async () => {
  const $ = (id) => document.getElementById(id);
  const d = () => Estado.d;
  const fmt = UI.fmt;

  // ---------- Abas ----------
  const ordem = ['loja', 'cartas', 'batalha', 'cla', 'eventos'];
  const telas = $('telas');
  const abas = document.querySelectorAll('#abas button');
  let abaAtual = 'batalha';
  function irPara(aba) {
    abaAtual = aba;
    telas.style.transform = `translateX(-${ordem.indexOf(aba) * 20}%)`;
    abas.forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  }
  abas.forEach((b) => b.addEventListener('click', () => irPara(b.dataset.aba)));
  let inicioX = null, inicioY = null;
  telas.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; inicioY = e.touches[0].clientY; }, { passive: true });
  telas.addEventListener('touchend', (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX, dy = e.changedTouches[0].clientY - inicioY;
    const i = ordem.indexOf(abaAtual);
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) irPara(ordem[Math.max(0, Math.min(4, i + (dx < 0 ? 1 : -1)))]);
    inicioX = null;
  });

  // ---------- Recompensas ----------
  function listaCartasGanhas(cartas, novas = []) {
    const ordem = [...novas, ...Object.keys(cartas).filter((id) => !novas.includes(id))];
    return `<div class="ganhos-cartas">${ordem.map((id, i) => {
      const nova = novas.includes(id);
      const q = cartas[id] + (nova ? 1 : 0);
      return `<div class="ganho-carta${nova ? ' nova' : ''}" style="animation-delay:${i * 0.12}s">${nova ? '<span class="selo-nova">NOVA!</span>' : ''}${Cartas.html(Estado.carta(id), { mini: true })}<b>x${q}</b></div>`;
    }).join('')}</div>`;
  }

  function mostrarBau(tipo, r) {
    UI.modal({
      titulo: Estado.BAUS[tipo].nome,
      classe: 'modal-bau',
      html: `<img class="bau-aberto" data-asset="ui/bau_${Estado.BAUS[tipo].imagem || tipo}" alt="" />
        <div class="ganhos"><span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${fmt(r.ouro)}</span>${r.gemas ? `<span><i class="ic-gema"></i> +${r.gemas}</span>` : ''}</div>
        ${r.novas && r.novas.length ? `<p class="aviso-nova">✨ Você desbloqueou ${r.novas.map((id) => Estado.carta(id).nome).join(' e ')}!</p>` : ''}
        ${listaCartasGanhas(r.cartas, r.novas)}`,
      botoes: [{ texto: 'Pegar tudo!', classe: 'principal' }],
    });
    Assets.fill();
    tudo();
  }

  // ---------- Avatar ----------
  const ICONES = ['coroa', 'estrela', 'coracao', 'espadas', 'lanterna', 'flor'];
  const CORES = { roxo: '#534AB7', rosa: '#D4537E', azul: '#378ADD', verde: '#1D9E75', laranja: '#D85A30', dourado: '#BA7517' };
  const avatarUrl = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : `assets/cartas/${a}_medalhao.png`);

  // ---------- Topo ----------
  function topo() {
    $('avatar-topo').src = avatarUrl(d().avatar);
    $('avatar-topo').style.borderColor = CORES[d().cor];
    $('nivel').dataset.n = d().nivel;
    $('nome').innerHTML = Passe.nomeHtml(d().nome, Passe.estiloNome());
    $('xp').style.width = `${(d().xp / Estado.XP_NIVEL(d().nivel)) * 100}%`;
    $('ouro').textContent = fmt(d().ouro);
    $('gemas').textContent = fmt(d().gemas);
  }

  function conquistas() {
    const c = d().conquistas;
    const total = Estado.catalogo().length;
    const temCartas = Object.values(d().colecao).filter((x) => x.nivel > 1 || x.copias > 0).length;
    return [
      ['🏆', 'Primeira vitória', 'Vença uma batalha', Math.min(1, d().vitorias), 1],
      ['👑', 'Três coroas', 'Derrube a torre do rei', Math.min(1, c.tresCoroas), 1],
      ['⚔️', 'Veterana', 'Vença 10 batalhas', d().vitorias, 10],
      ['🎁', 'Caçadora de baús', 'Abra 10 baús', c.baus, 10],
      ['⬆️', 'Treinadora', 'Evolua cartas 5 vezes', c.evolucoes, 5],
      ['📚', 'Colecionadora', 'Tenha cópias de todas as cartas', temCartas, total],
      ['🌸', 'Rumo à arena 2', 'Chegue a 300 troféus', d().recorde, 300],
      ['🛡️', 'Em equipe', 'Entre num clã', d().cla && d().cla.id ? 1 : 0, 1],
    ];
  }

  function perfil() {
    const total = d().vitorias + d().derrotas;
    const xpMax = Estado.XP_NIVEL(d().nivel);
    const lista = conquistas();
    const feitas = lista.filter((x) => x[3] >= x[4]).length;
    const opcoesAvatar = [...ICONES, ...Estado.catalogo().filter((c) => !c.feitico).map((c) => c.id)];
    const m = UI.modal({
      classe: 'modal-perfil',
      html: `<div class="perfil-banner" style="--cor:${CORES[d().cor]}">
          <button class="perfil-avatar" id="trocar-avatar"><img src="${avatarUrl(d().avatar)}" alt="" /><i>✏️</i></button>
          <div class="perfil-info">
            <div class="perfil-nome-linha"><input id="campo-nome" maxlength="16" value="${d().nome.replace(/"/g, '&quot;')}" aria-label="Nome" /><span>✏️</span></div>
            <button class="btn-estilo-nome" id="btn-estilo-nome">🎨 ${Passe.estiloNome() ? `Nome: ${Passe.nomeHtml(Passe.ESTILOS_NOME[Passe.estiloNome()].nome, Passe.estiloNome())}` : 'Cor do nome'}${Passe.temTrilha('plus') ? '' : ' 🔒'}</button>
            <div class="perfil-nivel"><div class="nivel" data-n="${d().nivel}"></div>
              <div class="perfil-xp"><i style="width:${(d().xp / xpMax) * 100}%"></i><small>${d().xp}/${xpMax} XP</small></div></div>
            ${d().cla && d().cla.id ? `<div class="perfil-cla">🛡️ ${esc(d().cla.nome)}</div>` : ''}
          </div>
        </div>
        <div class="seletor oculto" id="seletor-avatar">
          <div class="seletor-titulo">Escolha seu avatar</div>
          <div class="grade-avatares">${opcoesAvatar.map((a) => `<button data-av="${a}" class="${a === d().avatar ? 'escolhido' : ''}"><img src="${avatarUrl(a)}" alt="" /></button>`).join('')}</div>
          <div class="seletor-titulo">Cor do perfil</div>
          <div class="grade-cores">${Object.entries(CORES).map(([k, v]) => `<button data-cor="${k}" class="${k === d().cor ? 'escolhido' : ''}" style="background:${v}"></button>`).join('')}</div>
        </div>
        <div class="perfil-conta">${Conta.logado()
          ? `<span>☁️ Salvo na conta<br><b>${Conta.email()}</b><br><small class="meu-id">ID: <code>${Conta.uid()}</code> <button class="btn-copiar" id="copiar-id">copiar</button></small></span><button class="btn-peq perigo" id="btn-sair-conta">Sair</button>`
          : `<div class="salvar-conta"><span>📱 Seu progresso está salvo <b>só neste celular</b>. Salve numa conta pra não perder e jogar em qualquer lugar!</span>
              <button class="btn-modal btn-google" id="btn-salvar-google"><b>G</b> Salvar na conta Google</button>
              <button class="btn-modal secundario" id="btn-entrar-conta">Criar conta ou entrar com e-mail</button></div>`}</div>
        <div class="estatisticas">
          <div><b>${UI.fmt(d().trofeus)}</b><span>Troféus</span></div>
          <div><b>${UI.fmt(d().recorde)}</b><span>Recorde</span></div>
          <div><b>${d().vitorias}</b><span>Vitórias</span></div>
          <div><b>${d().derrotas}</b><span>Derrotas</span></div>
          <div><b>${total ? Math.round((d().vitorias / total) * 100) : 0}%</b><span>Aproveitamento</span></div>
          <div><b>${d().conquistas.tresCoroas}</b><span>Vitórias 3 coroas</span></div>
          <div><b>${Object.values(d().colecao).filter((c) => c.tem).length}/${Estado.catalogo().length}</b><span>Cartas</span></div>
          <div><b>${d().conquistas.baus}</b><span>Baús abertos</span></div>
          <div><b>${(d().x1 || {}).v || 0} x ${(d().x1 || {}).d || 0}</b><span>X1 com amigos</span></div>
        </div>
        <div class="titulo-conquistas">Conquistas <small>${feitas}/${lista.length}</small></div>
        <div class="lista-conquistas">${lista.map(([ic, t, desc, v, max]) => `<div class="conquista${v >= max ? ' feita' : ''}">
          <span class="ic">${ic}</span><div><b>${t}</b><small>${desc}</small><div class="mini-barra"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div></div>
          <span class="estado">${v >= max ? '✓' : `${Math.min(v, max)}/${max}`}</span></div>`).join('')}</div>`,
      botoes: [
        { texto: 'Apagar progresso', classe: 'perigo pequeno', acao: () => {
          UI.modal({ titulo: 'Tem certeza?', html: `<p>Isso apaga tudo: cartas, ouro, troféus e baús${Conta.logado() ? ', inclusive da sua conta' : ''}.</p>`, botoes: [
            { texto: 'Cancelar', classe: 'secundario' },
            { texto: 'Apagar', classe: 'perigo', acao: () => { Estado.apagar(); tudo(); UI.toast('Progresso apagado'); } },
          ] });
        } },
        { texto: 'Pronto', classe: 'principal', acao: (el) => {
          const v = el.querySelector('#campo-nome').value.trim();
          if (v && v !== d().nome) { d().nome = v; UI.toast('Nome salvo!'); }
          Estado.salvar(); topo(); cla();
        } },
      ],
    });
    const el = m.el;
    el.querySelector('#btn-estilo-nome').onclick = () => {
      const v = el.querySelector('#campo-nome').value.trim();
      if (v && v !== d().nome) { d().nome = v; Estado.salvar(); }
      m.fechar(); telaEstiloNome();
    };
    const btnEntrar = el.querySelector('#btn-entrar-conta');
    if (btnEntrar) btnEntrar.onclick = async () => { m.fechar(); await Conta.tela({ podeFechar: true }); tudo(); };
    const btnGoogle = el.querySelector('#btn-salvar-google');
    if (btnGoogle) btnGoogle.onclick = async () => { btnGoogle.disabled = true; if (await Conta.salvarComGoogle()) { m.fechar(); tudo(); } btnGoogle.disabled = false; };
    const btnCopiar = el.querySelector('#copiar-id');
    if (btnCopiar) btnCopiar.onclick = async () => { try { await navigator.clipboard.writeText(Conta.uid()); UI.toast('ID copiado!'); } catch (e) { UI.toast('Segure o ID para copiar'); } };
    const btnSair = el.querySelector('#btn-sair-conta');
    if (btnSair) btnSair.onclick = () => UI.modal({
      titulo: 'Sair da conta?',
      html: '<p>Seu progresso continua salvo na conta. Neste celular, o jogo volta para o começo até você entrar de novo.</p>',
      botoes: [{ texto: 'Ficar', classe: 'secundario' }, { texto: 'Sair', classe: 'perigo', acao: () => { Conta.sair(); } }],
    });
    el.querySelector('#trocar-avatar').onclick = () => el.querySelector('#seletor-avatar').classList.toggle('oculto');
    el.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => {
      d().avatar = b.dataset.av;
      el.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('escolhido', x === b));
      el.querySelector('.perfil-avatar img').src = avatarUrl(d().avatar);
      Estado.salvar(); topo();
    }));
    el.querySelectorAll('[data-cor]').forEach((b) => (b.onclick = () => {
      d().cor = b.dataset.cor;
      el.querySelectorAll('[data-cor]').forEach((x) => x.classList.toggle('escolhido', x === b));
      el.querySelector('.perfil-banner').style.setProperty('--cor', CORES[d().cor]);
      Estado.salvar(); topo();
    }));
  }
  $('perfil').onclick = perfil;

  // ---------- Subir de nível ----------
  function subiuNivel(niveis, depois) {
    if (!niveis || !niveis.length) { if (depois) depois(); return; }
    const novo = niveis.at(-1), anterior = novo - niveis.length;
    const fundo = document.createElement('div');
    fundo.className = 'level-up';
    fundo.innerHTML = `<div class="raios"></div>
      <div class="level-conteudo">
        <div class="level-texto">Subiu de nível!</div>
        <div class="level-diamante"><span id="level-num">${anterior}</span></div>
        <div class="level-premio">+${niveis.length * 10} <i class="ic-gema"></i></div>
        ${novo <= Estado.NIVEL_MAX ? `<div class="level-torre">🏰 Torre do Rei agora é nível ${novo}!${Object.values(Estado.TROPAS_TORRE).filter((t) => t.rei > anterior && t.rei <= novo).map((t) => `<br>${t.emoji} Nova tropa de torre: <b>${t.nome}</b>!`).join('')}</div>` : ''}
        <button class="btn-modal principal">Continuar</button>
      </div>
      ${Array.from({ length: 28 }, (_, i) => `<i class="confete" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--c:${['#FAC775', '#ED93B1', '#85B7EB', '#5DCAA5', '#AFA9EC'][i % 5]};--r:${Math.round(Math.random() * 360)}deg"></i>`).join('')}`;
    document.getElementById('app').appendChild(fundo);
    setTimeout(() => {
      const num = fundo.querySelector('#level-num');
      num.textContent = novo;
      num.parentElement.classList.add('pulou');
    }, 700);
    fundo.querySelector('button').onclick = () => { fundo.classList.add('sumir'); setTimeout(() => { fundo.remove(); topo(); if (depois) depois(); }, 250); };
  }

  // ---------- Batalha (tela inicial) ----------
  function telaBatalha() {
    $('trofeus').textContent = fmt(d().trofeus);
    const iniciais = d().baus.filter((b) => b && b.tipo === 'inicial').length;
    $('btn-jogar').classList.toggle('bloqueado', !d().deck.length);
    $('btn-jogar').textContent = d().deck.length ? 'Jogar' : 'Abra os baús!';
    $('dica-inicio').textContent = iniciais ? `🎁 Você tem ${iniciais} baú${iniciais > 1 ? 's' : ''} inicia${iniciais > 1 ? 'is' : 'l'} para abrir!` : '';
    $('trofeus-barra').style.width = `${Math.min(100, (d().trofeus / 300) * 100)}%`;
    const prox = Estado.proximaLiberacao();
    $('trofeus-prox').textContent = prox ? `Próxima carta com ${prox.trofeus} troféus · toque para ver` : 'Todas as cartas liberadas! · toque para ver';
    baus();
  }

  function baus() {
    const algumAbrindo = d().baus.some((b) => b && b.inicio && Estado.tempoRestante(b) > 0);
    $('baus').innerHTML = d().baus.map((b, i) => {
      if (!b) return '<div class="slot-bau vazio"><span>Espaço livre</span></div>';
      const resta = Estado.tempoRestante(b);
      if (b.inicio && resta === 0) return `<button class="slot-bau pronto${b.tipo === 'inicial' ? ' inicial' : ''}" data-i="${i}"><img data-asset="ui/bau_${Estado.BAUS[b.tipo].imagem || b.tipo}" alt="" /><span>Abrir!</span></button>`;
      if (b.inicio) {
        const p = 1 - resta / (Estado.BAUS[b.tipo].segundos * 1000);
        return `<button class="slot-bau abrindo" data-i="${i}"><img data-asset="ui/bau_${b.tipo}" alt="" /><span>${UI.tempo(resta)}</span><div class="tempo-bau"><i style="width:${p * 100}%"></i></div></button>`;
      }
      return `<button class="slot-bau" data-i="${i}"><img data-asset="ui/bau_${b.tipo}" alt="" /><span>${algumAbrindo ? 'Na fila' : 'Tocar p/ abrir'}</span></button>`;
    }).join('');
    $('baus').querySelectorAll('button').forEach((el) => (el.onclick = () => tocarBau(+el.dataset.i)));
    Assets.fill($('baus'));
  }

  function tocarBau(i) {
    const b = d().baus[i];
    const resta = Estado.tempoRestante(b);
    const abrir = () => { d().baus[i] = null; mostrarBau(b.tipo, Estado.abrirBau(b.tipo, b)); };
    if (b.inicio && resta === 0) return abrir();
    const custo = Math.max(1, Math.ceil((b.inicio ? resta : Estado.BAUS[b.tipo].segundos * 1000) / 60000));
    const algumAbrindo = d().baus.some((x) => x && x.inicio && Estado.tempoRestante(x) > 0);
    const botoes = [{ texto: `Abrir agora · ${custo} 💎`, classe: 'principal', desativado: d().gemas < custo, motivo: 'Gemas insuficientes',
      acao: () => { d().gemas -= custo; abrir(); } }];
    if (!b.inicio) botoes.unshift({ texto: algumAbrindo ? 'Outro baú já está abrindo' : `Destrancar (${UI.tempo(Estado.BAUS[b.tipo].segundos * 1000)})`,
      classe: 'secundario', desativado: algumAbrindo, motivo: 'Espere o outro baú terminar',
      acao: () => { b.inicio = Date.now(); Estado.salvar(); baus(); } });
    UI.modal({
      titulo: Estado.BAUS[b.tipo].nome,
      html: `<img class="bau-aberto" data-asset="ui/bau_${b.tipo}" alt="" /><p>${b.inicio ? `Faltam ${UI.tempo(resta)}` : 'Destranque para abrir de graça, ou abra agora com gemas.'}</p>`,
      botoes,
    });
    Assets.fill();
  }

  $('btn-jogar').onclick = () => jogar('normal');
  $('btn-x1').onclick = () => x1();
  $('btn-top').onclick = topGlobal;

  async function topGlobal() {
    const m = UI.modal({ titulo: '🏆 Top global', classe: 'modal-top', html: '<p class="aviso">Carregando…</p>' });
    const corpo = m.el.querySelector('.modal-corpo');
    try {
      const lista = await Conta.topGlobal();
      const eu = Conta.uid();
      const avatar = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : a ? `assets/cartas/${a}_medalhao.png` : 'assets/avatares/coroa.svg');
      corpo.innerHTML = (lista.length ? `<div class="top-lista">${lista.map((j, i) => `<div class="top-linha${j.uid === eu ? ' voce' : ''} pos${i + 1}" data-perfil="${j.uid}">
          <span class="top-pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><img src="${avatar(j.avatar)}" alt="" />
          <div class="top-nome"><b>${Passe.nomeHtml(j.nome || 'Jogador', j.estiloNome)}${j.uid === eu ? ' (você)' : ''}</b>${j.cla ? `<small>🛡️ ${esc(j.cla)}</small>` : ''}</div>
          <span class="top-trofeus"><i class="ic-trofeu"></i>${fmt(j.trofeus || 0)}</span></div>`).join('')}</div>`
        : '<p class="aviso">Ainda ninguém no top. Seja o primeiro!</p>')
        + (eu ? '' : '<p class="aviso">Entre numa conta para aparecer no top global.</p>')
        + (d().modUsado ? '<p class="aviso">Sua conta usou o mod menu, então não aparece no top.</p>' : '');
      ligarPerfis(corpo);
    } catch (e) {
      corpo.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`;
    }
  }
  document.querySelector('.trofeus').onclick = caminho;

  function caminho() {
    const marcos = [...new Set(Estado.catalogo().map((c) => c.trofeus || 0))].sort((a, b) => a - b);
    UI.modal({
      titulo: 'Caminho de troféus',
      classe: 'modal-caminho',
      html: `<p class="aviso">Cada carta passa a aparecer nos baús e na loja quando você chega aos troféus dela. A primeira cópia que você ganhar desbloqueia a carta.</p>
        <div class="caminho">${marcos.map((t) => {
          const ok = d().recorde >= t;
          const cs = Estado.catalogo().filter((c) => (c.trofeus || 0) === t);
          return `<div class="marco${ok ? ' ok' : ''}"><div class="marco-trofeus"><i class="ic-trofeu"></i>${t}</div>
            <div class="marco-cartas">${cs.map((c) => `<div class="marco-carta${Estado.tem(c.id) ? '' : ok ? ' falta' : ' trancada'}">${ok ? Cartas.html(c, { mini: true }) : '<div class="carta-silhueta">🔒</div>'}<small>${ok ? c.nome : '???'}</small></div>`).join('')}</div></div>`;
        }).join('')}</div>`,
    });
  }

  let iniciando = false;
  async function jogar(modo) {
    if (iniciando) return;
    if (!d().deck.length) {
      if (d().baus.some((b) => b && b.tipo === 'inicial')) { UI.toast('Abra seus baús iniciais para ganhar cartas! 🎁'); irPara('batalha'); document.getElementById('baus').classList.add('chamando'); setTimeout(() => document.getElementById('baus').classList.remove('chamando'), 1600); }
      else { UI.toast('Coloque cartas no deck primeiro!'); irPara('cartas'); }
      return;
    }
    iniciando = true;
    const ok = await Atualizacao.podeJogar(); // versão nova? atualiza antes de jogar
    iniciando = false;
    if (!ok) return;
    Batalha.iniciar({ modo, fim: fimDeBatalha });
  }


  // ---------- Presentes da criadora ----------
  function chegaramPresentes(lista) {
    const ok = lista.filter((p) => p.ok), msgs = [...new Set(lista.map((p) => p.mensagem).filter(Boolean))];
    tudo();
    if (!ok.length) return;
    const cartasP = ok.filter((p) => p.tipo === 'carta').map((p) => ({ c: Estado.carta(p.carta), nivel: p.nivel })).filter((x) => x.c);
    UI.modal({
      titulo: '🎁 Presente da criadora!',
      classe: 'modal-liberadas modal-presente',
      html: `<div class="evo-raios"></div>
        ${cartasP.length ? `<div class="liberadas">${cartasP.map((x, i) => `<div class="liberada" style="animation-delay:${i * 0.2}s">${Cartas.html(x.c, { mini: true })}<b>${x.c.nome}</b><small>Nível ${x.nivel}</small></div>`).join('')}</div>` : ''}
        <div class="lista-presentes">${ok.map((p) => `<div>${Presentes.descrever(p)}</div>`).join('')}</div>
        ${msgs.map((m) => `<p class="msg-presente">💌 "${esc(m)}"</p>`).join('')}`,
      botoes: [{ texto: 'Obrigado! 💜', classe: 'principal' }],
    });
  }

  // ---------- Amigos e perfis ----------
  let pedidos = [];
  const CORES_PERFIL = { roxo: '#534AB7', rosa: '#D4537E', azul: '#378ADD', verde: '#1D9E75', laranja: '#D85A30', dourado: '#BA7517' };
  const avatarDe = (a) => (ICONES.includes(a) ? `assets/avatares/${a}.svg` : a ? `assets/cartas/${a}_medalhao.png` : 'assets/avatares/coroa.svg');
  const pontoOnline = (p) => `<i class="ponto-online${Amigos.online(p) ? ' on' : ''}" title="${Amigos.online(p) ? 'Online' : 'Offline'}"></i>`;

  function ligarPerfis(caixa) {
    caixa.querySelectorAll('[data-perfil]').forEach((el) => {
      if (!el.dataset.perfil || el.dataset.perfil === 'undefined') return;
      el.classList.add('clicavel');
      el.onclick = () => verPerfil(el.dataset.perfil);
    });
  }

  function mudouPedidos(lista) {
    const novos = lista.filter((p) => !pedidos.some((x) => x.uid === p.uid));
    pedidos = lista;
    const selo = $('selo-pedidos');
    selo.textContent = lista.length;
    selo.classList.toggle('oculto', !lista.length);
    if (novos.length && document.readyState === 'complete') UI.toast(`👥 ${novos[0].nome || 'Alguém'} quer ser seu amigo!`);
    const aba = document.getElementById('amigos-aba');
    if (aba && aba.dataset.aba === 'pedidos') abaAmigos('pedidos');
    document.querySelectorAll('[data-conta-pedidos]').forEach((e) => (e.textContent = lista.length ? ` (${lista.length})` : ''));
  }

  function conviteX1(c) {
    if (!$('batalha').classList.contains('oculto')) { Amigos.apagarConvite(c.de); return; } // já está numa batalha
    UI.modal({
      titulo: '⚔️ Convite de x1!',
      classe: 'modal-x1',
      html: `<div class="convite"><img src="${avatarDe(c.avatar)}" alt="" /><p><b>${esc(c.nome || 'Um amigo')}</b> te chamou pra um x1!</p></div>`,
      botoes: [
        { texto: 'Agora não', classe: 'secundario', acao: () => { Amigos.apagarConvite(c.de); } },
        { texto: 'Bora! ⚔️', classe: 'principal', acao: () => {
          Amigos.apagarConvite(c.de);
          if (d().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o x1.'); return; }
          x1Entrar(c.codigo);
        } },
      ],
    });
  }

  $('btn-amigos').onclick = () => {
    if (!Conta.logado()) { UI.toast('Entre numa conta para ter amigos! 👥'); return; }
    amigos(pedidos.length ? 'pedidos' : 'amigos');
  };

  function amigos(aba = 'amigos') {
    UI.modal({
      titulo: '👥 Amigos',
      classe: 'modal-amigos',
      html: `<div class="conta-abas amigos-abas">
          <button data-a="amigos">Amigos</button><button data-a="pedidos">Pedidos<span data-conta-pedidos>${pedidos.length ? ` (${pedidos.length})` : ''}</span></button><button data-a="adicionar">Adicionar</button>
        </div><div id="amigos-aba"></div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    }).el.querySelectorAll('.amigos-abas button').forEach((b) => (b.onclick = () => abaAmigos(b.dataset.a)));
    abaAmigos(aba);
  }

  const linhaJogador = (p, extra = '') => `<div class="linha-jogador" data-perfil="${p.uid}">
      <div class="lj-avatar"><img src="${avatarDe(p.avatar)}" alt="" />${p.visto !== undefined ? pontoOnline(p) : ''}</div>
      <div class="lj-nome"><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.visto !== undefined ? `${Amigos.online(p) ? '<span class="txt-on">online</span> · ' : ''}🏆 ${fmt(p.trofeus || 0)}${p.cla ? ` · 🛡️ ${esc(p.cla)}` : ''}` : 'enviou um pedido'}</small></div>${extra}</div>`;

  async function abaAmigos(qual) {
    const aba = document.getElementById('amigos-aba');
    if (!aba) return;
    aba.dataset.aba = qual;
    document.querySelectorAll('.amigos-abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.a === qual));
    if (qual === 'pedidos') {
      aba.innerHTML = pedidos.length ? `<div class="lista-jogadores">${pedidos.map((p) => linhaJogador(p, `<div class="lj-botoes"><button class="btn-peq ok" data-aceitar="${p.uid}">✓</button><button class="btn-peq perigo" data-recusar="${p.uid}">✕</button></div>`)).join('')}</div>`
        : '<p class="aviso">Nenhum pedido de amizade por enquanto.</p>';
      aba.querySelectorAll('[data-aceitar]').forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation(); b.disabled = true;
        try { await Amigos.aceitar(b.dataset.aceitar); UI.toast('Agora vocês são amigos! 💜'); } catch (err) { UI.toast(erroNuvem(err)); b.disabled = false; }
      }));
      aba.querySelectorAll('[data-recusar]').forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation(); b.disabled = true;
        try { await Amigos.recusar(b.dataset.recusar); } catch (err) { UI.toast(erroNuvem(err)); b.disabled = false; }
      }));
      ligarPerfis(aba);
      return;
    }
    if (qual === 'adicionar') {
      aba.innerHTML = `<p class="aviso">Procure pelo nome do jogador ou cole o ID dele (fica no perfil).</p>
        <div class="busca-amigo"><input id="busca-amigo" maxlength="40" placeholder="Nome ou ID" autocomplete="off" /><button class="btn-modal principal" id="btn-buscar-amigo">🔍</button></div>
        <div id="resultado-busca"></div>
        <p class="meu-id-amigos">Seu ID: <code>${Conta.uid()}</code> <button class="btn-copiar" id="copiar-id-amigos">copiar</button></p>`;
      const campo = document.getElementById('busca-amigo'), res = document.getElementById('resultado-busca');
      const buscar = async () => {
        if (!campo.value.trim()) return;
        res.innerHTML = '<div class="x1-carregando"></div>';
        try {
          const lista = (await Amigos.buscar(campo.value)).filter((p) => p.uid !== Conta.uid());
          res.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => linhaJogador(p, '<span class="lj-seta">›</span>')).join('')}</div>` : '<p class="aviso">Ninguém encontrado com esse nome. O nome precisa começar igual (ex.: "ally").</p>';
          ligarPerfis(res);
        } catch (err) { res.innerHTML = `<p class="aviso">${erroNuvem(err)}</p>`; }
      };
      document.getElementById('btn-buscar-amigo').onclick = buscar;
      campo.onkeydown = (e) => { if (e.key === 'Enter') buscar(); };
      document.getElementById('copiar-id-amigos').onclick = () => navigator.clipboard?.writeText(Conta.uid()).then(() => UI.toast('ID copiado!'), () => {});
      campo.focus();
      return;
    }
    aba.innerHTML = '<div class="x1-carregando"></div>';
    try {
      const lista = await Amigos.listar();
      if (aba.dataset.aba !== 'amigos') return;
      aba.innerHTML = lista.length ? `<p class="contagem-amigos">${lista.filter(Amigos.online).length} online · ${lista.length} amigo${lista.length > 1 ? 's' : ''}</p>
          <div class="lista-jogadores">${lista.map((p) => linhaJogador(p, `<button class="btn-peq btn-x1-amigo" data-x1="${p.uid}" title="Chamar pro x1">⚔️</button>`)).join('')}</div>`
        : '<p class="aviso">Você ainda não tem amigos aqui. Vá em <b>Adicionar</b> e procure pelo nome deles! 💜</p>';
      aba.querySelectorAll('[data-x1]').forEach((b) => (b.onclick = (e) => {
        e.stopPropagation();
        chamarX1(lista.find((p) => p.uid === b.dataset.x1));
      }));
      ligarPerfis(aba);
    } catch (err) { aba.innerHTML = `<p class="aviso">${erroNuvem(err)}</p>`; }
  }

  function chamarX1(p) {
    if (d().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o x1.'); return; }
    document.querySelectorAll('.modal-amigos, .modal-perfil-outro').forEach((m) => m.closest('.modal-fundo').remove());
    x1Criar({ uid: p.uid, nome: p.nome || 'seu amigo' });
  }

  async function verPerfil(id) {
    if (!Conta.logado()) { UI.toast('Entre numa conta para ver perfis!'); return; }
    if (id === Conta.uid()) { perfil(); return; }
    const m = UI.modal({ classe: 'modal-perfil modal-perfil-outro', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Fechar', classe: 'secundario' }] });
    const corpo = m.el.querySelector('.modal-corpo'), botoes = m.el.querySelector('.modal-botoes');
    try {
      const [p, sit] = await Promise.all([Amigos.ver(id), Amigos.situacao(id)]);
      if (!p) { corpo.innerHTML = '<p class="aviso">Esse jogador ainda não tem perfil público. Ele precisa abrir o jogo atualizado uma vez.</p>'; return; }
      const total = (p.vitorias || 0) + (p.derrotas || 0);
      const totalX1 = (p.x1v || 0) + (p.x1d || 0);
      const deck = (p.deck || []).map((x) => ({ c: Estado.carta(x.id), nivel: x.nivel })).filter((x) => x.c);
      corpo.innerHTML = `<div class="perfil-banner" style="--cor:${CORES_PERFIL[p.cor] || CORES_PERFIL.roxo}">
          <div class="perfil-avatar outro"><img src="${avatarDe(p.avatar)}" alt="" />${pontoOnline(p)}</div>
          <div class="perfil-info">
            <div class="perfil-nome-outro">${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</div>
            <div class="perfil-nivel"><div class="nivel" data-n="${p.nivel || 1}"></div><small class="status-online">${Amigos.online(p) ? '🟢 Online agora' : p.visto && p.visto.toMillis ? `Visto ${quandoFoi(p.visto.toMillis())}` : ''}</small></div>
            ${p.cla ? `<div class="perfil-cla">🛡️ ${esc(p.cla)}</div>` : ''}
          </div>
        </div>
        <div class="estatisticas">
          <div><b>${fmt(p.trofeus || 0)}</b><span>Troféus</span></div>
          <div><b>${fmt(p.recorde || 0)}</b><span>Recorde</span></div>
          <div><b>${p.vitorias || 0}</b><span>Vitórias</span></div>
          <div><b>${p.derrotas || 0}</b><span>Derrotas</span></div>
          <div><b>${total ? Math.round(((p.vitorias || 0) / total) * 100) : 0}%</b><span>Aproveitamento</span></div>
          <div><b>${p.tresCoroas || 0}</b><span>Vitórias 3 coroas</span></div>
          <div><b>${p.cartas || 0}/${p.totalCartas || Estado.catalogo().length}</b><span>Cartas</span></div>
          <div><b>${p.baus || 0}</b><span>Baús abertos</span></div>
          <div><b>${p.x1v || 0} x ${p.x1d || 0}</b><span>X1 (${totalX1 ? Math.round(((p.x1v || 0) / totalX1) * 100) : 0}%)</span></div>
        </div>
        ${p.torres ? `<div class="torres-outro"><span>👑 Rei <b>Nv. ${p.torres.rei}</b></span><span>🏰 Princesas <b>Nv. ${p.torres.princesa}</b></span><span>${(Estado.TROPAS_TORRE[p.torres.tropa] || Estado.TROPAS_TORRE.princesa).emoji} ${(Estado.TROPAS_TORRE[p.torres.tropa] || Estado.TROPAS_TORRE.princesa).nome}</span></div>` : ''}
        ${deck.length ? `<div class="titulo-conquistas">Deck de batalha</div><div class="deck-outro">${deck.map((x) => Cartas.html(x.c, { nivel: `Nv. ${x.nivel}` })).join('')}</div>` : ''}
        ${p.mod ? '<p class="aviso">Esta conta já usou o mod menu.</p>' : ''}
        <p class="meu-id-amigos">ID: <code>${id}</code></p>`;
      const acoes = {
        nada: [{ t: '➕ Adicionar amigo', c: 'principal', f: async () => { const r = await Amigos.pedir(id); UI.toast(r === 'amigos' ? 'Agora vocês são amigos! 💜' : 'Pedido de amizade enviado!'); } }],
        enviado: [{ t: 'Cancelar pedido', c: 'secundario', f: async () => { await Amigos.cancelarPedido(id); UI.toast('Pedido cancelado.'); } }],
        recebido: [{ t: '✓ Aceitar amizade', c: 'principal', f: async () => { await Amigos.aceitar(id); UI.toast('Agora vocês são amigos! 💜'); } }],
        amigos: [
          { t: '⚔️ Chamar pro x1', c: 'principal', f: async () => { chamarX1(p); return 'fechou'; } },
          { t: 'Desfazer amizade', c: 'perigo pequeno', f: async () => { await Amigos.remover(id); UI.toast('Amizade desfeita.'); } },
        ],
      }[sit] || [];
      acoes.forEach((a) => {
        const b = document.createElement('button');
        b.className = `btn-modal ${a.c}`;
        b.textContent = a.t;
        b.onclick = async () => {
          b.disabled = true;
          try { const r = await a.f(); if (r !== 'fechou') { m.fechar(); verPerfil(id); } } catch (err) { UI.toast(err.message && !err.code ? err.message : erroNuvem(err)); b.disabled = false; }
        };
        botoes.prepend(b);
      });
    } catch (err) {
      corpo.innerHTML = `<p class="aviso">${erroNuvem(err)}</p>`;
    }
  }

  function quandoFoi(ms) {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `há ${h} h`;
    const dias = Math.round(h / 24);
    return `há ${dias} dia${dias > 1 ? 's' : ''}`;
  }

  // ---------- X1 com amigos ----------
  function x1() {
    if (!Conta.logado()) { UI.toast('Entre numa conta para jogar x1 com amigos!'); return; }
    if (d().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o x1.'); irPara('cartas'); return; }
    const st = d().x1 || { v: 0, d: 0 };
    UI.modal({
      titulo: '⚔️ X1 com amigo',
      classe: 'modal-x1',
      html: `<p>Batalha ao vivo contra um amigo. É amistosa: não ganha nem perde troféus.</p>
        <p class="x1-placar">Suas vitórias no x1: <b>${st.v}</b> · derrotas: <b>${st.d}</b></p>
        <div class="x1-entrar"><input id="x1-codigo" maxlength="4" placeholder="CÓDIGO" autocomplete="off" /><button class="btn-modal principal" id="x1-btn-entrar">Entrar</button></div>`,
      botoes: [
        { texto: 'Criar sala', classe: 'principal', acao: () => { x1Criar(); } },
        { texto: 'Fechar', classe: 'secundario' },
      ],
    });
    const inp = document.getElementById('x1-codigo');
    inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, ''); };
    document.getElementById('x1-btn-entrar').onclick = () => {
      if (inp.value.length !== 4) { UI.toast('O código tem 4 letras.'); return; }
      inp.closest('.modal-fundo').remove();
      x1Entrar(inp.value);
    };
  }

  function travarFundo(m) { m.el.addEventListener('click', (e) => { if (e.target === m.el) e.stopPropagation(); }, true); }

  async function x1Criar(amigo = null) {
    let espera = null, cancelado = false;
    if (!(await Atualizacao.podeJogar())) return;
    try {
      espera = UI.modal({ titulo: 'Criando sala...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { cancelado = true; X1.cancelar(); } }] });
      travarFundo(espera);
      const cod = await X1.criarSala({
        aoEntrarAmigo: (amigo) => {
          if (cancelado) return;
          const vs = Atualizacao.versaoDoAmigo(amigo.versao);
          if (vs !== 'igual') {
            cancelado = true; espera.fechar(); X1.cancelar();
            if (vs === 'amigo-velho') UI.modal({ titulo: 'Versões diferentes', html: `<p><b>${esc(amigo.nome)}</b> está com o jogo desatualizado. Peça pra ele fechar e abrir o jogo de novo (ou tocar em "Atualizar agora"), depois criem outra sala!</p>` });
            return;
          }
          espera.fechar();
          UI.toast(`${amigo.nome} entrou! Bora! ⚔️`);
          X1.comecar(amigo, fimDeBatalha);
        },
      });
      if (cancelado) { X1.cancelar(); return; }
      if (amigo) {
        await Amigos.convidar(amigo.uid, cod);
        espera.el.querySelector('.modal-titulo').textContent = 'Convite enviado!';
        espera.el.querySelector('.modal-corpo').innerHTML = `<p>Chamamos <b>${esc(amigo.nome)}</b> pro x1. Se ele não estiver no jogo, mande o código:</p>
          <div class="x1-codigo-grande">${cod}</div><p class="x1-esperando">Esperando ${esc(amigo.nome)} entrar<span>...</span></p>`;
        return;
      }
      espera.el.querySelector('.modal-titulo').textContent = 'Sala criada!';
      espera.el.querySelector('.modal-corpo').innerHTML = `<p>Mande este código para seu amigo:</p>
        <div class="x1-codigo-grande">${cod}</div>
        <button class="btn-modal secundario" id="x1-copiar">📋 Copiar código</button>
        <p class="x1-esperando">Esperando seu amigo entrar<span>...</span></p>`;
      document.getElementById('x1-copiar').onclick = () => { navigator.clipboard?.writeText(cod).then(() => UI.toast('Código copiado!'), () => {}); };
    } catch (e) {
      if (espera) espera.fechar();
      X1.cancelar();
      UI.toast(e.code ? erroNuvem(e) : e.message || 'Não deu para criar a sala.');
      console.error(e);
    }
  }

  async function x1Entrar(codigo) {
    let espera = null;
    if (!(await Atualizacao.podeJogar())) return;
    try {
      espera = UI.modal({ titulo: 'Entrando...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { X1.cancelar(); } }] });
      travarFundo(espera);
      const host = await X1.entrarSala(codigo, {
        aoComecar: (h) => { espera.fechar(); X1.assistir(h, fimDeBatalha); },
      });
      const vs = Atualizacao.versaoDoAmigo(host.versao);
      if (vs !== 'igual') {
        espera.fechar(); X1.cancelar();
        if (vs === 'amigo-velho') UI.modal({ titulo: 'Versões diferentes', html: `<p><b>${esc(host.nome)}</b> está com o jogo desatualizado. Peça pra ele fechar e abrir o jogo de novo (ou tocar em "Atualizar agora"), depois criem outra sala!</p>` });
        return;
      }
      espera.el.querySelector('.modal-titulo').textContent = `Sala de ${host.nome}`;
      espera.el.querySelector('.modal-corpo').innerHTML = `<p class="x1-esperando">Esperando ${host.nome} começar<span>...</span></p>`;
    } catch (e) {
      if (espera) espera.fechar();
      UI.toast(e.message || 'Não deu para entrar na sala.');
      console.error(e);
    }
  }

  function fimX1(r) {
    const st = d().x1 || (d().x1 = { v: 0, d: 0 });
    if (r.resultado === 'vitoria') st.v++; else if (r.resultado === 'derrota') st.d++;
    Estado.salvar();
    const titulo = { vitoria: 'Você venceu o x1! 👑', derrota: 'Derrota no x1', empate: 'Empate!' }[r.resultado];
    UI.modal({
      titulo,
      classe: `modal-resultado ${r.resultado}`,
      html: `<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        <p>Partida amistosa: troféus não mudam.</p>
        <p class="x1-placar">X1: <b>${st.v}</b> vitórias · <b>${st.d}</b> derrotas</p>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => { Batalha.fechar(); tudo(); irPara('batalha'); cartasEsgotadas(); } }],
    });
  }

  function fimDeBatalha(r) {
    esgotadas = esgotadas.concat(Estado.contarUsos());
    if (r.modo === 'x1' || r.modo === 'x1c') { fimX1(r); return; }
    fimDeBatalhaNormal(r);
  }

  let esgotadas = [];
  function cartasEsgotadas() {
    const lista = esgotadas;
    esgotadas = [];
    if (!lista.length) return;
    UI.modal({
      titulo: 'Última partida!',
      classe: 'modal-liberadas',
      html: `<div class="liberadas">${lista.map((c) => `<div class="liberada esgotada">${Cartas.html(c, { mini: true })}<b>${c.nome}</b></div>`).join('')}</div>
        <p>${lista.map((c) => c.nome).join(' e ')} já lutou todas as partidas e voltou pro treino. Obrigado pela ajuda! 💪</p>`,
      botoes: [{ texto: 'Valeu!', classe: 'principal', acao: () => { tudo(); } }],
    });
  }

  function fimDeBatalhaNormal(r) {
    const vitoria = r.resultado === 'vitoria';
    let trofeus = 0, ouro = 0, bau = null;
    if (vitoria) {
      trofeus = 30; ouro = 15 + r.coroas * 5; d().vitorias++;
      const livre = d().baus.findIndex((b) => !b);
      if (livre >= 0) {
        const x = Math.random();
        bau = x < 0.06 ? 'ouro' : x < 0.3 ? 'prata' : 'madeira';
        d().baus[livre] = { tipo: bau, inicio: null };
      }
    } else if (r.resultado === 'derrota') {
      trofeus = -Math.min(15, d().trofeus); d().derrotas++;
    }
    const recordeAntes = d().recorde;
    d().trofeus += trofeus;
    d().recorde = Math.max(d().recorde, d().trofeus);
    const liberadas = Estado.catalogo().filter((c) => c.trofeus > recordeAntes && c.trofeus <= d().recorde);
    d().ouro += ouro;
    const xpGanho = vitoria ? 12 : 4;
    const xpAntes = d().xp, nivelAntes = d().nivel;
    const niveis = Estado.ganharXp(xpGanho);
    if (vitoria && r.coroas === 3) d().conquistas.tresCoroas++;
    // eventos
    const ev = d().eventos;
    ev.coroas += r.coroas;
    if (vitoria) ev.sequencia = Math.min(3, ev.sequencia + 1); else if (!ev.desafioPremio) ev.sequencia = 0;
    const passe = Passe.ganharPontos(r.resultado, r.coroas);
    Estado.salvar();

    const titulo = { vitoria: 'Vitória! 👑', derrota: 'Derrota', empate: 'Empate' }[r.resultado];
    UI.modal({
      titulo,
      classe: `modal-resultado ${r.resultado}`,
      html: `<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        <div class="ganhos">
          <span><i class="ic-trofeu"></i> ${trofeus >= 0 ? '+' : ''}${trofeus}</span>
          ${ouro ? `<span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${ouro}</span>` : ''}
        </div>
        ${bau ? `<p class="ganhou-bau"><img data-asset="ui/bau_${bau}" alt="" /> Você ganhou um ${Estado.BAUS[bau].nome.toLowerCase()}!</p>` : vitoria ? '<p class="aviso">Seus espaços de baú estão cheios.</p>' : ''}
        <p class="passe-ganho">🎟️ +${passe.ganho} pontos do passe${passe.subiu ? ` · <b>nível ${Passe.nivel()} do passe!</b>` : ''}</p>
        <div class="xp-resultado"><div class="nivel" data-n="${nivelAntes}"></div><div class="perfil-xp"><i id="xp-anim" style="width:${(xpAntes / Estado.XP_NIVEL(nivelAntes)) * 100}%"></i><small>+${xpGanho} XP</small></div></div>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => { Batalha.fechar(); tudo(); irPara('batalha'); subiuNivel(niveis, () => { cartasLiberadas(liberadas); cartasEsgotadas(); }); } }],
    });
    Assets.fill();
    setTimeout(() => {
      const barra = document.getElementById('xp-anim');
      if (barra) barra.style.width = niveis.length ? '100%' : `${(d().xp / Estado.XP_NIVEL(d().nivel)) * 100}%`;
    }, 500);
  }

  function cartasLiberadas(lista) {
    if (!lista.length) return;
    UI.modal({
      titulo: 'Novas cartas liberadas!',
      classe: 'modal-liberadas',
      html: `<div class="evo-raios"></div><div class="liberadas">${lista.map((c, i) => `<div class="liberada" style="animation-delay:${i * 0.2}s">${Cartas.html(c, { mini: true })}<b>${c.nome}</b></div>`).join('')}</div>
        <p>Agora ${lista.length > 1 ? 'elas podem' : 'ela pode'} aparecer nos baús e na loja. Ganhe a primeira cópia para desbloquear!</p>`,
      botoes: [{ texto: 'Oba!', classe: 'principal' }],
    });
  }

  // ---------- Loja ----------
  function loja() {
    const ofertas = Estado.ofertasDoDia();
    $('ofertas').innerHTML = ofertas.length ? '' : '<p class="aviso" style="grid-column:1/-1">Abra seus baús iniciais para liberar as ofertas!</p>';
    $('ofertas').innerHTML += ofertas.map((o) => {
      const c = Estado.carta(o.id);
      const comprada = d().ofertas.compradas.includes(o.i);
      return `<button class="item-loja${comprada ? ' comprado' : ''}" data-i="${o.i}">${Cartas.html(c, { mini: true })}
        <div class="item-nome">${Estado.tem(c.id) ? '' : '<b class="tag-nova">NOVA</b> '}${c.nome} x${o.copias}</div>
        <div class="preco">${comprada ? 'Comprado' : `<img class="ic-img" data-asset="ui/moeda" alt="" />${fmt(o.preco)}`}</div></button>`;
    }).join('');
    $('ofertas').querySelectorAll('button').forEach((el) => (el.onclick = () => {
      const o = ofertas[+el.dataset.i];
      if (d().ofertas.compradas.includes(o.i)) return UI.toast('Você já comprou essa oferta hoje');
      const c = Estado.carta(o.id);
      UI.modal({
        titulo: 'Comprar oferta?',
        html: `<div class="compra">${Cartas.html(c, { mini: true })}<p><b>${o.copias} cópias</b> de ${c.nome} por ${fmt(o.preco)} de ouro.</p></div>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: d().ouro < o.preco, motivo: 'Ouro insuficiente',
          acao: () => {
            d().ouro -= o.preco;
            const col = d().colecao[o.id];
            const nova = !col.tem;
            if (nova) { col.tem = true; col.copias += o.copias - 1; } else col.copias += o.copias;
            d().ofertas.compradas.push(o.i); Estado.salvar();
            UI.toast(nova ? `✨ ${c.nome} desbloqueada!` : `+${o.copias} ${c.nome}!`); tudo();
          } }],
      });
    }));

    const precosBau = { madeira: 10, prata: 40, ouro: 120 };
    $('loja-baus').innerHTML = Object.keys(precosBau).map((t) => `<button class="item-loja${t === 'ouro' ? ' destaque' : ''}" data-t="${t}">
      ${t === 'ouro' ? '<div class="faixa">Melhor oferta</div>' : ''}<img data-asset="ui/bau_${t}" alt="" />
      <div class="item-nome">${Estado.BAUS[t].nome}</div><div class="preco"><i class="ic-gema"></i>${precosBau[t]}</div></button>`).join('');
    $('loja-baus').querySelectorAll('button').forEach((el) => (el.onclick = () => {
      const t = el.dataset.t, p = precosBau[t];
      UI.modal({ titulo: `Comprar ${Estado.BAUS[t].nome.toLowerCase()}?`, html: `<img class="bau-aberto" data-asset="ui/bau_${t}" alt="" /><p>Abre na hora. Até ${Estado.BAUS[t].copias} cartas e ${Estado.BAUS[t].ouro[1]} de ouro.</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: `Comprar · ${p} 💎`, classe: 'principal', desativado: d().gemas < p, motivo: 'Gemas insuficientes',
          acao: () => { d().gemas -= p; mostrarBau(t, Estado.abrirBau(t)); } }] });
      Assets.fill();
    }));

    const pacotes = [[500, 20, 1], [2000, 70, 2], [6000, 180, 3]];
    $('loja-ouro').innerHTML = pacotes.map(([o, g, n], i) => `<button class="item-loja" data-i="${i}"><img data-asset="ui/ouro_${n}" alt="" />
      <div class="item-nome">${fmt(o)} de ouro</div><div class="preco"><i class="ic-gema"></i>${g}</div></button>`).join('');
    $('loja-ouro').querySelectorAll('button').forEach((el) => (el.onclick = () => {
      const [o, g] = pacotes[+el.dataset.i];
      UI.modal({ titulo: 'Comprar ouro?', html: `<p>${fmt(o)} de ouro por ${g} gemas.</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: d().gemas < g, motivo: 'Gemas insuficientes',
          acao: () => { d().gemas -= g; d().ouro += o; Estado.salvar(); UI.toast(`+${fmt(o)} de ouro!`); tudo(); } }] });
    }));
    Assets.fill($('loja-baus').parentElement);
  }

  // ---------- Cartas ----------
  let trocando = null;
  // ---------- Torres ----------
  function painelTorres() {
    const m = Estado.minhasTorres(), tropa = Estado.TROPAS_TORRE[m.tropa];
    const pode = Estado.podeEvoluirTorre();
    $('painel-torres').innerHTML = `<div class="torre-mini rei"><img data-asset="arena/torre_rei_azul" alt="" /><span class="nv-torre-grande">${m.rei}</span><b>Torre do Rei</b></div>
      <div class="torre-mini"><img data-asset="arena/torre_azul" alt="" /><span class="nv-torre-grande">${m.princesa}</span><b>Princesas</b></div>
      <div class="torre-mini mini-tropa"><span class="tropa-emoji">${tropa.emoji}</span><b>${tropa.nome}</b></div>
      <div class="torre-acao${pode.ok ? ' pode' : ''}">${pode.ok ? `Evoluir<small><img class="ic-img" data-asset="ui/moeda" alt="" /> ${fmt(pode.preco)}</small>` : 'Ver torres'}</div>`;
    $('painel-torres').onclick = telaTorres;
    Assets.fill();
  }

  function linhaStats(st, prox) {
    const dps = (x) => Math.round(x.dano / x.cadencia);
    const item = (rot, a, b) => `<div><span>${rot}</span><b>${fmt(a)}${b !== undefined && b !== a ? ` <em>+${fmt(b - a)}</em>` : ''}</b></div>`;
    return `<div class="stats-torre">${item('❤️ Vida', st.vida, prox && prox.vida)}${item('⚔️ Dano', st.dano, prox && prox.dano)}${item('🔥 Dano/s', dps(st), prox && dps(prox))}${item('🎯 Alcance', st.alcance)}</div>`;
  }

  function telaTorres() {
    const m = Estado.minhasTorres(), pode = Estado.podeEvoluirTorre();
    const rei = Estado.statsTorre('rei', m), prin = Estado.statsTorre('princesa', m);
    const proxPrin = m.princesa < Estado.NIVEL_MAX ? Estado.statsTorre('princesa', { ...m, princesa: m.princesa + 1 }) : null;
    const proxRei = m.rei < Estado.NIVEL_MAX ? Estado.statsTorre('rei', { ...m, rei: m.rei + 1 }) : null;
    const precoTxt = m.princesa >= Estado.NIVEL_MAX ? 'Nível máximo! 👑' : pode.ok ? `Evoluir · ${fmt(pode.preco)} 🪙` : pode.motivo === 'Ouro insuficiente' ? `Evoluir · ${fmt(Estado.TORRE_OURO[m.princesa])} 🪙` : pode.motivo;
    const md = UI.modal({
      titulo: '🏰 Suas torres',
      classe: 'modal-torres',
      html: `<div class="bloco-torre">
          <div class="bt-topo"><img data-asset="arena/torre_rei_azul" alt="" /><div><b>Torre do Rei</b><span class="nv-chip">Nível ${m.rei}</span>
            <small>Sobe sozinha junto com o seu nível de rei. Ganhe XP jogando e evoluindo cartas!</small></div></div>
          ${linhaStats(rei, proxRei)}
          ${proxRei ? `<p class="dica-torre">No nível de rei ${m.rei + 1} ela fica com os valores em verde.</p>` : ''}
        </div>
        <div class="bloco-torre">
          <div class="bt-topo"><img data-asset="arena/torre_azul" alt="" /><div><b>Torres das Princesas</b><span class="nv-chip">Nível ${m.princesa}</span>
            <small>Evolua com ouro. O nível máximo é o nível da sua Torre do Rei.</small></div></div>
          ${linhaStats(prin, proxPrin)}
          <button class="btn-modal ${pode.ok ? 'principal' : 'desativado'}" id="evoluir-torre">${precoTxt}</button>
        </div>
        <div class="titulo-conquistas">Tropa das torres</div>
        <div class="tropas-torre">${Object.entries(Estado.TROPAS_TORRE).map(([id, t]) => {
          const livre = m.rei >= t.rei, st = Estado.statsTorre('princesa', { ...m, tropa: id });
          return `<button class="tropa-torre${id === m.tropa ? ' escolhida' : ''}${livre ? '' : ' trancada'}" data-tropa="${id}">
            <span class="tropa-emoji">${livre ? t.emoji : '🔒'}</span><b>${t.nome}</b>
            <small>${livre ? t.desc : `Libera no nível de rei ${t.rei}`}</small>
            ${livre ? `<span class="tropa-num">❤️ ${fmt(st.vida)} · ⚔️ ${fmt(st.dano)} · 🔥 ${Math.round(st.dano / st.cadencia)}/s</span>` : ''}
            ${id === m.tropa ? '<i class="tag-escolhida">Em uso</i>' : ''}</button>`;
        }).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    });
    Assets.fill();
    md.el.querySelector('#evoluir-torre').onclick = () => {
      const r = Estado.evoluirTorre();
      if (!r.ok) { UI.toast(r.motivo === 'Nível máximo' ? 'Suas torres já estão no máximo! 👑' : r.motivo); return; }
      md.fechar(); topo(); cartas();
      torreEvoluiu(r.nivel);
    };
    md.el.querySelectorAll('[data-tropa]').forEach((b) => (b.onclick = () => {
      const t = Estado.TROPAS_TORRE[b.dataset.tropa];
      if (!Estado.escolherTropaTorre(b.dataset.tropa)) { UI.toast(`Libera no nível de rei ${t.rei}! 🔒`); return; }
      UI.toast(`${t.emoji} ${t.nome} vai defender suas torres!`);
      md.fechar(); cartas(); telaTorres();
    }));
  }

  function torreEvoluiu(nivel) {
    const fundo = document.createElement('div');
    fundo.className = 'level-up torre-up';
    fundo.innerHTML = `<div class="raios"></div>
      <div class="level-conteudo">
        <div class="level-texto">Torres evoluídas!</div>
        <div class="torre-up-img"><img data-asset="arena/torre_azul" alt="" /><span class="nv-torre-grande">${nivel}</span></div>
        <div class="level-premio">Mais vida e mais dano 💪</div>
        <button class="btn-modal principal">Oba!</button>
      </div>
      ${Array.from({ length: 24 }, (_, i) => `<i class="confete" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--c:${['#FAC775', '#85B7EB', '#5DCAA5', '#AFA9EC'][i % 4]};--r:${Math.round(Math.random() * 360)}deg"></i>`).join('')}`;
    document.getElementById('app').appendChild(fundo);
    Assets.fill();
    fundo.querySelector('button').onclick = () => { fundo.classList.add('sumir'); setTimeout(() => fundo.remove(), 250); };
  }

  function cartas() {
    const deck = d().deck;
    const etiqueta = (id) => {
      const col = d().colecao[id];
      const prec = Estado.COPIAS[col.nivel];
      const u = Estado.usosRestantes(id);
      if (u !== null) return `Nível ${col.nivel} · ${u} partida${u === 1 ? '' : 's'}`;
      return col.nivel >= Estado.NIVEL_MAX ? `Nível ${col.nivel} · máx` : `Nível ${col.nivel}`;
    };
    const barraCopias = (id) => {
      const col = d().colecao[id];
      if (col.nivel >= Estado.NIVEL_MAX) return '';
      const prec = Estado.COPIAS[col.nivel];
      const pode = Estado.podeEvoluir(id).ok;
      return `<div class="copias${pode ? ' pode' : ''}"><i style="width:${Math.min(100, (col.copias / prec) * 100)}%"></i><b>${pode ? 'Evoluir!' : `${col.copias}/${prec}`}</b></div>`;
    };
    painelTorres();
    $('deck').innerHTML = Array.from({ length: 8 }, (_, i) => {
      const id = deck[i];
      if (!id) return `<div class="slot-carta vazio-deck" data-slot="${i}"><div class="slot-deck">+</div><div class="carta-nivel">&nbsp;</div></div>`;
      return Cartas.html(Estado.carta(id), { nivel: etiqueta(id), extra: barraCopias(id) });
    }).join('');
    const media = deck.length ? deck.reduce((s, id) => s + Estado.carta(id).custo, 0) / deck.length : 0;
    $('elixir-medio').textContent = deck.length ? media.toFixed(1).replace('.', ',') : '–';

    const fora = Estado.catalogo().filter((c) => !deck.includes(c.id) && Estado.tem(c.id));
    const aDescobrir = Estado.catalogo().filter((c) => !Estado.tem(c.id));
    const temTotal = Estado.catalogo().filter((c) => Estado.tem(c.id)).length;
    $('colecao').innerHTML = (fora.length
      ? fora.map((c) => Cartas.html(c, { nivel: etiqueta(c.id), extra: barraCopias(c.id) })).join('')
      : '<p class="aviso" style="grid-column:1/-1">Todas as suas cartas desbloqueadas estão no deck.</p>')
      + (aDescobrir.length ? `<div class="divisor-colecao">A descobrir · ${temTotal}/${Estado.catalogo().length} desbloqueadas</div>` : '')
      + aDescobrir.map((c) => {
        const lib = Estado.liberada(c.id);
        return lib
          ? `<div class="slot-carta bloqueada-carta" data-id="${c.id}">${Cartas.html(c, { mini: true, extra: '<span class="cadeado">🎁</span>' })}<div class="carta-nivel">Nos baús</div></div>`
          : `<div class="slot-carta trancada-carta" data-id="${c.id}"><div class="carta-silhueta">🔒</div><div class="carta-nivel">${c.trofeus} troféus</div></div>`;
      }).join('');
    $('aviso-colecao').textContent = trocando
      ? `Toque numa carta do deck para trocar por ${Estado.carta(trocando).nome}.`
      : 'Toque numa carta para ver detalhes, colocar no deck ou evoluir. Desbloqueie mais cartas ganhando troféus e abrindo baús!';
    document.querySelector('.painel-deck').classList.toggle('trocando', !!trocando);

    $('deck').querySelectorAll('.slot-carta').forEach((el) => (el.onclick = () => {
      if (trocando) {
        const i = el.dataset.slot !== undefined ? +el.dataset.slot : deck.indexOf(el.dataset.id);
        if (i >= deck.length) deck.push(trocando); else deck[i] = trocando;
        trocando = null; Estado.salvar(); cartas(); UI.toast('Deck atualizado!');
        return;
      }
      if (el.dataset.id) detalhes(el.dataset.id);
    }));
    $('colecao').querySelectorAll('.slot-carta').forEach((el) => (el.onclick = () => {
      trocando = null;
      const id = el.dataset.id;
      if (Estado.tem(id)) return detalhes(id);
      const c = Estado.carta(id);
      if (Estado.liberada(id)) UI.modal({ titulo: c.nome, html: `<div class="compra">${Cartas.html(c, { mini: true })}<p>${Cartas.NOMES_RARIDADE[c.raridade]} · ${c.tipo}<br>Já pode aparecer nos <b>baús</b> e nas <b>ofertas da loja</b>. Ganhe a primeira cópia para desbloquear!</p></div>` });
      else UI.modal({ titulo: 'Carta misteriosa', html: `<div class="carta-silhueta grande">🔒</div><p>Chegue a <b>${c.trofeus} troféus</b> para liberar esta carta.</p><p class="aviso">Você tem ${d().recorde} de recorde.</p>` });
    }));
  }

  function detalhes(id) {
    const c = Estado.stats(id);
    const col = d().colecao[id];
    const noDeck = d().deck.includes(id);
    const ev = Estado.podeEvoluir(id);
    const mini = c.barril ? Estado.stats(c.barril.tropa, col.nivel) : null;
    const linhas = c.barril
      ? [['Minis', c.barril.qtd], ['Vida de cada', Math.round(mini.vida)], ['Dano de cada', Math.round(mini.dano)], ['Velocidade', 'Muito rápida'], ['Onde jogar', 'Qualquer lugar']]
      : c.feitico
      ? [['Dano', c.dano], ['Dano em torres', Math.round(c.dano * 0.35)], ['Raio', c.area]]
      : [['Vida', c.vida], ['Dano', c.dano], ['Velocidade', c.velocidade >= 55 ? 'Rápida' : c.velocidade >= 40 ? 'Média' : 'Lenta'],
         ['Alcance', c.alcance > 100 ? 'Muito longo (mais que as torres!)' : c.alcance > 40 ? 'Longo' : 'Corpo a corpo'], ['Ataque a cada', `${c.cadencia}s`], ['Alvo', c.alvo === 'construcoes' ? 'Torres' : 'Tudo'],
         ...(c.area ? [['Dano em área', 'Sim']] : []), ...(c.usos ? [['Partidas restantes', `${Estado.usosRestantes(id)} de ${c.usos}`]] : [])];
    const botoes = [];
    if (noDeck) botoes.push({ texto: 'Tirar do deck', classe: 'secundario', desativado: d().deck.length <= 1, motivo: 'O deck precisa de pelo menos 1 carta',
      acao: () => { d().deck = d().deck.filter((x) => x !== id); Estado.salvar(); cartas(); } });
    else botoes.push({ texto: 'Usar no deck', classe: 'secundario', acao: () => {
      if (d().deck.length < 8) { d().deck.push(id); Estado.salvar(); cartas(); UI.toast('Carta adicionada ao deck!'); }
      else { trocando = id; cartas(); irPara('cartas'); }
    } });
    if (col.nivel < Estado.NIVEL_MAX) botoes.push({ texto: `Evoluir · ${fmt(Estado.OURO[col.nivel])} ouro`, classe: 'principal', desativado: !ev.ok, motivo: ev.motivo,
      acao: () => {
        const antes = Estado.stats(id);
        const r = Estado.evoluir(id);
        tudo();
        cartaEvoluiu(id, antes, () => subiuNivel(r.niveis));
      } });
    UI.modal({
      titulo: c.nome,
      classe: 'modal-carta',
      html: `<div class="detalhe-carta">${Cartas.html(c, { mini: true })}
        <div><span class="raridade-tag ${c.raridade}">${Cartas.NOMES_RARIDADE[c.raridade]}</span>
        <p class="tipo">${c.tipo} · ${c.custo} de elixir</p><p>${c.descricao}</p>
        <p class="aviso">Nível ${col.nivel} · cópias ${col.copias}${col.nivel < Estado.NIVEL_MAX ? `/${Estado.COPIAS[col.nivel]}` : ''}</p></div></div>
        <div class="tabela-stats">${linhas.map(([k, v]) => `<div><span>${k}</span><b>${typeof v === 'number' ? fmt(v) : v}</b></div>`).join('')}</div>
        ${c.habilidade ? `<div class="hab-detalhe"><b>⚡ ${c.habilidade.nome}</b> · ${c.habilidade.custo} de elixir<br><small>${c.habilidade.descricao} Durante a batalha, toque no botão da habilidade que aparece na arena.</small></div>` : ''}
        ${c.passiva ? `<div class="hab-detalhe passiva"><b>🧩 ${c.passiva.nome}</b> · passiva (automática)<br><small>${c.passiva.descricao}</small></div>` : ''}`,
      botoes,
    });
  }

  function cartaEvoluiu(id, antes, depois) {
    const c = Estado.stats(id);
    let linhas;
    if (c.barril) {
      const m0 = Estado.stats(c.barril.tropa, antes.nivel), m1 = Estado.stats(c.barril.tropa, c.nivel);
      linhas = [['Vida das minis', m0.vida, m1.vida], ['Dano das minis', m0.dano, m1.dano]];
    } else linhas = c.feitico ? [['Dano', antes.dano, c.dano]] : [['Vida', antes.vida, c.vida], ['Dano', antes.dano, c.dano]];
    UI.modal({
      classe: 'modal-evolucao',
      html: `<div class="evo-raios"></div>
        <div class="evo-carta">${Cartas.html(c, { mini: true })}</div>
        <div class="evo-nivel"><span>Nível ${antes.nivel}</span><b>→</b><span class="novo">Nível ${c.nivel}</span></div>
        <div class="evo-stats">${linhas.map(([k, a, b]) => `<div><span>${k}</span><b>${UI.fmt(a)}</b><i>→</i><b class="novo">${UI.fmt(b)}</b><small>+${UI.fmt(b - a)}</small></div>`).join('')}</div>`,
      titulo: `${c.nome} evoluiu!`,
      botoes: [{ texto: 'Incrível!', classe: 'principal', acao: () => { if (depois) setTimeout(depois, 250); } }],
    });
  }

  // ---------- Clã ----------
  let busca = '';
  let abaCla = 'chat';
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escudo = (c) => `<div class="escudo" style="background:${c.cor}">${esc(c.letra || '?')}</div>`;
  const erroNuvem = (e) => (String(e && (e.code || e.message)).includes('permission')
    ? 'O Firebase recusou o acesso. Confira se as regras novas foram publicadas.'
    : `Não foi possível carregar (${esc((e && (e.code || e.message)) || 'erro')}).`);

  async function cla() {
    const caixa = $('cla-conteudo');
    Cla.pararOuvir();
    if (!Conta.logado()) {
      caixa.innerHTML = `<h2 class="titulo-secao"><span>Clãs</span></h2>
        <div class="cla-vazio"><div class="cla-icone">🛡️</div><p>Clãs são de <b>jogadores de verdade</b>: dá pra conversar e ver os troféus de todo mundo.</p>
        <p class="aviso">Para criar ou entrar num clã, você precisa de uma conta.</p>
        <button class="btn-modal btn-google" id="cla-google"><b>G</b> Entrar com Google</button>
        <button class="btn-modal secundario" id="cla-conta">Criar conta ou entrar com e-mail</button></div>`;
      $('cla-google').onclick = async () => { if (await Conta.salvarComGoogle()) tudo(); };
      $('cla-conta').onclick = async () => { await Conta.tela({ podeFechar: true }); tudo(); };
      return;
    }
    if (d().cla && d().cla.id) return meuCla(caixa);

    caixa.innerHTML = `<h2 class="titulo-secao"><span>Clãs</span></h2>
      <button class="btn-modal principal" id="criar-cla">＋ Criar meu clã</button>
      <div class="busca-linha"><input class="busca" id="busca-cla" type="text" placeholder="Buscar clã" value="${esc(busca)}" />
        <button class="btn-atualizar" id="atualizar-clas" title="Atualizar lista">🔄</button></div>
      <div class="lista-clas" id="lista-clas"><p class="aviso">Carregando clãs…</p></div>`;
    $('criar-cla').onclick = criarCla;
    let todos = [];
    const desenhar = () => {
      const lista = todos.filter((x) => x.nome.toLowerCase().includes(busca.toLowerCase()));
      $('lista-clas').innerHTML = lista.map((x) => {
        const n = Object.keys(x.membros || {}).length;
        const tr = Object.values(x.membros || {}).reduce((a, m) => a + (m.trofeus || 0), 0);
        return `<div class="cla">${escudo(x)}<div class="cla-info"><b>${esc(x.nome)}</b><span>${n}/${Cla.MAX} membros · ${fmt(tr)} troféus</span>${x.descricao ? `<small>${esc(x.descricao)}</small>` : ''}</div>
          <button class="btn-peq" data-id="${x.id}" ${n >= Cla.MAX ? 'disabled' : ''}>${n >= Cla.MAX ? 'Cheio' : 'Entrar'}</button></div>`;
      }).join('') || `<p class="aviso">${todos.length ? 'Nenhum clã com esse nome.' : 'Ainda não existe nenhum clã. Crie o primeiro!'}</p>`;
      $('lista-clas').querySelectorAll('[data-id]').forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        try { await Cla.entrar(b.dataset.id); UI.toast(`Você entrou em ${d().cla.nome}! 🛡️`); cla(); }
        catch (e) { UI.toast(e.message && !e.code ? e.message : erroNuvem(e)); b.disabled = false; }
      }));
    };
    const campo = $('busca-cla');
    campo.oninput = () => { busca = campo.value; desenhar(); };
    const carregar = async () => {
      const b = $('atualizar-clas');
      b.classList.add('girando'); b.disabled = true;
      try { todos = await Cla.listar(); desenhar(); }
      catch (e) { $('lista-clas').innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
      b.classList.remove('girando'); b.disabled = false;
    };
    $('atualizar-clas').onclick = async () => { await carregar(); UI.toast('Lista de clãs atualizada!'); };
    await carregar();
  }

  function criarCla() {
    let cor = Cla.CORES[0];
    const m = UI.modal({
      titulo: 'Criar clã',
      html: `<label class="campo">Nome do clã<input id="cla-nome" maxlength="20" placeholder="Ex.: Coroas Brilhantes" /></label>
        <label class="campo">Descrição<input id="cla-desc" maxlength="60" placeholder="Opcional" /></label>
        <div class="seletor-titulo">Cor do escudo</div>
        <div class="grade-cores">${Cla.CORES.map((c, i) => `<button data-cor="${c}" class="${i ? '' : 'escolhido'}" style="background:${c}"></button>`).join('')}</div>`,
      botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Criar', classe: 'principal', acao: (el) => {
        const nome = el.querySelector('#cla-nome').value.trim();
        if (nome.length < 3) { UI.toast('O nome precisa ter pelo menos 3 letras'); return false; }
        const descricao = el.querySelector('#cla-desc').value.trim();
        Cla.criar({ nome, descricao, cor }).then(() => { UI.toast(`Clã ${nome} criado! 👑`); cla(); }).catch((e) => UI.toast(erroNuvem(e)));
      } }],
    });
    m.el.querySelectorAll('[data-cor]').forEach((b) => (b.onclick = () => {
      cor = b.dataset.cor;
      m.el.querySelectorAll('[data-cor]').forEach((x) => x.classList.toggle('escolhido', x === b));
    }));
  }

  async function meuCla(caixa) {
    caixa.innerHTML = '<p class="aviso">Carregando seu clã…</p>';
    let c;
    try { c = await Cla.buscar(d().cla.id); } catch (e) { caixa.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; return; }
    if (!c || !(c.membros || {})[Conta.uid()]) { // clã acabou ou fui removido
      d().cla = null; Estado.salvar(); UI.toast('Você não está mais nesse clã'); return cla();
    }
    const souLider = c.lider === Conta.uid();
    const membros = Object.entries(c.membros).map(([u, m]) => ({ u, ...m })).sort((a, b) => (b.trofeus || 0) - (a.trofeus || 0));
    const total = membros.reduce((a, m) => a + (m.trofeus || 0), 0);
    caixa.innerHTML = `<div class="cla-topo">${escudo(c)}<div><b>${esc(c.nome)}</b><span>${membros.length}/${Cla.MAX} membros · 🏆 ${fmt(total)}</span>${c.descricao ? `<small>${esc(c.descricao)}</small>` : ''}</div>
        <div class="cla-botoes"><button class="btn-atualizar" id="atualizar-meu-cla" title="Atualizar">🔄</button><button class="btn-peq perigo" id="sair-cla">Sair</button></div></div>
      <div class="conta-abas cla-abas"><button data-aba="chat" class="${abaCla === 'chat' ? 'ativa' : ''}">💬 Chat</button><button data-aba="membros" class="${abaCla === 'membros' ? 'ativa' : ''}">👥 Membros</button></div>
      <div id="cla-aba"></div>`;
    caixa.querySelectorAll('.cla-abas button').forEach((b) => (b.onclick = () => { abaCla = b.dataset.aba; meuCla(caixa); }));
    $('atualizar-meu-cla').onclick = () => { meuCla(caixa); UI.toast('Clã atualizado!'); };
    $('sair-cla').onclick = () => UI.modal({ titulo: 'Sair do clã?', html: `<p>Você vai sair de ${esc(c.nome)}.${souLider && membros.length > 1 ? ' Outro membro vira líder.' : ''}${membros.length === 1 ? ' Você é o último membro, então o clã será apagado.' : ''}</p>`,
      botoes: [{ texto: 'Ficar', classe: 'secundario' }, { texto: 'Sair', classe: 'perigo', acao: () => { Cla.sair().then(() => { UI.toast('Você saiu do clã'); cla(); }).catch((e) => UI.toast(erroNuvem(e))); } }] });

    const aba = $('cla-aba');
    if (abaCla === 'membros') {
      aba.innerHTML = `<div class="lista-membros">${membros.map((m, i) => `<div class="membro${m.u === Conta.uid() ? ' voce' : ''}" data-perfil="${m.u}"><span class="pos">${i + 1}</span>
        <b>${Passe.nomeHtml(m.nome || 'Jogador', m.estiloNome)}${m.u === Conta.uid() ? ' (você)' : ''}</b>${m.u === c.lider ? '<span class="tag-lider">Líder</span>' : ''}
        <span><i class="ic-trofeu"></i> ${fmt(m.trofeus || 0)}</span>${souLider && m.u !== Conta.uid() ? `<button class="btn-expulsar" data-u="${m.u}" title="Remover">✕</button>` : ''}</div>`).join('')}</div>`;
      ligarPerfis(aba);
      aba.querySelectorAll('[data-u]').forEach((b) => (b.onclick = (ev) => ev.stopPropagation() || UI.modal({ titulo: 'Remover do clã?', html: `<p>${esc(c.membros[b.dataset.u].nome)} vai sair do clã.</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Remover', classe: 'perigo', acao: () => { Cla.expulsar(c.id, b.dataset.u).then(() => meuCla(caixa)).catch((e) => UI.toast(erroNuvem(e))); } }] })));
      return;
    }
    aba.innerHTML = `<div class="chat" id="chat"><p class="aviso">Carregando mensagens…</p></div>
      <form class="chat-enviar" id="chat-form"><input id="chat-texto" maxlength="200" placeholder="Escreva uma mensagem" autocomplete="off" /><button class="btn-peq">Enviar</button></form>
      <p class="aviso">Seja gentil 💕 Todos do clã veem as mensagens.</p>`;
    Cla.ouvirChat(c.id, (msgs) => {
      const chat = $('chat');
      if (!chat) return;
      if (msgs === null) { chat.innerHTML = `<p class="aviso">${erroNuvem({ code: 'permission' })}</p>`; return; }
      chat.innerHTML = msgs.length ? msgs.map((x) => `<div class="msg${x.uid === Conta.uid() ? ' minha' : ''}"><small>${Passe.nomeHtml(x.nome, x.estiloNome)}</small><span>${esc(x.texto)}</span></div>`).join('')
        : '<p class="aviso">Nenhuma mensagem ainda. Diga oi! 👋</p>';
      chat.scrollTop = chat.scrollHeight;
    });
    $('chat-form').onsubmit = (e) => {
      e.preventDefault();
      const t = $('chat-texto').value.trim();
      if (!t) return;
      $('chat-texto').value = '';
      Cla.enviar(c.id, t).catch((x) => UI.toast(erroNuvem(x)));
    };
  }

  // ---------- Eventos ----------
  function eventos() {
    const ev = d().eventos;
    const item = (classe, titulo, desc, extra, botao) => `<div class="evento ${classe}"><div><b>${titulo}</b><span>${desc}</span>${extra}</div>${botao}</div>`;
    const barra = (v, max) => `<div class="ev-barra"><i style="width:${Math.min(100, (v / max) * 100)}%"></i><small>${Math.min(v, max)}/${max}</small></div>`;
    const btnPremio = (pronto, pego, id) => pego ? '<div class="selo">Concluído ✓</div>' : pronto ? `<button class="selo botao" data-premio="${id}">Pegar prêmio</button>` : '<button class="selo botao" data-jogar="normal">Jogar</button>';
    const p = Passe.dados();
    const nv = Passe.nivel();
    const pend = Passe.pendentes();
    $('eventos-lista').innerHTML =
      `<button class="cartao-passe${p.ultra ? ' ultra' : p.plus ? ' plus' : ''}" id="abrir-passe">
        <div class="passe-topo"><b>🎟️ Passe da Temporada</b><small>${Passe.diasRestantes()} dias restantes</small></div>
        <div class="passe-linha"><span class="passe-nivel">${nv}</span><div class="ev-barra passe-barra"><i style="width:${nv >= Passe.NIVEIS ? 100 : ((p.pontos % Passe.PONTOS_NIVEL) / Passe.PONTOS_NIVEL) * 100}%"></i><small>${nv >= Passe.NIVEIS ? 'Completo!' : `${p.pontos % Passe.PONTOS_NIVEL}/${Passe.PONTOS_NIVEL}`}</small></div><span class="passe-tipo">${p.ultra ? 'ULTRA' : p.plus ? 'PLUS' : 'FREE'}</span></div>
        ${pend ? `<span class="passe-pendente">${pend} prêmio${pend > 1 ? 's' : ''} para pegar!</span>` : ''}
      </button>` +
      item('ev1', 'Desafio do Festival', 'Vença 3 batalhas seguidas · prêmio: baú de ouro', barra(ev.sequencia, 3), btnPremio(ev.sequencia >= 3, ev.desafioPremio, 'desafio')) +
      item('ev2', 'Torneio das Coroas', 'Junte 30 coroas · prêmio: 100 gemas', barra(ev.coroas, 30), btnPremio(ev.coroas >= 30, ev.torneioPremio, 'torneio')) +
      item('ev4', 'Elixir em dobro', 'A batalha inteira com elixir rápido', '', '<button class="selo botao" data-jogar="elixir2x">Jogar</button>') +
      item('ev3', 'Batalha em dupla', 'Jogue 2 contra 2 com um amigo', '', '<div class="selo">Em breve</div>');
    $('abrir-passe').onclick = telaPasse;
    $('eventos-lista').querySelectorAll('[data-jogar]').forEach((b) => (b.onclick = () => jogar(b.dataset.jogar)));
    $('eventos-lista').querySelectorAll('[data-premio]').forEach((b) => (b.onclick = () => {
      if (b.dataset.premio === 'desafio') { ev.desafioPremio = true; mostrarBau('ouro', Estado.abrirBau('ouro')); }
      else { ev.torneioPremio = true; d().gemas += 100; Estado.salvar(); UI.toast('+100 gemas! 💎'); tudo(); }
    }));
  }

  // ---------- Presentear (só a criadora) ----------
  function telaPresentear() {
    if (!Mod.ehCriador()) return;
    let alvo = null, tipo = 'carta';
    const cartasTodas = Estado.todasCartas().sort((a, b) => a.nome.localeCompare(b.nome));
    const md = UI.modal({
      titulo: '🎁 Presentear jogador',
      classe: 'modal-presentear',
      html: `<div class="pres-passo"><b>1. Para quem?</b>
          <div class="busca-amigo"><input id="pres-busca" maxlength="40" placeholder="Nome ou ID do jogador" autocomplete="off" /><button class="btn-modal principal" id="pres-buscar">🔍</button></div>
          <div id="pres-resultados"></div>
          <div id="pres-amigos" class="pres-chips"></div>
          <div id="pres-alvo" class="pres-alvo oculto"></div>
        </div>
        <div class="pres-passo"><b>2. O que dar?</b>
          <div class="conta-abas pres-abas">${[['carta', '🃏 Carta'], ['passe', '🎟️ Passe'], ['ouro', '🪙 Ouro'], ['gemas', '💎 Gemas']].map(([k, t]) => `<button data-tipo="${k}">${t}</button>`).join('')}</div>
          <div id="pres-opcoes"></div>
          <input id="pres-msg" maxlength="80" placeholder="Mensagem (opcional) 💌" autocomplete="off" />
        </div>
        <button class="btn-modal principal pres-enviar" id="pres-enviar">🎁 Enviar presente</button>
        <div id="pres-pendentes"></div>`,
      botoes: [{ texto: 'Fechar', classe: 'secundario' }],
    });
    const el = md.el, $q = (s) => el.querySelector(s);

    const escolherAlvo = async (p) => {
      alvo = p;
      $q('#pres-resultados').innerHTML = '';
      $q('#pres-alvo').classList.remove('oculto');
      $q('#pres-alvo').innerHTML = `<img src="${avatarDe(p.avatar)}" alt="" /><div><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.uid}</small></div><button class="btn-peq" id="pres-trocar">trocar</button>`;
      $q('#pres-trocar').onclick = () => { alvo = null; $q('#pres-alvo').classList.add('oculto'); $q('#pres-pendentes').innerHTML = ''; };
      mostrarPendentes();
    };
    const mostrarPendentes = async () => {
      const caixa = $q('#pres-pendentes');
      if (!alvo) { caixa.innerHTML = ''; return; }
      try {
        const lista = await Presentes.pendentes(alvo.uid);
        caixa.innerHTML = lista.length ? `<div class="titulo-conquistas">Ainda não recebidos (${lista.length})</div>
          <div class="lista-jogadores">${lista.map((p) => `<div class="linha-jogador"><div class="lj-nome"><b>${Presentes.descrever(p)}</b>${p.mensagem ? `<small>💌 ${esc(p.mensagem)}</small>` : ''}</div><button class="btn-peq perigo" data-cancelar="${p.id}">✕</button></div>`).join('')}</div>` : '';
        caixa.querySelectorAll('[data-cancelar]').forEach((b) => (b.onclick = async () => { await Presentes.cancelar(alvo.uid, b.dataset.cancelar); UI.toast('Presente cancelado'); mostrarPendentes(); }));
      } catch (e) { caixa.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
    };

    // atalhos: seus amigos
    Amigos.listar().then((lista) => {
      $q('#pres-amigos').innerHTML = lista.length ? `<small>Seus amigos:</small> ${lista.map((p) => `<button class="pres-chip" data-u="${p.uid}">${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</button>`).join('')}` : '';
      $q('#pres-amigos').querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => escolherAlvo(lista.find((p) => p.uid === b.dataset.u))));
    }).catch(() => {});

    const buscar = async () => {
      const t = $q('#pres-busca').value.trim();
      if (!t) return;
      const res = $q('#pres-resultados');
      res.innerHTML = '<div class="x1-carregando"></div>';
      try {
        let lista = await Amigos.buscar(t);
        if (!lista.length && t.length >= 20) lista = [{ uid: t, nome: 'Jogador (sem perfil público)' }];
        res.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => `<div class="linha-jogador clicavel" data-u="${p.uid}"><div class="lj-avatar"><img src="${avatarDe(p.avatar)}" alt="" /></div><div class="lj-nome"><b>${Passe.nomeHtml(p.nome || 'Jogador', p.estiloNome)}</b><small>${p.uid}</small></div></div>`).join('')}</div>` : '<p class="aviso">Ninguém encontrado. Tente colar o ID.</p>';
        res.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => escolherAlvo(lista.find((p) => p.uid === b.dataset.u))));
      } catch (e) { res.innerHTML = `<p class="aviso">${erroNuvem(e)}</p>`; }
    };
    $q('#pres-buscar').onclick = buscar;
    $q('#pres-busca').onkeydown = (e) => { if (e.key === 'Enter') buscar(); };

    const opcoes = () => {
      el.querySelectorAll('.pres-abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.tipo === tipo));
      const o = $q('#pres-opcoes');
      if (tipo === 'carta') {
        o.innerHTML = `<select id="pres-carta">${cartasTodas.map((c) => `<option value="${c.id}">${c.nome}${c.exclusivo ? ' ⭐ exclusiva' : ''}</option>`).join('')}</select>
          <div class="pres-linha"><label>Nível <select id="pres-nivel">${Array.from({ length: Estado.NIVEL_MAX }, (_, i) => `<option ${i + 1 === Estado.NIVEL_MAX ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
          <label>Cópias extras <input id="pres-copias" type="number" min="0" max="9999" value="0" /></label></div>
          <div id="pres-previa" class="pres-previa"></div>`;
        const previa = () => { const c = Estado.carta($q('#pres-carta').value); $q('#pres-previa').innerHTML = Cartas.html(c, { nivel: `Nível ${$q('#pres-nivel').value}` }); };
        $q('#pres-carta').onchange = previa; $q('#pres-nivel').onchange = previa; previa();
      } else if (tipo === 'passe') {
        o.innerHTML = `<div class="pres-linha"><label class="pres-radio"><input type="radio" name="pres-passe" value="plus" /> Plus</label><label class="pres-radio"><input type="radio" name="pres-passe" value="ultra" checked /> Ultra 👑</label></div>
          <p class="aviso">Vale para a temporada atual (${Passe.dados().temporada}).</p>`;
      } else {
        const presets = tipo === 'ouro' ? [500, 1000, 5000, 10000] : [50, 100, 500, 1000];
        o.innerHTML = `<input id="pres-qtd" type="number" min="1" max="1000000" value="${presets[1]}" />
          <div class="pres-chips">${presets.map((v) => `<button class="pres-chip" data-qtd="${v}">${UI.fmt(v)}</button>`).join('')}</div>`;
        o.querySelectorAll('[data-qtd]').forEach((b) => (b.onclick = () => { $q('#pres-qtd').value = b.dataset.qtd; }));
      }
    };
    el.querySelectorAll('.pres-abas button').forEach((b) => (b.onclick = () => { tipo = b.dataset.tipo; opcoes(); }));
    opcoes();

    $q('#pres-enviar').onclick = async () => {
      if (!alvo) { UI.toast('Escolha para quem é o presente primeiro!'); return; }
      let item;
      if (tipo === 'carta') item = { tipo, carta: $q('#pres-carta').value, nivel: +$q('#pres-nivel').value, copias: Math.max(0, Math.round(+$q('#pres-copias').value || 0)) };
      else if (tipo === 'passe') item = { tipo, passe: el.querySelector('input[name="pres-passe"]:checked').value, temporada: Passe.dados().temporada };
      else {
        const qtd = Math.round(+$q('#pres-qtd').value || 0);
        if (qtd <= 0) { UI.toast('Coloque uma quantidade'); return; }
        item = { tipo, qtd };
      }
      const msg = $q('#pres-msg').value.trim();
      if (msg) item.mensagem = msg;
      const btn = $q('#pres-enviar');
      btn.disabled = true;
      try {
        await Presentes.enviar(alvo.uid, item);
        UI.toast(`🎁 Presente enviado para ${alvo.nome || 'o jogador'}!`);
        $q('#pres-msg').value = '';
        mostrarPendentes();
      } catch (e) { UI.toast(e.code ? erroNuvem(e) : e.message); }
      btn.disabled = false;
    };
  }

  function telaEstiloNome() {
    const tem = Passe.temTrilha('plus'), ultra = Passe.temTrilha('ultra'), atual = Passe.estiloNome();
    const grupos = ['Cor', 'Gradiente', 'Animado'];
    const md = UI.modal({
      titulo: '🎨 Estilo do nome',
      classe: 'modal-estilo-nome',
      html: `<div class="previa-nome">${Passe.nomeHtml(d().nome, atual)}</div>
        ${tem ? '' : '<p class="aviso">✨ Cores e gradientes no nome são vantagem do <b>Passe Plus</b> e do <b>Passe Ultra</b>. Os animados são só do Ultra!</p>'}
        ${tem && !ultra ? '<p class="aviso">Os estilos <b>animados</b> são só do Passe Ultra.</p>' : ''}
        <button class="estilo-op${atual ? '' : ' escolhido'}" data-estilo="">Normal</button>
        ${grupos.map((g) => `<div class="titulo-conquistas">${g === 'Cor' ? 'Cores' : g === 'Gradiente' ? 'Gradientes' : 'Animados 👑 Ultra'}</div>
          <div class="grade-estilos">${Object.entries(Passe.ESTILOS_NOME).filter(([, e]) => e.tipo === g).map(([id, e]) => `<button class="estilo-op${id === atual ? ' escolhido' : ''}${Passe.podeEstilo(id) ? '' : ' trancado'}" data-estilo="${id}">
            ${Passe.nomeHtml(e.nome, id)}${Passe.podeEstilo(id) ? '' : '<i>🔒</i>'}</button>`).join('')}</div>`).join('')}`,
      botoes: tem ? [{ texto: 'Fechar', classe: 'principal', acao: () => { topo(); } }]
        : [{ texto: 'Fechar', classe: 'secundario' }, { texto: '🎟️ Ver passe', classe: 'principal', acao: () => { telaPasse(); } }],
    });
    md.el.querySelectorAll('[data-estilo]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.estilo;
      if (!Passe.escolherEstilo(id)) {
        UI.toast(id && Passe.ESTILOS_NOME[id].ultra ? 'Esse estilo é só do Passe Ultra! 👑' : 'Compre o Passe Plus ou Ultra para mudar a cor do nome! 🎟️');
        return;
      }
      md.el.querySelectorAll('[data-estilo]').forEach((x) => x.classList.toggle('escolhido', x === b));
      md.el.querySelector('.previa-nome').innerHTML = Passe.nomeHtml(d().nome, Passe.estiloNome());
      topo();
    }));
  }

  function telaPasse() {
    const p = Passe.dados();
    const nv = Passe.nivel();
    const trilhas = [['free', 'Free'], ['plus', 'Plus'], ['ultra', 'Ultra']];
    const linha = (n) => `<div class="passe-nv${n <= nv ? ' alcancado' : ''}"><span class="passe-num">${n}</span>${trilhas.map(([t]) => {
      const r = Passe.recompensa(t, n);
      const pego = p.pegos[t].includes(n);
      const pode = Passe.podePegar(t, n);
      const tranc = !Passe.temTrilha(t);
      return `<button class="premio ${t}${pego ? ' pego' : ''}${pode ? ' pode' : ''}${tranc ? ' trancado' : ''}" data-t="${t}" data-n="${n}">
        <span class="premio-ic">${pego ? '✔' : Passe.icone(r)}</span><small>${Passe.texto(r)}</small>${tranc ? '<i>🔒</i>' : ''}</button>`;
    }).join('')}</div>`;
    const m = UI.modal({
      titulo: '🎟️ Passe da Temporada',
      classe: 'modal-passe',
      html: `<p class="aviso">Ganhe pontos jogando batalhas (vitória 40, derrota 15, +8 por coroa). Temporada termina em ${Passe.diasRestantes()} dias.</p>
        <p class="vantagem-passe">✨ Plus e Ultra: <b>cor e gradiente no nome</b> (vá no seu perfil). Ultra: estilos <span class="nome-estilo nc-arco-iris">animados</span>!</p>
        <div class="passe-compras">
          <button class="comprar-passe plus${p.plus || p.ultra ? ' tem' : ''}" data-c="plus"><b>PLUS</b><small>${p.plus || p.ultra ? 'Ativo ✔' : `💎 ${Passe.precoAtual('plus')}`}</small></button>
          <button class="comprar-passe ultra${p.ultra ? ' tem' : ''}" data-c="ultra"><b>ULTRA</b><small>${p.ultra ? 'Ativo ✔' : `💎 ${Passe.precoAtual('ultra')}`}</small></button>
        </div>
        <div class="passe-cab"><span>Nv</span><span>Free</span><span>Plus</span><span>Ultra</span></div>
        <div class="passe-trilhas">${Array.from({ length: Passe.NIVEIS }, (_, i) => linha(i + 1)).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal', acao: () => eventos() }],
    });
    const el = m.el;
    const alvo = el.querySelectorAll('.passe-nv')[Math.max(0, nv - 2)];
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: 'center' }), 50);
    el.querySelectorAll('.premio').forEach((b) => (b.onclick = () => {
      const t = b.dataset.t, n = +b.dataset.n;
      if (!Passe.temTrilha(t)) return UI.toast(`Compre o passe ${t === 'plus' ? 'Plus' : 'Ultra'} para pegar`);
      if (n > Passe.nivel()) return UI.toast(`Chegue ao nível ${n} do passe`);
      const res = Passe.pegar(t, n);
      if (!res) return;
      b.classList.add('pego'); b.classList.remove('pode'); b.querySelector('.premio-ic').textContent = '✔';
      topo();
      if (res.extra && res.extra.bau) mostrarBau(res.extra.bau, res.extra.abertura);
      else if (res.extra && res.extra.carta) UI.toast(`🃏 +${res.extra.qtd} ${res.extra.carta.nome}!`);
      else UI.toast(`+ ${Passe.texto(res.r)}!`);
    }));
    el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      const t = b.dataset.c;
      if (Passe.dados()[t] || (t === 'plus' && Passe.dados().ultra)) return UI.toast('Você já tem esse passe');
      const preco = Passe.precoAtual(t);
      UI.modal({
        titulo: `Comprar passe ${t === 'plus' ? 'Plus' : 'Ultra'}?`,
        html: t === 'plus'
          ? `<p>Libera a trilha <b>Plus</b> desta temporada: muito ouro, baús de prata e de ouro e gemas.</p><p><b>💎 ${preco} gemas</b></p>`
          : `<p>Libera as trilhas <b>Plus e Ultra</b>: baús de ouro, cartas épicas e <b>cartas lendárias</b>.</p><p><b>💎 ${preco} gemas</b>${Passe.dados().plus ? ' (desconto de quem já tem o Plus)' : ''}</p>`,
        botoes: [{ texto: 'Agora não', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: d().gemas < preco, motivo: `Faltam ${preco - d().gemas} gemas`,
          acao: () => { const r = Passe.comprar(t); if (r.ok) { UI.toast(`Passe ${t === 'plus' ? 'Plus' : 'Ultra'} ativado! ✨`); m.fechar(); topo(); setTimeout(telaPasse, 250); } } }],
      });
    }));
  }

  window.telaPresentear = telaPresentear; // usado pelo mod menu
  function tudo() {
    Mod.mostrarBotao(tudo);
    if (Conta.logado()) Amigos.ouvir({ aoMudarPedidos: mudouPedidos, aoConvite: conviteX1 });
    if (Conta.logado()) Presentes.ouvir(chegaramPresentes);
    topo(); telaBatalha(); loja(); cartas(); cla(); eventos();
  }

  // ---------- Início ----------
  const lista = await Cartas.carregar();
  Estado.carregar(lista);
  Arena.render($('arena-mini'), { petalas: false });
  document.getElementById('barra-elixir').innerHTML = Array.from({ length: 10 }, () => '<span></span>').join('');
  Assets.fill();
  tudo();
  irPara('batalha');
  setInterval(() => { if (d().baus.some((b) => b && b.inicio)) baus(); }, 1000);
  const sessao = Conta.verificarSessao(); // confere o login enquanto a tela de título aparece
  await Titulo.mostrar();
  if (await sessao) UI.toast(`Bem-vindo(a) de volta, ${d().nome}! ☁️`);
  await Conta.tela();
  tudo();
  if (d().presenteNovo) {
    const c = Estado.carta(d().presenteNovo);
    d().presenteNovo = null; Estado.salvar();
    UI.modal({
      titulo: '🎁 Presente exclusivo!',
      classe: 'modal-liberadas',
      html: `<div class="evo-raios"></div><div class="liberadas"><div class="liberada">${Cartas.html(c, { mini: true })}<b>${c.nome}</b></div></div>
        <p>Você ganhou uma carta <b>exclusiva</b> que só existe na sua conta!${c.nivelInicial ? ` Ela já vem no <b>nível ${c.nivelInicial}</b>.` : ''}</p>
        ${c.usos ? `<p class="aviso">⚠️ Ela só pode lutar em <b>${c.usos} partidas</b>. Depois disso, ela vai embora. Use com sabedoria!</p>` : ''}`,
      botoes: [{ texto: 'Que demais!', classe: 'principal' }],
    });
  }
  if (!d().boasVindas) {
    d().boasVindas = true; Estado.salvar();
    UI.modal({
      titulo: 'Boas-vindas ao Queens and Kings!',
      html: `<div class="boas-vindas">👑</div><p>Você ainda não tem nenhuma carta. Abra seus <b>4 baús iniciais</b> para ganhar as <b>8 cartas básicas</b> e montar seu primeiro deck!</p>
        <p class="aviso">Depois, vença batalhas para ganhar troféus e liberar cartas novas.</p>`,
      botoes: [{ texto: 'Vamos lá!', classe: 'principal' }],
    });
  }
})();
