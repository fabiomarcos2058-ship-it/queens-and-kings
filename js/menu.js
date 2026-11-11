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
    $('nome').textContent = d().nome;
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
      ['🛡️', 'Em equipe', 'Entre num clã', d().cla ? 1 : 0, 1],
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
            <div class="perfil-nivel"><div class="nivel" data-n="${d().nivel}"></div>
              <div class="perfil-xp"><i style="width:${(d().xp / xpMax) * 100}%"></i><small>${d().xp}/${xpMax} XP</small></div></div>
            ${d().cla ? `<div class="perfil-cla">🛡️ ${d().cla}</div>` : ''}
          </div>
        </div>
        <div class="seletor oculto" id="seletor-avatar">
          <div class="seletor-titulo">Escolha seu avatar</div>
          <div class="grade-avatares">${opcoesAvatar.map((a) => `<button data-av="${a}" class="${a === d().avatar ? 'escolhido' : ''}"><img src="${avatarUrl(a)}" alt="" /></button>`).join('')}</div>
          <div class="seletor-titulo">Cor do perfil</div>
          <div class="grade-cores">${Object.entries(CORES).map(([k, v]) => `<button data-cor="${k}" class="${k === d().cor ? 'escolhido' : ''}" style="background:${v}"></button>`).join('')}</div>
        </div>
        <div class="perfil-conta">${Conta.logado()
          ? `<span>☁️ Salvo na conta<br><b>${Conta.email()}</b></span><button class="btn-peq perigo" id="btn-sair-conta">Sair</button>`
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
    const btnEntrar = el.querySelector('#btn-entrar-conta');
    if (btnEntrar) btnEntrar.onclick = async () => { m.fechar(); await Conta.tela({ podeFechar: true }); tudo(); };
    const btnGoogle = el.querySelector('#btn-salvar-google');
    if (btnGoogle) btnGoogle.onclick = async () => { btnGoogle.disabled = true; if (await Conta.salvarComGoogle()) { m.fechar(); tudo(); } btnGoogle.disabled = false; };
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

  function jogar(modo) {
    if (!d().deck.length) {
      if (d().baus.some((b) => b && b.tipo === 'inicial')) { UI.toast('Abra seus baús iniciais para ganhar cartas! 🎁'); irPara('batalha'); document.getElementById('baus').classList.add('chamando'); setTimeout(() => document.getElementById('baus').classList.remove('chamando'), 1600); }
      else { UI.toast('Coloque cartas no deck primeiro!'); irPara('cartas'); }
      return;
    }
    Batalha.iniciar({ modo, fim: fimDeBatalha });
  }

  function fimDeBatalha(r) {
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
        <div class="xp-resultado"><div class="nivel" data-n="${nivelAntes}"></div><div class="perfil-xp"><i id="xp-anim" style="width:${(xpAntes / Estado.XP_NIVEL(nivelAntes)) * 100}%"></i><small>+${xpGanho} XP</small></div></div>`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => { Batalha.fechar(); tudo(); irPara('batalha'); subiuNivel(niveis, () => cartasLiberadas(liberadas)); } }],
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
  function cartas() {
    const deck = d().deck;
    const etiqueta = (id) => {
      const col = d().colecao[id];
      const prec = Estado.COPIAS[col.nivel];
      return col.nivel >= Estado.NIVEL_MAX ? `Nível ${col.nivel} · máx` : `Nível ${col.nivel}`;
    };
    const barraCopias = (id) => {
      const col = d().colecao[id];
      if (col.nivel >= Estado.NIVEL_MAX) return '';
      const prec = Estado.COPIAS[col.nivel];
      const pode = Estado.podeEvoluir(id).ok;
      return `<div class="copias${pode ? ' pode' : ''}"><i style="width:${Math.min(100, (col.copias / prec) * 100)}%"></i><b>${pode ? 'Evoluir!' : `${col.copias}/${prec}`}</b></div>`;
    };
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
    const linhas = c.feitico
      ? [['Dano', c.dano], ['Dano em torres', Math.round(c.dano * 0.35)], ['Raio', c.area]]
      : [['Vida', c.vida], ['Dano', c.dano], ['Velocidade', c.velocidade >= 55 ? 'Rápida' : c.velocidade >= 40 ? 'Média' : 'Lenta'],
         ['Alcance', c.alcance > 40 ? 'Longo' : 'Corpo a corpo'], ['Ataque a cada', `${c.cadencia}s`], ['Alvo', c.alvo === 'construcoes' ? 'Torres' : 'Tudo'],
         ...(c.area ? [['Dano em área', 'Sim']] : [])];
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
        <div class="tabela-stats">${linhas.map(([k, v]) => `<div><span>${k}</span><b>${typeof v === 'number' ? fmt(v) : v}</b></div>`).join('')}</div>`,
      botoes,
    });
  }

  function cartaEvoluiu(id, antes, depois) {
    const c = Estado.stats(id);
    const linhas = c.feitico ? [['Dano', antes.dano, c.dano]] : [['Vida', antes.vida, c.vida], ['Dano', antes.dano, c.dano]];
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
  const CLAS = [
    { nome: 'Coroas de Sakura', letra: 'S', cor: 'e1', membros: 32, trofeus: 1200 },
    { nome: 'Torre do Sino', letra: 'T', cor: 'e2', membros: 18, trofeus: 800 },
    { nome: 'Lanternas Vermelhas', letra: 'L', cor: 'e3', membros: 45, trofeus: 2100 },
    { nome: 'Rio das Pétalas', letra: 'R', cor: 'e4', membros: 9, trofeus: 300 },
  ];
  const NOMES = ['Hana', 'Kaito', 'Yumi', 'Ren', 'Sora', 'Mika', 'Daichi', 'Aoi', 'Haru', 'Nori', 'Yuki', 'Kenji'];
  let busca = '';
  function cla() {
    const c = CLAS.find((x) => x.nome === d().cla);
    if (c) {
      const membros = [{ n: d().nome, t: d().trofeus, voce: true }, ...NOMES.slice(0, 8).map((n, i) => ({ n, t: Math.max(0, c.trofeus / 20 + 300 - i * 40) }))]
        .sort((a, b) => b.t - a.t);
      $('cla-conteudo').innerHTML = `<div class="cla-topo"><div class="escudo ${c.cor}">${c.letra}</div><div><b>${c.nome}</b><span>${c.membros + 1}/50 membros</span></div>
        <button class="btn-peq perigo" id="sair-cla">Sair</button></div>
        <h2 class="titulo-secao"><span>Membros</span></h2>
        <div class="lista-membros">${membros.map((m, i) => `<div class="membro${m.voce ? ' voce' : ''}"><span class="pos">${i + 1}</span><b>${m.n}${m.voce ? ' (você)' : ''}</b><span><i class="ic-trofeu"></i> ${fmt(Math.round(m.t))}</span></div>`).join('')}</div>
        <p class="aviso">Chat e doação de cartas chegam com o modo online.</p>`;
      $('sair-cla').onclick = () => UI.modal({ titulo: 'Sair do clã?', html: `<p>Você vai sair de ${c.nome}.</p>`,
        botoes: [{ texto: 'Ficar', classe: 'secundario' }, { texto: 'Sair', classe: 'perigo', acao: () => { d().cla = null; Estado.salvar(); cla(); } }] });
      return;
    }
    const lista = CLAS.filter((x) => x.nome.toLowerCase().includes(busca.toLowerCase()));
    $('cla-conteudo').innerHTML = `<h2 class="titulo-secao"><span>Clãs</span></h2>
      <input class="busca" id="busca-cla" type="text" placeholder="Buscar clã" value="${busca}" />
      <div class="lista-clas">${lista.map((x) => `<div class="cla"><div class="escudo ${x.cor}">${x.letra}</div><div class="cla-info"><b>${x.nome}</b><span>${x.membros}/50 membros · ${fmt(x.trofeus)} troféus</span></div><button class="btn-peq" data-n="${x.nome}">Entrar</button></div>`).join('') || '<p class="aviso">Nenhum clã com esse nome.</p>'}</div>`;
    const campo = $('busca-cla');
    campo.oninput = () => { busca = campo.value; const pos = campo.selectionStart; cla(); const n = $('busca-cla'); n.focus(); n.setSelectionRange(pos, pos); };
    $('cla-conteudo').querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { d().cla = b.dataset.n; Estado.salvar(); UI.toast(`Você entrou em ${b.dataset.n}!`); cla(); }));
  }

  // ---------- Eventos ----------
  function eventos() {
    const ev = d().eventos;
    const item = (classe, titulo, desc, extra, botao) => `<div class="evento ${classe}"><div><b>${titulo}</b><span>${desc}</span>${extra}</div>${botao}</div>`;
    const barra = (v, max) => `<div class="ev-barra"><i style="width:${Math.min(100, (v / max) * 100)}%"></i><small>${Math.min(v, max)}/${max}</small></div>`;
    const btnPremio = (pronto, pego, id) => pego ? '<div class="selo">Concluído ✓</div>' : pronto ? `<button class="selo botao" data-premio="${id}">Pegar prêmio</button>` : '<button class="selo botao" data-jogar="normal">Jogar</button>';
    $('eventos-lista').innerHTML =
      item('ev1', 'Desafio do Festival', 'Vença 3 batalhas seguidas · prêmio: baú de ouro', barra(ev.sequencia, 3), btnPremio(ev.sequencia >= 3, ev.desafioPremio, 'desafio')) +
      item('ev2', 'Torneio das Coroas', 'Junte 30 coroas · prêmio: 100 gemas', barra(ev.coroas, 30), btnPremio(ev.coroas >= 30, ev.torneioPremio, 'torneio')) +
      item('ev4', 'Elixir em dobro', 'A batalha inteira com elixir rápido', '', '<button class="selo botao" data-jogar="elixir2x">Jogar</button>') +
      item('ev3', 'Batalha em dupla', 'Jogue 2 contra 2 com um amigo', '', '<div class="selo">Em breve</div>');
    $('eventos-lista').querySelectorAll('[data-jogar]').forEach((b) => (b.onclick = () => jogar(b.dataset.jogar)));
    $('eventos-lista').querySelectorAll('[data-premio]').forEach((b) => (b.onclick = () => {
      if (b.dataset.premio === 'desafio') { ev.desafioPremio = true; mostrarBau('ouro', Estado.abrirBau('ouro')); }
      else { ev.torneioPremio = true; d().gemas += 100; Estado.salvar(); UI.toast('+100 gemas! 💎'); tudo(); }
    }));
  }

  function tudo() {
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
