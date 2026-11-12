// Mod menu do criador. Só aparece para os IDs de jogador listados em CRIADORES.
// (O ID aparece no perfil de quem está logado numa conta.)
const CRIADORES = ['TxtfHnU2BXbcWpHkOSlDZQRpYNw1'];
// Contas que enfrentam o bot "apelão" (só as cartas mais fortes do jogo)
const BOT_APELAO = ['ZwrffaFMcidTzZAGCMJNXOtuuOh2', 'EwnFPrCPFUMawnc6dttsQQ98yII2'];

const Mod = (() => {
  const flags = { elixirInfinito: false, torresInvenciveis: false, danoX5: false, iaParada: false, vel: 1 };
  const ehCriador = () => !!Conta.uid() && CRIADORES.includes(Conta.uid());
  const flag = (k) => ehCriador() && flags[k];
  const vel = () => (ehCriador() ? flags.vel : 1);
  let aoMudar = () => {};

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
        ['Todas no nível máximo', () => { todas().forEach((c) => { d.colecao[c.id].tem = true; d.colecao[c.id].nivel = Estado.NIVEL_MAX; }); }],
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
      ['🃏 Coringas e tokens', [
        ['+50 de cada coringa', () => { Object.keys(Estado.CORINGAS).forEach((t) => Estado.darCoringa(t, 50)); }],
        ['+1000 tokens', () => { d.tokens = (d.tokens || 0) + 1000; }],
      ]],
      ['🏅 Pro Pass (Ranqueada)', [
        ['+5 níveis do Pro Pass', () => { const r = Ranque.dados(); r.xp = Math.min(Ranque.PASSE_NIVEIS * Ranque.PASSE_XP, (r.xp || 0) + 5 * Ranque.PASSE_XP); }],
        ['Liberar o Pro Pass (grátis)', () => { Ranque.dados().pro = true; }],
        ['Completar o Pro Pass', () => { const r = Ranque.dados(); r.pro = true; r.xp = Ranque.PASSE_NIVEIS * Ranque.PASSE_XP; }],
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
        ${acoes().map(([titulo, btns], gi) => `<div class="mod-grupo"><b>${titulo}</b><div class="mod-botoes">${btns.map(([t], bi) => `<button class="btn-peq" data-a="${gi}-${bi}">${t}</button>`).join('')}</div></div>`).join('')}
        <div class="mod-grupo"><b>⚔️ Batalha</b>
          ${interruptor('elixirInfinito', 'Elixir infinito')}
          ${interruptor('torresInvenciveis', 'Minhas torres invencíveis')}
          ${interruptor('danoX5', 'Minhas tropas com dano x5')}
          ${interruptor('iaParada', 'Oponente parado')}
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
