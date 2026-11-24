// Mod menu do criador. Só aparece para os IDs de jogador listados em CRIADORES.
// (O ID aparece no perfil de quem está logado numa conta.)
const CRIADORES = ['TxtfHnU2BXbcWpHkOSlDZQRpYNw1'];
// Contas que enfrentam o bot "apelão" (só as cartas mais fortes do jogo)
const BOT_APELAO = ['ZwrffaFMcidTzZAGCMJNXOtuuOh2', 'EwnFPrCPFUMawnc6dttsQQ98yII2'];

const Mod = (() => {
  const flags = { elixirInfinito: false, torresInvenciveis: false, danoX5: false, iaParada: false, recargaZero: false, tropasInvenciveis: false, invocacaoGratis: false, vel: 1 };
  const ehCriador = () => !!Conta.uid() && CRIADORES.includes(Conta.uid());
  const flag = (k) => ehCriador() && flags[k];
  const vel = () => (ehCriador() ? flags.vel : 1);
  let aoMudar = () => {};


  const hojeTxt = () => { const a = new Date(); return `${a.getFullYear()}-${a.getMonth() + 1}-${a.getDate()}`; };
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // pergunta um nome e devolve a carta (qualquer uma, até as de evento e exclusivas)
  function escolherCarta() {
    const q = prompt('Nome (ou parte do nome) da carta:');
    if (!q) return null;
    const ach = Estado.todasCartas().filter((c) => norm(c.nome).includes(norm(q)) || norm(c.id).includes(norm(q)));
    if (!ach.length) { UI.toast('Nenhuma carta encontrada'); return null; }
    if (ach.length === 1) return ach[0];
    const lista = ach.slice(0, 12);
    const n = prompt(`Qual delas?\n${lista.map((c, i) => `${i + 1}. ${c.nome}`).join('\n')}`, '1');
    return lista[(+n || 0) - 1] || null;
  }
  function darCarta(c, nivel, copias) {
    const d = Estado.d;
    const col = d.colecao[c.id] || (d.colecao[c.id] = { tem: false, nivel: 1, copias: 0 });
    col.tem = true; col.nivel = Math.max(col.nivel || 1, nivel); col.copias = (col.copias || 0) + copias;
    if (c.exclusivo && !(d.cartasExtras || []).includes(c.id)) d.cartasExtras = [...(d.cartasExtras || []), c.id];
    if (d.esgotadas) d.esgotadas = d.esgotadas.filter((x) => x !== c.id);
    try { Estado.recarregarCatalogo(); } catch (e) { /* nada */ }
  }

  function marcar() { Estado.d.modUsado = true; Estado.salvar(); aoMudar(); }

  function acoes() {
    const d = Estado.d;
    const todas = () => Estado.catalogo();
    return [
      ['💰 Recursos', [
        ['+1.000 ouro', () => { d.ouro += 1000; }],
        ['+10.000 ouro', () => { d.ouro += 10000; }],
        ['+500 gemas', () => { d.gemas += 500; }],
        ['+5.000 gemas', () => { d.gemas += 5000; }],
        ['+1 nível', () => { d.nivel += 1; }],
        ['Definir troféus', () => { const v = prompt('Quantos troféus?', d.trofeus); if (v !== null && !isNaN(+v)) { d.trofeus = Math.max(0, Math.round(+v)); d.recorde = Math.max(d.recorde, d.trofeus); } }],
      ]],
      ['🃏 Cartas', [
        ['Desbloquear todas', () => { todas().forEach((c) => (d.colecao[c.id].tem = true)); d.recorde = Math.max(d.recorde, ...todas().map((c) => c.trofeus || 0)); }],
        ['+100 cópias de todas', () => { todas().forEach((c) => { d.colecao[c.id].tem = true; d.colecao[c.id].copias += 100; }); }],
        ['Todas no nível máximo', () => { todas().forEach((c) => { d.colecao[c.id].tem = true; d.colecao[c.id].nivel = Estado.NIVEL_CARTA_MAX; }); }],
      ]],
      ['🎁 Baús', [
        ['Terminar tempo dos baús', () => { d.baus.forEach((b) => { if (b) b.inicio = 1; }); }],
        ['Encher com baús de ouro', () => { d.baus = d.baus.map((b) => b || { tipo: 'ouro', inicio: 1 }); }],
      ]],
      ['🎟️ Passe', [
        ['+300 pontos do passe', () => { const p = Passe.dados(); p.pontos = Math.min(Passe.NIVEIS * Passe.PONTOS_NIVEL, p.pontos + 300); }],
        ['Liberar Plus e Ultra', () => { const p = Passe.dados(); p.plus = true; p.ultra = true; }],
        ['Completar o passe', () => { Passe.dados().pontos = Passe.NIVEIS * Passe.PONTOS_NIVEL; }],
      ]],
      ['🃏 Coringas', [
        ['+50 de cada coringa', () => { Object.keys(Estado.CORINGAS).forEach((t) => Estado.darCoringa(t, 50)); }],
        ['+500 de cada coringa', () => { Object.keys(Estado.CORINGAS).forEach((t) => Estado.darCoringa(t, 500)); }],
      ]],
      ['🪙 Tokens e medalhas', [
        ['+1.000 tokens', () => { d.tokens = (d.tokens || 0) + 1000; }],
        ['+10.000 tokens', () => { d.tokens = (d.tokens || 0) + 10000; }],
        ['+100.000 tokens', () => { d.tokens = (d.tokens || 0) + 100000; }],
        ['Zerar tokens', () => { d.tokens = 0; }],
        ['+500 medalhas de cada tipo', () => { const m = d.medalhas || (d.medalhas = {}); ['saiyajin', 'estelar', 'heroi'].forEach((k) => { m[k] = (m[k] || 0) + 500; }); }],
        ['+5.000 medalhas de cada tipo', () => { const m = d.medalhas || (d.medalhas = {}); ['saiyajin', 'estelar', 'heroi'].forEach((k) => { m[k] = (m[k] || 0) + 5000; }); }],
        ['+1.000 medalhas Saiyajin', () => { const m = d.medalhas || (d.medalhas = {}); m.saiyajin = (m.saiyajin || 0) + 1000; }],
        ['+1.000 medalhas Estelar', () => { const m = d.medalhas || (d.medalhas = {}); m.estelar = (m.estelar || 0) + 1000; }],
        ['+1.000 medalhas de Herói', () => { const m = d.medalhas || (d.medalhas = {}); m.heroi = (m.heroi || 0) + 1000; }],
        ['Zerar medalhas', () => { d.medalhas = {}; }],
        ['Renovar a Caça aos Tokens de hoje', () => { d.tokensDia = null; }],
        ['Renovar pacotes da Loja de Troca dos eventos', () => { delete d.pacotesLoja; }],
        ['+1.000 fichas de troca da loja', () => LojaExtra.darFichas(1000)],
      ]],
      ['🏅 Pro Pass (Ranqueada)', [
        ['+5 níveis do Pro Pass', () => { const r = Ranque.dados(); r.xp = Math.min(Ranque.PASSE_NIVEIS * Ranque.PASSE_XP, (r.xp || 0) + 5 * Ranque.PASSE_XP); }],
        ['Liberar o Pro Pass (grátis)', () => { Ranque.dados().pro = true; }],
        ['Completar o Pro Pass', () => { const r = Ranque.dados(); r.pro = true; r.xp = Ranque.PASSE_NIVEIS * Ranque.PASSE_XP; }],
      ]],
      ['🔎 Carta específica', [
        ['Dar uma carta (escolher nome e nível)', () => {
          const c = escolherCarta(); if (!c) return;
          const nv = Math.max(1, Math.min(Estado.NIVEL_CARTA_MAX, Math.round(+prompt(`Nível de ${c.nome} (1-${Estado.NIVEL_CARTA_MAX}):`, '5') || 1)));
          darCarta(c, nv, 50); UI.toast(`✔ ${c.nome} nível ${nv}`);
        }],
        ['Dar TODAS as de evento, invocação e exclusivas', () => { Estado.todasCartas().filter((c) => c.evento || c.summon || c.passeUltra || c.exclusivo).forEach((c) => darCarta(c, 5, 10)); }],
        ['Tirar uma carta', () => { const c = escolherCarta(); if (!c) return; const col = d.colecao[c.id]; if (col) { col.tem = false; col.copias = 0; col.nivel = 1; } d.deck = d.deck.filter((x) => x !== c.id); }],
      ]],
      ['🏆 Troféus e arena', [
        ['+500 troféus', () => { d.trofeus += 500; d.recorde = Math.max(d.recorde, d.trofeus); }],
        ['+2.000 troféus', () => { d.trofeus += 2000; d.recorde = Math.max(d.recorde, d.trofeus); }],
        ['−500 troféus', () => { d.trofeus = Math.max(0, d.trofeus - 500); }],
        ['Encher o Baú da Coroa (10 coroas)', () => { d.coroaBau = { dia: hojeTxt(), n: 10, pego: false }; }],
        ['Renovar presente grátis do dia', () => { d.presente = null; d.presenteDiario = null; }],
      ]],
      ['🛒 Loja', [
        ['+500 fichas de troca', () => LojaExtra.darFichas(500)],
        ['Liberar todos os emotes e skins', () => { const x = d.lx || (d.lx = {}); x.emotes = LojaExtra.EMOTES_LOJA.map((e) => e.id); x.skins = LojaExtra.SKINS.map((k) => k.id); }],
        ['Renovar pacotes e Loja de Troca', () => { const x = d.lx || (d.lx = {}); x.pacotes = { dia: '', comprados: [], once: [] }; x.troca = { dia: '', compradas: [] }; d.ofertas = { dia: '', compradas: [] }; d.troca = { dia: '', n: 0 }; }],
      ]],
      ['🌀 Invocação (Summon)', [
        ['+10.000 gemas', () => { d.gemas += 10000; }],
        ['+100.000 gemas', () => { d.gemas += 100000; }],
        ['Próxima invocação = Ultra (banner atual)', () => { const b = Summon.banner(), p = Summon.dados().b[b.id] || (Summon.dados().b[b.id] = { semUltra: 0, semDestaque: 0 }); p.semUltra = Summon.PITY - 1; if (b.pityDestaque) p.semDestaque = b.pityDestaque - 1; }],
        ['Próxima invocação = personagem destaque', () => { const b = Summon.banner(), p = Summon.dados().b[b.id] || (Summon.dados().b[b.id] = { semUltra: 0, semDestaque: 0 }); p.semUltra = Summon.PITY - 1; p.semDestaque = (b.pityDestaque || 1) - 1; }],
        ['Receber TODAS as cartas do banner atual', () => { const p = Summon.pool(); Object.values(p).flat().forEach((id) => { const c = Estado.carta(id) || Estado.todasCartas().find((x) => x.id === id); if (c) darCarta(c, 5, 20); }); }],
        ['Receber TODAS as Ultra e de invocação', () => { Estado.todasCartas().filter((c) => c.raridade === 'ultra' || c.summon).forEach((c) => darCarta(c, 5, 20)); }],
        ['Receber só as Ultra novas (evento ULTRAS)', () => { Estado.todasCartas().filter((c) => c.novo && c.raridade === 'ultra').forEach((c) => darCarta(c, 9, 50)); }],
        ['Zerar contador e garantia de invocações', () => { d.summon = { total: 0, ultras: 0, hist: [], b: {} }; }],
        ['Limpar histórico de invocações', () => { Summon.dados().hist = []; }],
      ]],
      ['🎪 Eventos', [
        ['Contrato da Makima: liberar fase final', () => { Contrato.dados().fase = 6; }],
        ['Contrato da Makima: +500 pontos de Obediência', () => { Contrato.dados().pts += 500; }],
        ['Dar a Makima agora', () => { const c = Estado.todasCartas().find((x) => x.id === 'makima'); if (c) darCarta(c, 5, 10); }],
        ['Esmeraldas do Caos: liberar as 7 esmeraldas', () => { Esmeraldas.dados().fase = 7; }],
        ['Esmeraldas do Caos: +500 anéis', () => { Esmeraldas.dados().aneis += 500; }],
        ['Esmeraldas do Caos: dar o Super Quarteto', () => { ['q_sonic', 'q_shadow', 'q_silver', 'q_amy', 'super_quarteto'].forEach((id) => { const c = Estado.todasCartas().find((x) => x.id === id); if (c) darCarta(c, 5, 10); }); }],
        ['Omnitrix: liberar os 9 aliens', () => { Omnitrix.dados().dna = ['ben_chama', 'ben_diamante', 'ben_xlr8', 'ben_enormossauro', 'ben_contratempo', 'ben_ecoeco', 'ben_cromatico', 'ben_gravatack', 'ben_waybig']; }],
        ['Omnitrix: dar o Ben 10', () => { const c = Estado.todasCartas().find((x) => x.id === 'ben10'); if (c) darCarta(c, 5, 10); }],
        ['Chefão Mundial: renovar tentativas e prêmio', () => { const c = Chefe.dados(); c.tent = 0; c.pego = false; }],
        ['Festival da Nino: renovar tentativas', () => { const n = Eventos.nino(); n.tentativas = 0; }],
        ['Renovar missões diárias e semanais', () => { d.missoes = null; }],
        ['Reiniciar todos os eventos (Makima, Esmeraldas, Omnitrix)', () => { delete d.mk; delete d.esm; delete d.omni; }],
      ]],
      ['📊 Estatísticas e histórico', [
        ['Zerar estatísticas', () => { delete d.est; }],
        ['Limpar histórico de batalhas', () => { d.historico = []; }],
        ['Tempo dos baús: fila cheia de ouro', () => { d.baus = (d.baus || []).map(() => ({ tipo: 'ouro', inicio: 1 })); }],
      ]],
      ['💾 Save', [
        ['Copiar meu save (JSON)', () => { const t = JSON.stringify(d); const plano = () => prompt('Copie o save:', t); try { navigator.clipboard.writeText(t).then(() => UI.toast('Save copiado! 📋'), plano); } catch (e) { plano(); } }],
        ['Colar um save (JSON)', () => { const t = prompt('Cole o save em JSON:'); if (!t) return; try { const o = JSON.parse(t); if (!o || !o.colecao) throw 0; Estado.importar(o); Estado.salvar(); UI.toast('Save carregado!'); } catch (e) { UI.toast('JSON inválido'); } }],
      ]],
    ];
  }

  function abrir() {
    if (!ehCriador()) return;
    const interruptor = (k, nome) => `<label class="mod-toggle"><input type="checkbox" data-flag="${k}" ${flags[k] ? 'checked' : ''}/><span></span>${nome}</label>`;
    const m = UI.modal({
      titulo: '🛠️ Mod menu do criador',
      classe: 'modal-mod',
      html: `<p class="aviso">Só você vê isto. Contas que usam o mod ficam fora do top global.</p>
        <input class="mod-busca" id="mod-busca" placeholder="🔎 Buscar ação (ex.: troféus, makima, loja)" autocomplete="off" />
        ${acoes().map(([titulo, btns], gi) => `<details class="mod-grupo mod-det"${gi < 2 ? ' open' : ''}><summary><b>${titulo}</b><small>${btns.length}</small></summary><div class="mod-botoes">${btns.map(([t], bi) => `<button class="btn-peq" data-a="${gi}-${bi}">${t}</button>`).join('')}</div></details>`).join('')}
        <div class="mod-grupo"><b>⚔️ Batalha</b>
          ${interruptor('elixirInfinito', 'Elixir infinito')}
          ${interruptor('torresInvenciveis', 'Minhas torres invencíveis')}
          ${interruptor('danoX5', 'Minhas tropas com dano x5')}
          ${interruptor('iaParada', 'Oponente parado')}
          ${interruptor('tropasInvenciveis', 'Minhas tropas invencíveis')}
          ${interruptor('recargaZero', 'Habilidades sem recarga')}
          ${interruptor('invocacaoGratis', 'Invocações de graça (Summon)')}
          <div class="mod-vel">Velocidade da batalha: ${[1, 2, 3].map((v) => `<button class="btn-peq ${flags.vel === v ? 'ativo' : ''}" data-vel="${v}">${v}x</button>`).join('')}</div>
          <button class="btn-peq" id="mod-vencer">👑 Vencer a batalha agora</button>
        </div>
        <div class="mod-grupo"><b>🎁 Presentes</b><button class="btn-modal principal" id="mod-presentear">🎁 Presentear um jogador</button><small class="aviso">Passes, cartas (com o nível que você quiser), ouro e gemas.</small>
          <button class="btn-modal perigo" id="mod-remover">🛠️ Editar conta de um jogador</button><small class="aviso">Mude troféus, vitórias e derrotas, veja o inventário e tire o que quiser, tudo em segredo.</small></div>
        <div class="mod-grupo"><b>⚠️ Outros</b><div class="mod-botoes">
          <button class="btn-peq" id="mod-limpar">Voltar a aparecer no top</button>
          <button class="btn-peq perigo" id="mod-reset">Apagar meu progresso</button></div></div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
    const el = m.el;
    const lista = acoes();
    const busca = el.querySelector('#mod-busca');
    busca.oninput = () => {
      const q = norm(busca.value);
      el.querySelectorAll('.mod-det').forEach((g) => {
        let alguem = false;
        g.querySelectorAll('[data-a]').forEach((b) => { const ok = !q || norm(b.textContent).includes(q) || norm(g.querySelector('summary').textContent).includes(q); b.style.display = ok ? '' : 'none'; if (ok) alguem = true; });
        g.style.display = alguem ? '' : 'none'; if (q && alguem) g.open = true;
      });
    };
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const [g, i] = b.dataset.a.split('-').map(Number);
      lista[g][1][i][1]();
      marcar();
      UI.toast(`✔ ${lista[g][1][i][0]}`);
    }));
    el.querySelectorAll('[data-flag]').forEach((c) => (c.onchange = () => { flags[c.dataset.flag] = c.checked; if (c.checked) marcar(); }));
    el.querySelectorAll('[data-vel]').forEach((b) => (b.onclick = () => {
      flags.vel = +b.dataset.vel;
      el.querySelectorAll('[data-vel]').forEach((x) => x.classList.toggle('ativo', x === b));
    }));
    el.querySelector('#mod-vencer').onclick = () => { if (Batalha.vencerAgora()) { marcar(); m.fechar(); } else UI.toast('Abra uma batalha primeiro'); };
    el.querySelector('#mod-remover').onclick = () => { m.fechar(); if (window.telaRemover) window.telaRemover(); };
    el.querySelector('#mod-presentear').onclick = () => { m.fechar(); if (window.telaPresentear) window.telaPresentear(); };
    el.querySelector('#mod-limpar').onclick = () => { Estado.d.modUsado = false; Estado.salvar(); UI.toast('Você volta a aparecer no top na próxima vez que o jogo salvar'); };
    el.querySelector('#mod-reset').onclick = () => { if (confirm('Apagar todo o progresso?')) { Estado.apagar(); location.reload(); } };
  }

  // botão flutuante (só aparece para o criador)
  function mostrarBotao(callback) {
    aoMudar = callback || aoMudar;
    let b = document.getElementById('btn-mod');
    if (!ehCriador()) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button');
      b.id = 'btn-mod';
      b.textContent = '🛠️';
      b.title = 'Mod menu';
      b.onclick = abrir;
      document.getElementById('app').appendChild(b);
    }
  }

  // deck do bot apelão: as 8 cartas mais fortes (lendárias e épicas primeiro, depois as que causam mais dano)
  function deckApelao() {
    if (!Conta.uid() || !BOT_APELAO.includes(Conta.uid())) return null;
    const peso = { lendaria: 4, epica: 3, rara: 2, comum: 1 };
    return Estado.catalogo().filter((c) => !c.exclusivo)
      .sort((a, b) => peso[b.raridade] - peso[a.raridade] || (b.dano || 0) - (a.dano || 0))
      .slice(0, 8).map((c) => c.id);
  }

  return { flag, vel, abrir, mostrarBotao, ehCriador, deckApelao };
})();
