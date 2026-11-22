// Avisos do jogo (notificações): nova versão, amigo ficou online e convite de x1.
// Funcionam com o jogo aberto ou em segundo plano (aba/app minimizado). Com o jogo FECHADO precisaria de um servidor de push (ver sw.js).
const Avisos = (() => {
  const CHAVE = 'qk_avisos';
  const PADRAO = { amigos: true, atualizacao: true, convites: true };
  const suporte = () => 'Notification' in window && 'serviceWorker' in navigator;
  const permissao = () => (suporte() ? Notification.permission : 'unsupported');
  function cfg() { try { return Object.assign({}, PADRAO, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) { return { ...PADRAO }; } }
  function salvar(c) { try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch (e) { /* nada */ } }
  const quer = (tipo) => permissao() === 'granted' && cfg()[tipo] !== false;
  const recentes = {};

  // tipo: 'amigos' | 'atualizacao' | 'convites'. Com o jogo na tela vira um toast; escondido, vira notificação do celular.
  async function notificar(tipo, titulo, corpo, tag) {
    if (!quer(tipo)) return false;
    const chave = tag || tipo + titulo;
    if (recentes[chave] && Date.now() - recentes[chave] < 60 * 1000) return false;
    recentes[chave] = Date.now();
    if (document.visibilityState === 'visible') { try { UI.toast(`${titulo} ${corpo || ''}`.trim()); } catch (e) { /* nada */ } return true; }
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titulo, { body: corpo || '', icon: 'assets/pwa/icone-192.png', badge: 'assets/pwa/icone-192.png', tag: chave, renotify: true, data: { url: './index.html' } });
      return true;
    } catch (e) { return false; }
  }
  async function pedir() {
    if (!suporte()) return 'unsupported';
    try { return await Notification.requestPermission(); } catch (e) { return Notification.permission; }
  }

  // bloco de ajustes (dentro de "Som e música")
  function secao(el) {
    if (!el) return;
    const p = permissao();
    const c = cfg();
    if (p === 'unsupported') { el.innerHTML = '<small class="aviso">Seu navegador não permite avisos. No iPhone (iOS 16.4+), instale o jogo na tela inicial (botão 📲) e abra por lá.</small>'; return; }
    if (p === 'denied') { el.innerHTML = '<small class="aviso">Os avisos estão bloqueados. Libere nas configurações do navegador/app para este site. 💛</small>'; return; }
    if (p === 'default') {
      el.innerHTML = '<button class="btn-peq" id="av-ativar">🔔 Ativar avisos</button><small>Te aviso quando sair versão nova, um amigo ficar online ou chegar convite de x1.</small>';
      el.querySelector('#av-ativar').onclick = async () => { const r = await pedir(); if (r === 'granted') { try { notificar('atualizacao', '🔔 Avisos ativados!', 'Pode deixar comigo 💛'); } catch (e) { /* nada */ } } secao(el); };
      return;
    }
    const linha = (k, t) => `<label class="som-linha"><span>${t}</span><input type="checkbox" data-av="${k}" ${c[k] !== false ? 'checked' : ''} /></label>`;
    el.innerHTML = linha('amigos', '👥 Amigo ficou online') + linha('convites', '⚔️ Convite de x1') + linha('atualizacao', '✨ Versão nova do jogo');
    el.querySelectorAll('[data-av]').forEach((i) => (i.onchange = () => { const n = cfg(); n[i.dataset.av] = i.checked; salvar(n); }));
  }
  return { suporte, permissao, pedir, notificar, secao, quer };
})();
